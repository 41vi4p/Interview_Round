from typing import Literal

from app import db
from app.services import exchange_rate_client, redis_cache

Source = Literal["cache", "db", "api"]


def get_rate(base: str, target: str) -> tuple[float, Source]:
    """Redis -> SQLite (today's snapshot) -> ExchangeRate-API, writing back to both on a miss."""
    cached = redis_cache.get_cached_rate(base, target)
    if cached is not None:
        return cached, "cache"

    snapshot = db.get_snapshot_for_today(base, target)
    if snapshot is not None:
        rate = snapshot["rate"]
        redis_cache.set_cached_rate(base, target, rate)
        return rate, "db"

    data = exchange_rate_client.get_pair(base, target)
    rate = data["conversion_rate"]
    redis_cache.set_cached_rate(base, target, rate)
    db.upsert_snapshot(base, target, rate)
    return rate, "api"


def get_multi_rates(base: str, targets: list[str]) -> dict[str, float]:
    """Same fallback chain for several targets at once, batching the API tier into one
    /latest/{base} call for whichever targets weren't already cached or snapshotted today."""
    results: dict[str, float] = {}
    missing: list[str] = []

    for target in targets:
        cached = redis_cache.get_cached_rate(base, target)
        if cached is not None:
            results[target] = cached
            continue
        snapshot = db.get_snapshot_for_today(base, target)
        if snapshot is not None:
            rate = snapshot["rate"]
            redis_cache.set_cached_rate(base, target, rate)
            results[target] = rate
            continue
        missing.append(target)

    if missing:
        data = exchange_rate_client.get_latest(base)
        conversion_rates = data.get("conversion_rates", {})
        for target in missing:
            rate = conversion_rates.get(target)
            if rate is None:
                continue
            redis_cache.set_cached_rate(base, target, rate)
            db.upsert_snapshot(base, target, rate)
            results[target] = rate

    return results
