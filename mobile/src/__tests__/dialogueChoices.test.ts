import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadChoiceState,
  getChoiceForAnimal,
  recordChoice,
  getPlayerChoice,
  hasSeenAnyChoice,
  getChoiceCount,
  getPhase4ChoiceCallback,
  clearChoiceState,
  ANIMAL_CHOICES,
  PlayerChoice,
} from '../services/dialogueChoices';

// Mock AsyncStorage using shared factory
jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

const ALL_ANIMALS = [
  'fox', 'owl', 'pangolin', 'axolotl', 'capybara',
  'fennec_fox', 'sloth', 'wombat', 'rabbit', 'red_panda',
];

describe('dialogueChoices', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearChoiceState();
  });

  // ===========================================================================
  // ANIMAL_CHOICES content
  // ===========================================================================

  describe('ANIMAL_CHOICES', () => {
    it('has choice content for all 10 animals', () => {
      for (const animal of ALL_ANIMALS) {
        expect(ANIMAL_CHOICES[animal]).toBeDefined();
      }
    });

    it('each choice has prompt, options, responses, and convergence', () => {
      for (const animal of ALL_ANIMALS) {
        const choice = ANIMAL_CHOICES[animal];
        expect(choice.prompt).toBeDefined();
        expect(typeof choice.prompt).toBe('string');
        expect(choice.options.ask).toBeDefined();
        expect(choice.options.refuse).toBeDefined();
        expect(choice.responses.ask).toBeDefined();
        expect(choice.responses.refuse).toBeDefined();
        expect(choice.convergence).toBeDefined();
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
      const result = await getChoiceForAnimal('fox', 3, 5);
      expect(result).not.toBeNull();
      expect(result!.prompt).toBe(ANIMAL_CHOICES.fox.prompt);
    });

    it('returns null for phase 4', async () => {
      const result = await getChoiceForAnimal('fox', 4, 5);
      expect(result).toBeNull();
    });

    it('returns null for dialogueIndex < 4', async () => {
      for (let i = 0; i < 4; i++) {
        const result = await getChoiceForAnimal('fox', 3, i);
        expect(result).toBeNull();
      }
    });

    it('returns choice for dialogueIndex 4-6', async () => {
      for (let i = 4; i <= 6; i++) {
        await clearChoiceState();
        const result = await getChoiceForAnimal('fox', 3, i);
        expect(result).not.toBeNull();
      }
    });

    it('returns null for dialogueIndex > 6', async () => {
      const result = await getChoiceForAnimal('fox', 3, 7);
      expect(result).toBeNull();
    });

    it('returns null if animal already offered choice', async () => {
      await recordChoice('fox', 'ask');
      const result = await getChoiceForAnimal('fox', 3, 5);
      expect(result).toBeNull();
    });

    it('returns choice for different animal after one has offered', async () => {
      await recordChoice('fox', 'ask');
      const result = await getChoiceForAnimal('owl', 3, 5);
      expect(result).not.toBeNull();
    });

    it('returns choice content for all 10 animals', async () => {
      for (const animal of ALL_ANIMALS) {
        await clearChoiceState();
        const result = await getChoiceForAnimal(animal, 3, 5);
        expect(result).not.toBeNull();
        expect(result!.prompt).toBe(ANIMAL_CHOICES[animal].prompt);
      }
    });

    it('returns null for unknown animal', async () => {
      const result = await getChoiceForAnimal('unicorn', 3, 5);
      expect(result).toBeNull();
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

    it('counts up to 10 for all animals', async () => {
      for (const animal of ALL_ANIMALS) {
        await recordChoice(animal, 'ask');
      }
      expect(await getChoiceCount()).toBe(10);
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

    it('has callbacks for all 10 animals', () => {
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

      const result = await getChoiceForAnimal('fox', 3, 5);
      expect(result).not.toBeNull();
    });

    it('calls AsyncStorage.removeItem', async () => {
      await clearChoiceState();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('wordshift_dialogue_choices');
    });
  });
});
