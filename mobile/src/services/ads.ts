/**
 * Ads layer.
 *
 * A real ad SDK is a NATIVE module that breaks Expo Go, so it sits behind an
 * `AdProvider` interface — same pattern as iap.ts / cloudSave.ts. The DEFAULT
 * provider is a `NoOpAdProvider` (ad calls resolve to "no ad shown / reward
 * not granted"), which keeps Expo Go / Jest working; at boot App.tsx registers
 * the live AdMob adapter (`providers/googleAdMobAds.ts`) via `setAdProvider()`,
 * so real builds serve ads whenever the ad unit ids are configured.
 *
 * This module owns ALL ad-policy logic (Patron suppression, interstitial cadence,
 * rewarded daily cap) as pure/testable code. Rewarded ads are always OPT-IN (a
 * button the player taps); interstitials are the only auto-shown format and are
 * heavily gated.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DialoguePhase } from '../types/homeWorld';
import { getLocalDateString } from './dateUtils';
import { isAdFreeSync } from './entitlements';
import { logEvent } from './eventLogger';
import {
  REWARDED_DAILY_CAP,
  INTERSTITIAL_FREQUENCY_EARLY,
  INTERSTITIAL_FREQUENCY_LATE,
} from '../constants/gameBalance';

const STORAGE_KEY = 'wordshift_ad_pacing';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Opt-in rewarded placements (each is a button the player chooses to tap). */
export type RewardedPlacement =
  | 'victory_double'
  | 'hint_recovery'
  | 'quest_bonus'
  | 'speed_rescue'
  | 'daily_amber';

export interface RewardedResult {
  /** True only when the user watched the full ad and earned the reward. */
  completed: boolean;
  reason?: 'no_provider' | 'daily_cap' | 'not_ready' | 'dismissed' | 'error';
}

export interface AdProvider {
  initialize(): Promise<void>;
  loadRewarded(placement: RewardedPlacement): Promise<void>;
  showRewarded(placement: RewardedPlacement): Promise<RewardedResult>;
  /** Returns true if an interstitial was actually shown. */
  showInterstitial(): Promise<boolean>;
  /** iOS App Tracking Transparency — call at first ad exposure, not launch. */
  requestATTIfNeeded(): Promise<void>;
  /** GDPR/UK consent (UMP/CMP). */
  requestConsentIfNeeded(): Promise<void>;
  /**
   * Whether the CMP requires a persistent privacy-options entry point (UMP
   * privacyOptionsRequirementStatus REQUIRED — EEA users). Optional so bare
   * providers/test fakes predating the consent pass keep compiling; absent
   * reads as false.
   */
  privacyOptionsRequired?(): Promise<boolean>;
  /** Present the CMP privacy-options form so the user can revisit ad consent. */
  showPrivacyOptions?(): Promise<void>;
  isReady(): boolean;
  getName(): string;
}

interface AdPacingState {
  /** puzzlesSolved value at the last interstitial shown. */
  lastInterstitialPuzzle: number;
  /** Local day string of the rewarded counter. */
  rewardedDate: string;
  /** Rewarded grants claimed on rewardedDate. */
  rewardedCount: number;
}

// ---------------------------------------------------------------------------
// No-op provider (placeholder until a real ad SDK is connected)
// ---------------------------------------------------------------------------

class NoOpAdProvider implements AdProvider {
  async initialize(): Promise<void> {
    console.log('[Ads] NoOp provider - no ad SDK configured');
  }
  async loadRewarded(): Promise<void> {}
  async showRewarded(): Promise<RewardedResult> {
    return { completed: false, reason: 'no_provider' };
  }
  async showInterstitial(): Promise<boolean> {
    return false;
  }
  async requestATTIfNeeded(): Promise<void> {}
  async requestConsentIfNeeded(): Promise<void> {}
  async privacyOptionsRequired(): Promise<boolean> {
    return false;
  }
  async showPrivacyOptions(): Promise<void> {}
  isReady(): boolean {
    return false;
  }
  getName(): string {
    return 'Not Connected';
  }
}

// ---------------------------------------------------------------------------
// Manager + pacing storage
// ---------------------------------------------------------------------------

let provider: AdProvider = new NoOpAdProvider();
let pacingCache: AdPacingState | null = null;
let consentAndAttRequested = false;

/** Swap in a real ad provider during app initialization. */
export function setAdProvider(newProvider: AdProvider): void {
  provider = newProvider;
}

