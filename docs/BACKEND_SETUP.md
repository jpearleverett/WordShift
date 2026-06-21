# WordShift Backend Setup (optional, drop-in)

Everything below is **disabled by default**. The app ships and runs in Expo Go
with zero network calls until you fill in credentials in `mobile/app.json`
under `expo.extra`. No native SDKs are added — all integrations use plain
`fetch`, so Expo Go keeps working.

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

Create a free project at supabase.com, then run this SQL in the SQL editor.

```sql
-- ============================================================
-- CLOUD SAVE
-- ============================================================
create table if not exists public.saves (
  owner      text primary key,
  version    integer     not null default 1,
  timestamp  bigint      not null,
  device_id  text        not null default '',
  payload    text        not null,           -- JSON-stringified save blob
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;
-- Auth-free (anon key). Tighten to your threat model if you add auth later.
create policy "anon read/write saves" on public.saves
  for all to anon using (true) with check (true);

-- ============================================================
-- ANALYTICS (write-only from the client)
-- ============================================================
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  install_id  text        not null,
  platform    text,
  app_version text,
  type        text        not null,
  data        jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "anon insert events" on public.events
  for insert to anon with check (true);
create index if not exists events_install_id_idx on public.events (install_id);
create index if not exists events_created_at_idx on public.events (created_at);

-- ============================================================
-- DAILY CHALLENGE LEADERBOARD
-- ============================================================
create table if not exists public.daily_scores (
  owner      text        not null,
  date       text        not null,           -- local-day 'YYYY-MM-DD'
  time_ms    integer     not null check (time_ms >= 0),
  stars      smallint    not null check (stars between 0 and 3),
  hints      smallint    not null check (hints >= 0),
  handle     text,
  created_at timestamptz not null default now(),
  primary key (owner, date)                  -- upsert conflict target
);
create index if not exists daily_scores_date_order_idx
  on public.daily_scores (date, time_ms asc, stars desc, hints asc);
alter table public.daily_scores enable row level security;
create policy "anon rw daily_scores" on public.daily_scores
  for all to anon using (true) with check (true);

-- rank: lower time wins; ties -> more stars, then fewer hints.
-- percentile = % of OTHER players beaten (0-100).
create or replace function public.daily_rank(p_date text, p_owner text)
returns table (rank integer, total integer, percentile integer)
language sql stable as $$
  with day as (
    select owner, time_ms, stars, hints
    from public.daily_scores where date = p_date
  ),
  me as (select * from day where owner = p_owner),
  agg as (
    select
      (1 + count(*) filter (
        where d.owner <> p_owner and (
          d.time_ms < me.time_ms
          or (d.time_ms = me.time_ms and d.stars > me.stars)
          or (d.time_ms = me.time_ms and d.stars = me.stars and d.hints < me.hints)
        )
      ))::int as rnk,
      (select count(*) from day)::int as tot
    from day d, me
    group by me.time_ms, me.stars, me.hints
    limit 1
  )
  select rnk, tot,
    case when tot <= 1 then 0
         else round(((tot - rnk)::numeric / (tot - 1)) * 100)::int end
  from agg;
$$;

-- ============================================================
-- AGGREGATE SOCIAL PROOF (anonymous global daily counters)
-- ============================================================
create table if not exists public.daily_counters (
  date           text    primary key,
  words_offered  bigint  not null default 0,
  active_seekers integer not null default 0
);
alter table public.daily_counters enable row level security;
create policy "anon rw daily_counters" on public.daily_counters
  for all to anon using (true) with check (true);

create or replace function public.bump_words_offered(p_date text, p_count integer)
returns bigint language plpgsql volatile as $$
declare new_total bigint;
begin
  insert into public.daily_counters (date, words_offered)
  values (p_date, greatest(p_count, 0))
  on conflict (date) do update
    set words_offered = public.daily_counters.words_offered + greatest(p_count, 0)
  returning words_offered into new_total;
  return new_total;
end; $$;

create or replace function public.aggregate_proof(p_date text)
returns table ("wordsOfferedToday" bigint, "activeSeekers" integer)
language sql stable as $$
  select coalesce(words_offered, 0), coalesce(active_seekers, 0)
  from public.daily_counters where date = p_date;
$$;
```

Then paste `supabaseUrl` + `supabaseAnonKey` (Project Settings → API) into
`app.json`. Cloud save, leaderboard, social proof, and analytics go live.

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
