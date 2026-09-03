/**
 * Unlock-gating invariants for the dialogue corpus.
 *
 * Rule: no animal may name another animal the player hasn't unlocked yet.
 * Unlocks are strictly sequential (UNLOCK_PROGRESSION), so:
 *  - a speaker may freely name any animal that unlocks BEFORE it;
 *  - naming an animal that unlocks AFTER the speaker requires gating
 *    (a `requiresAnimals` tag, the cross-ref `mentions` filter, or the
 *    coordinated-event unlockedAnimals check).
 *  - Phase 5 / post-revelation content is NOT exempt. It used to be, on the
 *    premise that reaching the reveal required a finished house; the
 *    endgame-lockout fix ended that by also arming on a bare solve floor, so a
 *    player who spent amber on the cosmetic catalogue instead of the last
 *    rooms arrives at Phase 5 with keepers unbuilt. The 36 authored lines that
 *    name a later-unlocking animal STAY in the corpus (they are good writing,
 *    and engineered cross-animal texture is the point) — they are gated at
 *    RUNTIME by buildPhase5Eligibility instead, so the static scan below
 *    deliberately exempts them while the runtime tests at the bottom of this
 *    file prove the filter actually withholds them.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildPhase5Pool, buildPhase5Eligibility } from '../services/dialogue/phase5Pool';
import { selectPhase5Dialogue, hasNewPhase5Line, hashSeed } from '../services/tending';
import { AnimalType } from '../types/homeWorld';
import {
  getDialoguesForAnimal,
  PHASE2_EXTRA_DIALOGUES,
} from '../services/dialogue/animalDialogueBase';
import {
  CROSS_ANIMAL_REFERENCES,
  COORDINATED_EVENTS,
  getCoordinatedEventLine,
  NARRATIVE_SEEDS,
} from '../services/dialogue/animalDialogueNarrative';
import {
  INTRO_DIALOGUES,
  CATCHUP_INTRO_DIALOGUES,
} from '../services/dialogue/animalDialogueIntro';
import { UNLOCK_PROGRESSION } from '../services/homeWorldData';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

const ALL_ANIMALS: AnimalType[] = [
  'fox', 'pangolin', 'owl', 'axolotl', 'sloth',
  'fennec_fox', 'capybara', 'wombat', 'rabbit', 'red_panda',
  'tarsier', 'aye_aye', 'kakapo',
];

const DISPLAY_NAMES: Record<string, AnimalType> = {
  Ember: 'fox', Panko: 'pangolin', Archimedes: 'owl', Axel: 'axolotl',
  Sloane: 'sloth', Fennick: 'fennec_fox', Chill: 'capybara',
  Warren: 'wombat', Thyme: 'rabbit', Bamboo: 'red_panda',
  Vesper: 'tarsier', Tock: 'aye_aye', Moss: 'kakapo',
};

/** Unlock position per animal, derived from the real progression data. */
function buildUnlockOrder(): Record<string, number> {
  const order: Record<string, number> = {};
  let pos = 0;
  for (const unlock of UNLOCK_PROGRESSION) {
    if (unlock.type === 'character') {
      pos += 1;
      order[unlock.targetId] = pos;
    }
  }
  return order;
}

/** Animals named in a text (capitalized display names, word-bounded). */
function namedAnimals(text: string, excluding?: AnimalType): AnimalType[] {
  const found: AnimalType[] = [];
  for (const [name, type] of Object.entries(DISPLAY_NAMES)) {
    if (type === excluding) continue;
    if (new RegExp(`\\b${name}\\b`).test(text)) found.push(type);
  }
  return found;
}

