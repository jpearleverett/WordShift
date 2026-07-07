/**
 * Tutorial persistence helpers.
 *
 * The old full-screen Tutorial overlay component was replaced by the multi-screen
 * onboarding flow (src/services/onboarding.ts + src/components/FoxGuide.tsx). Only
 * these AsyncStorage helpers remain, still referenced by useOnboardingFlow and
 * Settings > Reset All for backward compatibility with existing installs. The
 * key also rides in cloudSave SYNC_KEYS. Kept as a `.tsx` so the existing import
 * paths ('./Tutorial' / '../components/Tutorial') resolve unchanged.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TUTORIAL_KEY = 'wordshift_tutorial_completed';

/** Check if the (legacy) tutorial-completed flag is set. */
export async function hasTutorialCompleted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(TUTORIAL_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/** Mark the tutorial as completed. */
export async function markTutorialCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
  } catch {
    // Non-critical.
  }
}

/** Reset tutorial state (Settings > Reset All / tests). */
export async function resetTutorial(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TUTORIAL_KEY);
  } catch {
    // Non-critical.
  }
}
