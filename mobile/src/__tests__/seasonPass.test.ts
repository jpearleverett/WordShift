/**
 * Cosmetic Season Pass — monthly reward track. Free tiers earned by playing;
 * premium via Supporter subscription OR amber unlock. No reward feeds phase
 * progress; the final premium tier grants an exclusive cosmetic.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

let mockDay = '2026-07-04';
jest.mock('../services/dateUtils', () => ({
  getLocalDateString: () => mockDay,
}));

let isSupporter = false;
jest.mock('../services/entitlements', () => ({
  isSupporterSync: () => isSupporter,
}));

const awardBonusAmber = jest.fn(async (amount: number, _source?: string) => 5000 + amount);
jest.mock('../services/amberCurrency', () => ({
  awardBonusAmber: (amount: number, source: string) => awardBonusAmber(amount, source),
}));

const grantCosmetic = jest.fn(async (_id?: string) => true);
jest.mock('../services/cosmetics', () => ({
  grantCosmetic: (id: string) => grantCosmetic(id),
}));

import {
  getSeasonPassView,
  claimSeasonTier,
  markSeasonPremiumUnlocked,
  getCurrentSeasonId,
  getSeasonClaimableCount,
  clearSeasonPass,
  invalidateSeasonPassCache,
  SEASON_PREMIUM_COSMETIC_ID,
} from '../services/seasonPass';
import {
  SEASON_PASS_TIERS,
  SEASON_PASS_PUZZLES_PER_TIER,
  SEASON_PASS_FREE_AMBER_PER_TIER,
  SEASON_PASS_PREMIUM_AMBER_PER_TIER,
} from '../constants/gameBalance';

// Puzzle count at which the player's first season snapshot is taken.
const START = 40;

beforeEach(async () => {
  mockDay = '2026-07-04';
  isSupporter = false;
  awardBonusAmber.mockClear();
  grantCosmetic.mockClear();
  (AsyncStorage.clear as jest.Mock)();
  await clearSeasonPass();
});

describe('seasonPass', () => {
  test('season id is the local YYYY-MM', () => {
    mockDay = '2026-03-09';
    expect(getCurrentSeasonId()).toBe('2026-03');
  });

  test('fresh season snapshots progress at 0 tiers', async () => {
    const v = await getSeasonPassView(START);
    expect(v.tiersUnlocked).toBe(0);
    expect(v.progressPuzzles).toBe(0);
    expect(v.totalTiers).toBe(SEASON_PASS_TIERS);
    expect(v.claimableCount).toBe(0);
    expect(v.premiumUnlocked).toBe(false);
  });

  test('tiers unlock as in-season puzzles are solved', async () => {
    await getSeasonPassView(START); // snapshot at 40
    const v = await getSeasonPassView(START + SEASON_PASS_PUZZLES_PER_TIER * 3 + 1);
    expect(v.tiersUnlocked).toBe(3);
    expect(v.progressPuzzles).toBe(SEASON_PASS_PUZZLES_PER_TIER * 3 + 1);
    // 3 free tiers claimable (premium still locked)
    expect(v.claimableCount).toBe(3);
  });

  test('claiming a free tier awards free amber, idempotently', async () => {
    await getSeasonPassView(START);
    const solved = START + SEASON_PASS_PUZZLES_PER_TIER * 2;
    const r1 = await claimSeasonTier(1, 'free', solved);
    expect(r1.granted).toBe(true);
    expect(r1.amber).toBe(SEASON_PASS_FREE_AMBER_PER_TIER);
    expect(awardBonusAmber).toHaveBeenCalledWith(SEASON_PASS_FREE_AMBER_PER_TIER, 'season_free');
    const r2 = await claimSeasonTier(1, 'free', solved);
    expect(r2.granted).toBe(false);
    expect(r2.reason).toBe('already_claimed');
  });

  test('claiming an unreached tier is refused', async () => {
    await getSeasonPassView(START);
    const r = await claimSeasonTier(5, 'free', START + 1);
    expect(r.granted).toBe(false);
    expect(r.reason).toBe('not_unlocked');
  });

  test('premium is locked without a subscription or amber unlock', async () => {
    await getSeasonPassView(START);
    const solved = START + SEASON_PASS_PUZZLES_PER_TIER;
    const r = await claimSeasonTier(1, 'premium', solved);
    expect(r.granted).toBe(false);
    expect(r.reason).toBe('premium_locked');
  });

  test('amber unlock opens the premium track for non-subscribers', async () => {
    await getSeasonPassView(START);
    const solved = START + SEASON_PASS_PUZZLES_PER_TIER;
    expect(await markSeasonPremiumUnlocked(solved)).toBe(true);
    const v = await getSeasonPassView(solved);
    expect(v.premiumUnlocked).toBe(true);
    expect(v.premiumViaSupporter).toBe(false);
    const r = await claimSeasonTier(1, 'premium', solved);
    expect(r.granted).toBe(true);
    expect(r.amber).toBe(SEASON_PASS_PREMIUM_AMBER_PER_TIER);
    expect(awardBonusAmber).toHaveBeenCalledWith(SEASON_PASS_PREMIUM_AMBER_PER_TIER, 'season_premium');
  });

  test('supporters get premium free (no amber unlock needed)', async () => {
    isSupporter = true;
    await getSeasonPassView(START);
    const solved = START + SEASON_PASS_PUZZLES_PER_TIER;
    const v = await getSeasonPassView(solved);
    expect(v.premiumUnlocked).toBe(true);
    expect(v.premiumViaSupporter).toBe(true);
    // markSeasonPremiumUnlocked is a no-op for supporters
    expect(await markSeasonPremiumUnlocked(solved)).toBe(false);
    const r = await claimSeasonTier(1, 'premium', solved);
    expect(r.granted).toBe(true);
  });

  test('the final premium tier grants the exclusive cosmetic', async () => {
    isSupporter = true;
    await getSeasonPassView(START);
    const solved = START + SEASON_PASS_PUZZLES_PER_TIER * SEASON_PASS_TIERS;
    const r = await claimSeasonTier(SEASON_PASS_TIERS, 'premium', solved);
    expect(r.granted).toBe(true);
    expect(r.cosmeticGranted).toBe(true);
    expect(grantCosmetic).toHaveBeenCalledWith(SEASON_PREMIUM_COSMETIC_ID);
  });

  test('a new local month rolls the season over and resets progress + claims', async () => {
    await getSeasonPassView(START);
    const solved = START + SEASON_PASS_PUZZLES_PER_TIER * 4;
    await claimSeasonTier(1, 'free', solved);
    // New month, player has kept solving (higher total).
    mockDay = '2026-08-02';
    invalidateSeasonPassCache();
    const v = await getSeasonPassView(solved);
    expect(v.seasonId).toBe('2026-08');
    expect(v.tiersUnlocked).toBe(0); // snapshot re-anchored at `solved`
    expect(v.progressPuzzles).toBe(0);
    // Tier 1 free is claimable again in the new season once re-earned.
    const v2 = await getSeasonPassView(solved + SEASON_PASS_PUZZLES_PER_TIER);
    const tier1 = v2.tiers.find((t) => t.tier === 1)!;
    expect(tier1.freeClaimed).toBe(false);
    expect(tier1.freeClaimable).toBe(true);
  });

  test('getSeasonClaimableCount counts free + premium claimable rewards', async () => {
    isSupporter = true; // premium available
    await getSeasonPassView(START);
    const solved = START + SEASON_PASS_PUZZLES_PER_TIER * 2;
    // 2 tiers unlocked × (free + premium) = 4 claimable
    expect(await getSeasonClaimableCount(solved)).toBe(4);
  });
});
