from fastapi import APIRouter, HTTPException

from app.models import Currency, CurrenciesResponse
from app.services.exchange_rate_client import ExchangeRateAPIError, get_codes

router = APIRouter()

_cached_currencies: list[Currency] | None = None


@router.get("/currencies", response_model=CurrenciesResponse)
def read_currencies() -> CurrenciesResponse:
    global _cached_currencies
    if _cached_currencies is None:
        try:
            codes = get_codes()
        except ExchangeRateAPIError as exc:
            raise HTTPException(status_code=502, detail=exc.error_type) from exc
        _cached_currencies = [Currency(code=code, name=name) for code, name in codes]
    return CurrenciesResponse(currencies=_cached_currencies)
