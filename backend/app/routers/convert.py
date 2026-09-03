from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app import db
from app.auth import get_optional_user
from app.models import ConvertResponse
from app.services import rates
from app.services.exchange_rate_client import ExchangeRateAPIError

router = APIRouter()


@router.get("/convert", response_model=ConvertResponse)
def convert(
    base: str,
    target: str,
    amount: float = 1,
    user_id: str | None = Depends(get_optional_user),
) -> ConvertResponse:
    base, target = base.upper(), target.upper()
    try:
        rate, source = rates.get_rate(base, target)
    except ExchangeRateAPIError as exc:
        raise HTTPException(status_code=502, detail=exc.error_type) from exc

    result = amount * rate

    if user_id is not None:
        db.insert_history(user_id, base, target, amount, result, rate)

    return ConvertResponse(
        base=base,
        target=target,
        amount=amount,
        rate=rate,
        result=result,
        source=source,
        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
