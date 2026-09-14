/**
 * Device tier: the RAM signal (expo-device totalMemory) marks 2-3 GB phones
 * 'low' even when their 720x1600 / density-2.0 screens pass the pixel
 * heuristic as 'medium'; without the module the pixel heuristic still decides.
 */

type Screen = { width: number; height: number; density: number; os?: string };

function loadTier(screen: Screen, totalMemory: number | null | 'missing') {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    Platform: { OS: screen.os ?? 'android' },
    PixelRatio: { get: () => screen.density },
    Dimensions: { get: () => ({ width: screen.width, height: screen.height }) },
  }));
  if (totalMemory === 'missing') {
    jest.doMock('expo-device', () => { throw new Error('Module not found'); });
  } else {
    jest.doMock('expo-device', () => ({ totalMemory }));
  }
  return require('../services/deviceTier') as typeof import('../services/deviceTier');
}

const GB = 1024 * 1024 * 1024;
// A 2026 budget phone: 720x1600 at density 2.0 = 1,152,000 px, 'medium' by pixels.
const BUDGET_720P: Screen = { width: 360, height: 800, density: 2 };

afterEach(() => {
  jest.dontMock('react-native');
  jest.dontMock('expo-device');
  jest.resetModules();
});

describe('getDeviceTier', () => {
  test('the RAM signal is Android-only: 3 GB iPhones keep their pixel tier', () => {
    expect(loadTier({ width: 414, height: 896, density: 2, os: 'ios' }, 3 * GB).getDeviceTier()).toBe('high');
    expect(loadTier({ width: 375, height: 667, density: 2, os: 'ios' }, 2 * GB).getDeviceTier()).toBe('medium');
  });

  test('a 720x1600 density-2 phone with 3 GB of RAM is low, not medium', () => {
    const tier = loadTier(BUDGET_720P, 3 * GB);
    expect(tier.getDeviceTier()).toBe('low');
    expect(tier.shouldSimplifyAnimations()).toBe(true);
    expect(tier.shouldPremountSpriteLayers()).toBe(false);
  });

  test('a 2 GB reading is low as well; a 4 GB reading falls through to the pixel heuristic', () => {
    expect(loadTier(BUDGET_720P, 2 * GB).getDeviceTier()).toBe('low');
    // Android reports a little under the marketed figure (kernel reserve).
    expect(loadTier(BUDGET_720P, 3.7 * GB).getDeviceTier()).toBe('medium');
  });

  test('without expo-device the pixel heuristic is the fallback', () => {
    expect(loadTier(BUDGET_720P, 'missing').getDeviceTier()).toBe('medium');
    expect(loadTier({ width: 320, height: 480, density: 1.5 }, 'missing').getDeviceTier()).toBe('low');
    expect(loadTier({ width: 412, height: 915, density: 3 }, 'missing').getDeviceTier()).toBe('high');
  });

  test('a null or invalid memory reading is ignored, not treated as zero', () => {
    expect(loadTier(BUDGET_720P, null).getDeviceTier()).toBe('medium');
    expect(loadTier(BUDGET_720P, Number.NaN).getDeviceTier()).toBe('medium');
    expect(loadTier(BUDGET_720P, 0).getDeviceTier()).toBe('medium');
  });

  test('plenty of RAM never promotes a low-pixel device', () => {
    expect(loadTier({ width: 320, height: 480, density: 1.5 }, 8 * GB).getDeviceTier()).toBe('low');
  });

  test('only the high tier pre-mounts sprite layers', () => {
    expect(loadTier({ width: 412, height: 915, density: 3 }, 8 * GB).shouldPremountSpriteLayers()).toBe(true);
    expect(loadTier(BUDGET_720P, 8 * GB).shouldPremountSpriteLayers()).toBe(false);
  });

  test('the tier is computed once and cached', () => {
    const tier = loadTier(BUDGET_720P, 3 * GB);
    const first = tier.getDeviceTier();
    const rn = require('react-native');
    rn.PixelRatio.get = () => 3;
    expect(tier.getDeviceTier()).toBe(first);
  });
});
