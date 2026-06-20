# WordShift — Analytics, Telemetry & Crash Reporting Setup

**Goal:** From day one of launch, the team can answer "what is our D1/D7/D30 retention?", "where do new players drop off in onboarding?", and "what is crashing in production?"

**Current state (verified against source):** the telemetry/event pipeline is **fully instrumented but disabled**. No code is required to begin collecting analytics — only a one-line config change plus standing up a collector. Crash *grouping/symbolication* (Sentry) requires a small, additive code change at a single forwarding hook plus a native build.

This document is the turnkey enablement plan. It does **not** modify source code — only describes the changes and provides code sketches.

---

## 0. Architecture as it exists today

| Concern | File | Status |
|---|---|---|
| Local event buffer | `mobile/src/services/eventLogger.ts` | Active. 20 event types, in-memory buffer, 5s debounced flush to AsyncStorage (`wordshift_event_log`), 500-event cap (`MAX_EVENTS`, line 4). |
| Remote uploader | `mobile/src/services/telemetry.ts` | Instrumented, **disabled**. Reads `extra.telemetryEndpoint`; `''` ⇒ `isTelemetryEnabled()` returns `false` (line 61–63) ⇒ `syncTelemetry()` no-ops with zero network traffic (line 115). |
| Crash capture | `mobile/src/services/errorReporting.ts` | Active locally. `installGlobalErrorHandler()` (line 86) hooks `onunhandledrejection` + `ErrorUtils.setGlobalHandler`. `reportError()` (line 37) writes an `app_error` event. **Line 35 comment:** "Replace with Sentry/Crashlytics when available." |
| React render errors | `mobile/src/components/ErrorBoundary.tsx` | Active. `componentDidCatch` (line 27) forwards to `reportError()` with `source: 'react_error_boundary'`. |
| Bootstrap wiring | `mobile/App.tsx` | `installGlobalErrorHandler()` called at module load (line 116). `app_open` logged at line 2044. App is wrapped in `ErrorBoundary` (lines 1440, 1498). |
| Config surface | `mobile/app.json` | `extra.telemetryEndpoint: ""` (line 53). |
| Privacy policy | `docs/privacy-policy.md` | States diagnostics are **off** (lines 31–33). |

**Key consequence:** turning telemetry on already gives you remote crash visibility for free — `app_error` events (global JS errors, unhandled rejections, React render errors) ride the same uploader. Sentry is an *upgrade* for stack symbolication, grouping, alerting, and release health — not a prerequisite for basic crash counts.

### Data flow

```
component / global handler / ErrorBoundary
        │  logEvent(...) / reportError(...)
        ▼
eventLogger buffer ──5s debounce──▶ AsyncStorage (wordshift_event_log, cap 500)
        │  flushEvents() lazy-requires telemetry
        ▼
telemetry.syncTelemetry()  ── enabled only if extra.telemetryEndpoint set ──▶ HTTPS collector
        │  (throttled 1/60s, SYNC_THROTTLE_MS line 50)
        ▼  on HTTP 2xx: removeOldestEvents(n) (at-least-once delivery)
   your analytics warehouse / product tool
```

---

## 1. Turning ON the existing telemetry

### 1a. The config change (no code)

Edit `mobile/app.json`, line 52–54:

```jsonc
"extra": {
  "telemetryEndpoint": "https://collector.wordshift.app/capture"
}
```

That is the entire enablement. `telemetry.ts` reads this lazily via `expo-constants` at runtime (`getTelemetryEndpoint`, line 35). It must be an **HTTPS** URL (App/Play store ATS requirements; the uploader uses plain `fetch`).

> Because `appVersionSource: "local"` (eas.json), `app.json` is the single source of truth for the build. Changing `extra` requires a **new OTA update or build** to ship — it is read from the bundled Expo config, not fetched at runtime. For per-environment endpoints (staging vs prod) without editing `app.json` by hand, convert to a dynamic `app.config.ts` that reads `process.env.TELEMETRY_ENDPOINT` and set the env var per EAS build profile in `eas.json`.

### 1b. The payload shape

`syncTelemetry()` (telemetry.ts line 126–135) POSTs JSON:

