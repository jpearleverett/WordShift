#!/usr/bin/env bash
# Deploys the WordShift launch dashboard to Google Cloud Run. Run it in Google
# Cloud Shell (https://shell.cloud.google.com), from this folder:
#
#   cd WordShift/dashboard && bash deploy.sh
#
# Options:
#   --rotate-db-password  new dashboard_reader password (prints a new ALTER ROLE line)
#   --rotate-session      new session key (signs every device out)
#   --reconfigure         ask every setting again (current values are the defaults)
#
# Secrets are typed with hidden input, go straight to Secret Manager through a
# pipe, and are never echoed, written to disk or kept in shell history.
# Re-running is safe: it updates the same service with the current settings.
set -euo pipefail
umask 077

ROTATE_DB=0
ROTATE_SESSION=0
RECONFIGURE=0
for arg in "$@"; do
  case "$arg" in
    --rotate-db-password) ROTATE_DB=1 ;;
    --rotate-session) ROTATE_SESSION=1 ;;
    --reconfigure) RECONFIGURE=1 ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

TMP_FILES=()
cleanup() {
  local f
  for f in "${TMP_FILES[@]:-}"; do
    [ -n "$f" ] && rm -f "$f"
  done
  unset pw pw1 pw2 verifier secret_value
}
trap cleanup EXIT
trap 'echo; echo "Stopped."; exit 130' INT

