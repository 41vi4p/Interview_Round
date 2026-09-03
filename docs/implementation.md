# Currency Converter — Implementation Plan & API Contract

This document is the single source of truth for building the backend and frontend **in parallel, in two separate terminals**. Both sides build against the contract below — the backend implements it exactly, the frontend calls it exactly (using fixture data until the backend is reachable). No other coordination should be needed until final integration.

## Architecture

```
interview_round/
├── docker-compose.yml   # Redis only (infra) — `docker compose up -d`
├── docs/implementation.md
├── backend/             # Terminal A — Python FastAPI, port 8000
└── frontend/            # Terminal B — Next.js 16 App Router, port 3000, bun
```

- **Backend**: Python FastAPI (not Next.js API routes). Owns all calls to ExchangeRate-API, SQLite, Redis, and Firebase Admin token verification. The ExchangeRate API key and Firebase service-account credentials live **only** in `backend/.env` / a gitignored service-account file — never sent to or readable by the frontend.
- **Frontend**: Next.js App Router + Tailwind v4 (already scaffolded) + Firebase client SDK for auth. Talks to the backend **only** via same-origin `/api/*`, proxied by a `next.config.ts` rewrite to `http://127.0.0.1:8000/api/*`. No CORS needed in the browser; FastAPI still allows `http://localhost:3000` via CORS middleware for direct testing (Swagger UI, curl).
- **Data flow**: Rate lookups go through a fallback chain — Redis (fast path) → SQLite `rate_snapshots` (durable, last-known-good) → ExchangeRate-API (source of truth) — with write-back into both Redis and SQLite. See "Rate Lookup Fallback Chain" below. This also produces the 30-day trend data as a side effect (one snapshot row per pair per UTC day).
- **Auth**: Firebase Auth (Email/Password + Google) on the frontend. The frontend attaches `Authorization: Bearer <Firebase ID token>` to requests; the backend verifies it server-side via `firebase-admin` and scopes favorites/history to that UID. Currency conversion, trend, and budget endpoints are public (no login required to just convert money).

### Why not the paid Historical Data endpoint?

ExchangeRate-API's `/history` endpoint (needed for a "real" 30-day backfill) requires a Pro/Business/Volume plan — confirmed via their docs; the Free plan only exposes `/latest` and `/pair`. Instead, the backend snapshots each requested pair's rate once per UTC calendar day into `rate_snapshots`. The trend chart is sparse on day one and fills in over the following days — the frontend should communicate this (e.g. "trend builds up daily — check back over the next month for the full 30-day view") rather than expect a fully populated chart immediately.

## Rate Lookup Fallback Chain (backend-internal, not a separate endpoint)

Used by `/api/convert`, `/api/trend`'s daily-snapshot step, and `/api/budget`:

1. **Redis** — `GET rate:{base}:{target}`. Hit → return immediately (`source: "cache"`).
2. **SQLite (durable, last-known)** — miss → look up `rate_snapshots` for that pair. If a row exists **from today (UTC)**, use it, write it back into Redis, return (`source: "db"`).
3. **External API** — both miss/stale → call ExchangeRate-API, then write-back to **both** Redis and SQLite `rate_snapshots` (upsert on `(base, target, snapshot_date)`), return (`source: "api"`).

Redis TTL is not a fixed duration — it expires exactly at the next UTC midnight (ExchangeRate-API refreshes rates once per 24h, and `rate_snapshots` is keyed by UTC calendar day, so aligning Redis to that same boundary means cache and DB always agree on "today's" rate). Net effect: **at most one ExchangeRate-API call per pair per UTC day**, regardless of request volume.

## ExchangeRate-API Reference (v6, `https://v6.exchangerate-api.com/v6/{API_KEY}/...`)

- Latest rates: `GET /v6/{KEY}/latest/{base}` → `{ result, base_code, conversion_rates: { "EUR": 0.92, ... }, time_last_update_unix, ... }`. Free plan.
- Pair conversion: `GET /v6/{KEY}/pair/{base}/{target}` (optionally `/pair/{base}/{target}/{amount}`) → `{ result, base_code, target_code, conversion_rate, [conversion_result] }`. Free plan.
- Supported codes: `GET /v6/{KEY}/codes` → `{ result, supported_codes: [["USD","United States Dollar"], ...] }`. Free plan.
- Historical data: `GET /v6/{KEY}/history/{code}/{year}/{month}/{day}` — **Pro/Business/Volume plans only**, not used in this build.
- Error shape: `{ "result": "error", "error-type": "invalid-key" | "unsupported-code" | "malformed-request" | "inactive-account" | "quota-reached" }`.
- Backend should minimize calls: cache `/codes` in memory at startup; only hit `/latest` or `/pair` when the Redis→SQLite chain above misses.

## API Contract

**Auth header**: protected endpoints require `Authorization: Bearer <Firebase ID token>`. Missing/invalid → `401 {"detail": "unauthorized"}`. Public endpoints work without it; if a valid token *is* present on `/api/convert`, the conversion is also logged to that user's history.

All error responses: `{ "detail": "<message>" }` (FastAPI default `HTTPException` shape).

### 1. `GET /api/currencies` (public)
```json
{ "currencies": [{ "code": "USD", "name": "United States Dollar" }] }
```

