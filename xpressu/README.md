# XpressU

AI dating-message assistant for iOS and Android. Paste a conversation, pick a goal, get three natural replies (Confident / Playful / Direct) with "Why this works" and "Next move".

**Stack:** Expo SDK 57 · React Native 0.86 · TypeScript · Expo Router · StyleSheet design tokens · expo-secure-store · Supabase (auth, quota, Edge Function) · OpenAI via a secure backend · RevenueCat-ready subscription layer.

---

## Quick start (mock AI, no keys needed)

```bash
cd xpressu
npm install
cp .env.example .env          # EXPO_PUBLIC_AI_MODE=mock by default
npx expo start                # press i (iOS simulator), a (Android emulator), or scan the QR code with Expo Go
```

Web preview (handy for quick UI checks): `npx expo start --web`.

In mock mode a yellow **DEMO AI** badge is shown and replies are generated on-device by `services/ai/mockProvider.ts`. Nothing leaves the device.

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (eslint-config-expo)
npm test            # contract, data minimization, prompt, mock AI
npm run verify      # all three
npx expo export --platform ios --platform android --platform web   # full bundle check
```

---

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_AI_MODE` | app | `mock` or `backend`. Defaults to `backend` if an endpoint is set, else `mock`. |
| `EXPO_PUBLIC_AI_ENDPOINT` | app | Full URL of the generate endpoint (Supabase function or local dev server). |
| `EXPO_PUBLIC_SUPABASE_URL` | app | Supabase project URL (public). |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | app | Supabase anon key (public, RLS-protected). |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY` | app | RevenueCat public SDK keys (when enabled). |
| `OPENAI_API_KEY` | **server only** | OpenAI key. Never put this in an `EXPO_PUBLIC_*` variable. |
| `OPENAI_MODEL` | server only | Defaults to `gpt-4.1-mini`. Any chat model with structured outputs works. |
| `DEV_SERVER_PORT` | server only | Local dev server port (default `8787`). |
| `REVENUECAT_WEBHOOK_SECRET` | server only | Shared secret for the RevenueCat webhook function. |

Only `EXPO_PUBLIC_*` variables are bundled into the app. Restart `expo start` after changing `.env`.

---

## Connecting the real AI

The app never calls OpenAI directly. It POSTs to a backend that holds the key, applies data minimization, calls OpenAI with a strict JSON schema, and validates the output. The app validates the response a second time before rendering it.

### Option A — Local dev server (fastest)

```bash
# .env
OPENAI_API_KEY=sk-...
EXPO_PUBLIC_AI_MODE=backend
EXPO_PUBLIC_AI_ENDPOINT=http://<your-computer-LAN-IP>:8787/generate-replies

npm run dev:server     # terminal 1
npx expo start         # terminal 2
```

Use your LAN IP (not `localhost`) so a physical phone can reach it. The Android emulator reaches the host at `10.0.2.2`. This server has no auth and no quota. It is for development only.

### Option B — Supabase (production)

```bash
npm i -g supabase          # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <project-ref>
supabase db push                                   # applies supabase/migrations (usage + premium tables, RPCs)
supabase secrets set OPENAI_API_KEY=sk-... OPENAI_MODEL=gpt-4.1-mini
supabase functions deploy generate-replies
```

In the Supabase dashboard, enable **Authentication → Sign In / Providers → Anonymous sign-ins**. Then set:

```bash
EXPO_PUBLIC_AI_MODE=backend
EXPO_PUBLIC_AI_ENDPOINT=https://<project-ref>.supabase.co/functions/v1/generate-replies
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

On first launch each install signs in anonymously. The function verifies the JWT and enforces the 5-per-day free limit server-side through the `consume_generation` RPC (premium users are unlimited, and a failed AI call refunds the generation). Conversation text is never stored or logged on the server.

API contract (`supabase/functions/_shared/contract.ts`):

```jsonc
// POST body
{ "conversation": "...", "objective": "ask_out", "tone": "confident",
  "userStyle": { "samples": "", "emoji": "sometimes", "casing": "normal", "length": "short", "notes": "" },
  "onlyStyle": "playful",        // optional: regenerate one card
  "avoid": ["previous text"],    // optional
  "includeAnalysis": true }      // premium
// 200 response
{ "replies": [{ "style": "confident", "text": "...", "why": "..." }, { "style": "playful", ... }, { "style": "direct", ... }],
  "nextMove": "...",
  "analysis": { "tone": "...", "momentum": "building", "engagement": "high", "questionsToAnswer": [], "openings": [], "summary": "..." } | null,
  "safety": { "signal": "ok" | "low_interest" | "boundary", "guidance": "..." } }
// errors: { "error": { "code": "quota_exceeded" | "rate_limited" | "unauthorized" | "bad_request" | "upstream" | "internal", "message": "..." } }
```

The prompt lives in `supabase/functions/_shared/prompt.ts`.

