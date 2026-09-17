import AsyncStorage, { runStorageTransaction } from './persistenceStorage';
import { awardBonusAmberInTransaction, getFullProgress, invalidateProgressCache } from './amberCurrency';

export const QUEST_BONUS_RECEIPTS_KEY = 'wordshift_quest_bonus_receipts';

/** An earned ad may retry after journal recovery, but its amber only pays once. */
export async function grantQuestBonus(receiptId: string, amount: number): Promise<number> {
  if (!receiptId || !Number.isFinite(amount) || amount <= 0) throw new Error('Invalid quest bonus');
  try {
    return await runStorageTransaction('quest_bonus', async () => {
      // Recovery may have applied an earlier attempt before this transaction.
      invalidateProgressCache();
      const stored = await AsyncStorage.getItem(QUEST_BONUS_RECEIPTS_KEY);
      const receipts: string[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(receipts) || receipts.some(id => typeof id !== 'string')) {
        throw new Error('Quest bonus receipts could not be read');
      }
      if (receipts.includes(receiptId)) return (await getFullProgress()).amber;
      const balance = await awardBonusAmberInTransaction(amount, 'quest_bonus');
      await AsyncStorage.setItem(QUEST_BONUS_RECEIPTS_KEY, JSON.stringify([...receipts, receiptId]));
      return balance;
    });
  } catch (error) {
    invalidateProgressCache();
    throw error;
  }
}
