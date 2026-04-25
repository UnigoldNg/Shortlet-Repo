# Shortlet Property Scoring System — PRD

## Original Problem Statement
Internal tool for advisors to score shortlet properties across 8 weighted categories (1–5 scale per sub-factor), compute a weighted percentage, classify into Tier 1 / 2 / 3, and apply an override rule that blocks Instant Booking when Availability or Owner Alignment is weak.

## User Personas
- **Property Advisor** — uses the tool daily to evaluate new shortlets, share reports, and recommend onboarding tiers.

## User Choices Captured (Iteration 1)
- No auth (open internal tool)
- Save evaluations to MongoDB with full history
- Dashboard with tier filter + PDF export (both)
- No photo upload
- Clean professional design (Swiss / Brutalist light theme — Cabinet Grotesk + Manrope)

## Architecture
- **Backend:** FastAPI + MongoDB (motor). All routes under `/api`. CRUD on `/api/evaluations`, plus `/api/scoring/schema`, `/api/scoring/preview`, `/api/stats`. Tier + override computed server-side in `compute_score()`.
- **Frontend:** React 19 + React Router 7 + Tailwind + Shadcn UI primitives + Recharts (radar) + Sonner toasts. Routes: `/` Dashboard, `/new` Multi-step form, `/evaluation/:id` Report page.

## Implemented (2026-02 — Iteration 1)
- 8 categories × 26 sub-factors with exact weights from spec, mirrored in backend `CATEGORIES` and frontend `lib/scoring.js`
- Multi-step scoring form: Property Info → 8 Category steps → Review & Submit
- Sticky left rail with live score, live tier badge, live override warning, completion progress
- 1–5 segmented score buttons (Swiss-style connected squares)
- Dashboard with stat cards (total, Tier 1/2/3, Instant Eligible), Tier filter chips, search by name/location, table with row actions (View, PDF, Delete)
- Report page: large typographic score, Tier badge, status row (tier label, instant eligibility, recommended action), 8-axis radar chart, per-category progress bars, full sub-factor breakdown table, advisor notes
- Override rule: Tier 1 blocked when Availability or Owner Alignment category < 60%
- PDF export via native `window.print()` with print stylesheet (hides chrome, A4, only the report card)

## Backlog
### P0 — none (MVP complete)
### P1
- Edit existing evaluation from result page (update endpoint already exists; add UI button)
- CSV export of dashboard list
- Authentication (JWT) when tool moves beyond internal trusted users
### P2
- Photo upload per property (later phase)
- Comparison view: side-by-side two evaluations
- Bulk import via CSV
- Audit trail (who edited what)
- Dashboard charts: tier distribution over time

## Tests
- Backend: `/app/backend/tests/test_scoring_api.py` — 16 pytest cases, all green (covers schema, CRUD, tier classification, override rule, search, filter, stats).
- Frontend: e2e via testing agent — all flows green.

## Next Tasks
- Await user feedback / feature requests.
- If usage grows, add JWT auth + per-advisor history.
