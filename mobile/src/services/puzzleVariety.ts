/**
 * Puzzle variety modes for WordShift.
 *
 * Design goals:
 * - Add mechanical variety without overwhelming players.
 * - Introduce variants in a narrative-aware order.
 *
 * Variant progression order (gates pulled forward so the puzzle 15-40 stretch,
 * which sits on the day 7-14 retention valley, is never a variety desert; the
 * combos and the blind toggle still carry mechanical novelty deep into the arc):
 * 1) Reverse      (10)  -> standard rules + return trip back to first row
 *                          (10, not 8: the daily-challenge unlock lands at 8
 *                          and the mandatory first harvest at win 9, so the
 *                          reverse intro waits two boards instead of stacking
 *                          on the same early one-time-beat cluster)
 * 2) Double Shift (25)  -> move two letters per step
 * Speed Shift is NOT in this list: it is a composable MODIFIER (a clock over
 * whatever style you chose), gated at 55 alongside the other modifier toggles
 * (Challenge 15, Speed 55, Blind 80, Lexicon 100).
 * Locked styles are SHOWN in the setup menu as teased locked rows, so the
 * player always sees the next mechanical goal.
 */

import { Difficulty, PuzzleSolutionStep } from '../types';
import { isReverseSolvable } from './localGenerator';
// Speed timers live in the central balance file (single source of truth).
import {
  SPEED_TIME_LIMITS as SPEED_TIME_LIMIT_BY_DIFFICULTY,
  SPEED_STYLE_TIME_MULTIPLIER,
  SPEED_TOGGLE_UNLOCK_PUZZLES,
  LEXICON_UNLOCK_PUZZLES,
} from '../constants/gameBalance';

// ============================================================================
// Types
// ============================================================================

// Speed Shift is deliberately ABSENT here. It became a composable MODIFIER (a
// clock laid over whatever style you are playing) rather than a style of its
// own, so it no longer travels as a variant key. It mattered that it left this
// union too and not just PuzzleVariant: had it stayed, every
// `hasVariantModifier(variant, 'speed')` call would still have type-checked and
// simply returned false forever, and the clock would quietly never start.
export type VariantModifier =
  | 'reverse'
  | 'double_shift';

export type PuzzleVariant = 'standard' | VariantModifier;

export interface VariantConfig {
  variant: PuzzleVariant;
  title: string;
  description: string;
  /** Phase 3+ dark description */
  darkDescription: string;
  /** First-instruction text shown on puzzle start */
  instruction: string;
  /** Phase 3+ dark first-instruction text */
  darkInstruction: string;
  icon: string;
  /** Amber multiplier for completing this variant */
  amberMultiplier: number;
  /** For speed mode: time limit in seconds */
  timeLimit?: number;
  /** For speed mode: override row count */
  rowOverride?: number;
}

export interface VariantUnlockRequirement {
  puzzlesSolved: number;
  /**
   * Internal gating depth. Never exposed to players as phase numbers in UI.
   */
  minDepthPhase: number;
}

export interface VariantSelectorOption {
  variant: PuzzleVariant;
  config: VariantConfig;
  group: 'core' | 'base';
  unlocked: boolean;
  unlockHint: string;
}


// ============================================================================
// Variant Definitions
// ============================================================================

export const VARIANT_CONFIGS: Record<PuzzleVariant, VariantConfig> = {
  standard: {
    variant: 'standard',
    title: 'Standard',
    description: 'The classic WordShift experience.',
    darkDescription: 'The familiar arrangement.',
    instruction: 'Shift letters down the chain to reach the end.',
    darkInstruction: 'Offer each shift to the pattern, one row at a time.',
    icon: '📝',
    amberMultiplier: 1.0,
  },
  reverse: {
    variant: 'reverse',
    title: 'Reverse Shift',
    description: 'Reach the final row, then shift letters back up to the first word.',
    darkDescription: 'Descend to the bottom, then return every borrowed letter.',
    instruction: 'Play normally to the bottom, then carry the chain back to the top.',
    darkInstruction: 'Complete the descent, then retrace the arrangement upward.',
    icon: '🔄',
    amberMultiplier: 1.22,
  },
  double_shift: {
    variant: 'double_shift',
    title: 'Double Shift',
    description: 'Move two letters at once from each word to the next.',
    darkDescription: 'Two offerings per step. The pattern demands more.',
    instruction: 'Pick two letters, then place each into the next word.',
    darkInstruction: 'Two letters at a time. The arrangement grows hungrier.',
    icon: '⏫',
    amberMultiplier: 1.65,
  },
};

