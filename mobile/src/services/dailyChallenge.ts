import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty, PuzzleSolutionStep } from '../types';
import { DAILY_CHALLENGE_UNLOCK_PUZZLES, FIRST_DAILY_BONUS_HINTS } from '../constants/gameBalance';
import { selectDailyBankPuzzle } from './puzzleBank';
import { getLocalDateString, getLocalDateStringDaysAgo, daysAgoLocal, parseLocalDate } from './dateUtils';
import { addHints } from './hints';

const STORAGE_KEY = 'wordshift_daily_challenge';

/**
 * Daily Challenge system
 *
 * Each day has a unique puzzle seeded by the date.
 * All players get the same daily challenge.
 * Players can only complete the daily challenge once per day.
 */

export interface DailyChallengeResult {
  date: string; // YYYY-MM-DD
  stars: number;
  hintsUsed: number;
  invalidAttempts: number;
  completedAt: number;
}

export interface DailyChallengeProgress {
  completedChallenges: DailyChallengeResult[];
  totalCompleted: number;
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  /** Banked daily-streak freezes (auto-applied to forgive a missed day). */
  streakFreezes: number;
  /** Local-day the last free freeze was granted (null = never). */
  lastFreezeGrantDate: string | null;
  /**
   * Transient (not persisted): true on the completion that just consumed a
   * freeze to protect the streak, so the UI can tell the player their daily
   * streak was saved.
   */
  streakSavedByFreeze?: boolean;
  /**
   * Transient (not persisted meaningfully): the milestone-day the streak
   * decayed back to on this completion, when a lapse fell back to a checkpoint
   * instead of resetting to 1 (see the decay-to-milestone logic). Undefined on
   * a normal continuation. Flows out of recordDailyCompletion's return value;
   * App surfaces it as the "your streak held at N" beat via
   * phaseNarrative.getStreakHeldMessage (wave-2 wiring).
   */
  streakDecayedTo?: number;
  /** True once the one-time first-daily hint mercy has been granted. */
  firstDailyMercyGranted: boolean;
}

// In-memory cache
let progressCache: DailyChallengeProgress | null = null;

/**
 * Drop the in-memory cache after an external storage write (cloud restore) so
 * the next read reflects the restored save instead of writing stale state back.
 */
export function invalidateDailyProgressCache(): void {
  progressCache = null;
  // The RESOLVED board goes too. It embeds the `eased` decision, which is made
  // from totalCompleted at generation time — so a device that had already
  // pre-warmed today's board as a first-ever daily kept serving the gentle
  // beginner shape to the veteran save that had just been restored over it,
  // and App skips the leaderboard submission for any eased board, so that
  // day's result was silently withheld from the standing.
  //
  // Only the resolved value. `dailyGenerationInProgress` is deliberately left
  // alone: it is a single-flight guard, and tearing it down mid-flight lets a
  // second generation start against the first's state. The epoch below is what
  // stops an in-flight result from landing in the cache after this point.
  dailyPuzzleCache = null;
  dailyCacheEpoch++;
}

function getDefaultProgress(): DailyChallengeProgress {
  return {
    completedChallenges: [],
    totalCompleted: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
    streakFreezes: 0,
    lastFreezeGrantDate: null,
    firstDailyMercyGranted: false,
  };
}

/**
 * Get today's date as a LOCAL-day YYYY-MM-DD string.
 * Local (not UTC) so daily streaks bucket by the player's calendar day.
 */
export function getTodayString(): string {
  return getLocalDateString();
}

/**
 * Get yesterday's local-day date as YYYY-MM-DD string
 */
function getYesterdayString(): string {
  return getLocalDateStringDaysAgo(1);
}

/**
 * Grace period for daily challenge streaks (in days).
 * Yesterday-only free continuation: the streak continues for free only if the
 * player completed yesterday's challenge. A larger gap doesn't immediately
 * break the chain — it consumes a banked daily-streak freeze if one is
 * available (see recordDailyCompletion), mirroring the main game's freeze
 * safety net so a single missed day no longer nukes a long daily streak.
 */
const DAILY_STREAK_GRACE_DAYS = 1;

/**
 * How often a free daily-streak freeze is granted (in days), and the max that
 * can be banked at once. A committed daily player accrues one freeze every two
 * weeks (capped at one), so the occasional missed day is forgiven without
 * making the streak trivially unbreakable.
 */
