# WordShift live: the launch dashboard

A private web page, hosted on Google Cloud Run in your own Google Cloud
project, that shows what players are doing right now. It is made for a phone:
open it, sign in once, and add it to your home screen.

It reads the anonymous telemetry the game already sends to Supabase. It never
sees a player's save, recovery code, install id or any text a player typed.
The server logs in to the database as a role that can only call three
functions, and those functions only return counts.

## What it shows

From top to bottom:

1. **Status strip.** Three answers in five seconds: is data arriving, are
   people coming, is anything broken.
2. **Right now.** Devices playing in the last 5 and 60 minutes, and events per
   minute for the last hour.
3. **Today** (in your time zone). New installs, active devices, puzzles
   started and solved, Daily Challenges done, tutorial finishes, store opens,
   purchases, daily amber claims and app errors.
4. **New installs by day** since launch.
5. **Tutorial funnel** for new installs, step by step, with the biggest drop.
6. **Retention**: D1, D7 and D14 by cohort day.
7. **Story progress**: how many devices reached each phase, and how many
   puzzles they have solved.
8. **Money**: RevenueCat numbers (optional), the store funnel by product, and
   what happened when the game asked for an ad.
9. **Health**: app errors by source, cloud save failures and conflicts,
   database size, and Sentry crash-free sessions (optional).
10. **Daily Challenge**: today's entrants and when the last rank was posted.
11. **Builds**: activity by app version.
12. **Other dashboards**: links to Play Console, AdMob, RevenueCat, Sentry and
    Supabase, with a note on what to check in each.

The page refreshes itself: the live numbers every 30 seconds, the rest every
minute, and it pauses while the tab is hidden. The header shows how old the
newest event is and when the page last updated. The heavier cards (installs
by day, funnel, retention, story, store) are counted at most every 5 minutes
and say "As of" the time they were counted.

### What the words mean

- **Install or device**: a phone that sent telemetry. This is not Play
  Console's install count. A phone that never uploads is invisible here.
- **Pre-launch tester**: a device first seen before `DASHBOARD_LAUNCH_AT`.
  Testers are left out of every count and shown on their own. If 5 or more
  test devices first appeared in the 24 hours before the launch time, the page
  warns that the launch time is probably set too late. If you clear the app's
  storage or reinstall it on your own phone after launch (without an Auto
  Backup restore), that phone gets a new install id and counts as a new player.
- **New install**: first seen in the period and reached the first tutorial
  puzzle within a day. A device that restored an existing save onto a new
  phone is counted as an "other new device" instead.
- **Today** starts at midnight in `DASHBOARD_TZ`. **Retention cohorts** use
  UTC days, like the SQL views in `docs/supabase/analytics_views_v1.sql`.
- **D1** means any activity received on the next UTC day, as in the SQL
  views. A first session that runs past 00:00 UTC (8 pm New York) already
  counts, so D1 reads a little high for evening players. A rate shows
  "pending" until that day has ended.
- **Problems** are judged by the share of devices hit, never by a bare count,
  because the app logs one save result per upload attempt (one offline player
  can log dozens of "Server unavailable"). App errors are flagged from 3
  devices and 1% of active devices (5% is a problem); failed saves from 3
  devices and 5% of syncing devices (10% is a problem); save conflicts from 3
  devices and 2%. Crashes reach only Sentry, so without Sentry connected the
  Problems chip says "No problems flagged", never "Nothing broken".
- **Store visitors who bought** only counts buyers who also opened the Store:
  Patron, Remove ads, the Keeper's Edition and the season premium are sold from
  their own screens, which never log a Store visit.
- **Daily Challenge dates** are each player's own local date, so a player
  already on tomorrow's date (Asia, on your evening) shows under tomorrow's
  Daily.
- Any rate from fewer than 30 devices is marked as too small to judge.
- **Purchases** are checkouts the app reported. The money truth is RevenueCat
  and Play Console.

## One-time setup

