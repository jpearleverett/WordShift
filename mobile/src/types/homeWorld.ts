import { Difficulty } from '../types';

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
 * 5 = Post-revelation terrible peace (hidden phase after final revelation)
 */
export type DialoguePhase = 0 | 1 | 2 | 3 | 4;

/**
 * Extended phase type that includes post-revelation Phase 5
 */
export type ExtendedPhase = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Animal awareness tiers - not all animals realize the truth at the same time
 * Vanguard: Fox & Owl know first (+1 phase ahead) - the oracle and lorekeeper
 * Middle: Most animals match the global phase - discover truth with the player
 * Lagging: Sloth, Wombat, Rabbit, Red Panda realize last (-1 phase behind)
 */
export type AnimalAwarenessTier = 'vanguard' | 'middle' | 'lagging';

export const ANIMAL_AWARENESS_TIERS: Record<AnimalType, AnimalAwarenessTier> = {
  fox: 'vanguard',         // The oracle - reads the flames first
  owl: 'vanguard',         // The lorekeeper - found it in the texts
  pangolin: 'middle',      // Discovers in real-time with the player
  axolotl: 'middle',       // The medium - senses it in the water
  fennec_fox: 'middle',    // The sentinel - hears it approaching
  capybara: 'middle',      // The administrator - quietly coordinating
  sloth: 'lagging',        // Always slow - catches up last
  wombat: 'lagging',       // Deep underground - news travels slow
  rabbit: 'lagging',       // In denial - realizes last
  red_panda: 'lagging',    // Zen detachment delays awareness
};

/**
 * Get the effective phase for a specific animal based on their awareness tier
 */
export function getAnimalPhase(globalPhase: DialoguePhase, animalType: AnimalType): DialoguePhase {
  const tier = ANIMAL_AWARENESS_TIERS[animalType];
  let offset = 0;
  if (tier === 'vanguard') offset = 1;
  if (tier === 'lagging') offset = -1;
  const effective = Math.max(0, Math.min(4, globalPhase + offset));
  return effective as DialoguePhase;
}

/**
 * Trigger words that animals react to when the player spells them
 * Each animal has themed trigger words that resonate with their personality
 */
