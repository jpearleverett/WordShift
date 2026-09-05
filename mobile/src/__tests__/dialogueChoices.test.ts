import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadChoiceState,
  getChoiceForAnimal,
  recordChoice,
  getPlayerChoice,
  hasSeenAnyChoice,
  getChoiceCount,
  getPhase4ChoiceCallback,
  getPhase5ChoiceCallback,
  clearChoiceState,
  ANIMAL_CHOICES,
  PlayerChoice,
} from '../services/dialogueChoices';
import { getPhaseStartIndex } from '../services/dialogue/animalDialogueBase';
import { ANIMAL_AWARENESS_TIERS, AnimalType } from '../types/homeWorld';

/**
 * A dialogue index that sits inside an animal's real Phase-3 block. The old
 * tests passed a literal 5, which reads as "the 6th line the animal ever
 * says" — deep in its PHASE-0 block, because the index is absolute over the
 * phase-ordered list (blocks of 24/28/22/30/30). The window was written as if
 * the index were a per-phase offset, so the beat was unreachable for anyone
 * who actually read dialogue. These tests measure from the real boundary.
 */
const inPhase3 = (animal: string, offset = 2): number =>
  getPhaseStartIndex(animal as AnimalType, 3) + offset;

// Mock AsyncStorage using shared factory
jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

const ALL_ANIMALS = [
  'fox', 'owl', 'pangolin', 'axolotl', 'capybara',
  'fennec_fox', 'sloth', 'wombat', 'rabbit', 'red_panda',
  'tarsier', 'aye_aye', 'kakapo',
];
const FORBIDDEN = /\b(game|puzzle|summoning|spreadsheet|consent)\b/i;
type ChoiceMemoryContract = {
  ask: RegExp;
  refuse: RegExp;
};

// The shared object/action must survive from the offered choice into BOTH
// later callbacks. These contracts cover meanings rather than exact phrasing.
const REMEMBERED_CHOICE_ANCHORS: Record<string, ChoiceMemoryContract> = {
  fox: { ask: /\b(?:know|knew|truth)\b/i, refuse: /\b(?:time|cup)\b/i },
  owl: { ask: /\b(?:line|accounts|comparison|compare)\b/i, refuse: /\b(?:words|comparison|column|notes)\b/i },
  pangolin: { ask: /\b(?:pear|saucer)\b/i, refuse: /\b(?:pear|experiment|test)\b/i },
  axolotl: { ask: /\b(?:shape|circle)\b/i, refuse: /\b(?:quiet|settle|still)\b/i },
  capybara: { ask: /\b(?:copy|copies|objection)\b/i, refuse: /\b(?:private|folder|objection)\b/i },
  fennec_fox: { ask: /\b(?:small|sound|sleeve)\b/i, refuse: /\b(?:stop|rest|listening)\b/i },
  sloth: { ask: /\b(?:know|knew|knowledge)\b/i, refuse: /\bpromise\b/i },
  wombat: { ask: /\b(?:work|join|bracing|braces|drawings)\b/i, refuse: /\b(?:above|ground|stairs)\b/i },
  rabbit: { ask: /\b(?:path|way out)\b/i, refuse: /\b(?:map|private)\b/i },
  red_panda: { ask: /\bpeace\b/i, refuse: /\b(?:circle|gap|outside)\b/i },
  tarsier: { ask: /\b(?:here|nearby|rail|chip)\b/i, refuse: /\b(?:distant|distance|watch)\b/i },
  aye_aye: { ask: /\banswers?\b/i, refuse: /\bquiet\b/i },
  kakapo: { ask: /\bseed\b/i, refuse: /\b(?:experiment|notes|notebook)\b/i },
};

