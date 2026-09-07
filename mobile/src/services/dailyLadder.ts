/**
 * Persistent Daily Ladder — a LOCAL history of the player's own daily-challenge
 * standings, converting the shown-once anonymous percentile into a returning-
 * player hook. This is NOT a leaderboard and touches NO backend: it simply
 * remembers whatever leaderboard.ts already computed (rank/percentile, or null
 * when the backend is off) alongside the local result (time, stars, difficulty),
 * then derives "best this week / your history" views that work fully offline.
 *
 * Spoiler-safe by construction: it stores only rank/percentile/time/stars/
 * difficulty, never puzzle words, the solution, or an incantation.
 *
 * In-memory cache pattern (load -> cache -> return cached), like masteryRecords /
 * dailyLoginReward. Cloud-synced under `wordshift_daily_ladder`; cleared by
 * Settings -> Reset All. Local-day bucketing via services/dateUtils (never UTC).
 */
import AsyncStorage, { isStorageTransactionActive } from './persistenceStorage';
import { Difficulty } from '../types';
import { daysAgoLocal } from './dateUtils';

const STORAGE_KEY = 'wordshift_daily_ladder';

/** Keep a generous rolling history; oldest days fall off the front. */
const MAX_ENTRIES = 120;
/** "This week" window: today (0) through 6 days ago, inclusive. */
const WEEK_WINDOW_DAYS = 6;

/** One recorded daily result. rank/percentile are null when the backend is off. */
export interface DailyLadderEntry {
  /** Local-day YYYY-MM-DD (the daily's date). Unique per entry. */
  date: string;
  /** 1-based standing (1 = best); null offline / not-yet-aggregated. */
  rank: number | null;
  /** Percent of other players beaten, 0-100; null when rank is null. */
  percentile: number | null;
  /** Solve duration in ms. */
  timeMs: number;
  /** Stars earned (0-3). */
  stars: number;
  /** The day's board difficulty (the daily ramps Mon->Sun). */
  difficulty: Difficulty;
  /** Eased first dailies and practice boards never acquire competitive ranks. */
  rankEligible?: boolean;
  /**
   * Resonant deep-word choices made on that day's board. Optional and absent
   * by default (older entries / boards with none). Spoiler-safe: a count only,
   * never the words themselves.
   */
  resonantChoiceCount?: number;
}

interface DailyLadderState {
  /** Chronological, newest LAST, deduped by date. */
  entries: DailyLadderEntry[];
  /** Date-only archive keeps lifetime participation exact without retaining full results. */
  archivedDates: string[];
  archivedBestRank: number | null;
  archivedBestPercentile: number | null;
}

export interface DailyLadderSummary {
  /** Distinct days recorded (participation count). */
  participationCount: number;
  /** Best (lowest) rank in the last 7 local days; null if none ranked. */
  bestRankThisWeek: number | null;
  /** Best (highest) percentile in the last 7 local days; null if none ranked. */
  bestPercentileThisWeek: number | null;
  /** Best (lowest) rank ever; null if never ranked. */
  bestRankEver: number | null;
  /** Best (highest) percentile ever; null if never ranked. */
  bestPercentileEver: number | null;
  /**
   * Placement direction vs the previous RANKED day (by percentile).
   * null when there are fewer than 2 ranked days to compare.
   */
  trend: 'up' | 'down' | 'flat' | null;
  /** The most recently recorded entry (any rank state), or null. */
  latest: DailyLadderEntry | null;
}

let cache: DailyLadderState | null = null;

/** Drop the in-memory cache after an external storage write (cloud restore). */
export function invalidateDailyLadderCache(): void {
  cache = null;
}


const getDefault = (): DailyLadderState => ({ entries: [], archivedDates: [], archivedBestRank: null, archivedBestPercentile: null });

async function load(): Promise<DailyLadderState> {
  if (cache) return cache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      cache = {
        entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
        archivedDates: Array.isArray(parsed?.archivedDates) ? [...new Set<string>(parsed.archivedDates)] : [],
        archivedBestRank: typeof parsed?.archivedBestRank === 'number' ? parsed.archivedBestRank : null,
        archivedBestPercentile: typeof parsed?.archivedBestPercentile === 'number' ? parsed.archivedBestPercentile : null,
      };
      return cache!;
    }
  } catch (error) {
    if (isStorageTransactionActive()) throw error;
    // fall through to default
  }
  cache = getDefault();
  return cache;
}

async function save(state: DailyLadderState): Promise<void> {
  cache = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    if (isStorageTransactionActive()) throw error;
    // Non-critical — the in-memory cache keeps the session consistent.
  }
}

/** Test/reset helper — drops the in-memory cache. */
export function _clearDailyLadderCache(): void {
  cache = null;
}

/** Clear all ladder history for Settings -> Reset All. */
export async function clearDailyLadder(): Promise<void> {
  cache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-critical; reset should continue even if this key fails.
  }
}

/**
 * Record (upsert) today's daily result. Re-recording the same date overwrites
 * the prior entry (e.g. rank arrives after an offline record) so there is never
 * a duplicate day. Caps history at MAX_ENTRIES newest. Never throws.
 */