```jsonc
{
  "installId": "f3a1c2...-uuid-v4",   // anonymous, persisted in AsyncStorage (wordshift_install_id)
  "platform": "ios",                   // or "android"
  "appVersion": "1.0.0",               // from expoConfig.version
  "events": [
    {
      "type": "app_open",
      "timestamp": 1718900000000,      // epoch ms (client clock)
      "data": { /* optional, event-specific */ }
    },
    {
      "type": "puzzle_completed",
      "timestamp": 1718900050000,
      "data": { "stars": 3, "difficulty": "MEDIUM" }
    }
    // ... up to ~500 events per upload
  ]
}
```

Delivery semantics to design your collector around:
- **At-least-once.** Events are removed locally only after HTTP 2xx (`removeOldestEvents`, line 138). A response that times out after the server committed will cause a re-send. **Deduplicate** server-side on `(installId, type, timestamp, data-hash)`.
- **Batched & throttled.** At most one upload per 60s per app session (`SYNC_THROTTLE_MS`, line 50). Uploads piggyback on event flushes, so a quiet app uploads slowly. Expect bursts on `app_open`.
- **Capped history.** Only the most recent 500 events survive locally (line 88–90). A player who plays offline for a long stretch can lose the oldest events before they ever upload. This is acceptable for retention/funnel aggregates but means the data is **not** a complete audit log.
- **No PII, no auth.** `installId` is a random UUID v4, not a device or user identifier. There is no API key/header today — add a shared-secret header at the collector if you want to reject junk (would require a tiny edit to the `fetch` headers in telemetry.ts; out of scope here).

### 1c. Collector options (pick one)

**Option A — Self-hosted minimal collector (fastest to own your data).**
A serverless function that accepts the payload and fans events into rows. Sketch (Node / any FaaS):

```js
// POST /capture
export default async function handler(req, res) {
  const { installId, platform, appVersion, events } = req.body;
  if (!Array.isArray(events)) return res.status(400).end();
  const rows = events.map(e => ({
    install_id: installId, platform, app_version: appVersion,
    type: e.type, ts: new Date(e.timestamp), data: e.data ?? {},
  }));
  await db.insertIgnore('events', rows, { onConflict: ['install_id','type','ts'] }); // dedupe
  res.status(200).json({ ok: true });
}
```
Pair with BigQuery / Postgres / ClickHouse + a dashboard (Metabase/Looker Studio). Pros: full ownership, cheapest at low volume, no SDK. Cons: you build the retention SQL (provided below) and dashboards yourself.

**Option B — PostHog (recommended balance).**
PostHog's **capture** endpoint is HTTP-JSON and close to our payload, but it expects one event per request (or a `/batch` shape) keyed by `distinct_id` and `event`, not our `{installId, events:[…]}` envelope. Two ways to bridge:
1. **Thin proxy (no app change):** point `telemetryEndpoint` at your own function that translates our envelope → PostHog `/batch` (`distinct_id = installId`, `event = type`, `properties = {platform, appVersion, ...data}`, `timestamp`). ~30 lines.
2. Use PostHog's product-analytics UI for retention/funnels out of the box (built-in **Retention** and **Funnel** insights — no SQL needed). Pros: turnkey retention/funnel/cohort UI, free tier. Cons: needs the translation proxy because of the envelope mismatch.

**Option C — Amplitude / Mixpanel (best funnel & retention UX).**
Same pattern as B: stand up a translation proxy mapping our envelope to their HTTP Ingestion API (`device_id/user_id = installId`, `event_type = type`, `event_properties = data`, `time = timestamp`). Pros: best-in-class retention/funnel/cohort tooling, generous free tiers. Cons: proxy required; data leaves to a third party (disclose — see §3).

> **Recommendation:** Option B (PostHog + thin proxy) for launch. Self-hosted or PostHog Cloud free tier covers our volume; the proxy is trivial and keeps `app.json` pointing at one stable URL you control. If the team already has Amplitude/Mixpanel, Option C with the same proxy pattern.

### 1d. Mapping the existing event funnel to retention & FTUE

