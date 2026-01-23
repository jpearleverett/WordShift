// Home World Types - Animal house with existential journey

/**
 * Animal species available in the game
 * Each has unique appearance, room, and dialogue style
 */
export type AnimalType =
  | 'red_panda'    // Bamboo attic - contemplative, zen
  | 'axolotl'      // Aquarium room - dreamy, fluid thoughts
  | 'pangolin'     // Kitchen - practical turning philosophical
  | 'sloth'        // Jungle room - slow, deliberate observations
  | 'fennec_fox'   // Desert room - alert, questioning
  | 'fox'          // Cozy den - introspective, fireside musings
  | 'owl'          // Study - intellectual crisis
  | 'capybara'     // Office - calm acceptance
  | 'wombat'       // Basement burrow - grounded, earthly concerns
  | 'rabbit';      // Garden patio - anxious, hopping thoughts

/**
 * Dialogue phase representing the existential journey
 * 0 = Happy/light → 4 = Complete philosophical crisis
 */
export type DialoguePhase = 0 | 1 | 2 | 3 | 4;

/**
 * Single dialogue entry
 */
export interface Dialogue {
  id: string;
  text: string;
  phase: DialoguePhase;
  animalType: AnimalType;
}

/**
 * Individual animal character state
 */
export interface Animal {
  id: string;
  type: AnimalType;
  name: string;
  roomId: string;
  isUnlocked: boolean;
  currentDialogueIndex: number;
  hasNewDialogue: boolean;
  hasSeenIntro: boolean; // Whether the intro dialogue has been shown
  lastInteraction: number | null;
  // Animation state
  position: { x: number; y: number };
  isWalking: boolean;
  direction: 'left' | 'right';
}

/**
 * Room in the house
 */
export interface Room {
  id: string;
  name: string;
  floor: number; // 0 = basement, higher = upper floors
  isUnlocked: boolean;
  theme: RoomTheme;
  animalId: string | null;
  // Visual positioning
  layoutPosition: { row: number; col: number }; // For 2-column layouts
  backgroundColor: string;
  accentColor: string;
}

/**
 * Room visual themes
 */
export type RoomTheme =
  | 'bamboo'      // Green bamboo walls
  | 'aquarium'    // Blue water tank
  | 'kitchen'     // Stone/rustic
  | 'jungle'      // Vines and green
  | 'desert'      // Sandy, cacti
  | 'cozy_den'    // Warm fireplace
  | 'study'       // Books and wisdom
  | 'office'      // Modern workspace
  | 'burrow'      // Underground cave
  | 'garden';     // Outdoor patio

/**
 * Unlock types in progression order
 */
export type UnlockType = 'character' | 'room';

/**
 * Unlockable item in progression
 */
export interface Unlockable {
  id: string;
  type: UnlockType;
  cost: number;
  isUnlocked: boolean;
  order: number; // Unlock sequence order
  targetId: string; // Animal ID or Room ID
  name: string;
  description: string;
}

/**
 * Player's home world progress
 */
export interface HomeWorldProgress {
  amber: number;
  totalAmberEarned: number;
  unlockedAnimals: string[];
  unlockedRooms: string[];
  currentPhase: DialoguePhase;
  puzzlesSolved: number;
  // Tracking for phase transitions
  phasePuzzleThresholds: number[];
  lastDialogueRead: { [animalId: string]: number };
  // Track which animals have had their intro dialogue shown
  introsSeen: string[];
  // Streak tracking for bonus amber
  currentStreak: number;
  lastPlayDate: string | null; // ISO date string (YYYY-MM-DD)
}

/**
 * Currency reward by difficulty
 */
export interface AmberReward {
  EASY: number;
  MEDIUM: number;
  HARD: number;
}

/**
 * Animation frame for animal sprites
 */
export interface AnimationFrame {
  offsetX: number;
  offsetY: number;
  duration: number;
}

/**
 * Animal animation config
 */
export interface AnimalAnimation {
  idle: AnimationFrame[];
  walk: AnimationFrame[];
  talk: AnimationFrame[];
}

/**
 * Home screen state
 */
export interface HomeScreenState {
  progress: HomeWorldProgress;
  animals: Animal[];
  rooms: Room[];
  unlockables: Unlockable[];
  selectedAnimal: Animal | null;
  showDialogue: boolean;
  showShop: boolean;
  // Zoom and pan state
  viewScale: number;
  viewOffset: { x: number; y: number };
}

/**
 * Currency transaction
 */
export interface AmberTransaction {
  amount: number;
  type: 'earn' | 'spend';
  source: string;
  timestamp: number;
}

