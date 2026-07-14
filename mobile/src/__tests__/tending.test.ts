import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadTendingState,
  getTendingCost,
  getNextTendingInfo,
  applyTend,
  isTendingAvailable,
  getTendingStats,
  getTendingLevel,
  getPhase5CaughtUp,
  setPhase5CaughtUp,
  clearTendingState,
  unlockedTendingLineCount,
  getTendingMilestoneAt,
  getTendingIntensity,
  selectPhase5Dialogue,
  hashSeed,
} from '../services/tending';
import {
  TENDING_BASE,
  TENDING_GROWTH,
  TENDING_COST_CAP,
  TENDING_MILESTONES,
  TENDING_DAILY_BONUS_DISCOUNT,
  TENDING_VISUAL_SATURATION_LEVEL,
} from '../constants/gameBalance';
import { getTendingMilestoneLines, TENDING_DIALOGUES } from '../services/dialogue/animalDialogueTending';
import { getLocalDateString, getLocalDateStringDaysAgo } from '../services/dateUtils';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

describe('tending', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearTendingState();
  });

  describe('availability', () => {
    it('is a Phase-5-only loop', () => {
      expect(isTendingAvailable(4)).toBe(false);
      expect(isTendingAvailable(5)).toBe(true);
      expect(isTendingAvailable(6)).toBe(true);
    });
  });

  describe('cost curve', () => {
    it('uses the compressed endgame tuning', () => {
      expect(TENDING_BASE).toBe(30);
      expect(TENDING_GROWTH).toBe(1.085);
      expect(TENDING_COST_CAP).toBe(650);
      expect(TENDING_DAILY_BONUS_DISCOUNT).toBe(0.3);
      expect(TENDING_MILESTONES).toEqual([3, 8, 15, 35, 70]);
      expect(TENDING_VISUAL_SATURATION_LEVEL).toBe(40);
    });

    it('matches the documented escalating curve', () => {
      // round(BASE * GROWTH^level / 10) * 10
      expect(getTendingCost(1)).toBe(30);
      expect(getTendingCost(2)).toBe(40);
      expect(getTendingCost(5)).toBe(50);
      expect(getTendingCost(10)).toBe(70);
      expect(getTendingCost(25)).toBe(230);
    });

    it('caps the per-level cost', () => {
      expect(getTendingCost(40)).toBe(TENDING_COST_CAP);
      expect(getTendingCost(100)).toBe(TENDING_COST_CAP);
      expect(getTendingCost(1000)).toBe(TENDING_COST_CAP);
    });

    it('is non-decreasing', () => {
      let prev = 0;
      for (let lvl = 1; lvl <= 60; lvl++) {
        const c = getTendingCost(lvl);
        expect(c).toBeGreaterThanOrEqual(prev);
        prev = c;
      }
    });
  });

  describe('getNextTendingInfo', () => {
    it('applies the daily discount on the first tend of the day', () => {
      const state = { level: 2, totalAmberTended: 0, lastTendDate: null, milestonesSeen: [], caughtUp: {} };
      const info = getNextTendingInfo(state, getLocalDateString());
      expect(info.nextLevel).toBe(3);
      expect(info.dailyBonusApplied).toBe(true);
      // base 40, 30% off -> 30 (rounded to 10)
      const expected = Math.round((info.baseCost * (1 - TENDING_DAILY_BONUS_DISCOUNT)) / 10) * 10;
      expect(info.cost).toBe(expected);
      expect(info.cost).toBeLessThan(info.baseCost);
      expect(info.milestone).toBe(3);
    });

    it('charges full price when already tended today', () => {
      const today = getLocalDateString();
      const state = { level: 4, totalAmberTended: 0, lastTendDate: today, milestonesSeen: [], caughtUp: {} };
      const info = getNextTendingInfo(state, today);
      expect(info.dailyBonusApplied).toBe(false);
      expect(info.cost).toBe(info.baseCost);
    });

    it('re-applies the discount on a new day', () => {
      const state = {
        level: 2, totalAmberTended: 0,
        lastTendDate: getLocalDateStringDaysAgo(1),
        milestonesSeen: [], caughtUp: {},
      };
      const info = getNextTendingInfo(state, getLocalDateString());
      expect(info.dailyBonusApplied).toBe(true);
    });

    it('flags non-milestone next levels as milestone null', () => {
      const state = { level: 1, totalAmberTended: 0, lastTendDate: null, milestonesSeen: [], caughtUp: {} };
      expect(getNextTendingInfo(state).milestone).toBeNull(); // next level 2
    });
  });

  describe('applyTend', () => {
    it('advances the level, records the sink, and sets the daily gate', async () => {
      const today = getLocalDateString();
      const r = await applyTend(40, today);
      expect(r.level).toBe(1);
      expect(r.totalAmberTended).toBe(40);
      const state = await loadTendingState();
      expect(state.lastTendDate).toBe(today);
      expect(await getTendingLevel()).toBe(1);
    });

    it('accumulates total amber tended across tends', async () => {
      await applyTend(40);
      await applyTend(50);
      const stats = await getTendingStats();
      expect(stats.level).toBe(2);
      expect(stats.totalAmberTended).toBe(90);
    });

    it('fires each milestone exactly once', async () => {
      // Tend up to level 3 (first milestone).
      let milestone: number | null = null;
      for (let i = 0; i < 3; i++) {
        const r = await applyTend(getTendingCost(i + 1));
        if (r.milestone != null) milestone = r.milestone;
      }
      expect(milestone).toBe(3);
      // Tending again past 3 does not re-fire the level-3 milestone.
      const r4 = await applyTend(getTendingCost(4));
      expect(r4.milestone).toBeNull();
    });
  });

  describe('milestone helpers', () => {
    it('counts unlocked milestone lines by level', () => {
      expect(unlockedTendingLineCount(0)).toBe(0);
      expect(unlockedTendingLineCount(3)).toBe(1);
      expect(unlockedTendingLineCount(8)).toBe(2);
      expect(unlockedTendingLineCount(70)).toBe(TENDING_MILESTONES.length);
    });

    it('identifies milestone levels', () => {
      expect(getTendingMilestoneAt(3)).toBe(3);
      expect(getTendingMilestoneAt(4)).toBeNull();
    });
  });

  describe('getTendingIntensity (visual deepening)', () => {
    it('is 0 at level 0 and saturates at 1', () => {
      expect(getTendingIntensity(0)).toBe(0);
      expect(getTendingIntensity(40)).toBe(1);
      expect(getTendingIntensity(1000)).toBe(1); // never exceeds 1
    });

    it('rises monotonically with an early-visible curve', () => {
      const a = getTendingIntensity(5);
      const b = getTendingIntensity(10);
      const c = getTendingIntensity(25);
      expect(a).toBeGreaterThan(0);
      expect(b).toBeGreaterThan(a);
      expect(c).toBeGreaterThan(b);
      // sqrt curve: a noticeable fraction by the first milestone.
      expect(a).toBeGreaterThan(0.25);
    });
  });

  describe('caughtUp persistence', () => {
    it('defaults to 0 and round-trips', async () => {
      expect(await getPhase5CaughtUp('fox')).toBe(0);
      await setPhase5CaughtUp('fox', 3);
      expect(await getPhase5CaughtUp('fox')).toBe(3);
      // Independent per animal.
      expect(await getPhase5CaughtUp('owl')).toBe(0);
    });
  });

  describe('clearTendingState', () => {
    it('resets all tending data', async () => {
      await applyTend(40);
      await setPhase5CaughtUp('fox', 2);
      await clearTendingState();
      const state = await loadTendingState();
      expect(state.level).toBe(0);
      expect(state.totalAmberTended).toBe(0);
      expect(state.caughtUp).toEqual({});
    });
  });
});

