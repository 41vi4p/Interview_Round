# Currency Converter

A currency converter with live rates, a 30-day trend chart, favorites, and a
Travel Budgeting mode (one base amount converted into 5 major currencies at
once).

## Architecture

- **`backend/`** — Python FastAPI (port 8000). Owns all calls to
  ExchangeRate-API, SQLite, Redis, and Firebase Admin token verification. The
  ExchangeRate API key and Firebase service-account credentials live only
  here, never in the frontend.
- **`frontend/`** — Next.js 16 App Router + Tailwind v4 + Firebase client SDK
  (port 3000). Talks to the backend only via same-origin `/api/*`, proxied by
  a `next.config.ts` rewrite to the backend. Firebase Auth (email/password +
  Google) gates favorites/history; conversion/trend/budget are public.
- **`docker-compose.yml`** — Redis only (`docker compose up -d`).
- **Rate lookups** flow through a fallback chain — Redis (fast path) →
  SQLite `rate_snapshots` (durable, last-known-good) → ExchangeRate-API — with
  write-back into both. Redis TTL expires at the next UTC midnight so this
  costs **at most one external API call per currency pair per day**. This
  same table doubles as the source for the 30-day trend chart, which
  self-builds one snapshot per pair per day rather than using
  ExchangeRate-API's paid Historical Data endpoint.

The full API contract (every endpoint, request/response shape, SQLite schema,
privacy notes) lives in **`docs/implementation.md`** — read that before
changing any endpoint or adding a new one, and keep it in sync with the code.

## Running everything

```bash
docker compose up -d                                   # Redis

cd backend && source .venv/bin/activate                # uv-managed venv
uvicorn app.main:app --reload --port 8000               # Swagger UI: /docs

cd frontend && bun dev                                  # http://localhost:3000
```

Backend env: `backend/.env` (from `.env.example`) needs `EXCHANGERATE_API_KEY`
and, for auth-gated endpoints, a `firebase-service-account.json`. Frontend
env: `frontend/.env.local` (from `.env.local.example`) needs the public
Firebase web config (`NEXT_PUBLIC_FIREBASE_*`).

## Versioning & Changelog

This project tracks a single project-wide version in the root **`VERSION`**
file (semver: `MAJOR.MINOR.PATCH`), independent of either package's own
`package.json`/dependency versions.

**For every change — however small — bump `VERSION` and add a matching entry
to `docs/CHANGELOG.md`** (Keep a Changelog format: `### Added` / `Changed` /
`Fixed` / `Removed` under a `## [x.y.z] - YYYY-MM-DD` heading), before
considering the change done:

- **PATCH** (`0.5.0` → `0.5.1`): bug fixes, copy/config tweaks, refactors with
  no behavior change.
- **MINOR** (`0.5.0` → `0.6.0`): new features or endpoints, backward-compatible.
- **MAJOR** (`0.5.0` → `1.0.0`): breaking changes to the API contract, schema,
  or auth model.

Never skip this step, and never batch multiple unrelated changes into one
changelog entry — one entry per logical change.

`README.md` also carries a static version badge near the top
(`![Version](...version-x.y.z...)`) — update it to match `VERSION` in the
same change.
