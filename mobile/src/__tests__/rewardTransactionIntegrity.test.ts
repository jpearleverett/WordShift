import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFullProgress, invalidateProgressCache } from '../services/amberCurrency';
import { claimDailyLoginReward, invalidateDailyLoginCache } from '../services/dailyLoginReward';
import { ACHIEVEMENTS, buildAchievementCheckState, checkAchievements, invalidateAchievementsCache } from '../services/achievements';
import { grantFirstDailyMercy, invalidateDailyProgressCache, loadDailyProgress, claimDailyStreakMilestoneInTransaction, recordDailyCompletion } from '../services/dailyChallenge';
import { maybeAwardDailyShareBonus } from '../services/shareResults';
import { commitSacrifice, invalidateSacrificeCache, getSacrificeStats } from '../services/sacrifice';
import { getHintBalance, invalidateHintsCache } from '../services/hints';
import { FIRST_DAILY_BONUS_HINTS } from '../constants/gameBalance';
import { recoverPendingStorageTransaction, runStorageTransaction, STORAGE_COMMIT_KEY } from '../services/persistenceStorage';
import { invalidateQuestCache } from '../services/weeklyQuests';
import { getLocalDateString, getLocalDateStringDaysAgo } from '../services/dateUtils';

jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());
jest.mock('react-native', () => ({ Share: { share: jest.fn(), sharedAction: 'sharedAction' }, Platform: { OS: 'ios' } }));
jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn() }));

const write = (AsyncStorage.setItem as jest.Mock).getMockImplementation()!;
const read = (AsyncStorage.getItem as jest.Mock).getMockImplementation()!;

function invalidateAll() {
  invalidateProgressCache();
  invalidateDailyLoginCache();
  invalidateAchievementsCache();
  invalidateDailyProgressCache();
  invalidateHintsCache();
  invalidateSacrificeCache();
  invalidateQuestCache();
}

beforeEach(async () => {
  (AsyncStorage.setItem as jest.Mock).mockImplementation(write);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(read);
  await AsyncStorage.clear();
  invalidateAll();
  const progress = await getFullProgress();
  await AsyncStorage.setItem('wordshift_home_progress', JSON.stringify({ ...progress, amber: 1000, currentPhase: 4 }));
  await AsyncStorage.setItem('wordshift_hints', JSON.stringify({ balance: 7, seededFree: true }));
  invalidateAll();
});

async function scenario(kind: string) {
  if (kind === 'login') return {
    receipt: 'wordshift_daily_login', delta: 10,
    run: () => claimDailyLoginReward(),
  };
  if (kind === 'mercy') return {
    receipt: 'wordshift_daily_challenge', delta: 0,
    run: () => grantFirstDailyMercy(),
  };
  if (kind === 'share') return {
    receipt: 'wordshift_share_bonus_date', delta: 5,
    run: () => maybeAwardDailyShareBonus(),
  };
  if (kind === 'sacrifice') return {
    receipt: 'wordshift_sacrifices', delta: -25,
    run: () => commitSacrifice('same-gesture', 25, 4),
  };
  const state = await buildAchievementCheckState();
  state.stats = { ...state.stats, totalPuzzlesCompleted: 1 };
  return {
    receipt: 'wordshift_achievements',
    delta: ACHIEVEMENTS.filter(achievement => achievement.check(state)).reduce((sum, achievement) => sum + achievement.rewardAmber, 0),
    run: () => checkAchievements(state),
  };
}

describe.each(['login', 'mercy', 'share', 'sacrifice', 'achievement'])('%s reward integrity', kind => {
  test.each(['journal', 'apply'])('failure during %s is recoverable and retry never pays or spends twice', async stage => {
    const testCase = await scenario(kind);
    const failingKey = stage === 'journal' ? STORAGE_COMMIT_KEY : testCase.receipt;
    let failed = false;
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      if (!failed && key === failingKey) {
        failed = true;
        throw new Error('storage full');
      }
      return write(key, value);
    });
    await expect(testCase.run()).rejects.toThrow();
    expect(failed).toBe(true);
    if (stage === 'journal') {
      expect(await AsyncStorage.getItem(testCase.receipt)).toBeNull();
      expect(JSON.parse((await AsyncStorage.getItem('wordshift_home_progress'))!).amber).toBe(1000);
    }
    await recoverPendingStorageTransaction();
    invalidateAll();
    await testCase.run();
    await testCase.run();
    invalidateAll();
    expect((await getFullProgress()).amber).toBe(1000 + testCase.delta);
    expect(await getHintBalance()).toBe(7 + (kind === 'mercy' ? FIRST_DAILY_BONUS_HINTS : 0));
    expect(await AsyncStorage.getItem(testCase.receipt)).not.toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
    if (kind === 'sacrifice') expect(await getSacrificeStats()).toMatchObject({ totalSacrificed: 25, count: 1 });
  });

  test('concurrent identical claims commit once', async () => {
    const testCase = await scenario(kind);
    await Promise.all([testCase.run(), testCase.run()]);
    invalidateAll();
    expect((await getFullProgress()).amber).toBe(1000 + testCase.delta);
    expect(await getHintBalance()).toBe(7 + (kind === 'mercy' ? FIRST_DAILY_BONUS_HINTS : 0));
  });
});

test('daily milestone migration retains historical claims and exact milestone decay retains its checkpoint', async () => {
  await AsyncStorage.setItem('wordshift_daily_challenge', JSON.stringify({
    completedChallenges: [], totalCompleted: 30, currentStreak: 21, bestStreak: 30,
    lastCompletedDate: getLocalDateStringDaysAgo(2), streakFreezes: 0,
    lastFreezeGrantDate: getLocalDateString(), firstDailyMercyGranted: true,
  }));
  const before = await loadDailyProgress();
  expect(before.lastClaimedStreakMilestone).toBe(30);
  const after = await recordDailyCompletion(3, 0, 0);
  expect(after.currentStreak).toBe(21);
  expect(after.streakDecayedTo).toBe(21);
  expect(await runStorageTransaction('daily_milestone_test', () => claimDailyStreakMilestoneInTransaction(20, 4))).toBeNull();
});

test('an earned milestone receipt survives reload and refuses a later re-crossing', async () => {
  const progress = await loadDailyProgress();
  progress.currentStreak = 7;
  expect(await runStorageTransaction('daily_milestone_test', () => claimDailyStreakMilestoneInTransaction(6, 0))).toMatchObject({ amber: 30 });
  invalidateDailyProgressCache();
  expect((await loadDailyProgress()).lastClaimedStreakMilestone).toBe(7);
  expect(await runStorageTransaction('daily_milestone_test', () => claimDailyStreakMilestoneInTransaction(6, 0))).toBeNull();
});
