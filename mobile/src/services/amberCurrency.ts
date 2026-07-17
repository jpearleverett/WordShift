import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty, GameMode } from '../types';
import { clearPlayedPuzzles } from './puzzleBank';
import { getLocalDateString, getLocalDateStringDaysAgo, daysAgoLocal } from './dateUtils';
import {
  HomeWorldProgress,
  AmberTransaction,
  AMBER_REWARDS,
  FIRST_COMPLETION_BONUS,
  PHASE_THRESHOLDS,
  DialoguePhase,
  STREAK_BONUSES,
  calculateStreakMultiplier,
  checkMilestone,
  getMilestoneMessage,
  NARRATIVE_ACCELERATION,
  CHALLENGE_MODE_CONFIG,
  AnimalType,
  getAnimalPhase,
  LATE_PHASE_RECRUITS,
} from '../types/homeWorld';
import {
  MIN_PUZZLES_FOR_PHASE,
  FRESH_VARIANT_BONUS_AMBER,
  PATRON_AMBER_BONUS,
  SURPRISE_BONUS_CHANCE,
  SURPRISE_BONUS_AMOUNTS,
  SURPRISE_BONUS_MIN_PUZZLES,
  NEW_CYCLE_ACCELERATION_PER_CYCLE,
  NEW_CYCLE_ACCELERATION_MAX,
  STREAK_FREEZE_CAP,
  FINALE_ARM_MIN_PUZZLES,
  FINALE_DWELL_PUZZLES,
  RESONANT_BOARD_CAP_AMBER,
} from '../constants/gameBalance';
import { isPatronSync } from './entitlements';

const PROGRESS_STORAGE_KEY = 'wordshift_home_progress';
const TRANSACTIONS_STORAGE_KEY = 'wordshift_amber_transactions';
const DAILY_CHALLENGE_INTRO_SEEN_KEY = 'wordshift_daily_challenge_intro_seen';
const FOX_PLAY_NUDGE_SEEN_KEY = 'wordshift_fox_play_nudge_seen';
const CHALLENGE_INTRO_SEEN_KEY = 'wordshift_challenge_intro_seen';
const PIT_NUDGE_SEEN_KEY = 'wordshift_pit_nudge_seen';
// Legacy: the old passive puzzle-8 Fox pit-harvest intro's seen flag. That intro
// was replaced by the mandatory first-harvest gate, which uses its OWN fresh flag
// (MANDATORY_HARVEST_SEEN_KEY) so existing players — who already have this legacy
// flag set — still get the new gate once. Only cleared on Reset All now.
const PIT_HARVEST_INTRO_SEEN_KEY = 'wordshift_pit_harvest_intro_seen';
const MANDATORY_HARVEST_SEEN_KEY = 'wordshift_mandatory_harvest_seen';
const SETUP_SELECTOR_INTRO_SEEN_KEY = 'wordshift_setup_selector_intro_seen';
const JOURNAL_INTRO_SEEN_KEY = 'wordshift_journal_intro_seen';
const STARTER_INTRO_SEEN_KEY = 'wordshift_starter_intro_seen';
// The guaranteed, prominent first-FREE-victory glitch (opening promise); fired
// once on the first non-onboarding win, cleared by Reset All so it replays.
const FIRST_WIN_GLITCH_KEY = 'wordshift_first_win_glitch';
const GATED_UNLOCK_INTRO_SEEN_KEY = 'wordshift_gated_unlock_intro_seen';
const HARVEST_HOME_INTRO_SEEN_KEY = 'wordshift_harvest_home_intro_seen';

// In-memory cache
let progressCache: HomeWorldProgress | null = null;

/**
 * Get default initial progress
 * Starts with just one empty room - player must invite first animal
 */
function getDefaultProgress(): HomeWorldProgress {
  return {
    amber: 0,
    totalAmberEarned: 0,
    unlockedAnimals: [], // No animals - must invite first one!
    unlockedRooms: ['cozy_den'], // Starter room (empty)
    currentPhase: 0,
    puzzlesSolved: 0,
    phaseProgress: 0, // Weighted phase progress (may differ from puzzlesSolved due to acceleration)
    phasePuzzleThresholds: [...PHASE_THRESHOLDS],
    lastDialogueRead: {},
    introsSeen: [], // Track which animals have had their intro shown
    currentStreak: 0,
    lastPlayDate: null,
    challengeCompletions: 0,
    pendingVariantTutorials: [],
    seenVariantTutorials: [],
    preferredPuzzleVariant: 'standard',
    lastVariantPlayed: 'standard',
    sameVariantStreak: 0,
    pendingPhaseTransition: null,
    phaseProgressFraction: 0,
    reservedUnlockId: null,
  };
}

/**
 * Phase 5 is a clean handoff to the post-revelation/Tending pool. Retire any
 * unread regular backlog for unlocked animals while preserving indices already
 * beyond the regular corpus (those positions drive deterministic pool re-reads).
 * Lazy-load the dialogue corpus only at the reveal/load self-heal boundary so
 * the foundational currency service does not evaluate it during normal startup.
 */
function retireUnlockedRegularDialogue(progress: HomeWorldProgress): boolean {
  const unlocked = progress.unlockedAnimals ?? [];
  if (unlocked.length === 0) return false;
  if (!progress.lastDialogueRead) progress.lastDialogueRead = {};
  const { getTotalDialogueCount } =
    require('./dialogue/animalDialogueBase') as typeof import('./dialogue/animalDialogueBase');
  let changed = false;
  for (const animalId of unlocked) {
    const totalRegular = getTotalDialogueCount(animalId as AnimalType, 4);
    const existing = progress.lastDialogueRead[animalId] ?? 0;
    if (existing < totalRegular) {
      progress.lastDialogueRead[animalId] = totalRegular;
      changed = true;
    }
  }
  return changed;
}

/**
 * Existing saves may already contain the descent trio from before their
 * current-era fast-forward was added to the unlock path. Match the live unlock
 * boundary (global Phase 2+) and bring those animals to the start of their
 * effective era without rewinding any dialogue progress.
 */
function fastForwardExistingLateRecruitDialogue(progress: HomeWorldProgress): boolean {
  if (
    progress.postRevelation === true ||
    progress.currentPhase < 2 ||
    progress.currentPhase > 4
  ) {
    return false;
  }

  const unlocked = progress.unlockedAnimals ?? [];
  if (unlocked.length === 0) return false;
  if (!progress.lastDialogueRead) progress.lastDialogueRead = {};
  const { getPhaseStartIndex } =
    require('./dialogue/animalDialogueBase') as typeof import('./dialogue/animalDialogueBase');
  let changed = false;

  for (const animalId of unlocked) {
    const animalType = animalId as AnimalType;
    if (!LATE_PHASE_RECRUITS.has(animalType)) continue;
    const animalPhase = getAnimalPhase(progress.currentPhase, animalType);
    const startIndex = getPhaseStartIndex(animalType, animalPhase);
    const existing = progress.lastDialogueRead[animalId] ?? 0;
    if (startIndex > existing) {
      progress.lastDialogueRead[animalId] = startIndex;
      changed = true;
    }
  }

  return changed;
}

// MIN_PUZZLES_FOR_PHASE imported from constants/gameBalance.ts (single source of truth).

/**
 * Get today's date as a LOCAL-day YYYY-MM-DD string.
 * Local (not UTC) so streaks bucket by the player's calendar day.
 */
function getTodayDateString(): string {
  return getLocalDateString();
}

/**
 * Check if a date string is yesterday (local calendar day)
 */
function isYesterday(dateString: string): boolean {
  return dateString === getLocalDateStringDaysAgo(1);
}

/**
 * Check if a date string is exactly yesterday (local day).
 * Free streak continuation requires play *yesterday* — any longer gap must be
 * covered by a streak freeze (see updateStreak). This keeps daily habit
 * tension intact instead of letting an every-other-day cadence ride forever.
 */
function playedYesterday(dateString: string): boolean {
  return daysAgoLocal(dateString) === 1;
}

/**
 * Check if a date string is today
 */
function isToday(dateString: string): boolean {
  return dateString === getTodayDateString();
}

/**
 * Injectable RNG seam for the variable-ratio surprise bonus.
 * Production uses Math.random; tests swap a deterministic generator via
 * setSurpriseRng(). This is the ONLY test-only hook — production never depends
 * on it beyond the default Math.random seam.
 */
let surpriseRng: () => number = Math.random;

/** TEST-ONLY: override the surprise-bonus RNG. Pass no arg to restore Math.random. */
export function setSurpriseRng(rng?: () => number): void {
  surpriseRng = rng ?? Math.random;
}

/**
 * Variable-ratio surprise bonus, applied to EVERY win (standard, challenge, and
 * daily alike — awardPuzzleAmber calls this unconditionally). Returns 0 unless
 * the player is past the onboarding window and the injectable RNG lands within
 * SURPRISE_BONUS_CHANCE. Additive to the amber REWARD only — never phase progress.
 */
function computeSurpriseBonus(difficulty: Difficulty, puzzlesSolved: number): number {
  if (puzzlesSolved < SURPRISE_BONUS_MIN_PUZZLES) return 0;
  if (surpriseRng() >= SURPRISE_BONUS_CHANCE) return 0;
  return SURPRISE_BONUS_AMOUNTS[difficulty];
}

// Set true by updateStreak() when a streak freeze is consumed to save a streak.
// Read (and cleared) by awardPuzzleAmber so the victory flow can surface a
// "your streak was protected" moment. Module-scoped because updateStreak's
// numeric return signature is depended on elsewhere.
let streakFreezeJustConsumed = false;