const DAILY_FREE_FREEZE_INTERVAL_DAYS = 14;
const DAILY_MAX_FREEZES = 1;

// Unlock pacing lives in gameBalance.ts (single source of truth); re-exported
// here so existing consumers of the service keep working.
export { DAILY_CHALLENGE_UNLOCK_PUZZLES };

/**
 * Daily challenge unlock condition.
 * We gate by puzzle count and allow phase progression to unlock it naturally.
 */
export function isDailyChallengeUnlocked(
  puzzlesSolved: number,
  currentPhase: number
): boolean {
  return puzzlesSolved >= DAILY_CHALLENGE_UNLOCK_PUZZLES || currentPhase >= 1;
}

/**
 * Progress info for UI (e.g., hidden lock hints before unlock).
 */
export function getDailyChallengeUnlockProgress(
  puzzlesSolved: number,
  currentPhase: number
): { unlocked: boolean; puzzlesRemaining: number } {
  const unlocked = isDailyChallengeUnlocked(puzzlesSolved, currentPhase);
  if (unlocked) {
    return { unlocked: true, puzzlesRemaining: 0 };
  }
  return {
    unlocked: false,
    puzzlesRemaining: Math.max(0, DAILY_CHALLENGE_UNLOCK_PUZZLES - puzzlesSolved),
  };
}

/**
 * Check if a date string is within the daily streak grace period
 * Returns true if the date is 1 to DAILY_STREAK_GRACE_DAYS days ago
 */
function isWithinDailyGracePeriod(dateString: string): boolean {
  const diffDays = daysAgoLocal(dateString);
  return diffDays >= 1 && diffDays <= DAILY_STREAK_GRACE_DAYS;
}

/**
 * Seeded random number generator (deterministic based on date string)
 * Uses a simple hash to generate a seed from the date string
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }

  // LCG parameters
  let state = Math.abs(hash) || 1;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Daily difficulty ramps across the week (the Wordle/NYT-crossword pattern):
 * gentle Monday, brutal Sunday. The old always-6-letter/5-row HARD daily was
 * strictly harder than anything selectable in normal play and read as a wall
 * to the casual majority every day — the exact inverse of a habit anchor.
 * The ramp is DETERMINISTIC by date (day-of-week), so every player still gets
 * the same puzzle on a given day and the leaderboard stays fair. Rewards still
 * always count as HARD (recordVictory isDaily=true) so the anchor stays
 * generous regardless of the day's board size.
 */
export function getDailyDifficulty(dateStr?: string, isFirstDaily = false): Difficulty {
  return getDailyRamp(dateStr, isFirstDaily).difficulty;
}

/**
 * Board shape for a given day: difficulty + word length + row count.
 *
 * When `isFirstDaily` is true (the player has never completed a daily), the
 * board is eased to the gentle MEDIUM 4-letter/4-row shape regardless of
 * weekday — a newcomer fresh off the 4-letter EASY tutorial should not be
 * dropped onto a HARD 6-letter/5-row wall for their first competitive
 * impression. Rewards still count as HARD (recordVictory isDaily=true), so the
 * anchor stays generous. Because the eased board differs from the shared board
 * everyone else gets that day, the caller MUST NOT submit its result to the
 * shared leaderboard (see isFirstDailyEasing / DailyPuzzleData.eased). Everyone
 * else stays on the DETERMINISTIC weekday ramp, so the leaderboard stays fair.
 */
export function getDailyRamp(dateStr?: string, isFirstDaily = false): {
  difficulty: Difficulty;
  wordLength: number;
  targetRows: number;
} {
  if (isFirstDaily) {
    return { difficulty: 'MEDIUM', wordLength: 4, targetRows: 4 };
  }
  // Casual-fit weekend: the old Thu-Sun block was ALL HARD (with a 6-letter
  // Sat AND Sun), which turned every casual player's weekend into a wall. The
  // softened ramp keeps two HARD anchors (Thu, Sat) plus the Sunday peak, but
  // Friday drops back to MEDIUM_PLUS as a breather and only Sunday carries the
  // 6-letter/5-row board. Still deterministic by date; rewards always pay HARD.
  const day = parseLocalDate(dateStr ?? getTodayString()).getDay(); // 0=Sun..6=Sat
  switch (day) {
    case 1: return { difficulty: 'MEDIUM', wordLength: 4, targetRows: 4 };      // Mon — accessible
    case 2: return { difficulty: 'MEDIUM_PLUS', wordLength: 5, targetRows: 4 }; // Tue
    case 3: return { difficulty: 'MEDIUM_PLUS', wordLength: 5, targetRows: 5 }; // Wed
    case 4: return { difficulty: 'HARD', wordLength: 5, targetRows: 5 };        // Thu — first anchor
    case 5: return { difficulty: 'MEDIUM_PLUS', wordLength: 5, targetRows: 4 }; // Fri — breather
    case 6: return { difficulty: 'HARD', wordLength: 5, targetRows: 5 };        // Sat — second anchor
    default: return { difficulty: 'HARD', wordLength: 6, targetRows: 5 };       // Sun — the peak
  }
}

