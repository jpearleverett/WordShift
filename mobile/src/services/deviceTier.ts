import { Platform, PixelRatio, Dimensions } from 'react-native';

/**
 * Device capability detection for animation scaling and the pre-mounted art
 * budget. Two signals, checked in order:
 *
 *   1. Installed RAM (expo-device's `totalMemory`), ANDROID ONLY: at or below
 *      LOW_TIER_RAM_BYTES the device is 'low' outright. The 2026 budget phones
 *      that actually struggle (720x1600 at density 2.0 with 2-3 GB on 4x
 *      Cortex-A53 class silicon) pass the pixel heuristic below as 'medium',
 *      so RAM is the signal that catches them. iOS hardware in the same RAM
 *      band (iPhone 8 through the second SE, 2-3 GB) runs the full set fine,
 *      so the threshold is never applied there.
 *   2. The pixel heuristic (screen density and resolution), kept as the
 *      fallback when the RAM signal is unavailable (Expo Go without the
 *      module, web, a null reading) and as the finer medium/high split.
 *
 * The result is cached for the life of the process so every gate that reads
 * it stays a one-time cost.
 */

export type DeviceTier = 'high' | 'medium' | 'low';

/** Android devices reporting this much installed RAM or less are treated as 'low'. */
export const LOW_TIER_RAM_BYTES = 3 * 1024 * 1024 * 1024;

let cachedTier: DeviceTier | null = null;

/**
 * Installed RAM in bytes, or null when the signal is unavailable. Loaded
 * through a guarded literal require like the other optional native modules
 * so Jest and Expo Go keep working without it.
 */
function readTotalMemoryBytes(): number | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Optional native module; a missing install must fall back to the pixel heuristic.
    const device = require('expo-device') as { totalMemory?: number | null } | null;
    const total = device?.totalMemory;
    return typeof total === 'number' && Number.isFinite(total) && total > 0 ? total : null;
  } catch {
    return null;
  }
}

export function getDeviceTier(): DeviceTier {
  if (cachedTier) return cachedTier;

  const density = PixelRatio.get();
  const { width, height } = Dimensions.get('window');
  const totalPixels = width * height * density * density;
  const isAndroid = Platform.OS === 'android';
  const totalMemory = isAndroid ? readTotalMemoryBytes() : null;

  if (isAndroid && totalMemory !== null && totalMemory <= LOW_TIER_RAM_BYTES) {
    // Low-RAM Android hardware is 'low' whatever its screen says.
    cachedTier = 'low';
  } else if (isAndroid) {
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

/**
 * Whether decoded art may be held resident ahead of its first use (the walk
 * atlases and idle/talk layers every animal used to pre-mount). Only the
 * high tier pays that memory up front; lower tiers mount on demand.
 */
export function shouldPremountSpriteLayers(): boolean {
  return getDeviceTier() === 'high';
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
