/**
 * Puzzle variety modes for WordShift.
 *
 * Design goals:
 * - Add mechanical variety without overwhelming players.
 * - Introduce variants in a narrative-aware order.
 * - Keep variants combinable in later game phases.
 *
 * Variant progression order:
 * 1) Reverse  -> standard rules + return trip back to first row
 * 2) Blind    -> target words concealed until reached
 * 3) No Vowel -> only consonants can be moved
 * 4) Speed    -> short row count + timer pressure
 * 5) No Consonant -> only vowels can be moved
 * 6) Chain    -> extended linked challenge
 */

import { Difficulty, PuzzleSolutionStep } from '../types';

// ============================================================================
// Types
// ============================================================================

export type VariantModifier =
  | 'reverse'
  | 'blind'
  | 'speed'
  | 'chain'
  | 'no_vowel'
  | 'no_consonant';

export type ComboVariant =
  | 'reverse_blind'
  | 'blind_no_vowel'
  | 'blind_no_consonant'
  | 'speed_no_vowel'
  | 'speed_no_consonant';

export type PuzzleVariant = 'standard' | VariantModifier | ComboVariant;

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
  /** For speed/chain mode: override row count */
  rowOverride?: number;
  /** For chain mode: number of linked puzzles */
  chainLength?: number;
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
    amberMultiplier: 1.35,
  },
  blind: {
    variant: 'blind',
    title: 'Blind Shift',
    description: 'Future rows are hidden until you reach them.',
    darkDescription: 'The next words conceal themselves. Move anyway.',
    instruction: 'Trust the pattern: upcoming words stay hidden until revealed.',
    darkInstruction: 'Step into unseen words. They reveal only when touched.',
    icon: '🫣',
    amberMultiplier: 1.4,
  },
  speed: {
    variant: 'speed',
    title: 'Speed Shift',
    description: 'Race through a short chain before time runs out.',
    darkDescription: 'The arrangement does not wait.',
    instruction: 'Three-row sprint. Move quickly and commit.',
    darkInstruction: 'No hesitation. The pattern closes fast.',
    icon: '⚡',
    amberMultiplier: 1.5,
    timeLimit: 60,
    rowOverride: 3,
  },
  chain: {
    variant: 'chain',
    title: 'Chain Shift',
    description: 'A longer linked challenge with sustained pressure.',
    darkDescription: 'An unbroken sequence of offerings.',
    instruction: 'Keep momentum across the full sequence.',
    darkInstruction: 'Do not break the chain. The arrangement notices.',
    icon: '🔗',
    amberMultiplier: 2.0,
    chainLength: 3,
    rowOverride: 3,
  },
  no_vowel: {
    variant: 'no_vowel',
    title: 'No Vowel Shift',
    description: 'Vowels are locked. Move consonants only.',
    darkDescription: 'The vowels fall silent. Shift what remains.',
    instruction: 'Only consonants may be moved in this variant.',
    darkInstruction: 'Vowels are forbidden in this rite. Move consonants only.',
    icon: '🔇',
    amberMultiplier: 1.35,
  },
  no_consonant: {
    variant: 'no_consonant',
    title: 'No Consonant Shift',
    description: 'Consonants are locked. Move vowels only.',
    darkDescription: 'Only pure vowels may pass through the pattern.',
    instruction: 'Only vowels may be moved in this variant.',
    darkInstruction: 'Consonants are sealed. Shift only open vowels.',
    icon: '🫧',
    amberMultiplier: 1.35,
  },
  reverse_blind: {
    variant: 'reverse_blind',
    title: 'Reverse Blind Shift',
    description: 'Go down and back up while hidden rows reveal gradually.',
    darkDescription: 'Descend and return through words you cannot fully see.',
    instruction: 'Reach the bottom, then return to the first row in partial darkness.',
    darkInstruction: 'Trace the pattern down and up while the words stay veiled.',
    icon: '🌘',
    amberMultiplier: 1.85,
  },
  blind_no_vowel: {
    variant: 'blind_no_vowel',
    title: 'Blind + No Vowel',
    description: 'Hidden rows and consonant-only movement.',
    darkDescription: 'Unseen words. Silenced vowels.',
    instruction: 'Rows are hidden and only consonants may move.',
    darkInstruction: 'The hidden pattern forbids vowels. Move consonants by faith.',
    icon: '🌑',
    amberMultiplier: 1.8,
  },
  blind_no_consonant: {
    variant: 'blind_no_consonant',
    title: 'Blind + No Consonant',
    description: 'Hidden rows and vowel-only movement.',
    darkDescription: 'Unseen words. Sealed consonants.',
    instruction: 'Rows are hidden and only vowels may move.',
    darkInstruction: 'The hidden pattern seals consonants. Move vowels only.',
    icon: '🩸',
    amberMultiplier: 1.8,
  },
  speed_no_vowel: {
    variant: 'speed_no_vowel',
    title: 'Speed + No Vowel',
    description: 'Fast sprint with consonant-only movement.',
    darkDescription: 'Run fast while vowels are forbidden.',
    instruction: 'Three-row sprint. Only consonants may move.',
    darkInstruction: 'Hurry. Vowels are forbidden and time is collapsing.',
    icon: '⚡',
    amberMultiplier: 1.95,
    timeLimit: 60,
    rowOverride: 3,
  },
  speed_no_consonant: {
    variant: 'speed_no_consonant',
    title: 'Speed + No Consonant',
    description: 'Fast sprint with vowel-only movement.',
    darkDescription: 'Run fast while consonants are sealed.',
    instruction: 'Three-row sprint. Only vowels may move.',
    darkInstruction: 'Hurry. Consonants are sealed and time is collapsing.',
    icon: '⚡',
    amberMultiplier: 1.95,
    timeLimit: 60,
    rowOverride: 3,
  },
};

