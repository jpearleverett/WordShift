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

// Mock MMKV storage using shared factory
jest.mock('../services/storage', () =>
  require('./helpers/mockStorage').createMockStorage()
);

const { storage } = require('../services/storage') as {
  storage: {
    getString: jest.Mock;
    set: jest.Mock;
    remove: jest.Mock;
    clearAll: jest.Mock;
    getAllKeys: jest.Mock;
    contains: jest.Mock;
  };
};

const ALL_ANIMALS = [
  'fox', 'owl', 'pangolin', 'axolotl', 'capybara',
  'fennec_fox', 'sloth', 'wombat', 'rabbit', 'red_panda',
];

describe('dialogueChoices', () => {
  beforeEach(() => {
    storage.clearAll();
    clearChoiceState();
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
    it('returns default empty state on first load', () => {
      const state = loadChoiceState();
      expect(state.offeredBy).toEqual([]);
      expect(state.choices).toEqual({});
      expect(state.hasSeenChoice).toBe(false);
    });

    it('returns cached state on subsequent calls', () => {
      const state1 = loadChoiceState();
      const state2 = loadChoiceState();
      // Both calls return the same shape (MMKV reads from the same store)
      expect(state1).toEqual(state2);
    });

    it('loads from storage after cache clear', () => {
      recordChoice('fox', 'ask');
      clearChoiceState();

      const saved = {
        offeredBy: ['owl'],
        choices: { owl: 'refuse' },
        hasSeenChoice: true,
      };
      storage.set('wordshift_dialogue_choices', JSON.stringify(saved));

      const state = loadChoiceState();
      expect(state.offeredBy).toContain('owl');
      expect(state.choices.owl).toBe('refuse');
    });
  });

  // ===========================================================================
  // getChoiceForAnimal
  // ===========================================================================

  describe('getChoiceForAnimal', () => {
    it('returns null for phase 0', () => {
      const result = getChoiceForAnimal('fox', 0, 5);
      expect(result).toBeNull();
    });

    it('returns null for phase 1', () => {
      const result = getChoiceForAnimal('fox', 1, 5);
      expect(result).toBeNull();
    });

    it('returns null for phase 2', () => {
      const result = getChoiceForAnimal('fox', 2, 5);
      expect(result).toBeNull();
    });

    it('returns choice content for phase 3', () => {
      const result = getChoiceForAnimal('fox', 3, 5);
      expect(result).not.toBeNull();
      expect(result!.prompt).toBe(ANIMAL_CHOICES.fox.prompt);
    });

    it('returns null for phase 4', () => {
      const result = getChoiceForAnimal('fox', 4, 5);
      expect(result).toBeNull();
    });

    it('returns null for dialogueIndex < 4', () => {
      for (let i = 0; i < 4; i++) {
        const result = getChoiceForAnimal('fox', 3, i);
        expect(result).toBeNull();
      }
    });

    it('returns choice for dialogueIndex 4-6', () => {
      for (let i = 4; i <= 6; i++) {
        clearChoiceState();
        const result = getChoiceForAnimal('fox', 3, i);
        expect(result).not.toBeNull();
      }
    });

    it('returns null for dialogueIndex > 6', () => {
      const result = getChoiceForAnimal('fox', 3, 7);
      expect(result).toBeNull();
    });

    it('returns null if animal already offered choice', () => {
      recordChoice('fox', 'ask');
      const result = getChoiceForAnimal('fox', 3, 5);
      expect(result).toBeNull();
    });

    it('returns choice for different animal after one has offered', () => {
      recordChoice('fox', 'ask');
      const result = getChoiceForAnimal('owl', 3, 5);
      expect(result).not.toBeNull();
    });

    it('returns choice content for all 10 animals', () => {
      for (const animal of ALL_ANIMALS) {
        clearChoiceState();
        const result = getChoiceForAnimal(animal, 3, 5);
        expect(result).not.toBeNull();
        expect(result!.prompt).toBe(ANIMAL_CHOICES[animal].prompt);
      }
    });

    it('returns null for unknown animal', () => {
      const result = getChoiceForAnimal('unicorn', 3, 5);
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // recordChoice
  // ===========================================================================

  describe('recordChoice', () => {
    it('records an "ask" choice correctly', () => {
      const result = recordChoice('fox', 'ask');
      expect(result.response).toBe(ANIMAL_CHOICES.fox.responses.ask);
      expect(result.convergence).toBe(ANIMAL_CHOICES.fox.convergence);
    });

    it('records a "refuse" choice correctly', () => {
      const result = recordChoice('owl', 'refuse');
      expect(result.response).toBe(ANIMAL_CHOICES.owl.responses.refuse);
      expect(result.convergence).toBe(ANIMAL_CHOICES.owl.convergence);
    });

    it('marks animal as offered', () => {
      recordChoice('fox', 'ask');
      const state = loadChoiceState();
      expect(state.offeredBy).toContain('fox');
    });

    it('stores the player choice', () => {
      recordChoice('pangolin', 'refuse');
      const state = loadChoiceState();
      expect(state.choices.pangolin).toBe('refuse');
    });

    it('sets hasSeenChoice to true', () => {
      recordChoice('fox', 'ask');
      const state = loadChoiceState();
      expect(state.hasSeenChoice).toBe(true);
    });

    it('persists to storage', () => {
      recordChoice('fox', 'ask');
      expect(storage.set).toHaveBeenCalled();
    });

    it('can record choices for multiple animals', () => {
      recordChoice('fox', 'ask');
      recordChoice('owl', 'refuse');
      recordChoice('pangolin', 'ask');

      const state = loadChoiceState();
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
    it('returns null when no choice has been made', () => {
      const choice = getPlayerChoice('fox');
      expect(choice).toBeNull();
    });

    it('returns "ask" after ask choice', () => {
      recordChoice('fox', 'ask');
      const choice = getPlayerChoice('fox');
      expect(choice).toBe('ask');
    });

    it('returns "refuse" after refuse choice', () => {
      recordChoice('owl', 'refuse');
      const choice = getPlayerChoice('owl');
      expect(choice).toBe('refuse');
    });

    it('returns null for animal that has not been offered yet', () => {
      recordChoice('fox', 'ask');
      const choice = getPlayerChoice('owl');
      expect(choice).toBeNull();
    });
  });

  // ===========================================================================
  // hasSeenAnyChoice
  // ===========================================================================

  describe('hasSeenAnyChoice', () => {
    it('returns false initially', () => {
      expect(hasSeenAnyChoice()).toBe(false);
    });

    it('returns true after any choice is made', () => {
      recordChoice('fox', 'ask');
      expect(hasSeenAnyChoice()).toBe(true);
    });
  });

  // ===========================================================================
  // getChoiceCount
  // ===========================================================================

  describe('getChoiceCount', () => {
    it('returns 0 initially', () => {
      expect(getChoiceCount()).toBe(0);
    });

    it('increments with each choice', () => {
      recordChoice('fox', 'ask');
      expect(getChoiceCount()).toBe(1);

      recordChoice('owl', 'refuse');
      expect(getChoiceCount()).toBe(2);

      recordChoice('pangolin', 'ask');
      expect(getChoiceCount()).toBe(3);
    });

    it('counts up to 10 for all animals', () => {
      for (const animal of ALL_ANIMALS) {
        recordChoice(animal, 'ask');
      }
      expect(getChoiceCount()).toBe(10);
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
    it('resets all choice data', () => {
      recordChoice('fox', 'ask');
      recordChoice('owl', 'refuse');
      clearChoiceState();

      const state = loadChoiceState();
      expect(state.offeredBy).toEqual([]);
      expect(state.choices).toEqual({});
      expect(state.hasSeenChoice).toBe(false);
    });

    it('allows new choices after clear', () => {
      recordChoice('fox', 'ask');
      clearChoiceState();

      const result = getChoiceForAnimal('fox', 3, 5);
      expect(result).not.toBeNull();
    });

    it('calls storage.remove', () => {
      clearChoiceState();
      expect(storage.remove).toHaveBeenCalledWith('wordshift_dialogue_choices');
    });
  });
});
