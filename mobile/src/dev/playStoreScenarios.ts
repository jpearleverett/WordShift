import { PHASE_THRESHOLDS } from '../constants/gameBalance';
import { GameState } from '../types';
import type {
  MoveDelta,
  PuzzleSolutionStep,
  RowData,
} from '../types';
import type { HomeWorldProgress } from '../types/homeWorld';
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
    streakFreezes: 0,
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
    puzzlesSolved: 22,
    phaseProgress: 19,
    lastDialogueRead: {
      fox: 0,
      pangolin: 0,
      owl: 0,
      axolotl: 0,
    },
    introsSeen: [...SUNNY_ANIMALS],
    currentStreak: 3,
    completedDifficulties: ['EASY', 'MEDIUM'],
    phaseProgressFraction: 0.95,
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
      fox: 52,
      pangolin: 52,
      owl: 52,
      axolotl: 52,
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

function baseStats(completed: number): CumulativeStats {
  const threeStarCount = Math.min(34, completed);
  const twoStarCount = Math.min(4, completed - threeStarCount);
  const oneStarCount = Math.max(0, completed - threeStarCount - twoStarCount);

  return {
    totalPuzzlesCompleted: completed,
    totalStars: threeStarCount * 3 + twoStarCount * 2 + oneStarCount,
    threeStarCount,
    twoStarCount,
    oneStarCount,
    totalInvalidAttempts: 8,
    totalHintsUsed: 2,
    noHintPuzzleCount: 38,
    flawlessCount: 30,
    byDifficulty: {
      EASY: { completed: 10, stars: 30 },
      MEDIUM: { completed: 10, stars: 29 },
      MEDIUM_PLUS: { completed: 10, stars: 28 },
      HARD: { completed: 10, stars: 25 },
    },
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

function baseSave(rows: RowData[]): SavedPuzzleState {
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
    currentPhase: 0,
    lastFormedWord: null,
    doubleShiftPhase: null,
    isPlayingDaily: false,
    dailyDate: null,
    speedTimerExpireAt: null,
    speedTimeRemainingSec: null,
    savedAt: 0,
  };
}

function previewSave(): SavedPuzzleState {
  const rows = tutorialRows();
  return {
    ...baseSave(rows),
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
    case 'home-sunny':
    case 'animal-dialogue':
      return sunnyProgress(today);
    case 'variant-menu':
      return baseProgress(today, {
        amber: 180,
        totalAmberEarned: 900,
        puzzlesSolved: 40,
        phaseProgress: 19,
        completedDifficulties: ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'],
        variantWins: { reverse: 4, double_shift: 3, speed: 5 },
        phaseProgressFraction: 0.95,
      });
    case 'daily':
      return baseProgress(today, {
        amber: 180,
        totalAmberEarned: 400,
        puzzlesSolved: 10,
        phaseProgress: 10,
        currentStreak: 7,
        completedDifficulties: ['EASY', 'HARD'],
        phaseProgressFraction: 0.5,
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
    completedAt: Date.parse(`${today}T12:00:00`),
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

export function buildPlayStoreScenario(
  name: PlayStoreScenarioName,
  today: string
): PlayStoreScenario {
  const storage: Record<string, string> = {
    wordshift_schema_version: '4',
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
    wordshift_home_progress: JSON.stringify(progressForScenario(name, today)),
  };

  if (name === 'puzzle-preview' || name === 'variant-menu') {
    storage.wordshift_in_progress_puzzle = JSON.stringify(previewSave());
  } else if (name === 'puzzle-chain') {
    storage.wordshift_in_progress_puzzle = JSON.stringify(chainSave());
  }

  if (name === 'variant-menu') {
    storage.wordshift_star_stats = JSON.stringify(baseStats(40));
  }

  if (name === 'daily') {
    storage.wordshift_daily_challenge = JSON.stringify(dailyProgress(today));
  }

  return { name, storage };
}
