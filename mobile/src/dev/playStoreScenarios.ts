import {
  DAILY_CHALLENGE_UNLOCK_PUZZLES,
  PHASE_THRESHOLDS,
} from '../constants/gameBalance';
import { GameState } from '../types';
import type {
  Difficulty,
  MoveDelta,
  PuzzleSolutionStep,
  RowData,
} from '../types';
import type { DialoguePhase, HomeWorldProgress } from '../types/homeWorld';
import { CURRENT_SCHEMA_VERSION } from '../services/dataMigration';
import type { AchievementProgress } from '../services/achievements';
import type {
  DailyChallengeProgress,
  DailyChallengeResult,
} from '../services/dailyChallenge';
import type { SavedPuzzleState } from '../services/puzzleSaveState';
import type { CumulativeStats } from '../services/starRating';

export const PLAY_STORE_SCENARIO_NAMES = [
  'puzzle-preview',
  'puzzle-chain',
  'home-sunny',
  'animal-dialogue',
  'variant-menu',
  'daily',
  'flawless-victory',
  'home-dusk',
] as const;

export type PlayStoreScenarioName = typeof PLAY_STORE_SCENARIO_NAMES[number];

export interface PlayStoreScenario {
  name: PlayStoreScenarioName;
  storage: Record<string, string>;
}

const SCENARIO_SET = new Set<string>(PLAY_STORE_SCENARIO_NAMES);
const SUNNY_ANIMALS = ['fox', 'pangolin', 'owl', 'axolotl'];
const SUNNY_ROOMS = ['cozy_den', 'kitchen', 'study', 'aquarium'];
const ALL_DIFFICULTIES: Difficulty[] = [
  'EASY',
  'MEDIUM',
  'MEDIUM_PLUS',
  'HARD',
];
const DAILY_CAPTURE_PUZZLES = Math.max(10, DAILY_CHALLENGE_UNLOCK_PUZZLES);
const FIRST_FLAWLESS_ACHIEVEMENTS = [
  'first_puzzle',
  'first_perfect',
  'flawless_first',
  'first_animal',
];

export function parsePlayStoreScenario(
  search: string,
  isDev: boolean,
  platform: string
): PlayStoreScenarioName | null {
  if (!isDev || platform !== 'web') return null;
  const value = new URLSearchParams(search).get('playStoreScenario');
  return value && SCENARIO_SET.has(value)
    ? value as PlayStoreScenarioName
    : null;
}

function baseProgress(
  today: string,
  overrides: Partial<HomeWorldProgress> = {}
): HomeWorldProgress {
  return {
    amber: 0,
    totalAmberEarned: 0,
    unlockedAnimals: ['fox'],
    unlockedRooms: ['cozy_den'],
    currentPhase: 0,
    puzzlesSolved: 0,
    phaseProgress: 0,
    phasePuzzleThresholds: [...PHASE_THRESHOLDS],
    lastDialogueRead: { fox: 0 },
    introsSeen: ['fox'],
    currentStreak: 0,
    lastPlayDate: today,
    challengeCompletions: 0,
    reservedUnlockId: null,
    ritualWords: [],
    totalWordsFormed: 0,
    ritualEnergy: 0,
    triggerWordQueue: [],
    houseCompleted: false,
    finalPuzzleCompleted: false,
    postRevelation: false,
    phase4Dwell: 0,
    tutorialSeedsPlanted: true,
    consumedCoordinatedEvents: [],
    pendingVariantTutorials: [],
    seenVariantTutorials: ['reverse', 'double_shift', 'speed'],
    preferredPuzzleVariant: 'standard',
    lastVariantPlayed: 'standard',
    sameVariantStreak: 0,
    completedDifficulties: [],
    variantWeeklyUsage: {},
    variantWins: {},
    blindWins: 0,
    variantFreshDates: {},
    cycleCount: 0,
    cycleOpeningSeen: 0,
    streakFreezes: 1,
    lastFreeStreakFreezeDate: today,
    pendingPhaseTransition: null,
    phaseProgressFraction: 0,
    ...overrides,
  };
}

