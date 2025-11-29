# Standard Library (no install needed)
import os
import re
import time
import json
from datetime import datetime

# External packages required
import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
import google.generativeai as genai
from dateutil import parser


from config import (
    # SPREADSHEET_ID,
    # CLIENTS_SHEET,
    # CAMPAIGNS_SHEET,
    # GEMINI_API_KEY,
    # GEMINI_MODEL,
    BATCH_SIZE,
    REQUEST_DELAY,
    # MAX_RETRIES,
    # RETRY_DELAY,
    # SERVICE_ACCOUNT_FILE,
    MSG_SERVICE_PYTHON,
    FRONTEND_TEMPLATE_COLUMNS,
)
if(MSG_SERVICE_PYTHON):
    from config import (
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN,
        SENDGRID_API_KEY,
    )
    from msg_service import (
        trigger_sms,
        trigger_whatsapp_msg,
        trigger_email,
    )

# -------------------------------------------------------------------
# 🔧 SETUP KEYS and URLs
# -------------------------------------------------------------------
# SPREADSHEET_ID = os.getenv("SPREADSHEET_ID")
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID", "").strip()
CLIENTS_SHEET = "Clients"
CAMPAIGNS_SHEET = "Campaigns"
# GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
# GEMINI_MODEL = os.environ.get("GEMINI_MODEL")
# APPS_SCRIPT_URL = os.environ.get("APPS_SCRIPT_URL")
# SERVICE_ACCOUNT_FILE = os.getenv("SERVICE_ACCOUNT_FILE")

# -------------------------------------------------------------------
# 🔧 SETUP
# -------------------------------------------------------------------
def init_google_sheets():
###################################################################################    
    # print("SERVICE_ACCOUNT_FILE env:", os.getenv("SERVICE_ACCOUNT_FILE"))

    # if os.path.exists(os.getenv("SERVICE_ACCOUNT_FILE")):
    #     print("Directory exists. Contents:")
    #     print(os.listdir(os.getenv("SERVICE_ACCOUNT_FILE")))
    # else:
    #     print("Secret directory does NOT exist!")
###################################################################################
    # Secret is injected as JSON STRING (not file)
    # This approach doesn't need a service account, but just JSON credentials.
    # sa_json_str = os.getenv("SERVICE_ACCOUNT_FILE")

    # if not sa_json_str:
    #     raise Exception("SERVICE_ACCOUNT_FILE secret not found")

    # sa_info = json.loads(sa_json_str)

    # creds = service_account.Credentials.from_service_account_info(
    #     sa_info,
    #     scopes=["https://www.googleapis.com/auth/spreadsheets"]
    # )

    # return build("sheets", "v4", credentials=creds).spreadsheets()
###################################################################################
    # This approach needs a service account and not just JSON credentials.
    from googleapiclient.discovery import build
    import google.auth

    # Automatically picks up Cloud Run service account credentials
    credentials, _ = google.auth.default()

    service = build("sheets", "v4", credentials=credentials)
    return service.spreadsheets()
###################################################################################
    # creds = service_account.Credentials.from_service_account_file(
    #     SERVICE_ACCOUNT_FILE,
    #     scopes=["https://www.googleapis.com/auth/spreadsheets"]
    # )
    # return build("sheets", "v4", credentials=creds).spreadsheets()
###################################################################################

def init_gemini():
    # api_key = os.getenv("GEMINI_API_KEY")
    # model = os.getenv("GEMINI_MODEL")
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    model = os.environ.get("GEMINI_MODEL", "").strip()

    if not api_key:
        raise Exception("GEMINI_API_KEY missing")

    if not model:
        raise Exception("GEMINI_MODEL missing")

    genai.configure(api_key=api_key)
    return genai.GenerativeModel(model)


# -------------------------------------------------------------------
# 🧹 SHEET HELPERS
# -------------------------------------------------------------------
def read_sheet(service, sheet_name):
    """Read a Google Sheet into a pandas DataFrame (auto-pads rows)."""
    result = service.values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{sheet_name}!A:Z"
    ).execute()
    values = result.get("values", [])
    if not values:
        raise ValueError(f"No data found in sheet '{sheet_name}'.")
    headers, rows = values[0], values[1:]
    clean_rows = [
        r + [""] * (len(headers) - len(r)) if len(r) < len(headers) else r[:len(headers)]
        for r in rows
    ]
    return pd.DataFrame(clean_rows, columns=headers)


