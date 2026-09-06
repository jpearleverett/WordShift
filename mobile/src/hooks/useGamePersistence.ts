import { useState, useEffect, useCallback, useRef } from 'react';
import { Difficulty, GameMode } from '../types';
import { DialoguePhase } from '../types/homeWorld';
import { getCumulativeStats, CumulativeStats } from '../services/starRating';
import { getAmberBalance, getCurrentPhase, getPhaseProgressFraction,
  getPendingPhaseTransition, isPostRevelation } from '../services/amberCurrency';
import { updatePuzzleCount, updateSessionPhase } from '../services/dialogueSession';
import { logEvent } from '../services/eventLogger';
import { PuzzleVariant } from '../services/puzzleVariety';
import { generateBatchId, HarvestSummary } from '../services/wordHarvest';
import { createVictoryInput, recordDurableVictory } from '../services/victoryPersistence';

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
  dailyOutcome?: {
    progress: { currentStreak: number; streakSavedByFreeze?: boolean; streakDecayedTo?: number };
    milestone: { amber: number; message: string } | null;
    eventBonus: number;
    credited: boolean;
  };
  endgame?: { kind: 'arrival' | 'post_arrival' | 'dwell'; houseComplete: boolean; dwellBefore?: number; dwell?: number };
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
    speed?: boolean,
    completionId?: string,
    finale?: { finalBoard?: boolean; ritualWord?: string; phaseBefore?: DialoguePhase; dailyDate?: string; unbrokenWeave?: boolean }
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
  const pendingCompletionId = useRef<string | null>(null);

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
    speed: boolean = false,
    completionId?: string,
    finale?: { finalBoard?: boolean; ritualWord?: string; phaseBefore?: DialoguePhase; dailyDate?: string; unbrokenWeave?: boolean }
  ): Promise<VictoryData> => {
    if (recordInProgress.current) throw new Error('This puzzle is already being saved');
    recordInProgress.current = true;
    // A caller-supplied board ID survives app-level retries. The fallback keeps
    // the same intent after an error within this hook instance.
    pendingCompletionId.current ??= completionId ?? generateBatchId();
    try {
      const result = await recordDurableVictory(createVictoryInput({
        completionId: pendingCompletionId.current, difficulty, hintsUsed, invalidAttempts,
        gameMode, completedWords, variant, isDaily, undosUsed, blind, isSharedChallenge,
        resonantChoiceCount, lexicon, maxStack, undoLimited, speed, ...finale,
      }));
      pendingCompletionId.current = null;
      setCumulativeStats(result.cumulativeStats);
      updatePuzzleCount(result.puzzlesSolved);
      setAmberBalance(Math.max(0, result.amberBalance));
      if (!result.phaseTransitionPending) {
        updateSessionPhase(result.newPhase);
        setCurrentPhase(result.newPhase);
      } else {
        setPendingPhaseTransition(result.newPhase);
        setPhaseProgressFraction(1);
      }
      logEvent({ type: 'puzzle_completed', data: {
        difficulty, stars: result.earnedStars, hintsUsed, invalidAttempts, gameMode, isDaily,
        amberEarned: result.amberEarned, puzzlesSolved: result.puzzlesSolved, phase: result.newPhase,
        phaseChanged: result.phaseChanged, phaseAcceleration: result.phaseAcceleration,
        challengeBonus: result.challengeBonus, ritualEnergy: result.ritualEnergy,
        variant, variantBonus: result.variantBonus, variantAppliedMultiplier: result.variantAppliedMultiplier,
        variantRepeatDecay: result.variantRepeatDecay,
      }});
      return result;
    } finally { recordInProgress.current = false; }

  }, []);

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
