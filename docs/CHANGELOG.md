# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/) via the root `VERSION` file.

## [0.9.0] - 2026-09-03

### Added
- Travel Budgeting now lets you choose which destination currencies to
  compare against, not just the home currency — add/remove/change up to 8
  targets via `CurrencySelect` dropdowns in `BudgetBoard.tsx`. Defaults to
  the previous fixed 5-currency set so the initial view is unchanged.
- `POST /api/budget` accepts an optional `targets: string[]` field
  (`BudgetRequest` in `backend/app/models.py`) — uppercased, deduped, `base`
  excluded, capped at 8. Omitted/empty `targets` keeps the exact previous
  default behavior (backward compatible). `getBudget()`/`fixtureBudget()` on
  the frontend updated to match.

## [0.8.0] - 2026-09-03

### Fixed
- `CurrencySelect` (and `BudgetBoard`'s home-currency select) was missing
  `w-full`/`min-w-0`, so its `<select>` sized to its longest option text
  ("USD — United States Dollar") inside a CSS Grid `1fr` track, which
  defaults to `min-width: auto` — the select overflowed its track and pushed
  the swap button and the "To" currency selector off-screen. Added
  `min-w-0`/`w-full`/`truncate` to the selects and their label wrappers, and
  `minmax(0,1fr)` to the grid tracks in `ConverterCard` and `BudgetBoard`.
- `/login` page content was top-anchored in the page's full-height `<main>`,
  leaving a large empty area below the sign-in card. The page now centers
  its content vertically (`flex-1 items-center justify-center`).

## [0.7.0] - 2026-09-03

### Added
- `backend/Dockerfile` (python:3.13-slim + `uv`) and `frontend/Dockerfile`
  (multi-stage `bun` build, Next.js `output: "standalone"`).
- `docker-compose.yml` now runs all three services (`redis`, `backend`,
  `frontend`), not just Redis. SQLite persists via a host bind mount,
  Redis via a named volume.
- Root `.env.example` for the frontend's `NEXT_PUBLIC_FIREBASE_*` Docker
  build args (distinct from `frontend/.env.local`, used for native `bun dev`).

### Fixed
- `app/auth.py`: Firebase init now checks `os.path.isfile` (not `exists`)
  and wraps credential loading in try/except — a Docker bind mount of a
  not-yet-created host file creates an empty *directory* at that path, which
  `exists()` would accept and then crash startup trying to parse it as JSON.
- Frontend `next.config.ts` `rewrites()` is evaluated once at `next build`
  time into the routes manifest, not re-read at container start, so
  `BACKEND_URL` had to move from a runtime `environment:` value to a Docker
  **build arg** (`http://backend:8000`) — otherwise the standalone server
  kept proxying to the build-time default and every `/api/*` call 500'd.

## [0.6.0] - 2026-09-03

### Added
- Full project `README.md`: badges, architecture diagram (Mermaid), tech
  stack table, getting-started guide, API overview, project structure, and
  security/limitations summary.

## [0.5.0] - 2026-09-03

### Added
- Root `CLAUDE.md` documenting the project for future sessions/agents.
- `VERSION` file and this changelog as the versioning system for the project.

## [0.4.0] - 2026-09-03

### Added
- Full Next.js frontend: currency converter with live trend chart, favorites
  (sign-in gated), Travel Budgeting view (`/budget`, 5-currency comparison
  table), Firebase Auth (email/password + Google) via `context/AuthContext.tsx`.
- `lib/api.ts` fixture/localStorage fallback so the UI degrades gracefully if
  the backend is briefly unreachable.
- `next.config.ts` rewrite proxy (`/api/*` → FastAPI backend), keeping all
  backend calls same-origin from the browser.

### Verified
- `tsc --noEmit`, `eslint`, and `next build` all pass cleanly.
- Every endpoint exercised through the live rewrite proxy against the running
  backend (convert, trend, budget, and 401 on unauthenticated favorites).

## [0.3.0] - 2026-09-03

### Changed
- Redis cache TTL for rate lookups now expires at the next UTC midnight
  instead of a flat 1-hour window, matching ExchangeRate-API's real 24-hour
  refresh cadence. Guarantees at most one external API call per currency pair
  per UTC day, regardless of request volume.

## [0.2.0] - 2026-09-03

### Added
- FastAPI backend (`backend/`): SQLite persistence (`favorites`,
  `conversion_history`, `rate_snapshots`), Redis cache, and the
  Redis → SQLite → ExchangeRate-API fallback chain (`app/services/rates.py`).
- Firebase ID token verification (`app/auth.py`) gating `/api/favorites` and
  `/api/history`, scoped per-user by Firebase UID.
- Endpoints: `/api/currencies`, `/api/convert`, `/api/trend`, `/api/budget`
  (Travel Budgeting — 5 major currencies), `/api/favorites`, `/api/history`.

### Verified
- Live end-to-end test against the real ExchangeRate-API: cache/db/api
  fallback tiers all confirmed working via the `source` field.

## [0.1.0] - 2026-09-03

### Added
- `docs/implementation.md` — the frozen API contract and architecture doc
  used to split backend/frontend work into parallel workstreams.
- `docker-compose.yml` — Redis service for the caching layer.
