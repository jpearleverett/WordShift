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
import { PHASE_THRESHOLDS, FINALE_DWELL_PUZZLES } from '../constants/gameBalance';
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
  peekNarrativeSeedPage,
  peekNarrativeCallbackPage,
  invalidateNarrativeDeliveryCache,
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
  'tarsier', 'aye_aye', 'kakapo',
];

beforeEach(async () => {
  await clearNarrativeDeliveryState();
  await (AsyncStorage.clear as jest.Mock)();
});

// ---------------------------------------------------------------------------
// Phase-2 exhaustion pool
// ---------------------------------------------------------------------------

describe('phase-2 exhaustion pool', () => {
  it('serves 10 unique lines per animal, in order, then cycles', () => {
    for (const animal of ALL_ANIMALS) {
      const pool = PHASE2_EXTRA_DIALOGUES[animal];
      expect(pool).toHaveLength(10);
      expect(new Set(pool).size).toBe(pool.length);
      for (let c = 0; c < pool.length; c++) {
        expect(getPhase2PoolLine(animal, c)).toBe(pool[c]);
      }
      // Cycling after the pool is exhausted
      expect(getPhase2PoolLine(animal, pool.length)).toBe(pool[0]);
      expect(getPhase2PoolLine(animal, pool.length + 3)).toBe(pool[3]);
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
    // Walk the full pool plus two so the wrap-around is exercised.
    const pool = PHASE2_EXTRA_DIALOGUES.rabbit;
    const seen: string[] = [];
    for (let i = 0; i < pool.length + 2; i++) {
      const cursors = await getPhase2PoolCursors();
      const line = getPhase2PoolLine('rabbit', cursors['rabbit'] ?? 0);
      expect(line).not.toBeNull();
      seen.push(line!);
      await advancePhase2PoolCursor('rabbit');
    }
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

  it('allowUnheardSeeds: a seedless animal (late unlock) still receives its callbacks, one per visit', async () => {
    // The descent trio unlocks at global Phase 3-4 — seed planting stopped at
    // Phase 2, so without the widened gate their callbacks are unreachable.
    expect(await getAndMarkNarrativeCallbackPage('kakapo')).toBeNull();
    expect(
      await getAndMarkNarrativeCallbackPage('kakapo', { allowUnheardSeeds: true })
    ).toBe(NARRATIVE_SEEDS.kakapo.callbacks[0]);
    expect(
      await getAndMarkNarrativeCallbackPage('kakapo', { allowUnheardSeeds: true })
    ).toBe(NARRATIVE_SEEDS.kakapo.callbacks[1]);
    expect(
      await getAndMarkNarrativeCallbackPage('kakapo', { allowUnheardSeeds: true })
    ).toBeNull();
  });

  it('allowUnheardSeeds keeps the classic heard-seed contract when SOME seed was heard', async () => {
    await getAndMarkNarrativeSeedPage('owl', 2); // hears seed 0 only
    expect(
      await getAndMarkNarrativeCallbackPage('owl', { allowUnheardSeeds: true })
    ).toBe(NARRATIVE_SEEDS.owl.callbacks[0]);
    // Seed 1 was heard-able but skipped — the widened gate is only for animals
    // whose seeds could NEVER be planted, so callback 1 stays withheld.
    expect(
      await getAndMarkNarrativeCallbackPage('owl', { allowUnheardSeeds: true })
    ).toBeNull();
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
      consumed.push(r.deliveryKey);
    }
    return delivered;
  }

  it('an accelerated player (weighted progress past every threshold) receives ALL events, in threshold order', () => {
    // Engaged player near the finale: phaseProgress ~230 from ~116 real puzzles.
    const delivered = drain(230, 4);
    expect(delivered).toEqual(themesInOrder);
  });

  it('skipped-past thresholds deliver one per visit rather than being lost', () => {
    const consumed: string[] = [];
    const first = getCoordinatedEventLine('fox', 230, 4, consumed, ALL_ANIMALS);
    expect(first?.theme).toBe(themesInOrder[0]);
    consumed.push(first!.deliveryKey);
    const second = getCoordinatedEventLine('fox', 230, 4, consumed, ALL_ANIMALS);
    expect(second?.theme).toBe(themesInOrder[1]);
  });

  it('makes every event available before arrival without assuming the player heard it', () => {
    // These thresholds were authored against a ~300-puzzle arc and were left at
    // 140/161/168/175 after the arc was compressed twice. Post-revelation now
    // lands near raw 120, and Phase 5 still serves coordinated-event pages — so
    // the crescendo ("the last breath before we become part of what
    // approaches") could fire AFTER the entity had already arrived and settled.
    //
    // NOTE ON SCALES: puzzleThreshold is WEIGHTED progress, while
    // FINALE_ARM_MIN_PUZZLES is a RAW solve count — comparing them directly is
    // apples-to-oranges. The finale cannot fire before Phase 4 opens (the
    // endgame block is gated on currentPhase >= 4), and once it opens the
    // arrangement still has to sit through FINALE_DWELL_PUZZLES dwell wins,
    // each of which advances weighted progress by at least 1. So the last
    // event must land within that dwell window measured on the weighted scale:
    const arrivalBound = PHASE_THRESHOLDS[4] + FINALE_DWELL_PUZZLES;
    for (const event of COORDINATED_EVENTS) {
      expect(event.puzzleThreshold).toBeLessThanOrEqual(arrivalBound);
    }

    // At the bound a player can hear every theme; actual visits remain optional.
    expect(drain(arrivalBound, 4)).toEqual(themesInOrder);
  });

  it('each event sits inside the weighted window of the phase it is written for', () => {
    // PHASE_THRESHOLDS is the weighted scale the events share, so an event
    // tagged phase N must not be keyed below phase N's opening (it would be
    // held by the phase gate) nor past the NEXT phase's opening (it would be
    // delivered in the wrong era, which is how the crescendo drifted).
    for (const event of COORDINATED_EVENTS) {
      const opens = PHASE_THRESHOLDS[event.phase];
      const nextOpens = PHASE_THRESHOLDS[event.phase + 1] ?? Infinity;
      expect(event.puzzleThreshold).toBeGreaterThanOrEqual(opens);
      expect(event.puzzleThreshold).toBeLessThan(nextOpens);
    }
  });

  it('thresholds are strictly increasing, so the crescendo cannot deliver out of order', () => {
    const thresholds = COORDINATED_EVENTS.map(e => e.puzzleThreshold);
    expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
    expect(new Set(thresholds).size).toBe(thresholds.length);
  });

  it('already-consumed bookkeeping still suppresses delivered events', () => {
    const all = drain(230, 4);
    expect(getCoordinatedEventLine('fox', 230, 4, all, ALL_ANIMALS)).toBeNull();
  });
});


describe('narrative pages survive an interrupted conversation', () => {
  it('does not count a queued seed as heard, even after a reload', async () => {
    const queued = await peekNarrativeSeedPage('fox', 2);
    expect(queued?.text).toBe(NARRATIVE_SEEDS.fox.seeds[0]);
    invalidateNarrativeDeliveryCache();
    expect(await peekNarrativeCallbackPage('fox')).toBeNull();
    expect((await peekNarrativeSeedPage('fox', 2))?.text).toBe(queued?.text);
    await queued!.commit();
    invalidateNarrativeDeliveryCache();
    expect(await peekNarrativeSeedPage('fox', 2)).toBeNull();
    expect((await peekNarrativeCallbackPage('fox'))?.text).toBe(NARRATIVE_SEEDS.fox.callbacks[0]);
  });

  it('keeps a callback owed until its page appears and commits it once', async () => {
    await getAndMarkNarrativeSeedPage('owl', 2);
    const queued = await peekNarrativeCallbackPage('owl');
    invalidateNarrativeDeliveryCache();
    expect((await peekNarrativeCallbackPage('owl'))?.text).toBe(queued?.text);
    await queued!.commit();
    await queued!.commit();
    invalidateNarrativeDeliveryCache();
    expect(await peekNarrativeCallbackPage('owl')).toBeNull();
  });

  it('merges queued commits without overwriting other animals or pool progress', async () => {
    const fox = await peekNarrativeSeedPage('fox', 2);
    const owl = await peekNarrativeSeedPage('owl', 2);
    await fox!.commit();
    await advancePhase2PoolCursor('rabbit');
    await owl!.commit();
    invalidateNarrativeDeliveryCache();
    expect(await peekNarrativeSeedPage('fox', 2)).toBeNull();
    expect(await peekNarrativeSeedPage('owl', 2)).toBeNull();
    expect((await getPhase2PoolCursors()).rabbit).toBe(1);
  });
});

describe('independent witnesses and arrival chronology', () => {
  it('lets another animal corroborate a heard event, with at most two witnesses', () => {
    const consumed: string[] = [];
    const first = getCoordinatedEventLine('fox', 56, 2, consumed, ALL_ANIMALS)!;
    consumed.push(first.deliveryKey);
    expect(getCoordinatedEventLine('fox', 56, 2, consumed, ALL_ANIMALS)).toBeNull();
    const second = getCoordinatedEventLine('owl', 56, 2, consumed, ALL_ANIMALS)!;
    expect(second.theme).toBe(first.theme);
    expect(second.text).not.toBe(first.text);
    consumed.push(second.deliveryKey);
    expect(getCoordinatedEventLine('pangolin', 56, 2, consumed, ALL_ANIMALS)).toBeNull();
  });

  it('preserves legacy completed themes without replaying a witness', () => {
    expect(getCoordinatedEventLine('owl', 56, 2, ['words_changing'], ALL_ANIMALS)).toBeNull();
  });

  it('never delivers an unconsumed approach account after arrival, however far behind the reader is', () => {
    for (const animal of ALL_ANIMALS) {
      expect(getCoordinatedEventLine(animal, 1000, 5, [], ALL_ANIMALS)).toBeNull();
      expect(getCoordinatedEventLine(animal, 1000, 5, ['words_changing:witness:fox'], ALL_ANIMALS)).toBeNull();
    }
  });
});