These events are already emitted in source today (verified):
- `app_open` — `App.tsx:2044` (every cold start / foreground bootstrap).
- `puzzle_started` — `App.tsx:653, 711` and `useOnboardingFlow.ts:174` (carries `difficulty`, and `daily`/`onboarding` flags).
- `puzzle_completed` — emitted with `{ stars, difficulty }`.
- `onboarding_step` / `onboarding_complete` — from `setOnboardingStep` (FTUE funnel).
- `daily_completed`, `pit_offer`, `unlock_purchased`, `phase_changed`, `share_completed`, `notification_permission_result`, `app_error`, etc.

**Retention — which events answer which question:**

| Question | Signal | How |
|---|---|---|
| **D1 / D7 / D30 retention** | `app_open` keyed by `installId` | Cohort = first-seen day (min `app_open.timestamp` per install). Retained on day N = install has an `app_open` on `first_day + N`. This is "app-open" retention — the standard install-cohort metric. |
| Engaged retention (stricter) | `puzzle_completed` (or `puzzle_started`) | Same cohort math but require a *play* event on day N, not just an open. Track both; the gap shows "opened but didn't play." |
| New installs | first `app_open` per `installId` | `installId` is created lazily on first telemetry need; treat first-ever `app_open` as the install event. |

**Retention SQL (install-cohort, app-open based) for a self-hosted warehouse:**
```sql
WITH first_seen AS (
  SELECT install_id, MIN(DATE(ts)) AS cohort_day
  FROM events WHERE type = 'app_open' GROUP BY install_id
),
activity AS (
  SELECT DISTINCT install_id, DATE(ts) AS active_day
  FROM events WHERE type = 'app_open'
)
SELECT f.cohort_day,
       COUNT(DISTINCT f.install_id) AS cohort_size,
       COUNT(DISTINCT CASE WHEN a.active_day = f.cohort_day + 1  THEN a.install_id END) AS d1,
       COUNT(DISTINCT CASE WHEN a.active_day = f.cohort_day + 7  THEN a.install_id END) AS d7,
       COUNT(DISTINCT CASE WHEN a.active_day = f.cohort_day + 30 THEN a.install_id END) AS d30
FROM first_seen f
LEFT JOIN activity a ON a.install_id = f.install_id
GROUP BY f.cohort_day ORDER BY f.cohort_day;
```
(In PostHog/Amplitude/Mixpanel this is the built-in **Retention** report — "first time did `app_open`" → "came back and did `app_open`".)

> **Timezone caveat:** `timestamp` is the client clock in epoch ms. The app's own day-bucketing uses *local* day (see `services/dateUtils.ts` in the codebase). For retention you can bucket server-side by UTC for consistency, but be aware D1 boundaries won't exactly match the player's local "next day." For launch metrics UTC bucketing is fine.

**FTUE / onboarding funnel — which events answer which question:**

| Step | Event | Drop-off question |
|---|---|---|
| Launched | `app_open` | How many ever opened? |
| Entered onboarding | first `onboarding_step` | (11-step machine) Did they start the guided intro? |
| Progressed | `onboarding_step` (with step id in `data`) | **Which step bleeds users?** Order steps by id; funnel conversion step→step. |
| First puzzle attempt | `puzzle_started {onboarding:true}` (`useOnboardingFlow.ts:174`) | Did they reach the tutorial puzzle? |
| Finished onboarding | `onboarding_complete` | What % complete FTUE? |
| First real puzzle | `puzzle_started` / `puzzle_completed` | Activation: did they play past the tutorial? |
| Habit hooks | `daily_completed`, `notification_permission_result`, `share_completed` | Opt-in & habit signals correlated with D7. |

Build this as an ordered funnel `app_open → onboarding_step(first) → puzzle_started(onboarding) → onboarding_complete → puzzle_completed`. The largest step-to-step drop is your first fix-it target.

---

## 2. Crash reporting with Sentry

Local `app_error` events give you crash **counts and messages** the moment telemetry is on. Add **Sentry** for stack symbolication (source maps / dSYM / native), automatic grouping, release health (crash-free users/sessions), breadcrumbs, and alerting. Recommended package for Expo SDK 54: **`@sentry/react-native`** with the **`expo` / `@sentry/react-native/expo` config plugin** (the old standalone `sentry-expo` package is deprecated in favor of `@sentry/react-native` for SDK 50+).

