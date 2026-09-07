import { useState, useCallback } from 'react';
import {
  checkAchievements,
  buildAchievementCheckState,
  Achievement,
  AchievementCheckState,
  getShareCount,
} from '../services/achievements';
import { getFullProgress, getVariantWinStats } from '../services/amberCurrency';
import { getDailyStatus } from '../services/dailyChallenge';
import { VictoryData } from './useGamePersistence';
import { hapticHeavy } from '../services/haptics';
import { playUiSound } from '../services/uiSound';

export interface AchievementQueueState {
  currentAchievement: Achievement | null;
}

export interface AchievementQueueActions {
  checkForAchievements: (victory: VictoryData) => Promise<void>;
  /**
   * Run a check against live stored state, with no victory in hand — for the
   * moments that change an achievement's inputs OUTSIDE the victory chain.
   * The journey achievements are the whole reason it exists: they key on
   * `currentPhase`, which only ever advances at the pit's ward-ignition
   * ceremony, so with the victory chain as the only trigger they sat locked
   * until the player happened to finish another puzzle.
   */
  checkAchievementsNow: () => Promise<void>;
  dismissAchievement: () => void;
}

export function useAchievementQueue(): [AchievementQueueState, AchievementQueueActions] {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const currentAchievement = queue[0] ?? null;

  /** The one presentation path, shared by both entry points so neither drifts. */
  const presentUnlocks = useCallback(async (state: AchievementCheckState) => {
    const newAchievements = await checkAchievements(state);
    if (newAchievements.length === 0) return;
    hapticHeavy();
    // achievement.wav (a composed 1.3s fanfare) shipped in the pack but was
    // never played; it resolves its dark mirror by phase automatically.
    playUiSound('achievement');
    setQueue(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const uniqueNew = newAchievements.filter(a => !existingIds.has(a.id));
      return uniqueNew.length > 0 ? [...prev, ...uniqueNew] : prev;
    });
  }, []);

  const checkForAchievements = useCallback(async (victory: VictoryData) => {
    try {
      const progress = await getFullProgress();
      const shareCount = await getShareCount();
      const dailyStatus = await getDailyStatus();
      const variantStats = await getVariantWinStats();
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
            MEDIUM_PLUS: { completed: 0, stars: 0 },
            HARD: { completed: 0, stars: 0 },
            EXPERT: { completed: 0, stars: 0 },
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
        variantWins: variantStats.variantWins,
        blindWins: variantStats.blindWins,
        lexiconWins: variantStats.lexiconWins,
        speedWins: variantStats.speedWins,
        maxStackWins: variantStats.maxStackWins,
      };

      await presentUnlocks(state);
    } catch (err) {
      console.warn('Achievement check failed:', err);
    }
  }, [presentUnlocks]);

  // `buildAchievementCheckState` assembles the same shape from live storage
  // (and lazily require()s the economy graph to stay import-cycle-safe), so a
  // check outside the victory chain needs no extra plumbing.
  const checkAchievementsNow = useCallback(async () => {
    try {
      await presentUnlocks(await buildAchievementCheckState());
    } catch (err) {
      console.warn('Achievement check failed:', err);
    }
  }, [presentUnlocks]);

  const dismissAchievement = useCallback(() => {
    // A completion callback belongs to the toast that created it. Stopping an
    // old animation or receiving the same dismissal twice cannot consume the
    // next achievement before the player has seen it.
    const id = currentAchievement?.id;
    setQueue(pending => id && pending[0]?.id === id ? pending.slice(1) : pending);
  }, [currentAchievement?.id]);

  return [
    { currentAchievement },
    { checkForAchievements, checkAchievementsNow, dismissAchievement },
  ];
}
