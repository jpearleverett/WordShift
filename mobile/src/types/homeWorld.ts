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
  // Room decorations purchased
  decorations?: { [roomId: string]: string[] };
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
  sessionsCompleted?: number;         // Total sessions completed (for grace period tracking)
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
  // Number of sessions before cooldown kicks in for newly unlocked animals (grace period)
  GRACE_PERIOD_SESSIONS: 3,
};

/**
 * Phase-aware session limits - at higher phases, animals have more to reveal
 */
export function getDialoguesPerSession(phase: DialoguePhase): number {
  switch (phase) {
    case 0:
    case 1:
      return 6;  // Cozy, bite-sized conversations
    case 2:
    case 3:
      return 8;  // More to unpack as things get darker
    case 4:
      return 10; // The cult has a LOT to say
    default:
      return 8;
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
  EASY: 5,
  MEDIUM: 10,
  HARD: 20,
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
  { puzzles: 25, amber: 50, message: 'Getting the hang of it!', darkMessage: 'The words are beginning to listen.' },
  { puzzles: 50, amber: 75, message: 'Puzzle enthusiast!', darkMessage: 'The pattern takes shape.' },
  { puzzles: 75, amber: 100, message: 'Word wizard!', darkMessage: 'The words know your touch now.', dreadMessage: 'Seventy-five incantations spoken.' },
  { puzzles: 100, amber: 150, message: 'Century milestone!', darkMessage: 'One hundred arrangements completed.', dreadMessage: 'The arrangement grows. One hundred offerings.' },
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
  /** Phase 3+ description - darker significance */
  darkDescription?: string;
  /** Phase 4 description - ritual significance */
  ritualDescription?: string;
  icon: string;
  cost: number;
  roomTheme: RoomTheme; // Which room this decoration belongs to
}

/**
 * Get the phase-appropriate decoration description
 */
export function getDecorationDescription(decoration: Decoration, phase: DialoguePhase): string {
  if (phase >= 4 && decoration.ritualDescription) return decoration.ritualDescription;
  if (phase >= 3 && decoration.darkDescription) return decoration.darkDescription;
  return decoration.description;
}

/**
 * Available decorations for each room
 * Each room gets 3 decorations to purchase
 */
export const ROOM_DECORATIONS: Decoration[] = [
  // Cozy den (Fox)
  { id: 'cozy_den_rug', name: 'Velvet Rug', description: 'A luxurious crimson rug by the fire', darkDescription: 'Crimson as old blood. It warms the floor where Ember sits and watches.', ritualDescription: 'Crimson as a ritual circle. It was always going to be placed here.', icon: '🟥', cost: 75, roomTheme: 'cozy_den' },
  { id: 'cozy_den_lamp', name: 'Crystal Lamp', description: 'Casts warm amber light across the room', darkDescription: 'The light flickers in patterns that almost spell something.', ritualDescription: 'The last light. When it goes out, the fire will be all that remains.', icon: '🪔', cost: 100, roomTheme: 'cozy_den' },
  { id: 'cozy_den_painting', name: 'Forest Painting', description: 'A misty woodland scene in a gold frame', darkDescription: 'The trees in the painting seem to lean inward. Toward something.', ritualDescription: 'The forest depicted no longer exists. The painting remembers.', icon: '🖼️', cost: 150, roomTheme: 'cozy_den' },
  // Kitchen (Pangolin)
  { id: 'kitchen_pots', name: 'Copper Pot Set', description: 'Gleaming copper pots hanging from hooks', darkDescription: 'The pots clank softly when no one is cooking. Resonating.', ritualDescription: 'Vessels for the final preparation. Panko knows the recipe.', icon: '🫕', cost: 75, roomTheme: 'kitchen' },
  { id: 'kitchen_herbs', name: 'Herb Garden', description: 'Fresh herbs growing on the windowsill', darkDescription: 'The herbs grow faster now. Reaching toward something outside.', ritualDescription: 'These herbs have no culinary purpose. They are offerings.', icon: '🌿', cost: 100, roomTheme: 'kitchen' },
  { id: 'kitchen_chandelier', name: 'Iron Chandelier', description: 'Rustic wrought iron with candles', darkDescription: 'The candles burn without wax. The iron is warm to the touch.', ritualDescription: 'Ten candles. One for each keeper. They cannot be extinguished.', icon: '🕯️', cost: 150, roomTheme: 'kitchen' },
  // Study (Owl)
  { id: 'study_globe', name: 'Antique Globe', description: 'A spinning globe with golden meridians', darkDescription: 'The globe has begun spinning on its own. Slowly.', ritualDescription: 'The continents have rearranged. Archimedes says it is more accurate now.', icon: '🌍', cost: 75, roomTheme: 'study' },
  { id: 'study_telescope', name: 'Brass Telescope', description: 'Points toward the night sky through the window', darkDescription: 'Archimedes stopped looking through it. He says something looked back.', ritualDescription: 'Pointed at the shadow in the sky. It no longer needs focusing.', icon: '🔭', cost: 100, roomTheme: 'study' },
  { id: 'study_clock', name: 'Grandfather Clock', description: 'Ticks with measured, philosophical patience', darkDescription: 'The ticking has slowed. Or time has. Hard to tell.', ritualDescription: 'Counting down. Always counting down. To the final chime.', icon: '🕰️', cost: 150, roomTheme: 'study' },
  // Aquarium (Axolotl)
  { id: 'aquarium_coral', name: 'Living Coral', description: 'Bioluminescent coral that softly glows', darkDescription: 'The glow has changed color. Deeper. Almost crimson.', ritualDescription: 'The coral pulses in time with something beneath the water.', icon: '🪸', cost: 75, roomTheme: 'aquarium' },
  { id: 'aquarium_treasure', name: 'Sunken Treasure', description: 'A tiny treasure chest with golden coins', darkDescription: 'The coins have tarnished. They spell something when arranged.', ritualDescription: 'Not treasure. Tokens. Payment for passage through the water.', icon: '💰', cost: 100, roomTheme: 'aquarium' },
  { id: 'aquarium_jellyfish', name: 'Jellyfish Mobile', description: 'Glass jellyfish that catch the light', darkDescription: 'They move without wind. Drifting toward the same direction.', ritualDescription: 'They are not glass. They never were. They came with the water.', icon: '🪼', cost: 150, roomTheme: 'aquarium' },
  // Jungle (Sloth)
  { id: 'jungle_flowers', name: 'Tropical Flowers', description: 'Exotic blooms in vibrant colors', darkDescription: 'The flowers bloom only at night now. Facing the same direction.', ritualDescription: 'They are not growing toward light. They are growing toward IT.', icon: '🌺', cost: 75, roomTheme: 'jungle' },
  { id: 'jungle_butterfly', name: 'Butterfly Garden', description: 'Butterflies drift lazily through the vines', darkDescription: 'The butterflies have stopped moving. Hovering. Waiting.', ritualDescription: 'Wings frozen mid-beat. Time moves differently near the arrangement.', icon: '🦋', cost: 100, roomTheme: 'jungle' },
  { id: 'jungle_waterfall', name: 'Mini Waterfall', description: 'A gentle cascade into a mossy pool', darkDescription: 'The water flows upward sometimes. Just for a moment.', ritualDescription: 'The water flows in circles now. A vortex. A sigil.', icon: '💧', cost: 150, roomTheme: 'jungle' },
  // Desert (Fennec Fox)
  { id: 'desert_lantern', name: 'Star Lantern', description: 'A brass lantern that projects star patterns', darkDescription: 'The star patterns have changed. New constellations. Unknown ones.', ritualDescription: 'The lantern projects the arrangement. The stars were always the map.', icon: '🏮', cost: 75, roomTheme: 'desert' },
  { id: 'desert_cactus', name: 'Blooming Cactus', description: 'A rare cactus with a single pink flower', darkDescription: 'The flower opened and will not close. It faces the window. Always.', ritualDescription: 'The flower has turned black. Fennick says it is still blooming.', icon: '🌵', cost: 100, roomTheme: 'desert' },
  { id: 'desert_orrery', name: 'Desert Orrery', description: 'A model of the solar system in brass and stone', darkDescription: 'An extra sphere appeared in the orrery. No one placed it there.', ritualDescription: 'The spheres align. The model shows what the sky will become.', icon: '🪐', cost: 150, roomTheme: 'desert' },
  // Office (Capybara)
  { id: 'office_plant', name: 'Office Fern', description: 'A calming fern that purifies the air', darkDescription: 'The fern has doubled in size. It purifies nothing now.', ritualDescription: 'The fern reaches toward the ceiling. Toward the room above. Toward what gathers.', icon: '🪴', cost: 75, roomTheme: 'office' },
  { id: 'office_fish', name: 'Desktop Aquarium', description: 'A tiny fish tank with a single goldfish', darkDescription: 'The fish swims in the same circle. Endlessly. Perfectly.', ritualDescription: 'The fish died weeks ago. It still swims. Chill does not mention this.', icon: '🐠', cost: 100, roomTheme: 'office' },
  { id: 'office_art', name: 'Abstract Art', description: 'A soothing abstract canvas in cool tones', darkDescription: 'The painting has changed. The shapes form a pattern now.', ritualDescription: 'Not abstract. A diagram. The arrangement, viewed from above.', icon: '🎨', cost: 150, roomTheme: 'office' },
  // Burrow (Wombat)
  { id: 'burrow_crystals', name: 'Crystal Cluster', description: 'Amethyst crystals embedded in the wall', darkDescription: 'The crystals vibrate at a frequency Warren can feel in his teeth.', ritualDescription: 'They glow when you solve puzzles. Warren noticed first.', icon: '💎', cost: 75, roomTheme: 'burrow' },
  { id: 'burrow_mushrooms', name: 'Glow Mushrooms', description: 'Bioluminescent mushrooms in the corner', darkDescription: 'The mushrooms spell something in the dark. A word. Then another.', ritualDescription: 'They spell the words you formed. Every puzzle. Written in bioluminescence.', icon: '🍄', cost: 100, roomTheme: 'burrow' },
  { id: 'burrow_fossils', name: 'Fossil Collection', description: 'Ancient fossils carefully mounted on the wall', darkDescription: 'The fossils are warm. As if something inside still lives.', ritualDescription: 'Not fossils. Promises. Left by those who built the first arrangement.', icon: '🦴', cost: 150, roomTheme: 'burrow' },
  // Garden (Rabbit)
  { id: 'garden_fountain', name: 'Stone Fountain', description: 'A bubbling fountain with mossy stones', darkDescription: 'The fountain water has gone still. Perfectly still. Like glass.', ritualDescription: 'Look into the water. That shape below the surface. Do not look away.', icon: '⛲', cost: 75, roomTheme: 'garden' },
  { id: 'garden_birdhouse', name: 'Birdhouse', description: 'A charming painted birdhouse on a pole', darkDescription: 'No birds have come. The birdhouse faces a direction that does not exist.', ritualDescription: 'A house within a house. The pattern repeats at every scale.', icon: '🏡', cost: 100, roomTheme: 'garden' },
  { id: 'garden_gazebo', name: 'Garden Gazebo', description: 'A vine-covered gazebo for afternoon tea', darkDescription: 'The vines have woven themselves into shapes. Letters. Words.', ritualDescription: 'The gazebo is a threshold. Thyme sits there and does not move.', icon: '🛖', cost: 150, roomTheme: 'garden' },
  // Bamboo (Red Panda)
  { id: 'bamboo_incense', name: 'Incense Burner', description: 'Fragrant smoke curls upward in spirals', darkDescription: 'The smoke writes characters in a language no one taught it.', ritualDescription: 'The incense has been burning since the first puzzle. It will burn until the last.', icon: '🧘', cost: 75, roomTheme: 'bamboo' },
  { id: 'bamboo_bonsai', name: 'Bonsai Tree', description: 'A centuries-old bonsai in a jade pot', darkDescription: 'The bonsai is growing. Fast. Despite no light. Despite no water.', ritualDescription: 'Its roots reach through the floor into every room below. Connecting them.', icon: '🌳', cost: 100, roomTheme: 'bamboo' },
  { id: 'bamboo_windchime', name: 'Wind Chimes', description: 'Bamboo chimes that sing in the breeze', darkDescription: 'The chimes ring without wind. A melody that Bamboo hums along to.', ritualDescription: 'The chimes play the frequency of the arrangement. The final note approaches.', icon: '🎐', cost: 150, roomTheme: 'bamboo' },
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