/**
 * Update streak based on play activity
 * Should be called when a puzzle is completed
 */
async function updateStreak(): Promise<number> {
  const progress = await loadProgress();
  const today = getTodayDateString();

  // Handle missing streak data (migration)
  if (progress.currentStreak === undefined) {
    progress.currentStreak = 0;
  }

  if (!progress.lastPlayDate) {
    // First play ever - start streak at 1
    progress.currentStreak = 1;
    progress.lastPlayDate = today;
  } else if (isToday(progress.lastPlayDate)) {
    // Already played today - streak unchanged
    // Just return current streak
  } else if (playedYesterday(progress.lastPlayDate)) {
    // Played yesterday — continue streak
    progress.currentStreak += 1;
    progress.lastPlayDate = today;
  } else {
    // Missed at least one full day — a streak freeze can still save it
    const freezesAvailable = progress.streakFreezes ?? 0;
    if (freezesAvailable > 0 && progress.currentStreak > 0) {
      // Consume a streak freeze to save the streak
      progress.streakFreezes = freezesAvailable - 1;
      progress.currentStreak += 1;
      progress.lastPlayDate = today;
      streakFreezeJustConsumed = true;
    } else {
      // No freeze available — reset streak
      progress.currentStreak = 1;
      progress.lastPlayDate = today;
    }
  }

  progressCache = progress;
  await saveProgress();
  return progress.currentStreak;
}

// ============================================================================
// STREAK MILESTONE REWARDS
// ============================================================================

/** Streak milestones that award one-time amber bonuses when crossed */
export const STREAK_MILESTONES: {
  streak: number;
  amber: number;
  message: string;
  darkMessage?: string;
}[] = [
  { streak: 3, amber: 15, message: 'Three-day streak!' },
  { streak: 7, amber: 30, message: 'One-week streak!', darkMessage: 'Seven days. The pattern notices.' },
  { streak: 14, amber: 50, message: 'Two-week streak!', darkMessage: 'Fourteen days without breaking the chain.' },
  { streak: 21, amber: 65, message: 'Three-week streak!', darkMessage: 'Twenty-one days. It recognizes your rhythm.' },
  { streak: 30, amber: 100, message: 'Thirty-day streak!', darkMessage: 'Thirty days. The arrangement is grateful.' },
];

/**
 * Check if a streak milestone was just crossed.
 * Returns the milestone if the current streak crosses a new threshold, null otherwise.
 */
export function checkStreakMilestone(
  currentStreak: number,
  previousStreak: number,
  phase: DialoguePhase
): { amber: number; message: string } | null {
  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak >= milestone.streak && previousStreak < milestone.streak) {
      const msg = (phase >= 2 && milestone.darkMessage) ? milestone.darkMessage : milestone.message;
      return { amber: milestone.amber, message: msg };
    }
  }
  return null;
}

// ============================================================================
// STREAK FREEZE SYSTEM
// ============================================================================

const STREAK_FREEZE_COST = 50;
const FREE_FREEZE_INTERVAL_DAYS = 14;

/**
 * Purchase a streak freeze using amber.
 * Returns true if purchased successfully, false if insufficient amber
 * or the player is already holding STREAK_FREEZE_CAP freezes.
 */
export async function purchaseStreakFreeze(): Promise<boolean> {
  const progress = await loadProgress();
  // Freezes are capped — an uncapped stack would make streaks unbreakable.
  if ((progress.streakFreezes ?? 0) >= STREAK_FREEZE_CAP) return false;
  if (progress.amber < STREAK_FREEZE_COST) return false;

  progress.amber -= STREAK_FREEZE_COST;
  progress.streakFreezes = (progress.streakFreezes ?? 0) + 1;
  progressCache = progress;
  await saveProgress();
  await recordTransaction({
    amount: STREAK_FREEZE_COST,
    type: 'spend',
    source: 'streak_freeze_purchase',
    timestamp: Date.now(),
  });
  return true;
}

/**
 * Get current streak freeze count.
 */
export async function getStreakFreezeCount(): Promise<number> {
  const progress = await loadProgress();
  return progress.streakFreezes ?? 0;
}

/**
 * Check and grant a free streak freeze every 14 days.
 * Called on app launch. Never grants past STREAK_FREEZE_CAP — while the player
 * is at the cap the grant simply waits (the last-grant date is NOT advanced),
 * so the free freeze arrives as soon as one is consumed.
 */
export async function checkFreeStreakFreeze(): Promise<boolean> {
  const progress = await loadProgress();
  const today = getTodayDateString();
  const lastFree = progress.lastFreeStreakFreezeDate;

  // At the cap: no grant, and no date bump — re-check next launch.
  if ((progress.streakFreezes ?? 0) >= STREAK_FREEZE_CAP) return false;

  if (!lastFree) {
    // First time — grant one free freeze
    progress.streakFreezes = (progress.streakFreezes ?? 0) + 1;
    progress.lastFreeStreakFreezeDate = today;
    progressCache = progress;
    await saveProgress();
    return true;
  }

  // Route the interval through the local-day helper rather than parsing the
  // YYYY-MM-DD string with `new Date()` (which interprets it as UTC midnight).
  // Functionally equivalent here, but keeps every day-bucketing path consistent
  // with the dateUtils contract so a future edit can't reintroduce a UTC skew.
  const diffDays = daysAgoLocal(lastFree);

  if (diffDays >= FREE_FREEZE_INTERVAL_DAYS) {
    progress.streakFreezes = (progress.streakFreezes ?? 0) + 1;
    progress.lastFreeStreakFreezeDate = today;
    progressCache = progress;
    await saveProgress();
    return true;
  }

  return false;
}

/** Cost of a streak freeze in amber */
export const STREAK_FREEZE_AMBER_COST = STREAK_FREEZE_COST;

/**
 * Load progress from AsyncStorage
 */
export async function loadProgress(): Promise<HomeWorldProgress> {
  try {
    if (progressCache) {
      return progressCache;
    }

    const stored = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
    if (stored) {
      progressCache = JSON.parse(stored);
      let healedProgress = false;
      // Self-heal legacy saves: post-revelation locks the world at phase 5,
      // but older builds left currentPhase at 4 (calculatePhase caps there).
      if (progressCache!.postRevelation === true && progressCache!.currentPhase !== 5) {
        progressCache!.currentPhase = effectivePhaseFor(progressCache!);
        progressCache!.pendingPhaseTransition = null;
        healedProgress = true;
      }
      // Existing Phase-5 saves may still point into Phase 3/4 regular dialogue.
      // Normalize those positions even when currentPhase was already correct;
      // retirement takes precedence over the pre-revelation catch-up heal.
      if (progressCache!.postRevelation === true) {
        if (retireUnlockedRegularDialogue(progressCache!)) {
          healedProgress = true;
        }
      } else if (fastForwardExistingLateRecruitDialogue(progressCache!)) {
        healedProgress = true;
      }
      if (healedProgress) {
        await saveProgress();
      }
      return progressCache!;
    }
  } catch (error) {
    console.warn('Failed to load home progress:', error);
  }

  progressCache = getDefaultProgress();
  return progressCache;
}

/** Drop the in-memory progress cache after external storage writes (cloud restore). */
export function invalidateProgressCache(): void {
  progressCache = null;
}

/**
 * Save progress to AsyncStorage
 */
async function saveProgress(): Promise<void> {
  if (!progressCache) return;
  try {
    await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progressCache));
  } catch (error) {
    console.warn('Failed to save home progress:', error);
  }
}

/** Whether the one-time Phase-5 Unbroken Weave home introduction has shown. */
export async function hasSeenUnbrokenWeaveIntro(): Promise<boolean> {
  return (await loadProgress()).unbrokenWeaveIntroSeen === true;
}

/** Persist the Unbroken Weave introduction inside the existing home progress. */
export async function markUnbrokenWeaveIntroSeen(): Promise<void> {
  const progress = await loadProgress();
  if (progress.unbrokenWeaveIntroSeen === true) return;
  progress.unbrokenWeaveIntroSeen = true;
  progressCache = progress;
  await saveProgress();
}

/**
 * Get current amber balance
 */
export async function getAmberBalance(): Promise<number> {
  const progress = await loadProgress();
  return progress.amber;
}

/**
 * Calculate narrative acceleration multiplier for phase progression
 * Based on player performance (three-star rate, streak, difficulty).
 *
 * The three-star component is a LINEAR RAMP, not a step: 1.0 at or below
 * THREE_STAR_RAMP_START (0.40), rising linearly to the THREE_STAR_MULTIPLIER
 * ceiling (1.5) at THREE_STAR_RAMP_END (0.60) — so exactly 1.25 at a 0.50
 * rate. The old hard step (1.5x iff rate >= 0.5) meant a one-percentage-point
 * difference in skill could move the reveal by weeks. The overall cap stays
 * 3.0.
 */
