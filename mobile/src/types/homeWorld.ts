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
  layoutPosition: { row: number; col: number }; // Single-column layout (col always 0)
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
  // Weighted phase progress (performance-based acceleration)
  phaseProgress?: number;
  // Challenge mode tracking
  challengeCompletions?: number;
  // Room decorations purchased
  decorations?: { [roomId: string]: string[] };
  // Last milestone puzzle count that was claimed (prevents double-claiming)
  lastClaimedMilestone?: number;
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
  // Number of dialogues allowed per session before cooldown (generous for exploration)
  DIALOGUES_PER_SESSION: 8,
  // Number of puzzles required before next session is available (reduced for less friction)
  PUZZLES_BETWEEN_SESSIONS: 3,
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
 * Uses >= to catch milestones even if puzzleCount skips exact values (e.g., due to race conditions)
 * Takes lastClaimedMilestone to prevent double-claiming
 */
export function checkMilestone(
  puzzleCount: number,
  lastClaimedMilestone?: number
): { amber: number; message: string; puzzles: number } | null {
  const claimed = lastClaimedMilestone ?? 0;
  const milestone = MILESTONE_BONUSES.find(m => m.puzzles <= puzzleCount && m.puzzles > claimed);
  return milestone ? { amber: milestone.amber, message: milestone.message, puzzles: milestone.puzzles } : null;
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

/**
 * Narrative acceleration configuration
 * Engaged players progress through phases faster based on performance
 * An engaged player can reach Phase 4 in ~120-150 puzzles instead of 250
 */
export const NARRATIVE_ACCELERATION = {
  // Three-star rate threshold: above this, puzzles count more toward phase progress
  THREE_STAR_RATE_THRESHOLD: 0.5,
  THREE_STAR_MULTIPLIER: 1.5,
  // Streak threshold: long streaks accelerate phase progression
  STREAK_THRESHOLD: 7,
  STREAK_MULTIPLIER: 1.25,
  // Difficulty-based: harder puzzles accelerate, easy stays neutral
  HARD_MULTIPLIER: 1.5,
  MEDIUM_MULTIPLIER: 1.0,
  EASY_MULTIPLIER: 1.0,
  // Challenge mode: completing in challenge mode counts double
  CHALLENGE_MULTIPLIER: 2.0,
};

/**
 * Challenge mode configuration
 * Optional harder mode for experienced players with better rewards
 */
export const CHALLENGE_MODE_CONFIG = {
  // Maximum undos allowed in challenge mode (0 = no undos)
  MAX_UNDOS: 1,
  // Amber reward multiplier for challenge completions
  AMBER_MULTIPLIER: 1.5,
  // No hints allowed in challenge mode
  HINTS_ALLOWED: false,
};

/**
 * Room decoration definitions
 * Cosmetic items purchasable after all base unlocks are done
 */
export interface Decoration {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  roomTheme: RoomTheme; // Which room this decoration belongs to
}

/**
 * Available decorations for each room
 * Each room gets 3 decorations to purchase
 */
export const ROOM_DECORATIONS: Decoration[] = [
  // Cozy den (Fox)
  { id: 'cozy_den_rug', name: 'Velvet Rug', description: 'A luxurious crimson rug by the fire', icon: '🟥', cost: 75, roomTheme: 'cozy_den' },
  { id: 'cozy_den_lamp', name: 'Crystal Lamp', description: 'Casts warm amber light across the room', icon: '🪔', cost: 100, roomTheme: 'cozy_den' },
  { id: 'cozy_den_painting', name: 'Forest Painting', description: 'A misty woodland scene in a gold frame', icon: '🖼️', cost: 150, roomTheme: 'cozy_den' },
  // Kitchen (Pangolin)
  { id: 'kitchen_pots', name: 'Copper Pot Set', description: 'Gleaming copper pots hanging from hooks', icon: '🫕', cost: 75, roomTheme: 'kitchen' },
  { id: 'kitchen_herbs', name: 'Herb Garden', description: 'Fresh herbs growing on the windowsill', icon: '🌿', cost: 100, roomTheme: 'kitchen' },
  { id: 'kitchen_chandelier', name: 'Iron Chandelier', description: 'Rustic wrought iron with candles', icon: '🕯️', cost: 150, roomTheme: 'kitchen' },
  // Study (Owl)
  { id: 'study_globe', name: 'Antique Globe', description: 'A spinning globe with golden meridians', icon: '🌍', cost: 75, roomTheme: 'study' },
  { id: 'study_telescope', name: 'Brass Telescope', description: 'Points toward the night sky through the window', icon: '🔭', cost: 100, roomTheme: 'study' },
  { id: 'study_clock', name: 'Grandfather Clock', description: 'Ticks with measured, philosophical patience', icon: '🕰️', cost: 150, roomTheme: 'study' },
  // Aquarium (Axolotl)
  { id: 'aquarium_coral', name: 'Living Coral', description: 'Bioluminescent coral that softly glows', icon: '🪸', cost: 75, roomTheme: 'aquarium' },
  { id: 'aquarium_treasure', name: 'Sunken Treasure', description: 'A tiny treasure chest with golden coins', icon: '💰', cost: 100, roomTheme: 'aquarium' },
  { id: 'aquarium_jellyfish', name: 'Jellyfish Mobile', description: 'Glass jellyfish that catch the light', icon: '🪼', cost: 150, roomTheme: 'aquarium' },
  // Jungle (Sloth)
  { id: 'jungle_flowers', name: 'Tropical Flowers', description: 'Exotic blooms in vibrant colors', icon: '🌺', cost: 75, roomTheme: 'jungle' },
  { id: 'jungle_butterfly', name: 'Butterfly Garden', description: 'Butterflies drift lazily through the vines', icon: '🦋', cost: 100, roomTheme: 'jungle' },
  { id: 'jungle_waterfall', name: 'Mini Waterfall', description: 'A gentle cascade into a mossy pool', icon: '💧', cost: 150, roomTheme: 'jungle' },
  // Desert (Fennec Fox)
  { id: 'desert_lantern', name: 'Star Lantern', description: 'A brass lantern that projects star patterns', icon: '🏮', cost: 75, roomTheme: 'desert' },
  { id: 'desert_cactus', name: 'Blooming Cactus', description: 'A rare cactus with a single pink flower', icon: '🌵', cost: 100, roomTheme: 'desert' },
  { id: 'desert_orrery', name: 'Desert Orrery', description: 'A model of the solar system in brass and stone', icon: '🪐', cost: 150, roomTheme: 'desert' },
  // Office (Capybara)
  { id: 'office_plant', name: 'Office Fern', description: 'A calming fern that purifies the air', icon: '🪴', cost: 75, roomTheme: 'office' },
  { id: 'office_fish', name: 'Desktop Aquarium', description: 'A tiny fish tank with a single goldfish', icon: '🐠', cost: 100, roomTheme: 'office' },
  { id: 'office_art', name: 'Abstract Art', description: 'A soothing abstract canvas in cool tones', icon: '🎨', cost: 150, roomTheme: 'office' },
  // Burrow (Wombat)
  { id: 'burrow_crystals', name: 'Crystal Cluster', description: 'Amethyst crystals embedded in the wall', icon: '💎', cost: 75, roomTheme: 'burrow' },
  { id: 'burrow_mushrooms', name: 'Glow Mushrooms', description: 'Bioluminescent mushrooms in the corner', icon: '🍄', cost: 100, roomTheme: 'burrow' },
  { id: 'burrow_fossils', name: 'Fossil Collection', description: 'Ancient fossils carefully mounted on the wall', icon: '🦴', cost: 150, roomTheme: 'burrow' },
  // Garden (Rabbit)
  { id: 'garden_fountain', name: 'Stone Fountain', description: 'A bubbling fountain with mossy stones', icon: '⛲', cost: 75, roomTheme: 'garden' },
  { id: 'garden_birdhouse', name: 'Birdhouse', description: 'A charming painted birdhouse on a pole', icon: '🏡', cost: 100, roomTheme: 'garden' },
  { id: 'garden_gazebo', name: 'Garden Gazebo', description: 'A vine-covered gazebo for afternoon tea', icon: '🛖', cost: 150, roomTheme: 'garden' },
  // Bamboo (Red Panda)
  { id: 'bamboo_incense', name: 'Incense Burner', description: 'Fragrant smoke curls upward in spirals', icon: '🧘', cost: 75, roomTheme: 'bamboo' },
  { id: 'bamboo_bonsai', name: 'Bonsai Tree', description: 'A centuries-old bonsai in a jade pot', icon: '🌳', cost: 100, roomTheme: 'bamboo' },
  { id: 'bamboo_windchime', name: 'Wind Chimes', description: 'Bamboo chimes that sing in the breeze', icon: '🎐', cost: 150, roomTheme: 'bamboo' },
];

/**
 * Get decorations available for a specific room
 */
export function getDecorationsForRoom(roomTheme: RoomTheme): Decoration[] {
  return ROOM_DECORATIONS.filter(d => d.roomTheme === roomTheme);
}

/**
 * Get total cost of all decorations (for post-completion amber sink)
 */
export function getTotalDecorationCost(): number {
  return ROOM_DECORATIONS.reduce((sum, d) => sum + d.cost, 0);
}