def update_sheet(service, sheet_name, df, columns_to_update=None):
    """Write a DataFrame back to Google Sheets.
    Update specific columns in a Google Sheet in a single batch update.
    Safely update only specific columns (even non-contiguous ones)
    without clearing or overwriting intermediate columns.
    Preserves dropdowns, formatting, and reduces write API calls.
    - If columns_to_update is None, updates all columns.
    - Does NOT clear the sheet, so dropdowns and formatting remain intact.
    """

    if columns_to_update is None:
        columns_to_update = df.columns.tolist()
    print(f"📝 Updating columns individually: {', '.join(columns_to_update)}")

    # Helper to convert column index (1-based) to A, B, ..., AA, AB, etc.
    def col_letter(n):
        result = ''
        while n > 0:
            n, remainder = divmod(n - 1, 26)
            result = chr(65 + remainder) + result
        return result

    for col in columns_to_update:
        if col not in df.columns:
            print(f"⚠️ Column '{col}' not found in DataFrame — skipping.")
            continue

        col_idx = df.columns.get_loc(col) + 1
        col_letter_str = col_letter(col_idx)

        # Prepare column values (excluding header)
        values = [[v] for v in df[col].tolist()]

        # Update this column only
        service.values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=f"{sheet_name}!{col_letter_str}2",  # Start from row 2
            valueInputOption="RAW",
            body={"values": values},
        ).execute()
        print(f"✅ Column '{col}' updated ({col_letter_str})")

    print(f"✅ Partial update completed for sheet '{sheet_name}'.")

# -------------------------------------------------------------------
# 🧠 LLM CALLS
# -------------------------------------------------------------------
def call_gemini_with_retry(model, prompt, max_retries=3):
    """Call Gemini with basic retry/backoff handling."""
    for attempt in range(1, max_retries + 1):
        try:
            response = model.generate_content(prompt)
            if response and response.text:
                return response.text
        except Exception as e:
            print(f"⚠️ Gemini call failed (attempt {attempt}): {e}")
            if "429" in str(e):  # rate limit
                print("⏳ Waiting 60 seconds due to rate limit...")
                time.sleep(60)
            else:
                time.sleep(5)
    return None


# -------------------------------------------------------------------
# 🧩 CLIENT ENRICHMENT
# -------------------------------------------------------------------
def extract_client_profile(model, chat_text):
    """Use Gemini to extract client attributes."""
    prompt = f"""
You are a hospitality data analyst. Based on this hotel guest chat:

{chat_text}

Identify:
1. client_type
2. client_interests (list)
3. client_traits (list)

Respond with **only** JSON (no markdown), e.g.:
{{
  "client_type": "Business Traveler",
  "client_interests": ["Spa", "Dining"],
  "client_traits": ["Luxury-seeking", "Efficient"]
}}
"""
    response = call_gemini_with_retry(model, prompt)
    if not response:
        return None

    clean = response.strip()
    if clean.startswith("```"):
        clean = clean.strip("`").replace("json", "", 1).strip()
    match = re.search(r"\{.*\}", clean, re.DOTALL)
    if match:
        clean = match.group(0)
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        print(f"❌ JSON parse failed for client chat:\n{response}")
        return None


def infer_client_category(model, client_type, interests, traits):
    """Use a second Gemini instance to infer Client Category based on
    type, interests, and traits. Retries once with a simpler prompt if needed.
    """
    if not any([client_type, interests, traits]):
        return ""

    prompt = f"""
    You are a hotel marketing analyst.
    Based on the following client profile, determine a short descriptive Client Category label or a few keywords.

    Client Type: {client_type}
    Client Interests: {interests}
    Client Traits: {traits}

    Respond ONLY with plain text listing 1–3 descriptive categories or keywords (comma-separated), e.g.:
    Leisure, Family, Spa
    """
    response = call_gemini_with_retry(model, prompt)
    if not response:
        return ""
    # Clean and simplify
    clean = response.strip()
    if clean.startswith("```"):
        clean = clean.strip("`").replace("json", "", 1).strip().title()
    return clean


