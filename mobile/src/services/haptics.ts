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

// ---------------------------------------------------------------------------
// Phase-weighted compound haptics for the CORE VERB. The tile springs age
// across five phase steps and the sounds swap to dark mirrors, but the hand
// felt the identical hit at phase 0 and phase 4. These ride the hapticsEnabled
// gate like everything above (haptics have their own toggle — deliberately NOT
// coupled to reducedMotion, matching PhaseTransitionOverlay's doctrine that
// reduced motion governs motion, not touch).
// ---------------------------------------------------------------------------

/** Gap before the dread after-strike. 90ms+ so no Android motor reads the
 *  pair as an error buzz. */
const MOVE_AFTERSTRIKE_DELAY_MS = 110;

/**
 * The move-commit haptic, aged by phase:
 * - phases 0-2: the crisp single hit (heavy for drag-drop, medium for tap),
 *   exactly as before;
 * - phases 3-4: the same hit plus a delayed soft after-strike — the ponderous
 *   settle the friction-9 tile springs already show the eye;
 * - phase 5: a single soft medium. At rest.
 */
export async function hapticMoveCommit(phase: number, dragDrop: boolean): Promise<void> {
  if (!(await isEnabled())) return;
  try {
    if (phase >= 5) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }
    await Haptics.impactAsync(
      dragDrop ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium
    );
    if (phase >= 3) {
      setTimeout(() => {
        void hapticLight();
      }, MOVE_AFTERSTRIKE_DELAY_MS);
    }
  } catch {}
}
