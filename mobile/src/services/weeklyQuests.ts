import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty } from '../types';
import { getLocalDateString, parseLocalDate } from './dateUtils';
import { JOURNAL_UNLOCK_PUZZLES } from '../constants/gameBalance';

/**
 * Quest system for WordShift.
 *
 * Two tiers:
 * - **Daily quests** (5): Reset at midnight local time. Lighter objectives.
 * - **Weekly challenges** (5): Reset Monday 00:00 local time. Harder, higher rewards.
 *
 * Both tiers bucket by the player's LOCAL calendar day (via dateUtils) so weekly
 * and daily resets stay consistent with streaks/daily-challenge across timezones.
 *
 * Quest descriptions shift tone with narrative phase.
 */

const DAILY_STORAGE_KEY = 'wordshift_daily_quests';
const WEEKLY_STORAGE_KEY = 'wordshift_weekly_quests';

// ============================================================================
// Types
// ============================================================================

export type QuestType =
  | 'solve_count'       // Complete N puzzles
  | 'solve_difficulty'  // Complete N puzzles on a specific difficulty
  | 'earn_stars'        // Earn N three-star ratings
  | 'no_hints'          // Complete N puzzles without hints
  | 'challenge_mode'    // Complete N puzzles in challenge mode
  | 'earn_amber'        // Earn N total amber
  | 'visit_animals'     // Talk to N different animals
  | 'streak_days'       // Maintain a streak for N days
  | 'sacrifice_amber'   // Offer N amber to the arrangement (Phase 4+ only)
  | 'tend_amber'        // Deepen the pattern by N amber at the Shrine (Phase 5+ only)
  | 'variant_wins';     // Win N puzzles of a specific named variant (only when unlocked)

export type QuestTier = 'daily' | 'weekly';

export interface Quest {
  id: string;
  type: QuestType;
  tier: QuestTier;
  title: string;
  /** Phase-aware description */
  description: string;
  /** Phase 3+ dark description */
  darkDescription?: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  rewardAmber: number;
  /** Difficulty filter (only for solve_difficulty quests) */
  difficulty?: Difficulty;
  /** Variant key (only for variant_wins quests) e.g. 'reverse' | 'double_shift' | 'speed' */
  variant?: string;
}

export interface QuestState {
  /** Date or week identifier */
  periodId: string;
  quests: Quest[];
  generatedAt: number;
  /** Distinct animal ids visited this period (for visit_animals quests) */
  animalsVisitedThisPeriod: string[];
  /**
   * True for a dormant pre-journal placeholder (no quests generated because
   * the player hadn't reached the journal gate when this period started).
   * A dormant state activates in place, same period, the moment a
   * context-full load reports the gate crossed.
   */
  gatedInactive?: boolean;
  /**
   * The generation context recorded by the last context-FULL load. Persisted
   * with the state so a context-LESS load after a period rollover (e.g. the
   * first quest-touching action of a new day is a puzzle completion in a
   * session held open past midnight, or right after a relaunch) regenerates
   * against real player state instead of optimistic defaults.
   */
  lastGenerationContext?: WeeklyQuestGenerationContext;
}

/** Combined view of both daily and weekly quests */
export interface CombinedQuestState {
  daily: QuestState;
  weekly: QuestState;
}

/** @deprecated Use CombinedQuestState. Kept for backward compat in HomeScreen. */
export type WeeklyQuestState = CombinedQuestState;

export interface WeeklyQuestGenerationContext {
  puzzlesSolved?: number;
  unlockedAnimalCount?: number;
  dailyUnlocked?: boolean;
  challengeUnlocked?: boolean;
  /** Unlocked non-standard variant keys — variant_wins quests only appear for these. */
  unlockedVariants?: string[];
}

// ============================================================================
// Quest Templates
// ============================================================================

export interface QuestTemplate {
  type: QuestType;
  titleTemplate: string;
  descTemplate: string;
  darkDescTemplate?: string;
  target: number;
  rewardAmber: number;
  difficulty?: Difficulty;
  /** Variant key (only for variant_wins templates). */
  variant?: string;
}

