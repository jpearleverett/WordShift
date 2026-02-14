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

export interface VariantUnlockRequirement {
  puzzlesSolved: number;
  /**
   * Internal gating depth. Never exposed to players as phase numbers in UI.
   */
  minDepthPhase: number;
  group: 'base' | 'combo';
}

export interface VariantSelectorOption {
  variant: PuzzleVariant;
  config: VariantConfig;
  group: 'core' | 'base' | 'combo';
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
  blind: {
    variant: 'blind',
    title: 'Blind Shift',
    description: 'Future rows are hidden until you reach them.',
    darkDescription: 'The next words conceal themselves. Move anyway.',
    instruction: 'Trust the pattern: upcoming words stay hidden until revealed.',
    darkInstruction: 'Step into unseen words. They reveal only when touched.',
    icon: '🫣',
    amberMultiplier: 1.28,
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
  chain: {
    variant: 'chain',
    title: 'Chain Shift',
    description: 'Three linked puzzles. Each final word becomes the next starting word.',
    darkDescription: 'An unbroken sequence where each ending must feed the next beginning.',
    instruction: 'Complete 3 links in a row. The last word of each link starts the next one.',
    darkInstruction: 'Do not break the chain. Each ending must become the next opening.',
    icon: '🔗',
    amberMultiplier: 1.58,
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
    amberMultiplier: 1.2,
  },
  no_consonant: {
    variant: 'no_consonant',
    title: 'No Consonant Shift',
    description: 'Consonants are locked. Move vowels only.',
    darkDescription: 'Only pure vowels may pass through the pattern.',
    instruction: 'Only vowels may be moved in this variant.',
    darkInstruction: 'Consonants are sealed. Shift only open vowels.',
    icon: '🫧',
    amberMultiplier: 1.2,
  },
  reverse_blind: {
    variant: 'reverse_blind',
    title: 'Reverse Blind Shift',
    description: 'Go down and back up while hidden rows reveal gradually.',
    darkDescription: 'Descend and return through words you cannot fully see.',
    instruction: 'Reach the bottom, then return to the first row in partial darkness.',
    darkInstruction: 'Trace the pattern down and up while the words stay veiled.',
    icon: '🌘',
    amberMultiplier: 1.5,
  },
  blind_no_vowel: {
    variant: 'blind_no_vowel',
    title: 'Blind + No Vowel',
    description: 'Hidden rows and consonant-only movement.',
    darkDescription: 'Unseen words. Silenced vowels.',
    instruction: 'Rows are hidden and only consonants may move.',
    darkInstruction: 'The hidden pattern forbids vowels. Move consonants by faith.',
    icon: '🌑',
    amberMultiplier: 1.45,
  },
  blind_no_consonant: {
    variant: 'blind_no_consonant',
    title: 'Blind + No Consonant',
    description: 'Hidden rows and vowel-only movement.',
    darkDescription: 'Unseen words. Sealed consonants.',
    instruction: 'Rows are hidden and only vowels may move.',
    darkInstruction: 'The hidden pattern seals consonants. Move vowels only.',
    icon: '🩸',
    amberMultiplier: 1.45,
  },
  speed_no_vowel: {
    variant: 'speed_no_vowel',
    title: 'Speed + No Vowel',
    description: 'Fast sprint with consonant-only movement.',
    darkDescription: 'Run fast while vowels are forbidden.',
    instruction: 'Three-row sprint. Only consonants may move.',
    darkInstruction: 'Hurry. Vowels are forbidden and time is collapsing.',
    icon: '⚡',
    amberMultiplier: 1.52,
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
    amberMultiplier: 1.52,
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

const BASE_VARIANTS: VariantModifier[] = [
  'reverse',
  'blind',
  'no_vowel',
  'speed',
  'no_consonant',
  'chain',
];

const COMBO_VARIANTS: ComboVariant[] = [
  'reverse_blind',
  'blind_no_vowel',
  'blind_no_consonant',
  'speed_no_vowel',
  'speed_no_consonant',
];

const SPEED_TIME_LIMIT_BY_DIFFICULTY: Record<Difficulty, number> = {
  EASY: 65,
  MEDIUM: 60,
  MEDIUM_PLUS: 54,
  HARD: 48,
};

const VARIANT_UNLOCK_REQUIREMENTS: Record<Exclude<PuzzleVariant, 'standard'>, VariantUnlockRequirement> = {
  reverse: { puzzlesSolved: 18, minDepthPhase: 0, group: 'base' },
  blind: { puzzlesSolved: 30, minDepthPhase: 0, group: 'base' },
  no_vowel: { puzzlesSolved: 45, minDepthPhase: 0, group: 'base' },
  speed: { puzzlesSolved: 60, minDepthPhase: 0, group: 'base' },
  no_consonant: { puzzlesSolved: 75, minDepthPhase: 0, group: 'base' },
  chain: { puzzlesSolved: 95, minDepthPhase: 0, group: 'base' },
  reverse_blind: { puzzlesSolved: 120, minDepthPhase: 2, group: 'combo' },
  blind_no_vowel: { puzzlesSolved: 120, minDepthPhase: 2, group: 'combo' },
  blind_no_consonant: { puzzlesSolved: 150, minDepthPhase: 3, group: 'combo' },
  speed_no_vowel: { puzzlesSolved: 150, minDepthPhase: 3, group: 'combo' },
  speed_no_consonant: { puzzlesSolved: 190, minDepthPhase: 4, group: 'combo' },
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
  for (const variant of [...BASE_VARIANTS, ...COMBO_VARIANTS]) {
    if (isVariantUnlocked(variant, puzzlesSolved, currentPhase)) {
      unlocked.push(variant);
    }
  }
  return unlocked;
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
    options.push({
      variant,
      config: VARIANT_CONFIGS[variant],
      group: 'base',
      unlocked: isVariantUnlocked(variant, puzzlesSolved, currentPhase),
      unlockHint: getVariantUnlockHint(variant, puzzlesSolved, currentPhase, uiPhase),
    });
  }

  for (const variant of COMBO_VARIANTS) {
    const unlocked = isVariantUnlocked(variant, puzzlesSolved, currentPhase);
    const requirement = VARIANT_UNLOCK_REQUIREMENTS[variant];
    const remainingPuzzles = Math.max(0, requirement.puzzlesSolved - puzzlesSolved);
    const isNearUnlock = !unlocked &&
      remainingPuzzles <= 25 &&
      currentPhase >= Math.max(0, requirement.minDepthPhase - 1);

    if (!unlocked && !isNearUnlock) {
      continue;
    }

    options.push({
      variant,
      config: VARIANT_CONFIGS[variant],
      group: 'combo',
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

function getUnlockedComboVariants(puzzlesSolved: number, currentPhase: number): PuzzleVariant[] {
  return COMBO_VARIANTS.filter(variant => isVariantUnlocked(variant, puzzlesSolved, currentPhase));
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

  const basePool = getUnlockedBaseVariants(puzzlesSolved, currentPhase);
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
  baseDifficulty: Difficulty
): { targetRows?: number; wordLength?: number } {
  if (hasVariantModifier(variant, 'speed')) {
    return { targetRows: baseDifficulty === 'HARD' ? 4 : 3 };
  }
  if (hasVariantModifier(variant, 'chain')) {
    return { targetRows: (baseDifficulty === 'HARD' || baseDifficulty === 'MEDIUM_PLUS') ? 4 : 3 };
  }
  return {};
}

/**
 * Chain runs can deepen on higher difficulties.
 */
export function getVariantChainLength(
  variant: PuzzleVariant,
  difficulty: Difficulty
): number {
  if (!hasVariantModifier(variant, 'chain')) return 1;
  const base = VARIANT_CONFIGS.chain.chainLength || 3;
  if (difficulty === 'HARD') return base + 1;
  return base;
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
