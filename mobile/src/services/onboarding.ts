import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent } from './eventLogger';

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
 * 8. pit_offering    → Player taps each floating word to offer it; Fox reacts once all are offered
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

const VALID_STEPS: Set<string> = new Set([
  'not_started', 'home_empty', 'fox_invited', 'going_to_puzzle',
  'puzzle_tutorial', 'puzzle_complete', 'going_to_pit', 'pit_intro',
  'pit_offering', 'returning_home', 'unlock_explained', 'complete',
]);

/**
 * Get the current onboarding step from storage.
 */
export async function getOnboardingStep(): Promise<OnboardingStep> {
  if (cachedStep !== null) return cachedStep;
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_KEY);
    const step: OnboardingStep = (val && VALID_STEPS.has(val))
      ? (val as OnboardingStep)
      : 'not_started';
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
  // FTUE funnel analytics — fire-and-forget, never blocks the flow
  logEvent(
    step === 'complete'
      ? { type: 'onboarding_complete' }
      : { type: 'onboarding_step', data: { step } }
  );
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
    "Oh! Hello up there! I'm down here, by the little den.\nTap the invite and I'll come say hello properly!",
  ],

  // Step 2: Fox just invited — intro dialogue (two beats; the greeting and the
  // house-grows beat are merged so the corridor loses a tap). Warm on the
  // surface, with ONE faint wrong-note (the "someone like you... for the
  // longest time" seed): adorable eagerness on a first read, quietly ominous
  // once the descent lands. Per the narrative vision's Early Darkness Seeds —
  // the trap is set in warmth.
  fox_invited: [
    "You let me in! Oh, I hoped you would. I'm Ember!\nAnd here is the wonderful part: every puzzle you solve makes this house a little more real. It is my favorite thing.",
    "Come on, one quick puzzle together, then we build. I have been hoping for someone like you for the longest time.",
  ],

  // Step 3: On puzzle screen — guide through the puzzle. This intro beat is the
  // move mechanic's first mention, so it also names BOTH input paths: many
  // players reach for drag first and the old tutorial only ever taught tap.
  puzzle_tutorial_intro: [
    "See these rows? We'll move one letter from here into the row below.\nYou can tap a letter and tap where it goes, or just drag it down. Whatever feels good.",
  ],
  puzzle_tutorial_pick: [
    "See that glowing letter? Give it a tap!",
  ],
  puzzle_tutorial_drop: [
    "Beautiful! Now tuck it into the glowing spot below.",
  ],
  // Between-moves reinforcement (App.tsx renders index 0 after the first
  // guided move). This is also where Fox teaches the core rule: BOTH resulting
  // words must stay valid, and the green check / red cross ghost previews show
  // which drops keep them that way.
  puzzle_tutorial_valid_move: [
    "There's that little click, it landed! A green check means both words stay real. A red cross means one would break.\nWrong move? Tap undo. Stuck? Tap hint.",
  ],
  puzzle_tutorial_invalid: [
    "Hmm, that didn't land quite right.\nTry undoing and picking a different spot.",
  ],
  puzzle_tutorial_complete: [
    "Perfect. Feel how the house settled just a little? That's what your words do.",
    "And the words you just made? Oh, they don't simply vanish, they're worth something!\nCome with me, I want to show you my favorite spot.",
  ],

  // Step 5.5: Transition to pit — Fox introduces word harvesting
  going_to_pit: [
    "And the words you just made? Oh, they don't simply vanish, they're worth something!\nCome with me, I want to show you my favorite spot.",
  ],

  // Step 6: On pit screen — Fox explains the Offering Pit (ONE beat: the player
  // already had their first-win reward moment, so the whole explanation lands
  // in a single card and the corridor loses a tap).
  pit_intro: [
    "Here we are, the pit! Every word you solve drifts down here afterwards.\nOffer your words and they turn to amber, the warm gold that builds our house. Go on, it loves being fed. Most things here do, funnily enough.",
  ],

  // Step 6.5: On the pit screen, before the player has offered — a standing
  // prompt telling them the required action (tap each floating word). The
  // FoxGuide shows this with NO continue button, so the only way forward is to
  // actually tap the words. (Previously this step had no instruction and the
  // prior line implied the pit auto-devoured — the #1 D1 stall point.)
  pit_offering_prompt: [
    "Tap each glowing word to offer it.\nWatch them turn to amber, one by one.",
  ],

  // Step 7: After the player has offered every word on the pit screen
  pit_offering_complete: [
    "See?! Real amber, from words you made up in your own head!\nThe pit takes what we offer and gives back what the house needs. It has never once missed a trade.",
  ],

  // Step 8: Back on home screen — explain unlocks and keep playing (kept to
  // two short beats so the text-dense tail right after the first-win dopamine
  // hit doesn't drag). The first beat carries the loop AND points at the pit
  // entrance below the house: the in-world path is the only way back to the
  // pit, so the player must hear where it lives before onboarding lets go of
  // their hand.
  unlock_explained: [
    "That's the whole happy loop! Solve puzzles, offer your words, and the amber builds our rooms and invites more friends.\nWhen you have words to offer, the pit waits just below the house. Scroll down and give it a tap.",
    "Come back each day, and we'll fill this house together. They need you.",
  ],
};
