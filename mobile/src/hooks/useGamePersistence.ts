import { useState, useEffect, useCallback, useRef } from 'react';
import { Difficulty, GameMode } from '../types';
import { DialoguePhase } from '../types/homeWorld';
import {
  calculateStars,
  isFlawless,
  recordPuzzleCompletion,
  getCumulativeStats,
  CumulativeStats,
  getThreeStarRate,
} from '../services/starRating';
import {
  awardPuzzleAmber,
  getAmberBalance,
  getCurrentPhase,
  recordRitualWords,
  recordVariantEncounter,
  applyVariantAmberBonus,
  recordVariantWin,
  getPhaseProgressFraction,
  getPendingPhaseTransition,
  isPostRevelation,
  getFullProgress,
} from '../services/amberCurrency';
import { updatePuzzleCount, updateSessionPhase } from '../services/dialogueSession';
import { recordFormedWords } from '../services/wordHistory';
import { calculateRitualEnergy, extractTriggerWords } from '../services/localGenerator';
import { GameEvent, logEvent } from '../services/eventLogger';
import { updateQuestProgress, WeeklyQuestGenerationContext } from '../services/weeklyQuests';
import { recordOfferingFulfillment } from '../services/offeringRequests';
import { PuzzleVariant, getVariantAmberMultiplier, getNewlyUnlockedVariants, getUnlockedVariants } from '../services/puzzleVariety';
import { enqueueHarvestBatch, generateBatchId, getPendingHarvestSummary, HarvestSummary } from '../services/wordHarvest';
import { recordResonantChoices } from '../services/masteryRecords';
import { RESONANT_MOVE_AMBER, RESONANT_BOARD_CAP_AMBER } from '../constants/gameBalance';

/**
 * Itemized amber breakdown for a single victory, straight from the economy
 * (awardPuzzleAmber + the variant bonus pass). Every line is additive and the
 * parts sum exactly to `total` (=== VictoryData.amberEarned), so the Victory
 * modal can render the REAL itemization instead of re-deriving base/star math
 * from AMBER_REWARDS and hardcoded multipliers.
 */
export interface AmberBreakdown {
  /** Pure difficulty base (AMBER_REWARDS[difficulty]) before the star bonus. */
  base: number;
  /** Star-rating increment (3-star +50% / 2-star +25%), already floored. */
  starBonus: number;
  streakBonus: number;
  challengeBonus: number;
  /** Lexicon rare-word bonus (amber-only, never phase progress). */
  lexiconBonus: number;
  speedBonus: number;
  patronBonus: number;
  surpriseBonus: number;
  /** Resonant deep-word choices this board (per-move, board-capped; amber-only). */
  resonanceBonus: number;
  variantBonus: number;
  freshVariantBonus: number;
  firstCompletionBonus: number;
  milestoneBonus: number;
  streakMilestoneBonus: number;
  /** Sum of every line above — equals VictoryData.amberEarned. */
  total: number;
}