/**
 * Request GDPR/UMP consent + iOS ATT exactly once per session. NOTE: with the
 * live AdMob adapter this is a SAFETY NET, not the primary consent path — that
 * adapter resolves UMP consent in a background chain kicked off by its own
 * initialize() (consent → SDK init → preload; non-blocking, so initAds() and
 * cold start never wait on it), meaning consent is normally settled long before
 * a show path reaches this call. For providers that do NOT resolve consent at
 * init, this lazy call still guarantees consent/ATT precede the very first ad.
 * Idempotent: the OS won't re-prompt once the user has decided, and the session
 * flag prevents redundant calls. Safe on NoOp (both methods are no-ops there).
 * Called from the interstitial + rewarded show paths so it precedes the very
 * first ad on whichever path fires first.
 */
export async function ensureAdConsent(): Promise<void> {
  if (consentAndAttRequested) return;
  consentAndAttRequested = true;
  // Consent (UMP) first, then iOS ATT — both non-fatal; ads serve
  // non-personalized if either is declined or unavailable.
  try {
    await provider.requestConsentIfNeeded();
  } catch {
    /* non-fatal */
  }
  try {
    await provider.requestATTIfNeeded();
  } catch {
    /* non-fatal */
  }
}

/**
 * Whether the CMP requires a persistent privacy-options entry point (Google
 * EU User Consent Policy). Drives the Settings → "Privacy Options" row.
 */
export async function privacyOptionsRequired(): Promise<boolean> {
  try {
    return (await provider.privacyOptionsRequired?.()) ?? false;
  } catch {
    return false;
  }
}

/** Present the CMP privacy-options form so the user can change ad consent. */
export async function showPrivacyOptions(): Promise<void> {
  try {
    await provider.showPrivacyOptions?.();
  } catch {
    /* non-fatal */
  }
}

export function getAdProviderName(): string {
  return provider.getName();
}

/** Whether the registered ad provider is actually initialized and ready. */
export function isAdsReady(): boolean {
  return provider.isReady();
}

function getDefaultPacing(): AdPacingState {
  return { lastInterstitialPuzzle: 0, rewardedDate: '', rewardedCount: 0 };
}

async function loadPacing(): Promise<AdPacingState> {
  if (pacingCache) return pacingCache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        pacingCache = { ...getDefaultPacing(), ...parsed };
        return pacingCache!;
      }
    }
  } catch {
    /* ignore */
  }
  pacingCache = getDefaultPacing();
  return pacingCache;
}

async function savePacing(): Promise<void> {
  if (!pacingCache) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pacingCache));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Pure policy helpers (exported for testing)
// ---------------------------------------------------------------------------

/** Interstitial cadence by phase; the gap only widens toward the reveal (early = light touch, Phase 3 doubled, Phase 4+ silenced in shouldShowInterstitial). */
export function interstitialFrequency(phase: DialoguePhase): number {
  return (phase as number) <= 2 ? INTERSTITIAL_FREQUENCY_EARLY : INTERSTITIAL_FREQUENCY_LATE;
}

/**
 * Pure decision: should an interstitial show now? Ad-free entitlement + every narrative-beat
 * exemption is passed in as `exempt` so the single caller (App.tsx) keeps all the
 * "never interrupt a ceremony / final puzzle / Phase 5" rules in one place.
 */
export function shouldShowInterstitial(params: {
  puzzlesSolved: number;
  lastInterstitialPuzzle: number;
  phase: DialoguePhase;
  isAdFree: boolean;
  exempt: boolean;
}): boolean {
  const { puzzlesSolved, lastInterstitialPuzzle, phase, isAdFree, exempt } = params;
  if (isAdFree || exempt) return false;
  // Tonal protection for the descent (assessment: an interstitial is not just
  // a churn risk, it is damage to the product's single differentiator — a
  // bright candy ad firing after a Phase-3 "WHY DOES IT MATTER?" victory
  // shatters the dread). Phase 4+ (the black-sky reveal and the whole serene
  // endgame) suppresses interstitials entirely; Phase 3 doubles the gap so
  // they become rare, not gone.
  if ((phase as number) >= 4) return false;
  const freq = interstitialFrequency(phase) * ((phase as number) >= 3 ? 2 : 1);
  return puzzlesSolved - lastInterstitialPuzzle >= freq;
}

/**
 * Pure policy: may a DAILY CHALLENGE victory exit show an interstitial at this
 * phase? Today App.tsx unconditionally exempts the daily from interstitials;
 * this policy exists so App can instead exempt it only where the exemption
 * earns its keep. The daily is the game's most reliable, habit-driven session
 * — at the bright phases (0-2) an interstitial there is tonally harmless and
 * monetizes the stickiest traffic, while Phase 3+ stays exempt to protect the
 * dread arc, the ceremonies, and the serene endgame (the same tonal-protection
 * rationale as shouldShowInterstitial, which independently suppresses Phase 4+
 * entirely and doubles the gap at Phase 3). Wired into App.tsx's
 * maybeShowVictoryInterstitial daily-exemption term.
 */