const VARIANT_MODIFIER_MAP: Record<PuzzleVariant, VariantModifier[]> = {
  standard: [],
  reverse: ['reverse'],
  blind: ['blind'],
  speed: ['speed'],
  chain: ['chain'],
  no_vowel: ['no_vowel'],
  no_consonant: ['no_consonant'],
  reverse_blind: ['reverse', 'blind'],
  blind_no_vowel: ['blind', 'no_vowel'],
  blind_no_consonant: ['blind', 'no_consonant'],
  speed_no_vowel: ['speed', 'no_vowel'],
  speed_no_consonant: ['speed', 'no_consonant'],
};

// ============================================================================
// Variant Selection
// ============================================================================

function getUnlockedBaseVariants(puzzlesSolved: number): PuzzleVariant[] {
  const variants: PuzzleVariant[] = [];
  if (puzzlesSolved >= 18) variants.push('reverse');
  if (puzzlesSolved >= 30) variants.push('blind');
  if (puzzlesSolved >= 45) variants.push('no_vowel');
  if (puzzlesSolved >= 60) variants.push('speed');
  if (puzzlesSolved >= 75) variants.push('no_consonant');
  if (puzzlesSolved >= 95) variants.push('chain');
  return variants;
}

function getUnlockedComboVariants(puzzlesSolved: number, currentPhase: number): PuzzleVariant[] {
  const combos: PuzzleVariant[] = [];
  if (puzzlesSolved >= 120 && currentPhase >= 2) {
    combos.push('reverse_blind', 'blind_no_vowel');
  }
  if (puzzlesSolved >= 150 && currentPhase >= 3) {
    combos.push('blind_no_consonant', 'speed_no_vowel');
  }
  if (puzzlesSolved >= 190 && currentPhase >= 4) {
    combos.push('speed_no_consonant');
  }
  return combos;
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

  const basePool = getUnlockedBaseVariants(puzzlesSolved);
  if (basePool.length === 0) return null;

  const comboPool = getUnlockedComboVariants(puzzlesSolved, currentPhase);
  const shouldUseCombo = comboPool.length > 0 && Math.random() < (currentPhase >= 3 ? 0.35 : 0.2);
  const pool = shouldUseCombo ? comboPool : basePool;

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
  _baseDifficulty: Difficulty
): { targetRows?: number; wordLength?: number } {
  if (hasVariantModifier(variant, 'speed') || hasVariantModifier(variant, 'chain')) {
    return { targetRows: 3 };
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

export function isLetterAllowedByVariant(variant: PuzzleVariant, letter: string): boolean {
  if (hasVariantModifier(variant, 'no_vowel')) return !isVowel(letter);
  if (hasVariantModifier(variant, 'no_consonant')) return isVowel(letter);
  return true;
}

export function getVariantRestrictionError(variant: PuzzleVariant, phase: number): string {
  if (hasVariantModifier(variant, 'no_vowel')) {
    return phase >= 3
      ? 'Vowels are forbidden in this arrangement.'
      : 'No Vowel Shift: move consonants only.';
  }
  if (hasVariantModifier(variant, 'no_consonant')) {
    return phase >= 3
      ? 'Consonants are sealed in this arrangement.'
      : 'No Consonant Shift: move vowels only.';
  }
  return 'That letter cannot be moved right now.';
}

/**
 * Check whether a puzzle solution is compatible with variant restrictions.
 * Restriction variants can create impossible puzzles if the moved letters do
 * not match the allowed letter class. We filter those out at generation time.
 */
export function isVariantCompatibleWithSolution(
  variant: PuzzleVariant,
  solution?: PuzzleSolutionStep[]
): boolean {
  if (!solution || solution.length === 0) return true;

  if (hasVariantModifier(variant, 'no_vowel')) {
    return solution.every(step => !isVowel(step.letterToMove));
  }
  if (hasVariantModifier(variant, 'no_consonant')) {
    return solution.every(step => isVowel(step.letterToMove));
  }
  return true;
}
