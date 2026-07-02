/**
 * Narrative delivery systems:
 *  - Phase-2 exhaustion pool: extra lines served in order (then cycling) once
 *    an animal's Phase-2 base block is exhausted — never a verbatim re-read of
 *    the base block, and never by mutating the indexed base arrays.
 *  - NARRATIVE_SEEDS delivery: Phase-0 seeds land deterministically on the
 *    animal's 2nd and 5th dialogue sessions, each exactly once; Phase-4
 *    callbacks recontextualize only the seeds the player actually heard,
 *    one per visit, each exactly once.
 *  - Coordinated events key on the same weighted progress scale as phase
 *    transitions, so accelerated players receive the pre-finale crescendo
 *    (230/240/250) instead of hitting the finale with those events stranded.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimalType } from '../types/homeWorld';
import {
  PHASE2_EXTRA_DIALOGUES,
  getPhase2PoolLine,
  getDialoguesForAnimal,
} from '../services/dialogue/animalDialogueBase';
import {
  NARRATIVE_SEEDS,
  COORDINATED_EVENTS,
  getCoordinatedEventLine,
  getAndMarkNarrativeSeedPage,
  getAndMarkNarrativeCallbackPage,
  getPhase2PoolCursors,
  advancePhase2PoolCursor,
  clearNarrativeDeliveryState,
} from '../services/dialogue/animalDialogueNarrative';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

const ALL_ANIMALS: AnimalType[] = [
  'fox', 'pangolin', 'owl', 'axolotl', 'sloth',
  'fennec_fox', 'capybara', 'wombat', 'rabbit', 'red_panda',
];

beforeEach(async () => {
  await clearNarrativeDeliveryState();
  await (AsyncStorage.clear as jest.Mock)();
});

// ---------------------------------------------------------------------------
// Phase-2 exhaustion pool
// ---------------------------------------------------------------------------

describe('phase-2 exhaustion pool', () => {
  it('serves 5 unique lines per animal, in order, then cycles', () => {
    for (const animal of ALL_ANIMALS) {
      const pool = PHASE2_EXTRA_DIALOGUES[animal];
      expect(pool).toHaveLength(5);
      expect(new Set(pool).size).toBe(pool.length);
      for (let c = 0; c < pool.length; c++) {
        expect(getPhase2PoolLine(animal, c)).toBe(pool[c]);
      }
      // Cycling after the pool is exhausted
      expect(getPhase2PoolLine(animal, 5)).toBe(pool[0]);
      expect(getPhase2PoolLine(animal, 8)).toBe(pool[3]);
    }
  });

  it('never re-reads a base Phase-2 line verbatim (pool is disjoint from the base block)', () => {
    for (const animal of ALL_ANIMALS) {
      const baseTexts = new Set(getDialoguesForAnimal(animal, 2).map(d => d.text));
      for (const line of PHASE2_EXTRA_DIALOGUES[animal]) {
        expect(baseTexts.has(line)).toBe(false);
      }
    }
  });

  it('persists per-animal cursors independently', async () => {
    expect((await getPhase2PoolCursors())['fox'] ?? 0).toBe(0);
    expect(await advancePhase2PoolCursor('fox')).toBe(1);
    expect(await advancePhase2PoolCursor('fox')).toBe(2);
    expect(await advancePhase2PoolCursor('owl')).toBe(1);
    const cursors = await getPhase2PoolCursors();
    expect(cursors['fox']).toBe(2);
    expect(cursors['owl']).toBe(1);
    expect(cursors['rabbit']).toBeUndefined();
  });

  it('the cursor walk yields fresh lines each advance — no verbatim dead-end loop', async () => {
    // Simulates the hook's exhausted-block loop: show pool[cursor], advance.
    const seen: string[] = [];
    for (let i = 0; i < 7; i++) {
      const cursors = await getPhase2PoolCursors();
      const line = getPhase2PoolLine('rabbit', cursors['rabbit'] ?? 0);
      expect(line).not.toBeNull();
      seen.push(line!);
      await advancePhase2PoolCursor('rabbit');
    }
    const pool = PHASE2_EXTRA_DIALOGUES.rabbit;
    expect(seen).toEqual([...pool, pool[0], pool[1]]);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).not.toBe(seen[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// Narrative seed delivery (Phase 0)
// ---------------------------------------------------------------------------

describe('narrative seed delivery', () => {
  it('delivers seed 0 on the 2nd session and seed 1 on the 5th, each exactly once', async () => {
    expect(await getAndMarkNarrativeSeedPage('fox', 1)).toBeNull();
    expect(await getAndMarkNarrativeSeedPage('fox', 2)).toBe(NARRATIVE_SEEDS.fox.seeds[0]);
    // Same session again: seed 0 already delivered, seed 1 not yet due
    expect(await getAndMarkNarrativeSeedPage('fox', 2)).toBeNull();
    expect(await getAndMarkNarrativeSeedPage('fox', 3)).toBeNull();
    expect(await getAndMarkNarrativeSeedPage('fox', 4)).toBeNull();
    expect(await getAndMarkNarrativeSeedPage('fox', 5)).toBe(NARRATIVE_SEEDS.fox.seeds[1]);
    // Both delivered — never repeats
    expect(await getAndMarkNarrativeSeedPage('fox', 5)).toBeNull();
    expect(await getAndMarkNarrativeSeedPage('fox', 9)).toBeNull();
  });

  it('catches up an existing mid-Phase-0 player (due is >=, not ===)', async () => {
    expect(await getAndMarkNarrativeSeedPage('pangolin', 7)).toBe(NARRATIVE_SEEDS.pangolin.seeds[0]);
    expect(await getAndMarkNarrativeSeedPage('pangolin', 7)).toBe(NARRATIVE_SEEDS.pangolin.seeds[1]);
    expect(await getAndMarkNarrativeSeedPage('pangolin', 7)).toBeNull();
  });

  it('tracks delivery per animal', async () => {
    expect(await getAndMarkNarrativeSeedPage('owl', 2)).toBe(NARRATIVE_SEEDS.owl.seeds[0]);
    // Fox is unaffected by owl's delivery
    expect(await getAndMarkNarrativeSeedPage('fox', 2)).toBe(NARRATIVE_SEEDS.fox.seeds[0]);
  });
});

// ---------------------------------------------------------------------------
// Phase-4 seed callbacks
// ---------------------------------------------------------------------------

describe('phase-4 seed callbacks', () => {
  it('never recontextualizes a seed the player did not hear', async () => {
    expect(await getAndMarkNarrativeCallbackPage('owl')).toBeNull();

    await getAndMarkNarrativeSeedPage('owl', 2); // hears seed 0 only
    expect(await getAndMarkNarrativeCallbackPage('owl')).toBe(NARRATIVE_SEEDS.owl.callbacks[0]);
    // Seed 1 was never heard, so callback 1 never delivers
    expect(await getAndMarkNarrativeCallbackPage('owl')).toBeNull();
  });

  it('delivers each heard-seed callback once, one per visit, then goes silent', async () => {
    await getAndMarkNarrativeSeedPage('fox', 2);
    await getAndMarkNarrativeSeedPage('fox', 5);

    expect(await getAndMarkNarrativeCallbackPage('fox')).toBe(NARRATIVE_SEEDS.fox.callbacks[0]);
    expect(await getAndMarkNarrativeCallbackPage('fox')).toBe(NARRATIVE_SEEDS.fox.callbacks[1]);
    expect(await getAndMarkNarrativeCallbackPage('fox')).toBeNull();
    expect(await getAndMarkNarrativeCallbackPage('fox')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Coordinated events on the weighted progress scale
// ---------------------------------------------------------------------------

describe('coordinated events keyed on weighted progress', () => {
  const themesInOrder = COORDINATED_EVENTS.map(e => e.theme);

  function drain(effectiveProgress: number, phase: number): string[] {
    const consumed: string[] = [];
    const delivered: string[] = [];
    for (let i = 0; i < COORDINATED_EVENTS.length + 1; i++) {
      const r = getCoordinatedEventLine('fox', effectiveProgress, phase, consumed, ALL_ANIMALS);
      if (!r) break;
      delivered.push(r.theme);
      consumed.push(r.theme);
    }
    return delivered;
  }

  it('an accelerated player (weighted progress past every threshold) receives ALL events, in threshold order', () => {
    // Engaged player near the finale: phaseProgress ~260 from ~155 real puzzles.
    const delivered = drain(260, 4);
    expect(delivered).toEqual(themesInOrder);
  });

  it('skipped-past thresholds deliver one per visit rather than being lost', () => {
    const consumed: string[] = [];
    const first = getCoordinatedEventLine('fox', 260, 4, consumed, ALL_ANIMALS);
    expect(first?.theme).toBe(themesInOrder[0]);
    consumed.push(first!.theme);
    const second = getCoordinatedEventLine('fox', 260, 4, consumed, ALL_ANIMALS);
    expect(second?.theme).toBe(themesInOrder[1]);
  });

  it('regression: the raw puzzle count would strand the pre-finale crescendo that the weighted scale fires', () => {
    // An accelerated player reaches the finale around 155 REAL puzzles.
    const rawDelivered = drain(155, 4);
    const reachableRaw = COORDINATED_EVENTS
      .filter(e => e.puzzleThreshold <= 155)
      .map(e => e.theme);
    expect(rawDelivered).toEqual(reachableRaw);
    expect(rawDelivered).not.toContain('almost_time');
    expect(rawDelivered).not.toContain('convergence');
    expect(rawDelivered).not.toContain('the_threshold');

    // The same player's WEIGHTED progress reaches the crescendo events.
    const weightedDelivered = drain(260, 4);
    expect(weightedDelivered).toContain('almost_time');
    expect(weightedDelivered).toContain('convergence');
    expect(weightedDelivered).toContain('the_threshold');
  });

  it('already-consumed bookkeeping still suppresses delivered events', () => {
    const all = drain(260, 4);
    expect(getCoordinatedEventLine('fox', 260, 4, all, ALL_ANIMALS)).toBeNull();
  });
});
