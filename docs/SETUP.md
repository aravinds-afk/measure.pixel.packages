# Setup, configuration and deployment

## 1. Run locally

Requirements: Node.js 20+ (tested on 22).

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Required | Value |
|---|---|---|
| `AUTH_SECRET` | yes | ≥ 32 random characters: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `DATABASE_URL` | yes | `file:./data/local.db` locally; `libsql://<db>.turso.io` in production |
| `DATABASE_AUTH_TOKEN` | prod | Turso database token |
| `APP_URL` | yes | Public base URL, e.g. `https://advisor.measurepixel.in` (used in shareable links and the Sheets link column) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID` | for Sheets | See section 3 |
| `CRON_SECRET` | for scheduled retries | Random string; Vercel Cron sends it as a Bearer token |
| `APIFY_TOKEN` | for Instagram in automatic audits | Apify API token; runs `apify/instagram-profile-scraper` (paid per run). Without it, Instagram is listed as a manual check |
| `ANTHROPIC_API_KEY` | for the AI morning brief | Claude API key. Without it, the Today page shows the plan without the written brief |

```bash
npm run db:setup     # creates tables and seeds the catalogue from the Opportunity Board
MP_PASSWORD='a-long-password' npm run user:create -- --email you@example.com --name "You" --role admin
npm run dev
```

Create consultants in **Settings → Users** (or with `user:create --role consultant`).

## 2. Users and permissions

| | Consultant | Consultant + price override | Admin |
|---|---|---|---|
| Audits, recommendations, quotations, clients | ✓ | ✓ | ✓ |
| Offer prices inside the board band | ✓ | ✓ | ✓ |
| Offer prices outside the band; changing configured service prices | | ✓ | ✓ |
| Discount above the consultant limit (default 10%) | | | ✓ |
| See delivery costs and margins | | | ✓ |
| Settings, catalogue, rules, users, Sheets | | | ✓ |

All checks run on the server. Sessions last 12 hours; deactivating a user takes effect on their next request.

## 3. Google Sheets

The database is the source of truth. Every saved client, audit, recommendation set and quotation is queued for Sheets and written by ID (update if the row exists, append if not), so retries never duplicate rows. Autosaves are queued; completing an audit, saving recommendations, issuing or changing a quotation's status, sharing a link and "Save to Google Sheets" wait for Google's confirmation and report the real result.

### One-time setup

1. **Create the spreadsheet** in Google Drive, e.g. "Measure Pixel — Growth Advisor". Copy its ID from the URL: `https://docs.google.com/spreadsheets/d/<THIS PART>/edit`.
2. **Create a service account** in Google Cloud Console:
   - Create (or pick) a project → *APIs & Services → Library* → enable **Google Sheets API**.
   - *IAM & Admin → Service Accounts → Create service account* (no roles needed).
   - Open it → *Keys → Add key → Create new key → JSON*. Keep the file private; do not commit it.
3. **Share the spreadsheet** with the service account's email (`…@….iam.gserviceaccount.com`) as **Editor**.
4. **Set the environment variables** on the server (never in client code or the spreadsheet):
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `client_email` from the JSON
   - `GOOGLE_PRIVATE_KEY` = `private_key` from the JSON, keeping the `\n` sequences, wrapped in double quotes
   - `GOOGLE_SHEETS_SPREADSHEET_ID` = the ID from step 1
5. Restart / redeploy, then **Settings → Google Sheets → Test connection & create tabs**. This creates the six tabs with headers and writes the service catalogue. A failure shows Google's error message (wrong ID, sheet not shared, API not enabled, malformed key).

### Tabs

| Tab | Key | Notes |
|---|---|---|
| Clients | Client ID | |
| Brand Audits | Audit ID | Findings per item, client-confirmed gaps, unassessed items, plus the full structured responses as JSON |
| Recommendations | Recommendation ID | Accepted / Removed / Deferred, consultant override flag |
| Quotations | Quotation ID (one row per version) | Totals in rupees; extra columns: Quote Number, Last Synced |
| Quotation Items | Quotation ID + Line No | Price snapshot per line; extra columns: Line No, Offer ID |
| Service Catalogue | Service / Offer ID | Services and packaged offers with bands; delivery cost only if configured |

