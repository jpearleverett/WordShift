import { useState, useEffect, useCallback, useRef } from 'react';
import { Difficulty, GameMode } from '../types';
import { DialoguePhase } from '../types/homeWorld';
import {
  calculateStars,
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
} from '../services/amberCurrency';
import { enqueueHarvestBatch } from '../services/wordHarvest';
import { updatePuzzleCount, updateSessionPhase } from '../services/dialogueSession';
import { calculateRitualEnergy, extractTriggerWords } from '../services/localGenerator';
import { GameEvent, logEvent } from '../services/eventLogger';
import { updateQuestProgress } from '../services/weeklyQuests';
import { PuzzleVariant, getVariantAmberMultiplier, getNewlyUnlockedVariants } from '../services/puzzleVariety';

export interface VictoryData {
  earnedStars: number;
  amberEarned: number;
  amberBalance: number;
  phaseChanged: boolean;
  newPhase: DialoguePhase;
  streakBonus: number;
  challengeBonus: number;
  currentStreak: number;
  milestoneBonus: number;
  milestoneMessage: string | null;
  cumulativeStats: CumulativeStats | null;
  phaseAcceleration: number;
  /** Total words ever formed (for ritual tracking) */
  totalWordsFormed: number;
  /** Ritual energy of this puzzle */
  ritualEnergy: number;
  /** Bonus amber from puzzle variant mode */
  variantBonus: number;
  /** Puzzle variant used */
  variant: PuzzleVariant;
  /** Effective multiplier after anti-farm decay */
  variantAppliedMultiplier?: number;
  /** Repeat decay factor (1.0 = no decay) */
  variantRepeatDecay?: number;
  /** Bonus amber from streak milestone (one-time at 3/7/14/30 days) */
  streakMilestoneBonus: number;
  /** Message for streak milestone achievement */
  streakMilestoneMessage: string | null;
  /** Titles of quests completed this victory */
  questsCompleted?: string[];
  /** Number of words harvested into the pending batch */
  harvestWordCount: number;
  /** Amber value queued in the harvest batch (not yet spendable) */
  harvestAmberValue: number;
}

export interface PersistenceState {
  cumulativeStats: CumulativeStats | null;
  amberBalance: number;
  currentPhase: DialoguePhase;
}

export interface PersistenceActions {
  recordVictory: (
    difficulty: Difficulty,
    hintsUsed: number,
    invalidAttempts: number,
    gameMode?: GameMode,
    completedWords?: string[],
    variant?: PuzzleVariant,
    isDaily?: boolean
  ) => Promise<VictoryData>;
  setAmberBalance: (balance: number) => void;
  refreshStats: () => Promise<void>;
}

