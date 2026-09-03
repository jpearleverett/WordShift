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
type ChoiceAnchorContract = {
  prompt: RegExp;
  askOption: RegExp;
  askResponse: RegExp;
  refuseOption: RegExp;
  refuseResponse: RegExp;
};

const REMEMBERED_CHOICE_ANCHORS: Record<string, ChoiceAnchorContract> = {
  fox: {
    prompt: /\bfire\b/i,
    askOption: /\barrangement\b/i,
    askResponse: /\b(?:fire|flame|hearth)\b/i,
    refuseOption: /\b(?:don't|do not|rather not)\b.*\bknow\b/i,
    refuseResponse: /\b(?:fire|flame|coal|ash)\b/i,
  },
  owl: {
    prompt: /\b(?:book|text|line)\b/i,
    askOption: /\b(?:text|book|read)\b/i,
    askResponse: /\b(?:text|passage|read|line)\b/i,
    refuseOption: /\b(?:book|read)\b/i,
    refuseResponse: /\b(?:book|read|omission)\w*\b/i,
  },
  pangolin: {
    prompt: /\b(?:dish|kitchen|recipe)\b/i,
    askOption: /\brecipe\b/i,
    askResponse: /\b(?:recipe|dish|meal|kitchen)\b/i,
    refuseOption: /\b(?:don't|do not|rather not)\b.*\bknow\b/i,
    refuseResponse: /\b(?:dish|kitchen|meal|cook\w*|recipe|covered)\b/i,
  },
  axolotl: {
    prompt: /\bwater\b/i,
    askOption: /\b(?:water|below|deep|swim\w*)\b/i,
    askResponse: /\b(?:water|reflection|deep|glass)\b/i,
    refuseOption: /\b(?:won't|will not|don't|do not)\b.*\blook\b/i,
    refuseResponse: /\b(?:look|eyes?|water|deep|glass)\b/i,
  },
  capybara: {
    prompt: /\b(?:file|folder|data)\b/i,
    askOption: /(?=.*\bdata\b)(?=.*\bmy file\b)/i,
    askResponse: /\b(?:data|file)\b/i,
    refuseOption: /\b(?:won't|will not|don't|do not|decline)\b.*\bread\b/i,
    refuseResponse: /\b(?:file|read|data)\b/i,
  },
  fennec_fox: {
    prompt: /\b(?:ears?|hear|listen|sound)\b/i,
    askOption: /\b(?:hear|listen)\b/i,
    askResponse: /\b(?:frequency|sound|note)\b/i,
    refuseOption: /\bI (?:don't|do not|would rather not)\b.*\b(?:listen|hear)\b/i,
    refuseResponse: /\b(?:hear|listen|sound|note|ears?)\b/i,
  },
  sloth: {
    prompt: /\b(?:eyes?|watch|time|long)\b/i,
    askOption: /(?=.*\bhow long\b)(?=.*\bknown\b)/i,
    askResponse: /\b(?:time|long|watch\w*|known)\b/i,
    refuseOption: /\bsleep\b/i,
    refuseResponse: /\b(?:sleep|rest|observation|wait)\w*\b/i,
  },
  wombat: {
    prompt: /\b(?:tunnel|stone|foundation)\b/i,
    askOption: /(?=.*\btunnel\b)(?=.*\b(?:lead|below|where)\b)/i,
    askResponse: /\b(?:chamber|tunnel|below|foundation)\b/i,
    refuseOption: /\b(?:don't.*look|do not.*look|rather not.*look)\b/i,
    refuseResponse: /\b(?:tunnel|foundation|below|stone)\b/i,
  },
  rabbit: {
    prompt: /\b(?:path|road|map|fear|afraid)\w*\b/i,
    askOption: /\b(?:fear|afraid|scared)\b/i,
    askResponse: /(?=.*\b(?:fear|afraid|scared)\b)(?=.*\b(?:path|road|route)\w*\b)/i,
    refuseOption: /(?=.*\bfear\b)(?=.*\bprivate\b)/i,
    refuseResponse: /\b(?:fear|afraid|scared)\b/i,
  },
  red_panda: {
    prompt: /\b(?:pattern|arrangement|peace)\b/i,
    askOption: /(?=.*\barrangement\b)(?=.*\bpeace\b)/i,
    askResponse: /(?=.*\bpattern\b)(?=.*\bpeace\b)/i,
    refuseOption: /\b(?:outside.*(?:pattern|arrangement)|not.*part)\b/i,
    refuseResponse: /\b(?:pattern|arrangement|peace)\b/i,
  },
  tarsier: {
    prompt: /\b(?:eyes?|watch|road)\w*\b/i,
    askOption: /(?=.*\beyes?\b)(?=.*\bhold\w*\b)(?=.*\bopen\b)/i,
    askResponse: /\b(?:road|watch|eyes?)\w*\b/i,
    refuseOption: /\b(?:keep.*(?:night|telling).*yourself|don't.*tell|spare)\b/i,
    refuseResponse: /\b(?:eyes?|watch|tell|ridge|night)\w*\b/i,
  },
  aye_aye: {
    prompt: /\b(?:finger|bell|bronze)\b/i,
    askOption: /(?=.*\bbell\b)(?=.*\bsay\b)/i,
    askResponse: /\b(?:bell|bronze|word|note)\b/i,
    refuseOption: /(?=.*\bfinger\b)(?=.*\b(?:away|fold|put)\b)/i,
    refuseResponse: /\b(?:finger|bell|bronze|word|quiet)\w*\b/i,
  },
  kakapo: {
    prompt: /\b(?:root|soil|garden|bed)\w*\b/i,
    askOption: /\barrangement\b/i,
    askResponse: /\b(?:mast|season|root|arrangement)\w*\b/i,
    refuseOption: /\b(?:rather not|don't|do not)\b.*\bknow\b/i,
    refuseResponse: /\b(?:seed|season)\w*\b/i,
  },
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

    it('keeps every remembered-choice callback truthful through explicit semantic anchors', () => {
      const failures: string[] = [];

      for (const animal of ALL_ANIMALS) {
        const choice = ANIMAL_CHOICES[animal];
        const contract = REMEMBERED_CHOICE_ANCHORS[animal];
        const fields: Record<keyof ChoiceAnchorContract, string> = {
          prompt: choice.prompt,
          askOption: choice.options.ask,
          askResponse: choice.responses.ask,
          refuseOption: choice.options.refuse,
          refuseResponse: choice.responses.refuse,
        };

        for (const [field, pattern] of Object.entries(contract)) {
          if (!pattern.test(fields[field as keyof ChoiceAnchorContract])) {
            failures.push(`${animal}.${field}: ${fields[field as keyof ChoiceAnchorContract]}`);
          }
        }
      }

      expect(failures).toEqual([]);
    });

    it('has Moss promise the gentle seed-season outcome recalled by both later callbacks', () => {
      const mossRefusal = [
        ANIMAL_CHOICES.kakapo.options.refuse,
        ANIMAL_CHOICES.kakapo.responses.refuse,
        ANIMAL_CHOICES.kakapo.convergence,
      ].join(' ');

      expect(mossRefusal).toMatch(/\bI promise\b/i);
      expect(mossRefusal).toMatch(/\bseed\b/i);
      expect(mossRefusal).toMatch(/\bseason\b/i);
      expect(mossRefusal).toMatch(/\bgently\b/i);
      expect(mossRefusal).toMatch(/\bproper hour\b/i);
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

    it('returns null for phase 4 for a non-lagging animal', async () => {
      // Fox has had its own animal-phase 3; at 4 the moment has passed.
      const result = await getChoiceForAnimal('fox', 4, inPhase3('fox'));
      expect(result).toBeNull();
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

    it('fox ask callback references fire/arrangement', () => {
      const callback = getPhase4ChoiceCallback('fox', 'ask');
      expect(callback).toContain('fire');
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