function sunnyProgress(today: string): HomeWorldProgress {
  return baseProgress(today, {
    amber: 180,
    totalAmberEarned: 620,
    unlockedAnimals: [...SUNNY_ANIMALS],
    unlockedRooms: [...SUNNY_ROOMS],
    currentPhase: 0,
    puzzlesSolved: 12,
    phaseProgress: 12,
    lastDialogueRead: {
      fox: 0,
      pangolin: 0,
      owl: 0,
      axolotl: 0,
    },
    introsSeen: [...SUNNY_ANIMALS],
    currentStreak: 3,
    completedDifficulties: ['EASY', 'MEDIUM'],
    phaseProgressFraction: 0.6,
  });
}

function duskProgress(today: string): HomeWorldProgress {
  return baseProgress(today, {
    amber: 180,
    totalAmberEarned: 1200,
    unlockedAnimals: [...SUNNY_ANIMALS],
    unlockedRooms: [...SUNNY_ROOMS],
    currentPhase: 2,
    puzzlesSolved: 60,
    phaseProgress: 70,
    lastDialogueRead: {
      fox: 0,
      pangolin: 0,
      owl: 0,
      axolotl: 0,
    },
    introsSeen: [...SUNNY_ANIMALS],
    currentStreak: 7,
    completedDifficulties: ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'],
    pendingPhaseTransition: null,
    phaseProgressFraction: (70 - PHASE_THRESHOLDS[2]) /
      (PHASE_THRESHOLDS[3] - PHASE_THRESHOLDS[2]),
    postRevelation: false,
  });
}

function baseStats(
  completed: number,
  completedDifficulties: Difficulty[]
): CumulativeStats {
  const threeStarCount = Math.floor(completed * 0.85);
  const twoStarCount = completed - threeStarCount;
  const oneStarCount = 0;
  const byDifficulty: CumulativeStats['byDifficulty'] = {
    EASY: { completed: 0, stars: 0 },
    MEDIUM: { completed: 0, stars: 0 },
    MEDIUM_PLUS: { completed: 0, stars: 0 },
    HARD: { completed: 0, stars: 0 },
  };
  const difficulties = completedDifficulties.length > 0
    ? completedDifficulties
    : ['EASY' as const];
  const baseCompleted = Math.floor(completed / difficulties.length);
  let completionRemainder = completed % difficulties.length;

  for (const difficulty of difficulties) {
    byDifficulty[difficulty].completed = baseCompleted +
      (completionRemainder-- > 0 ? 1 : 0);
  }

  let remainingThreeStars = threeStarCount;
  for (const difficulty of ALL_DIFFICULTIES) {
    const difficultyCompleted = byDifficulty[difficulty].completed;
    const difficultyThreeStars = Math.min(
      difficultyCompleted,
      remainingThreeStars
    );
    byDifficulty[difficulty].stars =
      difficultyThreeStars * 3 +
      (difficultyCompleted - difficultyThreeStars) * 2;
    remainingThreeStars -= difficultyThreeStars;
  }

  return {
    totalPuzzlesCompleted: completed,
    totalStars: threeStarCount * 3 + twoStarCount * 2 + oneStarCount,
    threeStarCount,
    twoStarCount,
    oneStarCount,
    totalInvalidAttempts: twoStarCount * 2,
    totalHintsUsed: 0,
    noHintPuzzleCount: completed,
    flawlessCount: Math.floor(threeStarCount * 0.75),
    byDifficulty,
    personalBests: {
      EASY: { fewestHints: 0, fewestInvalidAttempts: 0 },
      MEDIUM: { fewestHints: 0, fewestInvalidAttempts: 0 },
      MEDIUM_PLUS: { fewestHints: 0, fewestInvalidAttempts: 0 },
      HARD: { fewestHints: 0, fewestInvalidAttempts: 0 },
    },
    lastUpdated: 0,
  };
}

function makeRow(originalWord: string, rowIndex: number): RowData {
  return {
    id: `capture-row-${rowIndex}`,
    originalWord,
    words: originalWord.split('').map((char, letterIndex) => ({
      id: `capture-row-${rowIndex}-letter-${letterIndex}`,
      char,
      isLocked: false,
    })),
  };
}

