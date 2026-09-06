/** Non-writing RPC/permission probe. Uses public app config; prints no keys or player data.
 * node scripts/tools/verifyHostedBackend.mjs [report.json]
 * The mutation RPC probes use invalid owners/install IDs, rejected before SQL writes.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const config = JSON.parse(await readFile(new URL('../../app.json', import.meta.url), 'utf8')).expo.extra;
const checks = [
  ['get_save_v2', { p_owner: 'invalid' }, 200, []],
  ['upsert_save_v2', { p_owner: 'invalid', p_version: 1, p_timestamp: 0, p_device_id: 'probe', p_payload: '{}' }, 200, { status: 'unavailable' }],
  ['ingest_events_v2', { p_install_id: '', p_platform: 'probe', p_app_version: 'probe', p_events: [] }, 200, false],
  ['submit_daily_score_v2', { p_owner: '', p_date: '', p_board_version: '', p_time_ms: 0, p_stars: 0, p_hints: 0 }, 200, []],
  ['daily_rank_v2', { p_owner: '', p_date: '', p_board_version: 'release_probe' }, 200, []],
  ['get_save', { p_owner: 'invalid' }, [401, 403, 404]],
  ['support_preview', { p_support_id: 'invalid' }, [401, 403, 404]],
];
const headers = { apikey: config.supabaseAnonKey, 'Content-Type': 'application/json' };
if (!config.supabaseAnonKey.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${config.supabaseAnonKey}`;
const results = [];
for (const [rpc, body, expectedStatus, expectedBody] of checks) {
  try {
    const response = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/${rpc}`, {
      method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
    });
    const value = await response.json().catch(() => null);
    results.push({ rpc, status: response.status, expectedStatus, code: value?.code ?? null,
      passed: (Array.isArray(expectedStatus) ? expectedStatus.includes(response.status) : response.status === expectedStatus) && (expectedBody === undefined || JSON.stringify(value) === JSON.stringify(expectedBody)) });
  } catch (error) { results.push({ rpc, passed: false, error: error.name }); }
}
for (const table of ['saves', 'events', 'daily_scores_v2', 'support_install_links']) {
  try {
    const response = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?select=*&limit=0`, { headers, signal: AbortSignal.timeout(15_000) });
    results.push({ table, status: response.status, expectedStatus: [401, 403], passed: [401, 403].includes(response.status) });
  } catch (error) { results.push({ table, passed: false, error: error.name }); }
}
const report = { checkedAt: new Date().toISOString(), mode: 'invalid-input and zero-row permission probes', playerDataRead: false, intendedWrites: 0, passed: results.every(item => item.passed), results };
if (process.argv[2]) { const file = resolve(process.argv[2]); await mkdir(dirname(file), { recursive: true }); await writeFile(file, JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
