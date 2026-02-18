import {
  shouldOfferVariant,
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
  getVariantChainLength,
  isLetterAllowedByVariant,
  isVariantCompatibleWithSolution,
  VARIANT_CONFIGS,
  PuzzleVariant,
} from '../services/puzzleVariety';

describe('puzzleVariety', () => {
  describe('VARIANT_CONFIGS', () => {
    it('defines all variants', () => {
      const variants: PuzzleVariant[] = [
        'standard',
        'reverse',
        'speed',
        'chain',
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

  describe('shouldOfferVariant', () => {
    it('does not offer variants before puzzle 12', () => {
      for (let i = 0; i < 12; i++) {
        expect(shouldOfferVariant(i, 0)).toBeNull();
      }
    });

    it('offers reverse at the first milestone', () => {
      const origRandom = Math.random;
      Math.random = () => 0;
      const offered = shouldOfferVariant(20, 0);
      expect(offered?.variant).toBe('reverse');
      Math.random = origRandom;
    });

    it('unlocks additional variants by progression bands', () => {
      const origRandom = Math.random;

      Math.random = () => 0.99;
      expect(['reverse', 'double_shift']).toContain(shouldOfferVariant(40, 0)!.variant);

      Math.random = () => 0.9;
      expect(['reverse', 'speed', 'double_shift']).toContain(shouldOfferVariant(60, 0)!.variant);

      Math.random = () => 0.9;
      expect(['reverse', 'speed', 'chain', 'double_shift']).toContain(
        shouldOfferVariant(90, 0)!.variant
      );

      Math.random = origRandom;
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
      expect(getVariantOverrides('chain', 'HARD')).toEqual({ targetRows: 4 });
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
      expect(getVariantTimeLimit('chain')).toBeNull();
    });

    it('returns difficulty-aware time limits for speed variants', () => {
      expect(getVariantTimeLimitForDifficulty('speed', 'EASY')).toBe(65);
      expect(getVariantTimeLimitForDifficulty('speed', 'MEDIUM')).toBe(60);
      expect(getVariantTimeLimitForDifficulty('reverse', 'HARD')).toBeNull();
    });

    it('scales chain length with difficulty', () => {
      expect(getVariantChainLength('chain', 'MEDIUM')).toBe(3);
      expect(getVariantChainLength('chain', 'HARD')).toBe(4);
      expect(getVariantChainLength('reverse', 'HARD')).toBe(1);
    });

    it('exposes unlock requirements and unlocked checks', () => {
      expect(getVariantUnlockRequirement('standard')).toBeNull();
      expect(getVariantUnlockRequirement('reverse')?.puzzlesSolved).toBe(10);
      expect(isVariantUnlocked('reverse', 9, 0)).toBe(false);
      expect(isVariantUnlocked('reverse', 10, 0)).toBe(true);
    });

    it('returns unlocked variants list with standard first', () => {
      const early = getUnlockedVariants(10, 0);
      expect(early).toEqual(['standard', 'reverse']);

      const mid = getUnlockedVariants(90, 0);
      expect(mid).toContain('standard');
      expect(mid).toContain('reverse');
      expect(mid).toContain('speed');
      expect(mid).toContain('chain');
      expect(mid).toContain('double_shift');
    });

    it('builds selector options with only unlocked variants', () => {
      const options = getVariantSelectorOptions(50, 0, 0);
      expect(options.every(o => o.unlocked)).toBe(true);
      expect(options.map(o => o.variant)).toEqual(['standard', 'reverse', 'double_shift']);
      expect(options.find(o => o.variant === 'speed')).toBeUndefined();
    });

    it('validates known variant keys', () => {
      expect(isPuzzleVariant('reverse')).toBe(true);
      expect(isPuzzleVariant('made_up_variant')).toBe(false);
      expect(isPuzzleVariant('blind')).toBe(false);
      expect(isPuzzleVariant('no_vowel')).toBe(false);
    });

    it('uses tone-aware unlock hints', () => {
      const light = getVariantUnlockHint('chain', 50, 0, 1);
      const dark = getVariantUnlockHint('chain', 50, 0, 4);
      expect(light).toContain('Unlocks');
      expect(dark).toContain('offerings');
    });

    it('allows all letters for all variants (no restriction modes)', () => {
      expect(isLetterAllowedByVariant('standard', 'A')).toBe(true);
      expect(isLetterAllowedByVariant('reverse', 'B')).toBe(true);
      expect(isLetterAllowedByVariant('speed', 'E')).toBe(true);
      expect(isLetterAllowedByVariant('chain', 'T')).toBe(true);
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
      expect(getVariantAmberMultiplier('chain')).toBe(1.58);
      expect(getVariantAmberMultiplier('double_shift')).toBe(1.65);
    });

    it('falls back to 1.0 for unknown variants', () => {
      expect(getVariantAmberMultiplier('unknown_variant' as PuzzleVariant)).toBe(1.0);
    });
  });
});
