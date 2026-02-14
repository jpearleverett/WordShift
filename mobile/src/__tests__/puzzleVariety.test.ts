import {
  shouldOfferVariant,
  getVariantDescription,
  getVariantInstruction,
  getVariantOverrides,
  getVariantModifiers,
  hasVariantModifier,
  isVariantCompleted,
  getVariantAmberMultiplier,
  isLetterAllowedByVariant,
  isVariantCompatibleWithSolution,
  VARIANT_CONFIGS,
  PuzzleVariant,
} from '../services/puzzleVariety';

describe('puzzleVariety', () => {
  describe('VARIANT_CONFIGS', () => {
    it('defines all base and combo variants', () => {
      const variants: PuzzleVariant[] = [
        'standard',
        'reverse',
        'blind',
        'speed',
        'chain',
        'no_vowel',
        'no_consonant',
        'reverse_blind',
        'blind_no_vowel',
        'blind_no_consonant',
        'speed_no_vowel',
        'speed_no_consonant',
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
      expect(VARIANT_CONFIGS.speed_no_vowel.timeLimit).toBe(60);
      expect(VARIANT_CONFIGS.speed_no_consonant.rowOverride).toBe(3);
    });
  });

  describe('shouldOfferVariant', () => {
    it('does not offer variants before puzzle 18', () => {
      for (let i = 0; i < 18; i++) {
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
      expect(['reverse', 'blind']).toContain(shouldOfferVariant(30, 0)!.variant);

      Math.random = () => 0.9;
      expect(['reverse', 'blind', 'no_vowel']).toContain(shouldOfferVariant(50, 0)!.variant);

      Math.random = () => 0.75;
      expect(['reverse', 'blind', 'no_vowel', 'speed']).toContain(shouldOfferVariant(70, 0)!.variant);

      Math.random = () => 0.9;
      expect(['reverse', 'blind', 'no_vowel', 'speed', 'no_consonant']).toContain(
        shouldOfferVariant(90, 0)!.variant
      );

      Math.random = () => 0.99;
      expect(['reverse', 'blind', 'no_vowel', 'speed', 'no_consonant', 'chain']).toContain(
        shouldOfferVariant(100, 1)!.variant
      );

      Math.random = origRandom;
    });

    it('can select combo variants in deep progression', () => {
      const origRandom = Math.random;
      // puzzle % 10 === 0 (no offer-roll), then combo-roll, then selection-roll
      const sequence = [0.1, 0.99];
      let idx = 0;
      Math.random = () => sequence[idx++] ?? 0.99;

      const offered = shouldOfferVariant(120, 2);
      expect(offered).not.toBeNull();
      expect(['reverse_blind', 'blind_no_vowel']).toContain(offered!.variant);

      Math.random = origRandom;
    });
  });

  describe('phase-aware copy helpers', () => {
    it('switches descriptions by phase', () => {
      expect(getVariantDescription(VARIANT_CONFIGS.reverse, 0)).toBe(VARIANT_CONFIGS.reverse.description);
      expect(getVariantDescription(VARIANT_CONFIGS.reverse, 3)).toBe(VARIANT_CONFIGS.reverse.darkDescription);
    });

    it('switches instructions by phase', () => {
      expect(getVariantInstruction(VARIANT_CONFIGS.blind, 1)).toBe(VARIANT_CONFIGS.blind.instruction);
      expect(getVariantInstruction(VARIANT_CONFIGS.blind, 4)).toBe(VARIANT_CONFIGS.blind.darkInstruction);
    });
  });

  describe('variant mechanics helpers', () => {
    it('returns overrides for speed-like variants', () => {
      expect(getVariantOverrides('standard', 'MEDIUM')).toEqual({});
      expect(getVariantOverrides('speed', 'MEDIUM')).toEqual({ targetRows: 3 });
      expect(getVariantOverrides('chain', 'HARD')).toEqual({ targetRows: 3 });
      expect(getVariantOverrides('speed_no_vowel', 'EASY')).toEqual({ targetRows: 3 });
    });

    it('resolves modifiers and modifier checks', () => {
      expect(getVariantModifiers('standard')).toEqual([]);
      expect(getVariantModifiers('reverse')).toEqual(['reverse']);
      expect(getVariantModifiers('blind_no_vowel')).toEqual(['blind', 'no_vowel']);
      expect(hasVariantModifier('reverse_blind', 'reverse')).toBe(true);
      expect(hasVariantModifier('reverse_blind', 'blind')).toBe(true);
      expect(hasVariantModifier('reverse_blind', 'speed')).toBe(false);
    });

    it('applies completion constraints for speed variants only', () => {
      expect(isVariantCompleted('reverse', 999)).toBe(true);
      expect(isVariantCompleted('speed', 60)).toBe(true);
      expect(isVariantCompleted('speed', 61)).toBe(false);
      expect(isVariantCompleted('speed_no_vowel', 59)).toBe(true);
      expect(isVariantCompleted('speed_no_vowel', 61)).toBe(false);
    });

    it('enforces letter movement restrictions', () => {
      expect(isLetterAllowedByVariant('standard', 'A')).toBe(true);
      expect(isLetterAllowedByVariant('no_vowel', 'B')).toBe(true);
      expect(isLetterAllowedByVariant('no_vowel', 'A')).toBe(false);
      expect(isLetterAllowedByVariant('no_consonant', 'E')).toBe(true);
      expect(isLetterAllowedByVariant('no_consonant', 'T')).toBe(false);
    });

    it('checks generated solution compatibility for restriction modes', () => {
      const consonantSolution = [{ letterToMove: 'T' }, { letterToMove: 'R' }] as any;
      const vowelSolution = [{ letterToMove: 'A' }, { letterToMove: 'E' }] as any;
      const mixedSolution = [{ letterToMove: 'A' }, { letterToMove: 'T' }] as any;

      expect(isVariantCompatibleWithSolution('no_vowel', consonantSolution)).toBe(true);
      expect(isVariantCompatibleWithSolution('no_vowel', mixedSolution)).toBe(false);
      expect(isVariantCompatibleWithSolution('no_consonant', vowelSolution)).toBe(true);
      expect(isVariantCompatibleWithSolution('no_consonant', mixedSolution)).toBe(false);
      expect(isVariantCompatibleWithSolution('blind_no_vowel', consonantSolution)).toBe(true);
      expect(isVariantCompatibleWithSolution('blind_no_vowel', mixedSolution)).toBe(false);
      expect(isVariantCompatibleWithSolution('reverse', mixedSolution)).toBe(true);
      expect(isVariantCompatibleWithSolution('reverse')).toBe(true);
    });
  });

  describe('amber multipliers', () => {
    it('returns configured multipliers', () => {
      expect(getVariantAmberMultiplier('standard')).toBe(1.0);
      expect(getVariantAmberMultiplier('reverse')).toBe(1.35);
      expect(getVariantAmberMultiplier('blind')).toBe(1.4);
      expect(getVariantAmberMultiplier('speed')).toBe(1.5);
      expect(getVariantAmberMultiplier('chain')).toBe(2.0);
      expect(getVariantAmberMultiplier('no_vowel')).toBe(1.35);
      expect(getVariantAmberMultiplier('no_consonant')).toBe(1.35);
      expect(getVariantAmberMultiplier('reverse_blind')).toBe(1.85);
      expect(getVariantAmberMultiplier('blind_no_vowel')).toBe(1.8);
      expect(getVariantAmberMultiplier('blind_no_consonant')).toBe(1.8);
      expect(getVariantAmberMultiplier('speed_no_vowel')).toBe(1.95);
      expect(getVariantAmberMultiplier('speed_no_consonant')).toBe(1.95);
    });

    it('falls back to 1.0 for unknown variants', () => {
      expect(getVariantAmberMultiplier('unknown_variant' as PuzzleVariant)).toBe(1.0);
    });
  });
});
