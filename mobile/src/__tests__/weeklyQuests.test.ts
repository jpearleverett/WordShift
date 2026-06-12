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
  recordAnimalVisit,
  Quest,
  CombinedQuestState,
} from '../services/weeklyQuests';

// Mock AsyncStorage using shared factory
jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

describe('weeklyQuests', () => {
  const unlockedQuestContext = {
    puzzlesSolved: 25,
    unlockedAnimalCount: 4,
    dailyUnlocked: false,
    challengeUnlocked: true,
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
        puzzlesSolved: 4,
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
});
