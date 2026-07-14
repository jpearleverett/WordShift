import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TENDING_BASE,
  TENDING_GROWTH,
  TENDING_COST_CAP,
  TENDING_DAILY_BONUS_DISCOUNT,
  TENDING_MILESTONES,
  TENDING_VISUAL_SATURATION_LEVEL,
} from '../constants/gameBalance';
import { getLocalDateString } from './dateUtils';

/**
 * The Tending Shrine — the Phase-5 endgame loop.
 *
 * After the house is complete and the final puzzle has passed, the game enters
 * Phase 5 ("terrible peace"). Income never stops, but every other amber sink is
 * one-time or grants nothing. The Tending Shrine is a serene, soft-infinite,
 * **cosmetic-only** amber sink: the player spends amber to "deepen the pattern,"
 * advancing a Tending Level. Each level is a small cosmetic deepening of the
 * world they already own, trickles a genuinely-new serene dialogue line, and (at
 * milestones) fires a brief ward-ignition ceremony.
 *
 * Hard rules honored: never pay-to-skip-narrative (there is no narrative left to
 * skip — only deepening), expression-not-power, stays serene, never reveals the
 * phase system. The service does NOT spend amber — the caller calls
 * `amberCurrency.spendAmber(cost, 'tending')` first, then `applyTend` records the
 * deepening (mirrors the `sacrifice.ts` / `roomUpgrades.ts` convention).
 */

const STORAGE_KEY = 'wordshift_tending';

// ============================================================================
// Types
// ============================================================================

export interface TendingState {
  /** Soft-infinite Tending Level. */
  level: number;
  /** Lifetime amber tended (for stats / collection). */
  totalAmberTended: number;
  /** Local-day of the last tend — gates the once-per-day discount. */
  lastTendDate: string | null;
  /** Milestone levels whose ceremony has already fired. */
  milestonesSeen: number[];
  /**
   * Per-animal count of Phase-5 dialogue lines the animal has genuinely
   * delivered (its "caught up to" pointer into its growing line pool). Lets
   * `hasNewDialogue` be honest: the badge lights only while an animal has
   * undelivered lines, and re-lights when a Tending milestone unlocks a new one.
   */
  caughtUp: Record<string, number>;
}

export interface NextTendingInfo {
  /** The level the next deepening would reach. */
  nextLevel: number;
  /** Cost before the daily discount. */
  baseCost: number;
  /** Cost the player actually pays (discounted on the day's first tend). */
  cost: number;
  /** True when the once-per-day discount applies to this deepening. */
  dailyBonusApplied: boolean;
  /** `nextLevel` if it is a milestone level, else null. */
  milestone: number | null;
}

// ============================================================================
// In-memory cache
// ============================================================================

let tendingCache: TendingState | null = null;

/** Drop the in-memory cache after an external storage write (cloud restore). */
export function invalidateTendingCache(): void {
  tendingCache = null;
}

function getDefaultState(): TendingState {
  return {
    level: 0,
    totalAmberTended: 0,
    lastTendDate: null,
    milestonesSeen: [],
    caughtUp: {},
  };
}

// ============================================================================
// Cost curve (pure)
// ============================================================================

/**
 * Raw cost to reach `level` (1-indexed): round(BASE * GROWTH^level / 10) * 10,
 * capped. Pure — safe to call from render.
 */
export function getTendingCost(level: number): number {
  if (level <= 0) return TENDING_BASE;
  const raw = TENDING_BASE * Math.pow(TENDING_GROWTH, level);
  const rounded = Math.round(raw / 10) * 10;
  return Math.min(rounded, TENDING_COST_CAP);
}

/** Count of milestone lines unlocked at a given Tending Level. */
export function unlockedTendingLineCount(level: number): number {
  return TENDING_MILESTONES.filter(m => m <= level).length;
}

/**
 * Normalized "deepening" intensity in [0, 1] for visual scaling — how much the
 * world (pit glow/embers, house arrangement sigils) has deepened at a given
 * Tending Level. A sqrt curve gives an immediately-visible change at the first
 * few levels, saturating at the tuned visual cap so the effect never runs
 * away. Pure.
 */
export function getTendingIntensity(level: number): number {
  if (level <= 0) return 0;
  return Math.min(1, Math.sqrt(level / TENDING_VISUAL_SATURATION_LEVEL));
}

/** The milestone level at `level`, or null if `level` is not a milestone. */
export function getTendingMilestoneAt(level: number): number | null {
  return TENDING_MILESTONES.includes(level) ? level : null;
}

/**
 * Compute the next-deepening info for a given state + local day. Pure so the
 * Offering Pit can render the (possibly discounted) cost without a round-trip.
 */
export function getNextTendingInfo(
  state: TendingState,
  today: string = getLocalDateString()
): NextTendingInfo {
  const nextLevel = state.level + 1;
  const baseCost = getTendingCost(nextLevel);
  const dailyBonusApplied = state.lastTendDate !== today;
  const cost = dailyBonusApplied
    ? Math.max(10, Math.round((baseCost * (1 - TENDING_DAILY_BONUS_DISCOUNT)) / 10) * 10)
    : baseCost;
  return {
    nextLevel,
    baseCost,
    cost,
    dailyBonusApplied,
    milestone: getTendingMilestoneAt(nextLevel),
  };
}

