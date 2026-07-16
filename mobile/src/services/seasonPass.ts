/**
 * Cosmetic Season Pass — a monthly reward track, and the durable recurring amber
 * sink the economy was missing (see the revenue assessment's "~$25 sink
 * ceiling": every finite sink summed to ~$25, so amber had nothing to want past
 * week six). Seasons rotate every LOCAL month; each has:
 *
 *   - a FREE track, advanced purely by PLAYING (in-season puzzles solved), and
 *   - a PREMIUM track with richer rewards, unlocked EITHER by an active Supporter
 *     subscription (a recurring reason to subscribe) OR by spending amber (the
 *     monthly sink). Supporters never pay amber for it.
 *
 * Hard design rules (mirror the rest of the economy):
 *   - No reward EVER feeds phase progression — season amber credits the reward
 *     balance only (awardBonusAmber), exactly like amber packs.
 *   - The pass never gates NARRATIVE content. It sells expression + convenience,
 *     never story. (No pay-to-progress.)
 *
 * Pure/testable: progress is computed from a `puzzlesSolved` value the caller
 * passes in (from amberCurrency.getFullProgress), and amber/cosmetic grants go
 * through mockable service calls. Deterministic season id = local YYYY-MM.
 * Local-month bucketing via services/dateUtils — never UTC/toISOString.
 *
 * Persisted under `wordshift_season_pass`; cloud-synced (progress/claims follow
 * the player), cleared by Reset All, cache invalidated on cloud restore.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString } from './dateUtils';
import { awardBonusAmber } from './amberCurrency';
import { isSupporterSync } from './entitlements';
import { grantCosmetic } from './cosmetics';
import {
  SEASON_PASS_TIERS,
  SEASON_PASS_PUZZLES_PER_TIER,
  SEASON_PASS_FREE_AMBER_PER_TIER,
  SEASON_PASS_PREMIUM_AMBER_PER_TIER,
  SEASON_PASS_PREMIUM_AMBER_COST,
} from '../constants/gameBalance';

const STORAGE_KEY = 'wordshift_season_pass';

/** Cosmetic granted at the final PREMIUM tier of every season (premium-exclusive). */
export const SEASON_PREMIUM_COSMETIC_ID = 'confetti_season';

interface SeasonPassState {
  /** The season (local YYYY-MM) this state is tracking. */
  seasonId: string;
  /** puzzlesSolved at the moment this season began (progress = current − this). */
  startPuzzles: number;
  /** Free-track tier indices (1-based) already claimed. */
  claimedFree: number[];
  /** Premium-track tier indices (1-based) already claimed. */
  claimedPremium: number[];
  /** True once premium is unlocked for THIS season by spending amber. */
  premiumUnlockedByAmber: boolean;
}

export interface SeasonTierView {
  /** 1-based tier index. */
  tier: number;
  /** Whether the player has reached this tier this season. */
  unlocked: boolean;
  freeAmber: number;
  premiumAmber: number;
  /** True if the premium slot of this tier also grants the exclusive cosmetic. */
  premiumCosmetic: boolean;
  freeClaimed: boolean;
  premiumClaimed: boolean;
  /** Free reward claimable now (unlocked and unclaimed). */
  freeClaimable: boolean;
  /** Premium reward claimable now (unlocked, premium available, and unclaimed). */
  premiumClaimable: boolean;
}

export interface SeasonPassView {
  seasonId: string;
  /** In-season puzzles solved. */
  progressPuzzles: number;
  /** Tiers reached this season (0..SEASON_PASS_TIERS). */
  tiersUnlocked: number;
  totalTiers: number;
  puzzlesPerTier: number;
  /** Puzzles still needed to reach the next tier (0 when maxed). */
  puzzlesToNextTier: number;
  /** Premium unlocked (Supporter subscription OR amber unlock this season). */
  premiumUnlocked: boolean;
  /** How premium is unlocked, for UI copy. */
  premiumViaSupporter: boolean;
  /** Amber cost to unlock premium as a non-subscriber. */
  premiumAmberCost: number;
  tiers: SeasonTierView[];
  /** Count of rewards claimable right now (free + premium). */
  claimableCount: number;
}

