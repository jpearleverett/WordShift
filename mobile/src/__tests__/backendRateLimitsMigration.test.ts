/**
 * docs/supabase/rate_limits_v1.sql carries server-side rules that mirror client
 * behaviour: the Daily plausibility floor is derived from getDailyRamp's row
 * counts, the per-call ingest bound equals the client's retained queue, and the
 * social-proof per-call cap must clear the largest shipped board. If any of
 * those client facts move, the SQL must move with them (and be re-applied), so
 * this test reads the migration text and pins the pairing. The behaviour of the
 * SQL itself is rehearsed offline by docs/supabase/rehearse.mjs (PGlite).
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
const migration = read('rate_limits_v1.sql');

/** The SQL `case extract(dow ...)` mapping (0=Sun..6=Sat) as weekday -> rows. */
function sqlRowsByWeekday(): number[] {
  const body = migration.match(/rows_on_board := case extract\(dow from p_date::date\)::int([\s\S]*?)end;/);
  if (!body) throw new Error('daily_time_floor_ms case expression not found');
  const rows = new Array<number>(7);
  const fallback = Number(/else\s+(\d+)/.exec(body[1])?.[1]);
  for (let day = 0; day < 7; day++) rows[day] = fallback;
  for (const [, day, count] of body[1].matchAll(/when (\d) then (\d+)/g)) rows[Number(day)] = Number(count);
  return rows;
}

describe('rate_limits_v1.sql stays paired with the client', () => {
  it('derives the Daily time floor from the same weekday row counts as getDailyRamp', () => {
    // 2026-09-06 is a Sunday; walk one full week of local dates.
    const clientRows = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(2026, 8, 6 + offset);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      expect(date.getDay()).toBe(offset);
      return getDailyRamp(dateStr).targetRows;
    });
    expect(sqlRowsByWeekday()).toEqual(clientRows);
    expect(migration).toMatch(/return greatest\(3000, 1500 \* rows_on_board\);/);
  });

  it('keeps the per-call bounds at or above what the shipped client sends', () => {
    // eventLogger retains at most 500 events and uploads the whole queue.
    const eventLogger = readFileSync(resolve(__dirname, '../services/eventLogger.ts'), 'utf8');
    const maxEvents = Number(/const MAX_EVENTS = (\d+);/.exec(eventLogger)?.[1]);
    const ingestCap = Number(/jsonb_array_length\(p_events\)>(\d+)/.exec(migration)?.[1]);
    expect(ingestCap).toBe(maxEvents);
    // socialProof sends the board's row count; the tallest shipped board is the
    // seven-row EXPERT double shift, and the +1 extension never exceeds six.
    const bumpCap = Number(/p_count > (\d+) then return null/.exec(migration)?.[1]);
    expect(bumpCap).toBeGreaterThanOrEqual(7);
  });

  it('is wired into the ordered upgrade and keeps its definer hygiene', () => {
    const upgrade = read('apply_upgrade.sql');
    expect(upgrade.indexOf('\\ir rate_limits_v1.sql')).toBeGreaterThan(upgrade.indexOf('\\ir event_retention.sql'));
    const setup = readFileSync(resolve(SUPABASE_DIR, '../BACKEND_SETUP.md'), 'utf8');
    expect(setup).toMatch(/8\. \[`rate_limits_v1\.sql`\]/);
    const definers = migration.match(/security definer set search_path = public, pg_temp/g) ?? [];
    const functions = migration.match(/create or replace function public\.\w+/g) ?? [];
    expect(definers.length).toBe(functions.length);
    for (const name of ['submit_daily_score(text,text,integer,integer,integer,text)', 'daily_rank(text,text)']) {
      expect(migration).toContain(`revoke all on function public.${name} from public, anon, authenticated;`);
      expect(migration).not.toContain(`grant execute on function public.${name} to anon`);
    }
    expect(migration).toContain('grant execute on function public.purge_daily_cohort(text,text) to service_role;');
    expect(migration).not.toContain('grant execute on function public.purge_daily_cohort(text,text) to anon');
  });
});