export function isDailyInterstitialAllowed(phase: number): boolean {
  return phase <= 2;
}

/**
 * Pure policy: may a BANNER show on a menu/utility surface right now? Banners are
 * the lowest-friction format (a small static strip on a screen the player is
 * browsing, never over gameplay), but they still follow the same tonal contract
 * as interstitials: suppressed for ad-free holders, during onboarding, and from
 * the reveal on (Phase 4+), so the dread arc and the serene endgame stay clean.
 * The BannerAd component consumes this; kept pure/exported for testing.
 */
export function shouldShowBanner(params: {
  phase: DialoguePhase;
  isAdFree: boolean;
  onboarding: boolean;
}): boolean {
  if (params.isAdFree || params.onboarding) return false;
  if ((params.phase as number) >= 4) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function initAds(): Promise<void> {
  await loadPacing();
  try {
    await provider.initialize();
  } catch (error) {
    console.warn('[Ads] provider initialize failed:', error);
  }
}

/** Whether the rewarded daily cap has been reached for the current local day. */
export async function isRewardedCapReached(): Promise<boolean> {
  const pacing = await loadPacing();
  const today = getLocalDateString();
  if (pacing.rewardedDate !== today) return false; // new day → counter resets on next claim
  return pacing.rewardedCount >= REWARDED_DAILY_CAP;
}

/**
 * Show an opt-in rewarded ad. Returns `{ completed: true }` only when the player
 * watched the full ad. Enforces the daily cap; increments it on a completed view.
 * Note: rewarded is a player-chosen boost, so it is available to Patron holders too
 * (Patron removes *interstitials*, not opt-in rewards).
 */
export async function showRewarded(placement: RewardedPlacement): Promise<RewardedResult> {
  if (await isRewardedCapReached()) {
    logEvent({ type: 'ad_availability', data: { format: 'rewarded', placement, result: 'daily_cap' } });
    return { completed: false, reason: 'daily_cap' };
  }
  // First ad exposure may be a rewarded clip — request consent/ATT before show.
  await ensureAdConsent();
  const result = await provider.showRewarded(placement);
  logEvent({ type: 'ad_availability', data: { format: 'rewarded', placement,
    result: result.completed ? 'completed' : result.reason ?? 'unavailable' } });
  if (result.completed) {
    const pacing = await loadPacing();
    const today = getLocalDateString();
    if (pacing.rewardedDate !== today) {
      pacing.rewardedDate = today;
      pacing.rewardedCount = 0;
    }
    pacing.rewardedCount += 1;
    pacingCache = pacing;
    await savePacing();
  }
  return result;
}

/**
 * Maybe show an interstitial on a puzzle→home/next transition. Suppressed for
 * ad-free holders, for any caller-supplied exemption, and unless the cadence
 * threshold is met. Records the showing so the counter advances.
 */
export async function maybeShowInterstitial(params: {
  puzzlesSolved: number;
  phase: DialoguePhase;
  exempt?: boolean;
}): Promise<boolean> {
  const pacing = await loadPacing();
  const allowed = shouldShowInterstitial({
    puzzlesSolved: params.puzzlesSolved,
    lastInterstitialPuzzle: pacing.lastInterstitialPuzzle,
    phase: params.phase,
    isAdFree: isAdFreeSync(),
    exempt: params.exempt ?? false,
  });
  if (!allowed) {
    logEvent({ type: 'ad_availability', data: { format: 'interstitial', phase: params.phase, result: 'suppressed' } });
    return false;
  }

  // First ad exposure may be an interstitial — request consent/ATT before show.
  await ensureAdConsent();
  const shown = await provider.showInterstitial();
  logEvent({ type: 'ad_availability', data: { format: 'interstitial', phase: params.phase,
    result: shown ? 'shown' : 'unavailable' } });
  if (shown) {
    pacing.lastInterstitialPuzzle = params.puzzlesSolved;
    pacingCache = pacing;
    await savePacing();
  }
  return shown;
}

/** Clear ad pacing state (for Settings → Reset All). */
export async function clearAdPacing(): Promise<void> {
  pacingCache = getDefaultPacing();
  // A full reset re-arms the lazy consent/ATT request; the OS won't re-prompt
  // once the user has decided, so this is harmless and keeps "Reset All" honest.
  consentAndAttRequested = false;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
