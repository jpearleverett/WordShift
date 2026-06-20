/**
 * Daily Login Reward
 *
 * Rewards the *act of opening the app* — the cheapest retention primitive in the
 * genre, and one WordShift was missing (the play-streak only pays out when you
 * actually solve a puzzle). A 7-day escalating cycle with a Day-7 jackpot creates
 * a "don't break the chain" pull that complements the solving streak.
 *
 * Local-day bucketing only (services/dateUtils) — never UTC/toISOString.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString, daysAgoLocal } from './dateUtils';
import { awardBonusAmber } from './amberCurrency';

const STORAGE_KEY = 'wordshift_daily_login';

/** Amber granted on each day of the 7-day cycle (Day 7 is the jackpot). */
export const DAILY_LOGIN_REWARDS = [10, 15, 20, 25, 30, 40, 75] as const;
export const DAILY_LOGIN_CYCLE_LENGTH = DAILY_LOGIN_REWARDS.length;

interface DailyLoginState {
  /** Local calendar day (YYYY-MM-DD) the reward was last claimed. */
  lastClaimedDate: string | null;
  /** Current position in the 1..7 cycle of the last claim. */
  cycleDay: number;
}

export interface DailyLoginGrant {
  /** Day within the cycle that was just claimed (1..7). */
  day: number;
  /** Amber granted for this claim. */
  amount: number;
  /** New amber balance after the grant. */
  newBalance: number;
  /** True if the previous chain lapsed and the cycle reset to Day 1. */
  reset: boolean;
}

let cache: DailyLoginState | null = null;

const getDefault = (): DailyLoginState => ({ lastClaimedDate: null, cycleDay: 0 });

async function load(): Promise<DailyLoginState> {
  if (cache) return cache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      cache = JSON.parse(stored);
      return cache!;
    }
  } catch {
    // fall through to default
  }
  cache = getDefault();
  return cache;
}

async function save(state: DailyLoginState): Promise<void> {
  cache = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Non-critical — the in-memory cache keeps the session consistent.
  }
}

/** Test/reset helper — clears the in-memory cache. */
export function _clearDailyLoginCache(): void {
  cache = null;
}

/**
 * Determine which cycle day a claim made today would land on, given prior state,
 * without mutating anything. Exposed for the UI preview ("Day N — reward").
 */
export function computeNextCycleDay(state: DailyLoginState, today: string): { day: number; reset: boolean } {
  if (!state.lastClaimedDate) {
    return { day: 1, reset: false };
  }
  const gap = daysAgoLocal(state.lastClaimedDate); // 0 = today, 1 = yesterday, ...
  if (gap === 1) {
    // Consecutive day — advance, wrapping 7 -> 1 so the jackpot recurs weekly.
    return { day: (state.cycleDay % DAILY_LOGIN_CYCLE_LENGTH) + 1, reset: false };
  }
  // Missed one or more days (gap > 1) — the chain lapsed, restart at Day 1.
  return { day: 1, reset: true };
}

/**
 * Whether a reward is available to claim today (i.e. not already claimed).
 */
export async function isDailyLoginRewardAvailable(): Promise<boolean> {
  const state = await load();
  return state.lastClaimedDate !== getLocalDateString();
}

/**
 * Preview of today's claimable reward without granting it. Returns null if
 * already claimed today.
 */
export async function peekDailyLoginReward(): Promise<{ day: number; amount: number; reset: boolean } | null> {
  const state = await load();
  const today = getLocalDateString();
  if (state.lastClaimedDate === today) return null;
  const { day, reset } = computeNextCycleDay(state, today);
  return { day, amount: DAILY_LOGIN_REWARDS[day - 1], reset };
}

/**
 * Claim today's login reward if one is available. Credits amber and advances the
 * cycle. Returns the grant, or null if already claimed today. Safe to call once
 * per session at launch.
 */
export async function claimDailyLoginReward(): Promise<DailyLoginGrant | null> {
  const state = await load();
  const today = getLocalDateString();
  if (state.lastClaimedDate === today) return null;

  const { day, reset } = computeNextCycleDay(state, today);
  const amount = DAILY_LOGIN_REWARDS[day - 1];
  const newBalance = await awardBonusAmber(amount, 'daily_login');

  await save({ lastClaimedDate: today, cycleDay: day });

  return { day, amount, newBalance, reset };
}
