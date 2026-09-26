// Dry run of deploy.sh against stub gcloud and curl commands, under a pseudo
// terminal (util-linux `script`), so the hidden prompts behave as in Cloud
// Shell. Checks the deploy flags and that no secret reaches a command line,
// the terminal output or the saved settings file. Linux only.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { scramVerifier } from '../scripts/scram-verifier.mjs';

const DASHBOARD_DIR = fileURLToPath(new URL('..', import.meta.url));
const hasScript = process.platform === 'linux' && spawnSync('script', ['--version'], { encoding: 'utf8' }).status === 0
  && spawnSync('openssl', ['version']).status === 0;

const GCLOUD_STUB = `#!/usr/bin/env bash
STATE=\${STUB_STATE:?}
printf '%s\\n' "gcloud $*" >> "$STATE/argv.log"
case "$*" in
  "config get-value project") echo my-project-123 ;;
  "config set project"*) ;;
  "projects describe"*) echo 123456789012 ;;
  "services enable"*) ;;
  "iam service-accounts describe"*) [ -f "$STATE/sa" ] || exit 1 ;;
  "iam service-accounts create"*) touch "$STATE/sa" ;;
  "projects add-iam-policy-binding"*) ;;
  "secrets describe "*) [ -f "$STATE/secret_$3" ] || exit 1 ;;
  "secrets create "*) echo 0 > "$STATE/secret_$3" ;;
  "secrets versions add "*)
    n=$(( $(cat "$STATE/secret_$4") + 1 )); echo $n > "$STATE/secret_$4"
    if [ "$5" = "--data-file=-" ]; then cat > "$STATE/value_$4_$n"; else cp "\${5#--data-file=}" "$STATE/value_$4_$n"; fi ;;
  "secrets add-iam-policy-binding"*) ;;
  "secrets versions list "*) cat "$STATE/secret_$4" ;;
  "run deploy --help") echo "  --[no-]invoker-iam-check" ;;
  "run deploy "*)
    prev=""; for a in "$@"; do if [ "$prev" = "--env-vars-file" ]; then cp "$a" "$STATE/env.yaml"; printf '%s' "$a" > "$STATE/envpath"; fi; prev=$a; done ;;
  "run services describe"*) echo https://wordshift-dashboard-abc-uc.a.run.app ;;
  *) echo "unexpected gcloud call" >&2; exit 3 ;;
esac
`;
const CURL_STUB = `#!/usr/bin/env bash
printf '%s\\n' "curl $*" >> "$STUB_STATE/argv.log"
exit 0
`;

const work = mkdtempSync(join(tmpdir(), 'wsd-deploy-'));
after(() => rmSync(work, { recursive: true, force: true }));

function runDeploy(args, input, state, home) {
  const bin = join(work, 'bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'gcloud'), GCLOUD_STUB);
  writeFileSync(join(bin, 'curl'), CURL_STUB);
  chmodSync(join(bin, 'gcloud'), 0o755);
  chmodSync(join(bin, 'curl'), 0o755);
  return new Promise((resolve, reject) => {
    const child = spawn('script', ['-qec', `bash deploy.sh ${args}`, '/dev/null'], {
      cwd: DASHBOARD_DIR,
      env: { PATH: `${bin}:${process.env.PATH}`, HOME: home, STUB_STATE: state, TERM: 'dumb', LANG: 'C.UTF-8' },
    });
    // Answer each prompt only once it is on screen, as a person would; input
    // typed ahead of a hidden prompt would be echoed by the terminal.
    const answers = [...input];
    let output = '';
    let answeredAt = 0;
    const onData = (d) => {
      output += d;
      if (answers.length && /: ?$/.test(output.replace(/\r/g, '')) && output.length > answeredAt) {
        answeredAt = output.length;
        const line = answers.shift();
        setTimeout(() => child.stdin.write(`${line}\n`), 40);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`deploy.sh timed out:\n${output}`)); }, 90_000);
    child.on('exit', (code) => { clearTimeout(timer); resolve({ code, output: output.replace(/\r/g, ''), unanswered: answers.length }); });
  });
}

const PASSWORD = 'DashPassSentinel123';
const RC_KEY = 'sk_RcKeySentinel42';
const SENTRY = 'SentryTokenSentinel77';

