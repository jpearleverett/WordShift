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
 * 3) Speed        (55)  -> short row count + timer pressure
 * The trial-ladder toggles gate separately (Challenge 15, Blind 80), and
 * COMBO_PRESETS layer a variant + a trial rung at 55/70/90/105.
 * Locked variants/combos are SHOWN in the setup menu as teased locked rows,
 * so the player always sees the next mechanical goal.
 */

import { Difficulty, PuzzleSolutionStep } from '../types';
import { isReverseSolvable } from './localGenerator';
// Speed timers live in the central balance file (single source of truth).
import { SPEED_TIME_LIMITS as SPEED_TIME_LIMIT_BY_DIFFICULTY, LEXICON_UNLOCK_PUZZLES } from '../constants/gameBalance';

// ============================================================================
// Types
// ============================================================================

export type VariantModifier =
  | 'reverse'
  | 'speed'
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

/**
 * A combination style: one variant plus one trial-ladder rung, armed together
 * as a single selection. Blind presets run under gameMode 'challenge' with
 * blindMode on (the engine's existing composition); challenge presets run
 * under gameMode 'challenge' with blindMode off.
 */
export interface ComboPreset {
  id: 'twin_trial' | 'racing_shadows' | 'blind_return' | 'free_fall';
  title: string;
  description: string;
  /** Phase 3+ dark description */
  darkDescription: string;
  icon: string;
  variant: PuzzleVariant;
  challenge: boolean;
  blind: boolean;
  unlockPuzzles: number;
}

