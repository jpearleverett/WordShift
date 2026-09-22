/**
 * The three 2026-09-22 migrations (launch readiness review, BO-1/3/4/7) replace
 * live functions in place. Their behaviour is rehearsed offline by
 * docs/supabase/rehearse.mjs (PGlite); this test pins the parts that must stay
 * paired with the client or with the earlier migrations they replace:
 *   - the Daily floor's weekday row counts still mirror getDailyRamp;
 *   - every replaced function keeps the exact signature it already has, so no
 *     second overload can appear (PostgREST answers an ambiguous call with 300);
 *   - nothing new is granted to anon except the save RPC it already had;
 *   - the files are wired into apply_upgrade.sql after the files they replace.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getDailyRamp } from '../services/dailyChallenge';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
      setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
      removeItem: jest.fn((key: string) => { delete store[key]; return Promise.resolve(); }),
      clear: jest.fn(() => { Object.keys(store).forEach(key => delete store[key]); return Promise.resolve(); }),
    },
  };
});
jest.mock('../services/amberCurrency', () => ({ getCurrentPhase: jest.fn(() => Promise.resolve(0)) }));
jest.mock('../services/wordHistory', () => ({
  getWordHistoryWithRecency: jest.fn(() => Promise.resolve(new Map())),
  recordPuzzleWords: jest.fn(() => Promise.resolve()),
}));

const SUPABASE_DIR = resolve(__dirname, '../../../docs/supabase');
const read = (name: string) => readFileSync(resolve(SUPABASE_DIR, name), 'utf8');
const limits = read('save_and_board_limits_v1.sql');
const views = read('analytics_views_v1.sql');
const retention = read('event_retention_v2.sql');

/** The parameter list of `create or replace function public.<name>(...)`, whitespace-normalized. */
function signature(sql: string, name: string): string {
  const match = new RegExp(`create or replace function public\\.${name}\\(([\\s\\S]*?)\\)\\s*returns`).exec(sql);
  if (!match) throw new Error(`${name} not found`);
  return match[1].replace(/\s+/g, ' ').trim();
}

describe('2026-09-22 backend migrations', () => {
  it('keeps the raised Daily floor on the same weekday row counts as getDailyRamp', () => {
    const body = limits.match(/rows_on_board := case extract\(dow from p_date::date\)::int([\s\S]*?)end;/);
    if (!body) throw new Error('daily_time_floor_ms case expression not found');
    const fallback = Number(/else\s+(\d+)/.exec(body[1])?.[1]);
    const rows = new Array<number>(7).fill(fallback);
    for (const [, day, count] of body[1].matchAll(/when (\d) then (\d+)/g)) rows[Number(day)] = Number(count);
    const clientRows = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(2026, 8, 6 + offset); // 2026-09-06 is a Sunday
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return getDailyRamp(dateStr).targetRows;
    });
    expect(rows).toEqual(clientRows);
    expect(limits).toMatch(/return greatest\(5000, 2000 \* rows_on_board\);/);
  });

  it('replaces functions with their existing signatures, never a new overload', () => {
    expect(signature(limits, 'upsert_save_v2')).toBe(signature(read('save_integrity_v2.sql'), 'upsert_save_v2'));
    const rateLimits = read('rate_limits_v1.sql');
    for (const name of ['daily_owner_has_activity', 'daily_time_floor_ms']) {
      expect(signature(limits, name)).toBe(signature(rateLimits, name));
    }
    expect(signature(retention, 'prune_expired_events')).toBe(signature(read('event_retention.sql'), 'prune_expired_events'));
    expect(limits).not.toMatch(/drop function/i);
    expect(retention).not.toMatch(/drop function/i);
  });

  it('drops the events clause from the Daily known-owner check', () => {
    const body = /function public\.daily_owner_has_activity[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(limits)?.[1] ?? '';
    expect(body).toContain('support_install_links');
    expect(body).not.toContain('public.events');
  });

  it('grants anon nothing new and keeps every definer on a pinned search_path', () => {
    for (const sql of [limits, views, retention]) {
      const grants = sql.match(/grant [^;]* to anon;/g) ?? [];
      for (const grant of grants) expect(grant).toContain('upsert_save_v2');
      const definers = sql.match(/security definer\s+set search_path = public, pg_temp/g) ?? [];
      const functions = sql.match(/create or replace function public\.\w+/g) ?? [];
      expect(definers.length).toBe(functions.length);
    }
    for (const view of ['analytics_install_cohorts', 'analytics_retention_cohorts', 'analytics_ftue_funnel',
      'analytics_phase_reached', 'analytics_purchase_funnel']) {
      expect(views).toContain(`revoke all on public.${view} from public, anon, authenticated;`);
      expect(views).toContain(`grant select on public.${view} to service_role;`);
    }
  });

  it('keeps raw events 180 days and the existing cron job untouched', () => {
    expect(retention).toContain("now() - interval '180 days'");
    expect(retention).not.toMatch(/cron\.schedule/);
  });

  it('is wired into the ordered upgrade after the files it replaces', () => {
    const upgrade = read('apply_upgrade.sql');
    const at = (file: string) => upgrade.indexOf(`\\ir ${file}`);
    expect(at('save_and_board_limits_v1.sql')).toBeGreaterThan(at('rate_limits_v1.sql'));
    expect(at('analytics_views_v1.sql')).toBeGreaterThan(at('event_retention.sql'));
    expect(at('event_retention_v2.sql')).toBeGreaterThan(at('analytics_views_v1.sql'));
    expect(at('rate_limits_v1.sql')).toBeGreaterThan(-1);
  });
});
