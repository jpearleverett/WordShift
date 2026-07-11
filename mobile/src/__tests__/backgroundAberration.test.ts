/**
 * Phase 0-1 "something is off" aberration gate.
 *
 * These pin the make-or-break contract for session one: the subtle background
 * aberration fires ONLY at Phase 0-1 (the descent itself must stay earned), is
 * OFF under reduced motion, and is skipped on low-tier devices — and stays rare
 * enough to read as "did I imagine that?" rather than a light show.
 *
 * Node env (no RN renderer), so react-native + the two service modules the
 * component imports are stubbed. We only exercise the pure exported helpers.
 */

jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: {
    create: (styles: any) => styles,
    absoluteFill: {},
  },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  Platform: { OS: 'ios' },
  Easing: {
    linear: (t: number) => t,
    inOut: () => (t: number) => t,
    out: () => (t: number) => t,
    in: () => (t: number) => t,
    sin: (t: number) => t,
    quad: (t: number) => t,
  },
  Animated: {
    View: 'AnimatedView',
    Value: jest.fn().mockImplementation((v: number) => ({
      _value: v,
      setValue: jest.fn(),
      stopAnimation: jest.fn(),
      interpolate: jest.fn().mockReturnValue('interpolated'),
    })),
    timing: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    sequence: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    delay: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    loop: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  },
}));

jest.mock('../services/settings', () => ({
  getSettingsSync: () => ({ reducedMotion: false }),
}));

jest.mock('../services/deviceTier', () => ({
  getMaxParticleCount: () => 10,
  getDeviceTier: () => 'high',
}));

import {
  isAberrationEnabled,
  ABERRATION_CHANCE,
  BREATH_ABERRATION_CHANCE,
} from '../components/AnimatedBackground';

describe('isAberrationEnabled — Phase 0-1 only gate', () => {
  test('enabled at Phase 0 and 1 on capable devices, reduced motion off', () => {
    expect(isAberrationEnabled(0, 'high', false)).toBe(true);
    expect(isAberrationEnabled(1, 'high', false)).toBe(true);
    expect(isAberrationEnabled(1, 'medium', false)).toBe(true);
  });

  test('disabled at Phase 2+ (the descent must stay earned, never spoiled early)', () => {
    expect(isAberrationEnabled(2, 'high', false)).toBe(false);
    expect(isAberrationEnabled(3, 'high', false)).toBe(false);
    expect(isAberrationEnabled(4, 'high', false)).toBe(false);
    expect(isAberrationEnabled(5, 'high', false)).toBe(false);
  });

  test('disabled on low-tier devices at every phase', () => {
    expect(isAberrationEnabled(0, 'low', false)).toBe(false);
    expect(isAberrationEnabled(1, 'low', false)).toBe(false);
  });

  test('disabled when reduced motion is on', () => {
    expect(isAberrationEnabled(0, 'high', true)).toBe(false);
    expect(isAberrationEnabled(1, 'medium', true)).toBe(false);
  });
});

describe('aberration frequency stays subtle', () => {
  test('both channels are rare but present (0 < chance < 0.1)', () => {
    expect(ABERRATION_CHANCE).toBeGreaterThan(0);
    expect(ABERRATION_CHANCE).toBeLessThan(0.1);
    expect(BREATH_ABERRATION_CHANCE).toBeGreaterThan(0);
    expect(BREATH_ABERRATION_CHANCE).toBeLessThan(0.1);
  });
});