/**
 * Dialogue session state for an animal
 * Sessions are gated by puzzles completed, not time
 */
export interface DialogueSession {
  animalId: string;
  dialoguesInSession: number;         // How many dialogues shown this session
  puzzlesAtSessionEnd: number | null; // Puzzle count when session ended (null if session active)
}

/**
 * Dialogue session constants (puzzle-based)
 * Pacing designed for 10-15 hour total gameplay
 */
export const DIALOGUE_SESSION_CONFIG = {
  // Number of dialogues allowed per session before cooldown
  DIALOGUES_PER_SESSION: 6,
  // Number of puzzles required before next session is available
  PUZZLES_BETWEEN_SESSIONS: 5,
};

/**
 * Phase descriptions for UI
 * Phases are spread across ~300 puzzles for extended gameplay
 */
export const PHASE_DESCRIPTIONS: Record<DialoguePhase, { title: string; mood: string }> = {
  0: { title: 'Bright Days', mood: 'Everything seems wonderful!' },
  1: { title: 'Curious Thoughts', mood: 'Beginning to wonder...' },
  2: { title: 'Deeper Questions', mood: 'What does it all mean?' },
  3: { title: 'Growing Shadows', mood: 'Something feels different...' },
  4: { title: 'The Horizon', mood: 'Change is coming...' },
};

/**
 * Puzzle thresholds for phase transitions
 * Extended for 10-15 hour gameplay (targeting ~300-350 total puzzles)
 */
export const PHASE_THRESHOLDS = [0, 25, 75, 150, 250];

/**
 * Amber rewards by difficulty
 */
export const AMBER_REWARDS: AmberReward = {
  EASY: 5,
  MEDIUM: 10,
  HARD: 20,
};

/**
 * Milestone bonuses - reward players at key puzzle counts
 * Keeps progression feeling rewarding during longer gameplay
 */
export const MILESTONE_BONUSES: { puzzles: number; amber: number; message: string }[] = [
  { puzzles: 10, amber: 25, message: 'First steps!' },
  { puzzles: 25, amber: 50, message: 'Getting the hang of it!' },
  { puzzles: 50, amber: 75, message: 'Puzzle enthusiast!' },
  { puzzles: 75, amber: 100, message: 'Word wizard!' },
  { puzzles: 100, amber: 150, message: 'Century milestone!' },
  { puzzles: 150, amber: 200, message: 'Dedicated player!' },
  { puzzles: 200, amber: 250, message: 'True dedication!' },
  { puzzles: 250, amber: 300, message: 'Quarter thousand!' },
  { puzzles: 300, amber: 400, message: 'Master puzzler!' },
  { puzzles: 350, amber: 500, message: 'The journey continues...' },
];

/**
 * Check if a milestone was just reached
 */
export function checkMilestone(puzzleCount: number): { amber: number; message: string } | null {
  const milestone = MILESTONE_BONUSES.find(m => m.puzzles === puzzleCount);
  return milestone ? { amber: milestone.amber, message: milestone.message } : null;
}

/**
 * Get next upcoming milestone
 */
export function getNextMilestone(puzzleCount: number): { puzzles: number; amber: number } | null {
  const next = MILESTONE_BONUSES.find(m => m.puzzles > puzzleCount);
  return next ? { puzzles: next.puzzles, amber: next.amber } : null;
}

/**
 * Streak bonus configuration
 * Higher streaks = more bonus amber
 */
export const STREAK_BONUSES = {
  // Minimum streak to start getting bonuses
  MIN_STREAK_FOR_BONUS: 2,
  // Bonus per streak day (e.g., 10% per day for faster progression)
  BONUS_PER_STREAK: 0.10,
  // Maximum bonus percentage (e.g., 100% cap = double rewards at 10+ day streak)
  MAX_BONUS_PERCENTAGE: 1.0,
  // Days of inactivity before streak resets
  STREAK_RESET_DAYS: 2,
};

/**
 * Calculate streak bonus multiplier
 * @param streak Current streak count
 * @returns Multiplier (e.g., 1.15 for 15% bonus)
 */
export function calculateStreakMultiplier(streak: number): number {
  if (streak < STREAK_BONUSES.MIN_STREAK_FOR_BONUS) {
    return 1;
  }
  const bonusPercentage = Math.min(
    (streak - 1) * STREAK_BONUSES.BONUS_PER_STREAK,
    STREAK_BONUSES.MAX_BONUS_PERCENTAGE
  );
  return 1 + bonusPercentage;
}
