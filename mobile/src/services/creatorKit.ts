import { Difficulty } from '../types';
import { DialoguePhase } from '../types/homeWorld';
import { FINALE_DWELL_PUZZLES, MIN_PUZZLES_FOR_PHASE } from '../constants/gameBalance';
import {
  awardBonusAmber,
  awardPuzzleAmber,
  clearProgress,
  confirmPhaseTransition,
  getAmberBalance,
  getFullProgress,
  markChallengeIntroSeen,
  markDailyChallengeIntroSeen,
  markFinalPuzzleCompleted,
  markFoxPlayNudgeSeen,
  markGatedUnlockIntroSeen,
  markHarvestHomeIntroSeen,
  markHouseCompleted,
  markIntroSeen,
  markJournalIntroSeen,
  markMandatoryHarvestSeen,
  markPostRevelation,
  markSetupSelectorIntroSeen,
  markStarterIntroSeen,
  markTutorialSeedsPlanted,
  recordPhase4Dwell,
  recordRitualWords,
} from './amberCurrency';
import {
  calculateStars,
  clearStats,
  getCumulativeStats,
  recordPuzzleCompletion,
} from './starRating';
import { checkAchievements, clearAchievements } from './achievements';
import { UNLOCK_PROGRESSION, purchaseUnlock } from './homeWorldData';
import { setOnboardingStep } from './onboarding';
import { clearPuzzleState } from './puzzleSaveState';
import { clearHarvestState } from './wordHarvest';

/**
 * Creator / press kit: reviewer fast-forward snapshots.
 *
 * The cult reveal is gated ~90+ puzzles deep by design, which means press and
 * streamers can never showcase the game's actual hook from a fresh install.
 * This service builds a COHERENT late-game save on demand so a reviewer can
 * jump straight to a chosen era of the descent.
 *
 * Enablement (mirrors supabaseClient.ts): the feature is fully inert unless a
 * non-empty `creatorCode` string is present in app.json → expo.extra. No key,
 * no behavior — shipping builds without the key carry zero risk. The code is
 * handed to reviewers privately and validated before any snapshot applies.
 *
 * State construction goes through the services' own EXPORTED APIs only — the
 * win loop drives awardPuzzleAmber/recordPuzzleCompletion exactly like real
 * victories (streak, milestones, first-completion bonuses, weighted phase
 * progress, deferred phase transitions confirmed via confirmPhaseTransition),
 * and the house is bought through purchaseUnlock (which also fast-forwards
 * each animal's dialogue index for the current phase, the same late-unlock
 * path real players get). No raw AsyncStorage writes are needed anywhere.
 *
 * IMPORTANT for callers: applying a snapshot REPLACES the device's progress
 * (clearProgress/clearStats/clearAchievements run first) and the app-level
 * React state must be rebuilt afterwards — trigger Updates.reloadAsync() (or
 * the Reset-All style in-memory rebuild in App.tsx) once this resolves true.
 * Service-level in-memory caches are already consistent because every
 * mutation went through the owning service.
 */

/** The four reviewable eras, in narrative order. */
export const CREATOR_ERAS = ['dusk', 'shadows', 'reveal', 'peace'] as const;
export type CreatorEra = (typeof CREATOR_ERAS)[number];

/** Type guard for deep-link era params. */
export function isCreatorEra(value: string): value is CreatorEra {
  return (CREATOR_ERAS as readonly string[]).includes(value);
}

interface EraSpec {
  /** Target narrative phase after the snapshot applies. */
  phase: DialoguePhase;
  /** Approximate simulated win count (raised to clear the phase floor). */
  puzzles: number;
  /** Buy every unlock with order <= this (Infinity = the whole house). */
  maxUnlockOrder: number;
  /** Minimum spendable amber left in the reviewer's pocket. */
  minSpendableAmber: number;
}

