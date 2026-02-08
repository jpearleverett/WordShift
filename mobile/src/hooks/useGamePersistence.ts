import { useState, useEffect, useCallback } from 'react';
import { Difficulty } from '../types';
import { DialoguePhase } from '../types/homeWorld';
import {
  calculateStars,
  recordPuzzleCompletion,
  getCumulativeStats,
  CumulativeStats,
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
  currentStreak: number;
  milestoneBonus: number;
  milestoneMessage: string | null;
  cumulativeStats: CumulativeStats | null;
}

export interface PersistenceState {
  cumulativeStats: CumulativeStats | null;
  amberBalance: number;
  currentPhase: DialoguePhase;
}

export interface PersistenceActions {
  recordVictory: (difficulty: Difficulty, hintsUsed: number, invalidAttempts: number) => Promise<VictoryData>;
  setAmberBalance: (balance: number) => void;
  refreshStats: () => Promise<void>;
}

export function useGamePersistence(): [PersistenceState, PersistenceActions] {
  const [cumulativeStats, setCumulativeStats] = useState<CumulativeStats | null>(null);
  const [amberBalance, setAmberBalance] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<DialoguePhase>(0);

  useEffect(() => {
    getCumulativeStats().then(setCumulativeStats);
    getAmberBalance().then(setAmberBalance);
    getCurrentPhase().then(setCurrentPhase);
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
    invalidAttempts: number
  ): Promise<VictoryData> => {
    const stars = calculateStars(hintsUsed, invalidAttempts);

    try {
      const [_, amberResult] = await Promise.all([
        recordPuzzleCompletion(difficulty, hintsUsed, invalidAttempts),
        awardPuzzleAmber(difficulty, stars),
      ]);

      const stats = await getCumulativeStats();
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
          amberEarned: amberResult.amount,
          puzzlesSolved: amberResult.puzzlesSolved,
          phase: amberResult.newPhase,
          phaseChanged: amberResult.phaseChanged,
        },
      });

      return {
        earnedStars: stars,
        amberEarned: amberResult.amount,
        amberBalance: amberResult.newBalance,
        phaseChanged: amberResult.phaseChanged,
        newPhase: amberResult.newPhase,
        streakBonus: amberResult.streakBonus,
        currentStreak: amberResult.currentStreak,
        milestoneBonus: amberResult.milestoneBonus,
        milestoneMessage: amberResult.milestoneMessage,
        cumulativeStats: stats,
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
        currentStreak: 0,
        milestoneBonus: 0,
        milestoneMessage: null,
        cumulativeStats,
      };
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
