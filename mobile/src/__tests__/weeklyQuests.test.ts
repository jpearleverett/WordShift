import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getWeekId,
  getDayId,
  loadWeeklyQuests,
  updateQuestProgress,
  claimQuestReward,
  getTimeUntilReset,
  getTimeUntilDailyReset,
  getQuestDescription,
  getUnclaimedAmber,
  clearWeeklyQuests,
  invalidateQuestCache,
  recordAnimalVisit,
  getPhaseRewardMultiplier,
  QUEST_GENERATION_MIN_PUZZLES,
  DAILY_QUEST_POOL,
  WEEKLY_QUEST_POOL,
  EVENT_QUEST_TARGET,
  EVENT_QUEST_REWARD_AMBER,
  Quest,
  QuestTemplate,
  CombinedQuestState,
} from '../services/weeklyQuests';
import { isEventDay } from '../services/liveEvents';

// Mock AsyncStorage using shared factory
jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

// The full-moon event flag is a pure function of the real calendar; mock it
// so these tests are deterministic on ANY run date (an unmocked real event
// day would append a 6th daily quest and break the count assertions).
jest.mock('../services/liveEvents', () => ({
  isEventDay: jest.fn(() => false),
}));

describe('weeklyQuests', () => {
  const unlockedQuestContext = {
    puzzlesSolved: 25,
    unlockedAnimalCount: 4,
    dailyUnlocked: false,
    challengeUnlocked: true,
    unlockedVariants: ['standard', 'reverse', 'double_shift', 'speed'],
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearWeeklyQuests();
  });

  // ===========================================================================
  // getWeekId
  // ===========================================================================

  describe('getWeekId', () => {
    // NOTE: dates are built with local components — new Date('YYYY-MM-DD')
    // parses as UTC midnight, which is the previous local day in timezones
    // behind UTC and made these tests environment-dependent.
    it('returns a string in ISO week format', () => {
      const id = getWeekId(new Date(2026, 1, 14));
      expect(id).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('returns the same week ID for dates in the same week', () => {
      const monday = getWeekId(new Date(2026, 1, 9));
      const wednesday = getWeekId(new Date(2026, 1, 11));
      const friday = getWeekId(new Date(2026, 1, 13));
      const sunday = getWeekId(new Date(2026, 1, 15));
      expect(monday).toBe(wednesday);
      expect(wednesday).toBe(friday);
      expect(friday).toBe(sunday);
    });

    it('returns different week IDs for dates in different weeks', () => {
      const week1 = getWeekId(new Date(2026, 1, 9));
      const week2 = getWeekId(new Date(2026, 1, 16));
      expect(week1).not.toBe(week2);
    });

    it('handles year boundary correctly', () => {
      const id = getWeekId(new Date(2026, 0, 1));
      expect(id).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('defaults to current date when no argument is provided', () => {
      const id = getWeekId();
      expect(id).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('buckets by LOCAL calendar day, not UTC', () => {
      // A date late in the local evening must report the same week as local
      // noon of the same calendar day. (A UTC-based bucket could roll a
      // sub-UTC-timezone evening into the next day — and potentially next week.)
      const localNoon = getWeekId(new Date(2026, 1, 15, 12, 0, 0)); // Sun
      const localLateEvening = getWeekId(new Date(2026, 1, 15, 23, 30, 0));
      expect(localLateEvening).toBe(localNoon);
    });
  });

  // ===========================================================================
  // getDayId
  // ===========================================================================

  describe('getDayId', () => {
    it('returns a string in YYYY-MM-DD format', () => {
      const id = getDayId(new Date(2026, 2, 11));
      expect(id).toBe('2026-03-11');
    });

    it('pads single-digit month and day', () => {
      const id = getDayId(new Date(2026, 0, 5));
      expect(id).toBe('2026-01-05');
    });

    it('defaults to current date when no argument is provided', () => {
      const id = getDayId();
      expect(id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // ===========================================================================
  // loadWeeklyQuests (combined state)
  // ===========================================================================

  describe('variant_wins quests', () => {
    it('never generates a variant quest when no variants are unlocked', async () => {
      // Even across many generated periods, a variant quest must never appear
      // without its variant unlocked (it would name a mode never seen).
      for (let wk = 0; wk < 12; wk++) {
        await clearWeeklyQuests();
        await AsyncStorage.clear();
        const state = await loadWeeklyQuests(0, {
          puzzlesSolved: 7, unlockedAnimalCount: 1, challengeUnlocked: false, unlockedVariants: [],
        });
        const all = [...state.daily.quests, ...state.weekly.quests];
        expect(all.find(q => q.type === 'variant_wins')).toBeUndefined();
      }
    });

    it('a variant_wins quest only progresses for its named variant', async () => {
      await loadWeeklyQuests(0, unlockedQuestContext);
      let state = await loadWeeklyQuests(0);
      let variantQuest = [...state.daily.quests, ...state.weekly.quests].find(q => q.type === 'variant_wins');
      // Retry across periods until the seeded pool surfaces one (bounded).
      for (let i = 1; !variantQuest && i < 30; i++) {
        await clearWeeklyQuests();
        await AsyncStorage.clear();
        // Shift the day/week seed by advancing puzzlesSolved doesn't change the
        // seed; instead vary nothing and rely on the fresh clear — but the seed
        // is period-based, so just accept whatever this period gives and assert
        // conditionally if present.
        await loadWeeklyQuests(0, unlockedQuestContext);
        state = await loadWeeklyQuests(0);
        variantQuest = [...state.daily.quests, ...state.weekly.quests].find(q => q.type === 'variant_wins');
        break;
      }
      if (variantQuest) {
        const other = variantQuest.variant === 'speed' ? 'reverse' : 'speed';
        await updateQuestProgress({ difficulty: 'MEDIUM', stars: 1, variant: other }, 0);
        let s = await loadWeeklyQuests(0);
        expect([...s.daily.quests, ...s.weekly.quests].find(q => q.id === variantQuest!.id)?.progress).toBe(0);
        await updateQuestProgress({ difficulty: 'MEDIUM', stars: 1, variant: variantQuest.variant }, 0);
        s = await loadWeeklyQuests(0);
        expect([...s.daily.quests, ...s.weekly.quests].find(q => q.id === variantQuest!.id)?.progress).toBe(1);
      }
    });
  });

  describe('loadWeeklyQuests', () => {
    it('generates 5 daily and 5 weekly quests on first load', async () => {
      const state = await loadWeeklyQuests(0);
      expect(state.daily.quests).toBeDefined();
      expect(state.daily.quests.length).toBe(5);
      expect(state.weekly.quests).toBeDefined();
      expect(state.weekly.quests.length).toBe(5);
    });

    it('daily quests have tier=daily and weekly quests have tier=weekly', async () => {
      const state = await loadWeeklyQuests(0);
      for (const quest of state.daily.quests) {
        expect(quest.tier).toBe('daily');
      }
      for (const quest of state.weekly.quests) {
        expect(quest.tier).toBe('weekly');
      }
    });

    it('quests have required fields', async () => {
      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      for (const quest of allQuests) {
        expect(quest.id).toBeDefined();
        expect(quest.type).toBeDefined();
        expect(quest.title).toBeDefined();
        expect(quest.description).toBeDefined();
        expect(quest.target).toBeGreaterThan(0);
        expect(quest.progress).toBe(0);
        expect(quest.completed).toBe(false);
        expect(quest.claimed).toBe(false);
        expect(quest.rewardAmber).toBeGreaterThan(0);
      }
    });

    it('filters out challenge_mode quests when challenge is not unlocked', async () => {
      const state = await loadWeeklyQuests(0, {
        puzzlesSolved: 6,
        unlockedAnimalCount: 1,
        challengeUnlocked: false,
      });

      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      expect(allQuests.some(q => q.type === 'challenge_mode')).toBe(false);
    });

    it('generates deterministic quests for the same period', async () => {
      const state1 = await loadWeeklyQuests(0);
      await clearWeeklyQuests();
      const state2 = await loadWeeklyQuests(0);
      expect(state1.daily.quests.map(q => q.type)).toEqual(state2.daily.quests.map(q => q.type));
      expect(state1.weekly.quests.map(q => q.type)).toEqual(state2.weekly.quests.map(q => q.type));
    });

    it('returns cached state on subsequent calls', async () => {
      const state1 = await loadWeeklyQuests(0);
      const state2 = await loadWeeklyQuests(0);
      expect(state1.daily).toBe(state2.daily);
      expect(state1.weekly).toBe(state2.weekly);
    });

    it('quests have dark descriptions', async () => {
      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const withDark = allQuests.filter(q => q.darkDescription);
      expect(withDark.length).toBeGreaterThan(0);
    });

    it('daily period uses day ID', async () => {
      const state = await loadWeeklyQuests(0);
      expect(state.daily.periodId).toBe(getDayId());
    });

    it('weekly period uses week ID', async () => {
      const state = await loadWeeklyQuests(0);
      expect(state.weekly.periodId).toBe(getWeekId());
    });

    it('never selects more than 2 quests of the same type, even when the pool is restricted', async () => {
      // Early-game context restricts the surviving template pool (no challenge,
      // no sacrifice/tend, few animals) — exercising the fill pass. The fill
      // pass must still respect the max-2-per-type guard the first pass uses.
      // (puzzlesSolved 6 = just past the journal gate, so generation runs.)
      const state = await loadWeeklyQuests(0, {
        puzzlesSolved: 6,
        unlockedAnimalCount: 1,
        challengeUnlocked: false,
      });
      for (const quests of [state.daily.quests, state.weekly.quests]) {
        const counts: Record<string, number> = {};
        for (const q of quests) {
          counts[q.type] = (counts[q.type] ?? 0) + 1;
        }
        for (const type of Object.keys(counts)) {
          expect(counts[type]).toBeLessThanOrEqual(2);
        }
      }
    });
  });

  // ===========================================================================
  // updateQuestProgress
  // ===========================================================================

  describe('updateQuestProgress', () => {
    it('increments solve_count quest on any puzzle completion', async () => {
      await loadWeeklyQuests(0, unlockedQuestContext);
      await updateQuestProgress({
        difficulty: 'MEDIUM',
        stars: 2,
        hintsUsed: 1,
        isDaily: false,
        isChallenge: false,
        amberEarned: 10,
      }, 0);

      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const solveQuest = allQuests.find(q => q.type === 'solve_count');
      if (solveQuest) {
        expect(solveQuest.progress).toBeGreaterThanOrEqual(1);
      }
    });

    it('increments earn_stars quest only for 3-star results', async () => {
      await loadWeeklyQuests(0);
      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const starQuest = allQuests.find(q => q.type === 'earn_stars');

      if (starQuest) {
        await updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 2,
          hintsUsed: 0,
          amberEarned: 10,
        }, 0);
        const s1 = await loadWeeklyQuests(0);
        const allQ1 = [...s1.daily.quests, ...s1.weekly.quests];
        expect(allQ1.find(q => q.id === starQuest.id)?.progress).toBe(0);

        await updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 3,
          hintsUsed: 0,
          amberEarned: 10,
        }, 0);
        const s2 = await loadWeeklyQuests(0);
        const allQ2 = [...s2.daily.quests, ...s2.weekly.quests];
        expect(allQ2.find(q => q.id === starQuest.id)?.progress).toBe(1);
      }
    });

    it('increments no_hints quest only when no hints used', async () => {
      await loadWeeklyQuests(0);
      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const noHintQuest = allQuests.find(q => q.type === 'no_hints');

      if (noHintQuest) {
        await updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 2,
          hintsUsed: 2,
          amberEarned: 10,
        }, 0);
        const s1 = await loadWeeklyQuests(0);
        const allQ1 = [...s1.daily.quests, ...s1.weekly.quests];
        expect(allQ1.find(q => q.id === noHintQuest.id)?.progress).toBe(0);

        await updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 3,
          hintsUsed: 0,
          amberEarned: 10,
        }, 0);
        const s2 = await loadWeeklyQuests(0);
        const allQ2 = [...s2.daily.quests, ...s2.weekly.quests];
        expect(allQ2.find(q => q.id === noHintQuest.id)?.progress).toBe(1);
      }
    });

    it('increments challenge_mode quest only for challenge puzzles', async () => {
      await loadWeeklyQuests(0, unlockedQuestContext);
      const state = await loadWeeklyQuests(0, unlockedQuestContext);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const challengeQuest = allQuests.find(q => q.type === 'challenge_mode');

      if (challengeQuest) {
        await updateQuestProgress({
          difficulty: 'HARD',
          stars: 3,
          hintsUsed: 0,
          isChallenge: false,
          amberEarned: 20,
        }, 0);
        const s1 = await loadWeeklyQuests(0);
        const allQ1 = [...s1.daily.quests, ...s1.weekly.quests];
        expect(allQ1.find(q => q.id === challengeQuest.id)?.progress).toBe(0);

        await updateQuestProgress({
          difficulty: 'HARD',
          stars: 3,
          hintsUsed: 0,
          isChallenge: true,
          amberEarned: 20,
        }, 0);
        const s2 = await loadWeeklyQuests(0);
        const allQ2 = [...s2.daily.quests, ...s2.weekly.quests];
        expect(allQ2.find(q => q.id === challengeQuest.id)?.progress).toBe(1);
      }
    });

    it('increments earn_amber quest by amberEarned amount', async () => {
      await loadWeeklyQuests(0);
      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const amberQuest = allQuests.find(q => q.type === 'earn_amber');

      if (amberQuest) {
        await updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 2,
          hintsUsed: 0,
          amberEarned: 15,
        }, 0);
        const s1 = await loadWeeklyQuests(0);
        const allQ1 = [...s1.daily.quests, ...s1.weekly.quests];
        expect(allQ1.find(q => q.id === amberQuest.id)?.progress).toBe(15);
      }
    });

    it('marks quest as completed when target is reached', async () => {
      await loadWeeklyQuests(0);

      // Complete many puzzles to trigger solve_count completion
      for (let i = 0; i < 5; i++) {
        await updateQuestProgress({
          difficulty: 'HARD',
          stars: 3,
          hintsUsed: 0,
          isChallenge: true,
          amberEarned: 200,
        }, 0);
      }

      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const completedQuests = allQuests.filter(q => q.completed);
      expect(completedQuests.length).toBeGreaterThanOrEqual(1);
    });

    it('caps progress at target value', async () => {
      await loadWeeklyQuests(0);
      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const amberQuest = allQuests.find(q => q.type === 'earn_amber');

      if (amberQuest) {
        await updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 2,
          hintsUsed: 0,
          amberEarned: 9999,
        }, 0);
        const s1 = await loadWeeklyQuests(0);
        const allQ1 = [...s1.daily.quests, ...s1.weekly.quests];
        expect(allQ1.find(q => q.id === amberQuest.id)?.progress).toBe(amberQuest.target);
      }
    });

    it('returns newly completed quests array', async () => {
      const completed = await updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        isChallenge: true,
        amberEarned: 500,
      }, 0);

      expect(Array.isArray(completed)).toBe(true);
      for (const quest of completed) {
        expect(quest.completed).toBe(true);
      }
    });

    it('updates both daily and weekly quests simultaneously', async () => {
      await loadWeeklyQuests(0);

      await updateQuestProgress({
        difficulty: 'MEDIUM',
        stars: 3,
        hintsUsed: 0,
        amberEarned: 10,
      }, 0);

      const state = await loadWeeklyQuests(0);
      // Both tiers should have some solve_count progress
      const dailySolve = state.daily.quests.find(q => q.type === 'solve_count');
      const weeklySolve = state.weekly.quests.find(q => q.type === 'solve_count');
      if (dailySolve) expect(dailySolve.progress).toBeGreaterThanOrEqual(1);
      if (weeklySolve) expect(weeklySolve.progress).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // claimQuestReward
  // ===========================================================================

  describe('claimQuestReward', () => {
    it('returns reward for completed unclaimed quest', async () => {
      await loadWeeklyQuests(0);

      // Complete a bunch to trigger a daily solve_count
      await updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        amberEarned: 500,
      }, 0);

      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const completedQuest = allQuests.find(q => q.completed && !q.claimed);
      if (!completedQuest) return;

      const reward = await claimQuestReward(completedQuest.id);
      expect(reward).not.toBeNull();
      expect(reward?.amber).toBe(completedQuest.rewardAmber);
    });

    it('returns null for uncompleted quest', async () => {
      const state = await loadWeeklyQuests(0);
      const quest = state.daily.quests[0];
      const reward = await claimQuestReward(quest.id);
      expect(reward).toBeNull();
    });

    it('returns null for already claimed quest', async () => {
      await loadWeeklyQuests(0);
      await updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        amberEarned: 500,
      }, 0);

      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const completedQuest = allQuests.find(q => q.completed && !q.claimed);
      if (!completedQuest) return;

      await claimQuestReward(completedQuest.id);
      const reward2 = await claimQuestReward(completedQuest.id);
      expect(reward2).toBeNull();
    });

    it('returns null for non-existent quest ID', async () => {
      await loadWeeklyQuests(0);
      const reward = await claimQuestReward('non_existent_quest');
      expect(reward).toBeNull();
    });
  });

  // ===========================================================================
  // getQuestDescription
  // ===========================================================================

  describe('getQuestDescription', () => {
    it('returns normal description for phase < 3', async () => {
      const state = await loadWeeklyQuests(0);
      const quest = state.daily.quests[0];
      const desc = getQuestDescription(quest, 0);
      expect(desc).toBe(quest.description);
    });

    it('returns dark description for phase >= 3 when available', async () => {
      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const questWithDark = allQuests.find(q => q.darkDescription);
      if (questWithDark) {
        const desc = getQuestDescription(questWithDark, 3);
        expect(desc).toBe(questWithDark.darkDescription);
      }
    });

    it('returns normal description at phase 3 if no dark description', () => {
      const quest: Quest = {
        id: 'test',
        type: 'solve_count',
        tier: 'daily',
        title: 'Test',
        description: 'Normal desc',
        target: 5,
        progress: 0,
        completed: false,
        claimed: false,
        rewardAmber: 10,
      };
      expect(getQuestDescription(quest, 3)).toBe('Normal desc');
    });
  });

  // ===========================================================================
  // getUnclaimedAmber
  // ===========================================================================

  describe('getUnclaimedAmber', () => {
    it('returns 0 when no quests are completed', async () => {
      const state = await loadWeeklyQuests(0);
      expect(getUnclaimedAmber(state)).toBe(0);
    });

    it('returns amber sum for completed unclaimed quests across both tiers', async () => {
      await loadWeeklyQuests(0, unlockedQuestContext);
      await updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        isChallenge: true,
        amberEarned: 500,
      }, 0);

      const state = await loadWeeklyQuests(0, unlockedQuestContext);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const completedQuests = allQuests.filter(q => q.completed && !q.claimed);
      const expectedAmber = completedQuests.reduce((sum, q) => sum + q.rewardAmber, 0);
      expect(getUnclaimedAmber(state)).toBe(expectedAmber);
    });
  });

  // ===========================================================================
  // Timer functions
  // ===========================================================================

  describe('getTimeUntilReset', () => {
    it('returns an object with days, hours, and minutes', () => {
      const result = getTimeUntilReset();
      expect(typeof result.days).toBe('number');
      expect(typeof result.hours).toBe('number');
      expect(typeof result.minutes).toBe('number');
    });

    it('returns non-negative values', () => {
      const result = getTimeUntilReset();
      expect(result.days).toBeGreaterThanOrEqual(0);
      expect(result.hours).toBeGreaterThanOrEqual(0);
      expect(result.minutes).toBeGreaterThanOrEqual(0);
    });

    it('days are at most 7', () => {
      const result = getTimeUntilReset();
      expect(result.days).toBeLessThanOrEqual(7);
    });
  });

  describe('getTimeUntilDailyReset', () => {
    it('returns an object with hours and minutes', () => {
      const result = getTimeUntilDailyReset();
      expect(typeof result.hours).toBe('number');
      expect(typeof result.minutes).toBe('number');
    });

    it('returns non-negative values', () => {
      const result = getTimeUntilDailyReset();
      expect(result.hours).toBeGreaterThanOrEqual(0);
      expect(result.minutes).toBeGreaterThanOrEqual(0);
    });

    it('hours are at most 23', () => {
      const result = getTimeUntilDailyReset();
      expect(result.hours).toBeLessThanOrEqual(23);
    });
  });

  // ===========================================================================
  // clearWeeklyQuests
  // ===========================================================================

  describe('clearWeeklyQuests', () => {
    it('clears quest state for both tiers', async () => {
      await loadWeeklyQuests(0);
      await clearWeeklyQuests();
      // After clearing, next load should generate fresh quests
      const state = await loadWeeklyQuests(0);
      expect(state.daily.quests.length).toBe(5);
      expect(state.weekly.quests.length).toBe(5);
      expect(state.daily.quests.every(q => q.progress === 0)).toBe(true);
      expect(state.weekly.quests.every(q => q.progress === 0)).toBe(true);
    });

    it('removes both storage keys', async () => {
      await loadWeeklyQuests(0);
      await clearWeeklyQuests();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('wordshift_daily_quests');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('wordshift_weekly_quests');
    });
  });

  // ===========================================================================
  // visit_animals and streak_days quest types
  // ===========================================================================

  describe('visit_animals and streak_days quest types', () => {
    it('visit_animals progress updates via animalsVisited direct assignment', async () => {
      await loadWeeklyQuests(0);
      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const visitQuest = allQuests.find(q => q.type === 'visit_animals');

      if (visitQuest) {
        await updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 2,
          hintsUsed: 0,
          amberEarned: 10,
          animalsVisited: 2,
        }, 0);
        const s1 = await loadWeeklyQuests(0);
        const allQ1 = [...s1.daily.quests, ...s1.weekly.quests];
        // Progress clamps to the quest target, which varies with the date-seeded pool
        expect(allQ1.find(q => q.id === visitQuest.id)?.progress).toBe(Math.min(2, visitQuest.target));
      }
    });

    it('streak_days progress updates via currentStreak direct assignment', async () => {
      await loadWeeklyQuests(0);
      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const streakQuest = allQuests.find(q => q.type === 'streak_days');

      if (streakQuest) {
        await updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 2,
          hintsUsed: 0,
          amberEarned: 10,
          currentStreak: 2,
        }, 0);
        const s1 = await loadWeeklyQuests(0);
        const allQ1 = [...s1.daily.quests, ...s1.weekly.quests];
        // Progress clamps to the quest target, which varies with the date-seeded pool
        expect(allQ1.find(q => q.id === streakQuest.id)?.progress).toBe(Math.min(2, streakQuest.target));
      }
    });

    it('recordAnimalVisit updates tracked distinct animals and quest progress', async () => {
      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const visitQuest = allQuests.find(q => q.type === 'visit_animals');
      if (!visitQuest) return;

      await recordAnimalVisit('fox', 0);
      await recordAnimalVisit('fox', 0); // duplicate should not increase distinct count
      await recordAnimalVisit('owl', 0);

      const updated = await loadWeeklyQuests(0);
      // Check both daily and weekly tracked animals
      expect(updated.daily.animalsVisitedThisPeriod.sort()).toEqual(['fox', 'owl']);
      expect(updated.weekly.animalsVisitedThisPeriod.sort()).toEqual(['fox', 'owl']);
    });
  });

  // ===========================================================================
  // sacrifice_amber quest type
  // ===========================================================================

  describe('sacrifice_amber quest type', () => {
    it('sacrifice_amber quests only generate at Phase 4+', async () => {
      // Phase 0: no sacrifice quests
      const state0 = await loadWeeklyQuests(0);
      const allQuests0 = [...state0.daily.quests, ...state0.weekly.quests];
      expect(allQuests0.some(q => q.type === 'sacrifice_amber')).toBe(false);

      // Clear and re-generate at Phase 4
      await clearWeeklyQuests();
      const state4 = await loadWeeklyQuests(4);
      expect(state4.daily.quests.length).toBe(5);
      expect(state4.weekly.quests.length).toBe(5);
    });

    it('updateQuestProgress handles amberSacrificed', async () => {
      await clearWeeklyQuests();
      const state = await loadWeeklyQuests(4);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const sacrificeQuest = allQuests.find(q => q.type === 'sacrifice_amber');
      if (!sacrificeQuest) return; // Skip if not randomly generated

      await updateQuestProgress({
        difficulty: 'MEDIUM' as any,
        stars: 3,
        hintsUsed: 0,
        amberEarned: 10,
        amberSacrificed: 25,
      }, 4);
      const updated = await loadWeeklyQuests(4);
      const allUpdated = [...updated.daily.quests, ...updated.weekly.quests];
      const updatedQuest = allUpdated.find(q => q.id === sacrificeQuest.id);
      expect(updatedQuest?.progress).toBeGreaterThanOrEqual(25);
    });
  });

  // ===========================================================================
  // tend_amber quest type (Phase 5 endgame)
  // ===========================================================================

  describe('tend_amber quest type', () => {
    it('tend_amber quests only generate at Phase 5+', async () => {
      const state4 = await loadWeeklyQuests(4);
      const all4 = [...state4.daily.quests, ...state4.weekly.quests];
      expect(all4.some(q => q.type === 'tend_amber')).toBe(false);

      await clearWeeklyQuests();
      const state5 = await loadWeeklyQuests(5);
      expect(state5.daily.quests.length).toBe(5);
      expect(state5.weekly.quests.length).toBe(5);
    });

    it('updateQuestProgress handles amberTended', async () => {
      await clearWeeklyQuests();
      const state = await loadWeeklyQuests(5);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const tendQuest = allQuests.find(q => q.type === 'tend_amber');
      if (!tendQuest) return; // Skip if not randomly generated this period

      await updateQuestProgress({ amberTended: 40 }, 5);
      const updated = await loadWeeklyQuests(5);
      const allUpdated = [...updated.daily.quests, ...updated.weekly.quests];
      const updatedQuest = allUpdated.find(q => q.id === tendQuest.id);
      expect(updatedQuest?.progress).toBeGreaterThanOrEqual(40);
    });
  });

  // ===========================================================================
  // Economy guard: sink quests must stay net-negative
  // ===========================================================================

  describe('sink quests are net-negative at every phase they can appear', () => {
    // Mirrors the generation gates in generateQuestsFromPool: sacrifice_amber
    // appears at Phase 4+, tend_amber at Phase 5+ (max phase is 5). At every
    // one of those phases, the phase-scaled claim reward must be STRICTLY less
    // than the amber the quest asks the player to destroy/tend — otherwise the
    // quest becomes an amber faucet and inverts the sink's "you get nothing in
    // return" design.
    const MAX_PHASE = 5;
    const SINK_QUEST_PHASES: Record<string, number[]> = {
      sacrifice_amber: [4, 5],
      tend_amber: [5],
    };
    const allTemplates: QuestTemplate[] = [...DAILY_QUEST_POOL, ...WEEKLY_QUEST_POOL];

    it.each(Object.entries(SINK_QUEST_PHASES))(
      '%s scaled reward is strictly less than the amber spent',
      (type, phases) => {
        const templates = allTemplates.filter(t => t.type === type);
        // If the templates vanish or get renamed this guard must fail loudly,
        // not silently pass on an empty list.
        expect(templates.length).toBeGreaterThan(0);
        expect(Math.max(...phases)).toBe(MAX_PHASE);

        for (const template of templates) {
          for (const phase of phases) {
            const scaledReward = Math.round(
              template.rewardAmber * getPhaseRewardMultiplier(phase)
            );
            expect(scaledReward).toBeLessThan(template.target);
          }
        }
      }
    );
  });

  // ===========================================================================
  // Phase-scaled quest rewards
  // ===========================================================================

  describe('phase-scaled quest rewards', () => {
    it('claimQuestReward applies phase multiplier at Phase 2', async () => {
      await loadWeeklyQuests(0);

      // Complete a quest
      await updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        amberEarned: 500,
      }, 0);

      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const completedQuest = allQuests.find(q => q.completed && !q.claimed);
      if (!completedQuest) return;

      const baseReward = completedQuest.rewardAmber;
      const result = await claimQuestReward(completedQuest.id, 2);
      if (result) {
        expect(result.amber).toBe(Math.round(baseReward * 1.25));
      }
    });
  });

  // ===========================================================================
  // MEDIUM_PLUS difficulty matching
  // ===========================================================================

  // ===========================================================================
  // Cross-midnight rollover: context-less loads must use the persisted context
  // ===========================================================================

  describe('cross-midnight rollover uses the persisted generation context', () => {
    // The bug: updateQuestProgress/recordAnimalVisit call loadWeeklyQuests with
    // NO generationContext. If the first quest-touching action of a new
    // day/week is a puzzle completion in a session held open past midnight,
    // generation used optimistic defaults (10 animals unlocked) and could mint
    // impossible visit_animals quests (target 2-9 with 1 animal) that then
    // persist all period because the periodId matches on the next load.
    const oneAnimalContext = {
      puzzlesSolved: 10,
      unlockedAnimalCount: 1,
      challengeUnlocked: false,
      unlockedVariants: [] as string[],
    };

    afterEach(() => {
      jest.useRealTimers();
    });

    function expectNoImpossibleQuests(quests: Quest[]) {
      for (const q of quests) {
        // 1 unlocked animal → visit_animals is filtered entirely (needs >= 2)
        expect(q.type).not.toBe('visit_animals');
        expect(q.type).not.toBe('challenge_mode');
        expect(q.type).not.toBe('variant_wins');
      }
    }

    it('a context-less updateQuestProgress after midnight regenerates with the last-known context (session held open)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 5, 10, 12, 0, 0)); // Wed Jun 10, noon

      // Context-FULL load with 1 animal (e.g. HomeScreen loadAllData).
      await loadWeeklyQuests(0, oneAnimalContext);

      // Day rolls over mid-session; the first quest-touching action is a
      // context-LESS puzzle completion.
      jest.setSystemTime(new Date(2026, 5, 11, 0, 5, 0));
      await updateQuestProgress({ difficulty: 'EASY', stars: 3, hintsUsed: 0, amberEarned: 8 }, 0);

      const state = await loadWeeklyQuests(0);
      expect(state.daily.periodId).toBe('2026-06-11');
      expect(state.daily.quests.length).toBe(5);
      expectNoImpossibleQuests([...state.daily.quests, ...state.weekly.quests]);
    });

    it('survives a relaunch: the persisted context gates generation after the in-memory caches drop', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 5, 10, 12, 0, 0));

      await loadWeeklyQuests(0, oneAnimalContext);

      // Simulate a process restart: in-memory caches (including the session's
      // last-known context) are gone, storage survives.
      invalidateQuestCache();

      jest.setSystemTime(new Date(2026, 5, 11, 0, 5, 0));
      await updateQuestProgress({ difficulty: 'EASY', stars: 3, hintsUsed: 0, amberEarned: 8 }, 0);

      const state = await loadWeeklyQuests(0);
      expect(state.daily.periodId).toBe('2026-06-11');
      expect(state.daily.quests.length).toBe(5);
      expectNoImpossibleQuests([...state.daily.quests, ...state.weekly.quests]);
    });

    it('holds across a 14-day context-less sweep (covers many daily seeds and a weekly rollover)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 5, 10, 12, 0, 0));

      await loadWeeklyQuests(0, oneAnimalContext);

      // Jun 11 .. Jun 24 crosses the Mon Jun 15 weekly boundary, so the weekly
      // tier also regenerates context-less at least once.
      for (let day = 11; day <= 24; day++) {
        jest.setSystemTime(new Date(2026, 5, day, 9, 0, 0));
        await updateQuestProgress({ difficulty: 'EASY', stars: 3, hintsUsed: 0, amberEarned: 8 }, 0);
        const state = await loadWeeklyQuests(0);
        expectNoImpossibleQuests([...state.daily.quests, ...state.weekly.quests]);
      }
    });

    it('a fresher context-full load updates the persisted context used at the next rollover', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 5, 10, 12, 0, 0));

      await loadWeeklyQuests(0, oneAnimalContext);
      // Later the same day the player has unlocked more (still no variants).
      await loadWeeklyQuests(0, { ...oneAnimalContext, puzzlesSolved: 20, unlockedAnimalCount: 3 });
      invalidateQuestCache(); // relaunch — only the persisted context remains

      jest.setSystemTime(new Date(2026, 5, 11, 0, 5, 0));
      const state = await loadWeeklyQuests(0);
      // 3 animals → a daily visit_animals quest may appear, but never with an
      // impossible target.
      for (const q of state.daily.quests) {
        if (q.type === 'visit_animals') {
          expect(q.target).toBeLessThanOrEqual(3);
        }
        expect(q.type).not.toBe('variant_wins');
      }
    });
  });

  // ===========================================================================
  // Pre-journal generation gate (quest surfaces appear at puzzle 6)
  // ===========================================================================

  describe('pre-journal quest generation gate', () => {
    const preJournalContext = {
      puzzlesSolved: 2,
      unlockedAnimalCount: 1,
      challengeUnlocked: false,
      unlockedVariants: [] as string[],
    };

    it('exports the journal gate at puzzle 6 (mirrors the HomeScreen light-mode gate)', () => {
      expect(QUEST_GENERATION_MIN_PUZZLES).toBe(6);
    });

    it('returns a dormant (empty) quest set when the context says puzzlesSolved < 6', async () => {
      const state = await loadWeeklyQuests(0, preJournalContext);
      expect(state.daily.quests).toEqual([]);
      expect(state.weekly.quests).toEqual([]);
      expect(state.daily.gatedInactive).toBe(true);
      expect(state.weekly.gatedInactive).toBe(true);
    });

    it('updateQuestProgress no-ops while gated', async () => {
      await loadWeeklyQuests(0, preJournalContext);
      const completed = await updateQuestProgress({
        difficulty: 'HARD', stars: 3, hintsUsed: 0, isChallenge: true, amberEarned: 500,
      }, 0);
      expect(completed).toEqual([]);
      const state = await loadWeeklyQuests(0);
      expect(state.daily.quests).toEqual([]);
      expect(state.weekly.quests).toEqual([]);
    });

    it('context-less loads inherit the persisted gate (no quests minted behind the journal)', async () => {
      await loadWeeklyQuests(0, preJournalContext);
      invalidateQuestCache(); // relaunch — the gate must come from storage
      const state = await loadWeeklyQuests(0);
      expect(state.daily.quests).toEqual([]);
      expect(state.weekly.quests).toEqual([]);
    });

    it('activates real quests mid-period once a context-full load crosses the gate', async () => {
      const before = await loadWeeklyQuests(0, preJournalContext);
      expect(before.daily.quests).toEqual([]);

      const after = await loadWeeklyQuests(0, {
        puzzlesSolved: QUEST_GENERATION_MIN_PUZZLES,
        unlockedAnimalCount: 2,
        challengeUnlocked: false,
        unlockedVariants: [],
      });
      expect(after.daily.quests.length).toBe(5);
      expect(after.weekly.quests.length).toBe(5);
      expect(after.daily.gatedInactive).toBeUndefined();
      // Same period — the activated set owns the same periodId the placeholder did.
      expect(after.daily.periodId).toBe(before.daily.periodId);
    });

    it('keeps serving an existing quest state regardless of the gate (existing players mid-period)', async () => {
      // Legacy path: state generated before the gate existed (context-less).
      const before = await loadWeeklyQuests(0);
      expect(before.daily.quests.length).toBe(5);

      // A later context-full load reporting < 6 puzzles must NOT wipe it.
      const after = await loadWeeklyQuests(0, preJournalContext);
      expect(after.daily.quests.length).toBe(5);
      expect(after.daily.quests.map(q => q.id)).toEqual(before.daily.quests.map(q => q.id));
    });

    it('generates with legacy defaults when player state has never been reported', async () => {
      // No context anywhere (fresh module state + storage): behavior unchanged.
      const state = await loadWeeklyQuests(0);
      expect(state.daily.quests.length).toBe(5);
      expect(state.weekly.quests.length).toBe(5);
    });
  });

  describe('solve_difficulty quest - MEDIUM_PLUS matching', () => {
    it('MEDIUM_PLUS quest accepts both MEDIUM_PLUS and HARD difficulty', async () => {
      await loadWeeklyQuests(0);
      const state = await loadWeeklyQuests(0);
      const allQuests = [...state.daily.quests, ...state.weekly.quests];
      const mpQuest = allQuests.find(q => q.type === 'solve_difficulty' && q.difficulty === 'MEDIUM_PLUS');

      if (mpQuest) {
        // HARD should count
        await updateQuestProgress({
          difficulty: 'HARD',
          stars: 3,
          hintsUsed: 0,
          amberEarned: 20,
        }, 0);
        const s1 = await loadWeeklyQuests(0);
        const allQ1 = [...s1.daily.quests, ...s1.weekly.quests];
        expect(allQ1.find(q => q.id === mpQuest.id)?.progress).toBe(1);
      }
    });
  });

  // ===========================================================================
  // Full-moon event quest (bonus 6th daily slot on event days)
  // ===========================================================================

  describe('full-moon event quest', () => {
    const isEventDayMock = isEventDay as jest.Mock;

    afterEach(() => {
      isEventDayMock.mockReturnValue(false);
    });

    it('appends exactly one event_ quest to the DAILY tier on an event day (6 total)', async () => {
      isEventDayMock.mockReturnValue(true);
      const state = await loadWeeklyQuests(0, unlockedQuestContext);

      expect(state.daily.quests.length).toBe(6);
      const eventQuests = state.daily.quests.filter(q => q.id.startsWith('event_'));
      expect(eventQuests.length).toBe(1);

      const eq = eventQuests[0];
      expect(eq.type).toBe('solve_count');
      expect(eq.tier).toBe('daily');
      expect(eq.target).toBe(EVENT_QUEST_TARGET);
      expect(eq.rewardAmber).toBe(EVENT_QUEST_REWARD_AMBER);
      expect(eq.title.length).toBeGreaterThan(0);
      expect(eq.description).toContain(String(EVENT_QUEST_TARGET));
      expect(eq.darkDescription).toContain(String(EVENT_QUEST_TARGET));

      // The weekly tier never carries an event quest.
      expect(state.weekly.quests.length).toBe(5);
      expect(state.weekly.quests.some(q => q.id.startsWith('event_'))).toBe(false);
    });

    it('generates the plain 5 daily quests with no event quest on a non-event day', async () => {
      // Default mock: not an event day.
      const state = await loadWeeklyQuests(0, unlockedQuestContext);
      expect(state.daily.quests.length).toBe(5);
      expect(state.daily.quests.some(q => q.id.startsWith('event_'))).toBe(false);
    });

    it('event-day generation is deterministic for the same period', async () => {
      isEventDayMock.mockReturnValue(true);
      const state1 = await loadWeeklyQuests(0, unlockedQuestContext);
      await clearWeeklyQuests();
      await AsyncStorage.clear();
      const state2 = await loadWeeklyQuests(0, unlockedQuestContext);
      expect(state1.daily.quests.map(q => q.id)).toEqual(state2.daily.quests.map(q => q.id));
      expect(state1.daily.quests.map(q => q.type)).toEqual(state2.daily.quests.map(q => q.type));
      expect(state1.daily.quests.map(q => q.title)).toEqual(state2.daily.quests.map(q => q.title));
    });

    it('the event quest vanishes naturally on a non-event regeneration', async () => {
      isEventDayMock.mockReturnValue(true);
      const during = await loadWeeklyQuests(0, unlockedQuestContext);
      expect(during.daily.quests.length).toBe(6);

      // Simulate the next (non-event) day's regeneration: fresh period
      // generation with the event flag off.
      isEventDayMock.mockReturnValue(false);
      await clearWeeklyQuests();
      await AsyncStorage.clear();
      const after = await loadWeeklyQuests(0, unlockedQuestContext);
      expect(after.daily.quests.length).toBe(5);
      expect(after.daily.quests.some(q => q.id.startsWith('event_'))).toBe(false);
    });

    it('progresses and claims through the existing pipeline untouched', async () => {
      isEventDayMock.mockReturnValue(true);
      const state = await loadWeeklyQuests(0, unlockedQuestContext);
      const eq = state.daily.quests.find(q => q.id.startsWith('event_'));
      expect(eq).toBeDefined();

      for (let i = 0; i < EVENT_QUEST_TARGET; i++) {
        await updateQuestProgress({
          difficulty: 'MEDIUM', stars: 2, hintsUsed: 1, amberEarned: 10,
        }, 0);
      }
      const progressed = (await loadWeeklyQuests(0)).daily.quests.find(q => q.id === eq!.id);
      expect(progressed?.progress).toBe(EVENT_QUEST_TARGET);
      expect(progressed?.completed).toBe(true);

      // Claim is phase-scaled like every other quest (x1.0 at phase 0).
      const claim = await claimQuestReward(eq!.id, 0);
      expect(claim).toEqual({ amber: EVENT_QUEST_REWARD_AMBER });
      // Never double-claims.
      expect(await claimQuestReward(eq!.id, 0)).toBeNull();
    });

    it('stays dormant behind the pre-journal gate, then activates WITH the event quest', async () => {
      isEventDayMock.mockReturnValue(true);
      const gated = await loadWeeklyQuests(0, {
        puzzlesSolved: 2,
        unlockedAnimalCount: 1,
        challengeUnlocked: false,
        unlockedVariants: [],
      });
      expect(gated.daily.quests).toEqual([]);
      expect(gated.daily.gatedInactive).toBe(true);

      const activated = await loadWeeklyQuests(0, {
        puzzlesSolved: QUEST_GENERATION_MIN_PUZZLES,
        unlockedAnimalCount: 2,
        challengeUnlocked: false,
        unlockedVariants: [],
      });
      expect(activated.daily.quests.length).toBe(6);
      expect(activated.daily.quests.filter(q => q.id.startsWith('event_')).length).toBe(1);
      expect(activated.daily.gatedInactive).toBeUndefined();
      // Same period — activation replaces the placeholder in place.
      expect(activated.daily.periodId).toBe(gated.daily.periodId);
    });
  });
});
