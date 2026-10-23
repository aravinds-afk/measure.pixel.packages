# ConnectSphere — Chapter Compatibility & Referral Intelligence

A web application that turns a business-networking chapter's member directory into a referral-generation system: transparent compatibility scores, reciprocal referral opportunities with trigger words and scripts, contact-sphere discovery, one-to-one meeting briefs and relationship tracking.

ConnectSphere is an independent tool. It is not affiliated with or endorsed by BNI and uses no BNI branding.

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, own component kit (`src/components/ui.tsx`) |
| Backend | Supabase: PostgreSQL with Row Level Security, Supabase Auth (invitation-only), one Edge Function (`supabase/functions/api`) |
| Scoring | Deterministic TypeScript engine (`supabase/functions/_shared/engine`), shared by the Edge Function, tests and demo mode |
| AI | Optional plain-language explanations via the Claude API, server-side only, de-identified input |

## Quick start (demo mode, no backend)

```bash
npm install
npm run dev          # http://localhost:5173
```

With no Supabase variables set, the app runs in **demo mode**: 17 fictional members in a chapter flagged as demo, stored only in the browser. Pick a persona (admin, leadership, member) on the sign-in screen.

## Documentation

- [docs/SETUP.md](docs/SETUP.md) — setup, deployment and configuration
- [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) — importing chapter members and administering the chapter
- [docs/SCORING.md](docs/SCORING.md) — the compatibility formula, factors, confidence and contact-sphere fit
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — database schema, security model, API
- [docs/TESTING.md](docs/TESTING.md) — test suites and latest results
- [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) — integrations and credentials still required

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `npm run build` | Develop / type-check and build |
| `npm test` | Unit tests (engine, importer, service layer, demo backend) |
| `npm run test:db` | Migrations + seed + 21 Row Level Security test groups on a local PostgreSQL |
| `npm run test:e2e` | Browser end-to-end run of every page (needs `vite preview` on :4173) |
| `npm run gen:sql` | Regenerate the taxonomy migration and demo seed from TypeScript sources |
