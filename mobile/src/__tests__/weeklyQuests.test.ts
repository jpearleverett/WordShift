import { storage } from '../services/storage';
import {
  getWeekId,
  loadWeeklyQuests,
  updateQuestProgress,
  claimQuestReward,
  getTimeUntilReset,
  getQuestDescription,
  getUnclaimedAmber,
  clearWeeklyQuests,
  recordAnimalVisit,
  Quest,
  WeeklyQuestState,
} from '../services/weeklyQuests';

// Mock MMKV storage
jest.mock('../services/storage', () => {
  const store: Record<string, string> = {};
  return {
    storage: {
      getString: jest.fn((key: string) => store[key]),
      set: jest.fn((key: string, value: string) => { store[key] = value; }),
      remove: jest.fn((key: string) => { delete store[key]; }),
      clearAll: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
    },
  };
});

describe('weeklyQuests', () => {
  beforeEach(() => {
    (storage as any).clearAll();
    clearWeeklyQuests();
  });

  // ===========================================================================
  // getWeekId
  // ===========================================================================

  describe('getWeekId', () => {
    it('returns a string in ISO week format', () => {
      const id = getWeekId(new Date('2026-02-14'));
      expect(id).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('returns the same week ID for dates in the same week', () => {
      // 2026-02-09 is Monday, 2026-02-15 is Sunday
      const monday = getWeekId(new Date('2026-02-09'));
      const wednesday = getWeekId(new Date('2026-02-11'));
      const friday = getWeekId(new Date('2026-02-13'));
      const sunday = getWeekId(new Date('2026-02-15'));
      expect(monday).toBe(wednesday);
      expect(wednesday).toBe(friday);
      expect(friday).toBe(sunday);
    });

    it('returns different week IDs for dates in different weeks', () => {
      const week1 = getWeekId(new Date('2026-02-09'));
      const week2 = getWeekId(new Date('2026-02-16'));
      expect(week1).not.toBe(week2);
    });

    it('handles year boundary correctly', () => {
      const id = getWeekId(new Date('2026-01-01'));
      expect(id).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('defaults to current date when no argument is provided', () => {
      const id = getWeekId();
      expect(id).toMatch(/^\d{4}-W\d{2}$/);
    });
  });

  // ===========================================================================
  // loadWeeklyQuests
  // ===========================================================================

  describe('loadWeeklyQuests', () => {
    it('generates quests on first load', () => {
      const state = loadWeeklyQuests(0);
      expect(state.quests).toBeDefined();
      expect(state.quests.length).toBe(4);
      expect(state.weekId).toBe(getWeekId());
    });

    it('quests have required fields', () => {
      const state = loadWeeklyQuests(0);
      for (const quest of state.quests) {
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

    it('always includes a daily_complete quest', () => {
      const state = loadWeeklyQuests(0);
      const dailyQuest = state.quests.find(q => q.type === 'daily_complete');
      expect(dailyQuest).toBeDefined();
    });

    it('generates deterministic quests for the same week', () => {
      const state1 = loadWeeklyQuests(0);
      clearWeeklyQuests();
      const state2 = loadWeeklyQuests(0);
      expect(state1.quests.map(q => q.type)).toEqual(state2.quests.map(q => q.type));
      expect(state1.quests.map(q => q.target)).toEqual(state2.quests.map(q => q.target));
    });

    it('returns cached state on subsequent calls', () => {
      const state1 = loadWeeklyQuests(0);
      const state2 = loadWeeklyQuests(0);
      expect(state1).toBe(state2);
    });

    it('loads from storage if cache is cleared', () => {
      const state1 = loadWeeklyQuests(0);
      // Clear cache only (not storage) by clearing and reloading
      clearWeeklyQuests();
      // Re-store what we had
      storage.set('wordshift_weekly_quests', JSON.stringify(state1));
      const state2 = loadWeeklyQuests(0);
      expect(state2.weekId).toBe(state1.weekId);
      expect(state2.quests.length).toBe(state1.quests.length);
    });

    it('generates new quests if stored week is different', () => {
      // Save a state with an old week ID
      const oldState: WeeklyQuestState = {
        weekId: '2020-W01',
        quests: [],
        generatedAt: Date.now(),
        animalsVisitedThisWeek: [],
      };
      storage.set('wordshift_weekly_quests', JSON.stringify(oldState));
      clearWeeklyQuests(); // clear cache

      const state = loadWeeklyQuests(0);
      expect(state.weekId).toBe(getWeekId());
      expect(state.quests.length).toBe(4);
    });

    it('quest IDs contain the week ID', () => {
      const state = loadWeeklyQuests(0);
      const weekId = getWeekId();
      for (const quest of state.quests) {
        expect(quest.id).toContain(weekId);
      }
    });

    it('backfills animalsVisitedThisWeek for legacy stored state', () => {
      const fresh = loadWeeklyQuests(0);
      const legacyState = {
        ...fresh,
        animalsVisitedThisWeek: undefined,
      } as any;
      clearWeeklyQuests();
      storage.set('wordshift_weekly_quests', JSON.stringify(legacyState));

      const loaded = loadWeeklyQuests(0);
      expect(loaded.animalsVisitedThisWeek).toEqual([]);
    });

    it('quests have dark descriptions', () => {
      const state = loadWeeklyQuests(0);
      // Most quest templates have darkDescriptions
      const withDark = state.quests.filter(q => q.darkDescription);
      expect(withDark.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // updateQuestProgress
  // ===========================================================================

  describe('updateQuestProgress', () => {
    it('increments solve_count quest on any puzzle completion', () => {
      loadWeeklyQuests(0);
      updateQuestProgress({
        difficulty: 'MEDIUM',
        stars: 2,
        hintsUsed: 1,
        isDaily: false,
        isChallenge: false,
        amberEarned: 10,
      }, 0);

      const state = loadWeeklyQuests(0);
      const solveQuest = state.quests.find(q => q.type === 'solve_count');
      if (solveQuest) {
        expect(solveQuest.progress).toBeGreaterThanOrEqual(1);
      }
    });

    it('only increments solve_difficulty when difficulty matches', () => {
      loadWeeklyQuests(0);
      const state = loadWeeklyQuests(0);
      const diffQuest = state.quests.find(q => q.type === 'solve_difficulty');

      if (diffQuest) {
        // Try with wrong difficulty
        updateQuestProgress({
          difficulty: diffQuest.difficulty === 'HARD' ? 'EASY' : 'HARD',
          stars: 3,
          hintsUsed: 0,
          isDaily: false,
          isChallenge: false,
          amberEarned: 20,
        }, 0);
        const state2 = loadWeeklyQuests(0);
        const updated = state2.quests.find(q => q.id === diffQuest.id);
        expect(updated?.progress).toBe(0);

        // Try with matching difficulty
        updateQuestProgress({
          difficulty: diffQuest.difficulty!,
          stars: 3,
          hintsUsed: 0,
          isDaily: false,
          isChallenge: false,
          amberEarned: 20,
        }, 0);
        const state3 = loadWeeklyQuests(0);
        const updated2 = state3.quests.find(q => q.id === diffQuest.id);
        expect(updated2?.progress).toBe(1);
      }
    });

    it('increments earn_stars quest only for 3-star results', () => {
      loadWeeklyQuests(0);
      const state = loadWeeklyQuests(0);
      const starQuest = state.quests.find(q => q.type === 'earn_stars');

      if (starQuest) {
        updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 2,
          hintsUsed: 0,
          isDaily: false,
          isChallenge: false,
          amberEarned: 10,
        }, 0);
        const s1 = loadWeeklyQuests(0);
        expect(s1.quests.find(q => q.id === starQuest.id)?.progress).toBe(0);

        updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 3,
          hintsUsed: 0,
          isDaily: false,
          isChallenge: false,
          amberEarned: 10,
        }, 0);
        const s2 = loadWeeklyQuests(0);
        expect(s2.quests.find(q => q.id === starQuest.id)?.progress).toBe(1);
      }
    });

    it('increments daily_complete quest only for daily puzzles', () => {
      loadWeeklyQuests(0);
      const state = loadWeeklyQuests(0);
      const dailyQuest = state.quests.find(q => q.type === 'daily_complete')!;

      updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        isDaily: false,
        isChallenge: false,
        amberEarned: 20,
      }, 0);
      const s1 = loadWeeklyQuests(0);
      expect(s1.quests.find(q => q.id === dailyQuest.id)?.progress).toBe(0);

      updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        isDaily: true,
        isChallenge: false,
        amberEarned: 20,
      }, 0);
      const s2 = loadWeeklyQuests(0);
      expect(s2.quests.find(q => q.id === dailyQuest.id)?.progress).toBe(1);
    });

    it('increments no_hints quest only when no hints used', () => {
      loadWeeklyQuests(0);
      const state = loadWeeklyQuests(0);
      const noHintQuest = state.quests.find(q => q.type === 'no_hints');

      if (noHintQuest) {
        updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 2,
          hintsUsed: 2,
          isDaily: false,
          isChallenge: false,
          amberEarned: 10,
        }, 0);
        const s1 = loadWeeklyQuests(0);
        expect(s1.quests.find(q => q.id === noHintQuest.id)?.progress).toBe(0);

        updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 3,
          hintsUsed: 0,
          isDaily: false,
          isChallenge: false,
          amberEarned: 10,
        }, 0);
        const s2 = loadWeeklyQuests(0);
        expect(s2.quests.find(q => q.id === noHintQuest.id)?.progress).toBe(1);
      }
    });

    it('increments challenge_mode quest only for challenge puzzles', () => {
      loadWeeklyQuests(0);
      const state = loadWeeklyQuests(0);
      const challengeQuest = state.quests.find(q => q.type === 'challenge_mode');

      if (challengeQuest) {
        updateQuestProgress({
          difficulty: 'HARD',
          stars: 3,
          hintsUsed: 0,
          isDaily: false,
          isChallenge: false,
          amberEarned: 20,
        }, 0);
        const s1 = loadWeeklyQuests(0);
        expect(s1.quests.find(q => q.id === challengeQuest.id)?.progress).toBe(0);

        updateQuestProgress({
          difficulty: 'HARD',
          stars: 3,
          hintsUsed: 0,
          isDaily: false,
          isChallenge: true,
          amberEarned: 20,
        }, 0);
        const s2 = loadWeeklyQuests(0);
        expect(s2.quests.find(q => q.id === challengeQuest.id)?.progress).toBe(1);
      }
    });

    it('increments earn_amber quest by amberEarned amount', () => {
      loadWeeklyQuests(0);
      const state = loadWeeklyQuests(0);
      const amberQuest = state.quests.find(q => q.type === 'earn_amber');

      if (amberQuest) {
        updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 2,
          hintsUsed: 0,
          isDaily: false,
          isChallenge: false,
          amberEarned: 15,
        }, 0);
        const s1 = loadWeeklyQuests(0);
        expect(s1.quests.find(q => q.id === amberQuest.id)?.progress).toBe(15);
      }
    });

    it('marks quest as completed when target is reached', () => {
      loadWeeklyQuests(0);
      const state = loadWeeklyQuests(0);
      const dailyQuest = state.quests.find(q => q.type === 'daily_complete')!;
      // daily_complete target is 1

      const completed = updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        isDaily: true,
        isChallenge: false,
        amberEarned: 20,
      }, 0);

      expect(completed.length).toBeGreaterThanOrEqual(1);
      const completedDaily = completed.find(q => q.type === 'daily_complete');
      expect(completedDaily).toBeDefined();
      expect(completedDaily?.completed).toBe(true);
    });

    it('does not increment completed quests', () => {
      loadWeeklyQuests(0);
      const state = loadWeeklyQuests(0);
      const dailyQuest = state.quests.find(q => q.type === 'daily_complete')!;

      // Complete it
      updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        isDaily: true,
        isChallenge: false,
        amberEarned: 20,
      }, 0);

      // Try again
      const completed2 = updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        isDaily: true,
        isChallenge: false,
        amberEarned: 20,
      }, 0);

      // Should not return as newly completed again
      expect(completed2.find(q => q.type === 'daily_complete')).toBeUndefined();
    });

    it('caps progress at target value', () => {
      loadWeeklyQuests(0);
      const state = loadWeeklyQuests(0);
      const amberQuest = state.quests.find(q => q.type === 'earn_amber');

      if (amberQuest) {
        updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 2,
          hintsUsed: 0,
          isDaily: false,
          isChallenge: false,
          amberEarned: 9999,
        }, 0);
        const s1 = loadWeeklyQuests(0);
        expect(s1.quests.find(q => q.id === amberQuest.id)?.progress).toBe(amberQuest.target);
      }
    });

    it('returns newly completed quests array', () => {
      const completed = updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        isDaily: true,
        isChallenge: true,
        amberEarned: 200,
      }, 0);

      expect(Array.isArray(completed)).toBe(true);
      for (const quest of completed) {
        expect(quest.completed).toBe(true);
      }
    });
  });

  // ===========================================================================
  // claimQuestReward
  // ===========================================================================

  describe('claimQuestReward', () => {
    it('returns reward for completed unclaimed quest', () => {
      loadWeeklyQuests(0);

      // Complete the daily quest
      updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        isDaily: true,
        isChallenge: false,
        amberEarned: 20,
      }, 0);

      const state = loadWeeklyQuests(0);
      const dailyQuest = state.quests.find(q => q.type === 'daily_complete')!;

      const reward = claimQuestReward(dailyQuest.id);
      expect(reward).not.toBeNull();
      expect(reward?.amber).toBe(dailyQuest.rewardAmber);
    });

    it('returns null for uncompleted quest', () => {
      const state = loadWeeklyQuests(0);
      const quest = state.quests[0];
      const reward = claimQuestReward(quest.id);
      expect(reward).toBeNull();
    });

    it('returns null for already claimed quest', () => {
      loadWeeklyQuests(0);

      updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        isDaily: true,
        isChallenge: false,
        amberEarned: 20,
      }, 0);

      const state = loadWeeklyQuests(0);
      const dailyQuest = state.quests.find(q => q.type === 'daily_complete')!;

      claimQuestReward(dailyQuest.id);
      const reward2 = claimQuestReward(dailyQuest.id);
      expect(reward2).toBeNull();
    });

    it('returns null for non-existent quest ID', () => {
      loadWeeklyQuests(0);
      const reward = claimQuestReward('non_existent_quest');
      expect(reward).toBeNull();
    });

    it('marks quest as claimed after claiming', () => {
      loadWeeklyQuests(0);

      updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        isDaily: true,
        isChallenge: false,
        amberEarned: 20,
      }, 0);

      const state = loadWeeklyQuests(0);
      const dailyQuest = state.quests.find(q => q.type === 'daily_complete')!;
      claimQuestReward(dailyQuest.id);

      const updatedState = loadWeeklyQuests(0);
      const claimed = updatedState.quests.find(q => q.id === dailyQuest.id);
      expect(claimed?.claimed).toBe(true);
    });
  });

  // ===========================================================================
  // getQuestDescription
  // ===========================================================================

  describe('getQuestDescription', () => {
    it('returns normal description for phase < 3', () => {
      const state = loadWeeklyQuests(0);
      const quest = state.quests[0];
      const desc = getQuestDescription(quest, 0);
      expect(desc).toBe(quest.description);
    });

    it('returns dark description for phase >= 3 when available', () => {
      const state = loadWeeklyQuests(0);
      const questWithDark = state.quests.find(q => q.darkDescription);
      if (questWithDark) {
        const desc = getQuestDescription(questWithDark, 3);
        expect(desc).toBe(questWithDark.darkDescription);
      }
    });

    it('returns normal description at phase 3 if no dark description', () => {
      const quest: Quest = {
        id: 'test',
        type: 'solve_count',
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

    it('returns dark description at phase 4', () => {
      const state = loadWeeklyQuests(0);
      const questWithDark = state.quests.find(q => q.darkDescription);
      if (questWithDark) {
        const desc = getQuestDescription(questWithDark, 4);
        expect(desc).toBe(questWithDark.darkDescription);
      }
    });
  });

  // ===========================================================================
  // getUnclaimedAmber
  // ===========================================================================

  describe('getUnclaimedAmber', () => {
    it('returns 0 when no quests are completed', () => {
      const state = loadWeeklyQuests(0);
      expect(getUnclaimedAmber(state)).toBe(0);
    });

    it('returns amber sum for completed unclaimed quests', () => {
      loadWeeklyQuests(0);
      updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        isDaily: true,
        isChallenge: true,
        amberEarned: 200,
      }, 0);

      const state = loadWeeklyQuests(0);
      const completedQuests = state.quests.filter(q => q.completed && !q.claimed);
      const expectedAmber = completedQuests.reduce((sum, q) => sum + q.rewardAmber, 0);
      expect(getUnclaimedAmber(state)).toBe(expectedAmber);
    });

    it('excludes claimed quests from total', () => {
      loadWeeklyQuests(0);
      updateQuestProgress({
        difficulty: 'HARD',
        stars: 3,
        hintsUsed: 0,
        isDaily: true,
        isChallenge: false,
        amberEarned: 20,
      }, 0);

      let state = loadWeeklyQuests(0);
      const dailyQuest = state.quests.find(q => q.type === 'daily_complete')!;
      const amberBefore = getUnclaimedAmber(state);

      claimQuestReward(dailyQuest.id);
      state = loadWeeklyQuests(0);
      const amberAfter = getUnclaimedAmber(state);
      expect(amberAfter).toBe(amberBefore - dailyQuest.rewardAmber);
    });
  });

  // ===========================================================================
  // getTimeUntilReset
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

  // ===========================================================================
  // clearWeeklyQuests
  // ===========================================================================

  describe('clearWeeklyQuests', () => {
    it('clears quest state', () => {
      loadWeeklyQuests(0);
      clearWeeklyQuests();
      // After clearing, next load should generate fresh quests
      const state = loadWeeklyQuests(0);
      expect(state.quests.length).toBe(4);
      expect(state.quests.every(q => q.progress === 0)).toBe(true);
    });

    it('removes storage key', () => {
      loadWeeklyQuests(0);
      clearWeeklyQuests();
      expect(storage.remove).toHaveBeenCalledWith('wordshift_weekly_quests');
    });
  });

  // ===========================================================================
  // New quest types: visit_animals and streak_days
  // ===========================================================================

  describe('visit_animals and streak_days quest types', () => {
    it('visit_animals progress updates via animalsVisited direct assignment', () => {
      loadWeeklyQuests(0);
      const state = loadWeeklyQuests(0);
      const visitQuest = state.quests.find(q => q.type === 'visit_animals');

      if (visitQuest) {
        updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 2,
          hintsUsed: 0,
          isDaily: false,
          isChallenge: false,
          amberEarned: 10,
          animalsVisited: 2,
        }, 0);
        const s1 = loadWeeklyQuests(0);
        expect(s1.quests.find(q => q.id === visitQuest.id)?.progress).toBe(2);

        // Direct assignment — value should be replaced, not accumulated
        updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 2,
          hintsUsed: 0,
          isDaily: false,
          isChallenge: false,
          amberEarned: 10,
          animalsVisited: 3,
        }, 0);
        const s2 = loadWeeklyQuests(0);
        expect(s2.quests.find(q => q.id === visitQuest.id)?.progress).toBe(3);
      }
    });

    it('streak_days progress updates via currentStreak direct assignment', () => {
      loadWeeklyQuests(0);
      const state = loadWeeklyQuests(0);
      const streakQuest = state.quests.find(q => q.type === 'streak_days');

      if (streakQuest) {
        updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 2,
          hintsUsed: 0,
          isDaily: false,
          isChallenge: false,
          amberEarned: 10,
          currentStreak: 2,
        }, 0);
        const s1 = loadWeeklyQuests(0);
        expect(s1.quests.find(q => q.id === streakQuest.id)?.progress).toBe(2);
      }
    });

    it('visit_animals completes when animalsVisited reaches target', () => {
      loadWeeklyQuests(0);
      const state = loadWeeklyQuests(0);
      const visitQuest = state.quests.find(q => q.type === 'visit_animals');

      if (visitQuest) {
        const completed = updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 2,
          hintsUsed: 0,
          isDaily: false,
          isChallenge: false,
          amberEarned: 10,
          animalsVisited: visitQuest.target,
        }, 0);

        const completedVisit = completed.find(q => q.type === 'visit_animals');
        expect(completedVisit).toBeDefined();
        expect(completedVisit?.completed).toBe(true);
      }
    });

    it('streak_days completes when currentStreak reaches target', () => {
      loadWeeklyQuests(0);
      const state = loadWeeklyQuests(0);
      const streakQuest = state.quests.find(q => q.type === 'streak_days');

      if (streakQuest) {
        const completed = updateQuestProgress({
          difficulty: 'MEDIUM',
          stars: 2,
          hintsUsed: 0,
          isDaily: false,
          isChallenge: false,
          amberEarned: 10,
          currentStreak: streakQuest.target,
        }, 0);

        const completedStreak = completed.find(q => q.type === 'streak_days');
        expect(completedStreak).toBeDefined();
        expect(completedStreak?.completed).toBe(true);
      }
    });

    it('visit_animals and streak_days do not increment from standard puzzle events', () => {
      loadWeeklyQuests(0);
      const state = loadWeeklyQuests(0);
      const visitQuest = state.quests.find(q => q.type === 'visit_animals');
      const streakQuest = state.quests.find(q => q.type === 'streak_days');

      // Event without animalsVisited/currentStreak should not change progress
      updateQuestProgress({
        difficulty: 'MEDIUM',
        stars: 2,
        hintsUsed: 0,
        isDaily: false,
        isChallenge: false,
        amberEarned: 10,
      }, 0);

      const s1 = loadWeeklyQuests(0);
      if (visitQuest) {
        expect(s1.quests.find(q => q.id === visitQuest.id)?.progress).toBe(0);
      }
      if (streakQuest) {
        expect(s1.quests.find(q => q.id === streakQuest.id)?.progress).toBe(0);
      }
    });

    it('recordAnimalVisit updates tracked distinct animals and quest progress', () => {
      const state = loadWeeklyQuests(0);
      const visitQuest = state.quests.find(q => q.type === 'visit_animals');
      if (!visitQuest) return;

      recordAnimalVisit('fox', 0);
      recordAnimalVisit('fox', 0); // duplicate should not increase distinct count
      recordAnimalVisit('owl', 0);

      const updated = loadWeeklyQuests(0);
      expect(updated.animalsVisitedThisWeek.sort()).toEqual(['fox', 'owl']);
      expect(updated.quests.find(q => q.id === visitQuest.id)?.progress).toBe(2);
    });
  });

  describe('sacrifice_amber and daily_streak quest types', () => {
    it('sacrifice_amber quests only generate at Phase 4+', () => {
      // Phase 0: no sacrifice quests
      const state0 = loadWeeklyQuests(0);
      const sacrificeQuest0 = state0.quests.find(q => q.type === 'sacrifice_amber');
      expect(sacrificeQuest0).toBeUndefined();

      // Clear and re-generate at Phase 4
      clearWeeklyQuests();
      const state4 = loadWeeklyQuests(4);
      // May or may not have a sacrifice quest (random selection), but shouldn't error
      expect(state4.quests).toHaveLength(4);
    });

    it('updateQuestProgress handles amberSacrificed', () => {
      // Force a state with a sacrifice quest at Phase 4
      clearWeeklyQuests();
      const state = loadWeeklyQuests(4);
      const sacrificeQuest = state.quests.find(q => q.type === 'sacrifice_amber');
      if (!sacrificeQuest) return; // Skip if not randomly generated

      const baseEvent = { difficulty: 'MEDIUM' as any, stars: 3, hintsUsed: 0, isDaily: false, isChallenge: false, amberEarned: 10, amberSacrificed: 25 };
      updateQuestProgress(baseEvent, 4);
      const updated = loadWeeklyQuests(4);
      const updatedQuest = updated.quests.find(q => q.id === sacrificeQuest.id);
      expect(updatedQuest?.progress).toBeGreaterThanOrEqual(25);
    });

    it('updateQuestProgress handles dailyStreak', () => {
      const state = loadWeeklyQuests(0);
      const streakQuest = state.quests.find(q => q.type === 'daily_streak');
      if (!streakQuest) return; // Skip if not randomly generated

      const baseEvent = { difficulty: 'MEDIUM' as any, stars: 3, hintsUsed: 0, isDaily: true, isChallenge: false, amberEarned: 10, dailyStreak: 3 };
      updateQuestProgress(baseEvent, 0);
      const updated = loadWeeklyQuests(0);
      const updatedQuest = updated.quests.find(q => q.id === streakQuest.id);
      expect(updatedQuest?.progress).toBe(3);
    });
  });

  describe('phase-scaled quest rewards', () => {
    it('claimQuestReward applies phase multiplier at Phase 2', () => {
      const state = loadWeeklyQuests(0);
      const quest = state.quests[0];
      if (!quest) return;

      // Manually set quest as completed
      quest.progress = quest.target;
      quest.completed = true;
      const baseReward = quest.rewardAmber;
      storage.set('wordshift_weekly_quests', JSON.stringify(state));
      // Clear cache
      clearWeeklyQuests();
      // Re-load to populate cache
      const loaded = loadWeeklyQuests(0);
      const completedQuest = loaded.quests.find(q => q.id === quest.id);
      if (!completedQuest || !completedQuest.completed || completedQuest.claimed) return;

      // Claim at Phase 2 (1.25x multiplier)
      const result = claimQuestReward(completedQuest.id, 2);
      if (result) {
        expect(result.amber).toBe(Math.round(baseReward * 1.25));
      }
    });
  });
});
