# WhatsApp AI Agent (multi-tenant, resellable)

One deployment runs a separate AI agent for every brand you sell it to. Each agent:

1. **Starts the conversation** within seconds of a lead arriving (form, Meta lead ad, CRM, or a click-to-WhatsApp ad).
2. **Qualifies** with a natural one-question-at-a-time conversation against the brand's own criteria.
3. **Hands off only qualified leads** to a sales rep (round-robin) on WhatsApp with a complete brief, every answer, a score, and a suggested opening line. The AI goes quiet and relays any later lead messages to the rep.
4. **Disqualifies** politely, or keeps the lead in long-term nurture, per brand.
5. **Nurtures for 60 days**: 17 AI-written, personalised touches that stop the moment the lead replies, qualifies, or opts out.
6. **Runs accountability programs** for coaches and educators: scheduled check-ins ("did you do today's workout?", "how is the assignment from last week's session?"), tasks with deadlines and reminders, streaks, missed-check-in alerts to the coach, and a weekly report.

Built on the WhatsApp Cloud API and Claude (`claude-opus-5`, structured outputs, prompt caching, server-side refusal fallback).

## How it works

```
Lead source ──► POST /api/tenants/:id/leads ──► opener template ──┐
                                                                  ▼
WhatsApp ──► /webhook/whatsapp ──► Agent ──► Claude (decision JSON) ──► replies
                                    │            │
                                    │            ├─ profile answers, score, status
                                    │            ├─ tasks created / completed, check-in result
                                    │            └─ sales brief + suggested opener
                                    ▼
                    SQLite: contacts, messages, tasks, enrollments, jobs, events
                                    ▲
Scheduler (every 30s) ── opener · nudge · nurture day 1..60 · check-ins · task reminders · weekly reports
```

Design decisions that matter:

- **The model proposes, code enforces.** Claude can say "qualified", but the lead is only handed off if every required criterion has an answer and the score clears the brand's threshold (`src/engine.ts`, `gateStatus`). Sales never receives a half-qualified lead.
- **The 24-hour rule.** WhatsApp allows free-form messages only within 24h of the lead's last message. Outside it the agent uses the brand's approved re-engagement template automatically. Without that template, the message is skipped and logged.
- **Cadence, not spam.** "Every day, every minute" messaging gets a number quality-flagged and restricted by Meta within days. The default plan is dense in the first 72 hours, when intent is highest, then spaced out to day 60 with a breakup message at the end (`DEFAULT_NURTURE` in `src/tenant.ts`). Nothing is sent during quiet hours in the brand's timezone. Each brand can override the plan.
- **Conversation beats sequence.** A nurture step is skipped if the lead talked in the last 12 hours. A nudge fires once if they go quiet mid-qualification.
- **Opt-out is deterministic.** STOP/unsubscribe is handled in code before the AI sees it, cancels every scheduled job, and START re-subscribes the lead.
- **Bursts get one answer.** Messages sent in quick succession are batched (3.5s debounce) and replies are serialised per contact.

## Quick start

```bash
cd whatsapp-ai
npm install
cp .env.example .env        # set ANTHROPIC_API_KEY at minimum
npm test                    # 16 tests, no API calls
npm run chat -- measure-pixel "Rahul"          # talk to the agent in your terminal
```

Simulator commands: `/form` (lead arrives via a form, so the agent messages first), `/wait 26` (advance the clock 26 hours and run nurture, nudges and check-ins), `/status`, `/jobs`, `/enroll marketing-mentorship`, `/staff leads` (message as the rep), `/quit`. Use it to demo the product to a prospective client with their own config before connecting WhatsApp.

Run the server:

```bash
npm run build && npm start      # or: docker build -t wa-ai . && docker run -p 3000:3000 --env-file .env -v $PWD/data:/app/data wa-ai
```

## Connecting WhatsApp (per brand)

1. In Meta Business Manager create an app (type Business), add the WhatsApp product, add and verify the brand's phone number. Note its **Phone number ID**.
2. Create a System User with a permanent access token (`whatsapp_business_messaging`, `whatsapp_business_management`). Put it in an env var such as `WA_TOKEN_BRANDX`.
3. Webhook: callback URL `https://your-host/webhook/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`, subscribe to `messages`. Set `WHATSAPP_APP_SECRET` so signatures are verified. One Meta app can serve every client number; the agent routes by phone number ID.
4. Submit these templates in WhatsApp Manager (names are referenced from the tenant config):

| Template | Category | Body (example) | Params |
|---|---|---|---|
| `lead_opener` | Marketing or Utility | `Hi {{1}}, thanks for your interest in {{2}}! Could I ask a couple of quick questions to point you to the right option?` | first name, brand |
| `lead_followup` | Marketing | `Hi {{1}}, {{2}} Reply STOP to opt out.` | first name, AI-written message |
| `lead_handoff` | Utility | `Hi {{1}}, a new qualified lead is waiting: {{2}}. Open the chat to see the full brief.` | rep name, one-line brief |

