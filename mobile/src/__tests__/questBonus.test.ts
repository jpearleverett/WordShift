import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearProgress, getAmberBalance } from '../services/amberCurrency';
import { grantQuestBonus, QUEST_BONUS_RECEIPTS_KEY } from '../services/questBonus';
import { STORAGE_COMMIT_KEY } from '../services/persistenceStorage';

jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn(), getInstallAgeDays: async () => 0 }));

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearProgress();
});

test('concurrent callbacks and retries credit the earned quest bonus once', async () => {
  await Promise.all([grantQuestBonus('0:2026-09-17_daily_1', 25), grantQuestBonus('0:2026-09-17_daily_1', 25)]);
  expect(await getAmberBalance()).toBe(25);
  await grantQuestBonus('0:2026-09-18_daily_1', 30);
  expect(await getAmberBalance()).toBe(55);
});

test('a precommit failure leaves both balance and receipt unchanged, then can retry', async () => {
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  await expect(grantQuestBonus('0:quest', 140)).rejects.toThrow('disk full');
  expect(await getAmberBalance()).toBe(0);
  expect(await AsyncStorage.getItem(QUEST_BONUS_RECEIPTS_KEY)).toBeNull();
  expect(await grantQuestBonus('0:quest', 140)).toBe(140);
});

test('a failed apply recovers the original journal and does not credit again on retry', async () => {
  const originalSet = (AsyncStorage.setItem as jest.Mock).getMockImplementation()!;
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (key === QUEST_BONUS_RECEIPTS_KEY) throw new Error('apply interrupted');
    return originalSet(key, value);
  });
  try {
    await expect(grantQuestBonus('0:quest', 140)).rejects.toThrow('recovery');
    expect(await AsyncStorage.getItem(STORAGE_COMMIT_KEY)).not.toBeNull();
  } finally {
    (AsyncStorage.setItem as jest.Mock).mockImplementation(originalSet);
  }
  expect(await grantQuestBonus('0:quest', 140)).toBe(140);
  expect(await getAmberBalance()).toBe(140);
  expect(await AsyncStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
});
