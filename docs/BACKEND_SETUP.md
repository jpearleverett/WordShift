# WordShift Backend Setup (optional, drop-in)

> **Current migration status (2026-09-05):** credentials and the original July
> setup were previously configured. This release adds save integrity, event
> ingestion, daily board cohorts and private support operations. Their SQL has
> been rehearsed locally; hosted deployment is a separate release gate. The July
> verification does not establish that these new RPCs exist in production.

Everything below is **disabled by default** (until credentials are filled in, as
they now are). The app ships and runs in Expo Go with zero network calls until you
fill in credentials in `mobile/app.json` under `expo.extra`. The Supabase
integrations use plain `fetch` (no native SDK), so Expo Go keeps working; crash
reporting uses the `@sentry/react-native` SDK (see section 2), which no-ops
when no DSN is set.

> **Privacy:** ✅ done — `docs/privacy-policy.md` discloses cloud save,
> analytics, and crash reporting, and the Play data-safety declarations were
> submitted (2026-07-02). Re-review both if the data you collect ever changes.

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

> The original base schema was applied and verified on 2026-07-02. The new
> integrity, daily-version and support migrations below have only been rehearsed
> locally; their hosted deployment remains a release gate.

For a new project, apply the following as `postgres`, in order:

1. [`security_setup.sql`](supabase/security_setup.sql) (base schema).
2. [`save_integrity_v2.sql`](supabase/save_integrity_v2.sql).
3. [`events_integrity_v2.sql`](supabase/events_integrity_v2.sql).
4. [`daily_board_versions.sql`](supabase/daily_board_versions.sql).
5. [`support_operations.sql`](supabase/support_operations.sql).
6. [`analytics_funnels.sql`](supabase/analytics_funnels.sql).
7. [`event_retention.sql`](supabase/event_retention.sql).

For the existing WordShift project, skip the base schema and run
`psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f docs/supabase/apply_upgrade.sql`,
or run files 2–7 above in the dashboard SQL editor. Once Supabase Cron is enabled,
apply [`schedule_event_retention.sql`](supabase/schedule_event_retention.sql) and
record a successful scheduled run.

Do not re-run the base script alone after upgrading: it would re-enable weak
legacy save RPCs. Rehearse the sequence and permissions in a disposable project;
see [save upgrade](SAVE_INTEGRITY_UPGRADE.md) and
[support operations](SUPPORT_AND_RETENTION_RUNBOOK.md). A missing new RPC leaves
cloud/analytics/ranking unavailable; the client does not fall back to unsafe
legacy writes.

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
  128-bit random save capability encoded as a complete WS2 recovery code. The old short code is deprecated and its save RPCs are revoked. Presenting a
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
  - `get_save_v2(p_owner)` / `upsert_save_v2(...)`
    — cloud save, one row per capability, 1 MB payload cap.
  - `submit_daily_score_v2(...)` — upserts only the caller's `(owner, date, board_version)` row,
    with hard bounds (time ≤ 24 h, stars 0–3, hints 0–50, handle ≤ 24 chars)
    so a poisoned client can't submit absurd scores.
  - `daily_rank_v2(p_date, p_owner, p_board_version)` — aggregate-only standing
    (rank/total/percentile); never other players' ids or scores.
  - `bump_words_offered(...)` (bounded per call) / `aggregate_proof(...)` —
    two anonymous global numbers, nothing per-player.
- **The `events` telemetry table is INSERT-only** for `anon` (no select). The
  current client calls `ingest_events_v2` to deduplicate stable event IDs without granting SELECT access.

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
To move progress across devices, the player uses **Settings → Backup & Restore**:
"Show recovery code" on the original device, then "Restore from another device"
on the new one. A new `WS2-` code contains all 32 hexadecimal characters of the
128-bit save capability in four groups of eight; it is shown only after a durable
backup succeeds. A fresh installation without retained identity does not discover
an unrelated backup automatically. Short legacy codes are not silently imported;
follow [the original-device upgrade and verified support procedure](SAVE_INTEGRITY_UPGRADE.md).

## 2. Sentry (crash reporting)

> ✅ Live. The app uses the real **`@sentry/react-native` SDK** (not the old
> HTTP-store-API forwarder): `Sentry.init` runs at App.tsx module load when
> `sentryDsn` is set (crash + error capture only, `tracesSampleRate: 0`), and
> captures **native** crashes (force-closes / SIGSEGV / Java FATAL EXCEPTION)
> in dev-client/EAS builds — plus unhandled JS errors. Errors routed through
> `reportError()` (ErrorBoundary etc.) are forwarded via the
> `setErrorForwarder()` seam in `src/services/errorReporting.ts` with their
> source/metadata as Sentry tags/extras. No DSN → fully disabled.

To re-provision: create a project at sentry.io, copy its DSN into `sentryDsn`
in `app.json`, and set the org/project slugs in the `@sentry/react-native`
config plugin (`app.json` → `plugins`; currently `iridescent-games-9n` /
`wordshift`). **Source maps:** production EAS builds upload them automatically
— `SENTRY_AUTH_TOKEN` is stored as a secret EAS environment variable, and
`SENTRY_DISABLE_AUTO_UPLOAD` is set only in the `development`/`preview` build
profiles (`eas.json`).

## 3. Store submission (separate from the above)

- ✅ `expo.extra.eas.projectId` / `owner` are populated (`eas init` done).
- ✅ `eas.json` → `submit.production.android` is wired (service-account key at
  `./secrets/play-service-account.json`, internal track) — `eas submit -p
  android` works. App Store Connect credentials are still open (iOS track).

## 4. Monetization (in-app purchases + ads)

Separate, and ✅ live on Android: the RevenueCat (IAP) and AdMob (ads) provider
adapters behind the `iap.ts` / `ads.ts` seams are registered in `App.tsx`, with
SDKs installed and Android keys set (iOS keys blank → NoOp fallback). See
**`docs/MONETIZATION_SETUP.md`** for the details and the iOS steps.
