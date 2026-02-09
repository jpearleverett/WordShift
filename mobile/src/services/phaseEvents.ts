import { DialoguePhase } from '../types/homeWorld';

/**
 * Phase transition narrative events.
 * These are special scenes that play at phase boundaries to punctuate
 * the player's journey and create memorable moments between phases.
 *
 * Each event has cinematic-style text that plays out as a brief interstitial
 * before the player returns to normal gameplay.
 */

export interface PhaseTransitionEvent {
  phase: DialoguePhase;
  title: string;
  scenes: PhaseScene[];
  bgColor: string;
  textColor: string;
  accentColor: string;
}

export interface PhaseScene {
  text: string;
  emoji?: string;
  delay: number; // ms before showing this scene
  duration: number; // ms to display this scene
}

const PHASE_EVENTS: Record<number, PhaseTransitionEvent> = {
  1: {
    phase: 1,
    title: 'Curious Thoughts',
    bgColor: '#2D2B55',
    textColor: '#E8E4F0',
    accentColor: '#B794F4',
    scenes: [
      {
        text: 'The letters have always moved this way.',
        emoji: '💭',
        delay: 0,
        duration: 3000,
      },
      {
        text: 'But lately, you\'ve started to notice...',
        delay: 3200,
        duration: 3000,
      },
      {
        text: 'The words seem to want something.',
        emoji: '✨',
        delay: 6400,
        duration: 3000,
      },
      {
        text: 'Your friends have new things to share.',
        emoji: '🏠',
        delay: 9600,
        duration: 2500,
      },
    ],
  },
  2: {
    phase: 2,
    title: 'Deeper Questions',
    bgColor: '#1A1832',
    textColor: '#C4B5D9',
    accentColor: '#9B7DC8',
    scenes: [
      {
        text: 'The words are changing.',
        emoji: '🌙',
        delay: 0,
        duration: 3000,
      },
      {
        text: 'Or maybe you are.',
        delay: 3200,
        duration: 3000,
      },
      {
        text: 'Your friends speak differently now.\nHave you noticed?',
        delay: 6400,
        duration: 3500,
      },
      {
        text: 'The house feels... quieter.',
        emoji: '🏚️',
        delay: 10100,
        duration: 2500,
      },
    ],
  },
  3: {
    phase: 3,
    title: 'Growing Shadows',
    bgColor: '#0D0B1A',
    textColor: '#9B8FB5',
    accentColor: '#6B4F8A',
    scenes: [
      {
        text: 'Something is different.',
        emoji: '👁️',
        delay: 0,
        duration: 3000,
      },
      {
        text: 'The letters tremble before they settle.',
        delay: 3200,
        duration: 3000,
      },
      {
        text: 'Your friends speak of endings.\nOf purpose. Of something approaching.',
        delay: 6400,
        duration: 4000,
      },
      {
        text: 'You should check on them.',
        delay: 10600,
        duration: 2500,
      },
    ],
  },
  4: {
    phase: 4,
    title: 'The Horizon',
    bgColor: '#050208',
    textColor: '#7A6B8A',
    accentColor: '#8B2252',
    scenes: [
      {
        text: 'The arrangement is nearly complete.',
        emoji: '🌑',
        delay: 0,
        duration: 3500,
      },
      {
        text: 'Every puzzle you solved brought us here.',
        delay: 3700,
        duration: 3500,
      },
      {
        text: 'Your friends are waiting.\nThey\'ve been waiting for a long time.',
        delay: 7400,
        duration: 4000,
      },
      {
        text: 'Go home. See what you\'ve built.',
        emoji: '🏠',
        delay: 11600,
        duration: 3000,
      },
    ],
  },
};

/**
 * Get the narrative event for a phase transition.
 * Returns null for Phase 0 (no transition event for the starting phase).
 */
export function getPhaseTransitionEvent(newPhase: DialoguePhase): PhaseTransitionEvent | null {
  return PHASE_EVENTS[newPhase] || null;
}

