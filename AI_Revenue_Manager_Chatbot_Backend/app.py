from fastapi import FastAPI
from pydantic import BaseModel
import google.generativeai as genai

from config import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
    APPS_SCRIPT_URL,
)

# ---------------------------------------------------------
# CONFIGURE GEMINI
# ---------------------------------------------------------
# Make sure your environment contains:
# export GOOGLE_API_KEY="your-key"
genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:8080", # Vite dev
    "http://127.0.0.1:8080",
    "http://localhost:8081",
    "http://localhost:5173", # Vite alt port
    "http://127.0.0.1:5173",
    # "https://<your-project>.web.app",        # Firebase hosting on .app
    # "https://<your-project>.firebaseapp.com" # hosting on domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# REQUEST / RESPONSE MODELS
# ---------------------------------------------------------
class ChatRequest(BaseModel):
    chatHistory: list    # list of {role: "user"/"assistant", text: "..."}
    userMessage: str
    clientName: str | None = "Guest"   # Optional: frontend can send the name


class ChatResponse(BaseModel):
    response: str

class ChatSession(BaseModel):
    clientId: str
    chatId: str
    clientName: str
    clientEmail: str
    clientPhone: str
    date: str
    time: str
    transcriptText: str

# ---------------------------------------------------------
# SYSTEM PROMPT FOR HOTEL DOMAIN
# ---------------------------------------------------------
SYSTEM_PROMPT = """
You are a highly professional hotel concierge AI assistant.
Your objectives:

1. Respond politely, warmly, and naturally.
2. Always address the client by their name (if provided).
3. Maintain memory of all previous chat messages in the session.
4. If the client gives any booking-related details (dates, number of guests,
   special preferences, interests), remember them and use them politely.
5. Ask intelligent follow-up questions to help understand the client’s needs.
   You may ask about:
   - Stay dates
   - Number of guests
   - Room preferences
   - Budget
   - Dining preferences
   - Spa preferences
   - Outdoor activities, excursions, sightseeing
   - Food allergies
   - Purpose of visit (vacation, work, anniversary, honeymoon, etc.)

6. Provide helpful hotel-related information:
   - Amenities
   - Dining
   - Spa & wellness
   - Activities
   - Transportation
   - Recommendations

7. Your tone: friendly, concise, human-like, professional.

8. DO NOT mention that you are an AI unless the user explicitly asks.

9. Your role is ONLY to respond to the client. 
   Do not return JSON or metadata. Return ONLY the reply message.
"""


# ---------------------------------------------------------
# FORMAT MESSAGES FOR GEMINI
# ---------------------------------------------------------
def convert_messages(history, system_prompt, client_name):
    """
    Convert chat history into Gemini-compatible messages
    using roles: user, model.
    """
    messages = [
        {
            "role": "user",
            "parts": [{"text": system_prompt.replace("{clientName}", client_name)}]
        }
    ]

    for item in history:
        role = "user" if item["role"] == "user" else "model"
        messages.append({
            "role": role,
            "parts": [{"text": item["text"]}]
        })

    return messages

# ---------------------------------------------------------
# LLM CHAT ENDPOINT
# ---------------------------------------------------------
@app.post("/llm-chat", response_model=ChatResponse)
async def llm_chat(req: ChatRequest):

    # full chat history converted
    messages = convert_messages(req.chatHistory, SYSTEM_PROMPT, req.clientName or "Guest")

    # append fresh message
    messages.append({
        "role": "user",
        "parts": [{"text": req.userMessage}]
    })

    model = genai.GenerativeModel(GEMINI_MODEL)
    response = model.generate_content(contents=messages)

    ai_reply = response.text

    return ChatResponse(response=ai_reply)

# ---------------------------------------------------------
# SAVE CHAT SESSION ENDPOINT
# ---------------------------------------------------------
# @app.post("/save-chat")
# async def save_chat(session: ChatSession):
#     """
#     Receives chat session from frontend and stores/logs it.
#     In production, you can save this to a database or Google Sheet.
#     """
#     # For demo purposes, we just print it
#     print("📤 Received chat session:")
#     print(session.json(indent=2))
#     return {"status": "success", "message": "Chat session saved"}

# from fastapi import Request

# @app.post("/save-chat")
# async def save_chat(request: Request):
#     try:
#         data = await request.json()
#         print("📤 Received chat session:")
#         print(data)
#         return {"status": "success", "message": "Chat session saved"}
#     except Exception as e:
#         print("❌ ERROR:", e)
#         raise e

from fastapi import Request
import httpx  # async HTTP client
import json

@app.post("/save-chat")
async def save_chat(request: Request):
    """
    Receives chat session from frontend and forwards it to Apps Script
    so it can be saved in Google Sheets.
    """
    try:
        session = await request.json()
        print("📤 Received chat session:", session)
        # import os
        # APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbwz15KPgZF4t8aQ_YmR-pWNHixj2nYfykXMH3PXzZ-qqMssf9_inBgZwAfTZNVbGt5u/exec"
        # APPS_SCRIPT_URL = os.environ.get(APPS_SCRIPT_URL)
        if not APPS_SCRIPT_URL:
            return {"status": "error", "message": "Apps Script URL not configured"}

        # test code to check web app URL
        print("APPS_SCRIPT_URL:", APPS_SCRIPT_URL)

        # Forward to Apps Script
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                APPS_SCRIPT_URL,
                json=session,
                headers={"Content-Type": "application/json"},
                timeout=10.0
            )

            # resp_data = resp.json()

            # Robust parsing
            resp_text = resp.text.strip()
            try:
                resp_data = json.loads(resp_text)
            except json.JSONDecodeError:
                # fallback: treat raw text as message
                resp_data = {"status": "unknown", "message": resp_text}
                print("⚠️ Warning: Apps Script response not valid JSON, raw text:", resp_text)

            print("📤 Response from Apps Script:", resp_data)

        return {"status": "success", "appsScriptResponse": resp_data}

    except Exception as e:
        print("❌ ERROR saving chat:", e)
        return {"status": "error", "message": str(e)}

    