describe('selectPhase5Dialogue (pure)', () => {
  const pool = ['a', 'b', 'c', 'd'];

  it('delivers genuinely-new lines in authored order while not caught up', () => {
    expect(selectPhase5Dialogue(pool, 0, 0, 123)).toEqual({ text: 'a', isNew: true, nextCaughtUp: 1 });
    expect(selectPhase5Dialogue(pool, 1, 1, 123)).toEqual({ text: 'b', isNew: true, nextCaughtUp: 2 });
    expect(selectPhase5Dialogue(pool, 3, 3, 123)).toEqual({ text: 'd', isNew: true, nextCaughtUp: 4 });
  });

  it('serves re-reads (isNew false) once caught up, never advancing the pointer', () => {
    const r = selectPhase5Dialogue(pool, 4, 7, 123);
    expect(r.isNew).toBe(false);
    expect(r.nextCaughtUp).toBe(4);
    expect(pool).toContain(r.text);
  });

  it('re-reads are not the verbatim authored sequence', () => {
    // Walk several re-reads; the order should differ from the authored order.
    const seen: string[] = [];
    for (let i = 0; i < pool.length; i++) {
      seen.push(selectPhase5Dialogue(pool, pool.length, i, hashSeed('fox')).text);
    }
    // A permutation covers all lines but (for this seed) not in authored order.
    expect(new Set(seen).size).toBe(pool.length);
    expect(seen).not.toEqual(pool);
  });

  it('reshuffles each re-read cycle (no single repeating sequence)', () => {
    // Use a realistic pool size (the Phase-5 pool is ~10-16 lines).
    const big = Array.from({ length: 12 }, (_, i) => `L${i}`);
    const seed = hashSeed('owl');
    const cycleOf = (c: number) =>
      Array.from({ length: big.length }, (_, i) =>
        selectPhase5Dialogue(big, big.length, c * big.length + i, seed).text
      ).join('|');
    // Each cycle is a full permutation; across several cycles there is more than
    // one distinct ordering (it doesn't settle into a single repeating sequence).
    const orderings = new Set([0, 1, 2, 3].map(cycleOf));
    expect(orderings.size).toBeGreaterThan(1);
  });

  it('surfaces a newly-grown pool entry as the next new line', () => {
    // Caught up to 4; pool grows to 5 (a Tending milestone line appended).
    const grown = [...pool, 'e'];
    const r = selectPhase5Dialogue(grown, 4, 9, 123);
    expect(r).toEqual({ text: 'e', isNew: true, nextCaughtUp: 5 });
  });

  it('falls back gracefully on an empty pool', () => {
    expect(selectPhase5Dialogue([], 0, 0, 1)).toEqual({
      text: 'The pattern holds.', isNew: false, nextCaughtUp: 0,
    });
  });
});