say() { printf '%s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }
warn() { printf 'WARNING: %s\n' "$*" >&2; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
step "Checking the environment"
[ -t 0 ] || die "Run this in an interactive terminal (Google Cloud Shell)."
for cmd in gcloud node openssl curl; do
  command -v "$cmd" >/dev/null 2>&1 || die "$cmd is not installed. Google Cloud Shell has all of them."
done
[ -f Dockerfile ] && [ -f package.json ] && [ -f src/server.js ] || die "Run this from the dashboard folder: cd WordShift/dashboard"
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)' || die "Node 18 or newer is needed to run the helper scripts."

# ---------------------------------------------------------------------------
# Non-secret settings live in a private file so a re-run does not ask again.
CONFIG_DIR="$HOME/.config/wordshift-dashboard"
CONFIG_FILE="$CONFIG_DIR/config.env"
CONFIG_KEYS=(PROJECT SERVICE REGION SUPABASE_PROJECT_REF DB_HOST DB_PORT DASHBOARD_TZ DASHBOARD_LAUNCH_AT
  REVENUECAT_PROJECT_ID REVENUECAT_CURRENCY SENTRY_ORG SENTRY_PROJECT_ID SENTRY_API_BASE SENTRY_ENVIRONMENT)
for key in "${CONFIG_KEYS[@]}"; do printf -v "$key" '%s' ""; done
if [ -f "$CONFIG_FILE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    key=${line%%=*}
    value=${line#*=}
    for allowed in "${CONFIG_KEYS[@]}"; do
      if [ "$key" = "$allowed" ]; then printf -v "$key" '%s' "$value"; fi
    done
  done < "$CONFIG_FILE"
  say "Loaded saved settings from $CONFIG_FILE"
fi

# ask VAR "Question" "default" validator [optional]
# An optional setting the owner skips is saved as "none", so a re-run does
# not ask again; --reconfigure asks everything again.
ask() {
  local var=$1 question=$2 default=$3 validator=$4 optional=${5:-0} current answer hint=""
  current=${!var}
  if [ -n "$current" ] && [ "$RECONFIGURE" -eq 0 ]; then return 0; fi
  [ -n "$current" ] && default=$current
  if [ "$optional" -eq 1 ]; then
    [ -n "$default" ] && [ "$default" != none ] && hint=", none to turn it off"
    [ -z "$default" ] && default=none
  fi
  while true; do
    if [ -n "$default" ]; then
      read -r -p "$question [$default$hint]: " answer
      answer=${answer:-$default}
    else
      read -r -p "$question: " answer
    fi
    answer=$(printf '%s' "$answer" | tr -d '[:space:]')
    if [ "$optional" -eq 1 ] && [ "$answer" = none ]; then
      printf -v "$var" '%s' none
      return 0
    fi
    if [ -z "$answer" ]; then
      say "A value is needed."
    elif "$validator" "$answer"; then
      printf -v "$var" '%s' "$answer"
      return 0
    fi
  done
}

yes_no() { # yes_no "Question" default(Y|N)
  local answer
  read -r -p "$1 [$( [ "$2" = Y ] && echo Y/n || echo y/N )]: " answer
  answer=${answer:-$2}
  case "$answer" in [Yy]*) return 0 ;; *) return 1 ;; esac
}

v_project() { [[ $1 =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]$ ]] || { say "A project id is 6 to 30 lowercase letters, digits or dashes."; return 1; }; }
v_service() { [[ $1 =~ ^[a-z]([-a-z0-9]{0,47}[a-z0-9])?$ ]] || { say "Use lowercase letters, digits and dashes."; return 1; }; }
v_ref() { [[ $1 =~ ^[a-z0-9]{20}$ ]] || { say "The project ref is 20 lowercase letters and digits (from the Supabase URL)."; return 1; }; }
v_host() {
  [[ $1 =~ ^[A-Za-z0-9.-]{1,253}$ ]] || { say "That is not a host name."; return 1; }
  if [[ ! $1 =~ ^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$ ]]; then
    warn "That does not look like the shared pooler host (aws-N-region.pooler.supabase.com)."
    yes_no "Use it anyway?" N || return 1
  fi
}
v_port() { [[ $1 == 5432 || $1 == 6543 ]] || { say "Use 5432 (session mode) or 6543 (transaction mode)."; return 1; }; }
v_tz() {
  node -e 'try { new Intl.DateTimeFormat("en-US", { timeZone: process.argv[1] }); process.exit(/^[A-Za-z][A-Za-z0-9_+\/-]{0,63}$/.test(process.argv[1]) ? 0 : 1); } catch { process.exit(1); }' "$1" \
    || { say "Use an IANA time zone such as America/New_York, Europe/London or UTC."; return 1; }
}
# The day the Play production rollout went live. Everything first seen before
# the launch time is hidden as a test device, so the default is the START of
# launch day, never the day this script happens to run.
LAUNCH_DAY=2026-09-26
LAUNCH_DAY_END_ANYWHERE=2026-09-27T12:00:00Z # midnight after launch day at UTC-12, the latest zone
v_launch() {
  node -e '
    const v = process.argv[1];
    const ok = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/.test(v);
    const ms = Date.parse(v);
    process.exit(ok && Number.isFinite(ms) && ms <= Date.now() && ms > Date.parse("2020-01-01T00:00:00Z") ? 0 : 1);' "$1" \
    || { say "Use an ISO time with a zone, not in the future, for example ${LAUNCH_DAY}T13:00:00Z."; return 1; }
  if node -e 'process.exit(Date.parse(process.argv[1]) > Date.parse(process.argv[2]) ? 0 : 1)' "$1" "$LAUNCH_DAY_END_ANYWHERE"; then
    warn "$1 is after launch day ($LAUNCH_DAY). Every player who installed before it would be hidden as a test device."
    yes_no "Use it anyway?" N || return 1
  fi
}
v_rc_project() { [[ $1 =~ ^[A-Za-z0-9_-]{1,64}$ ]] || { say "RevenueCat project ids are letters, digits, _ and -."; return 1; }; }
v_currency() { [[ $1 =~ ^(USD|EUR|GBP|AUD|CAD|JPY|BRL|KRW|CNY|MXN|SEK|PLN|NZD|CHF)$ ]] || { say "Use one of USD EUR GBP AUD CAD JPY BRL KRW CNY MXN SEK PLN NZD CHF."; return 1; }; }
v_sentry_org() { [[ $1 =~ ^[a-z0-9][a-z0-9-]{0,63}$ ]] || { say "Use the organization slug from the Sentry URL."; return 1; }; }
v_sentry_project() { [[ $1 =~ ^[0-9]{1,20}$ ]] || { say "Use the numeric project id (the last number in the DSN)."; return 1; }; }
v_sentry_base() { [[ $1 =~ ^https://([a-z0-9-]+\.)?sentry\.io$ ]] || { say "Use https://us.sentry.io or https://de.sentry.io."; return 1; }; }
v_sentry_env() { [[ $1 =~ ^[A-Za-z0-9_.-]{1,64}$ ]] || { say "Letters, digits, dot, dash and underscore only."; return 1; }; }
v_region() { [[ $1 =~ ^[a-z]+-[a-z]+[0-9]+$ ]] || { say "Use a Cloud Run region such as us-east4."; return 1; }; }

# ---------------------------------------------------------------------------
step "Google Cloud project"
[ -n "$PROJECT" ] || PROJECT=$(gcloud config get-value project 2>/dev/null || true)
[ "$PROJECT" = "(unset)" ] && PROJECT=""
saved_reconfigure=$RECONFIGURE
RECONFIGURE=1
ask PROJECT "Project id to deploy into" "$PROJECT" v_project
RECONFIGURE=$saved_reconfigure
gcloud config set project "$PROJECT" >/dev/null
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)') || die "Cannot read project $PROJECT. Check the id and that you are signed in (gcloud auth list)."
say "Using project $PROJECT ($PROJECT_NUMBER)"

# ---------------------------------------------------------------------------
step "Settings"
default_ref=""
if [ -f ../mobile/app.json ]; then
  default_ref=$(node -e '
    try {
      const url = require(require("path").resolve("../mobile/app.json")).expo.extra.supabaseUrl;
      const m = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/.exec(url || "");
      process.stdout.write(m ? m[1] : "");
    } catch { }' 2>/dev/null || true)
fi
ask SERVICE "Cloud Run service name" "wordshift-dashboard" v_service
ask SUPABASE_PROJECT_REF "Supabase project ref" "$default_ref" v_ref
say "Next: the Session pooler host. In Supabase open Connect, choose Session pooler and copy the host, for example aws-0-us-east-1.pooler.supabase.com"
ask DB_HOST "Session pooler host" "" v_host
ask DB_PORT "Pooler port" "5432" v_port
say "Time zone: 'today' on the page starts at midnight here. Use an IANA name such as America/New_York or Europe/London."
ask DASHBOARD_TZ "Your time zone" "UTC" v_tz
# Midnight at the start of launch day in DASHBOARD_TZ (offset measured at that moment).
default_launch=$(node -e '
  const [tz, day] = process.argv.slice(1);
  const [y, m, d] = day.split("-").map(Number);
  const offsetAt = (ms) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms;
  };
  let midnight = Date.UTC(y, m - 1, d) - offsetAt(Date.UTC(y, m - 1, d));
  midnight = Date.UTC(y, m - 1, d) - offsetAt(midnight);
  process.stdout.write(new Date(midnight).toISOString().replace(/\.\d{3}Z$/, "Z"));' "$DASHBOARD_TZ" "$LAUNCH_DAY")
say "Launch time: when the Play production rollout went live. Devices first seen before it count as"
say "your test devices and are left out of every player number, so never set it later than the launch."
say "The default is the start of launch day ($LAUNCH_DAY) in your time zone."
# A saved value is checked again, so a launch time from a wrong earlier run is caught.
if [ -n "$DASHBOARD_LAUNCH_AT" ] && [ "$RECONFIGURE" -eq 0 ] && ! v_launch "$DASHBOARD_LAUNCH_AT"; then DASHBOARD_LAUNCH_AT=""; fi
ask DASHBOARD_LAUNCH_AT "Launch time (ISO, for example ${LAUNCH_DAY}T13:00:00Z)" "$default_launch" v_launch
say "RevenueCat panel (optional): the project id is in the RevenueCat dashboard URL, app.revenuecat.com/projects/<id>. Press Enter to skip."
ask REVENUECAT_PROJECT_ID "RevenueCat project id" "" v_rc_project 1
if [ "$REVENUECAT_PROJECT_ID" != none ]; then
  ask REVENUECAT_CURRENCY "RevenueCat currency (none means USD)" "" v_currency 1
else
  REVENUECAT_CURRENCY=none
fi
ask SENTRY_ORG "Sentry organization slug" "iridescent-games-9n" v_sentry_org
ask SENTRY_PROJECT_ID "Sentry project id" "4511612372844544" v_sentry_project
ask SENTRY_API_BASE "Sentry API base" "https://us.sentry.io" v_sentry_base
ask SENTRY_ENVIRONMENT "Sentry environment" "production" v_sentry_env

suggest_region() {
  local aws=""
  if [[ $DB_HOST =~ ^aws-[0-9]+-([a-z0-9-]+)\.pooler\.supabase\.com$ ]]; then aws=${BASH_REMATCH[1]}; fi
  case "$aws" in
    us-east-1) echo us-east4 ;; us-east-2) echo us-east5 ;; us-west-1) echo us-west2 ;; us-west-2) echo us-west1 ;;
    ca-central-1) echo northamerica-northeast1 ;; sa-east-1) echo southamerica-east1 ;;
    eu-west-1) echo europe-west1 ;; eu-west-2) echo europe-west2 ;; eu-west-3) echo europe-west9 ;;
    eu-central-1) echo europe-west3 ;; eu-central-2) echo europe-west6 ;; eu-north-1) echo europe-north1 ;;
    ap-south-1) echo asia-south1 ;; ap-southeast-1) echo asia-southeast1 ;; ap-southeast-2) echo australia-southeast1 ;;
    ap-northeast-1) echo asia-northeast1 ;; ap-northeast-2) echo asia-northeast3 ;;
    *) echo us-central1 ;;
  esac
}
say "Region: the one nearest your Supabase database keeps queries fast."
ask REGION "Cloud Run region" "$(suggest_region)" v_region

mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"
{
  for key in "${CONFIG_KEYS[@]}"; do printf '%s=%s\n' "$key" "${!key}"; done
} > "$CONFIG_FILE"
chmod 600 "$CONFIG_FILE"
say "Saved settings (no secrets) to $CONFIG_FILE"

# ---------------------------------------------------------------------------
step "Enabling Google Cloud APIs (can take a minute the first time)"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com iam.googleapis.com --quiet

step "Runtime service account"
SA_NAME=wordshift-dashboard
SA="$SA_NAME@$PROJECT.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "$SA" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA_NAME" --display-name="WordShift dashboard (runtime)" --quiet
  say "Created $SA (it gets no project roles, only access to its own secrets)."
else
  say "Using $SA"
fi

step "Build permission"
if ! gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role=roles/run.builder --condition=None --quiet >/dev/null 2>&1; then
  warn "Could not give the Compute Engine default service account the Cloud Run Builder role."
  say "Source deploys build with that account. If the deploy below fails with a permission error,"
  say "ask a project owner to grant roles/run.builder to ${PROJECT_NUMBER}-compute@developer.gserviceaccount.com."
fi

# ---------------------------------------------------------------------------
step "Secrets (typed input is hidden)"
# Every gcloud call except the final "versions add" reads /dev/null, so none of
# them can swallow a secret that is being piped in.
secret_exists() { gcloud secrets describe "$1" >/dev/null 2>&1 </dev/null; }
ensure_secret() {
  secret_exists "$1" || gcloud secrets create "$1" --replication-policy=automatic --labels=app=wordshift-dashboard --quiet >/dev/null </dev/null
}
# The value travels through a pipe from the printf builtin, so it never shows
# in a process list, a file or the shell history.
store_secret() { # store_secret NAME (value on stdin)
  ensure_secret "$1"
  gcloud secrets versions add "$1" --data-file=- --quiet >/dev/null
}