/**
 * Era targets. Puzzle counts are tuned to the 2026-07 compressed pacing
 * constants (phase floors 12/28/62/90/120):
 * - dusk    (~50):  Deeper Questions. Dusk sky, uneasy animals, 7 rooms built.
 * - shadows (~85):  Growing Shadows. Storm is close, original house complete.
 * - reveal  (~140): The Horizon. Cult revealed, full house, robed sprites.
 * - peace   (~180): Terrible Peace. Post-revelation, Tending Shrine open.
 * Each era's count sits BELOW the next phase's puzzle floor (dusk 50 < 62,
 * shadows 85 < 90) so the exposure guard pins the snapshot to exactly the
 * target phase with no pending transition. If pacing constants move, the win
 * simulation follows them automatically (phase floors are re-read from
 * gameBalance and the final sanity check fails loudly rather than shipping an
 * off-phase snapshot).
 */
const ERA_SPECS: Record<CreatorEra, EraSpec> = {
  dusk: { phase: 2, puzzles: 50, maxUnlockOrder: 13, minSpendableAmber: 150 },
  shadows: { phase: 3, puzzles: 85, maxUnlockOrder: 19, minSpendableAmber: 250 },
  reveal: { phase: 4, puzzles: 140, maxUnlockOrder: Number.MAX_SAFE_INTEGER, minSpendableAmber: 400 },
  peace: { phase: 5, puzzles: 180, maxUnlockOrder: Number.MAX_SAFE_INTEGER, minSpendableAmber: 600 },
};

/**
 * Read Expo config `extra` lazily so this module still loads in Node test
 * environments (where expo-constants isn't resolvable). Same guarded pattern
 * as supabaseClient.ts.
 */