export function calculatePhaseAcceleration(
  threeStarRate: number,
  currentStreak: number,
  difficulty: Difficulty,
  gameMode: GameMode = 'standard',
  blind: boolean = false
): number {
  let multiplier = 1.0;

  // Three-star performance ramp (linear between RAMP_START and RAMP_END)
  const rampSpan =
    NARRATIVE_ACCELERATION.THREE_STAR_RAMP_END - NARRATIVE_ACCELERATION.THREE_STAR_RAMP_START;
  const rampT = Math.min(
    1,
    Math.max(0, (threeStarRate - NARRATIVE_ACCELERATION.THREE_STAR_RAMP_START) / rampSpan)
  );
  multiplier *= 1 + (NARRATIVE_ACCELERATION.THREE_STAR_MULTIPLIER - 1) * rampT;

  // Streak bonus
  if (currentStreak >= NARRATIVE_ACCELERATION.STREAK_THRESHOLD) {
    multiplier *= NARRATIVE_ACCELERATION.STREAK_MULTIPLIER;
  }

  // Difficulty bonus
  if (difficulty === 'HARD') {
    multiplier *= NARRATIVE_ACCELERATION.HARD_MULTIPLIER;
  } else if (difficulty === 'MEDIUM_PLUS') {
    multiplier *= NARRATIVE_ACCELERATION.MEDIUM_PLUS_MULTIPLIER;
  } else if (difficulty === 'EASY') {
    multiplier *= NARRATIVE_ACCELERATION.EASY_MULTIPLIER;
  }

  // Trial rung bonus — Blind Offering (challenge limits + end-judged blind
  // play) takes the 2.0x cap; plain Challenge (previews on) counts 1.5x.
  // Not stacked: blind boards always run under gameMode 'challenge'.
  if (blind) {
    multiplier *= NARRATIVE_ACCELERATION.BLIND_MULTIPLIER;
  } else if (gameMode === 'challenge') {
    multiplier *= NARRATIVE_ACCELERATION.CHALLENGE_MULTIPLIER;
  }

  // Cap acceleration to prevent extreme phase skipping
  multiplier = Math.min(multiplier, 3.0);

  return multiplier;
}

/**
 * Award amber for completing a puzzle.
 *
 * When `creditToBalance` is false (default), the PER-PUZZLE amber reward
 * (`amount`) is NOT added to the player's spendable balance. All other side
 * effects (streak, phase progression, milestones, stats) still execute
 * normally. The caller is responsible for crediting the per-puzzle amber
 * later (e.g. via awardBonusAmber when the player offers words in the pit).
 *
 * One-time WINDFALLS (puzzle-count milestone, first-completion, streak
 * milestone) are the exception: they credit the spendable balance
 * IMMEDIATELY, regardless of `creditToBalance` — a "+150 Century milestone!"
 * is a moment, not a harvest, and must be spendable without a pit detour.
 * Only the per-puzzle amber stays deferred, preserving the pit ritual.
 * totalAmberEarned counts every part exactly once either way.
 *
 * When `options.skipPhaseProgress` is true, ALL normal amber math still runs
 * but the win accrues ZERO weighted phaseProgress — used for boards outside
 * the sanctioned pacing curve (e.g. shared-challenge-link wins, where
 * self-crafted trivial chains must never feed the narrative descent).
 * Amber-only, exactly like the Patron/surprise bonuses' hard rule.
 */
export async function awardPuzzleAmber(
  difficulty: Difficulty,
  starsEarned: number,
  gameMode: GameMode = 'standard',
  threeStarRate: number = 0,
  creditToBalance: boolean = false,
  options: {
    skipPhaseProgress?: boolean;
    /** Blind Offering win (challenge limits + end-judged blind play): pays the
     *  apex amber multiplier and the 2.0x phase-progress cap. */
    blind?: boolean;
    /**
     * Resonance bonus for the board (resonant deep-word choices, already
     * per-move-priced by the caller). Amber-only, REWARD-only: added to the
     * total and itemized, and — hard rule — NEVER feeds phase progression.
     * Defensively clamped to [0, RESONANT_BOARD_CAP_AMBER].
     */
    resonanceBonus?: number;
  } = {}
): Promise<{
  amount: number;
  baseAmount: number;
  /** Pure difficulty base (AMBER_REWARDS[difficulty]) before the star bonus. */
  baseAmber: number;
  /** Star-rating increment folded into baseAmount (baseAmber + starBonusAmber = baseAmount). */
  starBonusAmber: number;
  streakBonus: number;
  challengeBonus: number;
  patronBonus: number;
  surpriseBonus: number;
  /** Clamped resonance bonus actually credited (0 when none). */
  resonanceBonus: number;
  milestoneBonus: number;
  milestoneMessage: string | null;
  firstCompletionBonus: number;
  newBalance: number;
  phaseChanged: boolean;
  newPhase: DialoguePhase;
  currentStreak: number;
  puzzlesSolved: number;
  phaseAcceleration: number;
  streakMilestoneBonus: number;
  streakMilestoneMessage: string | null;
  streakSaved: boolean;
  phaseTransitionPending: boolean;
}> {
  const progress = await loadProgress();

  // Capture previous streak before updating
  const previousStreak = progress.currentStreak ?? 0;

  // Update streak first
  const currentStreak = await updateStreak();
  // Capture (and clear) whether a streak freeze was just consumed to save the streak.
  const streakSaved = streakFreezeJustConsumed;
  streakFreezeJustConsumed = false;

  // Base reward by difficulty
  const baseAmber = AMBER_REWARDS[difficulty];
  let baseAmount = baseAmber;

  // Star bonuses
  if (starsEarned === 3) {
    // 3 stars: +50%
    baseAmount = Math.floor(baseAmount * 1.5);
  } else if (starsEarned === 2) {
    // 2 stars: +25%
    baseAmount = Math.floor(baseAmount * 1.25);
  }
  // Itemized star increment (kept separate so display never re-derives the math)
  const starBonusAmber = baseAmount - baseAmber;

  // Apply streak bonus
  const streakMultiplier = calculateStreakMultiplier(currentStreak);
  let totalAmount = Math.floor(baseAmount * streakMultiplier);
  const streakBonus = totalAmount - baseAmount;

  // Apply the trial-rung bonus. Blind Offering (challenge limits + previews
  // hidden + end-judged free moves) is the apex rung and pays the top
  // multiplier; plain Challenge (previews on) pays the modest one. Never
  // stacked: a blind board runs under gameMode 'challenge'.
  let challengeBonus = 0;
  if (gameMode === 'challenge') {
    const rungMultiplier = options.blind
      ? CHALLENGE_MODE_CONFIG.BLIND_AMBER_MULTIPLIER
      : CHALLENGE_MODE_CONFIG.AMBER_MULTIPLIER;
    challengeBonus = Math.floor(totalAmount * (rungMultiplier - 1));
    totalAmount += challengeBonus;

    // Track challenge completions
    progress.challengeCompletions = (progress.challengeCompletions || 0) + 1;
  }

  // Patron's Key: flat per-puzzle amber bonus. Additive to the REWARD only — it must
  // never touch phase progression (computed separately below), so pacing is identical
  // for free and paid players (hard rule: no pay-to-skip-phases).
  let patronBonus = 0;
  if (isPatronSync()) {
    patronBonus = PATRON_AMBER_BONUS;
    totalAmount += patronBonus;
  }

  // Variable-ratio surprise bonus (every win past the onboarding window —
  // standard, challenge, and daily alike). Additive to the REWARD only; uses
  // the pre-increment puzzle count for the onboarding suppression check.
  // NEVER touches phase progression.
  const surpriseBonus = computeSurpriseBonus(difficulty, progress.puzzlesSolved);
  totalAmount += surpriseBonus;

  // Resonance bonus (evaluative depth: deepest-available dread word chosen when
  // a real choice existed). Additive to the REWARD only — like the Patron and
  // surprise bonuses it NEVER touches phase progression, so weighing options
  // pays amber, never a faster descent. Clamped defensively to the board cap.
  const rawResonance = options.resonanceBonus ?? 0;
  const resonanceBonus = Number.isFinite(rawResonance)
    ? Math.max(0, Math.min(Math.floor(rawResonance), RESONANT_BOARD_CAP_AMBER))
    : 0;
  totalAmount += resonanceBonus;

  if (creditToBalance) {
    progress.amber += totalAmount;
  }
  progress.totalAmberEarned += totalAmount;
  progress.puzzlesSolved += 1;

  // Calculate phase acceleration and update phase progress
  const phaseAcceleration = calculatePhaseAcceleration(
    threeStarRate, currentStreak, difficulty, gameMode, options.blind === true
  );
  // New Cycle: each completed descent makes the next one faster (dread earlier).
  // skipPhaseProgress: amber math above is untouched, but the win contributes
  // NOTHING to the weighted descent (phaseProgress stays exactly where it was).
  const phaseProgressIncrement = options.skipPhaseProgress === true
    ? 0
    : phaseAcceleration * getCycleAcceleration(progress.cycleCount ?? 0);
  // Initialize phaseProgress from puzzlesSolved for migrated players missing the field
  if (progress.phaseProgress === undefined || progress.phaseProgress === null) {
    progress.phaseProgress = progress.puzzlesSolved - 1; // -1 because we already incremented puzzlesSolved above
  }
  progress.phaseProgress += phaseProgressIncrement;

  // Check for milestone bonus (uses >= with last-claimed tracking to prevent skips/doubles)
  const milestone = checkMilestone(progress.puzzlesSolved, progress.lastClaimedMilestone ?? 0);
  let milestoneBonus = 0;
  let milestoneMessage: string | null = null;
  if (milestone) {
    milestoneBonus = milestone.amber;
    // Use phase-aware milestone message
    milestoneMessage = getMilestoneMessage(milestone, progress.currentPhase);
    // Windfall: credits the spendable balance IMMEDIATELY (never deferred to
    // the harvest batch — see the function doc). Amber-only, never phase progress.
    progress.amber += milestoneBonus;
    progress.totalAmberEarned += milestoneBonus;
    progress.lastClaimedMilestone = milestone.puzzles;

    // Record milestone transaction separately
    await recordTransaction({
      amount: milestoneBonus,
      type: 'earn',
      source: `milestone_${milestone.puzzles}`,
      timestamp: Date.now(),
    });
  }

  // Check for first-completion bonus (one-time per difficulty)
  let firstCompletionBonus = 0;
  const completedDiffs = progress.completedDifficulties ?? [];
  if (!completedDiffs.includes(difficulty)) {
    firstCompletionBonus = FIRST_COMPLETION_BONUS[difficulty];
    // Windfall: immediate credit, never deferred (see the function doc).
    progress.amber += firstCompletionBonus;
    progress.totalAmberEarned += firstCompletionBonus;
    progress.completedDifficulties = [...completedDiffs, difficulty];
    if (firstCompletionBonus > 0) {
      await recordTransaction({
        amount: firstCompletionBonus,
        type: 'earn',
        source: `first_completion_${difficulty.toLowerCase()}`,
        timestamp: Date.now(),
      });
    }
  }

  // Check for streak milestone bonus (one-time per milestone threshold)
  let streakMilestoneBonus = 0;
  let streakMilestoneMessage: string | null = null;
  const streakMilestone = checkStreakMilestone(currentStreak, previousStreak, progress.currentPhase);
  if (streakMilestone) {
    streakMilestoneBonus = streakMilestone.amber;
    streakMilestoneMessage = streakMilestone.message;
    // Windfall: immediate credit, never deferred (see the function doc).
    progress.amber += streakMilestoneBonus;
    progress.totalAmberEarned += streakMilestoneBonus;

    await recordTransaction({
      amount: streakMilestoneBonus,
      type: 'earn',
      source: `streak_milestone_${currentStreak}`,
      timestamp: Date.now(),
    });
  }

  // Check for phase transition using weighted phase progress
  // (effectivePhaseFor pins phase 5 once post-revelation).
  const previousPhase = progress.currentPhase;
  const effectiveProgress = progress.phaseProgress ?? progress.puzzlesSolved;
  let newPhase = effectivePhaseFor(progress);
  // Prevent phase skipping — only advance one phase at a time
  if (newPhase > previousPhase + 1) {
    newPhase = (previousPhase + 1) as DialoguePhase;
  }
  // Only signal a phase change if this is a NEW transition (no pending one queued yet).
  // If a pending transition already exists, the player must confirm it in the pit first.
  const phaseChanged = newPhase > previousPhase && progress.pendingPhaseTransition == null;

  // DEFERRED PHASE TRANSITION: Don't bump currentPhase directly.
  // Store as pending — the Offering Pit confirms the transition.
  if (phaseChanged) {
    progress.pendingPhaseTransition = newPhase;
    // currentPhase stays at the old value until confirmPhaseTransition() is called
  }

  // Always update phaseProgressFraction for pit ward mark visuals
  if (progress.currentPhase < 4) {
    const currentThreshold = PHASE_THRESHOLDS[progress.currentPhase];
    const nextPhaseIdx = (progress.currentPhase + 1) as DialoguePhase;
    const nextThreshold = PHASE_THRESHOLDS[nextPhaseIdx];
    const nextMinPuzzles = MIN_PUZZLES_FOR_PHASE[nextPhaseIdx];
    const currentMinPuzzles = MIN_PUZZLES_FOR_PHASE[progress.currentPhase];
    const progressRange = nextThreshold - currentThreshold;
    const puzzleRange = nextMinPuzzles - currentMinPuzzles;

    const weightedFraction = progressRange > 0
      ? Math.min(1, (effectiveProgress - currentThreshold) / progressRange)
      : 0;
    const puzzleFraction = puzzleRange > 0
      ? Math.min(1, (progress.puzzlesSolved - currentMinPuzzles) / puzzleRange)
      : 0;

    // Use the lesser of the two (weighted progress vs puzzle exposure gate)
    progress.phaseProgressFraction = Math.min(weightedFraction, puzzleFraction);

    // Clamp to 1.0 if transition is pending
    if (progress.pendingPhaseTransition != null) {
      progress.phaseProgressFraction = 1.0;
    }
  } else {
    progress.phaseProgressFraction = 1.0;
  }

  progressCache = progress;
  await saveProgress();

  // Record puzzle transaction
  await recordTransaction({
    amount: totalAmount,
    type: 'earn',
    source: `puzzle_${difficulty.toLowerCase()}${gameMode === 'challenge' ? '_challenge' : ''}${streakBonus > 0 ? `_streak${currentStreak}` : ''}`,
    timestamp: Date.now(),
  });

  return {
    amount: totalAmount,
    baseAmount,
    baseAmber,
    starBonusAmber,
    streakBonus,
    challengeBonus,
    patronBonus,
    surpriseBonus,
    resonanceBonus,
    milestoneBonus,
    milestoneMessage,
    firstCompletionBonus,
    newBalance: progress.amber,
    phaseChanged,
    newPhase,
    currentStreak,
    puzzlesSolved: progress.puzzlesSolved,
    phaseAcceleration,
    streakMilestoneBonus,
    streakMilestoneMessage,
    streakSaved,
    phaseTransitionPending: phaseChanged || progress.pendingPhaseTransition != null,
  };
}