/**
 * Whether the given progress record is the player's FIRST-EVER daily (none
 * completed yet). The first daily is eased to the gentle MEDIUM 4/4 board (see
 * getDailyRamp `isFirstDaily`). The eased board differs from the shared
 * deterministic board everyone else gets that day, so a caller starting the
 * eased board MUST NOT submit its result to the shared leaderboard (it would be
 * an unfair, non-comparable entry). App reads this at daily-start time to skip
 * the leaderboard submission; generateDailyPuzzle also flags the board via
 * DailyPuzzleData.eased.
 */
export function isFirstDailyEasing(progress: DailyChallengeProgress): boolean {
  return progress.totalCompleted === 0;
}

// Deterministic daily host order — the animal "preparing today's offering".
// Same for every player on a given date (seeded by the date string). App only
// surfaces the host line if the player has actually met the animal, else Fox.
const DAILY_HOST_ORDER = [
  'fox', 'pangolin', 'owl', 'axolotl', 'capybara',
  'fennec_fox', 'sloth', 'wombat', 'rabbit', 'red_panda',
  'tarsier', 'aye_aye', 'kakapo',
] as const;

// Canonical animal display names (kept local so dailyChallenge doesn't depend on
// homeWorldData). Must stay in sync with the ANIMALS name fields.
const DAILY_HOST_NAMES: Record<string, string> = {
  fox: 'Ember', pangolin: 'Panko', owl: 'Archimedes', axolotl: 'Axel',
  capybara: 'Chill', fennec_fox: 'Fennick', sloth: 'Sloane', wombat: 'Warren',
  rabbit: 'Thyme', red_panda: 'Bamboo', tarsier: 'Vesper', aye_aye: 'Tock',
  kakapo: 'Moss',
};

/**
 * The animal type hosting today's daily challenge (deterministic by date). Gives
 * the daily a narrative host instead of being the one ritual with no animal
 * attached (assessment §7).
 */
export function getDailyHost(dateStr?: string): (typeof DAILY_HOST_ORDER)[number] {
  const rng = seededRandom(`wordshift-daily-host-${dateStr ?? getTodayString()}`);
  return DAILY_HOST_ORDER[Math.floor(rng() * DAILY_HOST_ORDER.length)];
}

/**
 * The display NAME of today's daily host, chosen deterministically from the
 * animals the player has actually MET (`unlockedTypes`) — the narrative rule is
 * that no animal is named before the player meets them. Falls back to Fox
 * (Ember), who is always known after onboarding.
 */
export function getDailyHostName(unlockedTypes: string[], dateStr?: string): string {
  const known = DAILY_HOST_ORDER.filter(t => unlockedTypes.includes(t));
  const pool = known.length > 0 ? known : (['fox'] as const);
  const rng = seededRandom(`wordshift-daily-host-${dateStr ?? getTodayString()}`);
  const host = pool[Math.floor(rng() * pool.length)];
  return DAILY_HOST_NAMES[host] ?? 'Ember';
}

/**
 * Load daily challenge progress
 */
export async function loadDailyProgress(): Promise<DailyChallengeProgress> {
  if (progressCache) return progressCache;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      // Merge over defaults so saves written before the freeze fields existed
      // load with sane values instead of `undefined`.
      progressCache = { ...getDefaultProgress(), ...JSON.parse(stored) };
      return progressCache!;
    }
  } catch (err) {
    console.warn('Failed to load daily challenge progress:', err);
  }

  progressCache = getDefaultProgress();
  return progressCache;
}

/**
 * Check if today's daily challenge has been completed
 */
