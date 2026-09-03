from datetime import datetime, timezone

from app import db
from app.services import rates
from app.services.exchange_rate_client import ExchangeRateAPIError

SEED_TARGETS = ["EUR", "GBP", "JPY", "AUD", "INR", "CAD"]
MAX_FAVORITES_IN_CONTEXT = 8


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def build_context(user_id: str) -> tuple[str, str]:
    """Returns (system_instruction, context_date). Reuses whatever's already
    cached/snapshotted today (no forced extra API calls) — seeds a small majors
    set only if nothing has been looked up yet today, and always ensures the
    caller's own favorite pairs are represented."""
    today = _today()
    rate_lines: dict[tuple[str, str], float] = {}

    for row in db.list_todays_snapshots():
        rate_lines[(row["base_currency"], row["target_currency"])] = row["rate"]

    if not rate_lines:
        try:
            seeded = rates.get_multi_rates("USD", SEED_TARGETS)
            for target, rate in seeded.items():
                rate_lines[("USD", target)] = rate
        except ExchangeRateAPIError:
            pass

    favorites = db.list_favorites(user_id)[:MAX_FAVORITES_IN_CONTEXT]
    for fav in favorites:
        pair = (fav["base_currency"], fav["target_currency"])
        if pair in rate_lines:
            continue
        try:
            rate, _source = rates.get_rate(*pair)
            rate_lines[pair] = rate
        except ExchangeRateAPIError:
            continue

    lines = [
        f"1 {base} = {rate} {target}"
        for (base, target), rate in sorted(rate_lines.items())
    ]
    rate_block = "\n".join(lines) if lines else "(no rate data available right now)"

    system_instruction = (
        "You are the Information Desk, a currency exchange assistant inside the "
        "Rate Board app. Answer questions about currency conversion and exchange "
        "rates using ONLY the data below — do not use your own training knowledge "
        "of exchange rates, they are out of date. If asked about a pair not listed, "
        "say you don't have live data for that pair right now, but compute an "
        "implied cross-rate yourself if both currencies appear below (e.g. via "
        "USD). Be concise and conversational, a sentence or two. Always be clear "
        "this data is as of the date below, not real-time.\n\n"
        f"Exchange rate data as of {today} (UTC):\n{rate_block}"
    )
    return system_instruction, today