// Guard against concurrent spend operations
let spendInProgress = false;

/**
 * Spend amber on an unlock
 * Protected against concurrent calls with a guard flag
 */
export async function spendAmber(
  amount: number,
  targetId: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  if (spendInProgress) {
    return {
      success: false,
      newBalance: progressCache?.amber ?? 0,
      error: 'Transaction in progress',
    };
  }

  spendInProgress = true;
  try {
    const progress = await loadProgress();

    if (progress.amber < amount) {
      return {
        success: false,
        newBalance: progress.amber,
        error: 'Not enough amber',
      };
    }

    progress.amber -= amount;
    progressCache = progress;
    await saveProgress();

    await recordTransaction({
      amount,
      type: 'spend',
      source: targetId,
      timestamp: Date.now(),
    });

    return {
      success: true,
      newBalance: progress.amber,
    };
  } finally {
    spendInProgress = false;
  }
}

/**
 * Unlock an animal
 */
export async function unlockAnimal(animalId: string, cost: number): Promise<boolean> {
  const result = await spendAmber(cost, `animal_${animalId}`);
  if (!result.success) return false;

  const progress = await loadProgress();
  if (!progress.unlockedAnimals.includes(animalId)) {
    progress.unlockedAnimals.push(animalId);
    progressCache = progress;
    await saveProgress();
  }

  return true;
}

/**
 * Unlock a room
 */
export async function unlockRoom(roomId: string, cost: number): Promise<boolean> {
  const result = await spendAmber(cost, `room_${roomId}`);
  if (!result.success) return false;

  const progress = await loadProgress();
  if (!progress.unlockedRooms.includes(roomId)) {
    progress.unlockedRooms.push(roomId);
    progressCache = progress;
    await saveProgress();
  }

  return true;
}

// ---------------------------------------------------------------------------
// Reserve-ahead: spend amber now for a puzzle-gated unlock, claim it when the
// gate opens. Keeps a skilled/rich player from staring at idle amber + a wall.
// ---------------------------------------------------------------------------

/**
 * Reserve a puzzle-gated unlock by paying its cost up front. Spends amber and
 * records the reservation; the actual room/animal is committed later by
 * `claimReservedUnlock` once the level gate opens. The CALLER (homeWorldData)
 * validates that this is a legal "next, gated, affordable, unreserved" unlock.
 */
export async function reserveUnlock(
  unlockId: string,
  cost: number,
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const result = await spendAmber(cost, `reserve_${unlockId}`);
  if (!result.success) {
    return { success: false, newBalance: result.newBalance, error: result.error };
  }
  const progress = await loadProgress();
  progress.reservedUnlockId = unlockId;
  progressCache = progress;
  await saveProgress();
  return { success: true, newBalance: progress.amber };
}

/** The currently reserved unlock id (null when nothing is reserved). */
export async function getReservedUnlockId(): Promise<string | null> {
  const progress = await loadProgress();
  return progress.reservedUnlockId ?? null;
}

/** Synchronous reserved-unlock id off the cache (null until warmed). */
export function getReservedUnlockIdSync(): string | null {
  return progressCache?.reservedUnlockId ?? null;
}

/**
 * Commit a previously-reserved target into the unlocked list WITHOUT spending
 * (it was paid for at reserve time) and clear the reservation. Idempotent.
 */
export async function claimReservedUnlock(
  targetId: string,
  type: 'room' | 'character',
): Promise<void> {
  const progress = await loadProgress();
  if (type === 'character') {
    if (!progress.unlockedAnimals.includes(targetId)) progress.unlockedAnimals.push(targetId);
  } else {
    if (!progress.unlockedRooms.includes(targetId)) progress.unlockedRooms.push(targetId);
  }
  progress.reservedUnlockId = null;
  progressCache = progress;
  await saveProgress();
}

/** Clear any reservation without committing (e.g. Reset All; refunds nothing). */
export async function clearReservedUnlock(): Promise<void> {
  const progress = await loadProgress();
  progress.reservedUnlockId = null;
  progressCache = progress;
  await saveProgress();
}

function applyPuzzleExposureGuard(
  candidatePhase: DialoguePhase,
  puzzlesSolved: number
): DialoguePhase {
  let guarded = candidatePhase;
  while (guarded > 0 && puzzlesSolved < MIN_PUZZLES_FOR_PHASE[guarded]) {
    guarded = (guarded - 1) as DialoguePhase;
  }
  return guarded;
}