describe('getTendingMilestoneLines', () => {
  it('unlocks one line per crossed milestone, in order', () => {
    expect(getTendingMilestoneLines('fox', 0)).toHaveLength(0);
    expect(getTendingMilestoneLines('fox', 3)).toHaveLength(1);
    expect(getTendingMilestoneLines('fox', 8)).toHaveLength(2);
    expect(getTendingMilestoneLines('fox', 1000)).toHaveLength(TENDING_MILESTONES.length);
  });

  it('provides a distinct serene line set for every animal', () => {
    const animals = ['fox', 'pangolin', 'owl', 'axolotl', 'sloth', 'fennec_fox', 'capybara', 'wombat', 'rabbit', 'red_panda'] as const;
    for (const a of animals) {
      const lines = getTendingMilestoneLines(a, 100);
      expect(lines).toHaveLength(TENDING_MILESTONES.length);
      lines.forEach(l => expect(l.length).toBeGreaterThan(0));
    }
  });

  it('has exactly one line per milestone for every animal (content guard)', () => {
    // Guards against a milestone being added without a matching dialogue line
    // (or vice versa) — a mismatch would silently drop the extra milestone's
    // line because getTendingMilestoneLines indexes by milestone position.
    const keys = Object.keys(TENDING_DIALOGUES) as (keyof typeof TENDING_DIALOGUES)[];
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(TENDING_DIALOGUES[key]).toHaveLength(TENDING_MILESTONES.length);
    }
  });
});
