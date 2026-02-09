import { useState, useEffect, useCallback } from 'react';
import {
  checkAchievements,
  Achievement,
  AchievementCheckState,
  getShareCount,
} from '../services/achievements';
import { getFullProgress, getDecorationCount } from '../services/amberCurrency';
import { getDailyStatus } from '../services/dailyChallenge';
import { VictoryData } from './useGamePersistence';
import { hapticHeavy } from '../services/haptics';

export interface AchievementQueueState {
  currentAchievement: Achievement | null;
}

export interface AchievementQueueActions {
  checkForAchievements: (victory: VictoryData) => Promise<void>;
  dismissAchievement: () => void;
}

export function useAchievementQueue(): [AchievementQueueState, AchievementQueueActions] {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

  // Auto-process queue: show next achievement when current is dismissed
  useEffect(() => {
    if (!currentAchievement && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrentAchievement(next);
      setQueue(rest);
    }
  }, [currentAchievement, queue]);

  const checkForAchievements = useCallback(async (victory: VictoryData) => {
    try {
      const progress = await getFullProgress();
      const shareCount = await getShareCount();
      const dailyStatus = await getDailyStatus();
      const decorationCount = await getDecorationCount();

      const state: AchievementCheckState = {
        stats: victory.cumulativeStats || {
          totalPuzzlesCompleted: 0,
          totalStars: 0,
          threeStarCount: 0,
          twoStarCount: 0,
          oneStarCount: 0,
          totalInvalidAttempts: 0,
          totalHintsUsed: 0,
          noHintPuzzleCount: 0,
          byDifficulty: {
            EASY: { completed: 0, stars: 0 },
            MEDIUM: { completed: 0, stars: 0 },
            HARD: { completed: 0, stars: 0 },
          },
          lastUpdated: 0,
        },
        puzzlesSolved: progress.puzzlesSolved,
        currentPhase: progress.currentPhase,
        currentStreak: victory.currentStreak,
        unlockedAnimals: progress.unlockedAnimals.length,
        unlockedRooms: progress.unlockedRooms.length,
        amberEarned: progress.totalAmberEarned,
        dailyChallengesCompleted: dailyStatus.totalCompleted,
        shareCount,
        challengeCompletions: progress.challengeCompletions || 0,
        decorationCount,
      };

      const newAchievements = await checkAchievements(state);
      if (newAchievements.length > 0) {
        hapticHeavy();
        setQueue(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          const uniqueNew = newAchievements.filter(a => !existingIds.has(a.id));
          return uniqueNew.length > 0 ? [...prev, ...uniqueNew] : prev;
        });
      }
    } catch (err) {
      console.warn('Achievement check failed:', err);
    }
  }, []);

  const dismissAchievement = useCallback(() => {
    setCurrentAchievement(null);
  }, []);

  return [
    { currentAchievement },
    { checkForAchievements, dismissAchievement },
  ];
}