let cache: SeasonPassState | null = null;

/** Current season id — deterministic local YYYY-MM (monthly rotation). */
export function getCurrentSeasonId(): string {
  return getLocalDateString().slice(0, 7);
}

function getDefault(seasonId: string, startPuzzles: number): SeasonPassState {
  return { seasonId, startPuzzles, claimedFree: [], claimedPremium: [], premiumUnlockedByAmber: false };
}

async function persist(state: SeasonPassState): Promise<void> {
  cache = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* non-critical — the in-memory cache keeps the session consistent */
  }
}

/**
 * Load the season state, rolling over to a fresh season when the local month has
 * changed. Rollover snapshots `startPuzzles` at the current total so in-season
 * progress starts from zero. Requires the current `puzzlesSolved` so a first
 * load / rollover can anchor progress correctly.
 */
async function loadState(puzzlesSolved: number): Promise<SeasonPassState> {
  const seasonId = getCurrentSeasonId();
  if (!cache) {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.seasonId === 'string') {
          cache = {
            seasonId: parsed.seasonId,
            startPuzzles: typeof parsed.startPuzzles === 'number' ? parsed.startPuzzles : puzzlesSolved,
            claimedFree: Array.isArray(parsed.claimedFree) ? parsed.claimedFree : [],
            claimedPremium: Array.isArray(parsed.claimedPremium) ? parsed.claimedPremium : [],
            premiumUnlockedByAmber: parsed.premiumUnlockedByAmber === true,
          };
        }
      }
    } catch {
      /* fall through */
    }
    if (!cache) cache = getDefault(seasonId, puzzlesSolved);
  }
  // Roll over on a new local month.
  if (cache.seasonId !== seasonId) {
    cache = getDefault(seasonId, puzzlesSolved);
    await persist(cache);
  }
  return cache;
}

/** Drop the in-memory cache after an external storage write (cloud restore). */
export function invalidateSeasonPassCache(): void {
  cache = null;
}

/** Clear season pass state for Settings → Reset All. */
export async function clearSeasonPass(): Promise<void> {
  cache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* non-critical */
  }
}

function tiersUnlockedFor(state: SeasonPassState, puzzlesSolved: number): number {
  const inSeason = Math.max(0, puzzlesSolved - state.startPuzzles);
  return Math.min(SEASON_PASS_TIERS, Math.floor(inSeason / SEASON_PASS_PUZZLES_PER_TIER));
}

/** Premium is available this season via an active subscription OR an amber unlock. */
function premiumAvailable(state: SeasonPassState): boolean {
  return isSupporterSync() || state.premiumUnlockedByAmber;
}

/**
 * Build the full season view for the UI. Pass the player's current puzzlesSolved
 * (from amberCurrency.getFullProgress).
 */
export async function getSeasonPassView(puzzlesSolved: number): Promise<SeasonPassView> {
  const state = await loadState(puzzlesSolved);
  const tiersUnlocked = tiersUnlockedFor(state, puzzlesSolved);
  const inSeason = Math.max(0, puzzlesSolved - state.startPuzzles);
  const premiumUnlocked = premiumAvailable(state);

  const tiers: SeasonTierView[] = [];
  let claimableCount = 0;
  for (let t = 1; t <= SEASON_PASS_TIERS; t++) {
    const unlocked = t <= tiersUnlocked;
    const freeClaimed = state.claimedFree.includes(t);
    const premiumClaimed = state.claimedPremium.includes(t);
    const isCosmeticTier = t === SEASON_PASS_TIERS;
    const freeClaimable = unlocked && !freeClaimed;
    const premiumClaimable = unlocked && premiumUnlocked && !premiumClaimed;
    if (freeClaimable) claimableCount++;
    if (premiumClaimable) claimableCount++;
    tiers.push({
      tier: t,
      unlocked,
      freeAmber: SEASON_PASS_FREE_AMBER_PER_TIER,
      premiumAmber: SEASON_PASS_PREMIUM_AMBER_PER_TIER,
      premiumCosmetic: isCosmeticTier,
      freeClaimed,
      premiumClaimed,
      freeClaimable,
      premiumClaimable,
    });
  }

  return {
    seasonId: state.seasonId,
    progressPuzzles: inSeason,
    tiersUnlocked,
    totalTiers: SEASON_PASS_TIERS,
    puzzlesPerTier: SEASON_PASS_PUZZLES_PER_TIER,
    puzzlesToNextTier:
      tiersUnlocked >= SEASON_PASS_TIERS ? 0 : SEASON_PASS_PUZZLES_PER_TIER - (inSeason % SEASON_PASS_PUZZLES_PER_TIER),
    premiumUnlocked,
    premiumViaSupporter: isSupporterSync(),
    premiumAmberCost: SEASON_PASS_PREMIUM_AMBER_COST,
    tiers,
    claimableCount,
  };
}