export interface VictoryData {
  earnedStars: number;
  /** Perfect play: 0 hints, 0 invalid attempts, 0 undos (the tier above 3 stars). */
  flawless?: boolean;
  /** Running lifetime count of flawless offerings (for the victory badge copy). */
  flawlessCount?: number;
  /**
   * Total amber earned by this victory. The per-puzzle share (base/star/
   * streak/challenge/patron/surprise/resonance/variant) is queued in the
   * harvest batch; one-time windfalls (milestone, first-completion, streak
   * milestone) were already credited to the spendable balance by the economy.
   */
  amberEarned: number;
  /** Real itemization of amberEarned (absent only on guard/error fallbacks) */
  amberBreakdown?: AmberBreakdown;
  amberBalance: number;
  /** True when this victory was the Daily Challenge (never a compact victory) */
  isDaily?: boolean;
  phaseChanged: boolean;
  newPhase: DialoguePhase;
  streakBonus: number;
  challengeBonus: number;
  /** True when the win was a Blind Offering board (labels the trial bonus line). */
  blind?: boolean;
  /** True when the undo-limit ("Challenge") constraint was also on. With `blind`
   *  this marks the stacked maximal trial, which the modal labels distinctly. */
  undoLimited?: boolean;
  /** Variable-ratio "lucky" surprise bonus (0 when none); reward-only, never phase progress */
  surpriseBonus: number;
  currentStreak: number;
  milestoneBonus: number;
  milestoneMessage: string | null;
  cumulativeStats: CumulativeStats | null;
  phaseAcceleration: number;
  /** Total words ever formed (for ritual tracking) */
  totalWordsFormed: number;
  /** Ritual energy of this puzzle */
  ritualEnergy: number;
  /** Bonus amber from first completion of this difficulty (one-time) */
  firstCompletionBonus: number;
  /** Bonus amber from puzzle variant mode */
  variantBonus: number;
  /** Amber from resonant deep-word choices (0/absent when none; amber-only) */
  resonanceBonus?: number;
  /** How many resonant choices the board carried (mastery stat feed) */
  resonantChoiceCount?: number;
  /** One-time-per-day fresh-variant rotation bonus (0 if already claimed today) */
  freshVariantBonus?: number;
  /** Puzzle variant used */
  variant: PuzzleVariant;
  /** Effective variant multiplier (full configured value; decay removed) */
  variantAppliedMultiplier?: number;
  /** @deprecated always 1.0 — repeat decay removed in favor of the fresh bonus */
  variantRepeatDecay?: number;
  /** Bonus amber from streak milestone (one-time at 3/7/14/30 days) */
  streakMilestoneBonus: number;
  /** Message for streak milestone achievement */
  streakMilestoneMessage: string | null;
  /** True when a streak freeze was consumed to protect the streak this victory */
  streakSaved?: boolean;
  /** Titles of quests completed this victory */
  questsCompleted?: string[];
  /** Words harvested this puzzle (for VictoryModal display) */
  harvestedWords?: string[];
  /** Updated pending harvest summary after enqueue */
  pendingHarvest?: HarvestSummary;
  /** Batch id created for this victory's harvest, used for early auto-collection */
  harvestBatchId?: string;
  /** True when the victory reward was banked immediately */
  autoCollected?: boolean;
  /**
   * True on the one-time victory where the auto-collect window closes and the
   * player must offer their words at the pit before continuing (set in App, not
   * here). Drives the mandatory first-harvest gate in the Victory modal.
   */
  mandatoryHarvest?: boolean;
  /**
   * True on THE marked final board's victory (set in App, not here). Forces
   * the full victory ceremony (never a compact strip) with the hushed
   * treatment: App suppresses the chime + confetti, and FINAL_PUZZLE_EVENT
   * plays over the settled modal.
   */
  finalBoard?: boolean;
  /** Unbroken Weave mastery snapshot attached by App for Weave victories. */
  unbrokenWeaveRank?: number;
  unbrokenWeaveTitle?: string;
  unbrokenWeaveNextObjective?: string | null;
  /** True when this victory advanced the ordered Weave mastery ladder. */
  unbrokenWeaveRankedUp?: boolean;
  /** True when this puzzle created a new pending phase transition in the pit */
  phaseTransitionPending: boolean;
  /** True when pending harvest batches hit the 200 cap and oldest were trimmed */
  harvestOverflow: boolean;
  /** Monotonic count of real puzzles solved (drives interstitial ad cadence) */
  puzzlesSolved: number;
}

export interface PersistenceState {
  cumulativeStats: CumulativeStats | null;
  amberBalance: number;
  currentPhase: DialoguePhase;
  phaseProgressFraction: number;
  pendingPhaseTransition: DialoguePhase | null;
}

export interface PersistenceActions {
  recordVictory: (
    difficulty: Difficulty,
    hintsUsed: number,
    invalidAttempts: number,
    gameMode?: GameMode,
    completedWords?: string[],
    variant?: PuzzleVariant,
    isDaily?: boolean,
    undosUsed?: number,
    blind?: boolean,
    isSharedChallenge?: boolean,
    resonantChoiceCount?: number,
    lexicon?: boolean,
    maxStack?: boolean,
    undoLimited?: boolean,
    speed?: boolean
  ) => Promise<VictoryData>;
  setAmberBalance: (balance: number) => void;
  refreshStats: () => Promise<void>;
}

