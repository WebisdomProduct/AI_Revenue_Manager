# =======================
# Configuration File
# =======================
from dotenv import load_dotenv
import os

# Load .env file
load_dotenv()

# --- Gemini API ---
# Create an API key at https://aistudio.google.com/app/apikey
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL")