/** Convenience: number of rewards claimable right now (for the home badge). */
export async function getSeasonClaimableCount(puzzlesSolved: number): Promise<number> {
  return (await getSeasonPassView(puzzlesSolved)).claimableCount;
}

export interface SeasonClaimResult {
  granted: boolean;
  amber: number;
  cosmeticGranted: boolean;
  newBalance?: number;
  reason?: 'not_unlocked' | 'already_claimed' | 'premium_locked' | 'invalid_tier';
}

/**
 * Claim a single tier's reward. `track` is 'free' or 'premium'. Awards amber
 * (reward-only, never phase progress) and, for the final premium tier, the
 * season-exclusive cosmetic. Idempotent per tier+track.
 */
export async function claimSeasonTier(
  tier: number,
  track: 'free' | 'premium',
  puzzlesSolved: number,
): Promise<SeasonClaimResult> {
  if (tier < 1 || tier > SEASON_PASS_TIERS) {
    return { granted: false, amber: 0, cosmeticGranted: false, reason: 'invalid_tier' };
  }
  const state = await loadState(puzzlesSolved);
  const tiersUnlocked = tiersUnlockedFor(state, puzzlesSolved);
  if (tier > tiersUnlocked) {
    return { granted: false, amber: 0, cosmeticGranted: false, reason: 'not_unlocked' };
  }
  if (track === 'premium' && !premiumAvailable(state)) {
    return { granted: false, amber: 0, cosmeticGranted: false, reason: 'premium_locked' };
  }
  const claimedList = track === 'free' ? state.claimedFree : state.claimedPremium;
  if (claimedList.includes(tier)) {
    return { granted: false, amber: 0, cosmeticGranted: false, reason: 'already_claimed' };
  }

  const amber = track === 'free' ? SEASON_PASS_FREE_AMBER_PER_TIER : SEASON_PASS_PREMIUM_AMBER_PER_TIER;
  const newBalance = await awardBonusAmber(amber, `season_${track}`);

  let cosmeticGranted = false;
  if (track === 'premium' && tier === SEASON_PASS_TIERS) {
    cosmeticGranted = await grantCosmetic(SEASON_PREMIUM_COSMETIC_ID);
  }

  claimedList.push(tier);
  await persist(state);
  return { granted: true, amber, cosmeticGranted, newBalance };
}

/** Amber cost to unlock the premium track for the current season (non-subscribers). */
export function getSeasonPremiumAmberCost(): number {
  return SEASON_PASS_PREMIUM_AMBER_COST;
}

/**
 * Mark the premium track unlocked for the current season via an AMBER purchase.
 * The CALLER must spend the amber first (amberCurrency.spendAmber(cost,
 * 'season_pass')) — this only records the unlock, mirroring the
 * roomUpgrades/tending "caller spends, service applies" convention. No-op (and
 * returns false) for Supporters (they already have premium free) or if already
 * unlocked this season.
 */
export async function markSeasonPremiumUnlocked(puzzlesSolved: number): Promise<boolean> {
  const state = await loadState(puzzlesSolved);
  if (isSupporterSync() || state.premiumUnlockedByAmber) return false;
  state.premiumUnlockedByAmber = true;
  await persist(state);
  return true;
}