export function useGamePersistence(): [PersistenceState, PersistenceActions] {
  const [cumulativeStats, setCumulativeStats] = useState<CumulativeStats | null>(null);
  const [amberBalance, setAmberBalance] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<DialoguePhase>(0);
  const recordInProgress = useRef(false);

  useEffect(() => {
    // Initialize all services concurrently with proper error handling
    Promise.all([
      getCumulativeStats(),
      getAmberBalance(),
      getCurrentPhase(),
    ]).then(([stats, balance, phase]) => {
      setCumulativeStats(stats);
      setAmberBalance(balance);
      setCurrentPhase(phase);
    }).catch(err => {
      console.warn('Failed to initialize persistence:', err);
    });
  }, []);

  const refreshStats = useCallback(async () => {
    const [stats, balance, phase] = await Promise.all([
      getCumulativeStats(),
      getAmberBalance(),
      getCurrentPhase(),
    ]);
    setCumulativeStats(stats);
    setAmberBalance(balance);
    setCurrentPhase(phase);
  }, []);

  const recordVictory = useCallback(async (
    difficulty: Difficulty,
    hintsUsed: number,
    invalidAttempts: number,
    gameMode: GameMode = 'standard',
    completedWords: string[] = [],
    variant: PuzzleVariant = 'standard',
    isDaily: boolean = false
  ): Promise<VictoryData> => {
    const stars = calculateStars(hintsUsed, invalidAttempts);

    // Guard against concurrent recordVictory calls
    if (recordInProgress.current) {
      return {
        earnedStars: stars,
        amberEarned: 0,
        amberBalance,
        phaseChanged: false,
        newPhase: currentPhase,
        streakBonus: 0,
        challengeBonus: 0,
        currentStreak: 0,
        milestoneBonus: 0,
        milestoneMessage: null,
        cumulativeStats,
        phaseAcceleration: 1.0,
        totalWordsFormed: 0,
        ritualEnergy: 0,
        variantBonus: 0,
        variant: 'standard',
        streakMilestoneBonus: 0,
        streakMilestoneMessage: null,
        harvestWordCount: 0,
        harvestAmberValue: 0,
      };
    }

    recordInProgress.current = true;
    try {
      // Record star stats first so we can get the three-star rate
      await recordPuzzleCompletion(difficulty, hintsUsed, invalidAttempts);
      const stats = await getCumulativeStats();
      const threeStarRate = getThreeStarRate(stats) / 100; // Convert percentage to ratio

      // creditToBalance=false: compute reward but don't add to spendable amber.
      // The amber is queued in a harvest batch and credited when offered in the Pit.
      const amberResult = await awardPuzzleAmber(difficulty, stars, gameMode, threeStarRate, false);

      // Apply variant bonus with anti-farm decay and persistence (also deferred).
      const variantMultiplier = getVariantAmberMultiplier(variant);
      let variantBonus = 0;
      let variantAppliedMultiplier = 1.0;
      let variantRepeatDecay = 1.0;
      if (variant !== 'standard' && variantMultiplier > 1.0) {
        const variantResult = await applyVariantAmberBonus(
          variant,
          amberResult.amount,
          variantMultiplier,
          false
        );
        variantBonus = variantResult.bonus;
        variantAppliedMultiplier = variantResult.appliedMultiplier;
        variantRepeatDecay = variantResult.repeatDecay;
        amberResult.newBalance = variantResult.newBalance;
        amberResult.amount += variantBonus;
      }

      // Total amber value for this puzzle (base + milestones + first-completion + streak milestone + variant)
      const totalHarvestAmber = amberResult.amount
        + amberResult.milestoneBonus
        + amberResult.firstCompletionBonus
        + amberResult.streakMilestoneBonus;

      // Enqueue harvest batch with all completed words and computed amber
      const harvestWords = completedWords.length > 0 ? completedWords : [];
      const batchId = `harvest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await enqueueHarvestBatch({
        id: batchId,
        words: harvestWords,
        amberValue: totalHarvestAmber,
        createdAt: Date.now(),
        difficulty,
        gameMode,
        stars,
        variant,
        phaseAtHarvest: amberResult.newPhase,
      });

      setCumulativeStats(stats);
      updatePuzzleCount(amberResult.puzzlesSolved);
      updateSessionPhase(amberResult.newPhase);
      setAmberBalance(amberResult.newBalance);
      setCurrentPhase(amberResult.newPhase);

      // Record ritual words from the completed puzzle
      let totalWordsFormed = 0;
      let ritualEnergy = 0;
      if (completedWords.length > 0) {
        ritualEnergy = calculateRitualEnergy(completedWords, amberResult.newPhase);
        const triggerWords = extractTriggerWords(completedWords);
        const ritualResult = await recordRitualWords(completedWords, ritualEnergy, triggerWords);
        totalWordsFormed = ritualResult.totalWordsFormed;
      }

      // Queue a one-time variant tutorial for animal dialogue.
      if (variant && variant !== 'standard') {
        recordVariantEncounter(variant).catch(() => {});
      }

      // Queue variant tutorials for any variants that just became unlocked.
      // This ensures the animal introduces the variant as soon as it unlocks,
      // even if the player hasn't tried it yet.
      const newlyUnlocked = getNewlyUnlockedVariants(
        amberResult.puzzlesSolved,
        amberResult.newPhase
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
          amberEarned: amberResult.amount,
          challengeBonus: amberResult.challengeBonus,
          puzzlesSolved: amberResult.puzzlesSolved,
          phase: amberResult.newPhase,
          phaseChanged: amberResult.phaseChanged,
          phaseAcceleration: amberResult.phaseAcceleration,
          ritualEnergy,
          variant,
          variantBonus,
          variantAppliedMultiplier,
          variantRepeatDecay,
        },
      });

      // Update weekly quest progress and capture newly completed quests
      let questsCompleted: string[] = [];
      try {
        const completedQuests = await updateQuestProgress({
          difficulty,
          stars,
          hintsUsed,
          isDaily,
          isChallenge: gameMode === 'challenge',
          amberEarned: amberResult.amount,
          currentStreak: amberResult.currentStreak,
        }, amberResult.newPhase);
        questsCompleted = completedQuests.map(q => q.title);
      } catch (_) {
        // Quest progress update is non-critical
      }

      return {
        earnedStars: stars,
        amberEarned: amberResult.amount,
        amberBalance: amberResult.newBalance,
        phaseChanged: amberResult.phaseChanged,
        newPhase: amberResult.newPhase,
        streakBonus: amberResult.streakBonus,
        challengeBonus: amberResult.challengeBonus,
        currentStreak: amberResult.currentStreak,
        milestoneBonus: amberResult.milestoneBonus,
        milestoneMessage: amberResult.milestoneMessage,
        cumulativeStats: stats,
        phaseAcceleration: amberResult.phaseAcceleration,
        totalWordsFormed,
        ritualEnergy,
        variantBonus,
        variant,
        variantAppliedMultiplier,
        variantRepeatDecay,
        questsCompleted,
        streakMilestoneBonus: amberResult.streakMilestoneBonus,
        streakMilestoneMessage: amberResult.streakMilestoneMessage,
        harvestWordCount: harvestWords.length,
        harvestAmberValue: totalHarvestAmber,
      };
    } catch (err) {
      console.warn('Failed to record puzzle completion:', err);
      return {
        earnedStars: stars,
        amberEarned: 0,
        amberBalance,
        phaseChanged: false,
        newPhase: currentPhase,
        streakBonus: 0,
        challengeBonus: 0,
        currentStreak: 0,
        milestoneBonus: 0,
        milestoneMessage: null,
        cumulativeStats,
        phaseAcceleration: 1.0,
        totalWordsFormed: 0,
        ritualEnergy: 0,
        variantBonus: 0,
        variant: 'standard',
        variantAppliedMultiplier: 1.0,
        variantRepeatDecay: 1.0,
        streakMilestoneBonus: 0,
        streakMilestoneMessage: null,
        harvestWordCount: 0,
        harvestAmberValue: 0,
      };
    } finally {
      recordInProgress.current = false;
    }
  }, [amberBalance, currentPhase, cumulativeStats]);

  const state: PersistenceState = {
    cumulativeStats,
    amberBalance,
    currentPhase,
  };

  const actions: PersistenceActions = {
    recordVictory,
    setAmberBalance,
    refreshStats,
  };

  return [state, actions];
}
