import os

from dotenv import load_dotenv

load_dotenv()

EXCHANGERATE_API_KEY = os.environ.get("EXCHANGERATE_API_KEY", "")
DB_PATH = os.environ.get("DB_PATH", "./data/app.db")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
FIREBASE_SERVICE_ACCOUNT_PATH = os.environ.get(
    "FIREBASE_SERVICE_ACCOUNT_PATH", "./firebase-service-account.json"
)
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")
