# WordShift backend setup

Reviewed against main `6f96ebb` on 2026-09-13. See [current build](CURRENT_BUILD.md)
and [release gates](LAUNCH_CHECKLIST.md). This is a configuration/runbook audit;
no hosted migration, retention job or provider dashboard was executed here.

> **Migration implementation (introduced 2026-09-05):** credentials and the original July
> setup were previously configured. This release adds save integrity, event
> ingestion, daily board cohorts and private support operations. Their SQL has
> been rehearsed locally; hosted deployment is a separate release gate. The July
> verification does not establish that these new RPCs exist in production.

The current `mobile/app.json` has Supabase credentials and a Sentry DSN, so these
services are enabled when reachable; `telemetryEndpoint` is blank and analytics
uses the Supabase RPC. Without their corresponding credentials the optional
services no-op. Supabase uses plain `fetch`; native crash reporting is validated
with an EAS build. The owner tests signed Android AABs installed through Play
internal testing, where the native modules are present.

> **Privacy:** ✅ done — `docs/privacy-policy.md` discloses cloud save,
> analytics, and crash reporting, and the Play data-safety declarations were
> submitted (2026-07-02). Re-review both if the data you collect ever changes.

## What turns on with each credential

| `app.json` → `expo.extra` key | Enables |
|---|---|
| `supabaseUrl` + `supabaseAnonKey` | Cloud save, daily leaderboard, aggregate social proof, and analytics (event upload) |
| `sentryDsn` | Remote crash/error forwarding |
| `telemetryEndpoint` | (Alternative analytics sink. If unset but Supabase is configured, stable-ID batches use `ingest_events_v2`; no direct-write fallback.) |

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

For a new project, configure its public `supabaseUrl` + `supabaseAnonKey` in
`app.json`; WordShift already has these values. Verify actual RPC responses and
event arrival after migration. Keys in source alone do not prove service health.

> **Deploy note:** run the SQL and ship the RPC-based client together. Older
> app builds that still issue direct table reads/writes will simply degrade
> (every call resolves null — no crash), but their cloud sync and rank display
> stop working until the player updates.

### Security model: capabilities and restricted table access

The app has **no user auth** — the shipped anon key is public by definition, so
the database can never trust "who" is calling, only "what they know". The
model:

- **A player's owner id is an unguessable bearer capability** — a random
  128-bit save capability encoded as a complete WS2 recovery code. The old short
  code is deprecated and its save RPCs are revoked. Client save access requires
  that row's owner capability; private operators have separate service access.
- **Direct save/score/support table access for `anon` is denied.** RLS and
  revoked grants prevent enumeration or direct writes. Telemetry is the explicit
  exception: legacy clients retain INSERT on approved event columns, with no
  SELECT and no ability to set server-owned `received_at`. The current client
  uses the bounded deduplicating RPC instead.
- **The current client uses `SECURITY DEFINER` RPCs** (owned by `postgres`,
  with explicit execution grants). Save/score operations require the owner
  capability; event ingestion and aggregate counters are anonymous operations.
  Private support/deletion/retention routines are operator-only. Client RPCs
  return the caller's authorized data or aggregates:
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
- Monitor API usage and apply provider-supported request limits where needed
  to reduce junk-event floods. Strong WS2 capabilities have 128 random bits;
  that protection does not authenticate telemetry or validate a score's gameplay.

### Recovery code (cloud save is auth-free)

To move progress across devices, the player uses **Settings → Backup & Restore**:
"Show recovery code" on the original device, then "Restore from another device"
on the new one. A new `WS2-` code contains all 32 hexadecimal characters of the
128-bit save capability in four groups of eight; it is shown only after a durable
backup succeeds. A fresh installation without retained identity does not discover
an unrelated backup automatically. Short legacy codes are not silently imported;
follow [the original-device upgrade and verified support procedure](SAVE_INTEGRITY_UPGRADE.md).

## 2. Sentry (crash reporting)

> **Configured.** The app uses the real **`@sentry/react-native` SDK** (not the old
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
`wordshift`). **Source maps:** the production EAS secret was recorded as configured in July;
confirm `SENTRY_AUTH_TOKEN` is available to the actual build environment and a
symbolicated event arrives. `SENTRY_DISABLE_AUTO_UPLOAD` is set only in the
`development`/`preview` profiles; production/internal-testing rely on their build
environment credentials. The latest native optimization still requires device
verification of reporting and startup.

## 3. Store submission (separate from the above)

- ✅ `expo.extra.eas.projectId` / `owner` are populated (`eas init` done).
- `eas.json` configures both Android submit profiles for the **internal** track
  with a local service-account file at `./secrets/play-service-account.json`.
  Earlier uploads were owner-confirmed; verify the local credential and current
  artifact before submission. App Store Connect credentials remain open.

## 4. Monetization (in-app purchases + ads)

Separate, and configured on Android (test ads remain enabled): the RevenueCat (IAP) and AdMob (ads) provider
adapters behind the `iap.ts` / `ads.ts` seams are registered in `App.tsx`, with
SDKs installed and Android keys set (iOS keys blank → NoOp fallback). See
[monetization setup](MONETIZATION_SETUP.md) for the details and the iOS steps.