Cells are written with `valueInputOption=RAW`, so client-entered text is never evaluated as a formula. Credentials are never written to the sheet.

### Retries

- Failed or queued writes show in **Settings → Google Sheets** with Google's error; **Retry queued writes** re-runs them.
- `GET /api/cron/sync` (Bearer `CRON_SECRET`) processes the queue; `vercel.json` schedules it every 15 minutes. Vercel Hobby plans only allow daily crons — change the schedule or run `npm run sheets:sync` manually.
- A job is retried up to 8 times. Errors are logged without tokens or keys.

## 4. Deploy (Vercel + Turso)

1. **Database:** create a Turso database (`turso db create mp-advisor`), get the URL (`turso db show mp-advisor --url`) and a token (`turso db tokens create mp-advisor`).
2. **Migrate and seed** from your machine against production:
   ```bash
   DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run db:setup
   DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… MP_PASSWORD='…' npm run user:create -- --email you@… --name "You" --role admin
   ```
3. **Vercel:** import the repository, set the environment variables from section 1 (Production), deploy. `vercel.json` registers the Sheets retry cron.
4. Open `APP_URL`, sign in, run **Settings → Google Sheets → Test connection**.

After a schema change: `npm run db:generate`, commit the new file in `drizzle/`, run `npm run db:migrate` against production before deploying.

Any Node host works the same way (`npm run build && npm start`); keep `DATABASE_URL` on persistent storage or Turso. Serverless platforms need Turso because their filesystem is ephemeral.

## 5. Website discovery in production

Discovery runs server-side: it fetches `robots.txt`, then the homepage and up to four relevant internal pages (contact, about, services…), one request at a time, 10 s per request, 1.5 MB per page, 30 s total, at most 10 runs per user per 10 minutes. Private, loopback, link-local and reserved addresses are refused both before the request and at connection time (DNS-rebinding safe), including after redirects. Instagram, LinkedIn and YouTube are not scraped; they are listed for manual review.

The host must allow outbound HTTPS. Behind a forward proxy, discovery reports sites as unreachable — it does not route through proxies, because the connect-time IP check would no longer apply.

## 6. Automatic audit and the Today page

- **New Audit** now starts with one box: paste a website and/or Instagram link and press *Run automatic audit*. The server reads the public site (and Instagram through Apify), fills the audit — conclusive evidence as *Verified*, weaker signals as *Inferred* — detects the industry, saves recommendations and drafts a quotation at board-band minimums. It opens on a **prescription** page with the findings, the prescribed offers and the questions to ask the client (things a public website can't show). Everything stays editable; *Start a manual audit* is still there.
- **Today** is the home screen: day N of the 90-day plan (29 Oct 2026 → 26 Jan 2027), signed vs ₹3L target and the conversation pace needed, today's three priorities, the season (who to target, what they search for, which offer to lead with), the full day's tasks by channel (LinkedIn, Instagram, YouTube, BNI, pipeline) with tick-off, the next 3 days, the roadmap, visibility plays and income-stream milestones. Pipeline items (due follow-ups, quotations about to expire, unsent drafts, audits without a quote) are added automatically.
- The plan content lives in `src/data/growth-plan.ts`. Seasonal windows are planning assumptions for Chennai; change them there.

## 7. Testing

```bash
npm test             # 51 unit / persistence / sync tests
npm run typecheck && npm run lint

# End-to-end (phone viewport, then desktop) against a running build:
npm run build && npm start &
E2E_CONSULTANT_EMAIL=… E2E_CONSULTANT_PASSWORD=… E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… npm run test:e2e
```

The e2e script needs Playwright with Chromium (`npx playwright install chromium` if it is not already available). It signs in as the consultant, starts an audit (with an unreachable `.invalid` domain on purpose), sets findings, gets the Clinic Patient Engine recommendation, builds a quotation, adds 5 social videos (₹17,500), checks client mode for leaks, issues and presents it, downloads the PDF, opens the public link signed out, revises to v2, and loads every main screen. Screenshots and the PDF go to `test-results/`.

The Sheets tests use an in-memory imitation of the Sheets API; confirm the real connection with **Test connection** after setting credentials.