// ============================================================================
// Phase-5 dialogue selection (pure)
// ============================================================================

/**
 * Pick the Phase-5 line for an animal.
 *
 * `pool` is the animal's ordered line set (base post-revelation lines + optional
 * choice callback + unlocked Tending milestone lines). `caughtUp` is how many of
 * those the animal has genuinely delivered.
 *
 * - While `caughtUp < pool.length` there is still **new** content: deliver the
 *   next line in authored order and advance the pointer (`isNew: true`).
 * - Once caught up, re-reads are served in a deterministic **shuffled** order
 *   seeded per-animal, advanced by `deliveredIndex`, so the same lines never
 *   arrive in the same verbatim sequence the player saw before (`isNew: false`).
 */
export function selectPhase5Dialogue(
  pool: string[],
  caughtUp: number,
  deliveredIndex: number,
  seed: number
): { text: string; isNew: boolean; nextCaughtUp: number } {
  if (pool.length === 0) {
    return { text: 'The pattern holds.', isNew: false, nextCaughtUp: caughtUp };
  }
  if (caughtUp < pool.length) {
    return { text: pool[caughtUp], isNew: true, nextCaughtUp: caughtUp + 1 };
  }
  // Caught up — serve re-reads in a deterministic shuffled order. The permutation
  // is re-seeded per full cycle (seed + cycle index), so a deep re-reader doesn't
  // settle into one repeating sequence: each pass through the pool is reshuffled.
  const cycle = Math.floor(deliveredIndex / pool.length);
  const perm = seededPermutation(pool.length, (seed + cycle) >>> 0);
  const idx = perm[((deliveredIndex % pool.length) + pool.length) % pool.length];
  return { text: pool[idx], isNew: false, nextCaughtUp: caughtUp };
}

/** Deterministic Fisher–Yates permutation of [0..n) from a 32-bit seed. */
function seededPermutation(n: number, seed: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  let s = (seed >>> 0) || 1;
  const rand = () => {
    // xorshift32 — deterministic, no external deps
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 0xffffffff;
  };
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Cheap stable string hash → seed for the per-animal shuffle. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ============================================================================
// Availability
// ============================================================================

/** Tending is a Phase-5-only loop (mirrors `isSacrificeAvailable`'s shape). */
export function isTendingAvailable(currentPhase: number): boolean {
  return currentPhase >= 5;
}

// ============================================================================
// Public async API
// ============================================================================

export async function loadTendingState(): Promise<TendingState> {
  if (tendingCache) return tendingCache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        parsed &&
        typeof parsed.level === 'number' &&
        typeof parsed.totalAmberTended === 'number'
      ) {
        tendingCache = {
          level: parsed.level,
          totalAmberTended: parsed.totalAmberTended,
          lastTendDate: typeof parsed.lastTendDate === 'string' ? parsed.lastTendDate : null,
          milestonesSeen: Array.isArray(parsed.milestonesSeen) ? parsed.milestonesSeen : [],
          caughtUp: parsed.caughtUp && typeof parsed.caughtUp === 'object' ? parsed.caughtUp : {},
        };
        return tendingCache!;
      }
    }
  } catch {}
  tendingCache = getDefaultState();
  return tendingCache;
}

/**
 * Record a deepening. The caller MUST have already spent `amountSpent` via
 * `amberCurrency.spendAmber(cost, 'tending')`. Advances the level, records the
 * sink, sets the daily-bonus gate, and marks a milestone ceremony if one fires.
 */
export async function applyTend(
  amountSpent: number,
  today: string = getLocalDateString()
): Promise<{ level: number; milestone: number | null; totalAmberTended: number }> {
  const state = await loadTendingState();
  state.level += 1;
  state.totalAmberTended += amountSpent;
  state.lastTendDate = today;

  let milestone: number | null = null;
  const m = getTendingMilestoneAt(state.level);
  if (m !== null && !state.milestonesSeen.includes(m)) {
    state.milestonesSeen.push(m);
    milestone = m;
  }

  await saveTendingState(state);
  return { level: state.level, milestone, totalAmberTended: state.totalAmberTended };
}

export async function getTendingLevel(): Promise<number> {
  const state = await loadTendingState();
  return state.level;
}

export async function getTendingStats(): Promise<{ level: number; totalAmberTended: number }> {
  const state = await loadTendingState();
  return { level: state.level, totalAmberTended: state.totalAmberTended };
}

/** How many Phase-5 lines an animal has genuinely delivered. */
export async function getPhase5CaughtUp(animalType: string): Promise<number> {
  const state = await loadTendingState();
  return state.caughtUp[animalType] ?? 0;
}

/** Persist an animal's updated "caught up" pointer after delivering a new line. */
export async function setPhase5CaughtUp(animalType: string, value: number): Promise<void> {
  const state = await loadTendingState();
  state.caughtUp[animalType] = value;
  await saveTendingState(state);
}

export async function clearTendingState(): Promise<void> {
  tendingCache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// ============================================================================
// Internal
// ============================================================================

async function saveTendingState(state: TendingState): Promise<void> {
  tendingCache = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}