export const ANIMAL_TRIGGER_WORDS: Record<AnimalType, string[]> = {
  fox: ['FLAME', 'FIRE', 'EMBER', 'BURN', 'BLAZE', 'WARM', 'HEAT', 'ASH', 'SMOKE', 'SPARK'],
  owl: ['BOOK', 'READ', 'KNOW', 'WISE', 'LEARN', 'TRUTH', 'LORE', 'TEXT', 'WORD', 'PAGE'],
  pangolin: ['COOK', 'MEAL', 'FOOD', 'STEW', 'BAKE', 'TASTE', 'DISH', 'SPICE', 'FEAST', 'ROLL'],
  axolotl: ['WATER', 'SWIM', 'FLOAT', 'WAVE', 'DEEP', 'SINK', 'POOL', 'FLOW', 'TIDE', 'DROWN'],
  fennec_fox: ['HEAR', 'SOUND', 'ECHO', 'LOUD', 'QUIET', 'HUSH', 'NOISE', 'LISTEN', 'RING', 'TONE'],
  capybara: ['CALM', 'CHILL', 'STILL', 'PEACE', 'REST', 'COOL', 'EASE', 'RELAX', 'FLOAT', 'SIT'],
  sloth: ['SLOW', 'WAIT', 'TIME', 'HANG', 'GRIP', 'MOSS', 'TREE', 'SLEEP', 'STILL', 'LONG'],
  wombat: ['DIG', 'DIRT', 'EARTH', 'DEEP', 'BONE', 'ROCK', 'CAVE', 'HOLE', 'DARK', 'BELOW'],
  rabbit: ['RUN', 'FEAR', 'HIDE', 'JUMP', 'FAST', 'BOLT', 'DASH', 'FLEE', 'SAFE', 'GUARD'],
  red_panda: ['VOID', 'GATE', 'PORTAL', 'RIFT', 'ABYSS', 'DARK', 'SHADOW', 'DOOM', 'END', 'FINAL'],
};

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
  // Last milestone puzzle count that was claimed (prevents double-claiming)
  lastClaimedMilestone?: number;
  // === Ritual Tracking (Incantation System) ===
  // All words formed across all puzzles - the growing ritual ledger
  ritualWords?: string[];
  // Total count of words ever formed (faster than ritualWords.length for large arrays)
  totalWordsFormed?: number;
  // Accumulated ritual energy from dread words in puzzles
  ritualEnergy?: number;
  // Queue of trigger words from recent puzzles for animal reactions
  triggerWordQueue?: string[];
  // Whether the house completion ceremony has been triggered
  houseCompleted?: boolean;
  // Whether the final puzzle has been completed
  finalPuzzleCompleted?: boolean;
  // Whether post-revelation (Phase 5) content has been reached
  postRevelation?: boolean;
  // Tutorial seeds - tracks specific tutorial lines for Phase 4 callbacks
  tutorialSeedsPlanted?: boolean;
  // Coordinated dialogue events that have been consumed (by theme name)
  consumedCoordinatedEvents?: string[];
  // Variant tutorials queued for animal explanation dialogue
  pendingVariantTutorials?: string[];
  // Variant tutorials already explained to the player
  seenVariantTutorials?: string[];
  // Player-selected preferred puzzle variant key
  preferredPuzzleVariant?: string;
  // Last played variant key used for anti-farming reward decay
  lastVariantPlayed?: string;
  // Number of consecutive puzzles completed with the same variant
  sameVariantStreak?: number;
  // Difficulties completed at least once (for first-completion bonus)
  completedDifficulties?: string[];
  // Per-variant weekly usage count for anti-farm decay
  variantWeeklyUsage?: Record<string, number>;
  // Week identifier for variant usage tracking reset
  variantWeeklyUsageWeek?: string;
  // Streak freeze: number of streak freezes available
  streakFreezes?: number;
  // Last time a free streak freeze was granted (ISO date)
  lastFreeStreakFreezeDate?: string;
  // Pending phase transition: target phase when progress crossed a threshold
  // but the player hasn't confirmed it in the pit yet. null = no pending transition.
  pendingPhaseTransition?: DialoguePhase | null;
  // Normalized progress toward the next phase threshold (0.0 to 1.0).
  // Cached each time awardPuzzleAmber runs. Used by the pit screen
  // to drive ward mark illumination without re-deriving thresholds.
  phaseProgressFraction?: number;
}

/**
 * Currency reward by difficulty
 */
export interface AmberReward {
  EASY: number;
  MEDIUM: number;
  MEDIUM_PLUS: number;
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
  sessionsCompleted?: number;         // Total sessions completed (for grace period tracking)
}

/**
 * Dialogue session constants (puzzle-based)
 * Pacing designed for 10-15 hour total gameplay
 */
export const DIALOGUE_SESSION_CONFIG = {
  // Number of dialogues allowed per session before cooldown
  DIALOGUES_PER_SESSION: 5,
  // Number of puzzles required before next session is available
  PUZZLES_BETWEEN_SESSIONS: 4,
  // Number of sessions before cooldown kicks in for newly unlocked animals (grace period)
  GRACE_PERIOD_SESSIONS: 2,
};

/**
 * Phase-aware session limits - at higher phases, animals have more to reveal
 */
export function getDialoguesPerSession(phase: DialoguePhase): number {
  switch (phase) {
    case 0:
    case 1:
      return 3;  // Smaller sessions = more sessions before exhaustion, extends early dialogue life
    case 2:
    case 3:
      return 5;  // Moderate conversations as things darken
    case 4:
      return 6;  // The cult reveals itself in measured doses
    default:
      return 5;
  }
}

/**
 * Phase-aware cooldown between dialogue sessions.
 * Shorter at Phase 0-1 to encourage emotional bonding.
 * Longer at Phase 3-4 when dialogue is heavier and pacing should be deliberate.
 */
export function getPuzzlesBetweenSessions(phase: DialoguePhase): number {
  switch (phase) {
    case 0:
      return 2;  // Short — let the player bond early but not binge
    case 1:
      return 3;  // Building relationships with breathing room
    case 2:
      return 4;  // Standard cooldown — dialogue carries more weight
    case 3:
    case 4:
      return 5;  // Deliberate pacing — each revelation needs space
    default:
      return 4;
  }
}

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
  EASY: 8,
  MEDIUM: 10,
  MEDIUM_PLUS: 15,
  HARD: 20,
};