/**
 * Calculate current dialogue phase based on effective progress.
 * Uses phaseProgress (weighted) and then enforces minimum puzzle exposure.
 */
function calculatePhase(effectiveProgress: number, puzzlesSolved: number): DialoguePhase {
  let candidate: DialoguePhase = 0;
  if (effectiveProgress >= PHASE_THRESHOLDS[4]) candidate = 4;
  else if (effectiveProgress >= PHASE_THRESHOLDS[3]) candidate = 3;
  else if (effectiveProgress >= PHASE_THRESHOLDS[2]) candidate = 2;
  else if (effectiveProgress >= PHASE_THRESHOLDS[1]) candidate = 1;
  return applyPuzzleExposureGuard(candidate, puzzlesSolved);
}

/**
 * Effective dialogue phase for a progress snapshot. Post-revelation
 * permanently pins the world at phase 5 — calculatePhase caps at 4 and must
 * never win once the revelation has happened. EVERY phase recompute
 * (award-time, dev tools, load-time self-heal, markPostRevelation) routes
 * through this helper so the invariant lives in exactly one place.
 */
function effectivePhaseFor(progress: HomeWorldProgress): DialoguePhase {
  if (progress.postRevelation === true) return 5;
  const effectiveProgress = progress.phaseProgress ?? progress.puzzlesSolved;
  return calculatePhase(effectiveProgress, progress.puzzlesSolved);
}

/**
 * Get current phase
 */
export async function getCurrentPhase(): Promise<DialoguePhase> {
  const progress = await loadProgress();
  return progress.currentPhase;
}

/**
 * Log a `phase_reached` telemetry event with the player's install age, via the
 * standard logEvent pathway. Guarded lazy require: logging must never block or
 * break a phase transition, and test doubles of eventLogger may predate the
 * getInstallAgeDays export (optional-chained for that reason).
 */
async function logPhaseReached(phase: DialoguePhase, puzzlesSolved: number): Promise<void> {
  try {
    const eventLogger = require('./eventLogger') as typeof import('./eventLogger');
    const installAgeDays = (await eventLogger.getInstallAgeDays?.()) ?? -1;
    eventLogger.logEvent?.({
      type: 'phase_reached',
      data: { phase, puzzlesSolved, installAgeDays },
    });
  } catch {
    // Telemetry is non-critical.
  }
}

/**
 * Confirm a pending phase transition (called from the pit screen).
 * Bumps currentPhase to the pending value and clears the pending flag.
 * Returns the new phase and previous phase, or null if no pending transition.
 */
export async function confirmPhaseTransition(): Promise<{
  newPhase: DialoguePhase;
  previousPhase: DialoguePhase;
} | null> {
  const progress = await loadProgress();
  const pending = progress.pendingPhaseTransition;

  if (pending == null) return null;

  const previousPhase = progress.currentPhase;
  progress.currentPhase = pending;
  progress.pendingPhaseTransition = null;
  progress.phaseProgressFraction = 0; // Reset for next phase

  progressCache = progress;
  await saveProgress();

  // Reset pit nudge so the next pending transition can show a new one
  await AsyncStorage.removeItem(PIT_NUDGE_SEEN_KEY).catch(() => {});

  // Funnel telemetry: how deep (puzzles) and how old (days) players are when
  // each phase actually lands.
  await logPhaseReached(pending, progress.puzzlesSolved);

  return { newPhase: pending, previousPhase };
}

/**
 * Check if there's a pending phase transition.
 * Returns the target phase or null.
 */
export async function getPendingPhaseTransition(): Promise<DialoguePhase | null> {
  const progress = await loadProgress();
  return progress.pendingPhaseTransition ?? null;
}

/**
 * Get the normalized progress fraction toward the next phase (0.0 to 1.0).
 * Used by the pit screen to drive ward mark illumination.
 */
export async function getPhaseProgressFraction(): Promise<number> {
  const progress = await loadProgress();
  return progress.phaseProgressFraction ?? 0;
}

/**
 * Get puzzles until next phase
 */
export async function getPuzzlesUntilNextPhase(): Promise<number | null> {
  const progress = await loadProgress();
  const currentPhase = progress.currentPhase;

  if (currentPhase >= 4) return null; // Max phase reached

  const nextThreshold = PHASE_THRESHOLDS[currentPhase + 1];
  const nextPuzzleMinimum = MIN_PUZZLES_FOR_PHASE[(currentPhase + 1) as DialoguePhase];
  const effectiveProgress = progress.phaseProgress ?? progress.puzzlesSolved;
  const weightedRemaining = Math.max(0, nextThreshold - effectiveProgress);
  const puzzleRemaining = Math.max(0, nextPuzzleMinimum - progress.puzzlesSolved);
  return Math.max(weightedRemaining, puzzleRemaining);
}

/**
 * Record an amber transaction for history
 */
async function recordTransaction(transaction: AmberTransaction): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    const transactions: AmberTransaction[] = stored ? JSON.parse(stored) : [];

    transactions.push(transaction);

    // Keep last 100 transactions
    if (transactions.length > 100) {
      transactions.splice(0, transactions.length - 100);
    }

    await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.warn('Failed to record transaction:', error);
  }
}

/**
 * Get full progress data
 */
export async function getFullProgress(): Promise<HomeWorldProgress> {
  return loadProgress();
}

/**
 * Mark dialogue as read for an animal
 */
export async function markDialogueRead(animalId: string, dialogueIndex: number): Promise<void> {
  const progress = await loadProgress();
  progress.lastDialogueRead[animalId] = dialogueIndex;
  progressCache = progress;
  await saveProgress();
}

/**
 * Check if an animal's intro dialogue has been seen
 */
export async function hasSeenIntro(animalId: string): Promise<boolean> {
  const progress = await loadProgress();
  // Handle old progress data that doesn't have introsSeen array
  if (!progress.introsSeen) {
    progress.introsSeen = [];
  }
  return progress.introsSeen.includes(animalId);
}

/**
 * Mark an animal's intro dialogue as seen
 */
export async function markIntroSeen(animalId: string): Promise<void> {
  const progress = await loadProgress();
  // Handle old progress data that doesn't have introsSeen array
  if (!progress.introsSeen) {
    progress.introsSeen = [];
  }
  if (!progress.introsSeen.includes(animalId)) {
    progress.introsSeen.push(animalId);
    progressCache = progress;
    await saveProgress();
  }
}

/**
 * Get current streak info
 */
export async function getStreakInfo(): Promise<{
  currentStreak: number;
  lastPlayDate: string | null;
  streakMultiplier: number;
  bonusPercentage: number;
}> {
  const progress = await loadProgress();
  const streak = progress.currentStreak || 0;
  const multiplier = calculateStreakMultiplier(streak);
  return {
    currentStreak: streak,
    lastPlayDate: progress.lastPlayDate || null,
    streakMultiplier: multiplier,
    bonusPercentage: Math.round((multiplier - 1) * 100),
  };
}

/**
 * Clear all progress (for testing/reset)
 */
export async function clearProgress(): Promise<void> {
  try {
    progressCache = getDefaultProgress();
    await AsyncStorage.removeItem(PROGRESS_STORAGE_KEY);
    await AsyncStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    await AsyncStorage.removeItem(DAILY_CHALLENGE_INTRO_SEEN_KEY);
    await AsyncStorage.removeItem(CHALLENGE_INTRO_SEEN_KEY);
    await AsyncStorage.removeItem(FOX_PLAY_NUDGE_SEEN_KEY);
    await AsyncStorage.removeItem(PIT_NUDGE_SEEN_KEY);
    await AsyncStorage.removeItem(PIT_HARVEST_INTRO_SEEN_KEY);
    await AsyncStorage.removeItem(MANDATORY_HARVEST_SEEN_KEY);
    await AsyncStorage.removeItem(SETUP_SELECTOR_INTRO_SEEN_KEY);
    await AsyncStorage.removeItem(JOURNAL_INTRO_SEEN_KEY);
    await AsyncStorage.removeItem(STARTER_INTRO_SEEN_KEY);
    await AsyncStorage.removeItem(FIRST_WIN_GLITCH_KEY);
    await AsyncStorage.removeItem(GATED_UNLOCK_INTRO_SEEN_KEY);
    await AsyncStorage.removeItem(HARVEST_HOME_INTRO_SEEN_KEY);
    for (let i = 1; i <= 4; i++) {
      await AsyncStorage.removeItem(`wordshift_guaranteed_crossref_phase_${i}`);
    }
    await clearPlayedPuzzles();
  } catch (error) {
    console.warn('Failed to clear progress:', error);
  }
}

/**
 * Check if player can afford an unlock
 */
export async function canAfford(cost: number): Promise<boolean> {
  const progress = await loadProgress();
  return progress.amber >= cost;
}

// ============================================================================
// RITUAL TRACKING - The incantation ledger
// ============================================================================

/**
 * Record words from a completed puzzle into the ritual ledger.
 * Tracks all words ever formed, trigger words for animal reactions,
 * and accumulated ritual energy.
 *
 * @param words All words from the completed puzzle chain
 * @param ritualEnergy The ritual energy score of this puzzle (0-10)
 * @param triggerWords Notable words that animals may react to
 */