test('first run: prompts, secrets through pipes only, pinned versions, exact flags', { skip: !hasScript && 'needs Linux, util-linux script and openssl', timeout: 120_000 }, async () => {
  const state = join(work, 'state1');
  const home = join(work, 'home1');
  mkdirSync(state);
  mkdirSync(home);
  const input = [
    '', // project (default from gcloud config)
    '', // service
    '', // Supabase ref from ../mobile/app.json
    'aws-0-us-east-1.pooler.supabase.com',
    '', // port
    'America/New_York',
    '2026-09-26T13:00:00Z',
    'proj123',
    'EUR',
    '', '', '', '', // Sentry defaults
    '', // region (suggested us-east4)
    'n', // do not generate: type one
    PASSWORD, PASSWORD,
    '', // after the ALTER ROLE line
    join(DASHBOARD_DIR, 'test/helpers/test-ca.pem'),
    'y', // not the Supabase fingerprint: use anyway
    RC_KEY,
    SENTRY,
  ];
  const { code, output, unanswered } = await runDeploy('', input, state, home);
  assert.equal(code, 0, output);
  assert.equal(unanswered, 0, output);
  const argv = readFileSync(join(state, 'argv.log'), 'utf8');
  const stored = (name) => readFileSync(join(state, `value_wordshift-dashboard-${name}_1`), 'utf8');
  assert.equal(stored('password'), PASSWORD);
  assert.equal(stored('revenuecat-key'), RC_KEY);
  assert.equal(stored('sentry-token'), SENTRY);
  assert.match(stored('session-secret'), /^[A-Za-z0-9+/]{64}$/);
  const dbPassword = stored('db-password');
  assert.match(dbPassword, /^[A-Za-z0-9]{40}$/);
  for (const secret of [PASSWORD, RC_KEY, SENTRY, dbPassword, stored('session-secret')]) {
    assert.ok(!argv.includes(secret), 'secret on a command line');
    assert.ok(!output.includes(secret), 'secret on the terminal');
  }
  const verifier = /alter role dashboard_reader with login password '(SCRAM-SHA-256\$4096:[^']+)';/.exec(output)?.[1];
  assert.ok(verifier, 'the ALTER ROLE line is printed');
  const salt = Buffer.from(verifier.split('$')[1].split(':')[1], 'base64');
  assert.equal(scramVerifier(dbPassword, salt, 4096), verifier, 'the printed verifier belongs to the stored password');
  const deploy = argv.split('\n').find((l) => l.startsWith('gcloud run deploy wordshift-dashboard'));
  for (const flag of ['--source .', '--region us-east4', '--service-account wordshift-dashboard@my-project-123.iam.gserviceaccount.com',
    '--no-invoker-iam-check', '--min-instances 0', '--max-instances 1', '--concurrency 20', '--cpu 1', '--memory 512Mi', '--timeout 30',
    '--labels app=wordshift-dashboard', '--quiet']) {
    assert.ok(deploy.includes(flag), flag);
  }
  assert.match(deploy, /--set-secrets DASHBOARD_PASSWORD=wordshift-dashboard-password:1,SESSION_SECRET=wordshift-dashboard-session-secret:1,DB_PASSWORD=wordshift-dashboard-db-password:1,DB_CA_CERT=wordshift-dashboard-db-ca:1,REVENUECAT_API_KEY=wordshift-dashboard-revenuecat-key:1,SENTRY_AUTH_TOKEN=wordshift-dashboard-sentry-token:1 /);
  assert.ok(argv.includes('--role=roles/run.builder'));
  assert.equal((argv.match(/--role=roles\/secretmanager\.secretAccessor/g) ?? []).length, 6);
  assert.equal(readFileSync(join(state, 'env.yaml'), 'utf8'), [
    "DB_HOST: 'aws-0-us-east-1.pooler.supabase.com'", "DB_PORT: '5432'", "SUPABASE_PROJECT_REF: 'rsppoarumebdrsbfrqdi'",
    "DASHBOARD_TZ: 'America/New_York'", "DASHBOARD_LAUNCH_AT: '2026-09-26T13:00:00Z'", "REVENUECAT_PROJECT_ID: 'proj123'",
    "REVENUECAT_CURRENCY: 'EUR'", "SENTRY_ORG: 'iridescent-games-9n'", "SENTRY_PROJECT_ID: '4511612372844544'",
    "SENTRY_API_BASE: 'https://us.sentry.io'", "SENTRY_ENVIRONMENT: 'production'", ''].join('\n'));
  const configFile = join(home, '.config/wordshift-dashboard/config.env');
  assert.equal(statSync(configFile).mode & 0o777, 0o600);
  const saved = readFileSync(configFile, 'utf8');
  for (const secret of [PASSWORD, RC_KEY, SENTRY, dbPassword]) assert.ok(!saved.includes(secret));
  assert.match(saved, /^DB_HOST=aws-0-us-east-1\.pooler\.supabase\.com$/m);
  assert.match(output, /Healthy\./);

  // Re-run: settings come from the file, secrets are kept, only the database password rotates.
  // Project, keep password, after ALTER ROLE, keep CA, keep RevenueCat, keep Sentry.
  const again = await runDeploy('--rotate-db-password', ['', '', '', '', '', ''], state, home);
  assert.equal(again.code, 0, again.output);
  assert.equal(again.unanswered, 0, again.output);
  assert.ok(existsSync(join(state, 'value_wordshift-dashboard-db-password_2')));
  assert.ok(!existsSync(join(state, 'value_wordshift-dashboard-password_2')));
  const argv2 = readFileSync(join(state, 'argv.log'), 'utf8').split('\n').filter((l) => l.startsWith('gcloud run deploy wordshift-dashboard')).at(-1);
  assert.match(argv2, /DB_PASSWORD=wordshift-dashboard-db-password:2,/);
  assert.match(argv2, /DASHBOARD_PASSWORD=wordshift-dashboard-password:1,/);
  assert.ok(!again.output.includes(readFileSync(join(state, 'value_wordshift-dashboard-db-password_2'), 'utf8')));
  assert.equal(existsSync(readFileSync(join(state, 'envpath'), 'utf8')), false, 'the env file is removed on exit');
});