describe('dialogue unlock gating', () => {
  const order = buildUnlockOrder();

  beforeEach(() => {
    (AsyncStorage.clear as jest.Mock)();
  });

  it('unlock order covers all thirteen animals', () => {
    for (const animal of ALL_ANIMALS) {
      expect(order[animal]).toBeGreaterThan(0);
    }
  });

  it('base dialogues gate every forward mention with requiresAnimals', () => {
    const violations: string[] = [];
    for (const speaker of ALL_ANIMALS) {
      for (const line of getDialoguesForAnimal(speaker, 4)) {
        for (const mentioned of namedAnimals(line.text, speaker)) {
          const needsTag = order[mentioned] > order[speaker];
          const hasTag = (line.requiresAnimals ?? []).includes(mentioned);
          if (needsTag && !hasTag) {
            violations.push(`${line.id}: ${speaker} names ${mentioned} without requiresAnimals`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('cross-animal references gate on the latest-unlocking animal they name', () => {
    const violations: string[] = [];
    for (const speaker of ALL_ANIMALS) {
      const phases = CROSS_ANIMAL_REFERENCES[speaker] ?? {};
      for (const [phase, refs] of Object.entries(phases)) {
        for (const ref of refs) {
          // The runtime filter guarantees ref.mentions is unlocked; sequential
          // unlocks make everything at or before max(speaker, mentions) safe.
          const safeUpTo = Math.max(order[speaker], order[ref.mentions]);
          for (const mentioned of namedAnimals(ref.text, speaker)) {
            if (order[mentioned] > safeUpTo) {
              violations.push(
                `${speaker} phase ${phase} ref gated on '${ref.mentions}' also names later-unlocking '${mentioned}': ${ref.text.slice(0, 60)}`
              );
            }
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('coordinated event lines never surface mentions of locked animals', () => {
    for (const event of COORDINATED_EVENTS) {
      const otherThemes = COORDINATED_EVENTS
        .filter(e => e.theme !== event.theme)
        .map(e => e.theme);
      for (const speaker of Object.keys(event.lines) as AnimalType[]) {
        // Worst case: only the speaker itself is unlocked.
        const result = getCoordinatedEventLine(
          speaker,
          event.puzzleThreshold,
          event.phase,
          otherThemes,
          [speaker]
        );
        if (result) {
          expect(namedAnimals(result.text, speaker)).toEqual([]);
        }
        // With everyone unlocked the line must be deliverable.
        const fullResult = getCoordinatedEventLine(
          speaker,
          event.puzzleThreshold,
          event.phase,
          otherThemes,
          ALL_ANIMALS
        );
        expect(fullResult?.theme).toBe(event.theme);
      }
    }
  });

  it('intro and catch-up dialogues only name earlier-unlocking animals', () => {
    const violations: string[] = [];
    for (const speaker of ALL_ANIMALS) {
      for (const text of INTRO_DIALOGUES[speaker] ?? []) {
        for (const mentioned of namedAnimals(text, speaker)) {
          if (order[mentioned] > order[speaker]) {
            violations.push(`intro(${speaker}) names later-unlocking ${mentioned}: ${text.slice(0, 60)}`);
          }
        }
      }
      const catchups = CATCHUP_INTRO_DIALOGUES[speaker] ?? {};
      for (const [phase, lines] of Object.entries(catchups)) {
        for (const text of lines) {
          for (const mentioned of namedAnimals(text, speaker)) {
            if (order[mentioned] > order[speaker]) {
              violations.push(`catchup(${speaker}, p${phase}) names later-unlocking ${mentioned}: ${text.slice(0, 60)}`);
            }
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('phase-2 exhaustion pool lines never name another animal (they are ungated)', () => {
    // Pool lines are plain strings with no requiresAnimals tags and no
    // runtime mention filter, so they must not name ANY other animal.
    const violations: string[] = [];
    for (const speaker of ALL_ANIMALS) {
      for (const text of PHASE2_EXTRA_DIALOGUES[speaker] ?? []) {
        for (const mentioned of namedAnimals(text, speaker)) {
          violations.push(`phase2Extra(${speaker}) names ${mentioned}: ${text.slice(0, 60)}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('narrative seeds and callbacks only name earlier-unlocking animals', () => {
    const violations: string[] = [];
    for (const speaker of ALL_ANIMALS) {
      const entry = NARRATIVE_SEEDS[speaker];
      if (!entry) continue;
      for (const text of [...entry.seeds, ...entry.callbacks]) {
        for (const mentioned of namedAnimals(text, speaker)) {
          if (order[mentioned] > order[speaker]) {
            violations.push(`seed/callback(${speaker}) names later-unlocking ${mentioned}: ${text.slice(0, 60)}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  /**
   * Post-revelation lines are the one family gated at RUNTIME rather than in
   * the corpus, so the static scan above cannot cover them. These stand in for
   * it: the pool keeps every line at a stable index, and the predicate decides
   * which of those indices may be delivered right now.
   */
  describe('post-revelation lines are gated at runtime, not rewritten', () => {
    const WITHOUT_TRIO: string[] = ALL_ANIMALS.filter(
      a => a !== 'tarsier' && a !== 'aye_aye' && a !== 'kakapo'
    );

    it('the corpus really does contain later-unlocking mentions (guards the guard)', () => {
      // If this ever reaches zero the tests below are vacuous — either the
      // lines were rewritten (losing the texture) or the pool stopped
      // including them.
      let mentions = 0;
      for (const speaker of ALL_ANIMALS) {
        const pool = buildPhase5Pool(speaker, 0, null);
        const eligible = buildPhase5Eligibility(speaker, pool, WITHOUT_TRIO);
        mentions += pool.filter((_, i) => !eligible(i)).length;
      }
      expect(mentions).toBeGreaterThan(0);
    });

    it('never delivers a line naming an animal the player has not met', () => {
      for (const speaker of ALL_ANIMALS) {
        const pool = buildPhase5Pool(speaker, 0, null);
        if (pool.length === 0) continue;
        const eligible = buildPhase5Eligibility(speaker, pool, WITHOUT_TRIO);
        const seed = hashSeed(speaker);

        // Walk the entire new-line run...
        let caughtUp = 0;
        const served: string[] = [];
        let guard = 0;
        while (hasNewPhase5Line(pool, caughtUp, eligible) && guard++ < 200) {
          const r = selectPhase5Dialogue(pool, caughtUp, 0, seed, eligible);
          served.push(r.text);
          caughtUp = r.nextCaughtUp;
        }
        // ...then well into the shuffled re-read cycle, which is the other
        // path a withheld line could escape through.
        for (let d = 0; d < pool.length * 3; d++) {
          served.push(selectPhase5Dialogue(pool, caughtUp, d, seed, eligible).text);
        }

        for (const text of served) {
          expect(namedAnimals(text, speaker).filter(m => !WITHOUT_TRIO.includes(m))).toEqual([]);
        }
      }
    });

    it('releases the withheld lines once the animal is unlocked', () => {
      for (const speaker of ALL_ANIMALS) {
        const pool = buildPhase5Pool(speaker, 0, null);
        const open = buildPhase5Eligibility(speaker, pool, ALL_ANIMALS);
        expect(pool.every((_, i) => open(i))).toBe(true);
      }
    });

    it('the badge does not light for a pool whose remaining lines are all withheld', () => {
      // The whole point of routing the badge through the same predicate: it
      // used to be `caughtUp < pool.length`, which promised news the session
      // could not deliver and opened on a re-read instead.
      const pool = ['A quiet line.', 'Vesper comes down at dawn.'];
      const eligible = buildPhase5Eligibility('fox', pool, WITHOUT_TRIO);
      expect(hasNewPhase5Line(pool, 0, eligible)).toBe(true);
      expect(hasNewPhase5Line(pool, 1, eligible)).toBe(false);
      expect(hasNewPhase5Line(pool, 1, buildPhase5Eligibility('fox', pool, ALL_ANIMALS))).toBe(true);
    });
  });
});