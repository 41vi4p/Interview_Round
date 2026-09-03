import httpx

from app.config import EXCHANGERATE_API_KEY

BASE_URL = "https://v6.exchangerate-api.com/v6"


class ExchangeRateAPIError(Exception):
    def __init__(self, error_type: str):
        self.error_type = error_type
        super().__init__(f"ExchangeRate-API error: {error_type}")


def _get(path: str) -> dict:
    if not EXCHANGERATE_API_KEY:
        raise ExchangeRateAPIError("invalid-key")
    url = f"{BASE_URL}/{EXCHANGERATE_API_KEY}/{path}"
    response = httpx.get(url, timeout=10.0)
    data = response.json()
    if data.get("result") == "error":
        raise ExchangeRateAPIError(data.get("error-type", "unknown-error"))
    return data


def get_latest(base: str) -> dict:
    """Returns { base_code, conversion_rates: { "EUR": 0.92, ... }, ... }"""
    return _get(f"latest/{base}")


def get_pair(base: str, target: str) -> dict:
    """Returns { base_code, target_code, conversion_rate, ... }"""
    return _get(f"pair/{base}/{target}")


def get_codes() -> list[tuple[str, str]]:
    """Returns [(code, name), ...]"""
    data = _get("codes")
    return [(code, name) for code, name in data.get("supported_codes", [])]
