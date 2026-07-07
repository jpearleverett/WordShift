/**
 * Mastery Records — private, local skill telemetry that powers the mastery
 * chase (assessment §2). NONE of this is a leaderboard: the "difficulty" of a
 * WordShift board is time-to-find, so we measure the player's own scanning
 * speed and best speed-run streak privately and surface them in-world.
 *
 * Two records live here:
 *  - solveTimes: a per-difficulty rolling window of solve durations (ms) for
 *    STANDARD, non-daily boards. getSolveTrend() reports whether the player is
 *    genuinely getting faster (robust median comparison, generous thresholds).
 *  - bestSpeedRound: the highest Speed-Shift escalation round ever reached.
 *    The in-run `speedRound` evaporates on every reset; this remembers the peak.
 *
 * In-memory cache pattern (load → cache → return cached), like the other
 * lightweight services. Cloud-synced under `wordshift_mastery`; cleared by
 * Settings → Reset All.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty } from '../types';

const STORAGE_KEY = 'wordshift_mastery';

/** Rolling window size per difficulty. Old samples fall off the front. */
const SOLVE_WINDOW = 30;
/** Minimum samples before a trend can be reported at all. */
const MIN_TREND_SAMPLES = 10;
/**
 * How much faster the recent median must be than the older median to read as a
 * real improvement (0.85 = at least 15% quicker). Generous so noise/phone-call
 * pauses don't flip it, and so it only fires when the gain is felt.
 */
const IMPROVEMENT_RATIO = 0.85;
/** Clamp implausible durations (backgrounded phone, AFK) so they can't skew the window. */
const MAX_PLAUSIBLE_SOLVE_MS = 10 * 60 * 1000; // 10 min
const MIN_PLAUSIBLE_SOLVE_MS = 800; // sub-second "solves" are restores/glitches

interface MasteryState {
  solveTimes: Partial<Record<Difficulty, number[]>>;
  bestSpeedRound: number;
}

export interface SolveTrend {
  /** Total samples in this difficulty's window. */
  samples: number;
  /** Median of the recent third (ms). */
  recentMedianMs: number;
  /** Median of the older two-thirds (ms). */
  olderMedianMs: number;
  /** True when the recent median is meaningfully faster than the older one. */
  improving: boolean;
}

let cache: MasteryState | null = null;

const getDefault = (): MasteryState => ({ solveTimes: {}, bestSpeedRound: 0 });

async function load(): Promise<MasteryState> {
  if (cache) return cache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      cache = {
        solveTimes: parsed.solveTimes ?? {},
        bestSpeedRound: parsed.bestSpeedRound ?? 0,
      };
      return cache!;
    }
  } catch {
    // fall through to default
  }
  cache = getDefault();
  return cache;
}

async function save(state: MasteryState): Promise<void> {
  cache = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Non-critical — the in-memory cache keeps the session consistent.
  }
}

function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Test/reset helper — drops the in-memory cache. */
export function _clearMasteryCache(): void {
  cache = null;
}

/** Clear all mastery records for Settings → Reset All. */
export async function clearMasteryRecords(): Promise<void> {
  cache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-critical; reset should continue even if this key fails.
  }
}

/**
 * Record a standard-board solve duration for its difficulty. Implausible values
 * (AFK, restore glitches) are dropped so the trend stays honest. The window is
 * capped at SOLVE_WINDOW newest samples.
 */
export async function recordSolveTime(difficulty: Difficulty, ms: number): Promise<void> {
  if (!Number.isFinite(ms) || ms < MIN_PLAUSIBLE_SOLVE_MS || ms > MAX_PLAUSIBLE_SOLVE_MS) {
    return;
  }
  const state = await load();
  const window = state.solveTimes[difficulty] ? [...state.solveTimes[difficulty]!] : [];
  window.push(Math.round(ms));
  while (window.length > SOLVE_WINDOW) window.shift();
  await save({ ...state, solveTimes: { ...state.solveTimes, [difficulty]: window } });
}

/**
 * Whether the player is scanning faster than they used to at this difficulty.
 * Compares the median of the recent third against the older two-thirds; needs
 * MIN_TREND_SAMPLES before it will report anything. Returns null when there
 * isn't enough data yet.
 */
export async function getSolveTrend(difficulty: Difficulty): Promise<SolveTrend | null> {
  const state = await load();
  const window = state.solveTimes[difficulty];
  if (!window || window.length < MIN_TREND_SAMPLES) return null;

  const splitAt = Math.floor((window.length * 2) / 3);
  const older = window.slice(0, splitAt);
  const recent = window.slice(splitAt);
  if (recent.length < 2 || older.length < 2) return null;

  const olderMedianMs = median([...older].sort((a, b) => a - b));
  const recentMedianMs = median([...recent].sort((a, b) => a - b));
  const improving = recentMedianMs <= olderMedianMs * IMPROVEMENT_RATIO;

  return { samples: window.length, recentMedianMs, olderMedianMs, improving };
}

export interface SpeedRoundResult {
  best: number;
  isNewRecord: boolean;
}

/**
 * Record a completed Speed-Shift escalation round. Keeps only the peak ever
 * reached (the in-run counter resets constantly). Returns the running best and
 * whether this call set a new record.
 */
export async function recordSpeedRound(round: number): Promise<SpeedRoundResult> {
  const state = await load();
  if (round > state.bestSpeedRound) {
    await save({ ...state, bestSpeedRound: round });
    return { best: round, isNewRecord: true };
  }
  return { best: state.bestSpeedRound, isNewRecord: false };
}

/** The highest Speed-Shift round ever reached (0 if never played). */
export async function getBestSpeedRound(): Promise<number> {
  return (await load()).bestSpeedRound;
}
