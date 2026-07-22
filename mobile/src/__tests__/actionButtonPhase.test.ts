// Mock react-native (Node env, no renderer). appStyles.ts calls
// StyleSheet.create at module load; the helper under test is pure.
jest.mock('react-native', () => ({
  StyleSheet: { create: (styles: any) => styles, flatten: (s: any) => s },
  Platform: { OS: 'ios', select: (o: any) => o.ios },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
}));

import { getActionButtonColors } from '../styles/appStyles';
import { CandyColors } from '../theme/colors';

/**
 * The bottom action buttons (UNDO / HINT / RESTART) must track the descent:
 * candy-bright through phases 0-1, a cooled dusk step at Phase 2 (F178), then
 * darkened into the dread register from Phase 3 so they stop glowing against a
 * near-black board. Their hue identity (warm undo / cool hint / green restart)
 * must survive at every phase so muscle memory holds.
 */
const lum = (hex: string): number => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

describe('getActionButtonColors — phase-aware bottom controls', () => {
  const KINDS = ['undo', 'hint', 'restart'] as const;

  test('phases 0-1 are the original candy colors, pixel-identical', () => {
    for (const phase of [0, 1]) {
      expect(getActionButtonColors('undo', phase)).toEqual({
        bg: CandyColors.yellow.main,
        border: CandyColors.yellow.shadow,
        glow: CandyColors.yellow.glow,
      });
      expect(getActionButtonColors('hint', phase)).toEqual({
        bg: CandyColors.blue.main,
        border: CandyColors.blue.shadow,
        glow: CandyColors.blue.glow,
      });
      expect(getActionButtonColors('restart', phase)).toEqual({
        bg: CandyColors.green.main,
        border: CandyColors.green.shadow,
        glow: CandyColors.green.glow,
      });
    }
  });

  test('Phase 2 is a cooled dusk step: not candy, and lighter than Phase 3 dread (F178)', () => {
    for (const kind of KINDS) {
      const bright = getActionButtonColors(kind, 0).bg;
      const cooled = getActionButtonColors(kind, 2).bg;
      const dread = getActionButtonColors(kind, 3).bg;
      // A distinct intermediate tier — neither the bright candy nor the dread.
      expect(cooled).not.toBe(bright);
      expect(cooled).not.toBe(dread);
      // Cooled sits between bright and dread on luminance (the gradual descent).
      expect(lum(cooled)).toBeLessThan(lum(bright));
      expect(lum(cooled)).toBeGreaterThan(lum(dread));
    }
  });

  test('the buttons darken at Phase 3 and again at Phase 4 (monotonic descent)', () => {
    for (const kind of KINDS) {
      const bright = lum(getActionButtonColors(kind, 0).bg);
      const dusk = lum(getActionButtonColors(kind, 3).bg);
      const dark = lum(getActionButtonColors(kind, 5).bg);
      expect(dusk).toBeLessThan(bright);
      expect(dark).toBeLessThan(dusk);
    }
  });

  test('every phase returns a full, valid color triple (never undefined)', () => {
    for (const phase of [0, 1, 2, 3, 4, 5]) {
      for (const kind of KINDS) {
        const c = getActionButtonColors(kind, phase);
        expect(c.bg).toMatch(/^(#|rgba)/);
        expect(c.border).toMatch(/^(#|rgba)/);
        expect(c.glow).toMatch(/^(#|rgba)/);
      }
    }
  });
});
