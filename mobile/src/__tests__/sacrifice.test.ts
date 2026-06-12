import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadSacrificeState,
  performSacrifice,
  isSacrificeAvailable,
  getSacrificeAmounts,
  getSacrificePrompt,
  getSacrificeStats,
  clearSacrificeState,
} from '../services/sacrifice';

// Mock AsyncStorage using shared factory
jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

describe('sacrifice', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearSacrificeState();
  });

  // ===========================================================================
  // loadSacrificeState
  // ===========================================================================

  describe('loadSacrificeState', () => {
    it('returns default empty state on first load', async () => {
      const state = await loadSacrificeState();
      expect(state.totalAmberSacrificed).toBe(0);
      expect(state.sacrificeCount).toBe(0);
      expect(state.lastSacrificeTimestamp).toBe(0);
      expect(state.sacrificeHistory).toEqual([]);
    });

    it('returns cached state on subsequent calls', async () => {
      const state1 = await loadSacrificeState();
      const state2 = await loadSacrificeState();
      expect(state1).toBe(state2);
    });

    it('loads from storage after cache clear', async () => {
      const saved = {
        totalAmberSacrificed: 50,
        sacrificeCount: 3,
        lastSacrificeTimestamp: 1000,
        sacrificeHistory: [],
      };
      // Clear cache first, then set storage so it persists
      await clearSacrificeState();
      await AsyncStorage.setItem('wordshift_sacrifices', JSON.stringify(saved));

      const state = await loadSacrificeState();
      expect(state.totalAmberSacrificed).toBe(50);
      expect(state.sacrificeCount).toBe(3);
    });
  });

  // ===========================================================================
  // isSacrificeAvailable
  // ===========================================================================

  describe('isSacrificeAvailable', () => {
    it('returns false for phase 0', () => {
      expect(isSacrificeAvailable(0)).toBe(false);
    });

    it('returns false for phase 1', () => {
      expect(isSacrificeAvailable(1)).toBe(false);
    });

    it('returns false for phase 2', () => {
      expect(isSacrificeAvailable(2)).toBe(false);
    });

    it('returns false for phase 3', () => {
      expect(isSacrificeAvailable(3)).toBe(false);
    });

    it('returns true for phase 4', () => {
      expect(isSacrificeAvailable(4)).toBe(true);
    });

    it('returns true for phase 5', () => {
      expect(isSacrificeAvailable(5)).toBe(true);
    });
  });

  // ===========================================================================
  // performSacrifice
  // ===========================================================================

  describe('performSacrifice', () => {
    it('records sacrifice amount', async () => {
      await performSacrifice(10, 4);
      const state = await loadSacrificeState();
      expect(state.totalAmberSacrificed).toBe(10);
    });

    it('increments sacrifice count', async () => {
      await performSacrifice(5, 4);
      await performSacrifice(10, 4);
      const state = await loadSacrificeState();
      expect(state.sacrificeCount).toBe(2);
    });

    it('records sacrifice in history', async () => {
      await performSacrifice(25, 4);
      const state = await loadSacrificeState();
      expect(state.sacrificeHistory.length).toBe(1);
      expect(state.sacrificeHistory[0].amount).toBe(25);
      expect(state.sacrificeHistory[0].phase).toBe(4);
      expect(state.sacrificeHistory[0].timestamp).toBeGreaterThan(0);
    });

    it('returns special message for first sacrifice', async () => {
      const result = await performSacrifice(5, 4);
      expect(result.isMilestone).toBe(false);
      expect(result.message).toContain('arrangement');
    });

    it('returns milestone message at sacrifice count 5', async () => {
      for (let i = 0; i < 4; i++) {
        await performSacrifice(5, 4);
      }
      const result = await performSacrifice(5, 4);
      expect(result.isMilestone).toBe(true);
      expect(result.message).toContain('Five');
    });

    it('returns milestone message at sacrifice count 10', async () => {
      for (let i = 0; i < 9; i++) {
        await performSacrifice(5, 4);
      }
      const result = await performSacrifice(5, 4);
      expect(result.isMilestone).toBe(true);
      expect(result.message).toContain('Ten');
    });

    it('returns milestone message at sacrifice count 25', async () => {
      for (let i = 0; i < 24; i++) {
        await performSacrifice(1, 4);
      }
      const result = await performSacrifice(1, 4);
      expect(result.isMilestone).toBe(true);
      expect(result.message).toContain('Twenty-five');
    });

    it('returns milestone message at sacrifice count 50', async () => {
      for (let i = 0; i < 49; i++) {
        await performSacrifice(1, 4);
      }
      const result = await performSacrifice(1, 4);
      expect(result.isMilestone).toBe(true);
      expect(result.message).toContain('Fifty');
    });

    it('returns milestone message at sacrifice count 100', async () => {
      for (let i = 0; i < 99; i++) {
        await performSacrifice(1, 4);
      }
      const result = await performSacrifice(1, 4);
      expect(result.isMilestone).toBe(true);
      expect(result.message).toContain('hundred');
    });

    it('returns non-milestone message for counts between milestones', async () => {
      // Counts 1-3 and 5 are milestones; the 4th sacrifice is not
      await performSacrifice(5, 4);
      await performSacrifice(5, 4);
      await performSacrifice(5, 4);
      const result = await performSacrifice(5, 4);
      expect(result.isMilestone).toBe(false);
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('returns early milestone messages at counts 2 and 3', async () => {
      await performSacrifice(5, 4);
      const second = await performSacrifice(5, 4);
      expect(second.isMilestone).toBe(true);
      expect(second.message).toContain('Twice');
      const third = await performSacrifice(5, 4);
      expect(third.isMilestone).toBe(true);
      expect(third.message).toContain('Three');
    });

    it('accumulates total amber sacrificed', async () => {
      await performSacrifice(10, 4);
      await performSacrifice(20, 4);
      await performSacrifice(30, 4);
      const state = await loadSacrificeState();
      expect(state.totalAmberSacrificed).toBe(60);
    });

    it('updates lastSacrificeTimestamp', async () => {
      const before = Date.now();
      await performSacrifice(5, 4);
      const state = await loadSacrificeState();
      expect(state.lastSacrificeTimestamp).toBeGreaterThanOrEqual(before);
    });

    it('caps sacrifice history at 100 entries', async () => {
      for (let i = 0; i < 110; i++) {
        await performSacrifice(1, 4);
      }
      const state = await loadSacrificeState();
      expect(state.sacrificeHistory.length).toBe(100);
    });

    it('keeps the most recent entries when capping', async () => {
      for (let i = 0; i < 105; i++) {
        await performSacrifice(i + 1, 4);
      }
      const state = await loadSacrificeState();
      // Should keep entries 6-105 (amounts 6-105)
      expect(state.sacrificeHistory[0].amount).toBe(6);
      expect(state.sacrificeHistory[99].amount).toBe(105);
    });

    it('persists to storage', async () => {
      await performSacrifice(15, 4);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('returns a string message', async () => {
      const result = await performSacrifice(10, 4);
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // getSacrificeAmounts
  // ===========================================================================

  describe('getSacrificeAmounts', () => {
    it('returns empty array for balance < 5', () => {
      expect(getSacrificeAmounts(0)).toEqual([]);
      expect(getSacrificeAmounts(4)).toEqual([]);
    });

    it('returns [5] for balance 5-9', () => {
      expect(getSacrificeAmounts(5)).toEqual([5]);
      expect(getSacrificeAmounts(9)).toEqual([5]);
    });

    it('returns [5, 10] for balance 10-24', () => {
      expect(getSacrificeAmounts(10)).toEqual([5, 10]);
      expect(getSacrificeAmounts(24)).toEqual([5, 10]);
    });

    it('returns [5, 10, 25] for balance 25-49', () => {
      expect(getSacrificeAmounts(25)).toEqual([5, 10, 25]);
      expect(getSacrificeAmounts(49)).toEqual([5, 10, 25]);
    });

    it('returns [5, 10, 25, 50] for balance 50-99', () => {
      expect(getSacrificeAmounts(50)).toEqual([5, 10, 25, 50]);
      expect(getSacrificeAmounts(99)).toEqual([5, 10, 25, 50]);
    });

    it('returns [5, 10, 25, 50, 100] for balance 100+', () => {
      expect(getSacrificeAmounts(100)).toEqual([5, 10, 25, 50, 100]);
      expect(getSacrificeAmounts(1000)).toEqual([5, 10, 25, 50, 100]);
    });
  });

  // ===========================================================================
  // getSacrificePrompt
  // ===========================================================================

  describe('getSacrificePrompt', () => {
    it('returns ritual-themed prompt at phase 4', () => {
      const prompt = getSacrificePrompt(4);
      expect(prompt.title).toBe('Offer to the Arrangement');
      expect(prompt.subtitle).toContain('amber returns');
    });

    it('returns generic prompt before phase 4', () => {
      const prompt = getSacrificePrompt(3);
      expect(prompt.title).toBe('Offer Amber');
    });

    it('returns ritual prompt at phase 5', () => {
      const prompt = getSacrificePrompt(5);
      expect(prompt.title).toBe('Offer to the Arrangement');
    });

    it('prompt has title and subtitle', () => {
      const prompt = getSacrificePrompt(4);
      expect(typeof prompt.title).toBe('string');
      expect(typeof prompt.subtitle).toBe('string');
      expect(prompt.title.length).toBeGreaterThan(0);
      expect(prompt.subtitle.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // getSacrificeStats
  // ===========================================================================

  describe('getSacrificeStats', () => {
    it('returns zeros initially', async () => {
      const stats = await getSacrificeStats();
      expect(stats.totalSacrificed).toBe(0);
      expect(stats.count).toBe(0);
      expect(stats.lastSacrifice).toBe(0);
    });

    it('reflects sacrifice data', async () => {
      await performSacrifice(10, 4);
      await performSacrifice(20, 4);

      const stats = await getSacrificeStats();
      expect(stats.totalSacrificed).toBe(30);
      expect(stats.count).toBe(2);
      expect(stats.lastSacrifice).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // clearSacrificeState
  // ===========================================================================

  describe('clearSacrificeState', () => {
    it('resets sacrifice data', async () => {
      await performSacrifice(100, 4);
      await clearSacrificeState();

      const state = await loadSacrificeState();
      expect(state.totalAmberSacrificed).toBe(0);
      expect(state.sacrificeCount).toBe(0);
      expect(state.sacrificeHistory).toEqual([]);
    });

    it('calls AsyncStorage.removeItem', async () => {
      await clearSacrificeState();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('wordshift_sacrifices');
    });
  });
});
