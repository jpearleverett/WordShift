import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearProgress, getAmberBalance } from '../services/amberCurrency';
import { claimAllReadyQuests, clearWeeklyQuests, getDayId, getWeekId, loadWeeklyQuests } from '../services/weeklyQuests';

jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn(), getInstallAgeDays: async () => 0 }));
const quest = (id: string, rewardAmber: number, completed = true) => ({
  id, type: 'solve_count', tier: 'daily', title: id, description: id,
  target: 1, progress: completed ? 1 : 0, completed, claimed: false, rewardAmber,
});
beforeEach(async () => {
  await AsyncStorage.clear();
  await clearProgress();
  await clearWeeklyQuests();
  await AsyncStorage.setItem('wordshift_daily_quests', JSON.stringify({
    periodId: getDayId(), quests: [quest('daily_ready', 10), quest('not_ready', 90, false)],
    generatedAt: Date.now(), animalsVisitedThisPeriod: [],
  }));
  await AsyncStorage.setItem('wordshift_weekly_quests', JSON.stringify({
    periodId: getWeekId(), quests: [{ ...quest('weekly_ready', 20), tier: 'weekly' }],
    generatedAt: Date.now(), animalsVisitedThisPeriod: [],
  }));
});

test('two simultaneous claim-all requests credit each ready reward once and leave unfinished quests alone', async () => {
  const results = await Promise.all([claimAllReadyQuests(), claimAllReadyQuests()]);
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(results.find(Boolean)).toEqual({ amber: 30, balance: 30, questIds: ['daily_ready', 'weekly_ready'] });
  expect(await getAmberBalance()).toBe(30);
  expect((await loadWeeklyQuests()).daily.quests.find(q => q.id === 'not_ready')?.claimed).toBe(false);
});

test('a single/subset claim shares the same ready-only, phase-scaled accounting', async () => {
  expect(await claimAllReadyQuests(3, ['weekly_ready', 'not_ready', 'weekly_ready'])).toEqual({ amber: 30, balance: 30, questIds: ['weekly_ready'] });
  expect(await claimAllReadyQuests(3)).toEqual({ amber: 15, balance: 45, questIds: ['daily_ready'] });
  expect(await claimAllReadyQuests(3)).toBeNull();
});

test('a failed commit leaves neither a spent reward flag nor extra amber, and retry succeeds once', async () => {
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  await expect(claimAllReadyQuests()).rejects.toThrow('disk full');
  expect(await getAmberBalance()).toBe(0);
  expect((await loadWeeklyQuests()).daily.quests.find(q => q.id === 'daily_ready')?.claimed).toBe(false);
  expect(await claimAllReadyQuests()).toEqual({ amber: 30, balance: 30, questIds: ['daily_ready', 'weekly_ready'] });
});