// Daily quest pool — achievable in a dedicated single session.
// Exported for the economy guard test (sink quests must stay net-negative).
export const DAILY_QUEST_POOL: QuestTemplate[] = [
  // NOTE: single-action dailies (target 1, or trivially met by one puzzle) are
  // tuned LOW on purpose — on a first HARD no-hints solve, several of these
  // complete at once, and over-rewarding that one action floods early amber and
  // rushes the house unlocks. Multi-puzzle dailies (solve 3/5, no_hints 3,
  // stars 3) keep their fuller rewards since they take sustained play.
  { type: 'solve_count', titleTemplate: 'Daily Solver', descTemplate: 'Complete {target} puzzles today', darkDescTemplate: 'Offer {target} arrangements today', target: 2, rewardAmber: 8 },
  { type: 'solve_count', titleTemplate: 'Puzzle Trio', descTemplate: 'Complete {target} puzzles today', darkDescTemplate: '{target} incantations before the day ends', target: 3, rewardAmber: 18 },
  { type: 'solve_count', titleTemplate: 'Five-Fold', descTemplate: 'Complete {target} puzzles today', darkDescTemplate: 'The pattern demands {target} today', target: 5, rewardAmber: 25 },
  { type: 'earn_stars', titleTemplate: 'Shining Moment', descTemplate: 'Earn a three-star rating', darkDescTemplate: 'A flawless offering', target: 1, rewardAmber: 9 },
  { type: 'earn_stars', titleTemplate: 'Star Collector', descTemplate: 'Earn {target} three-star ratings today', darkDescTemplate: '{target} perfect arrangements', target: 3, rewardAmber: 22 },
  { type: 'no_hints', titleTemplate: 'On Your Own', descTemplate: 'Complete a puzzle without hints', darkDescTemplate: 'The words come unbidden', target: 1, rewardAmber: 9 },
  { type: 'no_hints', titleTemplate: 'Clear Mind', descTemplate: 'Complete {target} puzzles without hints', darkDescTemplate: 'You no longer need guidance', target: 3, rewardAmber: 20 },
  { type: 'solve_difficulty', titleTemplate: 'Step Up', descTemplate: 'Complete a Medium+ or harder puzzle', darkDescTemplate: 'A weightier offering', target: 1, rewardAmber: 9, difficulty: 'MEDIUM_PLUS' },
  { type: 'solve_difficulty', titleTemplate: 'Hard Day', descTemplate: 'Complete a Hard puzzle', darkDescTemplate: 'The difficult arrangements carry more weight', target: 1, rewardAmber: 12, difficulty: 'HARD' },
  { type: 'challenge_mode', titleTemplate: 'Daring', descTemplate: 'Complete a challenge mode puzzle', darkDescTemplate: 'The arrangement rewards the bold', target: 1, rewardAmber: 14 },
  { type: 'visit_animals', titleTemplate: 'Say Hello', descTemplate: 'Talk to {target} animal(s)', darkDescTemplate: 'Consult a keeper', target: 1, rewardAmber: 6 },
  { type: 'visit_animals', titleTemplate: 'Social Call', descTemplate: 'Talk to {target} different animals', darkDescTemplate: 'Consult {target} keepers', target: 2, rewardAmber: 14 },
  { type: 'earn_amber', titleTemplate: 'Amber Scavenger', descTemplate: 'Earn {target} amber today', darkDescTemplate: 'Gather {target} amber', target: 30, rewardAmber: 8 },
  { type: 'earn_amber', titleTemplate: 'Amber Seeker', descTemplate: 'Earn {target} amber today', darkDescTemplate: 'The coffers need {target} amber', target: 60, rewardAmber: 12 },
  // Variant quests — only appear once that variant is unlocked (gated in
  // generateQuestsFromPool). They name the variant so the 32 configs stop being
  // invisible content and rotation gets a daily reason.
  { type: 'variant_wins', titleTemplate: 'Backward Steps', descTemplate: 'Win a Reverse Shift puzzle', darkDescTemplate: 'Walk the pattern back once', target: 1, rewardAmber: 12, variant: 'reverse' },
  { type: 'variant_wins', titleTemplate: 'Doubled', descTemplate: 'Win a Double Shift puzzle', darkDescTemplate: 'Two letters, one breath', target: 1, rewardAmber: 12, variant: 'double_shift' },
  { type: 'variant_wins', titleTemplate: 'Beat the Clock', descTemplate: 'Win a Speed Shift run', darkDescTemplate: 'Race the closing dark', target: 1, rewardAmber: 12, variant: 'speed' },
  // Tending (Phase 5+ only). Deliberately net-negative — rewards less amber than
  // it asks you to tend, so it pulls amber out of the economy (a sink disguised
  // as a quest) while giving a daily reason to deepen the pattern.
  { type: 'tend_amber', titleTemplate: 'Daily Tending', descTemplate: 'Deepen the pattern by {target} amber', darkDescTemplate: 'Tend the pattern with {target} amber today', target: 100, rewardAmber: 25 },
];

