/**
 * Pure-helper tests for the Whisper Gallery's idle shimmer scatter.
 *
 * Every collection bar reads a windowed slice of ONE shared looping driver;
 * `getShimmerCycleOffset` decides where in that cycle each bar's slice sits.
 * Only the pure math is exercised here (no renderer); react-native and the
 * screen's heavy sibling imports are stubbed to the pieces the module touches
 * at eval time (StyleSheet.create / Dimensions.get) so the import is Node-safe.
 */
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  TouchableOpacity: 'TouchableOpacity',
  SectionList: 'SectionList',
  StatusBar: 'StatusBar',
  ActivityIndicator: 'ActivityIndicator',
  Animated: {
    View: 'Animated.View',
    Value: class {
      interpolate() { return 0; }
      setValue() {}
      stopAnimation() {}
    },
    loop: () => ({ start() {}, stop() {} }),
    timing: () => ({}),
  },
  Easing: { inOut: (x: unknown) => x, linear: 0, ease: 0, quad: 0 },
  StyleSheet: { create: (s: unknown) => s },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
}));

jest.mock('../theme/fonts', () => ({
  BODY_FONT: 'Font',
  BODY_FONT_ITALIC: 'Font',
  PIXEL_FONT_BOLD: 'Font',
}));
jest.mock('../theme/surfaces', () => ({
  SURFACE: { buttonRadius: 8, cardRadius: 8, staggerMs: 50 },
  getSurfaceTheme: () => ({}),
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
jest.mock('../services/settings', () => ({ getSettingsSync: () => ({ reducedMotion: false }) }));
jest.mock('../services/deviceTier', () => ({ shouldSimplifyAnimations: () => false }));
jest.mock('../services/whisperGallery', () => ({
  getGroupedEntries: jest.fn(),
  getGalleryStats: jest.fn(),
  getGalleryTitle: () => '',
  getGallerySubtitle: () => '',
  getPhaseEraName: () => '',
}));
jest.mock('../services/animalDialogue', () => ({ ANIMAL_INFO: {} }));
jest.mock('../services/phaseNarrative', () => ({ getWhisperGalleryEmptyText: () => '' }));
jest.mock('../services/uiSound', () => ({ playUiSound: () => {}, uiHapticSelection: () => {} }));
jest.mock('../components/home/AnimalSprite', () => ({ CHARACTER_SPRITES: {} }));

import { shimmerHash, getShimmerCycleOffset } from '../components/WhisperGalleryScreen';

// Mirrors the module constants (kept in step with WhisperGalleryScreen.tsx).
const SHIMMER_CYCLE_MS = 20000;
const SHIMMER_SWEEP_MS = 2400;
const SHIMMER_WINDOW = SHIMMER_SWEEP_MS / SHIMMER_CYCLE_MS;
const SHIMMER_LEAD_IN = 0.08;
const SHIMMER_TAIL_MARGIN = 0.02;

// The 13 animals, in unlock order.
const ANIMAL_KEYS = [
  'fox', 'pangolin', 'owl', 'axolotl', 'capybara', 'fennec_fox', 'sloth',
  'wombat', 'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo',
];

describe('shimmerHash', () => {
  test('is stable for the same key', () => {
    expect(shimmerHash('fox')).toBe(shimmerHash('fox'));
  });

  test('differs across the real animal keys', () => {
    const hashes = new Set(ANIMAL_KEYS.map(shimmerHash));
    expect(hashes.size).toBe(ANIMAL_KEYS.length);
  });

  test('returns a non-negative 32-bit integer', () => {
    for (const key of ANIMAL_KEYS) {
      const h = shimmerHash(key);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
      expect(Number.isInteger(h)).toBe(true);
    }
  });

  test('handles the empty string without throwing', () => {
    expect(Number.isInteger(shimmerHash(''))).toBe(true);
  });
});

describe('getShimmerCycleOffset', () => {
  test('every sweep window opens after the lead-in and closes inside the cycle', () => {
    // This is the invariant that keeps the interpolation inputRange
    // monotonically increasing (a violation is an RN invariant crash).
    for (const key of ANIMAL_KEYS) {
      for (let i = 0; i < 13; i++) {
        const offset = getShimmerCycleOffset(key, i);
        expect(offset).toBeGreaterThanOrEqual(SHIMMER_LEAD_IN);
        expect(offset + SHIMMER_WINDOW).toBeLessThanOrEqual(1 - SHIMMER_TAIL_MARGIN);
      }
    }
  });

  test('is deterministic (no Math.random) so re-renders never re-scatter', () => {
    expect(getShimmerCycleOffset('fox', 0)).toBe(getShimmerCycleOffset('fox', 0));
    expect(getShimmerCycleOffset('kakapo', 7)).toBe(getShimmerCycleOffset('kakapo', 7));
  });

  test('adjacent bars never sweep together', () => {
    const offsets = ANIMAL_KEYS.map((key, i) => getShimmerCycleOffset(key, i));
    for (let i = 1; i < offsets.length; i++) {
      expect(Math.abs(offsets[i] - offsets[i - 1])).toBeGreaterThan(SHIMMER_WINDOW);
    }
  });

  test('all 13 bars land on distinct points in the cycle', () => {
    const offsets = ANIMAL_KEYS.map((key, i) => getShimmerCycleOffset(key, i));
    expect(new Set(offsets).size).toBe(ANIMAL_KEYS.length);
  });

  test('the same key at different list positions is scattered, not identical', () => {
    expect(getShimmerCycleOffset('fox', 0)).not.toBe(getShimmerCycleOffset('fox', 1));
  });

  test('one sweep is slower than the retired 900ms one-shot and fires rarely', () => {
    expect(SHIMMER_SWEEP_MS).toBeGreaterThan(900);
    expect(SHIMMER_CYCLE_MS / SHIMMER_SWEEP_MS).toBeGreaterThan(5);
  });
});
