import {
  getVariantDescription,
  getVariantInstruction,
  getVariantOverrides,
  getVariantSelectorOptions,
  getVariantUnlockHint,
  getVariantUnlockRequirement,
  getUnlockedVariants,
  getVariantModifiers,
  hasVariantModifier,
  isPuzzleVariant,
  isVariantUnlocked,
  isVariantCompleted,
  getVariantAmberMultiplier,
  getVariantTimeLimit,
  getVariantTimeLimitForDifficulty,
  isLetterAllowedByVariant,
  isVariantCompatibleWithSolution,
  getBlindUnlockHint,
  getComboDescription,
  getComboSelectorOptions,
  getComboUnlockHint,
  isComboUnlocked,
  COMBO_PRESETS,
  CHALLENGE_TOGGLE_UNLOCK_PUZZLES,
  BLIND_TOGGLE_UNLOCK_PUZZLES,
  VARIANT_CONFIGS,
  PuzzleVariant,
} from '../services/puzzleVariety';
import { DAILY_CHALLENGE_UNLOCK_PUZZLES } from '../constants/gameBalance';

describe('puzzleVariety', () => {
  describe('VARIANT_CONFIGS', () => {
    it('defines all variants', () => {
      const variants: PuzzleVariant[] = [
        'standard',
        'reverse',
        'speed',
        'double_shift',
      ];

      for (const variant of variants) {
        const config = VARIANT_CONFIGS[variant];
        expect(config).toBeDefined();
        expect(config.variant).toBe(variant);
        expect(config.title).toBeTruthy();
        expect(config.description).toBeTruthy();
        expect(config.darkDescription).toBeTruthy();
        expect(config.instruction).toBeTruthy();
        expect(config.darkInstruction).toBeTruthy();
        expect(typeof config.amberMultiplier).toBe('number');
      }
    });

    it('keeps speed timing metadata', () => {
      expect(VARIANT_CONFIGS.speed.timeLimit).toBe(60);
      expect(VARIANT_CONFIGS.speed.rowOverride).toBe(3);
    });
  });

  describe('unlock gates (the variant-pacing wave)', () => {
    it('spreads variant unlocks across the arc: reverse 10, double 25, speed 55', () => {
      expect(getVariantUnlockRequirement('reverse')?.puzzlesSolved).toBe(10);
      expect(getVariantUnlockRequirement('double_shift')?.puzzlesSolved).toBe(25);
      expect(getVariantUnlockRequirement('speed')?.puzzlesSolved).toBe(55);
    });

    it('keeps the reverse gate clear of the daily unlock (8) and the first-harvest gate (win 9)', () => {
      // The early one-time beats must not stack: daily unlock at 8, mandatory
      // first harvest at win 9, reverse intro at 10.
      expect(DAILY_CHALLENGE_UNLOCK_PUZZLES).toBe(8);
      expect(getVariantUnlockRequirement('reverse')!.puzzlesSolved).toBeGreaterThan(
        DAILY_CHALLENGE_UNLOCK_PUZZLES + 1
      );
    });

    it('gates the trial-ladder toggles at 15 (challenge) and 80 (blind apex)', () => {
      expect(CHALLENGE_TOGGLE_UNLOCK_PUZZLES).toBe(15);
      expect(BLIND_TOGGLE_UNLOCK_PUZZLES).toBe(80);
    });

    it('unlocks each variant exactly at its gate', () => {
      expect(isVariantUnlocked('double_shift', 24, 0)).toBe(false);
      expect(isVariantUnlocked('double_shift', 25, 0)).toBe(true);
      expect(isVariantUnlocked('speed', 54, 0)).toBe(false);
      expect(isVariantUnlocked('speed', 55, 0)).toBe(true);
    });
  });

  describe('combination presets', () => {
    it('defines the four combos in unlock order 55/70/90/105', () => {
      expect(COMBO_PRESETS.map(p => p.id)).toEqual([
        'twin_trial',
        'racing_shadows',
        'blind_return',
        'free_fall',
      ]);
      expect(COMBO_PRESETS.map(p => p.unlockPuzzles)).toEqual([55, 70, 90, 105]);
    });

    it('never gates a combo before any of its components', () => {
      for (const preset of COMBO_PRESETS) {
        const variantGate = getVariantUnlockRequirement(preset.variant)?.puzzlesSolved ?? 0;
        expect(preset.unlockPuzzles).toBeGreaterThanOrEqual(variantGate);
        if (preset.challenge) {
          expect(preset.unlockPuzzles).toBeGreaterThanOrEqual(CHALLENGE_TOGGLE_UNLOCK_PUZZLES);
        }
        if (preset.blind) {
          expect(preset.unlockPuzzles).toBeGreaterThanOrEqual(BLIND_TOGGLE_UNLOCK_PUZZLES);
        }
        // Exactly one trial rung per combo (blind runs under challenge rules
        // in the engine, so a blind preset never also sets challenge).
        expect(preset.challenge && preset.blind).toBe(false);
        expect(preset.challenge || preset.blind).toBe(true);
      }
    });

    it('only composes engine-supported variants', () => {
      for (const preset of COMBO_PRESETS) {
        expect(isPuzzleVariant(preset.variant)).toBe(true);
        expect(preset.variant).not.toBe('standard');
      }
    });

    it('unlocks each combo exactly at its own gate', () => {
      for (const preset of COMBO_PRESETS) {
        expect(isComboUnlocked(preset, preset.unlockPuzzles - 1, 0)).toBe(false);
        expect(isComboUnlocked(preset, preset.unlockPuzzles, 0)).toBe(true);
      }
    });

    it('builds combo selector options including locked entries with count teases', () => {
      const options = getComboSelectorOptions(60, 0, 0);
      expect(options).toHaveLength(COMBO_PRESETS.length);
      const twin = options.find(o => o.preset.id === 'twin_trial')!;
      expect(twin.unlocked).toBe(true);
      const racing = options.find(o => o.preset.id === 'racing_shadows')!;
      expect(racing.unlocked).toBe(false);
      expect(racing.unlockHint).toContain('10 more puzzle');
      const freeFall = options.find(o => o.preset.id === 'free_fall')!;
      expect(freeFall.unlocked).toBe(false);
      expect(freeFall.unlockHint).toContain('45 more puzzle');
    });

    it('switches combo descriptions and hints by phase register', () => {
      for (const preset of COMBO_PRESETS) {
        expect(getComboDescription(preset, 0)).toBe(preset.description);
        expect(getComboDescription(preset, 3)).toBe(preset.darkDescription);
        expect(getComboUnlockHint(preset, 0, 0, 3)).toContain('offering');
      }
    });
  });

  describe('blind toggle unlock hint', () => {
    it('teases with a countdown while locked and clears when earned', () => {
      const locked = getBlindUnlockHint(60, 0);
      expect(locked).toContain('20 more puzzle');
      expect(getBlindUnlockHint(60, 3)).toContain('20 more offering');
      expect(getBlindUnlockHint(80, 0)).toBe('Unlocked.');
    });
  });

  describe('player-facing copy hygiene', () => {
    it('contains no em dashes and never names phases', () => {
      const strings: string[] = [];
      for (const config of Object.values(VARIANT_CONFIGS)) {
        strings.push(config.title, config.description, config.darkDescription, config.instruction, config.darkInstruction);
      }
      for (const preset of COMBO_PRESETS) {
        strings.push(preset.title, preset.description, preset.darkDescription);
      }
      for (const variant of ['reverse', 'double_shift', 'speed'] as PuzzleVariant[]) {
        strings.push(getVariantUnlockHint(variant, 0, 0, 0));
        strings.push(getVariantUnlockHint(variant, 0, 0, 4));
      }
      for (const preset of COMBO_PRESETS) {
        strings.push(getComboUnlockHint(preset, 0, 0, 0));
        strings.push(getComboUnlockHint(preset, 0, 0, 4));
      }
      strings.push(getBlindUnlockHint(0, 0), getBlindUnlockHint(0, 4));
      for (const s of strings) {
        expect(s).not.toMatch(/[—–]/);
        expect(s).not.toMatch(/phase\s*\d/i);
      }
    });
  });

  describe('phase-aware copy helpers', () => {
    it('switches descriptions by phase', () => {
      expect(getVariantDescription(VARIANT_CONFIGS.reverse, 0)).toBe(VARIANT_CONFIGS.reverse.description);
      expect(getVariantDescription(VARIANT_CONFIGS.reverse, 3)).toBe(VARIANT_CONFIGS.reverse.darkDescription);
    });

    it('switches instructions by phase', () => {
      expect(getVariantInstruction(VARIANT_CONFIGS.speed, 1)).toBe(VARIANT_CONFIGS.speed.instruction);
      expect(getVariantInstruction(VARIANT_CONFIGS.speed, 4)).toBe(VARIANT_CONFIGS.speed.darkInstruction);
    });

    it('provides phase-aware instructions for every variant', () => {
      for (const config of Object.values(VARIANT_CONFIGS)) {
        expect(getVariantInstruction(config, 0).trim().length).toBeGreaterThan(0);
        expect(getVariantInstruction(config, 4).trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('variant mechanics helpers', () => {
    it('returns overrides for speed-like variants', () => {
      expect(getVariantOverrides('standard', 'MEDIUM')).toEqual({});
      expect(getVariantOverrides('speed', 'MEDIUM')).toEqual({ targetRows: 3 });
      expect(getVariantOverrides('speed', 'HARD')).toEqual({ targetRows: 4 });
    });

    it('returns valid overrides for every variant/difficulty pair', () => {
      const difficulties = ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'] as const;
      for (const variant of Object.keys(VARIANT_CONFIGS) as PuzzleVariant[]) {
        for (const difficulty of difficulties) {
          const overrides = getVariantOverrides(variant, difficulty);
          if (overrides.targetRows !== undefined) {
            expect(overrides.targetRows).toBeGreaterThanOrEqual(3);
            expect(overrides.targetRows).toBeLessThanOrEqual(6); // HARD double_shift uses 6 rows
          }
          if (overrides.wordLength !== undefined) {
            expect(overrides.wordLength).toBeGreaterThanOrEqual(4);
            expect(overrides.wordLength).toBeLessThanOrEqual(6);
          }
        }
      }
    });

    it('resolves modifiers and modifier checks', () => {
      expect(getVariantModifiers('standard')).toEqual([]);
      expect(getVariantModifiers('reverse')).toEqual(['reverse']);
      expect(getVariantModifiers('double_shift')).toEqual(['double_shift']);
      expect(hasVariantModifier('reverse', 'reverse')).toBe(true);
      expect(hasVariantModifier('reverse', 'speed')).toBe(false);
    });

    it('applies completion constraints for speed variants only', () => {
      expect(isVariantCompleted('reverse', 999)).toBe(true);
      expect(isVariantCompleted('speed', 60)).toBe(true);
      expect(isVariantCompleted('speed', 61)).toBe(false);
    });

    it('returns explicit time limits for speed variants', () => {
      expect(getVariantTimeLimit('speed')).toBe(60);
      expect(getVariantTimeLimit('reverse')).toBeNull();
    });

    it('returns difficulty-aware time limits for speed variants', () => {
      expect(getVariantTimeLimitForDifficulty('speed', 'EASY')).toBe(65);
      expect(getVariantTimeLimitForDifficulty('speed', 'MEDIUM')).toBe(60);
      expect(getVariantTimeLimitForDifficulty('reverse', 'HARD')).toBeNull();
    });

    it('exposes unlock requirements and unlocked checks', () => {
      expect(getVariantUnlockRequirement('standard')).toBeNull();
      // Reverse unlocks at 10 puzzles
      expect(getVariantUnlockRequirement('reverse')?.puzzlesSolved).toBe(10);
      expect(isVariantUnlocked('reverse', 0, 0)).toBe(false);
      expect(isVariantUnlocked('reverse', 9, 0)).toBe(false);
      expect(isVariantUnlocked('reverse', 10, 0)).toBe(true);
    });

    it('returns unlocked variants list with standard first', () => {
      // With 0 puzzles, only standard is unlocked
      const early = getUnlockedVariants(0, 0);
      expect(early).toContain('standard');
      expect(early).not.toContain('reverse');

      // With 100 puzzles, all variants are unlocked (reverse=10, double_shift=25, speed=55)
      const mid = getUnlockedVariants(100, 0);
      expect(mid).toContain('standard');
      expect(mid).toContain('reverse');
      expect(mid).toContain('speed');
      expect(mid).toContain('double_shift');
    });

    it('builds selector options that INCLUDE locked variants as teased rows', () => {
      // With 100 puzzles, all variants are unlocked
      const allUnlocked = getVariantSelectorOptions(100, 0, 0);
      expect(allUnlocked.every(o => o.unlocked)).toBe(true);
      expect(allUnlocked.map(o => o.variant)).toContain('standard');
      expect(allUnlocked.map(o => o.variant)).toContain('reverse');
      expect(allUnlocked.map(o => o.variant)).toContain('double_shift');
      expect(allUnlocked.map(o => o.variant)).toContain('speed');

      // With 10 puzzles, double_shift and speed are visible but locked, each
      // carrying a countdown tease (the player always sees the next goal).
      const early = getVariantSelectorOptions(10, 0, 0);
      expect(early.map(o => o.variant)).toEqual(['standard', 'reverse', 'double_shift', 'speed']);
      const doubleRow = early.find(o => o.variant === 'double_shift')!;
      expect(doubleRow.unlocked).toBe(false);
      expect(doubleRow.unlockHint).toContain('15 more puzzle');
      const speedRow = early.find(o => o.variant === 'speed')!;
      expect(speedRow.unlocked).toBe(false);
      expect(speedRow.unlockHint).toContain('45 more puzzle');
      expect(early.find(o => o.variant === 'reverse')!.unlocked).toBe(true);
    });

    it('validates known variant keys', () => {
      expect(isPuzzleVariant('reverse')).toBe(true);
      expect(isPuzzleVariant('made_up_variant')).toBe(false);
      expect(isPuzzleVariant('blind')).toBe(false);
      expect(isPuzzleVariant('no_vowel')).toBe(false);
    });

    it('uses tone-aware unlock hints', () => {
      // With thresholds at 0, all variants are already unlocked, so hints say "Unlocked."
      const light = getVariantUnlockHint('speed', 50, 0, 1);
      expect(typeof light).toBe('string');
    });

    it('allows all letters for all variants (no restriction modes)', () => {
      expect(isLetterAllowedByVariant('standard', 'A')).toBe(true);
      expect(isLetterAllowedByVariant('reverse', 'B')).toBe(true);
      expect(isLetterAllowedByVariant('speed', 'E')).toBe(true);
      expect(isLetterAllowedByVariant('double_shift', 'T')).toBe(true);
    });

    it('checks generated solution compatibility', () => {
      const mixedSolution = [{ letterToMove: 'A' }, { letterToMove: 'T' }] as any;
      expect(isVariantCompatibleWithSolution('reverse', mixedSolution)).toBe(true);
      expect(isVariantCompatibleWithSolution('reverse')).toBe(true);
    });
  });

  describe('amber multipliers', () => {
    it('returns configured multipliers', () => {
      expect(getVariantAmberMultiplier('standard')).toBe(1.0);
      expect(getVariantAmberMultiplier('reverse')).toBe(1.22);
      expect(getVariantAmberMultiplier('speed')).toBe(1.34);
      expect(getVariantAmberMultiplier('double_shift')).toBe(1.65);
    });

    it('falls back to 1.0 for unknown variants', () => {
      expect(getVariantAmberMultiplier('unknown_variant' as PuzzleVariant)).toBe(1.0);
    });
  });
});