const VARIANT_MODIFIER_MAP: Record<PuzzleVariant, VariantModifier[]> = {
  standard: [],
  reverse: ['reverse'],
  double_shift: ['double_shift'],
};

// Selector display order matches unlock order: reverse -> double.
const BASE_VARIANTS: VariantModifier[] = [
  'reverse',
  'double_shift',
];

const VARIANT_UNLOCK_REQUIREMENTS: Record<Exclude<PuzzleVariant, 'standard'>, VariantUnlockRequirement> = {
  reverse: { puzzlesSolved: 10, minDepthPhase: 0 },
  double_shift: { puzzlesSolved: 25, minDepthPhase: 0 },
};

/**
 * Trial-ladder toggle gates (the toggles live in App.tsx; the numbers live
 * here with the variant gates so the whole unlock timeline reads in one place).
 * Challenge is the middle rung; Blind Offering is the true apex and lands
 * late, once the player has mastered every variant.
 */
export const CHALLENGE_TOGGLE_UNLOCK_PUZZLES = 15;
export const BLIND_TOGGLE_UNLOCK_PUZZLES = 80;
// Speed Shift's gate is unchanged from when it was a style; it just lives with
// the other modifier gates now, so the whole ladder (15 -> 55 -> 80 -> 100)
// reads in one place.
export { SPEED_TOGGLE_UNLOCK_PUZZLES };

export function isPuzzleVariant(value: string): value is PuzzleVariant {
  return value in VARIANT_CONFIGS;
}

export function getVariantUnlockRequirement(variant: PuzzleVariant): VariantUnlockRequirement | null {
  if (variant === 'standard') return null;
  return VARIANT_UNLOCK_REQUIREMENTS[variant];
}

export function isVariantUnlocked(
  variant: PuzzleVariant,
  puzzlesSolved: number,
  currentPhase: number
): boolean {
  if (variant === 'standard') return true;
  const req = VARIANT_UNLOCK_REQUIREMENTS[variant];
  return puzzlesSolved >= req.puzzlesSolved && currentPhase >= req.minDepthPhase;
}

export function getUnlockedVariants(
  puzzlesSolved: number,
  currentPhase: number
): PuzzleVariant[] {
  const unlocked: PuzzleVariant[] = ['standard'];
  for (const variant of BASE_VARIANTS) {
    if (isVariantUnlocked(variant, puzzlesSolved, currentPhase)) {
      unlocked.push(variant);
    }
  }
  return unlocked;
}

/**
 * Returns variants that were newly unlocked by reaching `puzzlesSolved`.
 * Compares against `puzzlesSolved - 1` to detect threshold crossings.
 */
export function getNewlyUnlockedVariants(
  puzzlesSolved: number,
  currentPhase: number
): PuzzleVariant[] {
  if (puzzlesSolved <= 0) return [];
  const nowUnlocked = getUnlockedVariants(puzzlesSolved, currentPhase);
  const previouslyUnlocked = getUnlockedVariants(puzzlesSolved - 1, currentPhase);
  const previousSet = new Set(previouslyUnlocked);
  return nowUnlocked.filter(v => !previousSet.has(v));
}

/**
 * Evocative one-line teases for locked modes. Light register for the bright
 * days, dark register from the growing shadows on. Each stays true to what
 * the mode will feel like without explaining the mechanic away.
 */
const VARIANT_LOCK_TEASES: Record<Exclude<PuzzleVariant, 'standard'>, { light: string; dark: string }> = {
  reverse: {
    light: 'Every chain wants to come back home.',
    dark: 'What descends will be asked to climb again.',
  },
  double_shift: {
    light: 'Some words will ask for two letters at once.',
    dark: 'Soon the pattern will take two at a time.',
  },
};

function formatLockedHint(tease: string, remainingPuzzles: number, uiPhase: number): string {
  if (remainingPuzzles > 0) {
    return uiPhase >= 3
      ? `${tease} ${remainingPuzzles} more offering${remainingPuzzles === 1 ? '' : 's'}.`
      : `${tease} Unlocks in ${remainingPuzzles} more puzzle${remainingPuzzles === 1 ? '' : 's'}.`;
  }
  return uiPhase >= 3
    ? `${tease} Continue deeper into the arrangement.`
    : `${tease} Keep solving to open this style.`;
}