// Weekly quest pool — harder, multi-day objectives with bigger rewards.
// Exported for the economy guard test (sink quests must stay net-negative).
export const WEEKLY_QUEST_POOL: QuestTemplate[] = [
  { type: 'solve_count', titleTemplate: 'Dedicated Shifter', descTemplate: 'Complete {target} puzzles this week', darkDescTemplate: '{target} incantations for the arrangement', target: 15, rewardAmber: 85 },
  { type: 'solve_count', titleTemplate: 'Word Marathon', descTemplate: 'Complete {target} puzzles this week', darkDescTemplate: 'The void hungers for {target} offerings', target: 28, rewardAmber: 150 },
  { type: 'solve_count', titleTemplate: 'Relentless', descTemplate: 'Complete {target} puzzles this week', darkDescTemplate: '{target} arrangements. No rest.', target: 40, rewardAmber: 220 },
  { type: 'solve_difficulty', titleTemplate: 'Hard Challenger', descTemplate: 'Complete {target} Hard puzzles this week', darkDescTemplate: 'The difficult arrangements carry more weight', target: 7, rewardAmber: 90, difficulty: 'HARD' },
  { type: 'solve_difficulty', titleTemplate: 'Medium Mastery', descTemplate: 'Complete {target} Medium+ puzzles this week', darkDescTemplate: 'The pattern prefers complexity', target: 10, rewardAmber: 75, difficulty: 'MEDIUM_PLUS' },
  { type: 'earn_stars', titleTemplate: 'Perfectionist', descTemplate: 'Earn {target} three-star ratings this week', darkDescTemplate: '{target} flawless offerings', target: 12, rewardAmber: 100 },
  { type: 'earn_stars', titleTemplate: 'Star Hoarder', descTemplate: 'Earn {target} three-star ratings this week', darkDescTemplate: 'Perfection, {target} times over', target: 20, rewardAmber: 160 },
  { type: 'no_hints', titleTemplate: 'Unaided', descTemplate: 'Complete {target} puzzles without hints this week', darkDescTemplate: 'You no longer need guidance. You never did.', target: 12, rewardAmber: 90 },
  { type: 'challenge_mode', titleTemplate: 'Iron Solver', descTemplate: 'Complete {target} challenge mode puzzles this week', darkDescTemplate: '{target} offerings under duress', target: 7, rewardAmber: 100 },
  { type: 'earn_amber', titleTemplate: 'Amber Rush', descTemplate: 'Earn {target} amber this week', darkDescTemplate: 'The coffers of the temple must be filled', target: 200, rewardAmber: 80 },
  { type: 'earn_amber', titleTemplate: 'Amber Hoarder', descTemplate: 'Earn {target} amber this week', darkDescTemplate: 'Fill the arrangement with {target} amber', target: 400, rewardAmber: 140 },
  { type: 'visit_animals', titleTemplate: 'Community Builder', descTemplate: 'Talk to {target} different animals this week', darkDescTemplate: 'The keepers require your audience', target: 6, rewardAmber: 70 },
  { type: 'visit_animals', titleTemplate: 'Social Butterfly', descTemplate: 'Talk to {target} different animals this week', darkDescTemplate: 'Every keeper has something to say', target: 9, rewardAmber: 110 },
  { type: 'streak_days', titleTemplate: 'Consistent', descTemplate: 'Maintain a {target}-day streak', darkDescTemplate: 'Do not break the chain for {target} days', target: 5, rewardAmber: 80 },
  { type: 'streak_days', titleTemplate: 'Unbroken', descTemplate: 'Maintain a {target}-day streak', darkDescTemplate: 'Seven days. The ritual deepens.', target: 7, rewardAmber: 120 },
  // Variant quests (weekly, higher targets/rewards) — gated to unlocked variants.
  { type: 'variant_wins', titleTemplate: 'The Return', descTemplate: 'Win {target} Reverse Shift puzzles this week', darkDescTemplate: 'Walk the pattern back {target} times', target: 5, rewardAmber: 85, variant: 'reverse' },
  { type: 'variant_wins', titleTemplate: 'Both Hands', descTemplate: 'Win {target} Double Shift puzzles this week', darkDescTemplate: 'Two letters at a time, {target} times over', target: 5, rewardAmber: 85, variant: 'double_shift' },
  { type: 'variant_wins', titleTemplate: 'Fleet', descTemplate: 'Win {target} Speed Shift runs this week', darkDescTemplate: 'Outrun the dark {target} times', target: 5, rewardAmber: 85, variant: 'speed' },
  // Sacrifice (Phase 4+ only). Deliberately net-negative like tend_amber — the
  // quest can only appear at Phase 4+ where the reward multiplier is 2.0x, so
  // the base reward must stay below target/2 or the quest becomes an amber
  // faucet and inverts the sacrifice mechanic's "you get nothing in return"
  // design. Guarded by the economy test in weeklyQuests.test.ts.
  { type: 'sacrifice_amber', titleTemplate: 'Offering', descTemplate: 'Offer {target} amber to the arrangement', darkDescTemplate: 'Sacrifice {target} amber to the void', target: 100, rewardAmber: 30 },
  { type: 'sacrifice_amber', titleTemplate: 'Greater Offering', descTemplate: 'Offer {target} amber to the arrangement', darkDescTemplate: 'The arrangement hungers for {target} amber', target: 200, rewardAmber: 55 },
  // Tending (Phase 5+ only) — net-negative sink, weekly cadence for the Shrine.
  { type: 'tend_amber', titleTemplate: 'The Long Tending', descTemplate: 'Deepen the pattern by {target} amber this week', darkDescTemplate: 'Tend the pattern with {target} amber', target: 500, rewardAmber: 90 },
];

