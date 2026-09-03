# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/) via the root `VERSION` file.

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