You need: your Supabase project, a Google Cloud project with billing turned on
(Cloud Run needs a billing account even inside the free tier), and a browser.
Everything below works from a phone, but a tablet or laptop is easier.

### 1. Create the read-only database role

1. Open this file on GitHub and tap **Raw**:
   `docs/supabase/dashboard_reader_v1.sql`
2. Copy all of it.
3. In Supabase open **SQL Editor**, paste, and **Run**. It creates the
   `dashboard_reader` role (without a login yet), the three dashboard
   functions and one index. It is safe to run again later.

### 2. Open Google Cloud Shell and get the code

1. Open https://shell.cloud.google.com and pick your project.
2. Get the repository. It is private, so either:
   - `git clone https://github.com/jpearleverett/WordShift` and, when asked for
     a password, paste a GitHub personal access token with read access to the
     repository; or
   - upload the `dashboard/` folder with the Cloud Shell menu (**Upload**), and
     skip step 3's `cd WordShift`.

   Both steps 1 and 2 assume the dashboard's pull request has been merged into
   `main`. Until then, switch GitHub's branch picker to that branch before
   opening the SQL file, and clone it with
   `git clone -b <branch name> https://github.com/jpearleverett/WordShift`.

### 3. Deploy

```
cd WordShift/dashboard
bash deploy.sh
```

The script asks for a few settings and remembers them (without any secrets)
in `~/.config/wordshift-dashboard/config.env`:

- **Session pooler host**: in Supabase open **Connect**, choose **Session
  pooler**, and copy the host, for example `aws-0-us-east-1.pooler.supabase.com`.
  The pooler is needed because Supabase's direct database address is IPv6
  only and Cloud Run connects over IPv4.
- **Time zone** for "today", for example `America/New_York`.
- **Launch time**: when the Play production rollout went live. Devices first
  seen before it count as test devices and are left out of every player
  number, so never set it later than the launch. The default is the start of
  launch day, 2026-09-26, in your time zone, whatever day you run the script;
  a time after launch day asks you to confirm, and a saved one is checked again
  on every re-run. Your own phone and the internal and closed testers were
  first seen before launch, so they land in the tester group.
- **Region**: it suggests the Cloud Run region nearest your database.

Then it offers to generate the dashboard password for you (about 99 random
bits, shown once so you can save it in your password manager; run `clear`
afterwards) or lets you type one of at least 16 characters with hidden input.
It generates the database password itself and prints one line.

### 4. Run the printed line in Supabase

It looks like this:

```
alter role dashboard_reader with login password 'SCRAM-SHA-256$4096:...';
```

Paste it into the Supabase SQL Editor and run it, then delete that query from
the editor. It is a password hash (a SCRAM verifier), not the password itself,
but treat it as private. Go back to Cloud Shell and press Enter.

Next it asks for the Supabase CA certificate, which is required: in Supabase
open **Project Settings > Database > SSL Configuration > Download
certificate**, upload the file to Cloud Shell (the three-dot menu > **Upload**)
and give its path. The script prints its SHA-256 fingerprint and compares it
with the one publicly reported for the Supabase Root 2021 CA. The server then
verifies the pooler's certificate and host name on every connection. Without
the certificate the page keeps the database off (see Security).

The script then builds and deploys the service (a few minutes the first time)
and checks that it answers.

### 5. Open it on your phone

Open the URL the script prints, sign in, then use **Add to Home Screen**.

## Optional panels

Each one is off until you give it a key. Re-run `bash deploy.sh --reconfigure`
to add one later.

- **RevenueCat** (revenue for the last 28 days, MRR, active subscriptions,
  trials, new customers). In RevenueCat: **Project settings > API keys > New
  secret API key**, version **V2**, with only the Charts and Metrics permission
  `charts_metrics:overview:read`. The project id is in the dashboard URL,
  `app.revenuecat.com/projects/<id>`. The key stays on the server.