PW_SECRET=wordshift-dashboard-password
SESSION_SECRET_NAME=wordshift-dashboard-session-secret
DBPW_SECRET=wordshift-dashboard-db-password
CA_SECRET=wordshift-dashboard-db-ca
RC_SECRET=wordshift-dashboard-revenuecat-key
SENTRY_SECRET=wordshift-dashboard-sentry-token
SECRETS_IN_USE=("$PW_SECRET" "$SESSION_SECRET_NAME" "$DBPW_SECRET")

# Dashboard password. The page is public behind it, and failed tries are only
# slowed down (about 7,200 guesses a day at most), so it has to be long and
# random enough that the guess budget never matters.
if secret_exists "$PW_SECRET" && yes_no "Keep the current dashboard password?" Y; then
  :
else
  say "Anyone who finds the address can try passwords, so use a long random one."
  if yes_no "Generate a strong password for you (shown once, for your password manager)?" Y; then
    # 20 characters from 31 unambiguous letters and digits: about 99 bits.
    pw1=$(node -e '
      const c = require("crypto");
      const a = "abcdefghjkmnpqrstuvwxyz23456789";
      const g = () => Array.from({ length: 4 }, () => a[c.randomInt(a.length)]).join("");
      process.stdout.write([g(), g(), g(), g(), g()].join("-"));')
    [ "${#pw1}" -eq 24 ] || die "Could not generate a password."
    printf '%s' "$pw1" | store_secret "$PW_SECRET"
    say ""
    say "Your dashboard password (shown only now, kept nowhere else but Secret Manager):"
    say ""
    say "    $pw1"
    say ""
    say "Save it in your password manager, then run: clear"
    read -r -p "Press Enter once it is saved: " _
  else
    while true; do
      read -r -s -p "New dashboard password (16 to 256 characters): " pw1; echo
      read -r -s -p "Type it again: " pw2; echo
      if [ "$pw1" != "$pw2" ]; then say "They did not match."; continue; fi
      if [ "${#pw1}" -lt 16 ] || [ "${#pw1}" -gt 256 ]; then say "Use 16 to 256 characters."; continue; fi
      break
    done
    printf '%s' "$pw1" | store_secret "$PW_SECRET"
  fi
  unset pw1 pw2
  say "Stored. Changing the password signs every device out."
fi

# Session key (random, never typed).
if ! secret_exists "$SESSION_SECRET_NAME" || [ "$ROTATE_SESSION" -eq 1 ]; then
  head -c 48 /dev/urandom | base64 | tr -d '\n' | store_secret "$SESSION_SECRET_NAME"
  say "New session key stored. Every device must sign in again."
fi

# Database password for dashboard_reader (random, 40 letters and digits).
if ! secret_exists "$DBPW_SECRET" || [ "$ROTATE_DB" -eq 1 ]; then
  pw=$(node -e '
    const c = require("crypto");
    const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < 40; i++) s += a[c.randomInt(a.length)];
    process.stdout.write(s);')
  [ "${#pw}" -eq 40 ] || die "Could not generate a database password."
  verifier=$(printf '%s' "$pw" | node scripts/scram-verifier.mjs)
  printf '%s' "$pw" | store_secret "$DBPW_SECRET"
  unset pw
  say ""
  say "Run this ONE line in the Supabase SQL editor (Database > SQL editor), as the postgres user."
  say "It is a password hash (SCRAM verifier), not the password. Afterwards delete the query from the editor."
  say "The file docs/supabase/dashboard_reader_v1.sql must have been run first (it creates the role)."
  say ""
  printf "alter role dashboard_reader with login password '%s';\n" "$verifier"
  say ""
  unset verifier
  read -r -p "Press Enter once it has run (the pooler may take a minute to accept a new password): " _
else
  say "Keeping the existing database password. If the page says the password was rejected, run: bash deploy.sh --rotate-db-password"
fi

# Supabase CA certificate (required, public). Without it anything on the
# network path between Google and Supabase could pose as the pooler and take
# the database password, so the dashboard keeps the database off without it.
if secret_exists "$CA_SECRET" && yes_no "Keep checking the database certificate with the stored Supabase CA?" Y; then
  :
else
  say "Required: Supabase > Project Settings > Database > SSL Configuration > Download certificate,"
  say "then upload it to Cloud Shell (the three-dot menu > Upload). The dashboard will not use the"
  say "database without it."
  while true; do
    read -r -p "Path to the certificate file: " ca_path
    ca_path=${ca_path/#\~/$HOME}
    if [ -z "$ca_path" ]; then say "The certificate is required (Ctrl+C stops the script)."; continue; fi
    if [ ! -f "$ca_path" ]; then say "No file at $ca_path"; continue; fi
    if ! openssl x509 -in "$ca_path" -noout >/dev/null 2>&1; then say "$ca_path is not a PEM certificate."; continue; fi
    fingerprint=$(openssl x509 -in "$ca_path" -noout -fingerprint -sha256 | sed 's/^.*=//')
    say "SHA-256 fingerprint: $fingerprint"
    if [ "$fingerprint" = "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA" ]; then
      say "This matches the publicly reported Supabase Root 2021 CA."
    else
      warn "This is not the fingerprint publicly reported for the Supabase Root 2021 CA. Double check that you downloaded it from your own Supabase project settings."
      yes_no "Use it anyway?" N || continue
    fi
    ensure_secret "$CA_SECRET"
    gcloud secrets versions add "$CA_SECRET" --data-file="$ca_path" --quiet >/dev/null
    break
  done
fi
SECRETS_IN_USE+=("$CA_SECRET")

# RevenueCat v2 secret key (optional).
use_rc=0
if [ "$REVENUECAT_PROJECT_ID" != none ]; then
  if secret_exists "$RC_SECRET" && yes_no "Keep the stored RevenueCat key?" Y; then
    use_rc=1
  else
    say "RevenueCat > Project settings > API keys > New secret API key, version V2, with ONLY the"
    say "Charts & Metrics permission 'charts_metrics:overview:read' (read-only)."
    while true; do
      read -r -s -p "RevenueCat v2 secret key (starts with sk_, Enter to skip): " secret_value; echo
      [ -z "$secret_value" ] && break
      if [[ $secret_value =~ ^sk_[A-Za-z0-9]+$ ]]; then
        printf '%s' "$secret_value" | store_secret "$RC_SECRET"
        use_rc=1
        break
      fi
      say "That does not look like a v2 secret key."
    done
    unset secret_value
  fi
fi
[ "$use_rc" -eq 1 ] && SECRETS_IN_USE+=("$RC_SECRET")

# Sentry token (optional).
use_sentry=0
if secret_exists "$SENTRY_SECRET" && yes_no "Keep the stored Sentry token?" Y; then
  use_sentry=1
else
  say "Sentry panel (optional): Settings > Developer Settings > Custom Integrations > Internal Integration"
  say "with Organization: Read, Issue & Event: Read and Project: Read, then copy its token."
  read -r -s -p "Sentry token (Enter to skip): " secret_value; echo
  if [ -n "$secret_value" ]; then
    printf '%s' "$secret_value" | store_secret "$SENTRY_SECRET"
    use_sentry=1
  fi
  unset secret_value
fi
[ "$use_sentry" -eq 1 ] && SECRETS_IN_USE+=("$SENTRY_SECRET")

step "Letting the runtime service account read its secrets"
latest_version() {
  gcloud secrets versions list "$1" --filter='state:ENABLED' --sort-by='~createTime' --limit=1 --format='value(name.basename())'
}
declare -A VERSION
for name in "${SECRETS_IN_USE[@]}"; do
  ok=0
  for attempt in 1 2 3 4 5 6; do
    if gcloud secrets add-iam-policy-binding "$name" --member="serviceAccount:$SA" \
        --role=roles/secretmanager.secretAccessor --quiet >/dev/null 2>&1; then ok=1; break; fi
    sleep $((attempt * 5)) # a brand-new service account takes a moment to appear
  done
  [ "$ok" -eq 1 ] || die "Could not grant $SA access to $name."
  VERSION[$name]=$(latest_version "$name")
  [ -n "${VERSION[$name]}" ] || die "Secret $name has no enabled version."
  say "  $name (version ${VERSION[$name]})"
done

# ---------------------------------------------------------------------------
step "Deploying (Cloud Build builds the container; a few minutes the first time)"
ENV_FILE=$(mktemp)
TMP_FILES+=("$ENV_FILE")
yaml() { printf "%s: '%s'\n" "$1" "${2//\'/\'\'}"; }
{
  yaml DB_HOST "$DB_HOST"
  yaml DB_PORT "$DB_PORT"
  yaml SUPABASE_PROJECT_REF "$SUPABASE_PROJECT_REF"
  yaml DASHBOARD_TZ "$DASHBOARD_TZ"
  yaml DASHBOARD_LAUNCH_AT "$DASHBOARD_LAUNCH_AT"
  [ "$use_rc" -eq 1 ] && yaml REVENUECAT_PROJECT_ID "$REVENUECAT_PROJECT_ID"
  [ "$use_rc" -eq 1 ] && [ "$REVENUECAT_CURRENCY" != none ] && yaml REVENUECAT_CURRENCY "$REVENUECAT_CURRENCY"
  yaml SENTRY_ORG "$SENTRY_ORG"
  yaml SENTRY_PROJECT_ID "$SENTRY_PROJECT_ID"
  yaml SENTRY_API_BASE "$SENTRY_API_BASE"
  yaml SENTRY_ENVIRONMENT "$SENTRY_ENVIRONMENT"
  true
} > "$ENV_FILE"

SECRET_SPEC="DASHBOARD_PASSWORD=$PW_SECRET:${VERSION[$PW_SECRET]}"
SECRET_SPEC+=",SESSION_SECRET=$SESSION_SECRET_NAME:${VERSION[$SESSION_SECRET_NAME]}"
SECRET_SPEC+=",DB_PASSWORD=$DBPW_SECRET:${VERSION[$DBPW_SECRET]}"
SECRET_SPEC+=",DB_CA_CERT=$CA_SECRET:${VERSION[$CA_SECRET]}"
[ "$use_rc" -eq 1 ] && SECRET_SPEC+=",REVENUECAT_API_KEY=$RC_SECRET:${VERSION[$RC_SECRET]}"
[ "$use_sentry" -eq 1 ] && SECRET_SPEC+=",SENTRY_AUTH_TOKEN=$SENTRY_SECRET:${VERSION[$SENTRY_SECRET]}"

# The page has its own password login, so the service must be reachable
# without Google sign-in. --no-invoker-iam-check is Google's current way.
# gcloud lists the boolean flag as --[no-]invoker-iam-check. The help text is
# captured first: grep -q in a pipe would cut gcloud off and trip pipefail.
deploy_help=$(gcloud run deploy --help 2>/dev/null </dev/null || true)
if [[ $deploy_help == *invoker-iam-check* ]]; then
  PUBLIC_FLAG=--no-invoker-iam-check
else
  PUBLIC_FLAG=--allow-unauthenticated
fi

gcloud run deploy "$SERVICE" --source . --region "$REGION" \
  --service-account "$SA" "$PUBLIC_FLAG" \
  --min-instances 0 --max-instances 1 --concurrency 20 --cpu 1 --memory 512Mi --timeout 30 \
  --env-vars-file "$ENV_FILE" \
  --set-secrets "$SECRET_SPEC" \
  --labels app=wordshift-dashboard --quiet

URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')
[ -n "$URL" ] || die "Could not read the service URL."

step "Checking $URL/healthz"
healthy=0
for attempt in 1 2 3 4 5 6; do
  if curl -fsS --max-time 10 "$URL/healthz" >/dev/null 2>&1; then healthy=1; break; fi
  sleep 5
done
if [ "$healthy" -eq 1 ]; then
  say "Healthy."
  say ""
  say "Open $URL on your phone, sign in, then use Add to Home Screen."
  say "Checks after signing in: the notices bar at the top, and 'Last event' ticking."
else
  warn "The service did not answer /healthz. The last log lines follow."
  gcloud run services logs read "$SERVICE" --region "$REGION" --limit 50 || true
  exit 1
fi