# -------------------------------------------------------------------
# 🎯 CAMPAIGN LOGIC
# -------------------------------------------------------------------
def generate_campaign_id(existing_ids):
    pattern = re.compile(r"CMP-(\d+)")
    nums = [int(pattern.search(cid).group(1)) for cid in existing_ids if pattern.search(cid)]
    next_id = max(nums) + 1 if nums else 1
    return f"CMP-{next_id:04d}"


def find_matching_clients(df_clients, target_category):
    """
    Match clients exactly the same way as Google Apps Script:
    - Split client categories by commas
    - Trim whitespace
    - Lowercase tokens
    - Campaign category must match one whole token exactly
    """
    if not target_category:
        return pd.DataFrame()

    campaign_category = target_category.strip().lower()

    matched_rows = []

    for _, row in df_clients.iterrows():
        raw_client_cat = str(row.get("Client Category", "")).strip().lower()

        if not raw_client_cat:
            continue

        # GAS logic: split by commas only
        client_tokens = [
            token.strip()
            for token in raw_client_cat.split(",")
            if token.strip()
        ]

        # exact token match
        if campaign_category in client_tokens:
            matched_rows.append(row)

    return pd.DataFrame(matched_rows)

# Add Message Template & Message Send Timing columns based on Campaign Message Count
def add_message_templates(sheets, df_campaigns):
    """
    Dynamically expands the Campaigns sheet by adding paired columns for each
    message in ACTIVE/UPCOMING campaigns, such as:
        Message Template #1, Message Send Timing #1, Message Template #2, Message Send Timing #2, ...
    Adds only the pairs up to the maximum 'Campaign Message Count' among ACTIVE/UPCOMING campaigns.
    
    Keeps all existing headers and formatting intact.
    Uses existing update_sheet() for safe updates (preserving dropdowns and formatting).
    Does not overwrite existing columns or data.
    Displays added column info in the terminal.
    """
    sheet_name = CAMPAIGNS_SHEET
    spreadsheet_id = SPREADSHEET_ID

    # Sanity checks
    required_cols = {"Campaign Message Count", "Campaign Status"}
    if not required_cols.issubset(df_campaigns.columns):
        print("⚠️ Missing required columns — skipping message template expansion.")
        return

    print("\n🧩 Checking Campaign Message Count for dynamic Message Template/Send Timing columns expansion for ACTIVE/UPCOMING campaigns...")

    # Filter ACTIVE and UPCOMING campaigns
    active_df = df_campaigns[df_campaigns["Campaign Status"].astype(str).str.upper().isin(["ACTIVE", "UPCOMING"])]

    if active_df.empty:
        print("✅ No ACTIVE or UPCOMING campaigns — skipping Message Template/Send Timing columns expansion.")
        return

    # Determine the maximum Campaign Message Count among ACTIVE/UPCOMING campaigns
    max_count = 0
    for val in active_df["Campaign Message Count"].fillna(0).tolist():
        try:
            count = int(val)
            if count > max_count:
                max_count = count
        except ValueError:
            continue

    if max_count <= 0:
        print("✅ No active/upcoming campaign has message count > 0 — no new columns added.")
        return

    # Identify current message template/timing columns
    existing_headers = df_campaigns.columns.tolist()
    current_pairs  = [h for h in existing_headers if h.startswith("Message Template #") or h.startswith("Message Send Timing #")]
    
    # Calculate number of template/timing column pairs
    current_pair_count = len(current_pairs) // 2  # two columns per message

    # Add missing template/timing column pairs
    if max_count > current_pair_count:
        new_cols = []
        for i in range(current_pair_count + 1, max_count + 1):
            new_cols.append(f"Message Template #{i}")
            new_cols.append(f"Message Send Timing #{i}")
        print(f"🆕 Adding new column pairs to Campaigns sheet: {', '.join(new_cols)}")

        # Extend the DataFrame with blank columns
        for col in new_cols:
            df_campaigns[col] = ""

        # Update the header row safely (entire first row) in Google Sheets
        header_values = [df_campaigns.columns.tolist()]
        sheets.values().update(
            spreadsheetId=spreadsheet_id,
            range=f"{sheet_name}!1:1",  # entire header row
            valueInputOption="RAW",
            body={"values": header_values},
        ).execute()

        print(f"✅ Sheet header updated with new columns ({', '.join(new_cols)}).")

        # Invoke update_sheet() to safely update these new columns
        update_sheet(
            sheets,
            sheet_name,
            df_campaigns,
            columns_to_update=new_cols
        )
        print(f"✅ Added new message template/timing columns using update_sheet(): {', '.join(new_cols)}")

    else:
        print("✅ All required message template/timing columns already exist — no changes made.")