export async function isDailyCompleted(): Promise<boolean> {
  const progress = await loadDailyProgress();
  return progress.lastCompletedDate === getTodayString();
}

export interface DailyPuzzleData {
  words: string[];
  hint?: string;
  /**
   * The generator's solution steps, threaded through so daily hints use the
   * stored solution (via startDailyGame's optional solution param) instead of
   * the blind live search. Deterministic like the rest of the daily.
   */
  solution?: PuzzleSolutionStep[];
  difficulty: Difficulty;
  date: string;
  wordLength: number;
  /**
   * True when this board was eased to the gentle MEDIUM 4/4 shape because it is
   * the player's FIRST-EVER daily (see getDailyRamp / isFirstDailyEasing). The
   * eased board differs from the shared deterministic board everyone else gets
   * that day, so the caller MUST NOT submit its result to the shared
   * leaderboard. Rewards are unaffected (recordVictory isDaily=true still pays
   * HARD).
   */
  eased?: boolean;
}

// Guard against concurrent daily puzzle resolution
let dailyGenerationInProgress: Promise<DailyPuzzleData> | null = null;

// Resolved-puzzle cache, keyed by local day.
let dailyPuzzleCache: DailyPuzzleData | null = null;
// Bumped by invalidateDailyProgressCache: a resolution that started before an
// invalidation must not write its (now stale-shaped) result into the cache.
let dailyCacheEpoch = 0;

/**
 * The bank whose boards match a given day's SHAPE. The ramp asks for a
 * word length and a row count; the shipped standard banks are exactly those
 * shapes, so the map is a shape lookup, not a difficulty one — Wednesday's
 * "MEDIUM_PLUS, 5 letters, 5 rows" is served from the 5-letter/5-row HARD
 * bank because that is the board the ramp describes. The ramp's own
 * `difficulty` label rides on unchanged for copy and telemetry (the daily
 * always pays HARD regardless).
 */
function bankForDailyShape(wordLength: number, targetRows: number): Difficulty {
  if (wordLength >= 6) return 'EXPERT';        // 6-letter / 5-row (Sunday peak)
  if (wordLength <= 4) return 'MEDIUM';        // 4-letter / 4-row (Monday, and the eased first daily)
  return targetRows >= 5 ? 'HARD' : 'MEDIUM_PLUS'; // 5-letter: 5 rows vs 4
}

/**
 * Resolve the day's Daily Challenge board.
 *
 * Deterministic by DATE and nothing else: a date-seeded PRNG picks an index
 * out of the shipped standard bank matching the day's shape
 * (selectDailyBankPuzzle). It used to generate on device under a global
 * Math.random override held across an await-heavy, wall-clock-bounded search
 * that also read the player's own word history and dread phase — which meant
 * the "shared" board was in truth a different board per device, while the
 * share grid, the streak copy and the leaderboard all asserted otherwise. The
 * bank was already sitting there, identical on every install; picking from it
 * is the whole fix, and it costs no wait at all.
 *
 * Guarded against concurrent calls — subsequent callers await the first
 * resolution. Memoized per local day; a same-day repeat call returns the
 * cached result.
 */
export async function generateDailyPuzzle(): Promise<DailyPuzzleData> {
  const today = getTodayString();

  // Return today's already-resolved puzzle instantly.
  if (dailyPuzzleCache && dailyPuzzleCache.date === today) {
    return dailyPuzzleCache;
  }

  // If resolution is already in progress, await the existing result
  if (dailyGenerationInProgress) {
    return dailyGenerationInProgress;
  }

  const epochAtStart = dailyCacheEpoch;
  const generationPromise = (async () => {
    // A player's very first daily is eased to the gentle MEDIUM 4/4 board (see
    // getDailyRamp). The seed is unchanged, so the eased board is still
    // deterministic for this player; it simply differs from the shared weekday
    // board, so its result is not leaderboard-eligible (DailyPuzzleData.eased).
    const progress = await loadDailyProgress();
    const eased = isFirstDailyEasing(progress);
    const ramp = getDailyRamp(today, eased);
    const difficulty = ramp.difficulty;
    // One draw off the date-seeded stream. Math.random is never touched.
    const rng = seededRandom(`wordshift-daily-${today}`);
    const roll = rng();

    try {
      const board =
        selectDailyBankPuzzle(bankForDailyShape(ramp.wordLength, ramp.targetRows), roll) ??
        // Shipped banks are never empty, so this is belt and braces only: fall
        // back to the gentlest shape rather than leaving the player with no
        // daily at all.
        selectDailyBankPuzzle('MEDIUM', roll);
      if (!board) {
        throw new Error('No daily board available');
      }
      const result: DailyPuzzleData = {
        words: board.words,
        hint: board.hint,
        solution: board.solution,
        difficulty,
        date: today,
        wordLength: board.wordLength ?? ramp.wordLength,
        eased,
      };
      // A restore may have landed while this was resolving; that bumps the
      // epoch, and the shape decision above is made from the pre-restore
      // progress. Hand this caller its board, but do not let it become the
      // day's cached answer.
      if (epochAtStart === dailyCacheEpoch) {
        dailyPuzzleCache = result;
      }
      return result;
    } finally {
      dailyGenerationInProgress = null;
    }
  })();

  dailyGenerationInProgress = generationPromise;
  return generationPromise;
}

