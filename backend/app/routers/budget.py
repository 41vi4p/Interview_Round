from fastapi import APIRouter, HTTPException

from app.models import BudgetRequest, BudgetResponse, BudgetResult
from app.services import rates
from app.services.exchange_rate_client import ExchangeRateAPIError

router = APIRouter()

MAJOR_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD"]
FALLBACK_CURRENCY = "CAD"
MAX_TARGETS = 8


@router.post("/budget", response_model=BudgetResponse)
def budget(payload: BudgetRequest) -> BudgetResponse:
    base = payload.base.upper()

    if payload.targets:
        seen: set[str] = set()
        targets: list[str] = []
        for code in payload.targets:
            code = code.upper()
            if code == base or code in seen:
                continue
            seen.add(code)
            targets.append(code)
        targets = targets[:MAX_TARGETS]
    else:
        targets = [c for c in MAJOR_CURRENCIES if c != base]
        if len(targets) < 5:
            targets.append(FALLBACK_CURRENCY)
        targets = targets[:5]

    try:
        rate_by_target = rates.get_multi_rates(base, targets)
    except ExchangeRateAPIError as exc:
        raise HTTPException(status_code=502, detail=exc.error_type) from exc

    results = [
        BudgetResult(currency=target, rate=rate, converted=payload.amount * rate)
        for target, rate in rate_by_target.items()
    ]

    return BudgetResponse(base=base, amount=payload.amount, results=results)