function getConfigExtra(): Record<string, unknown> {
  try {
    const Constants = require('expo-constants').default;
    return (Constants?.expoConfig?.extra as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

/** The configured creator code, or '' when unset (feature disabled). */
function getConfiguredCreatorCode(): string {
  const code = getConfigExtra().creatorCode;
  return typeof code === 'string' ? code.trim() : '';
}

/**
 * Whether the creator kit is enabled for this build: true only when a
 * non-empty `creatorCode` exists in app config extra. Absent/empty key means
 * every entry point below is fully inert.
 */
export function isCreatorKitEnabled(): boolean {
  return getConfiguredCreatorCode().length > 0;
}

/**
 * Validate a presented creator code against the configured one. Trimmed and
 * case-insensitive. The comparison is constant-ish (no early exit on the
 * first mismatched character) — the code gates a destructive-but-local
 * feature, so this is belt-and-braces rather than a hard security boundary.
 */
export function validateCreatorCode(code: string): boolean {
  const configured = getConfiguredCreatorCode().toLowerCase();
  if (!configured) return false;
  const presented = (code ?? '').trim().toLowerCase();

  let mismatch = configured.length === presented.length ? 0 : 1;
  for (let i = 0; i < configured.length; i++) {
    // Index the presented string cyclically so the loop length (and thus
    // timing) depends only on the configured code, never on the input.
    const presentedChar = presented.length > 0 ? presented.charCodeAt(i % presented.length) : 0;
    mismatch |= configured.charCodeAt(i) ^ presentedChar;
  }
  return mismatch === 0;
}

// ---------------------------------------------------------------------------
// Snapshot simulation
// ---------------------------------------------------------------------------

/** Difficulty curve for the simulated history (early EASY, then a real mix). */
function pickDifficulty(i: number): Difficulty {
  if (i < 5) return 'EASY';
  switch (i % 4) {
    case 0:
    case 1:
      return 'MEDIUM';
    case 2:
      return 'MEDIUM_PLUS';
    default:
      return 'HARD';
  }
}

/**
 * Performance curve: a strong-but-human record (mostly 3-star, occasional
 * 2-star, rare 1-star) so the stats screen reads like a real engaged player
 * and the three-star acceleration path is exercised.
 */
function pickPerformance(i: number): { hints: number; invalids: number } {
  if (i % 41 === 40) return { hints: 2, invalids: 0 }; // rare rough board (1 star)
  if (i % 23 === 22) return { hints: 1, invalids: 1 }; // occasional assist (2 stars)
  if (i % 9 === 8) return { hints: 0, invalids: 2 }; // near miss (2 stars)
  return { hints: 0, invalids: i % 3 === 2 ? 1 : 0 }; // clean (3 stars)
}

// Era-flavored vocabulary for the ritual ledger (Word Ledger content). The
// ledger keeps its most recent 500 words, so later batches (darker pools)
// dominate what a reviewer actually sees in a dark-era save.
const BRIGHT_WORDS = ['SPARK', 'HONEY', 'MAPLE', 'CLOUD', 'BERRY', 'TIGER', 'DANCE', 'WARM', 'FERN', 'GLOW', 'PLUM', 'STAR'];
const DUSK_WORDS = ['FADE', 'MIST', 'HUSH', 'EMBER', 'DRIFT', 'GLOOM', 'COLD', 'STONE', 'DIM', 'ASHEN', 'WANE', 'DUSK'];
const DREAD_WORDS = ['VOID', 'DOOM', 'ABYSS', 'OMEN', 'SHADE', 'ASHES', 'HOLLOW', 'DREAD', 'WRAITH', 'CHASM', 'RUIN', 'NIGHT'];

/**
 * Seed the ritual word ledger so the Word Ledger / "words offered" counters
 * aren't empty in a 200-puzzle save. Early batches use bright vocabulary,
 * later batches turn dusk/dread to match the era. recordRitualWords is the
 * real award-path API; ritual energy on dark batches adds a sliver of weighted
 * phase progress, which is harmless here — phase floors (real puzzle counts)
 * are the binding constraint at every era target.
 */
async function seedRitualLedger(spec: EraSpec): Promise<void> {
  const totalWords = spec.puzzles * 3; // ~3 formed words per completed chain
  const batchSize = 30;
  const batches = Math.ceil(totalWords / batchSize);
  let remaining = totalWords;

  for (let b = 0; b < batches; b++) {
    const t = batches <= 1 ? 1 : b / (batches - 1); // 0..1 through the "history"
    let pool = BRIGHT_WORDS;
    let energy = 0;
    if (spec.phase >= 3 && t > 0.75) {
      pool = DREAD_WORDS;
      energy = 6;
    } else if (t > 0.5) {
      pool = DUSK_WORDS;
      energy = spec.phase >= 2 ? 2 : 0;
    }
    const count = Math.min(batchSize, remaining);
    const words = Array.from({ length: count }, (_, k) => pool[(b + k) % pool.length]);
    await recordRitualWords(words, energy, []);
    remaining -= count;
  }
}

/** Mark every one-time intro/teaching beat as seen so the reviewer lands in a
 * lived-in save, not a stack of stale tutorials. The pit nudge is deliberately
 * NOT marked: it is the in-world pointer to the pit when the reviewer's next
 * real phase transition goes pending, and confirmPhaseTransition resets it. */
async function markTeachingBeatsSeen(): Promise<void> {
  await Promise.all([
    markDailyChallengeIntroSeen(),
    markChallengeIntroSeen(),
    markSetupSelectorIntroSeen(),
    markJournalIntroSeen(),
    markStarterIntroSeen(),
    markFoxPlayNudgeSeen(),
    markGatedUnlockIntroSeen(),
    markMandatoryHarvestSeen(),
    markHarvestHomeIntroSeen(),
    markTutorialSeedsPlanted(),
  ]);
}

/**
 * Fast-forward the save to a coherent world state for the given era.
 *
 * Destructive: replaces progress, stats, and achievements on this device.
 * Returns true on success. Returns false — without touching any state — when
 * the kit is disabled or the era is unknown; returns false with a best-effort
 * partial state if an internal step throws mid-flight (callers should treat
 * false as "ask the reviewer to reinstall / retry", it is a creator-only
 * path). After a true result the caller MUST reload the app (or run the
 * Reset-All style in-memory rebuild) so App-level state re-reads storage.
 */
export async function applyCreatorSnapshot(target: 'dusk' | 'shadows' | 'reveal' | 'peace'): Promise<boolean> {
  const spec = ERA_SPECS[target];
  if (!spec || !isCreatorKitEnabled()) return false;

  try {
    // 1. Clean base — the snapshot is a full replacement, never a merge. Clear
    //    the transient session state too (a mid-puzzle autosave and any pending
    //    harvest batches from the pre-snapshot save), or the reviewer resumes a
    //    stray old board / sees stale amber batches over a fresh era save.
    await clearProgress();
    await clearStats();
    await clearAchievements();
    await clearPuzzleState();
    await clearHarvestState();
    await setOnboardingStep('complete');

    // 2. Simulate the win history through the REAL award pipeline. Raised to
    //    the phase floor so a future pacing change can't strand the target
    //    phase (the weighted thresholds are cleared by the same three-star /
    //    difficulty acceleration an engaged player earns).
    const puzzles = Math.max(spec.puzzles, MIN_PUZZLES_FOR_PHASE[spec.phase] + 5);
    for (let i = 0; i < puzzles; i++) {
      const difficulty = pickDifficulty(i);
      const { hints, invalids } = pickPerformance(i);
      await recordPuzzleCompletion(difficulty, hints, invalids, 0);
      const stars = calculateStars(hints, invalids);
      const result = await awardPuzzleAmber(
        difficulty,
        stars,
        i % 10 === 9 ? 'challenge' : 'standard',
        0.6, // engaged three-star rate → narrative acceleration, like a real reviewer-speed run
        true // credit to balance — the sim "harvests" every batch
      );
      // Deferred transitions are confirmed immediately — the pit ceremony's
      // own API — so the snapshot's phase pin is always the CONFIRMED state.
      if (result.phaseTransitionPending) {
        await confirmPhaseTransition();
      }
    }

    // 3. Give the Word Ledger / offered-words counters a matching history.
    await seedRitualLedger(spec);

    // 4. Build the era-appropriate slice of the house through the real
    //    purchase path (validates sequence + level gates, spends amber, and
    //    fast-forwards each animal's dialogue index for the current phase).
    const unlocks = [...UNLOCK_PROGRESSION]
      .sort((a, b) => a.order - b.order)
      .filter(u => u.order <= spec.maxUnlockOrder);
    const totalCost = unlocks.reduce((sum, u) => sum + u.cost, 0);
    const balance = await getAmberBalance();
    const needed = totalCost + spec.minSpendableAmber;
    if (balance < needed) {
      await awardBonusAmber(needed - balance, 'creator_snapshot_grant');
    }
    for (const unlock of unlocks) {
      const purchased = await purchaseUnlock(unlock.id);
      if (!purchased.success) return false;
      if (unlock.type === 'character') {
        await markIntroSeen(unlock.targetId);
      }
    }

    // 5. Era pins beyond the win loop.
    if (spec.phase >= 4) {
      await markHouseCompleted();
    }
    if (target === 'peace') {
      // Post-revelation implies the Phase-4 dwell window was genuinely played
      // and the finale fired; markPostRevelation pins currentPhase = 5.
      for (let i = 0; i < FINALE_DWELL_PUZZLES; i++) {
        await recordPhase4Dwell();
      }
      await markFinalPuzzleCompleted();
      await markPostRevelation();
    }

    // 6. Absorb the one-time teaching beats and the retroactive achievement
    //    unlocks now, silently — otherwise the reviewer's first victory drowns
    //    in a queue of stale toasts. checkAchievements also credits the
    //    one-time achievement amber, exactly as a real playthrough would have.
    await markTeachingBeatsSeen();
    const stats = await getCumulativeStats();
    const progress = await getFullProgress();
    await checkAchievements({
      stats,
      puzzlesSolved: progress.puzzlesSolved,
      currentPhase: progress.currentPhase,
      currentStreak: progress.currentStreak ?? 0,
      unlockedAnimals: progress.unlockedAnimals.length,
      unlockedRooms: progress.unlockedRooms.length,
      amberEarned: progress.totalAmberEarned,
      dailyChallengesCompleted: 0,
      shareCount: 0,
      challengeCompletions: progress.challengeCompletions ?? 0,
      variantWins: {},
      blindWins: 0,
      lexiconWins: 0,
      speedWins: 0,
      maxStackWins: 0,
    });

    // 7. Sanity check: the snapshot must land EXACTLY on the target phase with
    //    no dangling pending transition — fail loudly instead of shipping an
    //    off-phase save to a reviewer.
    const final = await getFullProgress();
    if (final.currentPhase !== spec.phase) return false;
    if ((final.pendingPhaseTransition ?? null) !== null) return false;
    return true;
  } catch {
    return false;
  }
}
