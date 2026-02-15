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
import { updatePuzzleCount, updateSessionPhase } from '../services/dialogueSession';
import { calculateRitualEnergy, extractTriggerWords } from '../services/localGenerator';
import { GameEvent, logEvent } from '../services/eventLogger';
import { updateQuestProgress } from '../services/weeklyQuests';
import { PuzzleVariant, getVariantAmberMultiplier } from '../services/puzzleVariety';

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
    variant?: PuzzleVariant
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
    variant: PuzzleVariant = 'standard'
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
      };
    }

    recordInProgress.current = true;
    try {
      // Record star stats first so we can get the three-star rate
      await recordPuzzleCompletion(difficulty, hintsUsed, invalidAttempts);
      const stats = await getCumulativeStats();
      const threeStarRate = getThreeStarRate(stats) / 100; // Convert percentage to ratio

      const amberResult = await awardPuzzleAmber(difficulty, stars, gameMode, threeStarRate);

      // Apply variant bonus with anti-farm decay and persistence.
      const variantMultiplier = getVariantAmberMultiplier(variant);
      let variantBonus = 0;
      let variantAppliedMultiplier = 1.0;
      let variantRepeatDecay = 1.0;
      if (variant !== 'standard' && variantMultiplier > 1.0) {
        const variantResult = await applyVariantAmberBonus(
          variant,
          amberResult.amount,
          variantMultiplier
        );
        variantBonus = variantResult.bonus;
        variantAppliedMultiplier = variantResult.appliedMultiplier;
        variantRepeatDecay = variantResult.repeatDecay;
        amberResult.newBalance = variantResult.newBalance;
        amberResult.amount += variantBonus;
      }

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

      logEvent({
        type: 'puzzle_completed',
        data: {
          difficulty,
          stars,
          hintsUsed,
          invalidAttempts,
          gameMode,
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

      // Update weekly quest progress (non-blocking)
      updateQuestProgress({
        difficulty,
        stars,
        hintsUsed,
        isDaily: false, // Caller should update for daily
        isChallenge: gameMode === 'challenge',
        amberEarned: amberResult.amount,
        currentStreak: amberResult.currentStreak,
      }, amberResult.newPhase).catch(() => {});

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
        streakMilestoneBonus: amberResult.streakMilestoneBonus,
        streakMilestoneMessage: amberResult.streakMilestoneMessage,
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
