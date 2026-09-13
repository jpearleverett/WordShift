import AsyncStorage, { runStorageTransaction } from './persistenceStorage';
import { awardBonusAmberInTransaction, getFullProgress, invalidateProgressCache } from './amberCurrency';
import { VICTORY_RECEIPT_KEY } from './victoryPersistence';
import type { VictoryData } from '../hooks/useGamePersistence';

export type VictoryDoubleResult =
  | { status: 'unavailable' }
  | { status: 'claimed' | 'already_claimed'; amount: number; newBalance: number };

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
      const amount = receipt.result.amberEarned;
      if (!Number.isFinite(amount) || amount <= 0) return { status: 'unavailable' };
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
