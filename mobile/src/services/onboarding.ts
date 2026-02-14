import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'wordshift_onboarding_step';

/**
 * Onboarding steps for the redesigned intro flow.
 *
 * Flow:
 * 1. home_empty     → Player sees empty home, guided to invite Fox
 * 2. fox_invited    → Fox intro dialogue plays on home screen
 * 3. going_to_puzzle → Fox says "follow me!" — transitioning to puzzle
 * 4. puzzle_tutorial → Guided easy puzzle with Fox tips
 * 5. puzzle_complete → Victory shown, Fox congratulates
 * 6. returning_home  → Transitioning back to home screen
 * 7. unlock_explained → Fox explains amber & unlock system
 * 8. complete        → Player is free
 */
export type OnboardingStep =
  | 'not_started'
  | 'home_empty'
  | 'fox_invited'
  | 'going_to_puzzle'
  | 'puzzle_tutorial'
  | 'puzzle_complete'
  | 'returning_home'
  | 'unlock_explained'
  | 'complete';

let cachedStep: OnboardingStep | null = null;

/**
 * Get the current onboarding step from storage.
 */
export async function getOnboardingStep(): Promise<OnboardingStep> {
  if (cachedStep !== null) return cachedStep;
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_KEY);
    const step = (val as OnboardingStep) || 'not_started';
    cachedStep = step;
    return step;
  } catch {
    return 'not_started';
  }
}

/**
 * Advance to the next onboarding step and persist it.
 */
export async function setOnboardingStep(step: OnboardingStep): Promise<void> {
  cachedStep = step;
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, step);
  } catch {}
}

/**
 * Check if onboarding is complete (or was previously completed).
 */
export async function isOnboardingComplete(): Promise<boolean> {
  const step = await getOnboardingStep();
  return step === 'complete';
}

/**
 * Reset onboarding state (for testing/dev).
 */
export async function resetOnboarding(): Promise<void> {
  cachedStep = null;
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch {}
}

/**
 * Fox dialogue lines for each onboarding step.
 * These are shown via the FoxGuide overlay.
 */
export const ONBOARDING_FOX_LINES: Record<string, string[]> = {
  // Step 1: Empty home — guide to invite Fox
  home_empty: [
    "Oh! Is someone there?\nTap the den to let me in!",
  ],

  // Step 2: Fox just invited — intro dialogue
  fox_invited: [
    "Hello! I'm Ember.\nWelcome to our little home.",
    "We've been waiting for someone like you.\n...A long time.",
    "This place is going to be something special.\nI can feel it in the words.",
    "But first, let me show you what we do here.\nFollow me!",
  ],

  // Step 3: On puzzle screen — guide through the puzzle
  puzzle_tutorial_intro: [
    "See these words? Each one is made of letters you can move.",
  ],
  puzzle_tutorial_pick: [
    "Tap a letter in the highlighted word to pick it up!",
  ],
  puzzle_tutorial_drop: [
    "Now tap a spot in the next word to drop it in.\nBoth words need to be real English words!",
  ],
  puzzle_tutorial_valid_move: [
    "You did it! Keep going until you reach the end!",
  ],
  puzzle_tutorial_invalid: [
    "Hmm, that didn't make a real word.\nTry undoing and picking a different spot!",
  ],
  puzzle_tutorial_complete: [
    "See? You're a natural!",
  ],

  // Step 4: Back on home screen — explain unlocks
  unlock_explained: [
    "That was wonderful!\nEvery puzzle you solve earns you amber 💎",
    "You can use amber to build new rooms and invite more friends!",
    "Keep solving puzzles and soon this place will be full of life.\nThe others are going to love you.\nThey need you.",
  ],
};