export function getVariantUnlockHint(
  variant: PuzzleVariant,
  puzzlesSolved: number,
  currentPhase: number,
  uiPhase: number
): string {
  if (variant === 'standard') {
    return uiPhase >= 3 ? 'The familiar arrangement.' : 'Classic rules.';
  }
  const req = VARIANT_UNLOCK_REQUIREMENTS[variant];
  const unlocked = isVariantUnlocked(variant, puzzlesSolved, currentPhase);
  if (unlocked) {
    return uiPhase >= 3 ? 'Ready for the arrangement.' : 'Unlocked.';
  }

  const remainingPuzzles = Math.max(0, req.puzzlesSolved - puzzlesSolved);
  const tease = uiPhase >= 3
    ? VARIANT_LOCK_TEASES[variant].dark
    : VARIANT_LOCK_TEASES[variant].light;
  return formatLockedHint(tease, remainingPuzzles, uiPhase);
}

/**
 * Unlock hint for the Blind Offering toggle (not a variant, but it earns the
 * same visible locked-row tease in the setup menu until its gate).
 */
export function getBlindUnlockHint(puzzlesSolved: number, uiPhase: number): string {
  const remaining = Math.max(0, BLIND_TOGGLE_UNLOCK_PUZZLES - puzzlesSolved);
  if (remaining <= 0) {
    return uiPhase >= 3 ? 'Ready for the arrangement.' : 'Unlocked.';
  }
  const tease = uiPhase >= 3
    ? 'One day you will offer a whole chain unseeing.'
    : 'The last trial: no previews, judged only at the end.';
  return formatLockedHint(tease, remaining, uiPhase);
}

/**
 * Unlock hint for the Speed Shift toggle. Speed is a MODIFIER now, so it earns
 * the same visible locked-row tease as Challenge / Blind / Lexicon rather than
 * a style tease.
 */
export function getSpeedUnlockHint(puzzlesSolved: number, uiPhase: number): string {
  const remaining = Math.max(0, SPEED_TOGGLE_UNLOCK_PUZZLES - puzzlesSolved);
  if (remaining <= 0) {
    return uiPhase >= 3 ? 'Ready for the arrangement.' : 'Unlocked.';
  }
  const tease = uiPhase >= 3
    ? 'The arrangement is learning not to wait.'
    : 'One day the letters will race you, on any board you like.';
  return formatLockedHint(tease, remaining, uiPhase);
}

/**
 * Unlock hint for the Lexicon (rare-word) toggle — a composable modifier that
 * earns the same visible locked-row tease in the setup menu until its late gate.
 */
export function getLexiconUnlockHint(puzzlesSolved: number, uiPhase: number): string {
  const remaining = Math.max(0, LEXICON_UNLOCK_PUZZLES - puzzlesSolved);
  if (remaining <= 0) {
    return uiPhase >= 3 ? 'The rare words are yours to offer.' : 'Unlocked.';
  }
  const tease = uiPhase >= 3
    ? 'Deeper words wait in the older pages.'
    : 'A mode of rarer, stranger words, on any style.';
  return formatLockedHint(tease, remaining, uiPhase);
}

export function getVariantSelectorOptions(
  puzzlesSolved: number,
  currentPhase: number,
  uiPhase: number
): VariantSelectorOption[] {
  const options: VariantSelectorOption[] = [
    {
      variant: 'standard',
      config: VARIANT_CONFIGS.standard,
      group: 'core',
      unlocked: true,
      unlockHint: getVariantUnlockHint('standard', puzzlesSolved, currentPhase, uiPhase),
    },
  ];

  // Locked variants are INCLUDED (visibly locked, non-selectable in the menu)
  // so the next mechanical goal is always on screen instead of hidden.
  for (const variant of BASE_VARIANTS) {
    options.push({
      variant,
      config: VARIANT_CONFIGS[variant],
      group: 'base',
      unlocked: isVariantUnlocked(variant, puzzlesSolved, currentPhase),
      unlockHint: getVariantUnlockHint(variant, puzzlesSolved, currentPhase, uiPhase),
    });
  }

  return options;
}

// ============================================================================
// Combination Styles (variant + trial rung, armed as one selection)
// ============================================================================

// The COMBINATION-STYLES presets that used to live here are gone. They pre-armed
// a style plus a trial rung as a single selection, which was a second, parallel
// way to arm combinations the player can already build by stacking toggles; the
// setup menu stopped rendering them long ago, and one of them ("Racing Shadows")
// was defined in terms of speed-as-a-style, which no longer exists. Stacking is
// now the ONE way to combine modes.