### 2. `GET /api/convert?base=USD&target=EUR&amount=100` (public; logs history if authed)
```json
{ "base": "USD", "target": "EUR", "amount": 100, "rate": 0.92, "result": 92.0, "source": "cache", "timestamp": "2026-09-03T12:00:00Z" }
```
`source` is one of `cache | db | api`, reflecting which tier of the fallback chain answered.

### 3. `GET /api/trend?base=USD&target=EUR` (public)
```json
{ "base": "USD", "target": "EUR", "points": [{ "date": "2026-08-05", "rate": 0.91 }] }
```
Up to the last 30 daily snapshots for that pair, ascending by date. Triggers a same-day snapshot fetch (via the fallback chain) if today's row is missing.

### 4. Favorites (auth required)
- `GET /api/favorites` → `{ "favorites": [{ "id": 1, "base": "USD", "target": "EUR", "created_at": "2026-09-03T12:00:00Z" }] }` — only the caller's own rows.
- `POST /api/favorites` body `{ "base": "USD", "target": "EUR" }` → `201` + created row.
- `DELETE /api/favorites/{id}` → `204`. `403` if the row belongs to a different UID, `404` if it doesn't exist.

### 5. `GET /api/history?limit=20` (auth required)
```json
{ "history": [{ "base": "USD", "target": "EUR", "amount": 100, "result": 92.0, "created_at": "2026-09-03T12:00:00Z" }] }
```
Only the caller's own rows, most recent first.

### 6. `POST /api/budget` (public) — Travel Budgeting mode
Request: `{ "base": "USD", "amount": 1000 }`
```json
{
  "base": "USD",
  "amount": 1000,
  "results": [
    { "currency": "EUR", "rate": 0.92, "converted": 920.0 },
    { "currency": "GBP", "rate": 0.79, "converted": 790.0 },
    { "currency": "JPY", "rate": 147.2, "converted": 147200.0 },
    { "currency": "AUD", "rate": 1.52, "converted": 1520.0 },
    { "currency": "CAD", "rate": 1.36, "converted": 1360.0 }
  ]
}
```
Always exactly 5 entries from the fixed set `USD, EUR, GBP, JPY, AUD` — if `base` is itself in that set, swap it out for `CAD` so there are always 5 distinct target currencies.

## SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, base_currency, target_currency)
);

CREATE TABLE IF NOT EXISTS conversion_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  amount REAL NOT NULL,
  converted_amount REAL NOT NULL,
  rate REAL NOT NULL,
  created_at TEXT NOT NULL
);

-- Not user-scoped: shared public market data, doubles as the durable cache tier.
CREATE TABLE IF NOT EXISTS rate_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate REAL NOT NULL,
  snapshot_date TEXT NOT NULL,
  UNIQUE(base_currency, target_currency, snapshot_date)
);
```

## Privacy & Data Handling

- Every protected route resolves identity **only** from a server-verified Firebase ID token — no endpoint ever accepts a `user_id` from the request body/query string, so one user can never read or modify another's favorites/history.
- SQLite stores only the opaque Firebase UID, never email/profile data — we don't duplicate Firebase's own user records.
- Firebase service-account JSON (admin credentials) is backend-only, gitignored, loaded from a file path in `.env`. The frontend only ever holds the public Firebase *web* config (`NEXT_PUBLIC_FIREBASE_*`) — safe to expose per Firebase's own model, since protection comes from server-side token verification, not from hiding the config.
- `rate_snapshots` is public market data, shareable across all users.
- Redis bound to localhost only (docker-compose); CORS restricted to `http://localhost:3000`.
- Never log `Authorization` headers or raw ID tokens.
- ExchangeRate API key: backend-only, never in a `NEXT_PUBLIC_*` var or any response body.

## Environment Variables

**`backend/.env`** (see `backend/.env.example`):
```
EXCHANGERATE_API_KEY=
DB_PATH=./data/app.db
REDIS_URL=redis://localhost:6379/0
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
CORS_ORIGINS=http://localhost:3000
```

**`frontend/.env.local`** (see `frontend/.env.local.example`):
```
BACKEND_URL=http://127.0.0.1:8000
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Running Everything

```bash
# One-time infra
docker compose up -d          # starts Redis on localhost:6379

# Terminal A — backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in EXCHANGERATE_API_KEY + firebase-service-account.json path
uvicorn app.main:app --reload --port 8000
# Swagger UI at http://localhost:8000/docs

# Terminal B — frontend
cd frontend
bun install
cp .env.local.example .env.local   # fill in Firebase web config
bun dev
# App at http://localhost:3000
```

## Verification Checklist

- [ ] `curl http://localhost:8000/api/currencies` returns the documented shape.
- [ ] `curl "http://localhost:8000/api/convert?base=USD&target=EUR&amount=100"` returns a result; repeating it flips `source` from `api` to `cache`.
- [ ] `curl http://localhost:8000/api/favorites` without a token returns `401`.
- [ ] `sqlite3 backend/data/app.db "select * from rate_snapshots;"` shows rows after conversions.
- [ ] `redis-cli GET rate:USD:EUR` returns a cached value after a conversion.
- [ ] Frontend: sign up / sign in (email + Google), add a favorite, see it persist across reload, confirm a second account never sees the first account's favorites/history.
- [ ] Travel Budgeting toggle returns exactly 5 currencies in the comparison table.
- [ ] `grep -rE "EXCHANGERATE_API_KEY|FIREBASE_SERVICE_ACCOUNT" frontend/` returns nothing.
- [ ] Browser devtools Network tab: no request/response ever contains the raw ExchangeRate API key or Firebase service-account content.
