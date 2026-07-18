import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent } from './eventLogger';

const ONBOARDING_KEY = 'wordshift_onboarding_step';

/**
 * Onboarding steps for the redesigned intro flow.
 *
 * Flow:
 * 1. cold_open_puzzle → Player solves curated EASY puzzle 0 without a guide
 * 2. home_empty       → Player sees empty home, guided to invite Fox
 * 3. fox_invited      → Fox acknowledges the solved puzzle
 * 4. going_to_pit     → Transitioning directly to the pit
 * 5. pit_intro        → Fox explains the Offering Pit on the pit screen
 * 6. pit_offering     → Player taps each floating word to offer it; Fox reacts once all are offered
 * 7. returning_home   → Transitioning back to home screen
 * 8. unlock_explained → Fox explains amber & unlock system
 * 9. complete         → Player is free
 *
 * The going_to_puzzle / puzzle_tutorial / puzzle_complete steps remain valid
 * so installs interrupted during the previous onboarding can resume safely.
 */
export type OnboardingStep =
  | 'not_started'
  | 'cold_open_puzzle'
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
  'not_started', 'cold_open_puzzle', 'home_empty', 'fox_invited', 'going_to_puzzle',
  'puzzle_tutorial', 'puzzle_complete', 'going_to_pit', 'pit_intro',
  'pit_offering', 'returning_home', 'unlock_explained', 'complete',
]);

// The cold-open opener is a self-directed first board, but it must not open on
// a soulless rules tooltip: for a game whose whole promise is warmth (later
// betrayed), the very first line should already be a voice, not a system
// message. A warm, unnamed presence teaches the moves (never points at the
// exact letter — the solve stays the player's own), then reacts with delight to
// the first successful move. The player learns who was speaking when they let
// Fox in on the home screen a moment later ("I'm Ember!"), which turns the
// opener into a quiet hook: something warm was already helping, before you ever
// invited it in. No em dashes (player-facing).
//
// Tester-verified clarity rule for this line: it must name the PHYSICAL
// ACTIONS in order (tap a letter up top, then tap a spot below). The earlier
// "move a letter down into the word below" read as abstract and first-timers
// tapped around lost. Charm never at the cost of the first 30 seconds.
export const COLD_OPEN_INSTRUCTION = "Oh, you're here! Tap a letter in the top word to pick it up, then tap a spot in the word below to drop it in. The green checks will show you the spots that make real words.";

/** Shown once, the instant the player lands their first valid move on the cold-open board. */
export const COLD_OPEN_FIRST_MOVE = "There! Oh, lovely. Feel how the whole house settled around that word? Keep going, you have the knack for this.";

/**
 * Shown once, the first time the player picks a letter up on the cold-open
 * board, while the ghost previews are visible and before the first committed
 * move. The same warm voice explains the marks the player is now looking at
 * (green check / red cross) and names undo, so the tools are taught at the
 * exact moment they first matter.
 */
export const COLD_OPEN_PREVIEW_TEACH = "Those little words show what each spot would spell. Tap a spot with a green check to drop your letter there. A red cross would not make a real word. And UNDO takes any move back, so try freely.";

export type ColdOpenLaunchRoute = 'restore' | 'home_empty' | 'new_board';

/**
 * A victory can persist before the onboarding step advances. On relaunch,
 * progress is the crash-safe proof that the cold-open board was already won;
 * it takes precedence over a stale PLAYING autosave left by that victory.
 */
export function resolveColdOpenLaunchRoute(
  hasPlayableAutosave: boolean,
  puzzlesSolved: number,
): ColdOpenLaunchRoute {
  if (puzzlesSolved >= 1) return 'home_empty';
  return hasPlayableAutosave ? 'restore' : 'new_board';
}

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

  // Fox arrives after the player has already solved the cold-open puzzle.
  // The final sentence keeps the original faint wrong-note intact.
  fox_invited: [
    "You let me in! Oh, I hoped you would. I'm Ember!\nYou already made this house a little more real with that puzzle. It is my favorite thing.",
    "Those words are already waiting below us. Come on, I want to show you where they went. I have been hoping for someone like you for the longest time.",
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