export interface ComboSelectorOption {
  preset: ComboPreset;
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
  speed: {
    variant: 'speed',
    title: 'Speed Shift',
    description: 'Race through a short chain before time runs out.',
    darkDescription: 'The arrangement does not wait.',
    instruction: 'Three-row sprint. Move quickly and commit.',
    darkInstruction: 'No hesitation. The pattern closes fast.',
    icon: '⚡',
    amberMultiplier: 1.34,
    timeLimit: 60,
    rowOverride: 3,
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
  speed: ['speed'],
  double_shift: ['double_shift'],
};

// Selector display order matches unlock order: reverse -> double -> speed.
const BASE_VARIANTS: VariantModifier[] = [
  'reverse',
  'double_shift',
  'speed',
];

const VARIANT_UNLOCK_REQUIREMENTS: Record<Exclude<PuzzleVariant, 'standard'>, VariantUnlockRequirement> = {
  reverse: { puzzlesSolved: 10, minDepthPhase: 0 },
  double_shift: { puzzlesSolved: 25, minDepthPhase: 0 },
  speed: { puzzlesSolved: 55, minDepthPhase: 0 },
};

/**
 * Trial-ladder toggle gates (the toggles live in App.tsx; the numbers live
 * here with the variant gates so the whole unlock timeline reads in one place).
 * Challenge is the middle rung; Blind Offering is the true apex and lands
 * late, once the player has mastered every variant.
 */
export const CHALLENGE_TOGGLE_UNLOCK_PUZZLES = 15;
export const BLIND_TOGGLE_UNLOCK_PUZZLES = 80;

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
  speed: {
    light: 'One day the letters will race you.',
    dark: 'The arrangement is learning not to wait.',
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

/**
 * Every composition here is engine-verified: challenge is a gameMode that
 * composes with any variant (double-shift even has an atomic paired undo in
 * challenge), and blind runs under gameMode 'challenge' with previews
 * suppressed and one end-of-chain judgment. Blind + reverse has explicit
 * ascent handling in usePuzzleGame; blind + double_shift is safe because the
 * drop1 look-ahead only powers previews (never the commit path) and stuck
 * detection is always false in blind, so no composition can soft-lock.
 */
export const COMBO_PRESETS: ComboPreset[] = [
  {
    id: 'twin_trial',
    title: 'Twin Trial',
    description: 'Double Shift under Challenge rules. Two letters a step, no hints, few undos.',
    darkDescription: 'Two offerings a step, with nothing to catch you.',
    icon: '⚔️',
    variant: 'double_shift',
    challenge: true,
    blind: false,
    unlockPuzzles: 55,
  },
  {
    id: 'racing_shadows',
    title: 'Racing Shadows',
    description: 'Speed Shift under Challenge rules. Beat the clock with no hints and few undos.',
    darkDescription: 'Outrun the closing pattern. It will not soften for you.',
    icon: '🌪️',
    variant: 'speed',
    challenge: true,
    blind: false,
    unlockPuzzles: 70,
  },
  {
    id: 'blind_return',
    title: 'Blind Return',
    description: 'Reverse Shift with no previews. Down and back, judged only at the end.',
    darkDescription: 'Descend and return unseeing. Only the finished chain is judged.',
    icon: '🌒',
    variant: 'reverse',
    challenge: false,
    blind: true,
    unlockPuzzles: 90,
  },
  {
    id: 'free_fall',
    title: 'Free Fall',
    description: 'Double Shift with no previews. Two letters a step, judged only at the end.',
    darkDescription: 'Two at a time, in the dark. The chain speaks only when it is whole.',
    icon: '🕳️',
    variant: 'double_shift',
    challenge: false,
    blind: true,
    unlockPuzzles: 105,
  },
];

// Locked-row teases must be LITERAL: at the moment a player reads these they
// may not have met the component modes yet, so idioms ("no net") and bare
// jargon ("played blind") read as noise. Name the two things being combined.
const COMBO_LOCK_TEASES: Record<ComboPreset['id'], { light: string; dark: string }> = {
  twin_trial: {
    light: 'Double Shift plus Challenge rules.',
    dark: 'Two offerings a step, and no mercy.',
  },
  racing_shadows: {
    light: 'Speed Shift plus Challenge rules.',
    dark: 'A race the arrangement will not soften.',
  },
  blind_return: {
    light: 'Reverse Shift with previews hidden.',
    dark: 'A blind descent, and a blind return.',
  },
  free_fall: {
    light: 'Double Shift with previews hidden.',
    dark: 'Two at a time, in the dark.',
  },
};

/**
 * A combo unlocks at its own gate, which always sits at or past every gate of
 * its components (variant gate + trial-rung toggle gate) — guarded by tests.
 */
export function isComboUnlocked(
  preset: ComboPreset,
  puzzlesSolved: number,
  currentPhase: number
): boolean {
  if (puzzlesSolved < preset.unlockPuzzles) return false;
  if (!isVariantUnlocked(preset.variant, puzzlesSolved, currentPhase)) return false;
  if (preset.challenge && puzzlesSolved < CHALLENGE_TOGGLE_UNLOCK_PUZZLES) return false;
  if (preset.blind && puzzlesSolved < BLIND_TOGGLE_UNLOCK_PUZZLES) return false;
  return true;
}

export function getComboDescription(preset: ComboPreset, phase: number): string {
  return phase >= 3 ? preset.darkDescription : preset.description;
}

export function getComboUnlockHint(
  preset: ComboPreset,
  puzzlesSolved: number,
  currentPhase: number,
  uiPhase: number
): string {
  if (isComboUnlocked(preset, puzzlesSolved, currentPhase)) {
    return uiPhase >= 3 ? 'Ready for the arrangement.' : 'Unlocked.';
  }
  const remaining = Math.max(0, preset.unlockPuzzles - puzzlesSolved);
  const tease = uiPhase >= 3
    ? COMBO_LOCK_TEASES[preset.id].dark
    : COMBO_LOCK_TEASES[preset.id].light;
  return formatLockedHint(tease, remaining, uiPhase);
}

/**
 * Selector rows for the COMBINATION STYLES section of the setup menu.
 * Locked combos are included (teased, non-selectable), same as variants.
 */
export function getComboSelectorOptions(
  puzzlesSolved: number,
  currentPhase: number,
  uiPhase: number
): ComboSelectorOption[] {
  return COMBO_PRESETS.map(preset => ({
    preset,
    unlocked: isComboUnlocked(preset, puzzlesSolved, currentPhase),
    unlockHint: getComboUnlockHint(preset, puzzlesSolved, currentPhase, uiPhase),
  }));
}

/**
 * Get the variant description appropriate for the current phase.
 */
export function getVariantDescription(config: VariantConfig, phase: number): string {
  return phase >= 3 ? config.darkDescription : config.description;
}

/**
 * Get the first-instruction text for a variant.
 * For speed variants, the row count is injected dynamically based on difficulty.
 */
export function getVariantInstruction(config: VariantConfig, phase: number, difficulty?: Difficulty): string {
  // Dark instruction doesn't mention row count, return as-is
  if (phase >= 3) return config.darkInstruction;

  // For speed variant with known difficulty, compute the actual row count
  if (difficulty && config.variant === 'speed') {
    const overrides = getVariantOverrides('speed', difficulty);
    const rows = overrides.targetRows ?? 3;
    const rowWord = rows === 3 ? 'Three' : rows === 4 ? 'Four' : rows === 5 ? 'Five' : `${rows}`;
    return `${rowWord}-row sprint. Move quickly and commit.`;
  }

  return config.instruction;
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
  if (hasVariantModifier(variant, 'speed')) {
    return { targetRows: baseDifficulty === 'HARD' ? 4 : 3 };
  }
  return {};
}

/**
 * Whether this variant includes speed timing pressure.
 */
export function getVariantTimeLimit(variant: PuzzleVariant): number | null {
  if (!hasVariantModifier(variant, 'speed')) return null;
  return VARIANT_CONFIGS[variant].timeLimit || VARIANT_CONFIGS.speed.timeLimit || 60;
}

/**
 * Difficulty-aware timer for speed variants to preserve pressure at higher tiers.
 */
export function getVariantTimeLimitForDifficulty(
  variant: PuzzleVariant,
  difficulty: Difficulty
): number | null {
  if (!hasVariantModifier(variant, 'speed')) return null;
  return SPEED_TIME_LIMIT_BY_DIFFICULTY[difficulty];
}

/**
 * Check if a variant puzzle was completed within its constraints.
 * For speed variants: checks completion within time limit.
 * For other variants: true (constraints are enforced during play).
 */
export function isVariantCompleted(
  variant: PuzzleVariant,
  elapsedSeconds?: number
): boolean {
  const timeLimit = getVariantTimeLimit(variant);
  if (timeLimit !== null && elapsedSeconds !== undefined) {
    return elapsedSeconds <= timeLimit;
  }
  return true;
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
