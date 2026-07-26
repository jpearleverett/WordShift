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
  getVariantAmberMultiplier,
  isLetterAllowedByVariant,
  isVariantCompatibleWithSolution,
  getBlindUnlockHint,
  CHALLENGE_TOGGLE_UNLOCK_PUZZLES,
  BLIND_TOGGLE_UNLOCK_PUZZLES,
  VARIANT_CONFIGS,
  PuzzleVariant,
} from '../services/puzzleVariety';
import { getSpeedTimeLimit, getSpeedUnlockHint, SPEED_TOGGLE_UNLOCK_PUZZLES } from '../services/puzzleVariety';
import { DAILY_CHALLENGE_UNLOCK_PUZZLES, SPEED_TIME_LIMITS } from '../constants/gameBalance';

describe('puzzleVariety', () => {
  describe('VARIANT_CONFIGS', () => {
    it('defines all variants', () => {
      // Speed is deliberately absent: it is a MODIFIER (a clock over any
      // style), not a style of its own.
      const variants: PuzzleVariant[] = [
        'standard',
        'reverse',
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

    it('has no speed entry (speed is a modifier, not a style)', () => {
      expect(Object.keys(VARIANT_CONFIGS)).not.toContain('speed');
      expect(isPuzzleVariant('speed')).toBe(false);
    });
  });

  describe('unlock gates (the variant-pacing wave)', () => {
    it('spreads style unlocks across the arc: reverse 10, double 25', () => {
      expect(getVariantUnlockRequirement('reverse')?.puzzlesSolved).toBe(10);
      expect(getVariantUnlockRequirement('double_shift')?.puzzlesSolved).toBe(25);
    });

    it('keeps the modifier ladder strictly increasing: challenge 15, speed 55, blind 80', () => {
      expect(CHALLENGE_TOGGLE_UNLOCK_PUZZLES).toBeLessThan(SPEED_TOGGLE_UNLOCK_PUZZLES);
      expect(SPEED_TOGGLE_UNLOCK_PUZZLES).toBeLessThan(BLIND_TOGGLE_UNLOCK_PUZZLES);
      // Speed's gate is unchanged from when it was a style, so no player's
      // unlock timeline moved when it became a modifier.
      expect(SPEED_TOGGLE_UNLOCK_PUZZLES).toBe(55);
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
      expect(isVariantUnlocked('reverse', 9, 0)).toBe(false);
      expect(isVariantUnlocked('reverse', 10, 0)).toBe(true);
    });
  });

  // The COMBINATION-STYLES presets were deleted: they were a second, parallel
  // way to arm loadouts the player can already build by stacking toggles, the
  // menu stopped rendering them long ago, and one of them was defined in terms
  // of speed-as-a-style. Stacking is the one way to combine modes now.
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
      for (const variant of ['reverse', 'double_shift'] as PuzzleVariant[]) {
        strings.push(getVariantUnlockHint(variant, 0, 0, 0));
        strings.push(getVariantUnlockHint(variant, 0, 0, 4));
      }
      strings.push(getBlindUnlockHint(0, 0), getBlindUnlockHint(0, 4));
      strings.push(getSpeedUnlockHint(0, 0), getSpeedUnlockHint(0, 4));
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
      expect(getVariantInstruction(VARIANT_CONFIGS.reverse, 1)).toBe(VARIANT_CONFIGS.reverse.instruction);
      expect(getVariantInstruction(VARIANT_CONFIGS.reverse, 4)).toBe(VARIANT_CONFIGS.reverse.darkInstruction);
    });

    it('provides phase-aware instructions for every variant', () => {
      for (const config of Object.values(VARIANT_CONFIGS)) {
        expect(getVariantInstruction(config, 0).trim().length).toBeGreaterThan(0);
        expect(getVariantInstruction(config, 4).trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('variant mechanics helpers', () => {
    it('only double shift overrides the board shape', () => {
      expect(getVariantOverrides('standard', 'MEDIUM')).toEqual({});
      expect(getVariantOverrides('reverse', 'MEDIUM')).toEqual({});
      expect(getVariantOverrides('double_shift', 'MEDIUM')).toEqual({ wordLength: 5, targetRows: 4 });
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
      expect(hasVariantModifier('reverse', 'double_shift')).toBe(false);
    });

    it('gives a speed board the difficulty base time on a standard chain', () => {
      expect(getSpeedTimeLimit('EASY', 'standard')).toBe(SPEED_TIME_LIMITS.EASY);
      expect(getSpeedTimeLimit('HARD', 'standard')).toBe(SPEED_TIME_LIMITS.HARD);
    });

    it('lengthens the clock for styles that ask for more work', () => {
      // A reverse chain is played down AND back up; a double shift moves two
      // letters a step over more rows. Handing either the standard clock would
      // not be difficulty, it would be an unwinnable board.
      const base = getSpeedTimeLimit('HARD', 'standard');
      expect(getSpeedTimeLimit('HARD', 'reverse')).toBeGreaterThan(base);
      expect(getSpeedTimeLimit('HARD', 'double_shift')).toBeGreaterThan(base);
      // Reverse is the longest ask of the three.
      expect(getSpeedTimeLimit('HARD', 'reverse'))
        .toBeGreaterThan(getSpeedTimeLimit('HARD', 'double_shift'));
    });

    it('keeps every style x difficulty clock a sane positive number', () => {
      const styles: PuzzleVariant[] = ['standard', 'reverse', 'double_shift'];
      const diffs = ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD', 'EXPERT'] as const;
      for (const st of styles) {
        for (const d of diffs) {
          const secs = getSpeedTimeLimit(d, st);
          expect(Number.isFinite(secs)).toBe(true);
          expect(secs).toBeGreaterThanOrEqual(30);
          expect(secs).toBeLessThanOrEqual(180);
        }
      }
    });

    it('teases the speed modifier until its gate, like the other modifiers', () => {
      expect(getSpeedUnlockHint(SPEED_TOGGLE_UNLOCK_PUZZLES - 5, 0)).toContain('5 more puzzle');
      expect(getSpeedUnlockHint(SPEED_TOGGLE_UNLOCK_PUZZLES, 0)).toBe('Unlocked.');
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
      expect(mid).toContain('double_shift');
    });

    it('builds selector options that INCLUDE locked variants as teased rows', () => {
      // With 100 puzzles, all variants are unlocked
      const allUnlocked = getVariantSelectorOptions(100, 0, 0);
      expect(allUnlocked.every(o => o.unlocked)).toBe(true);
      expect(allUnlocked.map(o => o.variant)).toContain('standard');
      expect(allUnlocked.map(o => o.variant)).toContain('reverse');
      expect(allUnlocked.map(o => o.variant)).toContain('double_shift');

      // With 10 puzzles, double_shift is visible but locked,
      // carrying a countdown tease (the player always sees the next goal).
      const early = getVariantSelectorOptions(10, 0, 0);
      expect(early.map(o => o.variant)).toEqual(['standard', 'reverse', 'double_shift']);
      const doubleRow = early.find(o => o.variant === 'double_shift')!;
      expect(doubleRow.unlocked).toBe(false);
      expect(doubleRow.unlockHint).toContain('15 more puzzle');
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
      const light = getVariantUnlockHint('double_shift', 50, 0, 1);
      expect(typeof light).toBe('string');
    });

    it('allows all letters for all variants (no restriction modes)', () => {
      expect(isLetterAllowedByVariant('standard', 'A')).toBe(true);
      expect(isLetterAllowedByVariant('reverse', 'B')).toBe(true);
      expect(isLetterAllowedByVariant('double_shift', 'E')).toBe(true);
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
      expect(getVariantAmberMultiplier('double_shift')).toBe(1.65);
    });

    it('falls back to 1.0 for unknown variants', () => {
      expect(getVariantAmberMultiplier('unknown_variant' as PuzzleVariant)).toBe(1.0);
    });
  });
});