---

## Building for iOS

Requires an Apple Developer account. No Mac is needed when you use EAS cloud builds.

```bash
npm i -g eas-cli            # or use: npx eas-cli@latest <command>
eas login
eas build:configure         # creates eas.json and links the project
# Set EXPO_PUBLIC_* values for the build (EAS does not read your local .env for cloud builds):
eas env:create --name EXPO_PUBLIC_AI_ENDPOINT --value https://<ref>.supabase.co/functions/v1/generate-replies --environment production
# ...repeat for EXPO_PUBLIC_AI_MODE, EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
eas build --platform ios --profile production
eas submit --platform ios
```

- Local simulator build (macOS + Xcode): `npx expo run:ios`
- Internal testing build: `eas build --platform ios --profile preview`
- Bundle identifier: `com.xpressu.app` (`app.json`). Change it to your own.

## Building for Android

```bash
eas build --platform android --profile production     # .aab for the Play Store
eas build --platform android --profile preview        # .apk for sideloading and testing
eas submit --platform android
```

- Local build (Android Studio / SDK): `npx expo run:android`
- Package: `com.xpressu.app`

`ios/` and `android/` are generated (Continuous Native Generation). Configure native settings in `app.json`, not by editing those folders.

---

## Architecture

```
app/                      Expo Router screens
  index.tsx               animated splash → onboarding or home
  onboarding.tsx
  (tabs)/index.tsx        Home: paste, goal, Generate
  (tabs)/history.tsx      opt-in, on-device history
  (tabs)/settings.tsx     tone, AI prefs, privacy, subscription
  results.tsx             3 reply cards, copy/edit/regenerate, why/next move, analysis
  history/[id].tsx        saved conversation
  style-profile.tsx       "How I normally text"
  paywall.tsx             premium plans (modal)
  privacy.tsx             data handling + policy placeholder
components/               UI kit (ui/), compose/, reply/, providers/ (App, Session, Toast)
services/
  ai/                     generateReplies() + backend and mock providers
  auth/                   Supabase client (SecureStore session), anonymous auth
  storage/                encrypted SecureStore wrapper, prefs, history, usage
  subscription/           provider interface, mock, RevenueCat scaffold, entitlements
hooks/                    useNetworkStatus
lib/                      env, errors, haptics, formatting, minimization re-export
constants/                theme tokens, objectives, tones, config
types/                    shared app types (re-exports the API contract)
supabase/
  functions/_shared/      contract (zod), prompt, minimization, OpenAI client, shared by app, function and dev server
  functions/generate-replies/   secure AI endpoint (Deno)
  functions/revenuecat-webhook/ premium sync (placeholder)
  migrations/             usage/premium tables + consume/refund RPCs
server/dev-server.ts      local Node server with the same contract
tests/                    node:test suites
```

## Privacy model

- Conversations are held in memory only. History is **off by default** and premium-only. When it is on, entries are encrypted in the iOS Keychain or Android Keystore (via expo-secure-store), capped at 50, and deletable one at a time or all at once.
- Before sending, the app keeps only the most recent ~2,500 characters and redacts emails, phone numbers, links and long digit runs. Redaction is on by default and can be turned off in Settings. The server re-applies the same minimization.
- The server does not log or store conversation text, and sends `store: false` to OpenAI.
- No secrets are shipped in the app. Supabase auth tokens are kept in SecureStore.
- The privacy policy is a placeholder (`app/privacy.tsx`, `PRIVACY_POLICY_URL`).

## Monetization

- Free: 5 generations per day (local counter for the UI, enforced server-side in production), Confident/Funny/Calm tones.
- Premium: unlimited, Flirty/Direct/Romantic tones, personal texting style, history, advanced analysis.
- All gates live in `services/subscription/entitlements.ts`. The subscription provider is an interface (`services/subscription/types.ts`). The **mock provider is active** and simulates purchases. To switch to RevenueCat, follow the steps in `services/subscription/revenueCatProvider.ts`.

## What is mocked or needs credentials

| Item | Status |
| --- | --- |
| AI replies | **Mock** by default (`services/ai/mockProvider.ts`, "DEMO AI" badge). Real AI needs `OPENAI_API_KEY` on the dev server or Supabase. |
| Auth + server-side quota | Needs a Supabase project (URL, anon key, anonymous sign-ins enabled, migrations pushed). Without it auth is skipped and the daily limit is enforced locally only. |
| Subscriptions | **Mock** (no payments, "TEST MODE" label). RevenueCat needs `react-native-purchases`, store products, API keys, a dev build, and the webhook deployed. |
| Privacy policy / Terms | Placeholder text and URLs (`constants/config.ts`). |
| Pricing | Placeholder prices in `constants/config.ts`. With RevenueCat, read them from offerings. |
| Bundle IDs / EAS project | `com.xpressu.app` placeholder. `eas build:configure` links your EAS project. |
