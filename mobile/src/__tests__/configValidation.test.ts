import {
  validateDialogueIntegrity,
  validatePhaseThresholds,
  validateAchievements,
  validateUnlockProgression,
  runAllValidations,
  ValidationResult,
} from '../services/configValidation';

// Mock react-native (required by transitive imports like deviceTier)
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
  PixelRatio: { get: () => 3 },
}));

// AsyncStorage is globally mapped via jest.config.js moduleNameMapper,
// but some transitive imports may still try to use it. Provide a safe mock.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => {}),
    removeItem: jest.fn(async () => {}),
    multiRemove: jest.fn(async () => {}),
    clear: jest.fn(async () => {}),
  },
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function expectValid(result: ValidationResult) {
  // Surface every error message so failures are easy to diagnose
  expect(result.errors).toEqual([]);
  expect(result.valid).toBe(true);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Configuration Validation', () => {
  describe('validateDialogueIntegrity', () => {
    test('all animals have correct dialogue counts across phases', () => {
      const result = validateDialogueIntegrity();
      expectValid(result);
    });

    test('phase-2 exhaustion pool has exactly 10 extra lines for each of the 13 animals', () => {
      // The pool lives OUTSIDE the indexed base arrays so growing it never
      // shifts lastDialogueRead indices (resizing the BASE blocks requires a
      // dataMigration — see v4, which remapped indices for the 2x expansion).
      const { PHASE2_EXTRA_DIALOGUES } = require('../services/dialogue/animalDialogueBase');
      expect(Object.keys(PHASE2_EXTRA_DIALOGUES)).toHaveLength(13);
      for (const lines of Object.values(PHASE2_EXTRA_DIALOGUES) as string[][]) {
        expect(lines).toHaveLength(10);
      }
    });
  });

  /**
   * The welcome is delivered TWICE by construction: INTRO_DIALOGUES plays once
   * at unlock (from the unlock flow), and the animal's phase-0 base block is
   * served immediately afterwards by the dialogue flow, in full, for every
   * animal met before the phase-2 fast-forward engages. The two blocks are
   * therefore one continuous first conversation, and the contract is that the
   * INTRO owns each fact while the base line ADVANCES from it. These guards
   * pin the two failure modes an editor can reintroduce without noticing:
   * a sentence copied verbatim between the blocks, and a base line that
   * re-introduces a speaker the intro has already named.
   */
  describe('the welcome never introduces an animal twice', () => {
    const {
      getDialoguesForAnimal,
    } = require('../services/dialogue/animalDialogueBase');
    const { INTRO_DIALOGUES } = require('../services/dialogue/animalDialogueIntro');

    const ANIMALS = Object.keys(INTRO_DIALOGUES);
    const DISPLAY_NAMES = [
      'Ember', 'Panko', 'Archimedes', 'Axel', 'Sloane', 'Fennick', 'Chill',
      'Warren', 'Thyme', 'Bamboo', 'Vesper', 'Tock', 'Moss',
    ];

    /** Sentences long enough that a shared one is a copy, not a coincidence. */
    const sentences = (text: string): string[] =>
      text
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 18);

    const phaseZeroLines = (animal: string): { id: string; text: string }[] =>
      getDialoguesForAnimal(animal, 0).map((d: { id: string; text: string }) => ({
        id: d.id,
        text: d.text,
      }));

    test('no phase-0 line repeats a sentence from the same animal intro', () => {
      const offenders: string[] = [];
      for (const animal of ANIMALS) {
        const introSentences = new Set<string>();
        for (const line of INTRO_DIALOGUES[animal] as string[]) {
          for (const s of sentences(line)) introSentences.add(s);
        }
        for (const { id, text } of phaseZeroLines(animal)) {
          for (const s of sentences(text)) {
            if (introSentences.has(s)) {
              offenders.push(`${id} repeats the intro verbatim: ${s.slice(0, 70)}`);
            }
          }
        }
      }
      expect(offenders).toEqual([]);
    });

    test('no phase-0 line re-introduces its speaker by name', () => {
      // The intro already said the name. A second "I'm <name>" one conversation
      // later reads as the animal forgetting it has met the player.
      const reIntroduces = new RegExp(
        `\\b(?:I'm|I am|My name is|Name's)\\s+(?:${DISPLAY_NAMES.join('|')})\\b`
      );
      const offenders: string[] = [];
      for (const animal of ANIMALS) {
        for (const { id, text } of phaseZeroLines(animal)) {
          if (reIntroduces.test(text)) offenders.push(`${id}: ${text.slice(0, 70)}`);
        }
      }
      expect(offenders).toEqual([]);
    });

    test("Ember's intro keeps the kettle and cup canon", () => {
      // Canon: the kettle is Ember's own and she carried it in (fx_0_21 and
      // ONBOARDING_FOX_LINES.fox_invited), and she bought the second cup on an
      // optimistic shopping trip (fx_0_19). The intro used to contradict both.
      const intro = (INTRO_DIALOGUES.fox as string[]).join(' ');
      expect(intro).not.toMatch(/inherited/i);
      expect(intro).not.toMatch(/left .{0,30}kettle|kettle .{0,30}behind/i);
    });
  });

  describe('validatePhaseThresholds', () => {
    test('phase thresholds are properly configured', () => {
      const result = validatePhaseThresholds();
      expectValid(result);
    });
  });

  describe('validateAchievements', () => {
    test('achievement definitions are valid', () => {
      const result = validateAchievements();
      expectValid(result);
    });
  });

  describe('validateUnlockProgression', () => {
    test('unlock progression covers all rooms and animals', () => {
      const result = validateUnlockProgression();
      expectValid(result);
    });
  });

  describe('runAllValidations', () => {
    test('all configuration validations pass', () => {
      const result = runAllValidations();
      expectValid(result);
    });
  });
});
