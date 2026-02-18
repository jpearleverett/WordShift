/**
 * Puzzle variety modes for WordShift.
 *
 * Design goals:
 * - Add mechanical variety without overwhelming players.
 * - Introduce variants in a narrative-aware order.
 *
 * Variant progression order:
 * 1) Reverse      -> standard rules + return trip back to first row
 * 2) Speed        -> short row count + timer pressure
 * 3) Double Shift -> move two letters per step
 * 4) Chain        -> extended linked challenge
 */

import { Difficulty, PuzzleSolutionStep } from '../types';
import { isReverseSolvable } from './localGenerator';

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

const BASE_VARIANTS: VariantModifier[] = [
  'reverse',
  'speed',
  'double_shift',
];

const SPEED_TIME_LIMIT_BY_DIFFICULTY: Record<Difficulty, number> = {
  EASY: 65,
  MEDIUM: 60,
  MEDIUM_PLUS: 54,
  HARD: 48,
};

const VARIANT_UNLOCK_REQUIREMENTS: Record<Exclude<PuzzleVariant, 'standard'>, VariantUnlockRequirement> = {
  reverse: { puzzlesSolved: 0, minDepthPhase: 0 },
  speed: { puzzlesSolved: 0, minDepthPhase: 0 },
  double_shift: { puzzlesSolved: 0, minDepthPhase: 0 },
};

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
  const needsDepth = currentPhase < req.minDepthPhase;

  if (remainingPuzzles > 0 && needsDepth) {
    return uiPhase >= 3
      ? `${remainingPuzzles} more offerings, then go deeper.`
      : `Unlocks in ${remainingPuzzles} more puzzles. Keep progressing to unlock deeper styles.`;
  }
  if (remainingPuzzles > 0) {
    return uiPhase >= 3
      ? `${remainingPuzzles} more offerings needed.`
      : `Unlocks in ${remainingPuzzles} more puzzle${remainingPuzzles === 1 ? '' : 's'}.`;
  }
  return uiPhase >= 3
    ? 'Continue deeper into the arrangement.'
    : 'Keep progressing to unlock this style.';
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

  for (const variant of BASE_VARIANTS) {
    const unlocked = isVariantUnlocked(variant, puzzlesSolved, currentPhase);
    if (!unlocked) {
      continue;
    }
    options.push({
      variant,
      config: VARIANT_CONFIGS[variant],
      group: 'base',
      unlocked,
      unlockHint: getVariantUnlockHint(variant, puzzlesSolved, currentPhase, uiPhase),
    });
  }

  return options;
}

// ============================================================================
// Variant Selection
// ============================================================================

function getUnlockedBaseVariants(puzzlesSolved: number, currentPhase: number): PuzzleVariant[] {
  return BASE_VARIANTS.filter(variant => isVariantUnlocked(variant, puzzlesSolved, currentPhase));
}

/**
 * Determine if this puzzle should offer a variant mode.
 * Returns a variant config or null for standard play.
 *
 * Triggers on:
 * - Every 10th puzzle after onboarding comfort period
 * - ~12% random chance on other puzzles
 */
export function shouldOfferVariant(
  puzzlesSolved: number,
  currentPhase: number
): VariantConfig | null {
  // Keep the first chunk of play clean and fully standard.
  if (puzzlesSolved < 18) return null;

  const isVariantPuzzle = puzzlesSolved % 10 === 0 || Math.random() < 0.12;
  if (!isVariantPuzzle) return null;

  const pool = getUnlockedBaseVariants(puzzlesSolved, currentPhase);
  if (pool.length === 0) return null;

  const selected = pool[Math.floor(Math.random() * pool.length)];
  return VARIANT_CONFIGS[selected];
}

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