function tutorialRows(): RowData[] {
  return ['PLAY', 'PANT', 'HEAR'].map(makeRow);
}

function canonicalSolution(): PuzzleSolutionStep[] {
  return [
    {
      stepIndex: 0,
      sourceWord: 'PLAY',
      targetWord: 'PANT',
      letterToMove: 'L',
      explanation: 'Move L from PLAY into PANT to make PAY and PLANT.',
      insertionPosition: 1,
      removalPosition: 1,
    },
    {
      stepIndex: 1,
      sourceWord: 'PLANT',
      targetWord: 'HEAR',
      letterToMove: 'T',
      explanation: 'Move T from PLANT into HEAR to make PLAN and HEART.',
      insertionPosition: 4,
      removalPosition: 4,
    },
  ];
}

function baseSave(
  rows: RowData[],
  currentPhase: DialoguePhase = 0
): SavedPuzzleState {
  return {
    rows,
    activeRowIndex: 0,
    selectedLetter: null,
    gameState: GameState.PLAYING,
    message: '',
    history: [],
    invalidAttempts: 0,
    hintsUsed: 0,
    undosRemaining: Infinity,
    difficulty: 'EASY',
    currentWordLength: 4,
    hint: '',
    solution: canonicalSolution(),
    reverseSolution: undefined,
    gameMode: 'standard',
    currentVariant: 'standard',
    selectedVariant: 'standard',
    moveDirection: 'down',
    blindMode: false,
    currentPhase,
    lastFormedWord: null,
    doubleShiftPhase: null,
    isPlayingDaily: false,
    dailyDate: null,
    speedTimerExpireAt: null,
    speedTimeRemainingSec: null,
    savedAt: 0,
  };
}

function previewSave(currentPhase: DialoguePhase = 0): SavedPuzzleState {
  const rows = tutorialRows();
  return {
    ...baseSave(rows, currentPhase),
    selectedLetter: rows[0].words[1],
  };
}

function chainSave(): SavedPuzzleState {
  const rows = tutorialRows();
  const movedLetter = rows[0].words[1];
  rows[0] = {
    ...rows[0],
    words: rows[0].words.filter(letter => letter.id !== movedLetter.id),
  };
  rows[1] = {
    ...rows[1],
    words: [
      rows[1].words[0],
      { ...movedLetter, isLocked: true },
      ...rows[1].words.slice(1),
    ],
  };

  const history: MoveDelta[] = [{
    movedLetterId: movedLetter.id,
    movedLetterChar: movedLetter.char,
    sourceRowIndex: 0,
    sourceLetterIndex: 1,
    targetRowIndex: 1,
    targetInsertIndex: 1,
    activeRowIndexBefore: 0,
    moveDirectionBefore: 'down',
  }];

  return {
    ...baseSave(rows),
    activeRowIndex: 1,
    history,
    lastFormedWord: 'PLANT',
  };
}

function progressForScenario(
  name: PlayStoreScenarioName,
  today: string
): HomeWorldProgress {
  switch (name) {
    case 'puzzle-preview':
    case 'puzzle-chain':
      return baseProgress(today, {
        puzzlesSolved: 5,
        phaseProgress: 5,
        currentStreak: 1,
        completedDifficulties: ['EASY'],
        phaseProgressFraction: 0.25,
      });
    case 'home-sunny':
    case 'animal-dialogue':
      return sunnyProgress(today);
    case 'variant-menu':
      return baseProgress(today, {
        amber: 180,
        totalAmberEarned: 900,
        puzzlesSolved: 40,
        currentPhase: 1,
        phaseProgress: 40,
        currentStreak: 4,
        completedDifficulties: ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'],
        variantWins: { reverse: 4, double_shift: 3, speed: 5 },
        phaseProgressFraction:
          (40 - PHASE_THRESHOLDS[1]) /
          (PHASE_THRESHOLDS[2] - PHASE_THRESHOLDS[1]),
      });
    case 'daily':
      return baseProgress(today, {
        amber: 180,
        totalAmberEarned: 400,
        puzzlesSolved: DAILY_CAPTURE_PUZZLES,
        phaseProgress: DAILY_CAPTURE_PUZZLES,
        currentStreak: 7,
        completedDifficulties: ['EASY', 'HARD'],
        phaseProgressFraction:
          DAILY_CAPTURE_PUZZLES / PHASE_THRESHOLDS[1],
      });
    case 'flawless-victory':
      return baseProgress(today, {
        currentStreak: 0,
        lastPlayDate: null,
      });
    case 'home-dusk':
      return duskProgress(today);
    default:
      return baseProgress(today);
  }
}