describe('dialogueChoices', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearChoiceState();
  });

  // ===========================================================================
  // ANIMAL_CHOICES content
  // ===========================================================================

  describe('ANIMAL_CHOICES', () => {
    it('has choice content for every animal', () => {
      expect(Object.keys(ANIMAL_CHOICES).sort()).toEqual([...ALL_ANIMALS].sort());
    });

    it('each choice has prompt, options, responses, and convergence', () => {
      for (const animal of ALL_ANIMALS) {
        const choice = ANIMAL_CHOICES[animal];
        const content = [
          choice.prompt,
          choice.options.ask,
          choice.options.refuse,
          choice.responses.ask,
          choice.responses.refuse,
          choice.convergence,
        ];
        expect(content.every(line => typeof line === 'string' && line.trim().length > 0)).toBe(true);
        expect(content.join(' ')).not.toMatch(FORBIDDEN);
      }
    });

    it('ask and refuse options are different', () => {
      for (const animal of ALL_ANIMALS) {
        const choice = ANIMAL_CHOICES[animal];
        expect(choice.options.ask).not.toBe(choice.options.refuse);
      }
    });

    it('ask and refuse responses are different', () => {
      for (const animal of ALL_ANIMALS) {
        const choice = ANIMAL_CHOICES[animal];
        expect(choice.responses.ask).not.toBe(choice.responses.refuse);
      }
    });

    it('every convergence remains non-empty', () => {
      for (const animal of ALL_ANIMALS) {
        expect(ANIMAL_CHOICES[animal].convergence.trim()).not.toBe('');
      }
    });

    it('recalls the object or boundary actually offered in both later phases', () => {
      const failures: string[] = [];
      for (const animal of ALL_ANIMALS) {
        const content = ANIMAL_CHOICES[animal];
        for (const branch of ['ask', 'refuse'] as const) {
          const anchor = REMEMBERED_CHOICE_ANCHORS[animal][branch];
          const stages = {
            offered: content.options[branch] + ' ' + content.responses[branch],
            phase4: getPhase4ChoiceCallback(animal, branch),
            phase5: getPhase5ChoiceCallback(animal, branch),
          };
          for (const [stage, text] of Object.entries(stages)) {
            if (!text || !anchor.test(text)) {
              failures.push(animal + '.' + branch + '.' + stage + ': ' + text);
            }
          }
        }
      }
      expect(failures).toEqual([]);
    });

    it('does not turn an invitation to investigate into an unplayed shared excursion', () => {
      expect(getPhase4ChoiceCallback('pangolin', 'ask')).toContain('You asked me to put the pear aside');
      expect(getPhase5ChoiceCallback('rabbit', 'ask')).toContain('You asked to check the path');
      expect(getPhase5ChoiceCallback('rabbit', 'ask')).not.toMatch(/we checked.*together/i);
    });

    it('keeps Moss refusal outside the experiment without promising an outcome', () => {
      const choice = ANIMAL_CHOICES.kakapo;
      expect(choice.options.refuse).toMatch(/rather not join/i);
      expect(choice.responses.refuse).toMatch(/without putting your name/i);
      expect(getPhase4ChoiceCallback('kakapo', 'refuse')).toMatch(/my own name/i);
      expect(getPhase5ChoiceCallback('kakapo', 'refuse')).toMatch(/did not join/i);
      expect(choice.responses.refuse + ' ' + choice.convergence).not.toMatch(/I promise|proper hour|gently/i);
    });
  });

  // ===========================================================================
  // loadChoiceState
  // ===========================================================================

  describe('loadChoiceState', () => {
    it('returns default empty state on first load', async () => {
      const state = await loadChoiceState();
      expect(state.offeredBy).toEqual([]);
      expect(state.choices).toEqual({});
      expect(state.hasSeenChoice).toBe(false);
    });

    it('returns cached state on subsequent calls', async () => {
      const state1 = await loadChoiceState();
      const state2 = await loadChoiceState();
      expect(state1).toBe(state2);
    });

    it('loads from storage after cache clear', async () => {
      await recordChoice('fox', 'ask');
      await clearChoiceState();

      const saved = {
        offeredBy: ['owl'],
        choices: { owl: 'refuse' },
        hasSeenChoice: true,
      };
      await AsyncStorage.setItem('wordshift_dialogue_choices', JSON.stringify(saved));

      const state = await loadChoiceState();
      expect(state.offeredBy).toContain('owl');
      expect(state.choices.owl).toBe('refuse');
    });
  });

  // ===========================================================================
  // getChoiceForAnimal
  // ===========================================================================

  describe('getChoiceForAnimal', () => {
    it('returns null for phase 0', async () => {
      const result = await getChoiceForAnimal('fox', 0, 5);
      expect(result).toBeNull();
    });

    it('returns null for phase 1', async () => {
      const result = await getChoiceForAnimal('fox', 1, 5);
      expect(result).toBeNull();
    });

    it('returns null for phase 2', async () => {
      const result = await getChoiceForAnimal('fox', 2, 5);
      expect(result).toBeNull();
    });

    it('returns choice content for phase 3', async () => {
      const result = await getChoiceForAnimal('fox', 3, inPhase3('fox'));
      expect(result).not.toBeNull();
      expect(result!.prompt).toBe(ANIMAL_CHOICES.fox.prompt);
    });

    it('keeps a non-lagging slow reader choice available during the reveal', async () => {
      const result = await getChoiceForAnimal('fox', 4, inPhase3('fox'));
      expect(result).toBe(ANIMAL_CHOICES.fox);
    });

    it('offers late recruits their choice even when recruitment skips the Phase-3 block', async () => {
      for (const animal of ['tarsier', 'aye_aye', 'kakapo'] as AnimalType[]) {
        const start = getPhaseStartIndex(animal, 4);
        expect(await getChoiceForAnimal(animal, 4, start)).toBe(ANIMAL_CHOICES[animal]);
        await recordChoice(animal, 'refuse');
        expect(await getChoiceForAnimal(animal, 4, start + 5)).toBeNull();
      }
    });

    it('never invents a missed choice after arrival', async () => {
      for (const animal of ALL_ANIMALS) {
        expect(await getChoiceForAnimal(animal, 5, getPhaseStartIndex(animal as AnimalType, 5))).toBeNull();
      }
    });

    it('returns null before the animal is a couple of lines into its Phase-3 block', async () => {
      const start = getPhaseStartIndex('fox', 3);
      for (let i = start - 3; i < start + 2; i++) {
        const result = await getChoiceForAnimal('fox', 3, i);
        expect(result).toBeNull();
      }
    });

    it('stays available across the whole Phase-3 block (a 5-line session steps in fives)', async () => {
      // getDialoguesPerSession(3) is 5, so session-start indices land on
      // start+0, +5, +10... A three-wide window is simply stepped over; the
      // band is the block, and offeredBy is what makes it once-per-animal.
      const start = getPhaseStartIndex('fox', 3);
      const end = getPhaseStartIndex('fox', 4);
      for (let i = start + 2; i < end; i += 5) {
        await clearChoiceState();
        const result = await getChoiceForAnimal('fox', 3, i);
        expect(result).not.toBeNull();
      }
    });

    it('returns null once the animal has read past its Phase-3 block', async () => {
      const result = await getChoiceForAnimal('fox', 3, getPhaseStartIndex('fox', 4));
      expect(result).toBeNull();
    });

    it('returns null if animal already offered choice', async () => {
      await recordChoice('fox', 'ask');
      const result = await getChoiceForAnimal('fox', 3, inPhase3('fox'));
      expect(result).toBeNull();
    });

    it('returns choice for different animal after one has offered', async () => {
      await recordChoice('fox', 'ask');
      const result = await getChoiceForAnimal('owl', 3, inPhase3('owl'));
      expect(result).not.toBeNull();
    });

    it('returns choice content for every animal', async () => {
      for (const animal of ALL_ANIMALS) {
        await clearChoiceState();
        // Lagging animals never resolve to animal-phase 3 (see below); they
        // read their Phase-3 block at animal-phase 4.
        const phase = ANIMAL_AWARENESS_TIERS[animal as AnimalType] === 'lagging' ? 4 : 3;
        const result = await getChoiceForAnimal(animal, phase, inPhase3(animal));
        expect(result).not.toBeNull();
        expect(result!.prompt).toBe(ANIMAL_CHOICES[animal].prompt);
      }
    });

    it('returns null for unknown animal', async () => {
      const result = await getChoiceForAnimal('unicorn', 3, 76);
      expect(result).toBeNull();
    });

    // =======================================================================
    // Reachability against the indices the game actually stores. The old
    // window ([4,6] absolute) could only be satisfied by an animal the player
    // had all but ignored, and never at all by one fast-forwarded on unlock.
    // =======================================================================
    describe('reachability from real stored indices', () => {
      it('offers the choice to a lagging animal, which never reaches animal-phase 3', async () => {
        // getAnimalPhase maps lagging: global 3 -> 2, global 4 -> 4. Their
        // Phase-3 lines are read at animal-phase 4.
        for (const animal of ALL_ANIMALS.filter(
          a => ANIMAL_AWARENESS_TIERS[a as AnimalType] === 'lagging'
        )) {
          await clearChoiceState();
          const result = await getChoiceForAnimal(animal, 4, inPhase3(animal));
          expect(result).not.toBeNull();
        }
      });

      it('reaches a late recruit fast-forwarded onto its Phase-3 start index', async () => {
        // fastForwardLateUnlockDialogue writes exactly getPhaseStartIndex(type, 3)
        // for an animal unlocked at global Phase 3 (the aye-aye, belfry gate 88).
        // Its first session (5 lines, or 7 with the catch-up boost) steps
        // straight over any narrow window; the next session start is inside
        // the band.
        const start = getPhaseStartIndex('aye_aye', 3);
        expect(await getChoiceForAnimal('aye_aye', 3, start)).toBeNull();
        expect(await getChoiceForAnimal('aye_aye', 3, start + 5)).not.toBeNull();
        await clearChoiceState();
        expect(await getChoiceForAnimal('aye_aye', 3, start + 7)).not.toBeNull();
      });

      it('never fires over an animal\'s bright-days lines', async () => {
        // The old window put the dread prompt on top of Phase-0 small talk.
        for (const animal of ALL_ANIMALS) {
          await clearChoiceState();
          expect(await getChoiceForAnimal(animal, 3, 5)).toBeNull();
        }
      });
    });
  });

  // ===========================================================================
  // recordChoice
  // ===========================================================================

  describe('recordChoice', () => {
    it('records an "ask" choice correctly', async () => {
      const result = await recordChoice('fox', 'ask');
      expect(result.response).toBe(ANIMAL_CHOICES.fox.responses.ask);
      expect(result.convergence).toBe(ANIMAL_CHOICES.fox.convergence);
    });

    it('records a "refuse" choice correctly', async () => {
      const result = await recordChoice('owl', 'refuse');
      expect(result.response).toBe(ANIMAL_CHOICES.owl.responses.refuse);
      expect(result.convergence).toBe(ANIMAL_CHOICES.owl.convergence);
    });

    it('marks animal as offered', async () => {
      await recordChoice('fox', 'ask');
      const state = await loadChoiceState();
      expect(state.offeredBy).toContain('fox');
    });

    it('stores the player choice', async () => {
      await recordChoice('pangolin', 'refuse');
      const state = await loadChoiceState();
      expect(state.choices.pangolin).toBe('refuse');
    });

    it('sets hasSeenChoice to true', async () => {
      await recordChoice('fox', 'ask');
      const state = await loadChoiceState();
      expect(state.hasSeenChoice).toBe(true);
    });

    it('persists to storage', async () => {
      await recordChoice('fox', 'ask');
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('can record choices for multiple animals', async () => {
      await recordChoice('fox', 'ask');
      await recordChoice('owl', 'refuse');
      await recordChoice('pangolin', 'ask');

      const state = await loadChoiceState();
      expect(state.offeredBy).toContain('fox');
      expect(state.offeredBy).toContain('owl');
      expect(state.offeredBy).toContain('pangolin');
      expect(state.choices.fox).toBe('ask');
      expect(state.choices.owl).toBe('refuse');
      expect(state.choices.pangolin).toBe('ask');
    });
  });

  // ===========================================================================
  // getPlayerChoice
  // ===========================================================================

  describe('getPlayerChoice', () => {
    it('returns null when no choice has been made', async () => {
      const choice = await getPlayerChoice('fox');
      expect(choice).toBeNull();
    });

    it('returns "ask" after ask choice', async () => {
      await recordChoice('fox', 'ask');
      const choice = await getPlayerChoice('fox');
      expect(choice).toBe('ask');
    });

    it('returns "refuse" after refuse choice', async () => {
      await recordChoice('owl', 'refuse');
      const choice = await getPlayerChoice('owl');
      expect(choice).toBe('refuse');
    });

    it('returns null for animal that has not been offered yet', async () => {
      await recordChoice('fox', 'ask');
      const choice = await getPlayerChoice('owl');
      expect(choice).toBeNull();
    });
  });

  // ===========================================================================
  // hasSeenAnyChoice
  // ===========================================================================

  describe('hasSeenAnyChoice', () => {
    it('returns false initially', async () => {
      expect(await hasSeenAnyChoice()).toBe(false);
    });

    it('returns true after any choice is made', async () => {
      await recordChoice('fox', 'ask');
      expect(await hasSeenAnyChoice()).toBe(true);
    });
  });

  // ===========================================================================
  // getChoiceCount
  // ===========================================================================

  describe('getChoiceCount', () => {
    it('returns 0 initially', async () => {
      expect(await getChoiceCount()).toBe(0);
    });

    it('increments with each choice', async () => {
      await recordChoice('fox', 'ask');
      expect(await getChoiceCount()).toBe(1);

      await recordChoice('owl', 'refuse');
      expect(await getChoiceCount()).toBe(2);

      await recordChoice('pangolin', 'ask');
      expect(await getChoiceCount()).toBe(3);
    });

    it('counts every animal after all have recorded a choice', async () => {
      for (const animal of ALL_ANIMALS) {
        await recordChoice(animal, 'ask');
      }
      expect(await getChoiceCount()).toBe(ALL_ANIMALS.length);
    });
  });

  // ===========================================================================
  // getPhase4ChoiceCallback
  // ===========================================================================

  describe('getPhase4ChoiceCallback', () => {
    it('returns null when choice is null', () => {
      expect(getPhase4ChoiceCallback('fox', null)).toBeNull();
    });

    it('returns ask callback for "ask" choice', () => {
      const callback = getPhase4ChoiceCallback('fox', 'ask');
      expect(callback).not.toBeNull();
      expect(typeof callback).toBe('string');
      expect(callback!.length).toBeGreaterThan(0);
    });

    it('returns refuse callback for "refuse" choice', () => {
      const callback = getPhase4ChoiceCallback('fox', 'refuse');
      expect(callback).not.toBeNull();
      expect(typeof callback).toBe('string');
    });

    it('ask and refuse callbacks are different', () => {
      for (const animal of ALL_ANIMALS) {
        const askCallback = getPhase4ChoiceCallback(animal, 'ask');
        const refuseCallback = getPhase4ChoiceCallback(animal, 'refuse');
        expect(askCallback).not.toBe(refuseCallback);
      }
    });

    it('has callbacks for every animal', () => {
      for (const animal of ALL_ANIMALS) {
        const askCallback = getPhase4ChoiceCallback(animal, 'ask');
        const refuseCallback = getPhase4ChoiceCallback(animal, 'refuse');
        expect(askCallback).not.toBeNull();
        expect(refuseCallback).not.toBeNull();
      }
    });

    it('returns null for unknown animal', () => {
      expect(getPhase4ChoiceCallback('unicorn', 'ask')).toBeNull();
    });

    it('fox answers the question about what she knew', () => {
      const callback = getPhase4ChoiceCallback('fox', 'ask');
      expect(callback).toMatch(/knew the words fed something/i);
      expect(callback).toMatch(/should have told you/i);
    });

    it('owl refuse callback references words/text', () => {
      const callback = getPhase4ChoiceCallback('owl', 'refuse');
      expect(callback).toContain('words');
    });
  });

  // ===========================================================================
  // clearChoiceState
  // ===========================================================================

  describe('clearChoiceState', () => {
    it('resets all choice data', async () => {
      await recordChoice('fox', 'ask');
      await recordChoice('owl', 'refuse');
      await clearChoiceState();

      const state = await loadChoiceState();
      expect(state.offeredBy).toEqual([]);
      expect(state.choices).toEqual({});
      expect(state.hasSeenChoice).toBe(false);
    });

    it('allows new choices after clear', async () => {
      await recordChoice('fox', 'ask');
      await clearChoiceState();

      const result = await getChoiceForAnimal('fox', 3, inPhase3('fox'));
      expect(result).not.toBeNull();
    });

    it('calls AsyncStorage.removeItem', async () => {
      await clearChoiceState();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('wordshift_dialogue_choices');
    });
  });
});

describe('getPhase5ChoiceCallback', () => {
  const allAnimals = ['fox', 'pangolin', 'owl', 'axolotl', 'capybara', 'fennec_fox', 'sloth', 'wombat', 'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo'];

  test('returns a serene callback for every animal and both choices', () => {
    for (const animal of allAnimals) {
      for (const choice of ['ask', 'refuse'] as const) {
        const text = getPhase5ChoiceCallback(animal, choice);
        expect(text).not.toBeNull();
        expect((text as string).length).toBeGreaterThan(10);
      }
    }
  });

  test('returns null when no choice was made', () => {
    expect(getPhase5ChoiceCallback('fox', null)).toBeNull();
  });

  test('ask and refuse produce different lines', () => {
    expect(getPhase5ChoiceCallback('owl', 'ask')).not.toBe(getPhase5ChoiceCallback('owl', 'refuse'));
  });
});