test('defaults: launch day start, a generated password shown once, the CA is required', { skip: !hasScript && 'needs Linux, util-linux script and openssl', timeout: 120_000 }, async () => {
  const state = join(work, 'state2');
  const home = join(work, 'home2');
  mkdirSync(state);
  mkdirSync(home);
  const input = [
    '', '', '', // project, service, Supabase ref
    'aws-0-eu-west-2.pooler.supabase.com',
    '', // port
    'Europe/London',
    '', // launch time: the default
    '', // RevenueCat: none
    '', '', '', '', // Sentry defaults
    '', // region (suggested europe-west2)
    '', // generate a password: yes
    '', // after saving it
    '', // after the ALTER ROLE line
    '', // no certificate path: asked again
    '/nonexistent/ca.pem', // no such file: asked again
    join(DASHBOARD_DIR, 'test/helpers/test-ca.pem'),
    'y', // not the Supabase fingerprint: use anyway
    '', // no Sentry token
  ];
  const { code, output, unanswered } = await runDeploy('', input, state, home);
  assert.equal(code, 0, output);
  assert.equal(unanswered, 0, output);
  const env = readFileSync(join(state, 'env.yaml'), 'utf8');
  // Midnight at the start of 2026-09-26 in London (BST, UTC+1), not the day the script ran.
  assert.match(env, /^DASHBOARD_LAUNCH_AT: '2026-09-25T23:00:00Z'$/m);
  assert.match(output, /Launch time \(ISO, for example 2026-09-26T13:00:00Z\) \[2026-09-25T23:00:00Z\]/);
  const password = readFileSync(join(state, 'value_wordshift-dashboard-password_1'), 'utf8');
  assert.match(password, /^[a-hjkmnp-z2-9]{4}(-[a-hjkmnp-z2-9]{4}){4}$/);
  assert.equal(output.split(password).length - 1, 1, 'the generated password is shown exactly once');
  assert.ok(!readFileSync(join(state, 'argv.log'), 'utf8').includes(password), 'never on a command line');
  assert.match(output, /The certificate is required/);
  assert.match(output, /No file at \/nonexistent\/ca\.pem/);
  const deploy = readFileSync(join(state, 'argv.log'), 'utf8').split('\n').find((l) => l.startsWith('gcloud run deploy wordshift-dashboard'));
  assert.match(deploy, /,DB_CA_CERT=wordshift-dashboard-db-ca:1/);
  assert.ok(!deploy.includes('REVENUECAT_API_KEY') && !deploy.includes('SENTRY_AUTH_TOKEN'));
  assert.match(deploy, /--region europe-west2 /);
});
