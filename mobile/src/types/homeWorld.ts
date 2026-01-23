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
 * Phase descriptions for UI
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
 */
export const PHASE_THRESHOLDS = [0, 10, 25, 50, 100];

/**
 * Amber rewards by difficulty
 */
export const AMBER_REWARDS: AmberReward = {
  EASY: 5,
  MEDIUM: 10,
  HARD: 20,
};
