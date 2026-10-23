# Architecture

```
Browser (React)  ──supabase-js──▶  PostgreSQL (RLS)          reads/writes the user is allowed to make
       │                                ▲
       └──functions.invoke("api")──▶ Edge Function "api"      verifies JWT + chapter role,
                                        │  reads with the caller's JWT (RLS applies),
                                        │  runs the scoring engine,
                                        │  writes assessments / imports / invitations with the service role,
                                        └─▶ Claude API (optional, de-identified explanation only)
```

Demo mode swaps the backend for an in-browser implementation of the same `Backend` interface (`src/lib/backend/demo.ts`) that calls the same service and engine code on fictional data.

## Database schema

Migration: `supabase/migrations/20261023000001_schema.sql`.

| Table | Purpose |
|---|---|
| `chapters` | Chapter, `is_demo` flag (immutable), scoring `settings` (weights, bands), `retention_days` |
| `chapter_roles` | User ↔ chapter role (`admin`, `leadership`, `member`) |
| `members` | Member profile: identity, category, description, sizes, areas, problems, keywords, ICP text, ideal referral, `field_provenance`, status, source, import job, timestamps, generated `name_key` for duplicate detection |
| `member_contacts` | Email/phone + visibility (`chapter` / `private`) |
| `member_private` | Voluntary average transaction value (owner + admins; leadership only if shared) |
| `member_services`, `member_icps`, `industries` + `member_industries` | Normalised services, customer segments and industries, each with provenance |
| `professional_categories` | Taxonomy categories (+ chapter custom categories) |
| `contact_spheres`, `contact_sphere_categories`, `contact_sphere_memberships` | Sphere templates, their professions, and recorded member memberships |
| `member_relationships` | Existing referral partners, customers and vendors |
| `compatibility_assessments` | Stored results (score, confidence, full breakdown, engine version, weights) — written only by the backend |
| `referral_recommendations` | Recommendations generated for each assessment |
| `recommendation_feedback`, `suppressed_recommendations` | Useful/inaccurate ratings; admin resolutions and chapter-wide withdrawals |
| `saved_connections`, `connection_events` | Personal shortlist with pipeline status and automatic status history |
| `one_to_one_meetings` | Briefs, schedule, agreed next action, follow-up date, outcomes |
| `referral_records` | Referrals with status, description, voluntary value; `consent_confirmed` must be true |
| `import_jobs` | Import totals and issues |
| `invitations` | Pending/accepted/revoked invitations linked to member records |
| `member_change_history`, `audit_logs` | Field-level change history; audit of sensitive admin actions |

View `member_profiles` (security_invoker) joins a member's lists for reading; RLS on the base tables applies to it.

## Security model

- **RLS on every table.** Members see only their own chapter; inactive members are hidden from non-leaders; contact details respect visibility; confidential values are owner/admin only.
- **Server-only writes** for assessments, recommendations, imports and audit logs (grants revoked from `authenticated`).
- **Triggers enforce invariants:** members cannot change their own status/chapter/import fields; self-edits are marked `member_submitted` (members cannot self-verify); every two-member row must stay within one chapter; demo flag follows the chapter; weights must total 100; history and audit entries are written automatically.
- **RPCs** (`accept_invitation`, `deactivate_member`, `reactivate_member`, `erase_member`, `chapter_analytics`, `chapter_referral_stats`, `apply_retention_policy`) check roles internally.
- **Edge Function** verifies the JWT and chapter role per request; admin actions require the admin role; CORS restricted by `ALLOWED_ORIGINS`.
- **AI** receives only categories, scores and reasons with names/companies replaced by "Member A/B"; no contact details, values or referral records. The API key stays in function secrets.

## API (`POST /functions/v1/api`, body `{ action, chapterId, ... }`)

`compatibility`, `explain`, `bestMatches`, `findPartner`, `nextReferrals`, `contactSpheres`, `brief`, `health`, `validateSettings`, `importPreview` (admin), `importCommit` (admin), `invite` (admin). All other operations use PostgREST directly under RLS.
