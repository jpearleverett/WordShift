import AsyncStorage from '@react-native-async-storage/async-storage';
import { DialoguePhase } from '../types/homeWorld';
import { awardBonusAmber } from './amberCurrency';
import { logEvent } from './eventLogger';

const STORAGE_KEY = 'wordshift_monetization_state';

export const PATRON_AMBER_DRIP = 2;
export const REWARDED_AMBER_AMOUNT = 8;
export const REWARDED_AMBER_DAILY_CAP = 3;

interface MonetizationState {
  patronKeyOwned: boolean;
  rewardedAmberDay: string; // YYYY-MM-DD
  rewardedAmberClaims: number;
}

const defaultState = (): MonetizationState => ({
  patronKeyOwned: false,
  rewardedAmberDay: todayKey(),
  rewardedAmberClaims: 0,
});

let cache: MonetizationState | null = null;

function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

async function loadState(): Promise<MonetizationState> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MonetizationState>;
      if (
        typeof parsed.patronKeyOwned === 'boolean' &&
        typeof parsed.rewardedAmberDay === 'string' &&
        typeof parsed.rewardedAmberClaims === 'number'
      ) {
        cache = parsed as MonetizationState;
        return cache;
      }
    }
  } catch {
    // Ignore malformed state and fall back.
  }
  cache = defaultState();
  return cache;
}

async function saveState(): Promise<void> {
  if (!cache) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Non-critical.
  }
}

function normalizeRewardDay(state: MonetizationState): MonetizationState {
  const today = todayKey();
  if (state.rewardedAmberDay !== today) {
    state.rewardedAmberDay = today;
    state.rewardedAmberClaims = 0;
  }
  return state;
}

function rewardedBlockedText(phase: DialoguePhase): string {
  if ((phase as number) >= 4) {
    return 'No more bonus amber today. The pit is quiet.';
  }
  if ((phase as number) >= 2) {
    return 'No more bonus amber claims today.';
  }
  return 'You already claimed all bonus amber for today.';
}

export async function getMonetizationState(): Promise<{
  patronKeyOwned: boolean;
  rewardedAmberClaimsRemaining: number;
}> {
  const state = normalizeRewardDay(await loadState());
  return {
    patronKeyOwned: state.patronKeyOwned,
    rewardedAmberClaimsRemaining: Math.max(0, REWARDED_AMBER_DAILY_CAP - state.rewardedAmberClaims),
  };
}

export async function hasPatronKey(): Promise<boolean> {
  const state = await loadState();
  return state.patronKeyOwned;
}

export async function setPatronKeyOwned(owned: boolean): Promise<void> {
  const state = await loadState();
  state.patronKeyOwned = owned;
  cache = state;
  await saveState();
}

/**
 * Patron's Key perk: flat +2 amber per puzzle (queued to pit with other rewards).
 */
export async function getPatronAmberDripBonus(): Promise<number> {
  const state = await loadState();
  return state.patronKeyOwned ? PATRON_AMBER_DRIP : 0;
}

export async function getRewardedAmberClaimsRemaining(): Promise<number> {
  const state = normalizeRewardDay(await loadState());
  cache = state;
  await saveState();
  return Math.max(0, REWARDED_AMBER_DAILY_CAP - state.rewardedAmberClaims);
}

export async function claimRewardedAmber(phase: DialoguePhase): Promise<{
  success: boolean;
  amount: number;
  remainingClaims: number;
  newBalance?: number;
  message: string;
}> {
  const state = normalizeRewardDay(await loadState());
  if (state.rewardedAmberClaims >= REWARDED_AMBER_DAILY_CAP) {
    const remainingClaims = 0;
    return {
      success: false,
      amount: 0,
      remainingClaims,
      message: rewardedBlockedText(phase),
    };
  }

  const newBalance = await awardBonusAmber(REWARDED_AMBER_AMOUNT, 'rewarded_ad');
  state.rewardedAmberClaims += 1;
  cache = state;
  await saveState();

  const remainingClaims = Math.max(0, REWARDED_AMBER_DAILY_CAP - state.rewardedAmberClaims);
  logEvent({
    type: 'rewarded_bonus_claimed',
    data: {
      amount: REWARDED_AMBER_AMOUNT,
      remainingClaims,
      phase,
    },
  });

  return {
    success: true,
    amount: REWARDED_AMBER_AMOUNT,
    remainingClaims,
    newBalance,
    message: `+${REWARDED_AMBER_AMOUNT} amber claimed.`,
  };
}

export async function clearMonetizationState(): Promise<void> {
  cache = defaultState();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-critical.
  }
}
