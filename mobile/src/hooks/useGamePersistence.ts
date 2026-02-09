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
} from '../services/amberCurrency';
import { updatePuzzleCount } from '../services/dialogueSession';
import { GameEvent, logEvent } from '../services/eventLogger';

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
}

export interface PersistenceState {
  cumulativeStats: CumulativeStats | null;
  amberBalance: number;
  currentPhase: DialoguePhase;
}

export interface PersistenceActions {
  recordVictory: (difficulty: Difficulty, hintsUsed: number, invalidAttempts: number, gameMode?: GameMode) => Promise<VictoryData>;
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
    const stats = await getCumulativeStats();
    setCumulativeStats(stats);
    const balance = await getAmberBalance();
    setAmberBalance(balance);
  }, []);

  const recordVictory = useCallback(async (
    difficulty: Difficulty,
    hintsUsed: number,
    invalidAttempts: number,
    gameMode: GameMode = 'standard'
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
      };
    }

    recordInProgress.current = true;
    try {
      // Record star stats first so we can get the three-star rate
      await recordPuzzleCompletion(difficulty, hintsUsed, invalidAttempts);
      const stats = await getCumulativeStats();
      const threeStarRate = getThreeStarRate(stats) / 100; // Convert percentage to ratio

      const amberResult = await awardPuzzleAmber(difficulty, stars, gameMode, threeStarRate);

      setCumulativeStats(stats);
      updatePuzzleCount(amberResult.puzzlesSolved);
      setAmberBalance(amberResult.newBalance);
      setCurrentPhase(amberResult.newPhase);

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
        },
      });

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