/**
 * Resolve today's daily board in the background so it's ready instantly when
 * the player taps the Daily Challenge card. Safe to call repeatedly (no-op
 * once cached for the day) and fire-and-forget (errors are swallowed — the
 * on-tap path will retry and surface any real failure).
 */
export function prewarmDailyPuzzle(): void {
  const today = getTodayString();
  if (dailyPuzzleCache && dailyPuzzleCache.date === today) return;
  if (dailyGenerationInProgress) return;
  generateDailyPuzzle().catch(() => {
    // Best-effort warm-up; the real generation happens again on tap if needed.
  });
}

/**
 * One-time first-daily mercy: the daily is always HARD, so the player's very
 * first attempt gets a small bonus-hint cushion (FIRST_DAILY_BONUS_HINTS).
 * Grants exactly once ever (flag persisted with the daily progress record) and
 * returns the number of hints granted, or null if already granted. Hints are
 * convenience only — they still cost stars, and the puzzle itself is untouched
 * (deterministic and identical for all players on a date).
 */
export async function grantFirstDailyMercy(): Promise<number | null> {
  const progress = await loadDailyProgress();
  if (progress.firstDailyMercyGranted) return null;

  // Flip the flag on the shared cache before any await so a rapid double-call
  // can't double-grant.
  progress.firstDailyMercyGranted = true;
  progressCache = progress;

  await addHints(FIRST_DAILY_BONUS_HINTS, 'first_daily_mercy');

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.warn('Failed to save daily challenge progress:', err);
  }

  return FIRST_DAILY_BONUS_HINTS;
}

/**
 * Record completion of today's daily challenge
 */
export async function recordDailyCompletion(
  stars: number,
  hintsUsed: number,
  invalidAttempts: number
): Promise<DailyChallengeProgress> {
  const progress = await loadDailyProgress();
  const today = getTodayString();

  // Don't record if already completed today
  if (progress.lastCompletedDate === today) {
    return progress;
  }

  // Grant a free freeze on a periodic cadence (capped) so a committed daily
  // player banks protection against the occasional missed day.
  const freezeAgeDays = progress.lastFreezeGrantDate
    ? daysAgoLocal(progress.lastFreezeGrantDate)
    : Infinity;
  if (progress.streakFreezes < DAILY_MAX_FREEZES && freezeAgeDays >= DAILY_FREE_FREEZE_INTERVAL_DAYS) {
    progress.streakFreezes = DAILY_MAX_FREEZES;
    progress.lastFreezeGrantDate = today;
  }

  // Calculate streak. Yesterday → free continuation. A larger gap consumes a
  // banked freeze (if any) to keep the chain alive; otherwise the streak resets.
  progress.streakSavedByFreeze = false;
  if (progress.lastCompletedDate && isWithinDailyGracePeriod(progress.lastCompletedDate)) {
    progress.currentStreak += 1;
  } else if (
    progress.lastCompletedDate &&
    progress.currentStreak > 1 &&
    progress.streakFreezes > 0
  ) {
    progress.streakFreezes -= 1;
    progress.currentStreak += 1;
    progress.streakSavedByFreeze = true;
  } else if (progress.lastCompletedDate !== today) {
    // Decay-to-milestone instead of reset-to-zero (softened loss aversion —
    // the 5.6M-dead-Wordle-streaks lesson). A lapsed streak falls back to the
    // last milestone CHECKPOINT it had passed rather than to 1, so weeks of
    // habit aren't wiped by one missed day; the setback is losing the climb
    // toward the next milestone. Below the first milestone (3 days) there is
    // nothing to protect, so it still resets to 1.
    const priorStreak = progress.currentStreak;
    const checkpoint = DAILY_STREAK_MILESTONES
      .map(m => m.days)
      .filter(d => d < priorStreak)
      .pop() ?? 0;
    progress.currentStreak = Math.max(1, checkpoint);
    progress.streakDecayedTo = checkpoint > 0 ? checkpoint : undefined;
  } else {
    progress.streakDecayedTo = undefined;
  }
  if (progress.lastCompletedDate && (isWithinDailyGracePeriod(progress.lastCompletedDate) || progress.streakSavedByFreeze)) {
    progress.streakDecayedTo = undefined;
  }

  progress.bestStreak = Math.max(progress.bestStreak, progress.currentStreak);

  // Record result
  const result: DailyChallengeResult = {
    date: today,
    stars,
    hintsUsed,
    invalidAttempts,
    completedAt: Date.now(),
  };

  progress.completedChallenges.push(result);
  // Keep last 90 days of history
  if (progress.completedChallenges.length > 90) {
    progress.completedChallenges = progress.completedChallenges.slice(-90);
  }

  progress.totalCompleted += 1;
  progress.lastCompletedDate = today;

  progressCache = progress;

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.warn('Failed to save daily challenge progress:', err);
  }

  return progress;
}