/**
 * Get the variant description appropriate for the current phase.
 */
export function getVariantDescription(config: VariantConfig, phase: number): string {
  return phase >= 3 ? config.darkDescription : config.description;
}

/**
 * Get the first-instruction text for a variant.
 */
export function getVariantInstruction(config: VariantConfig, phase: number): string {
  return phase >= 3 ? config.darkInstruction : config.instruction;
}

/**
 * Get all active modifiers for the variant key.
 */
export function getVariantModifiers(variant: PuzzleVariant): VariantModifier[] {
  return VARIANT_MODIFIER_MAP[variant] || [];
}

export function hasVariantModifier(variant: PuzzleVariant, modifier: VariantModifier): boolean {
  return getVariantModifiers(variant).includes(modifier);
}

/**
 * Get difficulty overrides for a variant mode.
 * Some variants modify puzzle generation parameters.
 */
export function getVariantOverrides(
  variant: PuzzleVariant,
  baseDifficulty: Difficulty
): { targetRows?: number; wordLength?: number } {
  if (hasVariantModifier(variant, 'double_shift')) {
    // Double shift always uses 5-letter words (needs WORDS_3/5/7).
    // W=5 is the only viable word length: W-2=3 (intermediates) and W+2=7 (tempState)
    // must both exist in the dictionary (which covers 3-7 letters).
    // Difficulty is differentiated purely by row count.
    const rows = baseDifficulty === 'EASY' ? 3 :
                 baseDifficulty === 'MEDIUM' ? 4 :
                 baseDifficulty === 'MEDIUM_PLUS' ? 5 : 6;
    return { wordLength: 5, targetRows: rows };
  }
  // Speed used to trim the chain to 3-4 rows here. That override only ever
  // reached the on-device generator: every speed board has been served from the
  // banks at full length for a long time, so the "short sprint" identity was
  // already fiction. As a modifier it is a clock over the board you chose.
  return {};
}

/**
 * Seconds on the clock for a speed board: the difficulty's base time, scaled by
 * how much work the underlying STYLE asks for.
 *
 * Speed is a modifier now, so it can ride a reverse chain (played down and then
 * all the way back up) or a double shift (two letters per step, up to 7 rows at
 * EXPERT). The base times were calibrated on a standard chain; handing those
 * unchanged to a 7-row two-letter board would not be difficulty, it would be an
 * unwinnable board.
 *
 * (This replaces getVariantTimeLimit / getVariantTimeLimitForDifficulty /
 * isVariantCompleted. The first two were variant-keyed by definition; the third
 * only ever answered "did the clock run out", which the live timer -> GAME_OVER
 * path has always decided.)
 */
export function getSpeedTimeLimit(
  difficulty: Difficulty,
  variant: PuzzleVariant,
): number {
  const base = SPEED_TIME_LIMIT_BY_DIFFICULTY[difficulty] ?? SPEED_TIME_LIMIT_BY_DIFFICULTY.MEDIUM;
  return Math.round(base * (SPEED_STYLE_TIME_MULTIPLIER[variant] ?? 1.0));
}

/**
 * Calculate amber multiplier for a variant completion.
 */
export function getVariantAmberMultiplier(variant: PuzzleVariant): number {
  return VARIANT_CONFIGS[variant]?.amberMultiplier || 1.0;
}

// ============================================================================
// Variant Rule Helpers
// ============================================================================

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

export function isVowel(letter: string): boolean {
  return VOWELS.has(letter.toUpperCase());
}

export function isLetterAllowedByVariant(_variant: PuzzleVariant, _letter: string): boolean {
  return true;
}

export function getVariantRestrictionError(_variant: PuzzleVariant, _phase: number): string {
  return 'That letter cannot be moved right now.';
}

/**
 * Check whether a puzzle solution is compatible with variant restrictions.
 * Reverse variants require a solvable return path.
 */
export function isVariantCompatibleWithSolution(
  variant: PuzzleVariant,
  solution?: PuzzleSolutionStep[],
  words?: string[]
): boolean {
  if (!solution || solution.length === 0) return true;

  // Double shift puzzles are always compatible (generated specifically)
  if (hasVariantModifier(variant, 'double_shift')) return true;

  // Reverse variants: validate that the return path is solvable
  if (hasVariantModifier(variant, 'reverse') && words && words.length >= 2) {
    if (!isReverseSolvable(words, solution)) {
      return false;
    }
  }

  return true;
}