function dailyProgress(today: string): DailyChallengeProgress {
  const completedChallenge: DailyChallengeResult = {
    date: today,
    stars: 3,
    hintsUsed: 0,
    invalidAttempts: 0,
    completedAt: Date.parse(`${today}T12:00:00Z`),
  };

  return {
    completedChallenges: [completedChallenge],
    totalCompleted: 15,
    currentStreak: 7,
    bestStreak: 12,
    lastCompletedDate: today,
    streakFreezes: 1,
    lastFreezeGrantDate: today,
    firstDailyMercyGranted: true,
  };
}

function flawlessAchievementProgress(): AchievementProgress {
  return {
    unlockedIds: [...FIRST_FLAWLESS_ACHIEVEMENTS],
    unlockDates: Object.fromEntries(
      FIRST_FLAWLESS_ACHIEVEMENTS.map(id => [id, 1])
    ),
    lastChecked: 1,
  };
}

export function buildPlayStoreScenario(
  name: PlayStoreScenarioName,
  today: string
): PlayStoreScenario {
  const progress = progressForScenario(name, today);
  const storage: Record<string, string> = {
    wordshift_schema_version: String(CURRENT_SCHEMA_VERSION),
    wordshift_onboarding_step: 'complete',
    wordshift_tutorial_completed: 'true',
    wordshift_settings: JSON.stringify({
      soundEnabled: false,
      hapticsEnabled: false,
      reducedMotion: true,
    }),
    wordshift_notification_prefs: JSON.stringify({
      dailyReminderEnabled: false,
      dailyReminderHour: 9,
      reengagementEnabled: false,
      enabled: false,
    }),
    wordshift_daily_login: JSON.stringify({
      lastClaimedDate: today,
      cycleDay: 3,
    }),
    wordshift_setup_selector_intro_seen: 'true',
    wordshift_daily_challenge_intro_seen: 'true',
    wordshift_challenge_intro_seen: 'true',
    wordshift_journal_intro_seen: 'true',
    wordshift_starter_intro_seen: 'true',
    wordshift_notification_prompted: 'true',
    wordshift_mandatory_harvest_seen: 'true',
    wordshift_pit_harvest_intro_seen: 'true',
    wordshift_gated_unlock_intro_seen: 'true',
    wordshift_harvest_home_intro_seen: 'true',
    wordshift_fox_play_nudge_seen: 'true',
    wordshift_pit_nudge_seen: 'true',
    wordshift_review_prompt: JSON.stringify({ prompted: true }),
    wordshift_monet_prompts: JSON.stringify({
      patronNudgeShown: true,
      removeAdsNudgeShown: true,
      interstitialsSeen: 0,
    }),
    wordshift_home_progress: JSON.stringify(progress),
  };

  if (name === 'puzzle-preview' || name === 'variant-menu') {
    storage.wordshift_in_progress_puzzle = JSON.stringify(
      previewSave(progress.currentPhase)
    );
  } else if (name === 'puzzle-chain') {
    storage.wordshift_in_progress_puzzle = JSON.stringify(chainSave());
  }

  if (progress.puzzlesSolved > 0) {
    storage.wordshift_star_stats = JSON.stringify(baseStats(
      progress.puzzlesSolved,
      (progress.completedDifficulties ?? []) as Difficulty[]
    ));
  }

  if (name === 'daily') {
    storage.wordshift_daily_challenge = JSON.stringify(dailyProgress(today));
  }

  if (name === 'flawless-victory') {
    storage.wordshift_achievements = JSON.stringify(
      flawlessAchievementProgress()
    );
  }

  return { name, storage };
}
