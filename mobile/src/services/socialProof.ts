/**
 * Aggregate social proof (light social layer).
 *
 * No feeds, no identities surfaced — just two anonymous global daily numbers:
 *   - total words "offered" by all players today
 *   - rough count of active seekers today
 *
 * Backend-optional: every function is a no-op returning null/void when Supabase
 * is unconfigured (see supabaseClient.ts). Never throws.
 *
 * Atomic increments go through an `sbRpc('bump_words_offered', ...)` Postgres
 * function so concurrent players can't clobber the counter. Reads prefer a small
 * `sbRpc('aggregate_proof', ...)` but fall back to a plain select of the
 * counters row for the day.
 */

import { isSupabaseConfigured, sbSelect, sbRpc } from './supabaseClient';
import { getLocalDateString } from './dateUtils';

export interface AggregateProof {
  /** Total words offered by all players today. */
  wordsOfferedToday: number;
  /** Approximate number of distinct active players today. */
  activeSeekers: number;
}

/** Shape of the `daily_counters` row (one per local day). */
interface DailyCounterRow {
  date: string;
  words_offered: number;
  active_seekers: number;
}

/**
 * Atomically add `wordCount` to today's global "words offered" counter.
 * No-op when unconfigured. Never throws. Returns the new total when the RPC
 * reports it, else null.
 */
export async function recordPuzzleContribution(
  wordCount: number,
): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;
  const count = Math.max(0, Math.round(wordCount));
  if (count <= 0) return null;

  const result = await sbRpc<number | { words_offered: number } | null>(
    'bump_words_offered',
    { p_date: getLocalDateString(), p_count: count },
  );
  if (result == null) return null;
  if (typeof result === 'number') return result;
  if (typeof result.words_offered === 'number') return result.words_offered;
  return null;
}

/**
 * Read today's aggregate proof numbers. Prefers an `aggregate_proof` RPC, falls
 * back to selecting the day's `daily_counters` row. Returns null when
 * unconfigured or when there's no data yet. Never throws.
 */
export async function getAggregateProof(): Promise<AggregateProof | null> {
  if (!isSupabaseConfigured()) return null;
  const date = getLocalDateString();

  // --- Preferred: RPC ----------------------------------------------------
  const rpc = await sbRpc<
    AggregateProof | DailyCounterRow | DailyCounterRow[] | null
  >('aggregate_proof', { p_date: date });
  const normalized = normalizeProof(Array.isArray(rpc) ? rpc[0] : rpc);
  if (normalized) return normalized;

  // --- Fallback: select the counters row --------------------------------
  const rows = await sbSelect<DailyCounterRow>(
    'daily_counters',
    `select=date,words_offered,active_seekers&date=eq.${encodeURIComponent(date)}`,
  );
  if (!rows || rows.length === 0) return null;
  return normalizeProof(rows[0]);
}

function normalizeProof(
  row:
    | AggregateProof
    | DailyCounterRow
    | null
    | undefined,
): AggregateProof | null {
  if (!row) return null;
  const wordsOfferedToday =
    'wordsOfferedToday' in row
      ? row.wordsOfferedToday
      : (row as DailyCounterRow).words_offered;
  const activeSeekers =
    'activeSeekers' in row
      ? row.activeSeekers
      : (row as DailyCounterRow).active_seekers;
  if (typeof wordsOfferedToday !== 'number') return null;
  return {
    wordsOfferedToday: Math.max(0, Math.round(wordsOfferedToday)),
    activeSeekers: Math.max(0, Math.round(activeSeekers ?? 0)),
  };
}

/** Group digits with commas (locale-independent so tests are deterministic). */
function formatCount(count: number): string {
  return Math.max(0, Math.round(count)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Phase-aware, spoiler-safe "words offered" social-proof line.
 * Copy lives HERE (not phaseNarrative.ts) — it's social-layer text.
 *
 * Phase 0-1: plain & friendly. Phase 2-3: subtly weightier ("woven", "offered").
 * Phase 4+: the ritual framing the player has by then earned.
 */
export function getWordsOfferedText(count: number, phase = 0): string {
  const n = formatCount(count);
  if (phase >= 4) return `${n} words offered to the arrangement today`;
  if (phase === 3) return `${n} words offered by seekers today`;
  if (phase === 2) return `${n} words woven by players today`;
  return `${n} words shared by players today`;
}

/**
 * Phase-aware, spoiler-safe "active players" line.
 */
export function getActiveSeekersText(count: number, phase = 0): string {
  const n = formatCount(count);
  if (phase >= 4) return `${n} gathered at the pattern today`;
  if (phase >= 2) return `${n} seekers playing today`;
  return `${n} players playing today`;
}
