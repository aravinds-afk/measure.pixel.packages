# Setup and deployment

## 1. Prerequisites

- Node.js 20+ and npm
- A Supabase project (free tier works) and the [Supabase CLI](https://supabase.com/docs/guides/cli)
- A static hosting provider for the frontend (Vercel, Netlify, Cloudflare Pages, or Supabase-adjacent hosting)
- Optional: an Anthropic API key for AI-written explanations

## 2. Database

```bash
supabase link --project-ref <your-project-ref>
supabase db push                 # applies supabase/migrations/*
```

The migrations create the schema, RLS policies, triggers, RPCs, the profession taxonomy and contact-sphere templates.

**Demo data is optional.** `supabase/seed.sql` creates a separate chapter flagged `is_demo = true` containing fictional members. Load it only on a demo/staging project:

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

Real chapters are created with `is_demo = false`; the flag cannot be changed afterwards and imports into a demo chapter are refused by the server.

### Create your chapter and first admin

1. In Supabase → Authentication → Users, invite the first admin by email (sign-ups are disabled).
2. In the SQL editor:

```sql
insert into chapters (name, region) values ('Your Chapter Name', 'Your Region') returning id;
-- after the admin has accepted the email invitation:
insert into chapter_roles (user_id, chapter_id, role)
select id, '<chapter-id>', 'admin' from auth.users where email = 'admin@yourdomain.com';
```

Every later member is invited from the app (Member management → Invite).

### Retention (optional)

Set `chapters.retention_days` to erase deactivated members automatically after that many days, and schedule:

```sql
select cron.schedule('connectsphere-retention', '15 3 * * *', $$select public.apply_retention_policy()$$);
```

## 3. Edge Function

```bash
supabase secrets set ANTHROPIC_API_KEY=<key>            # optional — enables AI explanations
supabase secrets set ALLOWED_ORIGINS=https://app.yourdomain.com
supabase functions deploy api
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the function automatically. The service-role key never reaches the browser. Without `ANTHROPIC_API_KEY`, explanations fall back to the deterministic summary.

## 4. Auth configuration

In Supabase → Authentication:

- Disable public sign-ups (invitation only).
- Site URL and redirect URLs: your frontend URL.
- Email templates: customise the invitation and magic-link emails with your chapter's wording.

## 5. Frontend

```bash
cp .env.example .env.local
# VITE_SUPABASE_URL=https://<ref>.supabase.co
# VITE_SUPABASE_ANON_KEY=<anon key>
npm run build      # outputs dist/
```

Deploy `dist/` as a single-page app (rewrite all routes to `/index.html`). On Vercel: framework preset "Vite", add the two environment variables, and a rewrite `{ "source": "/(.*)", "destination": "/index.html" }`.

## 6. Verify

1. Sign in as the admin, open **Import & sync**, upload your roster export (see the admin guide).
2. Invite one member; confirm they can sign in and see only your chapter.
3. Open a compatibility report and click **Explain in plain language** to confirm the Edge Function and (optionally) the AI key work.
