import type { VictoryData } from '../hooks/useGamePersistence';

/**
 * How much the optional 2x adds for a victory: the PER-PUZZLE share only. The
 * one-time windfalls (puzzle-count milestone, first completion, streak
 * milestone) are credited once and are not doubled. The receipt stores the
 * full VictoryData, whose windfall fields have long been present; a receipt
 * that carries none of them (older or fallback shape) doubles the whole amount
 * as before. Never negative. Kept free of storage imports so the victory screen can show the
 * same number the claim credits without loading the save layer.
 */
export function getVictoryDoubleAmount(
  result: Partial<Pick<VictoryData, 'amberEarned' | 'milestoneBonus' | 'firstCompletionBonus' | 'streakMilestoneBonus'>> | null | undefined,
): number {
  const earned = result?.amberEarned;
  if (typeof earned !== 'number' || !Number.isFinite(earned) || earned <= 0) return 0;
  const windfall = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
  const windfalls = windfall(result?.milestoneBonus) + windfall(result?.firstCompletionBonus) +
    windfall(result?.streakMilestoneBonus);
  return Math.max(0, Math.round(earned - windfalls));
}
