import logging
from datetime import datetime, timedelta, timezone

import redis

from app.config import REDIS_URL

logger = logging.getLogger("app.redis_cache")

_client: redis.Redis | None = None


def _seconds_until_next_utc_midnight() -> int:
    """ExchangeRate-API refreshes rates once per 24h, and rate_snapshots is keyed
    by UTC calendar day — align the Redis TTL to that boundary so cache and the
    SQLite tier always agree on "today's" rate, at most one API call/pair/day."""
    now = datetime.now(timezone.utc)
    next_midnight = (now + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return max(int((next_midnight - now).total_seconds()), 60)


def get_client() -> redis.Redis | None:
    global _client
    if _client is None:
        try:
            candidate = redis.Redis.from_url(REDIS_URL, decode_responses=True)
            candidate.ping()
            _client = candidate
        except Exception:
            logger.warning("Redis unavailable at %s — cache tier disabled.", REDIS_URL)
            return None
    return _client


def _key(base: str, target: str) -> str:
    return f"rate:{base}:{target}"


def get_cached_rate(base: str, target: str) -> float | None:
    client = get_client()
    if client is None:
        return None
    try:
        value = client.get(_key(base, target))
        return float(value) if value is not None else None
    except Exception:
        return None


def set_cached_rate(base: str, target: str, rate: float, ttl_seconds: int | None = None) -> None:
    client = get_client()
    if client is None:
        return
    try:
        client.set(
            _key(base, target),
            str(rate),
            ex=ttl_seconds or _seconds_until_next_utc_midnight(),
        )
    except Exception:
        pass