export async function recordRitualWords(
  words: string[],
  ritualEnergy: number,
  triggerWords: string[]
): Promise<{
  totalWordsFormed: number;
  totalRitualEnergy: number;
  triggerWordQueue: string[];
}> {
  const progress = await loadProgress();

  // Initialize ritual tracking fields
  if (!progress.ritualWords) progress.ritualWords = [];
  if (!progress.totalWordsFormed) progress.totalWordsFormed = 0;
  if (!progress.ritualEnergy) progress.ritualEnergy = 0;
  if (!progress.triggerWordQueue) progress.triggerWordQueue = [];

  // Add words to the ritual ledger (keep last 500 words to prevent unbounded growth)
  const upperWords = words.map(w => w.toUpperCase());
  progress.ritualWords.push(...upperWords);
  if (progress.ritualWords.length > 500) {
    progress.ritualWords = progress.ritualWords.slice(-500);
  }

  // Update total count
  progress.totalWordsFormed += words.length;

  // Accumulate ritual energy
  progress.ritualEnergy += ritualEnergy;

  // Add trigger words to queue (keep last 20 for animal reactions)
  progress.triggerWordQueue.push(...triggerWords);
  if (progress.triggerWordQueue.length > 20) {
    progress.triggerWordQueue = progress.triggerWordQueue.slice(-20);
  }

  // Apply ritual energy as a bonus to phase progress.
  // IMPORTANT: this is a SECOND, separate accelerator that stacks on top of the
  // weighted acceleration in calculatePhaseAcceleration() (applied at amber-award
  // time). Each point of ritual energy adds 0.1 here, so a high-dread puzzle
  // (ritualEnergy is clamped 0-10 upstream) contributes up to +1.0 phaseProgress
  // ON TOP OF the normal curve. Kept intentionally for now; the magnitude should
  // be retuned with live data during the economy rebalance rather than tweaked
  // blind (the phase-threshold tests pin the current numbers).
  if (ritualEnergy > 0) {
    progress.phaseProgress = (progress.phaseProgress ?? 0) + ritualEnergy * 0.1;
  }

  progressCache = progress;
  await saveProgress();

  return {
    totalWordsFormed: progress.totalWordsFormed,
    totalRitualEnergy: progress.ritualEnergy,
    triggerWordQueue: progress.triggerWordQueue,
  };
}

/**
 * Get the ritual ledger - all words the player has formed
 */
export async function getRitualWords(): Promise<string[]> {
  const progress = await loadProgress();
  return progress.ritualWords || [];
}

/**
 * Get total words ever formed
 */
export async function getTotalWordsFormed(): Promise<number> {
  const progress = await loadProgress();
  return progress.totalWordsFormed || 0;
}

/**
 * Get and clear trigger words from the queue for a specific animal.
 * Only consumes words that match the animal's trigger word list,
 * leaving other words in the queue for their respective animals.
 * This way one puzzle with FLAME, WATER, and DIG creates 3 separate
 * animal reactions instead of 1.
 *
 * @param animalType Optional animal type to filter by. If omitted, consumes all (legacy behavior).
 */
export async function consumeTriggerWords(animalType?: string): Promise<string[]> {
  const progress = await loadProgress();
  const queue = progress.triggerWordQueue || [];

  if (!animalType) {
    // Legacy: consume all
    progress.triggerWordQueue = [];
    progressCache = progress;
    await saveProgress();
    return queue;
  }

  // Import the animal's trigger words dynamically to avoid circular deps
  // We access ANIMAL_TRIGGER_WORDS from homeWorld types
  const { ANIMAL_TRIGGER_WORDS } = require('../types/homeWorld');
  const animalTriggers: string[] | undefined = ANIMAL_TRIGGER_WORDS[animalType];
  if (!animalTriggers || animalTriggers.length === 0) {
    return [];
  }

  const triggerSet = new Set(animalTriggers.map((w: string) => w.toUpperCase()));

  // Partition: matching words for this animal vs remaining for others
  const consumed: string[] = [];
  const remaining: string[] = [];
  for (const word of queue) {
    if (triggerSet.has(word.toUpperCase())) {
      consumed.push(word);
    } else {
      remaining.push(word);
    }
  }

  progress.triggerWordQueue = remaining;
  progressCache = progress;
  await saveProgress();
  return consumed;
}

/**
 * Queue a newly encountered variant so an animal can explain it in dialogue.
 * This is one-time per variant key to avoid repetitive tutorial chatter.
 */
export async function recordVariantEncounter(variant: string): Promise<void> {
  if (!variant || variant === 'standard') return;
  const progress = await loadProgress();
  if (!progress.pendingVariantTutorials) progress.pendingVariantTutorials = [];
  if (!progress.seenVariantTutorials) progress.seenVariantTutorials = [];

  if (
    progress.pendingVariantTutorials.includes(variant) ||
    progress.seenVariantTutorials.includes(variant)
  ) {
    return;
  }

  progress.pendingVariantTutorials.push(variant);
  // Keep queue small and focused on recent mechanics.
  if (progress.pendingVariantTutorials.length > 8) {
    progress.pendingVariantTutorials = progress.pendingVariantTutorials.slice(-8);
  }

  progressCache = progress;
  await saveProgress();
}

/**
 * Consume the next pending variant tutorial key.
 * Marks it as seen immediately to prevent repeats.
 */
export async function consumePendingVariantTutorial(): Promise<string | null> {
  const progress = await loadProgress();
  if (!progress.pendingVariantTutorials) progress.pendingVariantTutorials = [];
  if (!progress.seenVariantTutorials) progress.seenVariantTutorials = [];

  const next = progress.pendingVariantTutorials.shift();
  if (!next) {
    return null;
  }

  if (!progress.seenVariantTutorials.includes(next)) {
    progress.seenVariantTutorials.push(next);
  }

  progressCache = progress;
  await saveProgress();
  return next;
}

/**
 * Persist the player's preferred puzzle variant for future runs.
 */
export async function setPreferredPuzzleVariant(variant: string): Promise<void> {
  if (!variant) return;
  const progress = await loadProgress();
  progress.preferredPuzzleVariant = variant;
  progressCache = progress;
  await saveProgress();
}

/**
 * Load the player's preferred puzzle variant key.
 */
export async function getPreferredPuzzleVariant(): Promise<string> {
  const progress = await loadProgress();
  return progress.preferredPuzzleVariant || 'standard';
}

/**
 * Apply the variant amber bonus. The full configured multiplier always applies
 * (the old anti-farm decay is gone) and, once per local day per variant, a flat
 * FRESH_VARIANT_BONUS_AMBER is added on top — so rotating between variants reads
 * as REWARDED rather than "why is my bonus shrinking". Amber only; never phase
 * progress. `freshBonus`/`isFresh` let the victory modal surface the moment.
 *
 * When `creditToBalance` is false, nothing is added to spendable amber — the
 * caller credits later (the harvest-batch path).
 */
export async function applyVariantAmberBonus(
  variant: string,
  baseAmberAward: number,
  configuredMultiplier: number,
  creditToBalance: boolean = false
): Promise<{
  bonus: number;
  freshBonus: number;
  isFresh: boolean;
  newBalance: number;
  appliedMultiplier: number;
  repeatCount: number;
  /** @deprecated always 1.0 — repeat decay removed in favor of the fresh bonus. */
  repeatDecay: number;
}> {
  const progress = await loadProgress();
  if (progress.lastVariantPlayed === undefined) progress.lastVariantPlayed = 'standard';

  if (!variant || variant === 'standard' || configuredMultiplier <= 1.0 || baseAmberAward <= 0) {
    progress.lastVariantPlayed = variant || 'standard';
    progressCache = progress;
    await saveProgress();
    return {
      bonus: 0,
      freshBonus: 0,
      isFresh: false,
      newBalance: progress.amber,
      appliedMultiplier: 1.0,
      repeatCount: 0,
      repeatDecay: 1.0,
    };
  }

  // Full multiplier, no decay.
  const bonus = Math.max(0, Math.round(baseAmberAward * (configuredMultiplier - 1)));

  // Once-per-day-per-variant fresh bonus.
  const today = getLocalDateString();
  if (!progress.variantFreshDates) progress.variantFreshDates = {};
  const isFresh = progress.variantFreshDates[variant] !== today;
  const freshBonus = isFresh ? FRESH_VARIANT_BONUS_AMBER : 0;
  if (isFresh) progress.variantFreshDates[variant] = today;

  const totalBonus = bonus + freshBonus;
  progress.lastVariantPlayed = variant;
  if (creditToBalance) {
    progress.amber += totalBonus;
  }
  progress.totalAmberEarned += totalBonus;
  progressCache = progress;
  await saveProgress();

  if (bonus > 0) {
    await recordTransaction({
      amount: bonus,
      type: 'earn',
      source: `variant_${variant}_x${configuredMultiplier.toFixed(2)}`,
      timestamp: Date.now(),
    });
  }
  if (freshBonus > 0) {
    await recordTransaction({
      amount: freshBonus,
      type: 'earn',
      source: `variant_fresh_${variant}`,
      timestamp: Date.now(),
    });
  }

  return {
    bonus,
    freshBonus,
    isFresh,
    newBalance: progress.amber,
    appliedMultiplier: configuredMultiplier,
    repeatCount: 0,
    repeatDecay: 1.0,
  };
}

/**
 * Record a completed puzzle's variant/blind flags for the variant achievements
 * and the variant-offer nudge. Standard non-blind wins are a no-op. Idempotent
 * per call (one win = one increment).
 */