- **Sentry** (crash-free sessions for the last 24 hours and the newest open
  issues). In Sentry: **Settings > Developer Settings > Custom Integrations >
  Create New Integration > Internal Integration**, with **Organization: Read**,
  **Issue & Event: Read** and **Project: Read**, then copy its token. A
  personal token with `org:read`, `event:read` and `project:read` also works.
  An organization "Auth Token" (made for CI uploads) does not.

Play Console and AdMob have no suitable real-time API, so they appear as link
tiles with a note on what to check there.

## Redeploying, changing settings and rotating secrets

- `bash deploy.sh` again redeploys the same service with the saved settings.
  It asks whether to keep each stored secret.
- `bash deploy.sh --reconfigure` asks every setting again.
- Changing the dashboard password, or `bash deploy.sh --rotate-session`, signs
  every device out. The page's own **Sign out** only ends the session on that
  device (see Security).
- `bash deploy.sh --rotate-db-password` makes a new database password and
  prints a new ALTER ROLE line. A just-changed password can take a minute to
  reach the pooler.

Each secret version is pinned in the service, so a new value always comes with
a new deploy. Old versions stay in Secret Manager; you can disable them with
`gcloud secrets versions disable VERSION --secret NAME`.

## Checking the database side (read-only)

Run these in the Supabase SQL Editor after step 4:

```sql
select rolcanlogin, rolconnlimit, rolconfig from pg_roles where rolname = 'dashboard_reader';
-- true, 6, {statement_timeout=10s,default_transaction_read_only=on,idle_in_transaction_session_timeout=15s,idle_session_timeout=10min,lock_timeout=2s}

select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef and has_function_privilege('dashboard_reader', p.oid, 'EXECUTE')
  and has_schema_privilege('dashboard_reader', n.oid, 'USAGE') order by 1, 2;
-- exactly: public.dashboard_cohorts, public.dashboard_live, public.dashboard_progress

select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','v','m','p')
  and (has_table_privilege('dashboard_reader', c.oid, 'SELECT') or has_table_privilege('dashboard_reader', c.oid, 'INSERT'));
-- zero rows

select has_function_privilege('anon', 'public.dashboard_live(text,timestamptz)', 'EXECUTE');  -- false
select public.dashboard_live('UTC', null) is not null;  -- true
```

If the second query lists anything else (a security definer function that
some extension exposes to everyone), it did not come from this file; revoke it
from PUBLIC or ask about it.

The same checks, and many more, run offline against a local copy of the
schema:

```
npm --prefix /tmp/wordshift-sql install --no-audit --no-fund @electric-sql/pglite@0.5.8
node docs/supabase/rehearse_dashboard.mjs /tmp/wordshift-sql/package.json
```

(from the repository root). It applies migrations 1 to 11 and this file three
times, seeds events including pre-launch test devices, and checks the exact
numbers, the role's privileges, hostile time zones and that no install id or
free text ever leaves. `DASHBOARD_PERF=1` adds a timing over 300,000 events.

## Troubleshooting

The page shows the reason in plain words. The common ones:

| The page says | What to do |
|---|---|
| Database settings are missing | Re-run `bash deploy.sh`. |
| The database is off because the Supabase CA certificate is missing | Re-run `bash deploy.sh` and give it the certificate (step 3). |
| The server asked for the database password in a weak form | Supabase never does this. Something between Cloud Run and Supabase may be posing as the pooler: check `DB_HOST`, and rotate with `bash deploy.sh --rotate-db-password` if in doubt. |
| The database rejected the dashboard password | On a first deploy, run the ALTER ROLE line that deploy.sh printed (a role that cannot log in yet also shows this message, because PostgreSQL checks the password first). Otherwise run `bash deploy.sh --rotate-db-password` and run the new ALTER ROLE line. A new password can take a minute to reach the pooler. |
| The dashboard_reader role cannot log in yet | Run the ALTER ROLE line in the Supabase SQL Editor. |
| The pooler does not know this user | Check the project ref and the pooler host (`bash deploy.sh --reconfigure`). |
| The pooler could not look up dashboard_reader | The role is missing or expired. Re-run `dashboard_reader_v1.sql`, which also sets VALID UNTIL to infinity. |
| Dashboard functions are missing | Run `docs/supabase/dashboard_reader_v1.sql` in the SQL Editor. |
| Permission denied | Re-run `docs/supabase/dashboard_reader_v1.sql`. |
| The database query took too long | Each session starts with a 10 second limit per query. Wait a minute; if it keeps happening, the events table has outgrown the smallest database size. |
| Too many database connections | Another deploy may still be draining. Wait a minute. |
| Could not verify the database certificate | The stored CA does not match. Download it again from Supabase and re-run `bash deploy.sh`. |
| Could not reach the database pooler | Check the pooler host. If Supabase **Network Restrictions** are on, they block Cloud Run, whose outgoing addresses change; turn them off or allow all IPv4. |