Meta can reject templates that are mostly variables; if `lead_followup` is rejected, add more fixed wording around `{{2}}`. The rep gets the full multi-line brief whenever their 24h window is open. Reps who message the business number once a day (for example `leads`) keep it open; otherwise the `lead_handoff` template is used.

5. Copy `tenants/measure-pixel.json` to `tenants/<brand>.json`, fill in the phone number ID, business description, offers, proof, FAQs, objections, qualification criteria, reps, and programs. Restart, or `PUT /api/tenants/<id>`.

## Getting leads in

- **Click-to-WhatsApp ads and organic messages**: nothing to do; the lead is created on first message and the ad headline is stored as the source.
- **Forms, Meta lead ads, landing pages, CRMs** (via Zapier, Make, n8n, or your own code):

```bash
curl -X POST https://your-host/api/tenants/measure-pixel/leads \
  -H "Authorization: Bearer $API_KEY_MEASURE_PIXEL" -H "Content-Type: application/json" \
  -d '{"phone":"+91 98765 43210","name":"Rahul Mehta","source":"meta_lead_ad","fields":{"business":"dental clinic"}}'
```

Anything in `fields` is treated as already-known answers, so the agent does not re-ask them.

## Sales team and coaches: operate from WhatsApp

Anyone listed as a rep or coach can message the brand's number:

| Command | Effect |
|---|---|
| `leads` | latest qualified leads |
| `status <phone>` | full snapshot of a lead or client |
| `take <phone>` / `bot <phone>` | pause the AI (you take over; their messages are forwarded to you) / hand back |
| `won <phone>` / `lost <phone>` | close the lead |
| `enroll <phone> <program>` | start accountability check-ins |
| `task <phone> <hours> <title>` | assign a task with a deadline and reminder |

## Accountability programs

Defined per brand in `accountability.programs`: check-in days and times, what to ask, goals, coach, escalation threshold, weekly report, duration. The agent:

- sends each check-in at the scheduled local time, personalised with open tasks and streak;
- reads the reply and records done / partial / missed, updates tasks, and creates follow-up tasks it agrees with the client ("send the landing page draft by Thursday 6pm");
- reminds before task deadlines;
- counts unanswered check-ins and alerts the coach at the threshold;
- sends the coach a weekly report listing each client's streak, misses, tasks, and an AT RISK flag.

Example: `tenants/example-health-coach.json` (daily workout, protein and steps check-in plus a Sunday reflection). `measure-pixel.json` includes a mentorship program with Tuesday and Friday assignment check-ins.

## API (reseller admin)

`Authorization: Bearer $ADMIN_API_KEY` for everything; tenant-scoped routes also accept the tenant's own key (`apiKeyEnv`), so each client can pull only their own data.

| Method | Path | |
|---|---|---|
| GET | `/api/tenants` | list brands |
| PUT | `/api/tenants/:id` | create or update a brand config |
| POST | `/api/tenants/:id/leads` | capture a lead |
| GET | `/api/tenants/:id/leads?status=qualified` | list leads |
| GET | `/api/tenants/:id/leads/:phone` | lead, transcript, tasks, enrollments, scheduled jobs |
| POST | `/api/tenants/:id/leads/:phone/mode` | `{"mode":"human"|"bot"}` |
| POST | `/api/tenants/:id/enroll` | `{"phone","programId"}` |
| POST | `/api/tenants/:id/tasks` | `{"phone","title","dueInHours"}` |
| GET | `/api/tenants/:id/metrics?days=30` | leads by status, qualification rate, avg minutes to qualify, events |

`handoff.webhookUrl` receives `lead.qualified` and `lead.escalated` events (for a CRM, Slack, or Sheets).

## Costs and tuning

- `CLAUDE_MODEL` defaults to `claude-opus-5` and `CLAUDE_EFFORT` to `medium`. For high-volume brands, try `low` effort before switching models, and compare transcripts in the simulator.
- The per-brand system prompt is cached, so repeat turns mostly pay for the new messages.
- History sent per turn is capped at the last 40 messages; the running `summary` carries older context.

## Project layout

```
src/tenant.ts     brand config schema + default 60-day plan
src/prompts.ts    system prompt (static, cached) + per-turn context
src/brain.ts      Claude calls: converse (decision JSON) and compose (proactive message)
src/engine.ts     qualification, handoff, nurture, accountability, scheduler, staff commands
src/db.ts         SQLite (node:sqlite) storage and metrics
src/whatsapp.ts   Cloud API client, webhook parsing, signature check
src/server.ts     HTTP routes
src/cli/chat.ts   terminal simulator
test/             engine and infra tests with a scripted brain
```

## Not built yet

- Web dashboard for clients (the API is ready for one).
- Voice note transcription and image understanding (voice notes currently read as "[sent a voice note]" and the agent asks for text).
- Calendar booking inside the chat (currently shares the booking link).
- Postgres for very large volume. SQLite with WAL handles a single instance comfortably.