export async function recordDailyLadderResult(
  entry: DailyLadderEntry,
): Promise<DailyLadderState> {
  const state = await load();
  // Full results are intentionally retained for 120 days. Do not count an
  // old archived day twice when a delayed retry arrives.
  if (state.archivedDates.includes(entry.date)) return state;
  const entries = state.entries.filter(e => e.date !== entry.date);
  const resonant = entry.resonantChoiceCount;
  entries.push({
    date: entry.date,
    rank: entry.rankEligible === false ? null : entry.rank ?? null,
    percentile: entry.rankEligible === false ? null : entry.percentile ?? null,
    timeMs: Math.max(0, Math.round(entry.timeMs)),
    stars: Math.max(0, Math.round(entry.stars)),
    difficulty: entry.difficulty,
    ...(entry.rankEligible === false ? { rankEligible: false } : {}),
    // Optional field: stored only when a positive count exists (absent stays
    // the default so old entries and zero-resonance days look identical).
    ...(typeof resonant === 'number' && Number.isFinite(resonant) && resonant > 0
      ? { resonantChoiceCount: Math.floor(resonant) }
      : {}),
  });
  // Keep chronological by date so "latest"/trend are well-defined even if an
  // older day is backfilled.
  entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const archivedDates = [...state.archivedDates];
  let archivedBestRank = state.archivedBestRank;
  let archivedBestPercentile = state.archivedBestPercentile;
  while (entries.length > MAX_ENTRIES) {
    const archived = entries.shift()!;
    archivedDates.push(archived.date);
    if (archived.rank != null) archivedBestRank = Math.min(archivedBestRank ?? Infinity, archived.rank);
    if (archived.percentile != null) archivedBestPercentile = Math.max(archivedBestPercentile ?? -Infinity, archived.percentile);
  }
  const next = { entries, archivedDates, archivedBestRank, archivedBestPercentile };
  await save(next);
  return next;
}

/** Refresh a saved standing without replacing its solve data or creating a new result. */
export async function refreshDailyLadderRank(
  date: string,
  rank: { rank: number; percentile: number },
): Promise<boolean> {
  if (!Number.isFinite(rank.rank) || rank.rank < 1 || !Number.isFinite(rank.percentile) ||
      rank.percentile < 0 || rank.percentile > 100) return false;
  const state = await load();
  const existing = state.entries.find(entry => entry.date === date);
  if (!existing || existing.rankEligible === false) return false;
  await recordDailyLadderResult({ ...existing, rank: Math.round(rank.rank), percentile: rank.percentile });
  return true;
}

/**
 * Compute the returning-player views from local history. Pure over the loaded
 * state; date math is local-day via dateUtils.
 */
export async function getDailyLadderSummary(): Promise<DailyLadderSummary> {
  const { entries, archivedDates, archivedBestRank, archivedBestPercentile } = await load();

  const ranked = entries.filter(e => e.rank != null) as (DailyLadderEntry & {
    rank: number;
  })[];
  const withPct = entries.filter(e => e.percentile != null) as (DailyLadderEntry & {
    percentile: number;
  })[];

  const inWeek = (e: DailyLadderEntry) => {
    const d = daysAgoLocal(e.date);
    return d >= 0 && d <= WEEK_WINDOW_DAYS;
  };

  const weekRanked = ranked.filter(inWeek);
  const weekPct = withPct.filter(inWeek);

  const bestRankThisWeek = weekRanked.length
    ? Math.min(...weekRanked.map(e => e.rank))
    : null;
  const bestPercentileThisWeek = weekPct.length
    ? Math.max(...weekPct.map(e => e.percentile))
    : null;
  const allRanks = [...ranked.map(e => e.rank), ...(archivedBestRank == null ? [] : [archivedBestRank])];
  const allPercentiles = [...withPct.map(e => e.percentile), ...(archivedBestPercentile == null ? [] : [archivedBestPercentile])];
  const bestRankEver = allRanks.length ? Math.min(...allRanks) : null;
  const bestPercentileEver = allPercentiles.length ? Math.max(...allPercentiles) : null;

  let trend: DailyLadderSummary['trend'] = null;
  if (withPct.length >= 2) {
    const latestPct = withPct[withPct.length - 1].percentile;
    const prevPct = withPct[withPct.length - 2].percentile;
    trend = latestPct > prevPct ? 'up' : latestPct < prevPct ? 'down' : 'flat';
  }

  return {
    participationCount: archivedDates.length + entries.length,
    bestRankThisWeek,
    bestPercentileThisWeek,
    bestRankEver,
    bestPercentileEver,
    trend,
    latest: entries.length ? entries[entries.length - 1] : null,
  };
}

/**
 * Whether a placement trend should be surfaced. The trend is only coherent
 * beside a placement line (a week-scoped rank/percentile), never beside the
 * offline participation fallback ("N dailies completed") — otherwise a lapsed
 * player whose only ranked days are >1 week old would see "N dailies completed
 * RISING", a placement tag attached to a non-placement line. Mirrors exactly
 * when getDailyLadderLine returns a rank/percentile line rather than the count.
 */
export function shouldShowTrend(summary: DailyLadderSummary): boolean {
  return summary.bestRankThisWeek != null || summary.bestPercentileThisWeek != null;
}

/** Full local history (newest last), for a future history screen. */
export async function getDailyLadderHistory(): Promise<DailyLadderEntry[]> {
  return [...(await load()).entries];
}