export async function recordVariantWin(variant: string, blind: boolean): Promise<void> {
  if ((!variant || variant === 'standard') && !blind) return;
  const progress = await loadProgress();
  if (variant && variant !== 'standard') {
    if (!progress.variantWins) progress.variantWins = {};
    progress.variantWins[variant] = (progress.variantWins[variant] || 0) + 1;
  }
  if (blind) {
    progress.blindWins = (progress.blindWins || 0) + 1;
  }
  progressCache = progress;
  await saveProgress();
}

/** Read per-variant + blind lifetime win counts (for achievements / nudges). */
export async function getVariantWinStats(): Promise<{ variantWins: Record<string, number>; blindWins: number }> {
  const progress = await loadProgress();
  return {
    variantWins: progress.variantWins || {},
    blindWins: progress.blindWins || 0,
  };
}

/**
 * Pure picker: the first unlocked non-standard variant the player has NEVER won
 * (a never-tried unlocked mode), or null. Kept pure for testing.
 */
export function pickNudgeVariant(
  unlockedVariants: string[],
  variantWins: Record<string, number>
): string | null {
  for (const v of unlockedVariants) {
    if (v === 'standard') continue;
    if ((variantWins[v] || 0) === 0) return v;
  }
  return null;
}

/**
 * The variant-offer nudge: once per local day, after a STANDARD board, suggest
 * a variant the player has unlocked but never won. Marks the nudge date so it
 * fires at most once/day. Returns the variant key to suggest, or null.
 * (The setup menu's teased locked rows are the always-visible complement.)
 */
export async function consumeVariantNudge(
  unlockedVariants: string[],
  justPlayedVariant: string
): Promise<string | null> {
  // Don't nudge mid-variant-play — only when the player is on the default path.
  if (justPlayedVariant && justPlayedVariant !== 'standard') return null;
  const progress = await loadProgress();
  const today = getLocalDateString();
  if (progress.lastVariantNudgeDate === today) return null;
  const candidate = pickNudgeVariant(unlockedVariants, progress.variantWins || {});
  if (!candidate) return null;
  progress.lastVariantNudgeDate = today;
  progressCache = progress;
  await saveProgress();
  return candidate;
}

/**
 * Get total accumulated ritual energy
 */
export async function getTotalRitualEnergy(): Promise<number> {
  const progress = await loadProgress();
  return progress.ritualEnergy || 0;
}

/**
 * Mark house as completed (every room + every animal)
 */
export async function markHouseCompleted(): Promise<void> {
  const progress = await loadProgress();
  progress.houseCompleted = true;
  progressCache = progress;
  await saveProgress();
}

/**
 * Check if house is fully completed
 */
export async function isHouseCompleted(): Promise<boolean> {
  const progress = await loadProgress();
  return progress.houseCompleted === true;
}

/**
 * Mark the final puzzle as completed (deep Phase 4 endgame).
 * Also disarms the finale: the marked final board has been served and won,
 * so no further board start may claim it (single write — crash-atomic).
 */
export async function markFinalPuzzleCompleted(): Promise<void> {
  const progress = await loadProgress();
  progress.finalPuzzleCompleted = true;
  progress.finaleArmed = false;
  progressCache = progress;
  await saveProgress();
}

/**
 * Check if the final puzzle has been completed
 */
export async function isFinalPuzzleCompleted(): Promise<boolean> {
  const progress = await loadProgress();
  return progress.finalPuzzleCompleted === true;
}

/**
 * Whether a completed Phase-4 win may arm the finale. Both conditions are
 * required: the capped dwell window must be full, and the run must reach the
 * puzzle-160 arming floor.
 */
export function canArmFinale(dwellCount: number, completedTotal: number): boolean {
  return dwellCount >= FINALE_DWELL_PUZZLES && completedTotal >= FINALE_ARM_MIN_PUZZLES;
}

/**
 * Arm the finale: the capped Phase-4 dwell window is full and the arming floor
 * is reached. With house completion/recruit around 136 and dwell completion
 * around 143, the NEXT standard board is ~161 and post-revelation is ~162.
 * This avoids firing retroactively on an ordinary win. Idempotent; no-op once
 * the final puzzle is already completed.
 */
export async function armFinale(): Promise<void> {
  const progress = await loadProgress();
  if (progress.finalPuzzleCompleted === true) return;
  progress.finaleArmed = true;
  progressCache = progress;
  await saveProgress();
}

/** Whether the finale is armed (the next standard board is THE final board). */
export async function isFinaleArmed(): Promise<boolean> {
  const progress = await loadProgress();
  return progress.finaleArmed === true && progress.finalPuzzleCompleted !== true;
}

/**
 * Mark post-revelation state (Phase 5)
 */
export async function markPostRevelation(): Promise<void> {
  const progress = await loadProgress();
  progress.postRevelation = true;
  // Phase 5 is read directly from currentPhase by the home/dialogue path
  // (useDialogueFlow, HomeScreen, homeWorldData) — pin it here.
  progress.currentPhase = effectivePhaseFor(progress);
  progress.pendingPhaseTransition = null;
  retireUnlockedRegularDialogue(progress);
  progressCache = progress;
  await saveProgress();

  // Phase 5 arrives via this pin (never confirmPhaseTransition) — log it here.
  await logPhaseReached(progress.currentPhase, progress.puzzlesSolved);
}

/**
 * Check if post-revelation (Phase 5) is active
 */
export async function isPostRevelation(): Promise<boolean> {
  const progress = await loadProgress();
  return progress.postRevelation === true;
}

// ============================================================================
// NEW CYCLE (NG+)
// ============================================================================

/** How many descents the player has completed (0 = first playthrough). */
export async function getCycleCount(): Promise<number> {
  const progress = await loadProgress();
  return progress.cycleCount ?? 0;
}

/**
 * If a New Cycle has begun whose opening beat hasn't been shown yet, mark it
 * shown and return the cycle number (so App can announce it once). Otherwise
 * null. Fires exactly once per new cycle.
 */
export async function consumeCycleOpening(): Promise<number | null> {
  const progress = await loadProgress();
  const cycle = progress.cycleCount ?? 0;
  if (cycle >= 1 && (progress.cycleOpeningSeen ?? 0) !== cycle) {
    progress.cycleOpeningSeen = cycle;
    progressCache = progress;
    await saveProgress();
    return cycle;
  }
  return null;
}

/** Phase-progress multiplier from completed cycles (each cycle descends faster). */
export function getCycleAcceleration(cycleCount: number): number {
  return Math.min(
    NEW_CYCLE_ACCELERATION_MAX,
    1 + Math.max(0, cycleCount) * NEW_CYCLE_ACCELERATION_PER_CYCLE
  );
}

/**
 * Whether the player has reached the true end of the current descent and can
 * begin a New Cycle: the house is complete, the finale has been played, and
 * they are post-revelation (Phase 5). "The pattern continues."
 */
export async function canStartNewCycle(): Promise<boolean> {
  const progress = await loadProgress();
  return (
    progress.postRevelation === true &&
    progress.houseCompleted === true &&
    progress.finalPuzzleCompleted === true
  );
}

/**
 * Begin a New Cycle (NG+). Resets ONLY the narrative-progression state so the
 * descent replays from the bright days — phase, phase progress, the finale /
 * post-revelation pins, the dwell counter, and the progress-owned dialogue
 * bookkeeping (read indices, consumed coordinated events, trigger queue). The
 * COLLECTION is deliberately kept: amber, totalAmberEarned, unlocked rooms and
 * animals (the house stays built), streak, puzzlesSolved, and everything owned
 * by other services (cosmetics, achievements, stats). The cycle counter drives
 * a faster descent (dread earlier) via getCycleAcceleration.
 *
 * Cross-service narrative state (dialogue sessions, narrative delivery, offering
 * requests, micro-beats) is reset by the CALLER (App) so those services stay in
 * charge of their own storage — mirroring the partial-reset convention.
 *
 * No-op (returns the current count) unless canStartNewCycle() would be true.
 */
export async function startNewCycle(): Promise<number> {
  const progress = await loadProgress();
  if (
    progress.postRevelation !== true ||
    progress.houseCompleted !== true ||
    progress.finalPuzzleCompleted !== true
  ) {
    return progress.cycleCount ?? 0;
  }

  progress.cycleCount = (progress.cycleCount ?? 0) + 1;
  // Anchor the cycle-relative puzzle count: puzzlesSolved is kept (it's the
  // collection's history), so cycle-scoped beats subtract this baseline.
  progress.cycleStartPuzzles = progress.puzzlesSolved;
  // Re-descend from the bright days.
  progress.currentPhase = 0;
  progress.phaseProgress = 0;
  progress.phaseProgressFraction = 0;
  progress.pendingPhaseTransition = null;
  progress.phasePuzzleThresholds = [...PHASE_THRESHOLDS];
  progress.phase4Dwell = 0;
  // Clear the endgame pins so the finale + post-revelation can fire again.
  progress.postRevelation = false;
  progress.finalPuzzleCompleted = false;
  progress.finaleArmed = false;
  // Dialogue replays from the top; drop the progress-owned dialogue bookkeeping.
  progress.lastDialogueRead = {};
  progress.consumedCoordinatedEvents = [];
  progress.triggerWordQueue = [];

  progressCache = progress;
  await saveProgress();
  return progress.cycleCount;
}

/**
 * Record one Phase-4 "dwell" puzzle (a victory at Phase 4 with the house
 * complete and the finale not yet fired) and return the capped new count. The
 * eight-win dwell completes around 143 after house completion/recruit around
 * 136; the separate puzzle-160 arming floor preserves the later final board
 * (~161) and post-revelation (~162). Callers should only invoke it on the
 * exact victory path that would otherwise trigger the finale.
 */