To read the server's own log: `gcloud run services logs read wordshift-dashboard --region REGION --limit 50`.
It never contains passwords, cookies, tokens or the database address with a
password.

## Costs

- Cloud Run scales to zero: with nobody looking, nothing runs and nothing is
  queried. One or two phones polling fit comfortably inside the free tier.
- Each deploy uses a few Cloud Build minutes and leaves a container image in
  Artifact Registry (repository `cloud-run-source-deploy`). Delete old images
  now and then.
- Secret Manager charges a few cents a month per active secret version beyond
  the first six. Disable old versions after rotating.
- The database work is a handful of aggregate queries at most every 20
  seconds (live panels) or 5 minutes (the rest), shared by every open tab.

## Security model and remaining risks

- **Login.** Everything except `/healthz` needs a session. The password is
  compared in constant time; failed attempts from one address wait 1, 2, 4
  seconds and so on up to 15 minutes, and 50 failures in 10 minutes from
  anywhere pause all logins. That global brake caps guessing at about 7,200
  tries a day for as long as anyone likes, which is why deploy.sh generates a
  roughly 99-bit password (or insists on 16 or more typed characters). The same
  brake is a lockout anyone who knows the address can hold open at a few
  requests a minute: while it is on, signing in on a new phone or after the
  cookie expires answers "Too many tries", but devices already signed in keep
  working for up to 30 days. That is the accepted price of the cap. If it
  happens, redeploying (any `bash deploy.sh` run) starts a fresh instance with
  an empty counter.
- **Sessions.** The session is a stateless signed cookie (`__Host-wsd`,
  HttpOnly, Secure, SameSite=Strict, 30 days). **Sign out** clears the cookie on
  that device only: a copy of the cookie taken earlier (a shared or borrowed
  device, a synced browser profile) keeps working until it expires. To end
  every session, run `bash deploy.sh --rotate-session` or change the password.
- **Browser hardening.** A strict Content Security Policy (scripts only from
  the page itself, no inline scripts, Trusted Types, no framing), HSTS, no
  CORS, no caching, no indexing. `Referrer-Policy` is `same-origin` rather than
  `no-referrer`: under `no-referrer` browsers send `Origin: null` with the login
  form, which would make a real login look cross-site. Nothing is sent to other
  sites either way.
- **Database.** The service holds only the `dashboard_reader` password. It
  never holds the Supabase service role key or the postgres password. The role
  can execute three functions and read no table or view, and it may hold at
  most 6 connections. Those two things, the privilege set and the connection
  cap, are the real limits. The read-only mode and the 10 second statement
  timeout are only role DEFAULTS that any session holding the password can
  `SET` off, and the role keeps PostgreSQL's default right to create temporary
  tables. So the password is a credential that could load the production
  database with CPU work and temp tables, not merely read counts: keep it
  secret, and rotate it with `bash deploy.sh --rotate-db-password` if in doubt.
  The functions return counts and sanitised labels only; anything a player's
  phone could have typed is either never read or replaced by `(other)`.
