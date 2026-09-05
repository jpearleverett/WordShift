import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadSacrificeState,
  performSacrifice,
  isSacrificeAvailable,
  getSacrificeAmounts,
  getSacrificePrompt,
  getSacrificeStats,
  clearSacrificeState,
  selectOfferingResponse,
  getDevotionTier,
  getDevotionTierIndex,
  getArrangementHoldsLine,
  hasSeenOfferingIntro,
  markOfferingIntroSeen,
  DEVOTION_TIERS,
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

    it('returns the serene ritual prompt at phase 5', () => {
      const prompt = getSacrificePrompt(5);
      expect(prompt.title).toBe('Give to the Pattern');
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

  // ===========================================================================
  // Devotion tiers (private standing)
  // ===========================================================================

  describe('devotion tiers', () => {
    it('has no tier before the first offering', () => {
      expect(getDevotionTier(0)).toBeNull();
      expect(getDevotionTierIndex(0)).toBe(-1);
    });

    it('holds the highest tier whose threshold is met', () => {
      expect(getDevotionTier(1)?.title).toBe('Noticed');
      expect(getDevotionTier(2)?.title).toBe('Noticed'); // still tier 0 until 3
      expect(getDevotionTier(3)?.title).toBe('Marked');
      expect(getDevotionTier(8)?.title).toBe('Known');
      expect(getDevotionTier(20)?.title).toBe('Kept');
      expect(getDevotionTier(50)?.title).toBe('Beloved of the Pattern');
      expect(getDevotionTier(100)?.title).toBe('One of the Arrangement');
      expect(getDevotionTier(999)?.title).toBe('One of the Arrangement'); // clamps to top
    });

    it('tier thresholds are strictly increasing', () => {
      for (let i = 1; i < DEVOTION_TIERS.length; i++) {
        expect(DEVOTION_TIERS[i].threshold).toBeGreaterThan(DEVOTION_TIERS[i - 1].threshold);
      }
    });
  });

  // ===========================================================================
  // selectOfferingResponse (escalation / everything / milestone / first)
  // ===========================================================================

  describe('selectOfferingResponse', () => {
    it('returns the special welcome on the first offering', () => {
      const r = selectOfferingResponse({ count: 1 });
      expect(r.isMilestone).toBe(false);
      expect(r.message).toContain('arrangement');
    });

    it('surfaces milestone copy at milestone counts', () => {
      expect(selectOfferingResponse({ count: 5 }).isMilestone).toBe(true);
      expect(selectOfferingResponse({ count: 5 }).message).toContain('Five');
      expect(selectOfferingResponse({ count: 10 }).message).toContain('Ten');
    });

    it('escalates the in-session tone by streak (non-milestone counts)', () => {
      // count 4 is not a milestone; the pools differ by streak tier. Sample many
      // draws and assert each streak tier only ever yields lines from its pool.
      const calm = new Set<string>();
      const fervent = new Set<string>();
      for (let i = 0; i < 60; i++) {
        calm.add(selectOfferingResponse({ count: 4, sessionStreak: 0, phase: 4 }).message);
        fervent.add(selectOfferingResponse({ count: 4, sessionStreak: 8, phase: 4 }).message);
      }
      // The fervent pool contains a line the calm pool never produces.
      expect([...fervent].some(m => m.includes('stopped pretending'))).toBe(true);
      expect([...calm].some(m => m.includes('stopped pretending'))).toBe(false);
    });

    it('keeps post-arrival offerings distinct without promising erased needs', () => {
      const p5 = new Set<string>();
      for (let i = 0; i < 40; i++) {
        p5.add(selectOfferingResponse({ count: 4, sessionStreak: 0, phase: 5 }).message);
      }
      expect([...p5].every(m => m.length > 0)).toBe(true);
      expect([...p5].some(m => /mark|chair|empty place/.test(m))).toBe(true);
      expect([...p5].every(m => !/no hunger|nothing is lost/.test(m))).toBe(true);
    });

    it('gives the "offer everything" gesture its own response', () => {
      const draws = new Set<string>();
      for (let i = 0; i < 40; i++) {
        draws.add(selectOfferingResponse({ count: 4, everything: true, phase: 4 }).message);
      }
      expect([...draws].some(m => m.toLowerCase().includes('everything'))).toBe(true);
      expect(selectOfferingResponse({ count: 4, everything: true }).isMilestone).toBe(false);
    });
  });

  // ===========================================================================
  // performSacrifice — monument + devotion tier-up metadata
  // ===========================================================================

  describe('performSacrifice enrichment', () => {
    it('returns the running monument (total + count)', async () => {
      await performSacrifice(10, 4);
      const r = await performSacrifice(15, 4);
      expect(r.total).toBe(25);
      expect(r.count).toBe(2);
    });

    it('reports a tierUp only on the offering that crosses a threshold', async () => {
      const first = await performSacrifice(5, 4); // count 1 -> tier "Noticed"
      expect(first.tierUp?.title).toBe('Noticed');
      const second = await performSacrifice(5, 4); // count 2 -> still "Noticed", no cross
      expect(second.tierUp).toBeNull();
      const third = await performSacrifice(5, 4); // count 3 -> "Marked"
      expect(third.tierUp?.title).toBe('Marked');
    });

    it('threads the session streak into the response without breaking milestones', async () => {
      // count 2 is a milestone regardless of streak.
      await performSacrifice(5, 4, { sessionStreak: 1 });
      const r = await performSacrifice(5, 4, { sessionStreak: 2 });
      expect(r.isMilestone).toBe(true);
      expect(r.message).toContain('Twice');
    });
  });

  // ===========================================================================
  // Monument line + one-time intro flag
  // ===========================================================================

  describe('getArrangementHoldsLine', () => {
    it('names the total and is phase-aware', () => {
      expect(getArrangementHoldsLine(340, 4)).toContain('340');
      expect(getArrangementHoldsLine(340, 4)).toContain('remembers');
      expect(getArrangementHoldsLine(340, 5)).toContain('at peace');
    });
  });

  describe('offering intro flag', () => {
    it('is unseen by default and persists once marked (rides the synced state)', async () => {
      expect(await hasSeenOfferingIntro()).toBe(false);
      await markOfferingIntroSeen();
      expect(await hasSeenOfferingIntro()).toBe(true);
    });

    it('is cleared by Reset All (clearSacrificeState)', async () => {
      await markOfferingIntroSeen();
      await clearSacrificeState();
      expect(await hasSeenOfferingIntro()).toBe(false);
    });
  });
});

describe('Offering describes its actual incentives', () => {
  test('offering copy allows the existing partial quest rebate and promises no item or ending', () => {
    for (const phase of [4, 5]) {
      const text = getSacrificePrompt(phase).subtitle;
      expect(text).toMatch(/no item or ending/i);
      expect(text).toMatch(/quest can return part/i);
      expect(text).not.toMatch(/you get nothing|you keep nothing/i);
    }
  });
});
