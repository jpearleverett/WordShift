/**
 * Mastery Records — private, local skill telemetry that powers the mastery
 * chase (assessment §2). NONE of this is a leaderboard: the "difficulty" of a
 * WordShift board is time-to-find, so we measure the player's own scanning
 * speed and best speed-run streak privately and surface them in-world.
 *
 * Three records live here:
 *  - solveTimes: a per-difficulty rolling window of solve durations (ms) for
 *    STANDARD, non-daily boards. getSolveTrend() reports whether the player is
 *    genuinely getting faster (robust median comparison, generous thresholds).
 *  - bestSpeedRound: the highest Speed-Shift escalation round ever reached.
 *    The in-run `speedRound` evaporates on every reset; this remembers the peak.
 *  - Unbroken Weave mastery: the private ladder of Weave wins and clear goals.
 *
 * In-memory cache pattern (load → cache → return cached), like the other
 * lightweight services. Cloud-synced under `wordshift_mastery`; cleared by
 * Settings → Reset All.
 */
import AsyncStorage from './persistenceStorage';
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
  /**
   * Lifetime resonant choices: commits where a real choice of valid outcome
   * words existed and the player formed the deepest available dread word.
   * Migration-safe (older saves default to 0).
   */
  resonantChoices: number;
  unbrokenWeaveWins: number;
  unbrokenWeaveFlawlessWins: number;
  unbrokenWeaveDifficultyClears: Difficulty[];
  unbrokenWeaveHardFlawless: boolean;
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

export interface UnbrokenWeaveMastery {
  wins: number;
  flawlessWins: number;
  difficultyClears: Difficulty[];
  hardFlawless: boolean;
  rank: number;
  title: string;
  nextObjective: string | null;
}

let cache: MasteryState | null = null;

/** Drop the in-memory cache after an external storage write (cloud restore). */
export function invalidateMasteryCache(): void {
  cache = null;
}


const DIFFICULTIES: readonly Difficulty[] = ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'];

function normalizeDifficultyClears(value: unknown): Difficulty[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<Difficulty[]>((clears, candidate) => {
    if (
      DIFFICULTIES.includes(candidate as Difficulty)
      && !clears.includes(candidate as Difficulty)
    ) {
      clears.push(candidate as Difficulty);
    }
    return clears;
  }, []);
}

function normalizeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

const getDefault = (): MasteryState => ({
  solveTimes: {},
  bestSpeedRound: 0,
  resonantChoices: 0,
  unbrokenWeaveWins: 0,
  unbrokenWeaveFlawlessWins: 0,
  unbrokenWeaveDifficultyClears: [],
  unbrokenWeaveHardFlawless: false,
});

async function load(): Promise<MasteryState> {
  if (cache) return cache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      cache = {
        solveTimes: parsed.solveTimes ?? {},
        bestSpeedRound: parsed.bestSpeedRound ?? 0,
        resonantChoices: normalizeCount(parsed.resonantChoices),
        unbrokenWeaveWins: normalizeCount(parsed.unbrokenWeaveWins),
        unbrokenWeaveFlawlessWins: normalizeCount(parsed.unbrokenWeaveFlawlessWins),
        unbrokenWeaveDifficultyClears: normalizeDifficultyClears(
          parsed.unbrokenWeaveDifficultyClears,
        ),
        unbrokenWeaveHardFlawless: parsed.unbrokenWeaveHardFlawless === true,
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

/**
 * Accumulate a board's resonant-choice count into the lifetime mastery stat.
 * Non-positive / non-finite counts are ignored. Returns the running total.
 */
export async function recordResonantChoices(count: number): Promise<number> {
  const state = await load();
  const add = normalizeCount(count);
  if (add <= 0) return state.resonantChoices;
  const next = { ...state, resonantChoices: state.resonantChoices + add };
  await save(next);
  return next.resonantChoices;
}

/** Lifetime resonant choices (0 if never recorded). */
export async function getResonantChoices(): Promise<number> {
  return (await load()).resonantChoices;
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

export function resolveUnbrokenWeaveMastery(input: {
  wins: number;
  flawlessWins: number;
  difficultyClears: readonly Difficulty[];
  hardFlawless: boolean;
}): UnbrokenWeaveMastery {
  const wins = normalizeCount(input.wins);
  const flawlessWins = normalizeCount(input.flawlessWins);
  const difficultyClears = normalizeDifficultyClears(input.difficultyClears);
  const hardFlawless = input.hardFlawless === true;

  let rank = 0;
  let title = 'Unbroken Weave';
  let nextObjective: string | null = 'Complete an Unbroken Weave.';

  if (wins >= 1) {
    rank = 1;
    title = 'Thread Joined';
    nextObjective = `Clear Unbroken Weave on every difficulty (${difficultyClears.length}/4).`;
  }
  if (rank === 1 && difficultyClears.length === DIFFICULTIES.length) {
    rank = 2;
    title = 'Fourfold Weave';
    nextObjective = 'Complete a flawless HARD Unbroken Weave.';
  }
  if (rank === 2 && hardFlawless) {
    rank = 3;
    title = 'Seamless Dark';
    nextObjective = `Complete 10 flawless Unbroken Weaves (${Math.min(flawlessWins, 10)}/10).`;
  }
  if (rank === 3 && flawlessWins >= 10) {
    rank = 4;
    title = 'Loomkeeper';
    nextObjective = `Complete 25 flawless Unbroken Weaves (${Math.min(flawlessWins, 25)}/25).`;
  }
  if (rank === 4 && flawlessWins >= 25) {
    rank = 5;
    title = 'Patternbound';
    nextObjective = null;
  }

  return {
    wins,
    flawlessWins,
    difficultyClears,
    hardFlawless,
    rank,
    title,
    nextObjective,
  };
}

function masteryFromState(state: MasteryState): UnbrokenWeaveMastery {
  return resolveUnbrokenWeaveMastery({
    wins: state.unbrokenWeaveWins,
    flawlessWins: state.unbrokenWeaveFlawlessWins,
    difficultyClears: state.unbrokenWeaveDifficultyClears,
    hardFlawless: state.unbrokenWeaveHardFlawless,
  });
}

export async function getUnbrokenWeaveMastery(): Promise<UnbrokenWeaveMastery> {
  return masteryFromState(await load());
}

export async function recordUnbrokenWeaveVictory(
  difficulty: Difficulty,
  flawless: boolean,
): Promise<{ mastery: UnbrokenWeaveMastery; rankedUp: boolean }> {
  const state = await load();
  const previousRank = masteryFromState(state).rank;
  const difficultyClears = state.unbrokenWeaveDifficultyClears.includes(difficulty)
    ? state.unbrokenWeaveDifficultyClears
    : [...state.unbrokenWeaveDifficultyClears, difficulty];
  const nextState: MasteryState = {
    ...state,
    unbrokenWeaveWins: state.unbrokenWeaveWins + 1,
    unbrokenWeaveFlawlessWins: state.unbrokenWeaveFlawlessWins + (flawless ? 1 : 0),
    unbrokenWeaveDifficultyClears: difficultyClears,
    unbrokenWeaveHardFlawless:
      state.unbrokenWeaveHardFlawless || (difficulty === 'HARD' && flawless),
  };
  const mastery = masteryFromState(nextState);
  await save(nextState);
  return { mastery, rankedUp: mastery.rank > previousRank };
}
