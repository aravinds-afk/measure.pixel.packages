# Measure Pixel Growth Advisor

Internal, mobile-first consulting tool for Measure Pixel: diagnose a business, recommend solutions from the Opportunity Board, configure a package with live pricing, issue a branded quotation, and record everything in Google Sheets.

```
Business Discovery → Brand Audit → Identify Gaps → Recommend Solutions
→ Customize Services → Live Pricing → Generate Quotation → Save to Google Sheets
```

## Stack

| Concern | Choice | Why |
|---|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript | One codebase for UI and the server routes that hold secrets, crawl sites and validate prices |
| Styling | Tailwind CSS 4, own small component set | Restrained, Apple-like UI without an admin template look |
| Database | SQLite via libSQL + Drizzle ORM, SQL migrations in `drizzle/` | Local file in development, Turso (hosted libSQL) in production — same dialect, no server to run |
| Auth | Email + password (bcrypt), signed HTTP-only session cookie (jose), roles `admin` / `consultant` | No third-party dependency; permissions checked server-side on every route |
| PDF | `@react-pdf/renderer` with embedded Inter (OFL) | Server-rendered, ₹ glyph support |
| Sheets | Google Sheets REST API with a service account, database-first sync queue | Secrets never reach the browser; retries are idempotent |
| Tests | Vitest (unit + persistence + sync), Playwright script (end-to-end) | |

## Quick start

```bash
npm install
cp .env.example .env.local          # then set AUTH_SECRET (see the file)
npm run db:setup                    # migrations + Opportunity Board seed
MP_PASSWORD='choose-a-long-password' npm run user:create -- --email you@measurepixel.in --name "Your Name" --role admin
npm run dev                         # http://localhost:3000
```

Full setup, Google Sheets configuration and deployment: **[docs/SETUP.md](docs/SETUP.md)**.
Where every catalogue value comes from, and what still needs configuring: **[docs/OPPORTUNITY-BOARD.md](docs/OPPORTUNITY-BOARD.md)**.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit, persistence and Sheets-sync tests (Vitest) |
| `npm run test:e2e` | Browser walk-through of the full workflow against a running server (see SETUP) |
| `npm run typecheck` / `lint` | TypeScript, ESLint |
| `npm run db:migrate` / `db:seed` / `db:setup` | Apply migrations / seed missing catalogue rows (never overwrites edits) |
| `npm run db:generate` | New migration after changing `src/server/db/schema.ts` |
| `npm run user:create` | Create or reset a user (password from `MP_PASSWORD`) |
| `npm run sheets:sync` | Push all queued/failed Sheets writes |

## Code map

```
src/data/opportunity-board.ts   Board data, transcribed: 32 services, 5 links, 44 industries, 5 clusters, 14 offers, targets
src/data/defaults.ts            Non-board defaults: audit checklist, recommendation rules, dependencies, example prices, terms
src/lib/pricing.ts              Pricing engine (shared client/server, integer paise)
src/lib/recommend.ts            Deterministic recommendation engine
src/lib/client-view.ts          Allowlist sanitiser for anything a client sees
src/lib/revenue.ts              Dashboard maths (signed vs pipeline vs cash)
src/server/discovery/           SSRF-safe fetcher, robots.txt, HTML extraction, findings
src/server/services/            Audits, quotations (versioning, idempotency, permissions), admin
src/server/sheets/              Sheets client, row mapping, sync queue
src/server/pdf/                 Quotation PDF
src/app/                        Screens and API routes
tests/, e2e/                    Tests
```

## Key behaviours

- **Prices are deterministic.** Offers start at the bottom of their board band; consultants can move within the band. Prices outside the band, edits to configured service prices, and discounts above the consultant limit need admin or the price-override permission — enforced on the server, which also recomputes every total and rejects a save whose totals differ from the browser's.
- **One-time, monthly, annual, ad spend, third-party and optional amounts are never merged.** Contract value appears only when a contract duration is set.
- **Recommendations come from findings.** Industry alone recommends nothing; an offer needs an audit gap or a buyer quote the client recognised. Every recommendation shows the problem, rationale, outcome, dependencies, missing information and the board price band.
- **Website discovery reports what it saw.** Verified facts, inferences and unknowns are labelled separately; an audit item is set automatically only on conclusive evidence (e.g. GA4 tag in source), otherwise it becomes a suggestion. Unreachable sites and social platforms are reported as such, not marked missing.
- **Quotations are snapshots.** Issuing locks a version; revising creates v2 and leaves v1 untouched. Catalogue edits never change existing quotations.
- **Client mode, presentation, PDF and public links** render only the sanitised client view — no internal notes, delivery costs, margins or rationale.
- **Database first, then Sheets.** Each write is queued and upserted by ID, so retries never duplicate rows; the UI reports "synced" only after Google confirms.
