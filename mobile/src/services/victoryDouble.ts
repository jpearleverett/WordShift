import AsyncStorage, { runStorageTransaction } from './persistenceStorage';
import { awardBonusAmberInTransaction, getFullProgress, invalidateProgressCache } from './amberCurrency';
import { VICTORY_RECEIPT_KEY } from './victoryPersistence';
import type { VictoryData } from '../hooks/useGamePersistence';

export type VictoryDoubleResult =
  | { status: 'unavailable' }
  | { status: 'claimed' | 'already_claimed'; amount: number; newBalance: number };

/**
 * How much the optional 2x adds for a victory: the PER-PUZZLE share only. The
 * one-time windfalls (puzzle-count milestone, first completion, streak
 * milestone) are credited once and are not doubled. The receipt stores the
 * full VictoryData, whose windfall fields have long been present; a receipt
 * that carries none of them (older or fallback shape) doubles the whole amount
 * as before. Never negative. Exported so the victory screen can show the same
 * number the claim credits.
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

/** The latest durable victory owns its optional bonus. A stale callback cannot
 * claim another board's reward, and journal replay commits both credit and marker. */
export async function claimVictoryDouble(completionId: string): Promise<VictoryDoubleResult> {
  if (!completionId) return { status: 'unavailable' };
  try {
    return await runStorageTransaction('victory_double', async () => {
      invalidateProgressCache();
      const raw = await AsyncStorage.getItem(VICTORY_RECEIPT_KEY);
      if (!raw) return { status: 'unavailable' };
      const receipt = JSON.parse(raw) as {
        id?: string; result?: VictoryData; rewardedDoubleClaimed?: boolean;
      };
      if (!receipt || receipt.id !== completionId || receipt.result?.harvestBatchId !== completionId) {
        return { status: 'unavailable' };
      }
      const amount = getVictoryDoubleAmount(receipt.result);
      if (amount <= 0) return { status: 'unavailable' };
      if (receipt.rewardedDoubleClaimed === true) {
        return { status: 'already_claimed', amount: 0, newBalance: (await getFullProgress()).amber };
      }
      const newBalance = await awardBonusAmberInTransaction(amount, 'rewarded_victory_double');
      await AsyncStorage.setItem(VICTORY_RECEIPT_KEY, JSON.stringify({ ...receipt, rewardedDoubleClaimed: true }));
      return { status: 'claimed', amount, newBalance };
    });
  } finally {
    invalidateProgressCache();
  }
}
