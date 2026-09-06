# Support, deletion and retention operations

This is a release deliverable, not evidence that the migrations or retention jobs
have been deployed. Apply/rehearse the SQL in `supabase/` before advertising the
updated support flow. Backend operator access is required. Never put a service
key or recovery code in client configuration, email, analytics, tickets or logs.

## Locate first, verify separately

Settings displays a non-secret `WSS-...` support reference. Normalize it to
`wss_` plus the 32 lowercase hexadecimal characters. Successful v2 backups link
that reference and the current anonymous install ID to the save in the private
`support_install_links` table. A second device adds its own reference/install ID
to the same save after its first successful backup. The original reference can
therefore locate both devices. The mapping is not retrospective: an install
that never completed a v2 backup and unrelated legacy identities need individual
investigation. Do not guess UUID prefixes or treat a short legacy code as proof.

Using a postgres/service-role operator connection, parameterize:

```sql
select public.support_preview($1); -- normalized support reference
```

The response contains counts only. Neither this lookup reference nor a screenshot
of it authorizes data access, recovery or deletion. Before deletion, verify the
requester's authority over the exact save through a separately authenticated
support process. If proof requires possession of the recovery credential, use a
private secure verification channel; do not ask the customer to email it. The
runbook deliberately has no anonymous delete RPC and no shortcut based on a
lookup reference. Until the operator has that verification process available,
accept the request, preserve the records, and do not claim verification occurred.

Explain the previewed scope and obtain the customer's deletion instruction.
One save may include several restored-device install IDs. Analytics are keyed
by install, so deleting a linked install removes its complete event history,
including activity before that install linked this save. A support reference can
locate several prior saves after manual relinking; delete only the separately
verified owner. Purchase records/entitlements are managed by the stores and
RevenueCat; this operation does not cancel/refund a purchase or subscription.

## Execute only a verified, reviewed scope

Ask the customer to close the app during deletion: a still-running client can
upload a new backup afterward. In the operator connection, use bound parameters
and a unique verified ticket reference. Disable parameter logging for the
credential parameter. Preview again immediately beforehand.

```sql
begin;
select public.support_delete_verified($1, $2, $3);
-- $1 normalized lookup, $2 independently verified full owner capability,
-- $3 unique ticket reference. Review returned counts; commit only intended scope.
commit;
```

The operation removes that save, all linked installs' analytics and both legacy
and versioned daily scores, then cascades its private links. The audit row stores
only ticket/counts/time. It does not store the recovery credential. Independently
verify the save and linked rows are absent and unrelated test rows remain. Keep
aggregate daily counters (they cannot be attributed to an install). Diagnose
Sentry/RevenueCat/store data using their own verified processes; do not claim
these SQL statements remove provider-side records.

## Local reset and legacy recovery

Reset All atomically clears game progress and marks the reset before attempting
the explicit cloud overwrite. Cloud/install/support identity, install date,
paid-grant retry protection and anti-repeat courtesy flags survive local reset.
Cloud deletion is a separate action. Store entitlements can be restored on the
next startup. A reinstall's OS backup behavior is platform dependent.

Original-device local progress can upgrade to a strong recovery code. Full
legacy UUIDv4 capabilities may import their original row. Short or timestamp
credentials are not automatically imported, merged or re-enabled. Preserve old
rows for reviewed support work; overwritten historical data may not be recoverable.

## Retention verification gate

The published target is at most 24 months for analytics/crash diagnostics; a
policy statement is not proof of an installed job. Before public promotion,
record the project, actual scheduled job/configuration, last successful run,
oldest retained row and Sentry plan/project retention. Use read-only checks first:

```sql
select min(created_at) as oldest_event,
       count(*) filter(where created_at < now() - interval '24 months') as overdue
from public.events;
```

Review deletion scope and schedule an operator-owned bounded cleanup if needed;
record its observed execution. Do not add an unverified recurring destructive
job from the client. Check provider backups and incident/legal holds separately.
No production retention job or provider deletion was verified by this change.

## Repeatable local rehearsal

`rehearse.mjs` runs PostgreSQL in memory through PGlite. It checks CAS revisions,
revoked legacy save access, opaque lookup table permissions, event retry dedup,
daily board cohorts, and verified deletion scope while preserving unrelated
records. It makes no network requests or remote writes. Run the commands in its
header. A hosted Supabase/PostgREST two-device rehearsal and signed-device
interrupted-write tests remain release gates.