# Invoke Message Services based on Message Templates/Timings
def invoke_message_service(sheets, df_campaigns):
    """
    Simulates invoking an external SMS (or message) sending service for all ACTIVE/UPCOMING campaigns
    that have a Campaign Message Count > 0.

    Reads message templates and timings dynamically from corresponding columns:
      e.g., 'Message Template #1', 'Message Send Timing #1', etc.
    Sends each message using trigger_sms(msg_body, msg_from, msg_to).    
    
    Args:
        sheets: Google Sheets API service object
        df_campaigns: DataFrame of the Campaigns sheet
    """

    print("\n📣 Checking campaigns for message service invocation...")

    required_cols = ["Campaign Status", "Campaign Message Count", "Campaign ID", "Target Client Category"]
    for col in required_cols:
        if col not in df_campaigns.columns:
            print(f"⚠️ Missing column '{col}' — skipping message service trigger.")
            return

    # Read Clients sheet once
    try:
        df_clients = read_sheet(sheets, CLIENTS_SHEET)
    except Exception as e:
        print(f"❌ Could not read Clients sheet: {e}")
        return

    if df_clients.empty or "Client Category" not in df_clients.columns or "Client Phone" not in df_clients.columns:
        print("⚠️ Missing 'Client Category' or 'Client Phone' column in Clients sheet.")
        return

    # Filter ACTIVE or UPCOMING campaigns with message count > 0
    valid_campaigns = df_campaigns[
        (df_campaigns["Campaign Status"].astype(str).str.upper().isin(["ACTIVE", "UPCOMING"])) &
        (pd.to_numeric(df_campaigns["Campaign Message Count"], errors="coerce") > 0)
    ]

    if valid_campaigns.empty:
        print("✅ No ACTIVE/UPCOMING campaigns with message count > 0 found.")
        return

    print(f"📢 Found {len(valid_campaigns)} eligible campaign(s) for message triggering.\n")

    # Loop through campaigns and simulate sending
    for _, row in valid_campaigns.iterrows():
        campaign_id = str(row.get("Campaign ID", "")).strip()
        msg_count = int(float(row.get("Campaign Message Count", 0)))
        target_category = str(row.get("Target Client Category", "")).strip().lower()

        if not target_category:
            print(f"⚠️ Campaign {campaign_id} missing Target Client Category — skipping.")
            continue

        # --- Find matching clients ---
        matched_clients = df_clients[
            df_clients["Client Category"].astype(str).str.lower().apply(lambda cat: any(word in cat for word in target_category.split()))
        ]

        if matched_clients.empty:
            print(f"⚠️ No clients matched for campaign {campaign_id} (category: {target_category}).")
            continue

        phones = matched_clients["Client Phone"].dropna().unique().tolist() if "Client Phone" in matched_clients.columns else []
        print(f"📞 Found {len(phones)} phone(s) for campaign {campaign_id}: "f"{', '.join(phones[:3])}{'...' if len(phones) > 3 else ''}")

        emails = matched_clients["Client Email"].dropna().unique().tolist() if "Client Email" in matched_clients.columns else []
        print(f"📧 Found {len(emails)} email(s) for campaign {campaign_id}: "f"{', '.join(emails[:3])}{'...' if len(emails) > 3 else ''}")
        # print("\n")

        # Send messages based on templates
        for i in range(1, msg_count + 1):
            template_col = f"Message Template #{i}"
            timing_col = f"Message Send Timing #{i}"

            msg_body = str(row.get(template_col, "")).strip()
            # msg_timing = str(row.get(timing_col, "N/A")).strip()

            # Safely read and parse timing column (time-only)
            timing_value = row.get(timing_col, "")
            msg_timing = None

            if pd.notna(timing_value) and str(timing_value).strip():
                time_str = str(timing_value).strip()
                try:
                    # Try several common time formats
                    for fmt in ("%H:%M", "%I:%M %p", "%H.%M", "%I.%M %p"):
                        try:
                            msg_timing = datetime.strptime(time_str, fmt).time()
                            break
                        except ValueError:
                            continue

                    if not msg_timing:
                        # Unrecognized format — keep as string
                        msg_timing = time_str
                except Exception:
                    msg_timing = time_str
            else:
                msg_timing = None  # No timing provided

            if not msg_body:
                print(f"⚠️ Missing template text in {template_col} for {campaign_id} — skipping.")
                continue

            msg_from = "Sender"  # Sender dummy Placeholder
            
            for phone in phones:
                
                # ----- SMS -----
                
                msg_to = phone.strip()
                # print("\n")
                print(f"   ⏰ [{msg_timing}] Sending from {msg_from} → {msg_to}")
                print(f"   📨 Template {i}: {msg_body[:60]}...")
            
                try:
                    trigger_sms(msg_body, msg_from, msg_to, msg_timing)
                    print(f"   ✅ Message {i}/{msg_count} sent successfully for {campaign_id} at {msg_timing}")
                except Exception as e:
                    print(f"   ❌ Failed to send message {i}/{msg_count} — {e}")
                
                # ----- WhatsApp -----

                msg_to="whatsapp:"+msg_to # adapt msg_to for whatsapp sending

                print(f"   ⏰ [{msg_timing}] Sending from {msg_from} → {msg_to}")
                print(f"   📨 Template {i}: {msg_body[:60]}...")

                try:
                    trigger_whatsapp_msg(msg_body, msg_from, msg_to, msg_timing)
                    print(f"   ✅ Message {i}/{msg_count} sent successfully for {campaign_id} at {msg_timing}")
                except Exception as e:
                    print(f"   ❌ Failed to send message {i}/{msg_count} — {e}")

            for email in emails:
            
                # ----- Email -----
                
                msg_to = email.strip()
                mail_sub = "Dummy Subject"
                
                print(f"   ⏰ [{msg_timing}] Sending from {msg_from} → {msg_to}")
                print(f"   📨 Template {i}: Subject: {mail_sub} | {msg_body[:60]}...")
                
                try:
                    trigger_email(msg_body, msg_from, msg_to, mail_sub, msg_timing)
                    print(f"   ✅ Email {i}/{msg_count} sent successfully for {campaign_id} at {msg_timing}")
                except Exception as e:
                    print(f"   ❌ Failed to send email {i}/{msg_count} — {e}")

    print("\n✅ Message service invocation process completed.")
    print("#"*100,'\n')