/**
 * Calculate total duration of a phase transition event (in ms).
 */
export function getEventDuration(event: PhaseTransitionEvent): number {
  if (event.scenes.length === 0) return 0;
  const lastScene = event.scenes[event.scenes.length - 1];
  return lastScene.delay + lastScene.duration + 500; // 500ms fade-out buffer
}

// ============================================================================
// HOUSE COMPLETION CEREMONY
// ============================================================================

/**
 * Cinematic event for when all 10 rooms are built and all 10 animals are unlocked.
 * "You didn't build a house. You built a temple."
 */
export const HOUSE_COMPLETION_EVENT: PhaseTransitionEvent = {
  phase: 4,
  title: 'The Temple',
  bgColor: '#050208',
  textColor: '#C4A882',
  accentColor: '#8B6914',
  scenes: [
    {
      text: 'The house is complete.',
      emoji: '🏠',
      delay: 0,
      duration: 3000,
    },
    {
      text: 'Ten rooms. Ten keepers.\nEach in their place.',
      delay: 3200,
      duration: 3500,
    },
    {
      text: 'You built it.\nPuzzle by puzzle. Word by word.',
      delay: 6900,
      duration: 3500,
    },
    {
      text: 'Every room is a chamber.\nEvery animal is a keeper.',
      delay: 10600,
      duration: 3500,
    },
    {
      text: 'The arrangement is ready.',
      emoji: '🌑',
      delay: 14300,
      duration: 3000,
    },
  ],
};

// ============================================================================
// FINAL PUZZLE EVENT
// ============================================================================

/**
 * Cinematic event for after the "final puzzle" at deep Phase 4.
 * The shadow figure descends. The ritual is complete.
 */
export const FINAL_PUZZLE_EVENT: PhaseTransitionEvent = {
  phase: 4,
  title: 'The Arrival',
  bgColor: '#020005',
  textColor: '#6B5A7A',
  accentColor: '#8B2252',
  scenes: [
    {
      text: 'The last word has been shifted.',
      delay: 0,
      duration: 3500,
    },
    {
      text: 'Every word you ever formed was an incantation.\nEvery puzzle was a verse.',
      delay: 3700,
      duration: 4000,
    },
    {
      text: 'The ten keepers stand in their chambers.\nThe temple is complete.',
      emoji: '🏠',
      delay: 7900,
      duration: 4000,
    },
    {
      text: 'Something descends from above the attic.\nSomething that has no name.',
      emoji: '🌑',
      delay: 12100,
      duration: 4000,
    },
    {
      text: 'It was always coming.\nYou just gave it the words.',
      delay: 16300,
      duration: 4000,
    },
    {
      text: 'The arrangement is complete.',
      delay: 20500,
      duration: 3000,
    },
  ],
};

// ============================================================================
// POST-REVELATION EVENT
// ============================================================================

/**
 * Cinematic event marking the transition to post-revelation state (Phase 5).
 * Terrible peace. The shadow figure is here. The animals are serene.
 */
export const POST_REVELATION_EVENT: PhaseTransitionEvent = {
  phase: 4,
  title: 'After',
  bgColor: '#0A0510',
  textColor: '#8A7A9A',
  accentColor: '#4A3060',
  scenes: [
    {
      text: 'The shadow settles.',
      delay: 0,
      duration: 3000,
    },
    {
      text: 'Your friends are at peace.\nA terrible, beautiful peace.',
      delay: 3200,
      duration: 3500,
    },
    {
      text: 'The letters still move.\nThe words still shift.',
      delay: 6900,
      duration: 3000,
    },
    {
      text: 'But the meaning has changed.\nEverything has changed.',
      delay: 10100,
      duration: 3000,
    },
    {
      text: 'The pattern continues.\nIt always will.',
      delay: 13300,
      duration: 3000,
    },
  ],
};