### 2a. Install & config plugin

```bash
cd mobile
npx expo install @sentry/react-native
```

Add the config plugin and DSN to `app.json` (`plugins` array, alongside the existing `expo-notifications` entry at lines 43–51):

```jsonc
"plugins": [
  ["expo-notifications", { "icon": "./assets/notification-icon.png", "color": "#667EEA" }],
  ["@sentry/react-native/expo", {
    "organization": "wordshift-org",
    "project": "wordshift-mobile"
    // url defaults to sentry.io; set for self-hosted Sentry
  }]
],
"extra": {
  "telemetryEndpoint": "https://collector.wordshift.app/capture",
  "sentryDsn": "https://<key>@oXXXX.ingest.sentry.io/<project>"
}
```

The plugin auto-uploads source maps (JS) and dSYM/native symbols during EAS builds. Provide a `SENTRY_AUTH_TOKEN` as an **EAS secret** (`eas secret:create --name SENTRY_AUTH_TOKEN`) so the build can upload symbols — do **not** commit it.

### 2b. EAS build implications (important)

- **Sentry requires a native build.** `@sentry/react-native` includes native modules. It **does not work in Expo Go** — the team must move to **EAS development builds** (`eas.json` already has a `development` profile with `developmentClient: true`) and production builds for store submission. (Telemetry from §1 works in Expo Go today because it's pure JS/`fetch`.)
- `newArchEnabled: true` (app.json line 10) — Sentry supports the New Architecture; pin to a current `@sentry/react-native` version that lists SDK 54 / New Arch support in its release notes when installing.
- Source-map / dSYM upload runs in the EAS build; ensure `SENTRY_AUTH_TOKEN` secret is present or symbolication will silently degrade to raw, unminified-but-unmapped frames.
- Add a release/version tag tied to `app.json` `version` + `ios.buildNumber`/`android.versionCode` so "crash-free by release" works.

### 2c. Wiring Sentry into the EXISTING forwarding hook (no call-site changes)

The whole point of the existing design: **every** error path — global JS handler, unhandled promise rejection, and `ErrorBoundary` render errors — already funnels through `reportError()` in `errorReporting.ts`. So Sentry needs to be added in exactly **one** place (the line-35 comment), and all existing call sites (`App.tsx:116`, `ErrorBoundary.tsx:31`) light up automatically.

**Init once at startup** (next to `installGlobalErrorHandler()`), then **forward inside `reportError()`**. Minimal sketch — *for the doc only; do not modify source from this task*:

```ts
// --- errorReporting.ts (sketch of the additive change) ---
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Call once from App.tsx module load, just before installGlobalErrorHandler().
export function initCrashReporting(): void {
  const dsn = (Constants?.expoConfig?.extra?.sentryDsn as string) ?? '';
  if (!dsn) return; // disabled (parity with telemetry: empty = off, no SDK traffic)
  Sentry.init({
    dsn,
    release: `wordshift@${Constants?.expoConfig?.version ?? '1.0.0'}`,
    enableAutoSessionTracking: true,   // powers crash-free-users / release health
    tracesSampleRate: 0.0,             // performance tracing off at launch; raise later
    // beforeSend(event) { return scrubPii(event); }  // see §3
  });
}

export function reportError(error: Error | string, context: ErrorContext): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack   = error instanceof Error ? error.stack : undefined;

  // EXISTING: keep local event-log behavior unchanged.
  logEvent({ type: 'app_error', data: {
    message: errorMessage, stack: errorStack?.slice(0, 500),
    source: context.source, ...context.metadata,
  }});
  sessionErrors.push({ error, context, timestamp: Date.now() });
  if (sessionErrors.length > MAX_SESSION_ERRORS)
    sessionErrors.splice(0, sessionErrors.length - MAX_SESSION_ERRORS);
  console.warn(`[WordShift Error] ${context.source}: ${errorMessage}`);

  // NEW: forward to Sentry (line-35 "Replace with Sentry/Crashlytics"). No-op if Sentry.init never ran.
  const err = error instanceof Error ? error : new Error(error);
  Sentry.withScope(scope => {
    scope.setTag('source', context.source);
    if (context.metadata) scope.setContext('metadata', context.metadata);
    Sentry.captureException(err);
  });
}
```

Then in `App.tsx`, add `initCrashReporting();` immediately before the existing `installGlobalErrorHandler();` (line 116). Optionally wrap the default export with `Sentry.wrap(App)` for automatic touch/navigation breadcrumbs — but that's the only call-site touch and is optional.

**Why this is clean:**
- `App.tsx:116` global handler → `reportError` → Sentry. ✅
- `ErrorBoundary.tsx:31` render errors → `reportError` → Sentry, with `componentStack` already in metadata. ✅
- No component anywhere needs to import Sentry; they keep calling `reportError`.
- Empty `sentryDsn` ⇒ `init` early-returns ⇒ Sentry never sends ⇒ same "off by default" posture as telemetry, so staging vs prod is a config flip.

> Crashlytics is the alternative, but it implies Firebase + a heavier native footprint and a less Expo-friendly setup than the first-party `@sentry/react-native/expo` plugin. Recommend Sentry.

---

## 3. Privacy & legal implications

Enabling telemetry and/or Sentry means **diagnostics now transmit off-device**. This requires coordinated updates:

### 3a. Privacy policy (`docs/privacy-policy.md`)
Today it says diagnostics are off (lines 13–14 "no third-party tracking SDKs"; lines 31–33 "switched off in this release"). On enablement, **edit before shipping the build**:
- Change §"Diagnostics" from "switched off" to a description of what is now collected: **anonymous install ID (random UUID), platform, app version, and gameplay/diagnostic events (e.g., app opens, puzzle start/complete, onboarding steps) and crash reports (error message + stack trace).**
- State explicitly: **no names, no contacts, no precise location, no advertising identifiers, no account.**
- Name the processors: your collector host, and any third party (PostHog / Amplitude / Mixpanel / **Sentry**) including their region. Link their privacy/DPA pages.
- Update the **Effective date** (currently June 10, 2026) and note the change in release notes (the policy already promises this, lines 53–55).
- Remove/soften "no third-party tracking SDKs" if Sentry/an analytics tool is added.

### 3b. iOS App Store — privacy manifest & data-collection disclosure
- **App Privacy "Nutrition Label" (App Store Connect):** declare the data types now collected. Likely: **Diagnostics → Crash Data** and **Performance Data**; **Identifiers → User ID** (the install UUID is a developer-generated identifier — disclose it, linked-to-app-functionality, *not* used for tracking); **Usage Data → Product Interaction** (the gameplay events). Because the install ID is not cross-app/cross-developer and there are no ad IDs, you can mark **"Not used for tracking"** (no ATT prompt required) **as long as** the chosen analytics vendor isn't configured to track across apps. Confirm per-vendor.
- **Privacy manifest (`app.json` `ios.privacyManifests`, lines 26–33):** today it declares only `NSPrivacyAccessedAPICategoryUserDefaults` (CA92.1). Adding Sentry pulls in its own `PrivacyInfo.xcprivacy` (the Sentry SDK ships one), but verify the final merged manifest covers any newly-used "required reason" APIs (e.g., file timestamp, system boot time) that Sentry/analytics use. Keep `NSPrivacyTracking` = false unless a vendor tracks.
- **Encryption:** `ITSAppUsesNonExemptEncryption: false` (line 24) remains fine — HTTPS-only transport is exempt.

### 3c. Google Play — Data safety form
Mirror the iOS disclosures in Play Console **Data safety**: declare Crash logs, Diagnostics, App interactions, and the device/install identifier; mark data **encrypted in transit** (HTTPS) and describe whether users can request deletion (they can — **Settings → Reset All Progress** wipes the local store, and you should offer email-based deletion of uploaded data tied to an install ID on request).

### 3d. Consent considerations
- **GDPR/UK-GDPR/ePrivacy:** anonymous, non-tracking diagnostics tied to a random install ID are typically defensible under legitimate interest **without** a consent gate, *provided* there's no cross-app tracking and the policy discloses it. If you adopt a vendor that profiles/tracks, you likely need an in-app consent prompt.
- **Recommended (low-risk) posture:** add an **opt-out** in Settings ("Share anonymous diagnostics" toggle, default on) that, when off, short-circuits `syncTelemetry()` and skips `Sentry.init`. This is cheap insurance and aligns with the app's existing privacy-forward tone. (Currently there is no such toggle — `SettingsScreen.tsx` would gain one wired to a persisted flag read by telemetry.ts and `initCrashReporting`.)
- **Children:** policy targets 12+ (lines 36–37). Keep diagnostics anonymous; do not add any age-gated tracking.
- **Crash payload scrubbing:** stack traces and `metadata` can incidentally contain user content (e.g., a puzzle word). The local log already truncates stacks to 500 chars (errorReporting.ts:46). For Sentry, add a `beforeSend` scrubber and disable PII auto-capture (`sendDefaultPii: false`, the default) so IPs/usernames aren't attached.

---

## 4. Pre-launch checklist & effort estimate

### Telemetry (analytics / retention) — required for launch
- [ ] Stand up collector (Option A self-host, or B/C with translation proxy). Ensure HTTPS + server-side dedupe on `(installId, type, timestamp)`.
- [ ] Set `extra.telemetryEndpoint` in `app.json` (or `app.config.ts` + EAS env per profile).
- [ ] Verify end-to-end on a dev build: trigger `app_open`, complete a puzzle, confirm events land server-side; confirm `removeOldestEvents` clears local queue on 2xx.
- [ ] Build the **D1/D7/D30 retention** report and the **onboarding funnel** (SQL above, or vendor insight).
- [ ] Confirm offline behavior (events queue, upload on next session; accept 500-cap loss for heavy-offline users).

### Crash reporting (Sentry) — strongly recommended for launch
- [ ] `npx expo install @sentry/react-native`; add `@sentry/react-native/expo` plugin + `sentryDsn` to `app.json`.
- [ ] Create Sentry org/project; add `SENTRY_AUTH_TOKEN` as an **EAS secret** (never committed).
- [ ] Implement the additive `initCrashReporting()` + `reportError()` forward (§2c). Call `initCrashReporting()` before `installGlobalErrorHandler()` in `App.tsx`.
- [ ] **Switch off Expo Go**; produce an EAS **development** build to test, then a **production** build. Verify source maps/dSYM uploaded (test crash shows symbolicated frames).
- [ ] Confirm `ErrorBoundary` render error and a thrown async error both appear in Sentry, tagged with `source`.
- [ ] Set up release-health (crash-free users) and an alert (e.g., new issue / crash-rate spike → email/Slack).

### Privacy / legal — **must ship in the same release that enables collection**
- [ ] Update `docs/privacy-policy.md` (diagnostics now on; list data types + processors; new effective date; note in release notes).
- [ ] App Store Connect privacy labels (Diagnostics/Crash, Usage, Identifier — "not used for tracking").
- [ ] Google Play Data safety form.
- [ ] Verify merged iOS privacy manifest covers Sentry's required-reason APIs; keep `NSPrivacyTracking=false`.
- [ ] (Recommended) Add Settings opt-out toggle gating both telemetry and Sentry init; add Sentry `beforeSend` PII scrub.

### Effort estimate

| Workstream | Estimate |
|---|---|
| Turn on telemetry + self-host/proxy collector + verify | **0.5–1.5 day** (Option A small FaaS; Option B/C proxy similar) |
| Retention + onboarding funnel dashboards/queries | **0.5–1 day** (near-zero in PostHog/Amplitude UI) |
| Sentry install + config plugin + EAS secret + forwarding code | **0.5 day** |
| Move team to EAS dev/prod builds & verify symbolication | **0.5–1 day** (one-time; mostly first native build + store-cred plumbing) |
| Privacy policy + App Store/Play disclosures | **0.5 day** |
| (Optional) Settings opt-out toggle + PII scrub | **0.5 day** |
| **Total** | **~2.5–4.5 engineer-days** to launch-ready, dominated by the first native build and collector standup, not by app code. |

The app code itself is essentially ready: **one `app.json` line** enables analytics; **one additive hook** in `errorReporting.ts` enables Sentry. Everything downstream is infra + compliance.