- **Database link.** TLS is always on and, in production, the server verifies
  the pooler's certificate against the Supabase CA and checks the host name;
  without the CA certificate it keeps the database off rather than connect.
  Unverified, anything on the network path between Google and AWS could pose
  as the pooler, ask for the password in cleartext and get it (node-postgres
  answers such a request unconditionally). As a second guard the dashboard's
  database client refuses every cleartext or MD5 password request and only
  authenticates with SCRAM, which never sends the password. Full verification
  works with Node against the shared pooler; the known problem with the
  Supabase intermediate certificate (no Key Usage extension) trips strict
  Python clients, not Node. Local runs (`NODE_ENV` not production) may still
  connect unverified, with a notice on the page.
- **Secrets** live in Secret Manager, readable only by the service's own
  service account, which has no other role. `deploy.sh` reads them with hidden
  input and pipes them straight in; nothing is written to disk or history.
- **Container.** The image is built on `node:22-bookworm-slim` pinned by
  digest (see the Dockerfile for how to bump it) and installs `pg` with
  `npm ci --ignore-scripts`, so no dependency runs code at build time.
- **Remaining risks.** The service is on the public internet behind a
  password. Login throttling is per instance and resets when a new instance
  starts. Telemetry is unauthenticated, so the numbers are only as honest as
  the phones that send them.

## Removing everything

```
gcloud run services delete wordshift-dashboard --region REGION
for s in password session-secret db-password db-ca revenuecat-key sentry-token; do
  gcloud secrets delete wordshift-dashboard-$s --quiet
done
gcloud iam service-accounts delete wordshift-dashboard@PROJECT.iam.gserviceaccount.com
```

Then in the Supabase SQL Editor:

```sql
drop function if exists public.dashboard_live(text, timestamptz);
drop function if exists public.dashboard_cohorts(text, timestamptz);
drop function if exists public.dashboard_progress(timestamptz);
revoke usage on schema public from dashboard_reader;
drop role if exists dashboard_reader;
-- optional: drop index if exists public.events_type_received_idx;
```

## What to expect in the first days

- A player shows up within about a minute of opening the game: the app
  uploads in batches at most once a minute. Sessions played offline arrive
  when the phone next syncs.
- These numbers will not match Play Console. This page counts devices that
  sent telemetry; Play Console counts installs and usually runs 1 to 3 days
  behind. This page sees players first.
- Retention fills in slowly. The launch cohort (2026-09-26, UTC) gets its D1
  after 00:00 UTC on 2026-09-28, its D7 on 2026-10-04 and its D14 on
  2026-10-11. Until then it reads "pending". A cohort under 30 devices is noise.
- The Daily Challenge unlocks at 8 solved puzzles, and a player's first three
  Dailies are eased and never posted to the leaderboard. So real entrants
  start around day 4, 2026-09-29 at the earliest. Until then only test devices
  post ranks: finish today's Daily on your own phone and watch "Last rank
  posted" change within a minute or two. That is your end-to-end check.
- Story phases fill slowly: phase 1 at 12 solved puzzles, phase 2 at 28,
  phase 3 at 62, the reveal at 90 with all 13 residents home, and the ending
  around 115 to 120.
- AdMob numbers trail by about 4 hours. RevenueCat's new customers and active
  users can be cached for 1 to 2 hours.
- Rollout guide from `docs/ANALYTICS_DELIVERY.md`: consider pausing the staged
  rollout if, on a few hundred new installs, D1 falls under about 25% or fewer
  than about 60% finish the tutorial.

## Working on the dashboard

- `npm ci` then `npm test` runs the server tests, the page tests and the SQL
  rehearsal (PGlite, no network).
- `npm run demo` (or `npm run dev:fixtures`) serves the page on
  http://localhost:8080 with the JSON fixtures in `test/fixtures/`, no database
  and no keys. Sign in with `demo-password-1234`.
  `npm run dev:fixtures -- degraded` serves the whole envelopes in
  `fixtures/degraded/` instead (also `launch-day`, `no-data`, `week-two`), to
  preview failure and empty states. Timestamps are shifted to the present.
  Demo mode refuses to run with `NODE_ENV=production`, and the container image
  leaves every fixture out.
- Plain JavaScript modules, no build step, one runtime dependency (`pg`).
