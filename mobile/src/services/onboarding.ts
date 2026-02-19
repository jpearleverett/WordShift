import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'wordshift_onboarding_step';

/**
 * Onboarding steps for the redesigned intro flow.
 *
 * Flow:
 * 1. home_empty      → Player sees empty home, guided to invite Fox
 * 2. fox_invited     → Fox intro dialogue plays on home screen
 * 3. going_to_puzzle → Fox says "follow me!" — transitioning to puzzle
 * 4. puzzle_tutorial → Guided easy puzzle with Fox tips
 * 5. puzzle_complete → Victory shown, Fox congratulates
 * 6. going_to_pit    → Fox introduces word harvesting concept
 * 7. pit_intro       → Fox explains the Offering Pit on the pit screen
 * 8. pit_offering    → Auto-offer words, Fox reacts to amber earned
 * 9. returning_home  → Transitioning back to home screen
 * 10. unlock_explained → Fox explains amber & unlock system
 * 11. complete        → Player is free
 */
export type OnboardingStep =
  | 'not_started'
  | 'home_empty'
  | 'fox_invited'
  | 'going_to_puzzle'
  | 'puzzle_tutorial'
  | 'puzzle_complete'
  | 'going_to_pit'
  | 'pit_intro'
  | 'pit_offering'
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
    "Hey — down here by the den.\nTap the invite and let me in.",
  ],

  // Step 2: Fox just invited — intro dialogue
  fox_invited: [
    "You opened the door for me. Thank you.\nI'm Ember.",
    "Now that we're properly met, let me show you what this place is built on.",
    "Words shift. Patterns form. The house grows with every puzzle.",
    "Come on — one quick puzzle together, then we build.",
  ],

  // Step 3: On puzzle screen — guide through the puzzle
  puzzle_tutorial_intro: [
    "See these rows? We'll move one letter from here into the row below.",
  ],
  puzzle_tutorial_pick: [
    "Start with the glowing letter.",
  ],
  puzzle_tutorial_drop: [
    "Good. Now drop it into the glowing slot below.",
  ],
  puzzle_tutorial_valid_move: [
    "You did it! Keep going until you reach the end!",
  ],
  puzzle_tutorial_invalid: [
    "Hmm, that didn't make a real word.\nTry undoing and picking a different spot!",
  ],
  puzzle_tutorial_complete: [
    "Perfect. You felt that click, right? That's how we build this place.",
    "Those words you just formed? They're worth something.\nFollow me — I'll show you where they go.",
  ],

  // Step 5.5: Transition to pit — Fox introduces word harvesting
  going_to_pit: [
    "Those words you just formed? They're worth something.\nFollow me — I'll show you where they go.",
  ],

  // Step 6: On pit screen — Fox explains the Offering Pit
  pit_intro: [
    "This is where your words end up after a puzzle.\nThey wait here until you offer them.",
    "When you offer them, they turn into amber 💎 — that's what builds the house.",
    "Let's try it. Tap the floating words to offer them to the house.",
  ],

  // Step 7: After auto-offer completes on pit screen
  pit_offering_complete: [
    "See? Amber, from the words you formed.\nEvery puzzle feeds the house a little more.",
  ],

  // Step 8: Back on home screen — explain unlocks and keep playing
  unlock_explained: [
    "Now you know the cycle.\nSolve puzzles, offer words, earn amber 💎",
    "Amber builds rooms, and rooms let us invite more friends in.",
    "Keep playing and we'll fill this whole house together.\nThe others are going to love you.\nThey need you.",
  ],
};
