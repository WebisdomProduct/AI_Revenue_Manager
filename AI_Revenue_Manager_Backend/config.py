# =======================
# Configuration File
# =======================
from dotenv import load_dotenv
import os
# import json

# Load .env file
load_dotenv()

# --- Google Sheets ---
SPREADSHEET_ID = os.getenv("SPREADSHEET_ID") # read from OS env
CLIENTS_SHEET = "Clients"
CAMPAIGNS_SHEET = "Campaigns"

# --- Gemini API ---
# Create an API key at https://aistudio.google.com/app/apikey
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL")

# --- Batching & Rate Limiting ---
BATCH_SIZE = 5
REQUEST_DELAY = 2        # seconds between calls
MAX_RETRIES = 3
RETRY_DELAY = 5          # seconds before retry

# --- Credentials ---
SERVICE_ACCOUNT_FILE = os.getenv("SERVICE_ACCOUNT_FILE")

# ----- Python Backend Messaging Service Switch -----
MSG_SERVICE_PYTHON = False

# --- twilio Configurations ---
TWILIO_ACCOUNT_SID=os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN=os.getenv("TWILIO_AUTH_TOKEN")

# --- twilio SendGrid Web API key ---
SENDGRID_API_KEY=os.getenv("SENDGRID_API_KEY")

# ----- Frontend adding Template/Timing columns in gSheet -----
FRONTEND_TEMPLATE_COLUMNS = True