# -------------------------------------------------------------------
# 🚀 MAIN PROCESS
# -------------------------------------------------------------------
def process_clients_and_campaigns():
    """
    Processes client chat data and campaign details using Gemini LLM.
    Adds:
    1. Smart change detection (writes only if new/changed data)
    2. Skips reprocessing already analyzed clients
    """
    sheets = init_google_sheets()

    # LLM instances
    gemini_client_analyzer = init_gemini()      # extracts type, interests, traits
    gemini_client_categorizer = init_gemini()   # infers category
    print("✅ Initialized Gemini instances.")

    # === STEP 1: Read Clients sheet ===
    df_clients = read_sheet(sheets, CLIENTS_SHEET)
    for col in ["Client Type", "Client Interests", "Client Traits", "Client Category"]:
        if col not in df_clients.columns:
            df_clients[col] = ""

    total_clients = len(df_clients)
    print(f"🧾 Found {total_clients} clients in '{CLIENTS_SHEET}'.")
    print("#"*100)

    # === STEP 2: Fill missing client profiles ===
    for start in range(0, total_clients, BATCH_SIZE):
        batch = df_clients.iloc[start:start + BATCH_SIZE]
        print(f"\n🔹 Processing batch {start // BATCH_SIZE + 1} ({len(batch)} clients)...")

        for idx, row in batch.iterrows():
            client_id = row.get("Client ID", f"C{idx+1}")
            chat = str(row.get("Chat Text", "")).strip()

            if not chat:
                continue

            # Step 2A: Extract Type, Interests, Traits (LLM #1)
            if not row.get("Client Type", "").strip():
                print(f"🔍 Analyzing client {client_id} ...")
                profile = extract_client_profile(gemini_client_analyzer, chat)
                if profile:
                    df_clients.at[idx, "Client Type"] = profile.get("client_type", "")
                    df_clients.at[idx, "Client Interests"] = ", ".join(profile.get("client_interests", []))
                    df_clients.at[idx, "Client Traits"] = ", ".join(profile.get("client_traits", []))
                    print(f"✅ {client_id} profile updated.")
                else:
                    print(f"⚠️ {client_id} profile could not be parsed.")
                time.sleep(REQUEST_DELAY)

            # Step 2B: Infer Category (LLM #2)
            if not row.get("Client Category", "").strip():
                client_type = df_clients.at[idx, "Client Type"]
                interests = df_clients.at[idx, "Client Interests"]
                traits = df_clients.at[idx, "Client Traits"]
                print(f"🧩 Inferring category for {client_id} ...")
                category = infer_client_category(gemini_client_categorizer, client_type, interests, traits)
                df_clients.at[idx, "Client Category"] = category
                print(f"🏷️ {client_id} category: {category}")
                time.sleep(REQUEST_DELAY)

        # After you process all client batches
        print("🔍 Checking for updates in Clients sheet...")

        # Read the current Clients sheet (before update)
        existing_clients = read_sheet(sheets, CLIENTS_SHEET)

        # Select columns that backend manages
        backend_columns = ["Client Type", "Client Interests", "Client Traits", "Client Category"]

        # Compare only if both DataFrames have matching shape and headers
        has_changes = False
        if not existing_clients.empty and all(col in existing_clients.columns for col in backend_columns):
            for col in backend_columns:
                old_values = existing_clients[col].astype(str).fillna("").tolist()
                new_values = df_clients[col].astype(str).fillna("").tolist()
                if old_values != new_values:
                    has_changes = True
                    print(f"🟡 Detected updates in column: {col}")
                    break       
        
        if has_changes:
            print("💾 Changes found — updating Clients sheet...")
            # print("#"*50)
        else:
            print("✅ No new client updates — skipping Clients sheet write.")
            # print("#"*50)
            backend_columns = []
            # Reset clientsInfoUpdated flag
            clientsInfoUpdated = False

        # ✅ Update only if backend_columns is not empty
        if backend_columns:        
            # Set clientsInfoUpdated flag
            clientsInfoUpdated = True
            update_sheet(sheets, CLIENTS_SHEET, df_clients,
                         columns_to_update=backend_columns)
    print("#"*100)

    # === STEP 3: Process Campaigns sheet ===
    df_campaigns = read_sheet(sheets, CAMPAIGNS_SHEET)

    # Ensure required columns exist
    for col in ["Campaign ID", "Target Customers Count", "Campaign Status"]:
        if col not in df_campaigns.columns:
            df_campaigns[col] = ""

    print(f"\n📢 Processing {len(df_campaigns)} campaigns...")

    existing_ids = df_campaigns["Campaign ID"].dropna().tolist()
    now = datetime.now()

    # Campaign ID: Auto generated if a new campaign is added.
    # Target Customers Count: Auto generated if a new client is added/categorised.
    # Campaign Status: Auto generated based on present time vs Start/End Date-Time.
    # initialize columns to be written as an empty list
    columnsToWrite = []
    # Reset individual update flags
    campaignIdUpdated=False
    targetCustomersCountUpdated=False
    campaignStatusUpdated=False
    # Trigger relevant columns to be written, once any of these is modified.

    for idx, row in df_campaigns.iterrows():
        campaign_id = str(row.get("Campaign ID", "")).strip()
        campaign_text = str(row.get("Campaign Text", "")).strip()
        target_category = str(row.get("Target Client Category", "")).strip()
        start_dt_str = str(row.get("Start Date-Time", "")).strip()
        end_dt_str = str(row.get("End Date-Time", "")).strip()
        current_status = str(row.get("Campaign Status", "")).strip().upper()

        # ✅ Keep this early skip — still fits perfectly
        if not target_category:
            print(f"⚠️ Skipping row {idx+1} — no Target Client Category.")
            continue

        # Skip incomplete campaign rows
        if not all([campaign_text, target_category, start_dt_str, end_dt_str]):
            continue
        
        # Parse date-times flexibly
        try:
            # Only supports ISO formats
            # ✅ **ISO format (simple)**        | `2025-11-01 09:00`
            # ✅ **ISO format (with seconds)**  | `2025-11-01 09:00:00`
            # start_dt = datetime.fromisoformat(start_dt_str.replace(" ", "T"))
            # end_dt = datetime.fromisoformat(end_dt_str.replace(" ", "T"))

            # Supports all the following formats of date-time
            # ✅ 2025-11-01 09:00
            # ✅ 1 Nov 2025 9:00
            # ✅ Nov 1, 2025 9am
            # ✅ 1st November 2025 09:00 AM
            start_dt = parser.parse(start_dt_str)
            end_dt = parser.parse(end_dt_str)
        except Exception as e:
            print(f"⚠️ Could not parse date-time for campaign at row {idx+1}: {e}")
            continue
        
        # === Step 1: Auto-generate Campaign ID if missing ===
        if not campaign_id:
            campaign_id = generate_campaign_id(existing_ids)
            df_campaigns.at[idx, "Campaign ID"] = campaign_id
            existing_ids.append(campaign_id)
            print(f"🆔 Assigned Campaign ID: {campaign_id}")
            ## "Campaign ID" is updated here ##
            campaignIdUpdated=True

        # === Step 2: Determine Campaign Status based on current time ===
        if start_dt <= now < end_dt:
            new_status = "ACTIVE"
        elif now >= end_dt:
            new_status = "INACTIVE"
        elif start_dt > now:
            new_status = "UPCOMING"
        else:
            new_status = ""

        # === Step 3: Analyze only when a client is added and campaign is ACTIVE or UPCOMING ===
        # if ((clientsInfoUpdated) & (new_status in ["ACTIVE", "UPCOMING"])):
        if (new_status in ["ACTIVE", "UPCOMING"]):
            matched_clients = find_matching_clients(df_clients, target_category)
            match_count = len(matched_clients)
            df_campaigns.at[idx, "Target Customers Count"] = match_count
            ## "Target Customers Count" is updated here ##
            targetCustomersCountUpdated=True

            print(f"🎯 {campaign_id} — Target '{target_category}' matched {match_count} clients.")
            
            if match_count > 0:
                print("👥 Matching Clients:")
                for _, client in matched_clients.iterrows():
                    print(f"   - {client.get('Client Name')} | {client.get('Client Email')} | {client.get('Client Phone')}")
        else:
            print(f"⏸️ Skipping {campaign_id} — status {new_status or 'UNKNOWN'} (no update).")

        # === Step 4: Update Campaign Status ===
        if new_status != current_status:
            df_campaigns.at[idx, "Campaign Status"] = new_status
            print(f"📅 {campaign_id} status set to {new_status}")
            ## "Campaign Status" is updated here ##
            campaignStatusUpdated=True

        time.sleep(REQUEST_DELAY)

    # Append the Campaign sheet column to be updated based on changes
    if(campaignIdUpdated):
        columnsToWrite.append("Campaign ID")
    if(targetCustomersCountUpdated):
        columnsToWrite.append("Target Customers Count")
    if(campaignStatusUpdated):
        columnsToWrite.append("Campaign Status")

    # Update the Campaign sheet only when 
    # Clients and/or Campaigns sheet is updated
    if(clientsInfoUpdated | campaignIdUpdated | targetCustomersCountUpdated | campaignStatusUpdated):
        # Save updates back to sheet
        ### This display must consider if there was any exception if filling any campaign details ###
        update_sheet(sheets, CAMPAIGNS_SHEET, df_campaigns,
                    columns_to_update=columnsToWrite)
        print("\n✅ All campaign details updated successfully.")
        # print("#"*50)
    else:
        print("\n✅ No new campaign updates — skipping Campaigns sheet write.")
        # print("#"*50)
    
    print("#"*100)

    
    if not (FRONTEND_TEMPLATE_COLUMNS):
        # Add new columns for message templates and message send timing
        add_message_templates(sheets, df_campaigns)

    # Configuration Controlled Message Service in Python backend
    if (MSG_SERVICE_PYTHON):
        # Invoke Message Services based on Message Templates/Timings
        invoke_message_service(sheets, df_campaigns)
    
# -------------------------------------------------------------------
# ▶️ RUN
# -------------------------------------------------------------------
if __name__ == "__main__":
    process_clients_and_campaigns()
