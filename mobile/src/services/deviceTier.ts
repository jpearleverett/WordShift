import { Platform, PixelRatio, Dimensions } from 'react-native';

/**
 * Simple device capability detection for animation scaling.
 * Uses screen density and resolution as heuristics — not perfect,
 * but sufficient to avoid hammering low-end Android devices
 * with 100+ simultaneous animations.
 */

export type DeviceTier = 'high' | 'medium' | 'low';

let cachedTier: DeviceTier | null = null;

export function getDeviceTier(): DeviceTier {
  if (cachedTier) return cachedTier;

  const density = PixelRatio.get();
  const { width, height } = Dimensions.get('window');
  const totalPixels = width * height * density * density;
  const isAndroid = Platform.OS === 'android';

  if (isAndroid) {
    // Low-end Android: low density or small screen
    if (density <= 1.5 || totalPixels < 500000) {
      cachedTier = 'low';
    } else if (density <= 2.5 || totalPixels < 1500000) {
      cachedTier = 'medium';
    } else {
      cachedTier = 'high';
    }
  } else {
    // iOS devices are generally capable — only older SEs are medium
    cachedTier = width <= 375 ? 'medium' : 'high';
  }

  return cachedTier;
}

/** Maximum number of simultaneous animation values to run */
export function getMaxAnimationCount(): number {
  switch (getDeviceTier()) {
    case 'low': return 30;
    case 'medium': return 60;
    case 'high': return 120;
  }
}

/** Whether to skip non-essential decorative animations (glow, pulse, shine) */
export function shouldSimplifyAnimations(): boolean {
  return getDeviceTier() === 'low';
}

/** Maximum number of particles to render */
export function getMaxParticleCount(): number {
  switch (getDeviceTier()) {
    case 'low': return 5;
    case 'medium': return 10;
    case 'high': return 15;
  }
}

/** Maximum number of confetti pieces */
export function getMaxConfettiCount(): number {
  switch (getDeviceTier()) {
    case 'low': return 15;
    case 'medium': return 35;
    case 'high': return 50;
  }
}