// ============================================================================
// In-memory caches
// ============================================================================

let dailyQuestCache: QuestState | null = null;
let weeklyQuestCache: QuestState | null = null;
/**
 * The generation context supplied by the most recent context-FULL load this
 * session. Context-less loads (updateQuestProgress / recordAnimalVisit /
 * claimQuestReward / notifications) fall back to this — and then to the
 * context persisted inside the stored quest state — instead of the optimistic
 * generation defaults, so a period rollover mid-session can never mint quests
 * for a player state that doesn't exist (e.g. "talk to 2 animals" with only
 * 1 animal unlocked).
 */
let lastKnownContext: WeeklyQuestGenerationContext | null = null;

// ============================================================================
// Period ID calculation
// ============================================================================

/**
 * Get the ISO week identifier for a given date (e.g., "2026-W07").
 * Week starts on Monday, bucketed by LOCAL calendar day (not UTC) so the
 * weekly reset lines up with the rest of the app's local-day logic.
 */
export function getWeekId(date: Date = new Date()): string {
  // Work from the LOCAL calendar day at local midnight (via dateUtils), so the
  // week boundary follows the player's wall clock rather than UTC.
  const d = parseLocalDate(getLocalDateString(date));
  const dayNum = d.getDay() || 7; // Make Sunday = 7
  d.setDate(d.getDate() + 4 - dayNum); // Thursday of the week
  const yearStart = parseLocalDate(`${d.getFullYear()}-01-01`);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Get the local date string for today (e.g., "2026-03-11").
 * Used for daily quest period tracking.
 */
export function getDayId(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ============================================================================
// Pre-journal generation gate
// ============================================================================

/**
 * Quests stay dormant until the quest surfaces (header quest pill + Journal
 * Hub) become visible at puzzle 6. Before that, generated quests would accrue
 * and expire invisibly — the player has no surface to see or claim them.
 * Same constant as HomeScreen's isPostTutorialLightMode gate (also used by
 * isQuestPillVisible) via JOURNAL_UNLOCK_PUZZLES.
 */
export const QUEST_GENERATION_MIN_PUZZLES = JOURNAL_UNLOCK_PUZZLES;

/**
 * True when the known context explicitly says the player has not reached the
 * journal yet. An unknown context (or one without puzzlesSolved) never gates —
 * legacy behavior is preserved when player state has never been reported.
 */
function isBelowJournalGate(context?: WeeklyQuestGenerationContext): boolean {
  return (
    context !== undefined &&
    context.puzzlesSolved !== undefined &&
    context.puzzlesSolved < QUEST_GENERATION_MIN_PUZZLES
  );
}

/**
 * True when `state` is a dormant pre-journal placeholder that can now be
 * replaced with real quests: a context-full load reports the gate crossed.
 */
function canActivateGatedState(
  state: QuestState,
  context?: WeeklyQuestGenerationContext
): boolean {
  return (
    state.gatedInactive === true &&
    context !== undefined &&
    (context.puzzlesSolved ?? 0) >= QUEST_GENERATION_MIN_PUZZLES
  );
}

// ============================================================================
// Quest Generation
// ============================================================================

/**
 * Seeded PRNG from a string seed.
 */
function makeSeededRandom(seedStr: string): () => number {
  let seed = seedStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed >> 16) / 32768;
  };
}

