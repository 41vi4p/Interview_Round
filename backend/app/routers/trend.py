from fastapi import APIRouter, HTTPException

from app import db
from app.models import TrendPoint, TrendResponse
from app.services import rates
from app.services.exchange_rate_client import ExchangeRateAPIError

router = APIRouter()


@router.get("/trend", response_model=TrendResponse)
def trend(base: str, target: str) -> TrendResponse:
    base, target = base.upper(), target.upper()

    if db.get_snapshot_for_today(base, target) is None:
        try:
            rates.get_rate(base, target)
        except ExchangeRateAPIError as exc:
            raise HTTPException(status_code=502, detail=exc.error_type) from exc

    rows = db.list_last_30_snapshots(base, target)
    points = [TrendPoint(date=row["snapshot_date"], rate=row["rate"]) for row in rows]
    return TrendResponse(base=base, target=target, points=points)