export async function recordPhase4Dwell(): Promise<number> {
  const progress = await loadProgress();
  progress.phase4Dwell = Math.min(
    (progress.phase4Dwell ?? 0) + 1,
    FINALE_DWELL_PUZZLES
  );
  progressCache = progress;
  await saveProgress();
  return progress.phase4Dwell;
}

/** Current Phase-4 dwell count (see recordPhase4Dwell). */
export async function getPhase4DwellCount(): Promise<number> {
  const progress = await loadProgress();
  return progress.phase4Dwell ?? 0;
}

/**
 * Mark tutorial seeds as planted (for Phase 4 callbacks)
 */
export async function markTutorialSeedsPlanted(): Promise<void> {
  const progress = await loadProgress();
  progress.tutorialSeedsPlanted = true;
  progressCache = progress;
  await saveProgress();
}

/**
 * Check if tutorial seeds were planted
 */
export async function wereTutorialSeedsPlanted(): Promise<boolean> {
  const progress = await loadProgress();
  return progress.tutorialSeedsPlanted === true;
}

/**
 * Record a coordinated dialogue event as consumed so it doesn't fire again.
 */
export async function recordConsumedCoordinatedEvent(theme: string): Promise<void> {
  const progress = await loadProgress();
  if (!progress.consumedCoordinatedEvents) {
    progress.consumedCoordinatedEvents = [];
  }
  if (!progress.consumedCoordinatedEvents.includes(theme)) {
    progress.consumedCoordinatedEvents.push(theme);
  }
  progressCache = progress;
  await saveProgress();
}

/**
 * Get consumed coordinated events
 */
export async function getConsumedCoordinatedEvents(): Promise<string[]> {
  const progress = await loadProgress();
  return progress.consumedCoordinatedEvents || [];
}

/**
 * Track whether a guaranteed cross-reference has been shown for a phase.
 * Key: `wordshift_guaranteed_crossref_phase_{phase}`
 */
export async function hasSeenGuaranteedCrossRef(phase: number): Promise<boolean> {
  try {
    const key = `wordshift_guaranteed_crossref_phase_${phase}`;
    const value = await AsyncStorage.getItem(key);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markGuaranteedCrossRefSeen(phase: number): Promise<void> {
  try {
    const key = `wordshift_guaranteed_crossref_phase_${phase}`;
    await AsyncStorage.setItem(key, 'true');
  } catch {
    // Non-critical
  }
}

/**
 * Track whether the daily challenge unlock explanation has been shown.
 */
export async function hasSeenDailyChallengeIntro(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(DAILY_CHALLENGE_INTRO_SEEN_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markDailyChallengeIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_CHALLENGE_INTRO_SEEN_KEY, 'true');
  } catch {
    // Non-critical
  }
}

/**
 * Track whether Fox's one-time Challenge Mode intro has been shown (after 15 puzzles).
 */
export async function hasSeenChallengeIntro(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(CHALLENGE_INTRO_SEEN_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markChallengeIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(CHALLENGE_INTRO_SEEN_KEY, 'true');
  } catch {
    // Non-critical
  }
}

/**
 * Track whether Fox's one-time "Keeper's Welcome" starter-pack intro has shown.
 */
export async function hasSeenStarterIntro(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STARTER_INTRO_SEEN_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markStarterIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(STARTER_INTRO_SEEN_KEY, 'true');
  } catch {
    // Non-critical
  }
}

export async function hasSeenFirstWinGlitch(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(FIRST_WIN_GLITCH_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markFirstWinGlitchSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(FIRST_WIN_GLITCH_KEY, 'true');
  } catch {
    // Non-critical
  }
}

/**
 * Track whether Fox's one-time post-tutorial "play more" nudge has appeared.
 */
export async function hasSeenFoxPlayNudge(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(FOX_PLAY_NUDGE_SEEN_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markFoxPlayNudgeSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(FOX_PLAY_NUDGE_SEEN_KEY, 'true');
  } catch {
    // Non-critical
  }
}

/**
 * Track whether the one-time Fox pit nudge has been shown for the current pending transition.
 * Resets each time a phase transition is confirmed (new pending transition = new nudge).
 */
export async function hasSeenPitNudge(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(PIT_NUDGE_SEEN_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function hasSeenSetupSelectorIntro(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SETUP_SELECTOR_INTRO_SEEN_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markSetupSelectorIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(SETUP_SELECTOR_INTRO_SEEN_KEY, 'true');
  } catch {
    // Non-critical
  }
}

/**
 * "Learned the pit" flag for the mandatory first-harvest gate — the forced pit
 * visit once the auto-collect window closes. Uses its OWN key (not the legacy
 * pit-harvest-intro flag), so players who saw the old passive puzzle-8 Fox
 * card still get this gate.
 *
 * Semantics (hardened): the flag means the player has actually LEARNED manual
 * harvesting — it is set only when they complete their first manual offer at
 * the pit (OfferingPitScreen), never at gate-decision time. The victory-modal
 * gate therefore re-fires on every eligible victory (any mode, including the
 * Daily Challenge) until a real harvest happens, so no interruption — hardware
 * back, app kill, deep link, notification tap — can silently consume the
 * teaching beat.
 */
export async function hasSeenMandatoryHarvest(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(MANDATORY_HARVEST_SEEN_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markMandatoryHarvestSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(MANDATORY_HARVEST_SEEN_KEY, 'true');
  } catch {
    // Non-critical
  }
}

/**
 * One-time flag for the home-screen safety net that accompanies the mandatory
 * first-harvest gate: if the player somehow reaches home past the auto-collect
 * window with batches waiting and the pit still unlearned, Fox explains the
 * pit once from home. Separate from the learned flag above — dismissing the
 * explanation does not count as harvesting; only a real offer does.
 */
export async function hasSeenHarvestHomeIntro(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(HARVEST_HOME_INTRO_SEEN_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markHarvestHomeIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(HARVEST_HOME_INTRO_SEEN_KEY, 'true');
  } catch {
    // Non-critical
  }
}

/**
 * One-time flag for the lore intro shown the first time a level-gated room
 * (the Jungle Hammock, by default) blocks the player — explaining the wait and
 * pointing at Reserve / Skip.
 */
export async function hasSeenGatedUnlockIntro(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(GATED_UNLOCK_INTRO_SEEN_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markGatedUnlockIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(GATED_UNLOCK_INTRO_SEEN_KEY, 'true');
  } catch {
    // Non-critical
  }
}

export async function markPitNudgeSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(PIT_NUDGE_SEEN_KEY, 'true');
  } catch {
    // Non-critical
  }
}

export async function resetPitNudge(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PIT_NUDGE_SEEN_KEY);
  } catch {
    // Non-critical
  }
}

/**
 * Track whether Fox's one-time journal intro has appeared.
 */
export async function hasSeenJournalIntro(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(JOURNAL_INTRO_SEEN_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markJournalIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(JOURNAL_INTRO_SEEN_KEY, 'true');
  } catch {
    // Non-critical
  }
}

/**
 * Deferred-amber credit sources: amber that was ALREADY counted into
 * totalAmberEarned at victory time (awardPuzzleAmber / applyVariantAmberBonus
 * increment the lifetime counter even with creditToBalance=false) and is only
 * being released to the spendable balance now — the pit tap-to-devour /
 * Offer All path ('word_offering') and the early-game auto-collect path
 * ('auto_word_offering'). Re-incrementing totalAmberEarned here would count
 * the same amber twice and unlock the amber-earned achievements (1,000/5,000)
 * at roughly half the intended earnings.
 */
const DEFERRED_CREDIT_SOURCES = new Set(['word_offering', 'auto_word_offering']);

/**
 * Award bonus amber from non-puzzle sources (e.g., daily streak milestones).
 * Credits amber, records a transaction, and returns the new balance.
 * For DEFERRED_CREDIT_SOURCES the spendable balance is credited WITHOUT
 * touching totalAmberEarned (already counted at victory time — see above).
 */
export async function awardBonusAmber(amount: number, source: string): Promise<number> {
  const progress = await loadProgress();
  progress.amber += amount;
  if (!DEFERRED_CREDIT_SOURCES.has(source)) {
    progress.totalAmberEarned += amount;
  }
  progressCache = progress;
  await saveProgress();
  await recordTransaction({
    amount,
    type: 'earn',
    source,
    timestamp: Date.now(),
  });
  return progress.amber;
}

/**
 * DEV ONLY: Add amber directly (for testing)
 */
export async function devAddAmber(amount: number): Promise<number> {
  const progress = await loadProgress();
  progress.amber += amount;
  progress.totalAmberEarned += amount;
  progressCache = progress;
  await saveProgress();
  return progress.amber;
}

/**
 * DEV ONLY: Add puzzles and update phase (for testing dialogue progression)
 */
export async function devAddPuzzles(amount: number): Promise<{ puzzles: number; phase: DialoguePhase }> {
  const progress = await loadProgress();
  progress.puzzlesSolved += amount;
  // Keep phaseProgress in sync for tests
  progress.phaseProgress = (progress.phaseProgress || 0) + amount;

  // Update phase based on effective progress (post-revelation stays pinned at 5)
  progress.currentPhase = effectivePhaseFor(progress);

  progressCache = progress;
  await saveProgress();
  return { puzzles: progress.puzzlesSolved, phase: progress.currentPhase };
}
