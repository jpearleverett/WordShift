/**
 * Pure-helper test for the WordLedger virtualization grouping.
 *
 * `groupLedgerWords` chunks the flat ritual-word list into fixed-size row
 * groups for the windowed FlatList. Only the pure math is exercised here (no
 * renderer); react-native and the component's heavy sibling imports are stubbed
 * to the pieces WordLedger touches at module eval (StyleSheet.create /
 * Dimensions.get), so importing the module is Node-safe.
 */
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  TouchableOpacity: 'TouchableOpacity',
  FlatList: 'FlatList',
  Animated: {
    View: 'Animated.View',
    Value: class {
      interpolate() { return 0; }
      setValue() {}
      stopAnimation() {}
    },
    loop: () => ({ start() {}, stop() {} }),
    sequence: () => ({}),
    timing: () => ({}),
  },
  Easing: { inOut: (x: unknown) => x, sin: 0 },
  StyleSheet: { create: (s: unknown) => s },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
}));

jest.mock('../theme/fonts', () => ({ PIXEL_FONT_BOLD: 'Font' }));
jest.mock('../theme/surfaces', () => ({
  SURFACE: { buttonRadius: 8, cardRadius: 8 },
  getSurfaceTheme: () => ({}),
}));
jest.mock('../theme/colors', () => ({
  getResonanceConfig: () => ({ color: '#fff', minOpacity: 0, maxOpacity: 1 }),
}));
jest.mock('../components/ui/PanelCard', () => ({ PanelCard: 'PanelCard' }));
jest.mock('../components/ui/RewardReveal', () => ({
  EntranceCascadeItem: 'EntranceCascadeItem',
  getCascadeDelayMs: () => 0,
  getGroupedCascadeDelayMs: () => 0,
}));
jest.mock('../hooks/useScreenInsets', () => ({
  useScreenInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../services/amberCurrency', () => ({ getFullProgress: jest.fn() }));
jest.mock('../services/phaseNarrative', () => ({ getWordsOfferedText: () => '' }));
jest.mock('../services/settings', () => ({ getSettingsSync: () => ({ reducedMotion: false }) }));
jest.mock('../services/deviceTier', () => ({ shouldSimplifyAnimations: () => false }));

import * as fs from 'fs';
import * as path from 'path';

import { groupLedgerWords } from '../components/WordLedger';

describe('groupLedgerWords', () => {
  test('returns [] for an empty list', () => {
    expect(groupLedgerWords([], 18)).toEqual([]);
  });

  test('a list shorter than the group size becomes one group', () => {
    const groups = groupLedgerWords(['VOID', 'ECHO', 'DUST'], 18);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual({ key: 'g0', startIndex: 0, words: ['VOID', 'ECHO', 'DUST'] });
  });

  test('splits an exact multiple into equal groups with correct startIndex/key', () => {
    const words = Array.from({ length: 6 }, (_, i) => `W${i}`);
    const groups = groupLedgerWords(words, 3);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({ key: 'g0', startIndex: 0, words: ['W0', 'W1', 'W2'] });
    expect(groups[1]).toEqual({ key: 'g3', startIndex: 3, words: ['W3', 'W4', 'W5'] });
  });

  test('keeps a trailing remainder in a final smaller group', () => {
    const words = Array.from({ length: 7 }, (_, i) => `W${i}`);
    const groups = groupLedgerWords(words, 3);
    expect(groups).toHaveLength(3);
    expect(groups[2]).toEqual({ key: 'g6', startIndex: 6, words: ['W6'] });
  });

  test('startIndex tracks the global position (drives the per-chip stagger)', () => {
    const words = Array.from({ length: 50 }, (_, i) => `W${i}`);
    const groups = groupLedgerWords(words, 18);
    expect(groups.map(g => g.startIndex)).toEqual([0, 18, 36]);
    expect(groups.map(g => g.key)).toEqual(['g0', 'g18', 'g36']);
    // Word 20 lives at index 2 of the second group (global 18 + 2).
    expect(groups[1].words[2]).toBe('W20');
  });

  test('preserves every word exactly once, in order', () => {
    const words = Array.from({ length: 41 }, (_, i) => `W${i}`);
    const flattened = groupLedgerWords(words, 18).flatMap(g => g.words);
    expect(flattened).toEqual(words);
  });

  test('a non-positive size falls back to 1 (one word per group, never spins)', () => {
    expect(groupLedgerWords(['A', 'B'], 0)).toEqual([
      { key: 'g0', startIndex: 0, words: ['A'] },
      { key: 'g1', startIndex: 1, words: ['B'] },
    ]);
    expect(groupLedgerWords(['A', 'B'], -5)).toHaveLength(2);
  });

  test('handles the full 500-word cap without dropping or duplicating a chip', () => {
    const words = Array.from({ length: 500 }, (_, i) => `W${i}`);
    const groups = groupLedgerWords(words, 18);
    expect(groups).toHaveLength(Math.ceil(500 / 18));
    expect(groups.flatMap(g => g.words)).toHaveLength(500);
    expect(groups[groups.length - 1].words[groups[groups.length - 1].words.length - 1]).toBe('W499');
  });
});

/**
 * Source guard for the chip entrance cascade. The old design skipped the
 * wrapper entirely past a global index cap and disarmed every remaining
 * cascade on a 1.5s timer, so only the first 10 chips in the whole ledger ever
 * animated. The replacement is a per-GROUP cascade with a per-group reveal
 * latch: every windowed group animates its own chips on its first mount.
 */
describe('WordLedger chip cascade (source guard)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'WordLedger.tsx'),
    'utf8',
  );

  test('the global index cap and the global settle timer are gone', () => {
    expect(src).not.toMatch(/CHIP_CASCADE_CAP/);
    expect(src).not.toMatch(/LEDGER_CASCADE_SETTLE_MS/);
    expect(src).not.toMatch(/cascadeArmed/);
  });

  test('uses a per-group cascade delay and a per-group reveal latch', () => {
    expect(src).toContain('getGroupedCascadeDelayMs');
    expect(src).toContain('revealedGroups');
    expect(src).toContain('CHIP_CASCADE_STAGGER_MS');
  });

  test('reduced motion / low tier still short-circuits the wrappers', () => {
    expect(src).toMatch(/getSettingsSync\(\)\.reducedMotion \|\| shouldSimplifyAnimations\(\)/);
    expect(src).toContain('animate={!cascadeReducedMotion}');
  });
});
