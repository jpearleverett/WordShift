/**
 * Puzzle variety modes for WordShift.
 *
 * Every ~10th puzzle (or randomly with ~10% chance), the player is offered
 * a variant puzzle mode that changes how the core mechanic feels without
 * altering the underlying word chain generation.
 *
 * Modes:
 * - REVERSE:  Drop letter first, then pick where to remove
 * - BLIND:    Target words are hidden until the player makes a move
 * - SPEED:    60-second timer, reduced row count (3 rows regardless of difficulty)
 * - CHAIN:    Complete 3 mini-puzzles in sequence; final word of each feeds the next
 */

import { Difficulty } from '../types';

// ============================================================================
// Types
// ============================================================================

export type PuzzleVariant = 'standard' | 'reverse' | 'blind' | 'speed' | 'chain';

export interface VariantConfig {
  variant: PuzzleVariant;
  title: string;
  description: string;
  /** Phase 3+ dark description */
  darkDescription: string;
  icon: string;
  /** Amber multiplier for completing this variant */
  amberMultiplier: number;
  /** For speed mode: time limit in seconds */
  timeLimit?: number;
  /** For speed mode: override row count */
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
    description: 'The classic WordShift experience',
    darkDescription: 'The familiar arrangement',
    icon: '📝',
    amberMultiplier: 1.0,
  },
  reverse: {
    variant: 'reverse',
    title: 'Reverse Shift',
    description: 'Drop the letter first, then choose where to remove!',
    darkDescription: 'The words demand to be filled before they are emptied.',
    icon: '🔄',
    amberMultiplier: 1.3,
  },
  blind: {
    variant: 'blind',
    title: 'Blind Shift',
    description: 'Target words are hidden until you place a letter.',
    darkDescription: 'The words conceal themselves. Trust the pattern.',
    icon: '🫣',
    amberMultiplier: 1.4,
  },
  speed: {
    variant: 'speed',
    title: 'Speed Shift',
    description: '60 seconds. 3 rows. Go!',
    darkDescription: 'The arrangement does not wait. Neither should you.',
    icon: '⚡',
    amberMultiplier: 1.5,
    timeLimit: 60,
    rowOverride: 3,
  },
  chain: {
    variant: 'chain',
    title: 'Chain Shift',
    description: '3 linked puzzles — each one flows into the next.',
    darkDescription: 'Three incantations, chained. The pattern demands continuity.',
    icon: '🔗',
    amberMultiplier: 2.0,
    chainLength: 3,
  },
};

// ============================================================================
// Variant Selection
// ============================================================================

/**
 * Determine if this puzzle should offer a variant mode.
 * Returns a variant config or null for standard play.
 *
 * Triggers on:
 * - Every 10th puzzle (guaranteed)
 * - ~10% random chance on other puzzles (after puzzle 15)
 */
export function shouldOfferVariant(
  puzzlesSolved: number,
  currentPhase: number
): VariantConfig | null {
  // Don't offer variants in the first 15 puzzles (let players learn standard first)
  if (puzzlesSolved < 15) return null;

  // Don't offer during onboarding-adjacent period
  const isVariantPuzzle = puzzlesSolved % 10 === 0 || (puzzlesSolved > 15 && Math.random() < 0.10);
  if (!isVariantPuzzle) return null;

  // Select a variant (weighted by phase — darker phases unlock more variants)
  const availableVariants: PuzzleVariant[] = ['reverse', 'blind'];

  // Speed mode available after 25 puzzles
  if (puzzlesSolved >= 25) {
    availableVariants.push('speed');
  }

  // Chain mode available after 50 puzzles
  if (puzzlesSolved >= 50) {
    availableVariants.push('chain');
  }

  const selected = availableVariants[Math.floor(Math.random() * availableVariants.length)];
  return VARIANT_CONFIGS[selected];
}

/**
 * Get the variant description appropriate for the current phase.
 */
export function getVariantDescription(config: VariantConfig, phase: number): string {
  if (phase >= 3) return config.darkDescription;
  return config.description;
}

/**
 * Get difficulty overrides for a variant mode.
 * Some variants modify the puzzle generation parameters.
 */
export function getVariantOverrides(
  variant: PuzzleVariant,
  baseDifficulty: Difficulty
): { targetRows?: number; wordLength?: number } {
  switch (variant) {
    case 'speed':
      return { targetRows: 3 }; // Always 3 rows for speed
    case 'chain':
      return { targetRows: 3 }; // Each chain link is short
    default:
      return {};
  }
}

/**
 * Check if a variant puzzle was completed within its constraints.
 * For speed mode: checks if completed within time limit.
 * For others: always true (constraints are enforced during play).
 */
export function isVariantCompleted(
  variant: PuzzleVariant,
  elapsedSeconds?: number
): boolean {
  if (variant === 'speed' && elapsedSeconds !== undefined) {
    return elapsedSeconds <= (VARIANT_CONFIGS.speed.timeLimit || 60);
  }
  return true;
}

/**
 * Calculate amber multiplier for a variant completion.
 */
export function getVariantAmberMultiplier(variant: PuzzleVariant): number {
  return VARIANT_CONFIGS[variant]?.amberMultiplier || 1.0;
}
