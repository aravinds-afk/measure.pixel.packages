# Testing

| Suite | Command | What it covers | Latest result (2026-10-23) |
|---|---|---|---|
| Type-check + build | `npm run build` | Whole frontend and shared engine under `strict` TypeScript | Pass |
| Edge Function type-check | `deno check --config supabase/functions/api/deno.json supabase/functions/api/index.ts` | Deno function against pinned `@supabase/supabase-js` and `@anthropic-ai/sdk` | Pass |
| Unit | `npm test` | Scoring engine, discovery, importer, service layer, demo backend | **32 / 32 passed** |
| Database / RLS | `npm run test:db` | All migrations + seed on PostgreSQL 16 with a Supabase auth stub; 21 test groups run as the `authenticated`/`anon`/`service_role` roles | **All 21 groups passed** |
| End-to-end | `npx vite preview --port 4173 &` then `npm run test:e2e` | Headless Chromium through every page as member and admin, plus a 390 px mobile pass | **37 / 37 checks passed** |

## Core workflows verified

| Acceptance criterion | Verified by |
|---|---|
| 1. Admin imports an authorised CSV | e2e: sample CSV upload → preview → import → member appears in directory |
| 2. Validation and duplicate prevention | unit: importer tests (in-file duplicates, id/email/name matching, invalid values); RLS 17: unique member IDs per chapter |
| 3. Members sign in and view permitted profiles | RLS 02–03, 08–09; e2e persona sign-in |
| 4–5. Two-member score with transparent breakdown | unit: weighted-sum test; e2e report page |
| 6. Reciprocal opportunities and trigger words | unit: evidence-backed opportunities, reciprocal vs one-way; e2e report panels |
| 7. Contact spheres from actual chapter data | unit: spheres use present members, missing listed separately; e2e spheres page |
| 8. Save matches and plan one-to-ones | e2e: save, plan, record outcome, pipeline auto-advances |
| 9. Useful / inaccurate feedback | e2e feedback; demo-backend test: admin resolution withdraws recommendation |
| 10. Admin manages data and permissions | RLS 14–17, 21; e2e deactivation + audit log |
| 11. Incomplete profiles handled | unit: missing data excluded not zeroed, Low confidence; e2e exploratory report |
| 12. Desktop and mobile | e2e: no horizontal overflow on 8 pages at 390 px; mobile navigation |
| 13. Unauthorised access blocked | RLS 01–21 (anon, cross-chapter, forged scores, role escalation, private contacts) |
| 14. Demo data separated | RLS 17 (demo flag forced from chapter); server refuses imports into demo chapters; UI labels |
| 15. End-to-end, not mockups | all suites above |

## Not covered by automated tests

- The deployed Edge Function was type-checked but not executed against a live Supabase project (no project credentials in this environment). Its business logic is the shared service code exercised by the unit and demo tests; its data access is covered by the RLS suite.
- Claude API calls were not executed (no API key). The fallback path returns the deterministic explanation.
- Invitation emails depend on your Supabase SMTP configuration.
