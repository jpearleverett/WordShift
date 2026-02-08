import * as Haptics from 'expo-haptics';
import { getSettings } from './settings';

/**
 * Haptic feedback service for WordShift
 *
 * Wraps expo-haptics with settings-aware gating.
 * All haptic calls check the user's preference before firing.
 */

async function isEnabled(): Promise<boolean> {
  const settings = await getSettings();
  return settings.hapticsEnabled;
}

/** Light tap - letter selection, UI taps */
export async function hapticLight(): Promise<void> {
  if (!(await isEnabled())) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics not available on this device
  }
}

/** Medium tap - slot drop, successful move */
export async function hapticMedium(): Promise<void> {
  if (!(await isEnabled())) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
}

/** Heavy tap - victory, milestone, achievement */
export async function hapticHeavy(): Promise<void> {
  if (!(await isEnabled())) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {}
}

/** Success notification - valid word, puzzle complete */
export async function hapticSuccess(): Promise<void> {
  if (!(await isEnabled())) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

/** Warning notification - session ending, cooldown */
export async function hapticWarning(): Promise<void> {
  if (!(await isEnabled())) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
}

/** Error notification - invalid word, error shake */
export async function hapticError(): Promise<void> {
  if (!(await isEnabled())) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {}
}

/** Selection tick - scrolling through options, dialogue advance */
export async function hapticSelection(): Promise<void> {
  if (!(await isEnabled())) return;
  try {
    await Haptics.selectionAsync();
  } catch {}
}
