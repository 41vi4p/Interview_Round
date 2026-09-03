from fastapi import APIRouter, Depends

from app import db
from app.auth import get_current_user
from app.models import HistoryEntry, HistoryResponse

router = APIRouter()


@router.get("/history", response_model=HistoryResponse)
def read_history(limit: int = 20, user_id: str = Depends(get_current_user)) -> HistoryResponse:
    rows = db.list_history(user_id, limit=limit)
    history = [
        HistoryEntry(
            base=row["base_currency"],
            target=row["target_currency"],
            amount=row["amount"],
            result=row["converted_amount"],
            created_at=row["created_at"],
        )
        for row in rows
    ]
    return HistoryResponse(history=history)
