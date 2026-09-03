from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.models import ChatRequest, ChatResponse
from app.services import gemini_client
from app.services.chat_context import build_context

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, user_id: str = Depends(get_current_user)) -> ChatResponse:
    system_instruction, context_date = build_context(user_id)

    contents = [
        {"role": msg.role, "parts": [{"text": msg.text}]} for msg in payload.history
    ]
    contents.append({"role": "user", "parts": [{"text": payload.message}]})

    try:
        reply = gemini_client.generate_reply(system_instruction, contents)
    except gemini_client.GeminiError as exc:
        raise HTTPException(status_code=502, detail="chat unavailable") from exc

    return ChatResponse(reply=reply, context_date=context_date)
