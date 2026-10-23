# Integrations and credentials still required

| Item | Status | Needed for | Action |
|---|---|---|---|
| Supabase project (URL, anon key, service role key) | **Required** | Live mode: auth, database, Edge Function | Create a project; set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` for the frontend. The service role key is injected into the Edge Function by Supabase. |
| SMTP for Supabase Auth | Recommended | Invitation and magic-link emails at volume | Configure custom SMTP in Supabase → Auth. The built-in sender is rate-limited. |
| Frontend hosting | Required | Serving the app | Any static host with SPA rewrites (see SETUP.md). |
| `ALLOWED_ORIGINS` secret | Recommended | Restricting the Edge Function to your domain | `supabase secrets set ALLOWED_ORIGINS=https://your-app` |
| `ANTHROPIC_API_KEY` secret | Optional | AI-written plain-language explanations | Without it, deterministic explanations are shown. |
| Official member-data API | **Not implemented — not assumed to exist** | Automatic roster synchronisation | Confirm with your organisation whether an approved integration exists and that your chapter is permitted to use it. Until then use official CSV/Excel exports; the import pipeline (member-ID matching, incremental updates, provenance) is designed so an API sync can feed the same `importCommit` path later. |
| pg_cron | Optional | Automatic retention-based erasure | Enable the extension and schedule `apply_retention_policy()` (SETUP.md). |
| Member consent | **Required (organisational)** | Lawful use of member profiles and referral records | Obtain members' agreement before importing their data and recording referrals; the app enforces consent confirmation on referral records. |
