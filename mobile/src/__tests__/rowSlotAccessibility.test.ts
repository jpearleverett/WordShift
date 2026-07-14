/**
 * Drop-slot accessibility labels (Row.tsx).
 *
 * The slot's accessibilityLabel must announce the ghost preview's word and
 * validity so screen-reader players get the same guidance sighted players
 * read from the visual ✓/✗ preview — and must fall back to the plain
 * positional label when previews are suppressed (Blind Offering / Challenge
 * mode pass `preview: undefined`).
 *
 * Node test environment: react-native and Row's heavy component/service deps
 * are stubbed so the pure label builder can be imported directly.
 */

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (s: Record<string, unknown>) => s },
  Animated: {
    View: 'Animated.View',
    Value: class {
      constructor(_v: number) {}
      interpolate() { return 0; }
      setValue() {}
      stopAnimation() {}
    },
    multiply: () => 0,
    timing: () => ({ start: () => {} }),
    spring: () => ({ start: () => {} }),
    sequence: () => ({ start: () => {} }),
    parallel: () => ({ start: () => {} }),
    loop: () => ({ start: () => {}, stop: () => {} }),
    delay: () => ({ start: () => {} }),
  },
  Easing: {
    inOut: (e: unknown) => e,
    out: (e: unknown) => e,
    in: (e: unknown) => e,
    sin: 0,
    cubic: 0,
    quad: 0,
  },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
}));

jest.mock('../components/LetterTile', () => ({ LetterTile: () => null }));
jest.mock('../components/DraggableTile', () => ({ DraggableTile: () => null }));
// Row fires hapticSelection for the inter-slot tap guidance — stub the
// service so the native expo-haptics module never loads in Node.
jest.mock('../services/haptics', () => ({
  hapticSelection: jest.fn(),
}));
jest.mock('../services/settings', () => ({
  getSettingsSync: () => ({ reducedMotion: true, soundEnabled: false, hapticsEnabled: false }),
}));
jest.mock('../services/deviceTier', () => ({ shouldSimplifyAnimations: () => true }));
jest.mock('../services/localGenerator', () => ({ getWordPhaseTier: () => 0 }));
jest.mock('../theme/fonts', () => ({
  PIXEL_FONT: 'Font',
  PIXEL_FONT_BOLD: 'Font',
  BODY_FONT: 'Font',
  BODY_FONT_BOLD: 'Font',
  BODY_FONT_ITALIC: 'Font',
}));

import { getSlotAccessibilityLabel } from '../components/Row';

describe('getSlotAccessibilityLabel', () => {
  test('announces the preview word and validity for a valid move', () => {
    expect(getSlotAccessibilityLabel(1, 5, false, { word: 'WARM', isValid: true }))
      .toBe('Drop zone 2 of 5, forms WARM, valid word');
  });

  test('announces an invalid move without claiming the word itself is fake', () => {
    // "Not a valid move", not "not a valid word": a preview can be invalid
    // even when the formed word is real (removing the letter may break the
    // word above — the MIST → TIMED case).
    expect(getSlotAccessibilityLabel(0, 5, false, { word: 'TIMED', isValid: false }))
      .toBe('Drop zone 1 of 5, would form TIMED, not a valid move');
  });

  test('keeps the plain positional label when previews are suppressed (blind)', () => {
    expect(getSlotAccessibilityLabel(2, 5, false, undefined)).toBe('Drop zone 3');
    expect(getSlotAccessibilityLabel(2, 5, true, undefined)).toBe('Guided drop zone 3');
  });

  test('announces the formed word WITHOUT a verdict when validity is hidden', () => {
    // The verb-depth gate: screen-reader players get exactly the same
    // guidance sighted players do — the formed word, never the verdict.
    expect(getSlotAccessibilityLabel(1, 5, false, { word: 'WARM', isValid: true }, false))
      .toBe('Drop zone 2 of 5, would form WARM');
    expect(getSlotAccessibilityLabel(0, 5, false, { word: 'TIMED', isValid: false }, false))
      .toBe('Drop zone 1 of 5, would form TIMED');
  });

  test('hidden-validity labels are identical in shape for valid and invalid moves (no leak)', () => {
    const validLabel = getSlotAccessibilityLabel(1, 5, false, { word: 'AAAA', isValid: true }, false);
    const invalidLabel = getSlotAccessibilityLabel(1, 5, false, { word: 'AAAA', isValid: false }, false);
    expect(validLabel).toBe(invalidLabel);
  });

  test('a masked blocked preview never exposes the hidden term to accessibility', () => {
    const label = getSlotAccessibilityLabel(
      0,
      6,
      false,
      { word: '••••••', isValid: false },
    );
    expect(label).toContain('••••••');
    expect(label).not.toContain('NIPPLE');
  });

  test('guided slots keep their guided prefix with previews', () => {
    expect(getSlotAccessibilityLabel(0, 4, true, { word: 'TIED', isValid: true }))
      .toBe('Guided drop zone 1 of 4, forms TIED, valid word');
  });

  test('labels contain no em dashes (player-facing text convention)', () => {
    const labels = [
      getSlotAccessibilityLabel(0, 4, false, { word: 'TIED', isValid: true }),
      getSlotAccessibilityLabel(0, 4, false, { word: 'XRAY', isValid: false }),
      getSlotAccessibilityLabel(0, 4, false, { word: 'XRAY', isValid: false }, false),
      getSlotAccessibilityLabel(0, 4, false),
    ];
    for (const label of labels) {
      expect(label).not.toMatch(/[—–]/);
    }
  });

  test('Slot wires the builder with the row slot count AND the validity gate (source pin)', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../components/Row.tsx'),
      'utf8'
    );
    expect(src).toMatch(/accessibilityLabel=\{getSlotAccessibilityLabel\(index, slotCount, isGuided, preview, validityVisible\)\}/);
    expect(src).toMatch(/slotCount=\{letters\.length \+ 1\}/);
  });

  test('the neutral preview renders no prefix and one shared ink (source pin)', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../components/Row.tsx'),
      'utf8'
    );
    // Prefix only while validityVisible; neutral style is a single ink.
    expect(src).toMatch(/\{validityVisible \? \(preview\.isValid \? '✓ ' : '✗ '\) : ''\}\{preview\.word\}/);
    expect(src).toMatch(/slotPreviewNeutral/);
    // The graded styles must stay gated behind validityVisible.
    expect(src).toMatch(/validityVisible\s*\n?\s*\? \(preview\.isValid \? styles\.slotPreviewValid : styles\.slotPreviewInvalid\)\s*\n?\s*: styles\.slotPreviewNeutral/);
  });
});