export function useGamePersistence(): [PersistenceState, PersistenceActions] {
  const [cumulativeStats, setCumulativeStats] = useState<CumulativeStats | null>(null);
  const [amberBalance, setAmberBalance] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<DialoguePhase>(0);
  const [phaseProgressFraction, setPhaseProgressFraction] = useState(0);
  const [pendingPhaseTransition, setPendingPhaseTransition] = useState<DialoguePhase | null>(null);
  const recordInProgress = useRef(false);

  useEffect(() => {
    // Initialize all services concurrently with proper error handling
    Promise.all([
      getCumulativeStats(),
      getAmberBalance(),
      getCurrentPhase(),
      getPhaseProgressFraction(),
      getPendingPhaseTransition(),
      isPostRevelation(),
    ]).then(([stats, balance, phase, fraction, pending, postRev]) => {
      setCumulativeStats(stats);
      setAmberBalance(Math.max(0, balance));
      setCurrentPhase(postRev ? 5 as DialoguePhase : phase);
      setPhaseProgressFraction(fraction);
      setPendingPhaseTransition(pending);
    }).catch(err => {
      console.warn('Failed to initialize persistence:', err);
    });
  }, []);

  const refreshStats = useCallback(async () => {
    const [stats, balance, phase, fraction, pending, postRev] = await Promise.all([
      getCumulativeStats(),
      getAmberBalance(),
      getCurrentPhase(),
      getPhaseProgressFraction(),
      getPendingPhaseTransition(),
      isPostRevelation(),
    ]);
    setCumulativeStats(stats);
    setAmberBalance(Math.max(0, balance));
    setCurrentPhase(postRev ? 5 as DialoguePhase : phase);
    setPhaseProgressFraction(fraction);
    setPendingPhaseTransition(pending);
  }, []);

  /**
   * Guarded mirror write. The amberBalance state is a display MIRROR of the
   * amberCurrency store, and many callers thread balances through this
   * setter. A negative or non-finite value is always a caller bug (the
   * shipped example: a purchase path passing `staleSnapshot.amber - cost`,
   * which rendered as a negative Stats-screen balance) — it must never be
   * stored or rendered. On garbage input: clamp whatever is currently shown,
   * then re-sync the mirror from the authoritative store so the display
   * self-heals to the truth instead of freezing on a stale value.
   */
  const setAmberBalanceSafe = useCallback((balance: number) => {
    if (!Number.isFinite(balance) || balance < 0) {
      setAmberBalance(prev => Math.max(0, prev));
      getAmberBalance()
        .then(real => setAmberBalance(Math.max(0, real)))
        .catch(() => {});
      return;
    }
    setAmberBalance(balance);
  }, []);

  const recordVictory = useCallback(async (
    difficulty: Difficulty,
    hintsUsed: number,
    invalidAttempts: number,
    gameMode: GameMode = 'standard',
    completedWords: string[] = [],
    variant: PuzzleVariant = 'standard',
    isDaily: boolean = false,
    undosUsed: number = 0,
    blind: boolean = false,
    // Shared-challenge-link wins are AMBER-ONLY: they skip weighted phase
    // progress AND the ritual-energy phase feed, so a self-crafted trivial
    // chain can never accelerate the narrative descent.
    isSharedChallenge: boolean = false,
    // Resonant deep-word choices this board (from usePuzzleGame's tally).
    // Pays a small itemized amber bonus (per-move, board-capped) and feeds
    // the cumulative mastery stat — never phase progression.
    resonantChoiceCount: number = 0,
    // Lexicon (rare-word) win: pays the itemized rare-vocabulary amber bonus
    // (never phase progress) and feeds the lifetime lexicon-win counter.
    lexicon: boolean = false,
    // Maximal-stack win (EXPERT + a non-standard style + ALL FOUR modifiers:
    // Challenge, Speed, Blind, Lexicon) — App computes it from the board's
    // flags; feeds the one-time apex achievement counter only. Amber/pacing
    // are unaffected.
    maxStack: boolean = false,
    // The undo-limit ("Challenge") constraint was active on this board. Only
    // changes the payout when it rides WITH blind: Blind+Challenge is the
    // maximal trial and pays a small premium over Blind alone (which frees
    // undos). Amber only — never phase progress.
    undoLimited: boolean = false,
    // Speed Shift modifier: an amber-only multiplier (never phase progress) and
    // the lifetime speed-win counter behind the Speed achievements.
    speed: boolean = false
  ): Promise<VictoryData> => {
    const stars = calculateStars(hintsUsed, invalidAttempts);
    const flawless = isFlawless(hintsUsed, invalidAttempts, undosUsed);
    const safeResonantCount =
      Number.isFinite(resonantChoiceCount) && resonantChoiceCount > 0
        ? Math.floor(resonantChoiceCount)
        : 0;
    const resonanceBonus = Math.min(
      safeResonantCount * RESONANT_MOVE_AMBER,
      RESONANT_BOARD_CAP_AMBER,
    );

    // Guard against concurrent recordVictory calls
    if (recordInProgress.current) {
      return {
        earnedStars: stars,
        amberEarned: 0,
        amberBalance,
        isDaily,
        phaseChanged: false,
        newPhase: currentPhase,
        streakBonus: 0,
        challengeBonus: 0,
        surpriseBonus: 0,
        currentStreak: 0,
        milestoneBonus: 0,
        milestoneMessage: null,
        cumulativeStats,
        phaseAcceleration: 1.0,
        totalWordsFormed: 0,
        ritualEnergy: 0,
        firstCompletionBonus: 0,
        variantBonus: 0,
        variant,
        streakMilestoneBonus: 0,
        streakMilestoneMessage: null,
        autoCollected: false,
        phaseTransitionPending: false,
        harvestOverflow: false,
        puzzlesSolved: cumulativeStats?.totalPuzzlesCompleted ?? 0,
      };
    }

    recordInProgress.current = true;
    try {
      // Record star stats first so we can get the three-star rate
      await recordPuzzleCompletion(difficulty, hintsUsed, invalidAttempts, undosUsed);
      const stats = await getCumulativeStats();
      const threeStarRate = getThreeStarRate(stats) / 100; // Convert percentage to ratio

      // creditToBalance=false: the PER-PUZZLE amber is queued in a harvest
      // batch, not credited yet. One-time windfalls (milestone / first-
      // completion / streak milestone) are credited to the spendable balance
      // immediately by the economy regardless of this flag.
      // skipPhaseProgress: shared-challenge wins pay full amber but feed ZERO
      // weighted phase progress (see awardPuzzleAmber's option contract).
      const amberResult = await awardPuzzleAmber(difficulty, stars, gameMode, threeStarRate, false, {
        skipPhaseProgress: isSharedChallenge,
        // Blind Offering pays the apex rung (2x amber, 2x progress cap);
        // stacked with Challenge it pays the maximal-trial rate (2.25x amber,
        // same 2x progress cap).
        blind,
        undoLimited,
        // Lexicon (rare-word) bonus — amber-only, never phase progress.
        lexicon,
        speed,
        // Amber-only resonance bonus (itemized by the economy, never progress).
        resonanceBonus,
      });

      // Cumulative mastery stat: resonant choices ever made (non-critical).
      if (safeResonantCount > 0) {
        recordResonantChoices(safeResonantCount).catch(() => {});
      }

      // Phase 5 (post-revelation) is set via markPostRevelation(), not phase progression.
      // calculatePhase() maxes at 4, so amberResult.newPhase can't exceed 4. If the player
      // is post-revelation, preserve phase 5 to avoid regressing the UI and dialogue phase.
      const postRev = await isPostRevelation();
      const effectivePhase: DialoguePhase = postRev ? 5 as DialoguePhase : amberResult.newPhase;

      // Apply variant bonus (full multiplier, no decay) + the once-per-day
      // fresh-variant bonus. creditToBalance=false: both are queued, not credited.
      const variantMultiplier = getVariantAmberMultiplier(variant);
      let variantBonus = 0;
      let variantAppliedMultiplier = 1.0;
      const variantRepeatDecay = 1.0;
      let freshVariantBonus = 0;
      if (variant !== 'standard' && variantMultiplier > 1.0) {
        const variantResult = await applyVariantAmberBonus(
          variant,
          amberResult.amount,
          variantMultiplier,
          false
        );
        variantBonus = variantResult.bonus;
        freshVariantBonus = variantResult.freshBonus;
        variantAppliedMultiplier = variantResult.appliedMultiplier;
        amberResult.newBalance = variantResult.newBalance;
        amberResult.amount += variantBonus + freshVariantBonus;
      }

      // Track the variant/blind/lexicon win for achievements + the variant-offer
      // nudge. Runs for blind/lexicon standard boards too (both compose with any variant).
      if (variant !== 'standard' || blind || lexicon || speed) {
        await recordVariantWin(variant, blind, lexicon, maxStack, speed);
      }

      // Crediting split: ONLY the per-puzzle amber (amount — incl. the variant/
      // fresh/resonance additions folded in above) is deferred into the harvest
      // batch, preserving the pit ritual. The one-time windfalls (milestone /
      // first-completion / streak milestone) were credited to the spendable
      // balance immediately by awardPuzzleAmber, so they never enter the batch.
      const queuedAmber = amberResult.amount;
      // Total earned this victory (queued per-puzzle share + instant windfalls)
      // — what the Victory modal itemizes and sums.
      const totalEarnedAmber = amberResult.amount
        + amberResult.milestoneBonus
        + amberResult.firstCompletionBonus
        + amberResult.streakMilestoneBonus;

      // Real itemization for the Victory modal — every part comes from the
      // economy itself (never re-derived in the UI); parts sum to the total.
      const amberBreakdown: AmberBreakdown = {
        base: amberResult.baseAmber ?? 0,
        starBonus: amberResult.starBonusAmber ?? 0,
        streakBonus: amberResult.streakBonus ?? 0,
        challengeBonus: amberResult.challengeBonus ?? 0,
        lexiconBonus: amberResult.lexiconBonus ?? 0,
        speedBonus: amberResult.speedBonus ?? 0,
        patronBonus: amberResult.patronBonus ?? 0,
        surpriseBonus: amberResult.surpriseBonus ?? 0,
        resonanceBonus: amberResult.resonanceBonus ?? 0,
        variantBonus,
        freshVariantBonus,
        firstCompletionBonus: amberResult.firstCompletionBonus ?? 0,
        milestoneBonus: amberResult.milestoneBonus ?? 0,
        streakMilestoneBonus: amberResult.streakMilestoneBonus ?? 0,
        total: totalEarnedAmber,
      };

      // Enqueue harvest batch with all completed words and computed amber value
      const harvestedWords = completedWords.length > 0
        ? [...new Set(completedWords.map(w => w.toUpperCase()))]
        : [];
      const harvestBatchId = generateBatchId();
      const harvestResult = await enqueueHarvestBatch({
        id: harvestBatchId,
        words: harvestedWords,
        amberValue: queuedAmber,
        createdAt: Date.now(),
        difficulty,
        gameMode,
        stars,
        variant,
        phaseAtHarvest: effectivePhase,
      });

      const pendingHarvest = await getPendingHarvestSummary();

      setCumulativeStats(stats);
      updatePuzzleCount(amberResult.puzzlesSolved);
      // When phase transition is pending, keep current phase at old value.
      // The pit screen will call confirmPhaseTransition() to advance it.
      if (!amberResult.phaseTransitionPending) {
        updateSessionPhase(effectivePhase);
        setCurrentPhase(effectivePhase);
      }
      // Balance reflects any instantly-credited windfalls (per-puzzle amber
      // stays queued); refresh from the economy's post-award value (clamped —
      // the mirror must never store a negative).
      setAmberBalance(Math.max(0, amberResult.newBalance));
      // Update pending phase transition state for pit screen
      if (amberResult.phaseTransitionPending) {
        setPendingPhaseTransition(effectivePhase);
        setPhaseProgressFraction(1.0);
      }

      // Record ritual words from the completed puzzle. Shared-challenge wins
      // pass ZERO ritual energy: the words still land in the ledger and the
      // trigger-word queue (flavor stays), but recordRitualWords' energy-based
      // phaseProgress feed gets nothing — the second half of the amber-only rule.
      let totalWordsFormed = 0;
      let ritualEnergy = 0;
      if (completedWords.length > 0) {
        ritualEnergy = isSharedChallenge ? 0 : calculateRitualEnergy(completedWords, effectivePhase);
        const triggerWords = extractTriggerWords(completedWords);
        const ritualResult = await recordRitualWords(completedWords, ritualEnergy, triggerWords);
        totalWordsFormed = ritualResult.totalWordsFormed;
        // Feed the FORMED words into the word-history cooldowns too. The
        // starting chain was recorded when the puzzle was served, so without
        // this the words the player actually built (half of what they see)
        // were invisible to bank-selection freshness and could repeat
        // immediately on the next board.
        await recordFormedWords(completedWords);
        // Fulfill any animal's outstanding offering request whose theme these
        // words match — the animal reacts by name on the next visit.
        recordOfferingFulfillment(completedWords).catch(() => {});
      }

      // Queue a one-time variant tutorial for animal dialogue.
      if (variant && variant !== 'standard') {
        recordVariantEncounter(variant).catch(() => {});
      }

      // Queue variant tutorials for any variants that just became unlocked.
      const newlyUnlocked = getNewlyUnlockedVariants(
        amberResult.puzzlesSolved,
        effectivePhase
      );
      for (const unlockedVariant of newlyUnlocked) {
        recordVariantEncounter(unlockedVariant).catch(() => {});
      }

      logEvent({
        type: 'puzzle_completed',
        data: {
          difficulty,
          stars,
          hintsUsed,
          invalidAttempts,
          gameMode,
          isDaily,
          amberEarned: totalEarnedAmber,
          challengeBonus: amberResult.challengeBonus,
          puzzlesSolved: amberResult.puzzlesSolved,
          phase: effectivePhase,
          phaseChanged: amberResult.phaseChanged,
          phaseAcceleration: amberResult.phaseAcceleration,
          ritualEnergy,
          variant,
          variantBonus,
          variantAppliedMultiplier,
          variantRepeatDecay,
        },
      });

      // Update daily + weekly quest progress and capture newly completed quests
      let questsCompleted: string[] = [];
      try {
        // A COMPLETE generation context, not just the event.
        //
        // A fresh install goes straight to the cold-open board, so HomeScreen —
        // previously the only caller that supplied a context — never mounts,
        // and this victory was the first thing to touch the quest service. With
        // no context, `isBelowJournalGate(undefined)` is false by design, so
        // the pre-journal dormancy gate never fired for ANY fresh install and a
        // full set was minted at puzzles-solved 1; and `unlockedAnimalCount`
        // fell back to 10, which kept both "talk to 6/9 animals" weeklies in
        // the pool for a player who had met nobody. That set then survived the
        // week, because a later context-full load sees a current periodId and
        // leaves it alone. Roughly 87% of weeks minted an unreachable one.
        //
        // It must be COMPLETE: rememberGenerationContext persists whatever it
        // is handed, so a partial context would re-introduce the ?? 10 animal
        // default on the next context-less load.
        // Read defensively: quest progress must not depend on this succeeding.
        // It sits inside the same try as updateQuestProgress, so a throw here
        // would silently skip the whole quest update for that victory. Falling
        // back to a context-less call restores the old (imperfect but working)
        // behaviour instead of losing progress outright.
        let questContext: WeeklyQuestGenerationContext | undefined;
        try {
          const questProgress = await getFullProgress();
          questContext = {
            puzzlesSolved: amberResult.puzzlesSolved,
            unlockedAnimalCount: (questProgress.unlockedAnimals ?? []).length,
            dailyUnlocked: false,
            challengeUnlocked: amberResult.puzzlesSolved >= 15,
            unlockedVariants: getUnlockedVariants(amberResult.puzzlesSolved, effectivePhase),
          };
        } catch {
          questContext = undefined;
        }
        const completedQuests = await updateQuestProgress({
          // The one caller that represents a completed board. The altar and the
          // Tending Shrine share this handler and must not advance solve_count.
          isSolve: true,
          difficulty,
          stars,
          hintsUsed,
          isDaily,
          isChallenge: gameMode === 'challenge',
          amberEarned: totalEarnedAmber,
          currentStreak: amberResult.currentStreak,
          variant,
          isSpeed: speed,
        }, effectivePhase, questContext);
        questsCompleted = completedQuests.map(q => q.title);
      } catch (_) {
        // Quest progress update is non-critical
      }

      return {
        earnedStars: stars,
        flawless,
        flawlessCount: stats.flawlessCount ?? 0,
        amberEarned: totalEarnedAmber,
        amberBreakdown,
        amberBalance: amberResult.newBalance,
        isDaily,
        phaseChanged: amberResult.phaseChanged,
        newPhase: effectivePhase,
        streakBonus: amberResult.streakBonus,
        challengeBonus: amberResult.challengeBonus,
        blind,
        undoLimited,
        surpriseBonus: amberResult.surpriseBonus,
        currentStreak: amberResult.currentStreak,
        milestoneBonus: amberResult.milestoneBonus,
        milestoneMessage: amberResult.milestoneMessage,
        cumulativeStats: stats,
        phaseAcceleration: amberResult.phaseAcceleration,
        totalWordsFormed,
        ritualEnergy,
        firstCompletionBonus: amberResult.firstCompletionBonus,
        variantBonus,
        resonanceBonus: amberResult.resonanceBonus ?? 0,
        resonantChoiceCount: safeResonantCount,
        freshVariantBonus,
        variant,
        variantAppliedMultiplier,
        variantRepeatDecay,
        questsCompleted,
        streakMilestoneBonus: amberResult.streakMilestoneBonus,
        streakMilestoneMessage: amberResult.streakMilestoneMessage,
        streakSaved: amberResult.streakSaved,
        harvestedWords,
        pendingHarvest,
        harvestBatchId,
        autoCollected: false,
        phaseTransitionPending: amberResult.phaseTransitionPending,
        harvestOverflow: harvestResult.overflow,
        puzzlesSolved: amberResult.puzzlesSolved,
      };
    } catch (err) {
      console.warn('Failed to record puzzle completion:', err);
      return {
        earnedStars: stars,
        amberEarned: 0,
        amberBalance,
        isDaily,
        phaseChanged: false,
        newPhase: currentPhase,
        streakBonus: 0,
        challengeBonus: 0,
        surpriseBonus: 0,
        currentStreak: 0,
        milestoneBonus: 0,
        milestoneMessage: null,
        cumulativeStats,
        phaseAcceleration: 1.0,
        totalWordsFormed: 0,
        ritualEnergy: 0,
        firstCompletionBonus: 0,
        variantBonus: 0,
        variant,
        variantAppliedMultiplier: 1.0,
        variantRepeatDecay: 1.0,
        streakMilestoneBonus: 0,
        streakMilestoneMessage: null,
        autoCollected: false,
        phaseTransitionPending: false,
        harvestOverflow: false,
        puzzlesSolved: cumulativeStats?.totalPuzzlesCompleted ?? 0,
      };
    } finally {
      recordInProgress.current = false;
    }
  }, [amberBalance, currentPhase, cumulativeStats]);

  const state: PersistenceState = {
    cumulativeStats,
    amberBalance,
    currentPhase,
    phaseProgressFraction,
    pendingPhaseTransition,
  };

  const actions: PersistenceActions = {
    recordVictory,
    setAmberBalance: setAmberBalanceSafe,
    refreshStats,
  };

  return [state, actions];
}
