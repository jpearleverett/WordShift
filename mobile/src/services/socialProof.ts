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
 * function so concurrent players can't clobber the counter. Reads go through
 * the aggregate-only `sbRpc('aggregate_proof', ...)` SECURITY DEFINER function
 * — direct `daily_counters` access is RLS-denied
 * (docs/supabase/security_setup.sql), so a missing/empty RPC degrades to null
 * (no social proof shown) instead of selecting the table.
 */

import { isSupabaseConfigured, sbRpc } from './supabaseClient';
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
 * Read today's aggregate proof numbers via the `aggregate_proof` RPC (tolerant
 * of both camelCase and snake_case row shapes). Returns null when unconfigured
 * or when there's no data yet — no table fallback by design. Never throws.
 */
export async function getAggregateProof(): Promise<AggregateProof | null> {
  if (!isSupabaseConfigured()) return null;
  const date = getLocalDateString();

  const rpc = await sbRpc<
    AggregateProof | DailyCounterRow | DailyCounterRow[] | null
  >('aggregate_proof', { p_date: date });
  return normalizeProof(Array.isArray(rpc) ? rpc[0] : rpc);
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
 * Minimum global "words offered today" count before the social-proof line is
 * shown at all. A small number ("12 words shared today") reads as a dead game
 * rather than a living community, so below this the line is suppressed
 * (returns null) and the victory modal simply omits it.
 */
export const SOCIAL_PROOF_MIN_WORDS = 100;

/**
 * Phase-aware, spoiler-safe "words offered" social-proof line.
 * Copy lives HERE (not phaseNarrative.ts) — it's social-layer text.
 *
 * The line must be self-explanatory: it's a GLOBAL community stat, so early
 * phases lead with "Players everywhere ..." to make the scale unmistakable.
 * Phase 4+ keeps the ritual register the player has by then earned.
 *
 * Returns null when the count is below SOCIAL_PROOF_MIN_WORDS — a weak number
 * is worse than no number.
 */
export function getWordsOfferedText(count: number, phase = 0): string | null {
  const rounded = Math.max(0, Math.round(count));
  if (rounded < SOCIAL_PROOF_MIN_WORDS) return null;
  const n = formatCount(rounded);
  if (phase >= 4) return `${n} words joined the arrangement today`;
  if (phase === 3) return `Seekers everywhere offered ${n} words today`;
  if (phase === 2) return `Players everywhere wove ${n} words today`;
  return `Players everywhere shared ${n} words today`;
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