/**
 * Generate quests from a template pool.
 */
function generateQuestsFromPool(
  pool: QuestTemplate[],
  count: number,
  periodId: string,
  tier: QuestTier,
  phase: number,
  context?: WeeklyQuestGenerationContext
): Quest[] {
  const seededRandom = makeSeededRandom(periodId + tier);

  const challengeUnlocked = context?.challengeUnlocked ?? (context?.puzzlesSolved ?? 0) >= 15;
  const unlockedAnimalCount = context?.unlockedAnimalCount ?? 10;
  const unlockedVariants = context?.unlockedVariants ?? [];

  // Filter the pool based on player state
  const filtered = pool.filter(t => {
    if (t.type === 'sacrifice_amber' && phase < 4) return false;
    if (t.type === 'tend_amber' && phase < 5) return false;
    if (t.type === 'challenge_mode' && !challengeUnlocked) return false;
    // A variant quest can only appear once its variant is unlocked (else it names
    // a mode the player has never seen).
    if (t.type === 'variant_wins' && (!t.variant || !unlockedVariants.includes(t.variant))) return false;
    if (t.type === 'visit_animals') {
      if (unlockedAnimalCount < 2) return false;
      if (t.target > unlockedAnimalCount) return false;
    }
    return true;
  });

  // Shuffle deterministically
  const shuffled = [...filtered];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Pick quests, max 2 of same type
  const selected: QuestTemplate[] = [];
  for (const template of shuffled) {
    if (selected.length >= count) break;
    const typeCount = selected.filter(s => s.type === template.type).length;
    if (typeCount >= 2) continue;
    selected.push(template);
  }

  // Fill remaining if we didn't reach target count. Re-apply the same
  // max-2-per-type guard so the fill pass can't backfill a same-y set when few
  // templates survived filtering (early-game players).
  if (selected.length < count) {
    for (const template of shuffled) {
      if (selected.length >= count) break;
      if (selected.includes(template)) continue;
      const typeCount = selected.filter(s => s.type === template.type).length;
      if (typeCount >= 2) continue;
      selected.push(template);
    }
  }

  return selected.map((template, i) => {
    const desc = template.descTemplate.replace('{target}', template.target.toString());
    const darkDesc = template.darkDescTemplate?.replace('{target}', template.target.toString());
    return {
      id: `${periodId}_${tier}_${i}`,
      type: template.type,
      tier,
      title: template.titleTemplate,
      description: desc,
      darkDescription: darkDesc,
      target: template.target,
      progress: 0,
      completed: false,
      claimed: false,
      rewardAmber: template.rewardAmber,
      difficulty: template.difficulty,
      variant: template.variant,
    };
  });
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load both daily and weekly quest states, generating new quests if periods have changed.
 */
export async function loadWeeklyQuests(
  currentPhase: number = 0,
  generationContext?: WeeklyQuestGenerationContext
): Promise<CombinedQuestState> {
  if (generationContext) {
    lastKnownContext = generationContext;
  }
  const daily = await loadQuestTier('daily', currentPhase, generationContext);
  const weekly = await loadQuestTier('weekly', currentPhase, generationContext);
  return { daily, weekly };
}

/**
 * Keep the persisted generation context fresh on context-full loads, so a
 * later context-less period rollover regenerates against the newest known
 * player state. Writes only when the context actually changed.
 */
async function rememberGenerationContext(
  tier: QuestTier,
  state: QuestState,
  context: WeeklyQuestGenerationContext
): Promise<void> {
  if (JSON.stringify(state.lastGenerationContext ?? null) === JSON.stringify(context)) {
    return;
  }
  state.lastGenerationContext = context;
  await saveQuestTier(tier, state);
}

async function loadQuestTier(
  tier: QuestTier,
  phase: number,
  context?: WeeklyQuestGenerationContext
): Promise<QuestState> {
  const storageKey = tier === 'daily' ? DAILY_STORAGE_KEY : WEEKLY_STORAGE_KEY;
  const cache = tier === 'daily' ? dailyQuestCache : weeklyQuestCache;
  const currentPeriod = tier === 'daily' ? getDayId() : getWeekId();
  const count = 5;
  const pool = tier === 'daily' ? DAILY_QUEST_POOL : WEEKLY_QUEST_POOL;

  if (cache && cache.periodId === currentPeriod && !canActivateGatedState(cache, context)) {
    if (context) await rememberGenerationContext(tier, cache, context);
    return cache;
  }

  // A stale state (previous period) is still useful: it carries the last
  // persisted generation context, which a context-less rollover load needs.
  let staleContext: WeeklyQuestGenerationContext | undefined = cache?.lastGenerationContext;

  try {
    const stored = await AsyncStorage.getItem(storageKey);
    if (stored) {
      const parsed: QuestState = JSON.parse(stored);
      if (parsed.periodId === currentPeriod && !canActivateGatedState(parsed, context)) {
        if (!parsed.animalsVisitedThisPeriod) {
          parsed.animalsVisitedThisPeriod = [];
        }
        // Backfill tier field for quests loaded from old storage format
        for (const q of parsed.quests) {
          if (!q.tier) q.tier = tier;
        }
        if (tier === 'daily') dailyQuestCache = parsed;
        else weeklyQuestCache = parsed;
        if (context) await rememberGenerationContext(tier, parsed, context);
        return parsed;
      }
      staleContext = parsed.lastGenerationContext ?? staleContext;
    }
  } catch {}

  // New period (or a dormant pre-journal placeholder whose gate just lifted) —
  // generate fresh quests. An explicit context wins; otherwise fall back to
  // the last context a context-full load recorded (this session, then the one
  // persisted with the previous state) — never the optimistic generation
  // defaults once player state has ever been known.
  const effectiveContext = context ?? lastKnownContext ?? staleContext;

  // Pre-journal gate: quest surfaces appear at puzzle 6, so generating earlier
  // means quests silently accrue and expire unseen. Persist a dormant
  // placeholder instead; it owns the period and activates in place once a
  // context-full load reports the gate crossed (canActivateGatedState above).
  // Existing states with quests are always served as-is (backward compatible).
  const gated = isBelowJournalGate(effectiveContext);

  const newState: QuestState = {
    periodId: currentPeriod,
    quests: gated
      ? []
      : generateQuestsFromPool(pool, count, currentPeriod, tier, phase, effectiveContext),
    generatedAt: Date.now(),
    animalsVisitedThisPeriod: [],
  };
  if (gated) newState.gatedInactive = true;
  if (effectiveContext) newState.lastGenerationContext = effectiveContext;

  if (tier === 'daily') dailyQuestCache = newState;
  else weeklyQuestCache = newState;
  await saveQuestTier(tier, newState);
  return newState;
}

/**
 * Update quest progress based on a completed puzzle.
 * Updates BOTH daily and weekly quests.
 * Returns newly completed quests (for toast notifications).
 */
export async function updateQuestProgress(event: {
  difficulty?: Difficulty;
  stars?: number;
  hintsUsed?: number;
  isDaily?: boolean;
  isChallenge?: boolean;
  amberEarned?: number;
  /** Number of distinct animals visited (for visit_animals quests) */
  animalsVisited?: number;
  /** Current streak length (for streak_days quests) */
  currentStreak?: number;
  /** Amber sacrificed this session (for sacrifice_amber quests) */
  amberSacrificed?: number;
  /** Amber tended at the Shrine this session (for tend_amber quests) */
  amberTended?: number;
  /** Variant key of the completed puzzle (for variant_wins quests). */
  variant?: string;
}, currentPhase: number = 0): Promise<Quest[]> {
  const combined = await loadWeeklyQuests(currentPhase);

  // Pre-journal gate: both tiers dormant — nothing to progress, nothing to save.
  if (combined.daily.gatedInactive && combined.weekly.gatedInactive) {
    return [];
  }

  const allNewlyCompleted: Quest[] = [];

  for (const state of [combined.daily, combined.weekly]) {
    if (!state.animalsVisitedThisPeriod) {
      state.animalsVisitedThisPeriod = [];
    }

    for (const quest of state.quests) {
      if (quest.completed) continue;

      let progressDelta = 0;

      switch (quest.type) {
        case 'solve_count':
          progressDelta = 1;
          break;
        case 'solve_difficulty':
          if (quest.difficulty === 'MEDIUM_PLUS') {
            // Medium+ quest accepts MEDIUM_PLUS and HARD
            if (event.difficulty === 'MEDIUM_PLUS' || event.difficulty === 'HARD') progressDelta = 1;
          } else if (event.difficulty === quest.difficulty) {
            progressDelta = 1;
          }
          break;
        case 'earn_stars':
          if (event.stars === 3) progressDelta = 1;
          break;
        case 'no_hints':
          if (event.hintsUsed === 0) progressDelta = 1;
          break;
        case 'challenge_mode':
          if (event.isChallenge) progressDelta = 1;
          break;
        case 'variant_wins':
          if (event.variant && event.variant === quest.variant) progressDelta = 1;
          break;
        case 'earn_amber':
          progressDelta = event.amberEarned ?? 0;
          break;
        case 'visit_animals':
          if (event.animalsVisited !== undefined) {
            quest.progress = Math.min(event.animalsVisited, quest.target);
          }
          progressDelta = 0;
          break;
        case 'streak_days':
          if (event.currentStreak !== undefined) {
            quest.progress = Math.min(event.currentStreak, quest.target);
          }
          progressDelta = 0;
          break;
        case 'sacrifice_amber':
          if (event.amberSacrificed !== undefined && event.amberSacrificed > 0) {
            progressDelta = event.amberSacrificed;
          }
          break;
        case 'tend_amber':
          if (event.amberTended !== undefined && event.amberTended > 0) {
            progressDelta = event.amberTended;
          }
          break;
      }

      if (progressDelta > 0) {
        quest.progress = Math.min(quest.progress + progressDelta, quest.target);
      }

      if (quest.progress >= quest.target && !quest.completed) {
        quest.completed = true;
        allNewlyCompleted.push(quest);
      }
    }
  }

  // Save both tiers
  await saveQuestTier('daily', combined.daily);
  await saveQuestTier('weekly', combined.weekly);

  return allNewlyCompleted;
}

/**
 * Record that the player visited/talked to an animal.
 * Updates visit_animals quests in both daily and weekly tiers.
 */
export async function recordAnimalVisit(
  animalId: string,
  currentPhase: number = 0,
  currentStreak?: number
): Promise<Quest[]> {
  const combined = await loadWeeklyQuests(currentPhase);

  // Pre-journal gate: both tiers dormant — nothing to progress, nothing to save.
  if (combined.daily.gatedInactive && combined.weekly.gatedInactive) {
    return [];
  }

  const allNewlyCompleted: Quest[] = [];

  for (const state of [combined.daily, combined.weekly]) {
    if (!state.animalsVisitedThisPeriod) {
      state.animalsVisitedThisPeriod = [];
    }

    if (!state.animalsVisitedThisPeriod.includes(animalId)) {
      state.animalsVisitedThisPeriod.push(animalId);
    }

    const visitedCount = state.animalsVisitedThisPeriod.length;

    for (const quest of state.quests) {
      if (quest.completed) continue;

      if (quest.type === 'visit_animals') {
        quest.progress = Math.min(visitedCount, quest.target);
      } else if (quest.type === 'streak_days' && currentStreak !== undefined) {
        quest.progress = Math.min(currentStreak, quest.target);
      } else {
        continue;
      }

      if (quest.progress >= quest.target && !quest.completed) {
        quest.completed = true;
        allNewlyCompleted.push(quest);
      }
    }
  }

  await saveQuestTier('daily', combined.daily);
  await saveQuestTier('weekly', combined.weekly);

  return allNewlyCompleted;
}

/**
 * Get the phase-based reward multiplier for quest rewards.
 * Higher phases = higher quest rewards to maintain quest relevance.
 */
export function getPhaseRewardMultiplier(phase: number): number {
  if (phase >= 4) return 2.0;
  if (phase >= 3) return 1.5;
  if (phase >= 2) return 1.25;
  return 1.0;
}

/**
 * Claim a completed quest reward. Returns the phase-scaled amber amount awarded.
 */
export async function claimQuestReward(questId: string, currentPhase: number = 0): Promise<{ amber: number } | null> {
  const combined = await loadWeeklyQuests(currentPhase);

  // Search both tiers
  for (const tier of ['daily', 'weekly'] as const) {
    const state = combined[tier];
    const quest = state.quests.find(q => q.id === questId);
    if (!quest || !quest.completed || quest.claimed) continue;

    quest.claimed = true;
    await saveQuestTier(tier, state);

    const multiplier = getPhaseRewardMultiplier(currentPhase);
    return {
      amber: Math.round(quest.rewardAmber * multiplier),
    };
  }

  return null;
}

/**
 * Get quest description appropriate for the current phase.
 */
export function getQuestDescription(quest: Quest, phase: number): string {
  if (phase >= 3 && quest.darkDescription) return quest.darkDescription;
  return quest.description;
}

/**
 * Get total unclaimed amber from completed quests across both tiers (phase-scaled).
 */
export function getUnclaimedAmber(state: CombinedQuestState, currentPhase: number = 0): number {
  const multiplier = getPhaseRewardMultiplier(currentPhase);
  const allQuests = [...state.daily.quests, ...state.weekly.quests];
  return allQuests
    .filter(q => q.completed && !q.claimed)
    .reduce((sum, q) => sum + Math.round(q.rewardAmber * multiplier), 0);
}

/**
 * Get time remaining until daily quest reset (next midnight local time).
 */
export function getTimeUntilDailyReset(): { hours: number; minutes: number } {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const msRemaining = tomorrow.getTime() - now.getTime();
  const totalMinutes = Math.floor(msRemaining / 60000);
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

/**
 * Get time remaining until weekly quest reset (next Monday 00:00 local time).
 */
export function getTimeUntilReset(): { days: number; hours: number; minutes: number } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday (local)
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilMonday,
    0, 0, 0
  );
  const msRemaining = nextMonday.getTime() - now.getTime();
  const totalMinutes = Math.floor(msRemaining / 60000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

// ============================================================================
// Internal
// ============================================================================

async function saveQuestTier(tier: QuestTier, state: QuestState): Promise<void> {
  const storageKey = tier === 'daily' ? DAILY_STORAGE_KEY : WEEKLY_STORAGE_KEY;
  if (!state.animalsVisitedThisPeriod) {
    state.animalsVisitedThisPeriod = [];
  }
  if (tier === 'daily') dailyQuestCache = state;
  else weeklyQuestCache = state;
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(state));
  } catch {}
}

/**
 * Drop the in-memory quest caches (and the session's last-known generation
 * context) without touching storage. Called after a cloud restore overwrites
 * the underlying AsyncStorage keys so the next load re-reads from storage.
 */
export function invalidateQuestCache(): void {
  dailyQuestCache = null;
  weeklyQuestCache = null;
  lastKnownContext = null;
}

/**
 * Clear all quest data (for Settings > Reset All).
 */
export async function clearWeeklyQuests(): Promise<void> {
  invalidateQuestCache();
  try {
    await AsyncStorage.removeItem(DAILY_STORAGE_KEY);
    await AsyncStorage.removeItem(WEEKLY_STORAGE_KEY);
  } catch {}
}
