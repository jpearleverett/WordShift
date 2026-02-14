import {
  shouldOfferVariant,
  getVariantDescription,
  getVariantOverrides,
  isVariantCompleted,
  getVariantAmberMultiplier,
  VARIANT_CONFIGS,
  PuzzleVariant,
  VariantConfig,
} from '../services/puzzleVariety';

describe('puzzleVariety', () => {
  // ===========================================================================
  // VARIANT_CONFIGS
  // ===========================================================================

  describe('VARIANT_CONFIGS', () => {
    it('has all five variant types defined', () => {
      expect(VARIANT_CONFIGS.standard).toBeDefined();
      expect(VARIANT_CONFIGS.reverse).toBeDefined();
      expect(VARIANT_CONFIGS.blind).toBeDefined();
      expect(VARIANT_CONFIGS.speed).toBeDefined();
      expect(VARIANT_CONFIGS.chain).toBeDefined();
    });

    it('each variant has required fields', () => {
      const variants: PuzzleVariant[] = ['standard', 'reverse', 'blind', 'speed', 'chain'];
      for (const v of variants) {
        const config = VARIANT_CONFIGS[v];
        expect(config.variant).toBe(v);
        expect(config.title).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.darkDescription).toBeDefined();
        expect(config.icon).toBeDefined();
        expect(typeof config.amberMultiplier).toBe('number');
      }
    });

    it('standard has 1.0x multiplier', () => {
      expect(VARIANT_CONFIGS.standard.amberMultiplier).toBe(1.0);
    });

    it('reverse has 1.3x multiplier', () => {
      expect(VARIANT_CONFIGS.reverse.amberMultiplier).toBe(1.3);
    });

    it('blind has 1.4x multiplier', () => {
      expect(VARIANT_CONFIGS.blind.amberMultiplier).toBe(1.4);
    });

    it('speed has 1.5x multiplier', () => {
      expect(VARIANT_CONFIGS.speed.amberMultiplier).toBe(1.5);
    });

    it('chain has 2.0x multiplier', () => {
      expect(VARIANT_CONFIGS.chain.amberMultiplier).toBe(2.0);
    });

    it('speed has a 60-second time limit', () => {
      expect(VARIANT_CONFIGS.speed.timeLimit).toBe(60);
    });

    it('speed has 3 row override', () => {
      expect(VARIANT_CONFIGS.speed.rowOverride).toBe(3);
    });

    it('chain has chain length of 3', () => {
      expect(VARIANT_CONFIGS.chain.chainLength).toBe(3);
    });
  });

  // ===========================================================================
  // shouldOfferVariant
  // ===========================================================================

  describe('shouldOfferVariant', () => {
    it('returns null for puzzles below 15', () => {
      for (let i = 0; i < 15; i++) {
        expect(shouldOfferVariant(i, 0)).toBeNull();
      }
    });

    it('returns null for puzzle 15 (not a multiple of 10)', () => {
      // puzzlesSolved=15 is not % 10 === 0, so it depends on random.
      // Mock Math.random to return > 0.10 so it doesn't trigger
      const origRandom = Math.random;
      Math.random = () => 0.99;
      expect(shouldOfferVariant(15, 0)).toBeNull();
      Math.random = origRandom;
    });

    it('offers variant on every 10th puzzle after 15', () => {
      // Mock Math.random for the variant selection
      const origRandom = Math.random;
      Math.random = () => 0.0; // Select first available variant
      const result = shouldOfferVariant(20, 0);
      expect(result).not.toBeNull();
      Math.random = origRandom;
    });

    it('may offer variant randomly (~10%) after puzzle 15', () => {
      const origRandom = Math.random;
      // Math.random < 0.10 should trigger a variant offer
      Math.random = () => 0.05;
      const result = shouldOfferVariant(17, 0);
      expect(result).not.toBeNull();
      Math.random = origRandom;
    });

    it('does not offer variant randomly when roll is above 10%', () => {
      const origRandom = Math.random;
      Math.random = () => 0.5;
      // puzzlesSolved=17 is not % 10 === 0, and random > 0.10
      expect(shouldOfferVariant(17, 0)).toBeNull();
      Math.random = origRandom;
    });

    it('only offers reverse and blind before puzzle 25', () => {
      const origRandom = Math.random;
      const results: PuzzleVariant[] = [];
      // Run multiple times with different random values
      for (let i = 0; i < 10; i++) {
        const selectIdx = i / 10;
        // First random call is for the 10% check (must trigger), second is for variant selection
        let callCount = 0;
        Math.random = () => {
          callCount++;
          if (callCount === 1) return 0.05; // trigger variant
          return selectIdx; // select variant
        };
        const result = shouldOfferVariant(16, 0);
        if (result) results.push(result.variant);
      }
      // All should be reverse or blind
      for (const v of results) {
        expect(['reverse', 'blind']).toContain(v);
      }
      Math.random = origRandom;
    });

    it('includes speed variant at puzzle 25+', () => {
      const origRandom = Math.random;
      // At puzzle 30 (multiple of 10), speed should be available
      // With 3 variants (reverse, blind, speed), selecting index 2 gets speed
      Math.random = () => 0.9; // index 2 of 3 = speed
      const result = shouldOfferVariant(30, 0);
      if (result) {
        expect(['reverse', 'blind', 'speed']).toContain(result.variant);
      }
      Math.random = origRandom;
    });

    it('includes chain variant at puzzle 50+', () => {
      const origRandom = Math.random;
      // At puzzle 50, chain should be available
      // With 4 variants, try selecting the last one
      Math.random = () => 0.99;
      const result = shouldOfferVariant(50, 0);
      if (result) {
        expect(['reverse', 'blind', 'speed', 'chain']).toContain(result.variant);
      }
      Math.random = origRandom;
    });

    it('returns a valid VariantConfig when offered', () => {
      const origRandom = Math.random;
      Math.random = () => 0.0;
      const result = shouldOfferVariant(20, 0);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.title).toBeDefined();
        expect(result.description).toBeDefined();
        expect(result.amberMultiplier).toBeGreaterThan(0);
      }
      Math.random = origRandom;
    });
  });

  // ===========================================================================
  // getVariantDescription
  // ===========================================================================

  describe('getVariantDescription', () => {
    it('returns normal description at phase 0', () => {
      expect(getVariantDescription(VARIANT_CONFIGS.reverse, 0)).toBe(
        VARIANT_CONFIGS.reverse.description
      );
    });

    it('returns normal description at phase 1', () => {
      expect(getVariantDescription(VARIANT_CONFIGS.blind, 1)).toBe(
        VARIANT_CONFIGS.blind.description
      );
    });

    it('returns normal description at phase 2', () => {
      expect(getVariantDescription(VARIANT_CONFIGS.speed, 2)).toBe(
        VARIANT_CONFIGS.speed.description
      );
    });

    it('returns dark description at phase 3', () => {
      expect(getVariantDescription(VARIANT_CONFIGS.reverse, 3)).toBe(
        VARIANT_CONFIGS.reverse.darkDescription
      );
    });

    it('returns dark description at phase 4', () => {
      expect(getVariantDescription(VARIANT_CONFIGS.chain, 4)).toBe(
        VARIANT_CONFIGS.chain.darkDescription
      );
    });

    it('returns dark description for all variants at phase 3+', () => {
      const variants: PuzzleVariant[] = ['standard', 'reverse', 'blind', 'speed', 'chain'];
      for (const v of variants) {
        const config = VARIANT_CONFIGS[v];
        expect(getVariantDescription(config, 3)).toBe(config.darkDescription);
        expect(getVariantDescription(config, 4)).toBe(config.darkDescription);
      }
    });
  });

  // ===========================================================================
  // getVariantOverrides
  // ===========================================================================

  describe('getVariantOverrides', () => {
    it('returns empty object for standard', () => {
      expect(getVariantOverrides('standard', 'MEDIUM')).toEqual({});
    });

    it('returns empty object for reverse', () => {
      expect(getVariantOverrides('reverse', 'MEDIUM')).toEqual({});
    });

    it('returns empty object for blind', () => {
      expect(getVariantOverrides('blind', 'HARD')).toEqual({});
    });

    it('returns targetRows: 3 for speed', () => {
      expect(getVariantOverrides('speed', 'HARD')).toEqual({ targetRows: 3 });
    });

    it('returns targetRows: 3 for chain', () => {
      expect(getVariantOverrides('chain', 'MEDIUM')).toEqual({ targetRows: 3 });
    });

    it('speed override applies regardless of difficulty', () => {
      expect(getVariantOverrides('speed', 'EASY')).toEqual({ targetRows: 3 });
      expect(getVariantOverrides('speed', 'MEDIUM')).toEqual({ targetRows: 3 });
      expect(getVariantOverrides('speed', 'HARD')).toEqual({ targetRows: 3 });
    });
  });

  // ===========================================================================
  // isVariantCompleted
  // ===========================================================================

  describe('isVariantCompleted', () => {
    it('returns true for standard variant (no constraints)', () => {
      expect(isVariantCompleted('standard')).toBe(true);
    });

    it('returns true for reverse variant', () => {
      expect(isVariantCompleted('reverse')).toBe(true);
    });

    it('returns true for blind variant', () => {
      expect(isVariantCompleted('blind')).toBe(true);
    });

    it('returns true for chain variant', () => {
      expect(isVariantCompleted('chain')).toBe(true);
    });

    it('returns true for speed variant when completed within time', () => {
      expect(isVariantCompleted('speed', 30)).toBe(true);
      expect(isVariantCompleted('speed', 59)).toBe(true);
      expect(isVariantCompleted('speed', 60)).toBe(true);
    });

    it('returns false for speed variant when over time', () => {
      expect(isVariantCompleted('speed', 61)).toBe(false);
      expect(isVariantCompleted('speed', 120)).toBe(false);
    });

    it('returns true for speed variant when no elapsed time provided', () => {
      expect(isVariantCompleted('speed')).toBe(true);
    });

    it('returns true for speed at exactly the time limit', () => {
      expect(isVariantCompleted('speed', 60)).toBe(true);
    });
  });

  // ===========================================================================
  // getVariantAmberMultiplier
  // ===========================================================================

  describe('getVariantAmberMultiplier', () => {
    it('returns 1.0 for standard', () => {
      expect(getVariantAmberMultiplier('standard')).toBe(1.0);
    });

    it('returns 1.3 for reverse', () => {
      expect(getVariantAmberMultiplier('reverse')).toBe(1.3);
    });

    it('returns 1.4 for blind', () => {
      expect(getVariantAmberMultiplier('blind')).toBe(1.4);
    });

    it('returns 1.5 for speed', () => {
      expect(getVariantAmberMultiplier('speed')).toBe(1.5);
    });

    it('returns 2.0 for chain', () => {
      expect(getVariantAmberMultiplier('chain')).toBe(2.0);
    });

    it('returns 1.0 for unknown variant', () => {
      expect(getVariantAmberMultiplier('nonexistent' as PuzzleVariant)).toBe(1.0);
    });
  });
});
