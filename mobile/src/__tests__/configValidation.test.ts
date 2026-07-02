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

    test('phase-2 exhaustion pool has exactly 5 extra lines for each of the 10 animals', () => {
      // The pool lives OUTSIDE the indexed base arrays (base counts stay
      // 12/14/11/15/15) so existing lastDialogueRead indices are never shifted.
      const { PHASE2_EXTRA_DIALOGUES } = require('../services/dialogue/animalDialogueBase');
      expect(Object.keys(PHASE2_EXTRA_DIALOGUES)).toHaveLength(10);
      for (const lines of Object.values(PHASE2_EXTRA_DIALOGUES) as string[][]) {
        expect(lines).toHaveLength(5);
      }
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
