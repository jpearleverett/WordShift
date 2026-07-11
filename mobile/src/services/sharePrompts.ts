/**
 * Share soft-prompt — a single, gentle, one-time invitation to SHARE at a peak
 * moment. Mirrors monetizationPrompts.ts precisely: device-local pacing, a pure
 * exported decision, frequency-capped (fires at most once, ever).
 *
 * The game already nudges players to BUY (Patron / Remove-Ads) but never to
 * SHARE, even though the share card is the growth engine. This fires exactly
 * once, at the player's FIRST genuine peak: a first flawless win OR the first
 * phase transition, whichever lands first. It invites the player to open the
 * existing ShareResultModal. Celebratory, never naggy; suppressed during
 * onboarding and forever after it has fired.
 *
 * This is device UX pacing (like ad_pacing / monet prompts): the key is
 * intentionally NOT part of cloud sync (a fresh device may re-earn the one-time
 * nudge). Cleared by Settings → Reset All.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DialoguePhase } from '../types/homeWorld';

const STORAGE_KEY = 'wordshift_share_prompts';

export interface SharePromptState {
  /** Whether the one-time proactive share invite has already been shown. */
  sharePromptShown: boolean;
}

export interface SharePromptContext {
  /** This victory was flawless (0 hints / invalids / undos) — a natural peak. */
  isFlawlessWin: boolean;
  /** A phase transition is landing now — the other natural peak. */
  isPhaseTransition: boolean;
  /** Suppress entirely while the player is still in onboarding. */
  isOnboarding: boolean;
}

let cache: SharePromptState | null = null;

function getDefault(): SharePromptState {
  return { sharePromptShown: false };
}

async function load(): Promise<SharePromptState> {
  if (cache) return cache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        cache = { ...getDefault(), ...parsed };
        return cache!;
      }
    }
  } catch {
    /* ignore */
  }
  cache = getDefault();
  return cache;
}

async function save(): Promise<void> {
  if (!cache) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Copy — the one-time invite line. In-world + phase-aware (realistically only
// Phase 0-1, since it fires at the FIRST peak). Peak-agnostic wording (works
// whether the trigger was a flawless win or a phase transition). Exported so the
// noEmDashes sweep covers it. No em dashes.
// ---------------------------------------------------------------------------

export const SHARE_PROMPT_INVITES: Record<DialoguePhase, string> = {
  0: 'That was lovely. Someone you know would enjoy this cozy little place.',
  1: 'Beautifully done. Know someone who would settle in somewhere this warm?',
  2: 'A quiet, clean run. You could bring someone else in to share it.',
  3: 'That held together well. Others could sit with you a while.',
  4: 'Perfectly kept. There is always room for one more.',
  5: 'The pattern continues. Someone else could tend it beside you.',
};

/** The invite line for the current phase (clamped to 0-5). */
export function getSharePromptInvite(phase: number): string {
  const p = Math.max(0, Math.min(5, Math.round(phase))) as DialoguePhase;
  return SHARE_PROMPT_INVITES[p];
}

// ---------------------------------------------------------------------------
// Pure decision (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Whether to surface the one-time proactive share invite now. Pure: fires only
 * at a peak (flawless win or phase transition), never during onboarding, and
 * never once already shown.
 */
export function shouldShowSharePrompt(
  state: SharePromptState,
  context: SharePromptContext
): boolean {
  if (context.isOnboarding || state.sharePromptShown) return false;
  return context.isFlawlessWin || context.isPhaseTransition;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Decide whether to surface the one-time share invite now. If it returns true it
 * has already marked the prompt as shown, so the caller just presents the UI
 * (open the ShareResultModal). Mirrors consumePatronNudge.
 */
export async function consumeSharePrompt(context: SharePromptContext): Promise<boolean> {
  const state = await load();
  const show = shouldShowSharePrompt(state, context);
  if (show) {
    state.sharePromptShown = true;
    cache = state;
    await save();
  }
  return show;
}

/** Clear share soft-prompt pacing state (for Settings → Reset All). */
export async function clearSharePrompts(): Promise<void> {
  cache = getDefault();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
