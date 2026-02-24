# Production Integrations Setup

This project now supports production wiring for:

- Crash reporting: **Sentry**
- Analytics: **PostHog** (HTTP ingestion)
- IAP / entitlements: **RevenueCat**
- Cloud save: **Supabase**

All integrations are gated by environment flags in `.env` and `app.config.ts`.

## 1) Environment Variables

Copy `.env.example` to `.env` and fill values:

```bash
cp .env.example .env
```

### Required flags

- `ENABLE_SENTRY=true` to enable Sentry
- `ENABLE_ANALYTICS=true` to enable PostHog event forwarding
- `ENABLE_IAP=true` to enable RevenueCat purchases
- `ENABLE_CLOUD_SYNC=true` to enable Supabase cloud provider

### Required keys

- `SENTRY_DSN`
- `POSTHOG_API_KEY`
- `POSTHOG_HOST` (default already points to PostHog US ingest)
- `REVENUECAT_IOS_API_KEY`
- `REVENUECAT_ANDROID_API_KEY`
- `REVENUECAT_ENTITLEMENT_ID` (default `patron`)
- `REVENUECAT_PRODUCT_ID` (default `patrons_key`)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SAVE_TABLE` (default `game_saves`)

## 2) RevenueCat (Patron Key)

1. Create app in RevenueCat and connect App Store / Play Store.
2. Create product:
   - Product ID should match `REVENUECAT_PRODUCT_ID`.
3. Create entitlement:
   - Entitlement ID should match `REVENUECAT_ENTITLEMENT_ID`.
4. Attach product to entitlement.
5. Add API keys to `.env`.

In-app behavior:
- Settings screen shows **Buy Patron's Key** and **Restore Purchases** when IAP is configured.
- If IAP is not configured, Settings falls back to local entitlement toggle (dev-safe).

## 3) Sentry

1. Create Sentry project for React Native.
2. Put DSN in `SENTRY_DSN`.
3. Set `ENABLE_SENTRY=true`.

App startup calls `initSentryCrashReporter()` which:
- Initializes Sentry SDK
- Registers the app's existing `errorReporting.ts` pipeline as a Sentry adapter

## 4) PostHog Analytics

1. Create PostHog project.
2. Copy project API key into `POSTHOG_API_KEY`.
3. Set host (`https://us.i.posthog.com` or your self-hosted URL).
4. Set `ENABLE_ANALYTICS=true`.

`eventLogger.logEvent(...)` now forwards events to PostHog capture endpoint.

## 5) Supabase Cloud Save

1. Create Supabase project.
2. Enable anonymous sign-in under Auth settings.
3. Create save table:

```sql
create table if not exists game_saves (
  user_id text primary key,
  save_data jsonb not null,
  updated_at timestamptz not null default now()
);
```

If using a different table name, set `SUPABASE_SAVE_TABLE`.

4. Add RLS policy (example):

```sql
alter table game_saves enable row level security;

create policy "anon can read own save"
on game_saves
for select
to anon
using (auth.uid()::text = user_id);

create policy "anon can upsert own save"
on game_saves
for insert
to anon
with check (auth.uid()::text = user_id);

create policy "anon can update own save"
on game_saves
for update
to anon
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);
```

5. Set `ENABLE_CLOUD_SYNC=true`.

App startup swaps cloud provider from local mirror to `SupabaseCloudProvider`.

## 6) Build / Deploy

EAS config is now included in `eas.json`.

Typical flow:

```bash
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

Use `development` profile for internal dev client builds.
