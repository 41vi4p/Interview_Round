import httpx

from app.config import GEMINI_API_KEY, GEMINI_MODEL

BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


class GeminiError(Exception):
    pass


def generate_reply(system_instruction: str, contents: list[dict]) -> str:
    """contents: [{"role": "user" | "model", "parts": [{"text": str}]}, ...]"""
    if not GEMINI_API_KEY:
        raise GeminiError("missing GEMINI_API_KEY")

    url = f"{BASE_URL}/models/{GEMINI_MODEL}:generateContent"
    body = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 512},
    }

    try:
        response = httpx.post(url, params={"key": GEMINI_API_KEY}, json=body, timeout=20.0)
        data = response.json()
    except httpx.HTTPError as exc:
        raise GeminiError(str(exc)) from exc

    if response.status_code != 200:
        message = data.get("error", {}).get("message", "unknown Gemini error")
        raise GeminiError(message)

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError) as exc:
        raise GeminiError("empty response from Gemini") from exc