/**
 * Get today's daily challenge status
 */
export async function getDailyStatus(): Promise<{
  isCompleted: boolean;
  difficulty: Difficulty;
  todayResult: DailyChallengeResult | null;
  streak: number;
  bestStreak: number;
  totalCompleted: number;
  streakFreezes: number;
}> {
  const progress = await loadDailyProgress();
  const today = getTodayString();
  const isCompleted = progress.lastCompletedDate === today;
  const todayResult = progress.completedChallenges.find(c => c.date === today) || null;

  return {
    isCompleted,
    difficulty: getDailyDifficulty(today),
    todayResult,
    streak: progress.currentStreak,
    bestStreak: progress.bestStreak,
    totalCompleted: progress.totalCompleted,
    streakFreezes: progress.streakFreezes,
  };
}

// NOTE: A previous `getDailyCommunityStats()` helper fabricated seeded
// "community" numbers (player counts, completion rates) for social proof. It was
// never surfaced in the UI and presenting invented engagement data risks app-store
// policy violations, so it was removed. Real community stats must come from a
// backend (telemetry/leaderboard) before any such display is added.

// ===========================================================================
// Daily Streak Milestones
// ===========================================================================

export interface DailyStreakMilestone {
  days: number;
  amber: number;
  message: string;
  darkMessage: string;
}

export const DAILY_STREAK_MILESTONES: DailyStreakMilestone[] = [
  { days: 3,  amber: 15,  message: 'Three days running!', darkMessage: 'Three days observed.' },
  { days: 7,  amber: 30,  message: 'A full week of dailies!', darkMessage: 'Seven days. The ritual deepens.' },
  { days: 14, amber: 50,  message: 'Two weeks strong!', darkMessage: 'Fourteen days. The pattern holds.' },
  { days: 21, amber: 75,  message: 'Three weeks dedicated!', darkMessage: 'Twenty-one days. It expects you now.' },
  { days: 30, amber: 100, message: 'One month of daily mastery!', darkMessage: 'Thirty days. The daily offering is... accepted.' },
];

/**
 * Check if a daily streak milestone was just crossed.
 * Returns the milestone info with phase-aware message, or null.
 */
export function checkDailyStreakMilestone(
  currentStreak: number,
  previousStreak: number,
  phase: number
): { amber: number; message: string } | null {
  for (const milestone of DAILY_STREAK_MILESTONES) {
    if (currentStreak >= milestone.days && previousStreak < milestone.days) {
      return {
        amber: milestone.amber,
        message: phase >= 3 ? milestone.darkMessage : milestone.message,
      };
    }
  }
  return null;
}

/**
 * Clear daily challenge data (for testing)
 */
export async function clearDailyProgress(): Promise<void> {
  progressCache = getDefaultProgress();
  dailyPuzzleCache = null;
  dailyGenerationInProgress = null;
  dailyCacheEpoch++;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}
