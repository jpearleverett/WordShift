# WordShift Backend Setup (optional, drop-in)

> **Status:** ✅ Configured. `supabaseUrl` + `supabaseAnonKey` (cloud save,
> leaderboard, social proof, analytics) and `sentryDsn` (crash reporting) are set
> in `app.json` → `expo.extra`. Provision/harden the database by running
> **`docs/supabase/security_setup.sql`** (see section 1). The guide remains the
> reference for re-provisioning or pointing at a new project.

Everything below is **disabled by default** (until credentials are filled in, as
they now are). The app ships and runs in Expo Go with zero network calls until you
fill in credentials in `mobile/app.json` under `expo.extra`. No native SDKs are
added — all integrations use plain `fetch`, so Expo Go keeps working.

> **Privacy:** before enabling any of these, update `docs/privacy-policy.md`
> to disclose cloud save, analytics, and crash reporting, and review the data
> you collect against the App Store / Play data-safety forms.

## What turns on with each credential

| `app.json` → `expo.extra` key | Enables |
|---|---|
| `supabaseUrl` + `supabaseAnonKey` | Cloud save, daily leaderboard, aggregate social proof, and analytics (event upload) |
| `sentryDsn` | Remote crash/error forwarding |
| `telemetryEndpoint` | (Alternative analytics sink — a custom collector. If unset but Supabase is set, events go to the Supabase `events` table instead.) |

```jsonc
// mobile/app.json
"extra": {
  "telemetryEndpoint": "",
  "supabaseUrl": "https://<project>.supabase.co",
  "supabaseAnonKey": "<anon public key>",
  "sentryDsn": "https://<key>@<org>.ingest.sentry.io/<project>"
}
```

## 1. Supabase project

Create a free project at supabase.com, then run
**[`docs/supabase/security_setup.sql`](supabase/security_setup.sql)** in the SQL
editor (as `postgres`, the editor's default role). The script is **idempotent
and self-contained**: it creates the four app tables (`saves`, `events`,
`daily_scores`, `daily_counters`) if missing, locks them down, and installs the
RPC surface the client uses. Re-run it any time — including over a project that
was provisioned with the older (pre-hardening) SQL from this guide; it removes
the legacy wide-open policies in place.

Then paste `supabaseUrl` + `supabaseAnonKey` (Project Settings → API) into
`app.json`. Cloud save, leaderboard, social proof, and analytics go live.

> **Deploy note:** run the SQL and ship the RPC-based client together. Older
> app builds that still issue direct table reads/writes will simply degrade
> (every call resolves null — no crash), but their cloud sync and rank display
> stop working until the player updates.

### Security model: capability URLs, no direct table access

The app has **no user auth** — the shipped anon key is public by definition, so
the database can never trust "who" is calling, only "what they know". The
model:

- **A player's owner id is an unguessable bearer capability** — a random
  UUIDv4 install id, or the 8-char recovery code derived from it. Presenting a
  row's owner id is the only way to touch that row.
- **Direct table access for `anon` is fully denied.** RLS is enabled on every
  app table with no anon read/write policies, *and* the default table grants
  are revoked (belt and braces — a future accidental permissive policy still
  can't re-open access). `GET /rest/v1/saves?select=*` and friends now return
  errors, so nobody holding the anon key can enumerate or dump rows, and
  nobody can write another player's rows.
- **Everything the client needs is a `SECURITY DEFINER` RPC** (owned by
  `postgres`, `EXECUTE` granted to `anon`) that gates each operation on the
  caller presenting the owner id, and returns only that owner's data or pure
  aggregates:
  - `get_save(p_owner)` / `get_save_timestamp(p_owner)` / `upsert_save(...)`
    — cloud save, one row per capability, 1 MB payload cap.
  - `submit_daily_score(...)` — upserts only the caller's `(owner, date)` row,
    with hard bounds (time ≤ 24 h, stars 0–3, hints 0–50, handle ≤ 24 chars)
    so a poisoned client can't submit absurd scores.
  - `daily_rank(p_date, p_owner)` — aggregate-only standing
    (rank/total/percentile); never other players' ids or scores.
  - `bump_words_offered(...)` (bounded per call) / `aggregate_proof(...)` —
    two anonymous global numbers, nothing per-player.
- **The `events` telemetry table is INSERT-only** for `anon` (no select). The
  client posts with `Prefer: return=minimal`.

**Residual risks (accepted):**

- Compromising a device (or its backup) reveals that device's owner id — an
  attacker can then read/overwrite **that one player's** save and score. Same
  blast radius as the device itself; no cross-player exposure.
- A recovery code shown to the player is the same capability in friendlier
  clothes — anyone who learns it can restore (and overwrite) that save. Treat
  it like a password.
- Telemetry is insert-only and unauthenticated, so anyone with the anon key
  can write junk `events` rows; analytics are best-effort and this is
  accepted. Likewise `bump_words_offered` can be spammed within its per-call
  bound — the counter is cosmetic, aggregate-only social proof.
- Enable Supabase's API rate limits (Dashboard → Settings → API) to blunt
  brute-force capability guessing and junk-event floods; a UUIDv4 space makes
  enumeration infeasible regardless.

### Recovery code (cloud save is auth-free)
A reinstall gets a new anonymous id, so to move progress across devices the
player uses **Settings → Backup & Restore**: "Show recovery code" (a
`WS-XXXX-XXXX` code) on the old device, "Restore from another device" on the
new one. Auto-restore on a fresh install only happens when the same id already
has a cloud save.

## 2. Sentry (crash reporting)

Create a project at sentry.io, copy its DSN, and set `sentryDsn` in `app.json`.
JS errors and unhandled rejections (already captured locally) will forward to
Sentry via its HTTP store API — no native SDK, Expo-Go-safe. For native crash
symbolication later, swap in the real `@sentry/react-native` SDK behind the
same `setErrorForwarder()` seam in `src/services/errorReporting.ts`.

## 3. Store submission (separate from the above)

- `eas init` to populate `expo.extra.eas.projectId` / `owner`.
- Fill `eas.json` → `submit.production` with App Store Connect / Play Console
  credentials before `eas submit`.

## 4. Monetization (in-app purchases + ads)

Separate, also drop-in. The RevenueCat (IAP) and AdMob (ads) provider adapters are
already written behind the `iap.ts` / `ads.ts` seams and stay inert until you
install the SDKs and add keys. See **`docs/MONETIZATION_SETUP.md`** for the exact
steps.