/**
 * One-time bonus amber for first completion of each difficulty level.
 * Creates small windfall moments that feel exciting and incentivize
 * trying harder difficulties.
 */
export const FIRST_COMPLETION_BONUS: AmberReward = {
  EASY: 10,
  MEDIUM: 20,
  MEDIUM_PLUS: 30,
  HARD: 50,
};

/**
 * Milestone bonuses - reward players at key puzzle counts
 * Keeps progression feeling rewarding during longer gameplay
 */
/**
 * Phase-aware milestone messages - tone shifts with the narrative
 * Each milestone has messages for different phase ranges
 */
export const MILESTONE_BONUSES: { puzzles: number; amber: number; message: string; darkMessage?: string; dreadMessage?: string }[] = [
  { puzzles: 10, amber: 25, message: 'First steps!' },
  { puzzles: 15, amber: 15, message: 'Warming up!' },
  { puzzles: 25, amber: 50, message: 'Getting the hang of it!', darkMessage: 'The words are beginning to listen.' },
  { puzzles: 50, amber: 75, message: 'Puzzle enthusiast!', darkMessage: 'The pattern takes shape.' },
  { puzzles: 75, amber: 100, message: 'Word wizard!', darkMessage: 'The words know your touch now.', dreadMessage: 'Seventy-five incantations spoken.' },
  { puzzles: 100, amber: 150, message: 'Century milestone!', darkMessage: 'One hundred arrangements completed.', dreadMessage: 'The arrangement grows. One hundred offerings.' },
  { puzzles: 110, amber: 75, message: 'Double digits!', darkMessage: 'The house stirs.', dreadMessage: 'One hundred ten threads woven into the pattern.' },
  { puzzles: 125, amber: 100, message: 'Halfway to mastery!', darkMessage: 'The house feels heavier. Fuller.', dreadMessage: 'One hundred twenty-five incantations. The walls listen.' },
  { puzzles: 150, amber: 200, message: 'Dedicated player!', darkMessage: 'The letters rearrange themselves for you now.', dreadMessage: 'One hundred fifty words offered to the pattern.' },
  { puzzles: 200, amber: 250, message: 'True dedication!', darkMessage: 'Two hundred transformations. The house trembles.', dreadMessage: 'The ritual deepens. Two hundred incantations.' },
  { puzzles: 250, amber: 300, message: 'Quarter thousand!', darkMessage: 'The arrangement nears completion.', dreadMessage: 'Two hundred fifty offerings. Something stirs.' },
  { puzzles: 300, amber: 400, message: 'Master puzzler!', darkMessage: 'Three hundred words spoken into the void.', dreadMessage: 'The void has heard enough. The void responds.' },
  { puzzles: 350, amber: 500, message: 'The journey continues...', darkMessage: 'The journey never ends. It only transforms.', dreadMessage: 'Three hundred fifty incantations. The pattern is nearly complete.' },
];

/**
 * Get the phase-appropriate milestone message
 */
export function getMilestoneMessage(milestone: typeof MILESTONE_BONUSES[0], phase: DialoguePhase): string {
  if (phase >= 3 && milestone.dreadMessage) return milestone.dreadMessage;
  if (phase >= 2 && milestone.darkMessage) return milestone.darkMessage;
  return milestone.message;
}

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
  MEDIUM_PLUS_MULTIPLIER: 1.25,
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
  // Legacy constant — prefer getMaxUndos(difficulty) for challenge mode
  MAX_UNDOS: 1,
  /** Get max undos for challenge mode, scaled by difficulty */
  getMaxUndos: (difficulty: Difficulty): number => {
    switch (difficulty) {
      case 'EASY': return 2;
      case 'MEDIUM': return 2;
      case 'MEDIUM_PLUS': return 1;
      case 'HARD': return 1;
    }
  },
  // Amber reward multiplier for challenge completions
  AMBER_MULTIPLIER: 1.5,
  // No hints allowed in challenge mode
  HINTS_ALLOWED: false,
};

