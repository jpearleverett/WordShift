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
  /** Ambient particles rendered during the entire cinematic */
  particles?: CinematicParticleConfig;
  /** Whether to show a vignette overlay that closes in */
  vignette?: boolean;
  /** Screen shake intensity (0 = none, 1 = heavy) */
  shakeIntensity?: number;
}

export interface PhaseScene {
  text: string;
  emoji?: string;
  delay: number; // ms before showing this scene
  duration: number; // ms to display this scene
  /** Visual effect for this scene (rendered by PhaseTransitionOverlay) */
  effect?: 'fade' | 'pulse' | 'shake' | 'flash' | 'particles_rise' | 'particles_fall' | 'vignette_close';
  /** Intensity of the effect (0-1, default 0.5) */
  effectIntensity?: number;
}

/**
 * Particle configuration for cinematic transitions.
 * Rendered as animated elements behind/around the text.
 */
export interface CinematicParticleConfig {
  count: number;
  color: string;
  /** 'rise' = float upward, 'fall' = rain down, 'drift' = horizontal float */
  direction: 'rise' | 'fall' | 'drift';
  speed: number; // pixels per second
  size: number;  // diameter in pixels
  opacity: number;
}

const PHASE_EVENTS: Record<number, PhaseTransitionEvent> = {
  1: {
    phase: 1,
    title: 'Curious Thoughts',
    bgColor: '#2D2B55',
    textColor: '#E8E4F0',
    accentColor: '#B794F4',
    particles: { count: 8, color: '#B794F4', direction: 'rise', speed: 20, size: 4, opacity: 0.3 },
    scenes: [
      {
        text: 'The letters have always moved this way.',
        delay: 0,
        duration: 3000,
        effect: 'fade',
      },
      {
        text: 'So why does it feel, lately, like they are moving toward something?',
        delay: 3200,
        duration: 3000,
        effect: 'fade',
      },
      {
        text: 'The words seem to lean in. As if they are listening.',
        delay: 6400,
        duration: 3000,
        effect: 'pulse',
        effectIntensity: 0.3,
      },
      {
        text: 'Your friends have been thinking, too.\nThey have new things to share.',
        delay: 9600,
        duration: 2500,
        effect: 'fade',
      },
    ],
  },
  2: {
    phase: 2,
    title: 'Deeper Questions',
    bgColor: '#1A1832',
    textColor: '#C4B5D9',
    accentColor: '#9B7DC8',
    particles: { count: 10, color: '#9B7DC8', direction: 'fall', speed: 15, size: 3, opacity: 0.2 },
    vignette: true,
    scenes: [
      {
        text: 'The words are changing. Emptier. Hungrier.',
        delay: 0,
        duration: 3000,
        effect: 'fade',
      },
      {
        text: 'Or perhaps it is you that has changed,\nand the words were always like this.',
        delay: 3200,
        duration: 3000,
        effect: 'pulse',
        effectIntensity: 0.4,
      },
      {
        text: 'Your friends speak softly now...\nof stillness, of endings, of things that pass.',
        delay: 6400,
        duration: 3500,
        effect: 'fade',
      },
      {
        text: 'And the house has gone quiet.\nThe kind of quiet that is waiting for something.',
        delay: 10100,
        duration: 2500,
        effect: 'vignette_close',
        effectIntensity: 0.3,
      },
    ],
  },
  3: {
    phase: 3,
    title: 'Growing Shadows',
    bgColor: '#0D0B1A',
    textColor: '#9B8FB5',
    accentColor: '#6B4F8A',
    particles: { count: 12, color: '#6B4F8A', direction: 'rise', speed: 10, size: 5, opacity: 0.15 },
    vignette: true,
    shakeIntensity: 0.3,
    scenes: [
      {
        text: 'You feel it before you can name it.\nA weight behind the warmth.',
        delay: 0,
        duration: 3000,
        effect: 'flash',
        effectIntensity: 0.2,
      },
      {
        text: 'The letters tremble now, before they settle.\nAs if reluctant.',
        delay: 3200,
        duration: 3000,
        effect: 'shake',
        effectIntensity: 0.4,
      },
      {
        text: 'Your friends speak of endings. Of purpose.\nOf something that is almost here.',
        delay: 6400,
        duration: 4000,
        effect: 'particles_rise',
        effectIntensity: 0.6,
      },
      {
        text: 'Go to them.\nWhile they still sound like themselves.',
        delay: 10600,
        duration: 2500,
        effect: 'vignette_close',
        effectIntensity: 0.5,
      },
    ],
  },
  4: {
    phase: 4,
    title: 'The Horizon',
    bgColor: '#050208',
    textColor: '#7A6B8A',
    accentColor: '#8B2252',
    particles: { count: 15, color: '#8B2252', direction: 'rise', speed: 8, size: 6, opacity: 0.2 },
    vignette: true,
    shakeIntensity: 0.5,
    scenes: [
      {
        text: 'The arrangement is almost whole.\nYou can feel where the last pieces go.',
        delay: 0,
        duration: 3500,
        effect: 'flash',
        effectIntensity: 0.3,
      },
      {
        text: 'Every word you ever shifted was a step along this path.\nYou were never only playing.',
        delay: 3700,
        duration: 3500,
        effect: 'pulse',
        effectIntensity: 0.5,
      },
      {
        text: 'Your friends are waiting in their chambers.\nThey have waited so patiently. So long.',
        delay: 7400,
        duration: 4000,
        effect: 'shake',
        effectIntensity: 0.6,
      },
      {
        text: 'Go home.\nSee what your hands have built.',
        delay: 11600,
        duration: 3000,
        effect: 'vignette_close',
        effectIntensity: 0.8,
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
  particles: { count: 20, color: '#8B6914', direction: 'rise', speed: 12, size: 4, opacity: 0.25 },
  vignette: true,
  shakeIntensity: 0.4,
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
  particles: { count: 25, color: '#8B2252', direction: 'rise', speed: 6, size: 7, opacity: 0.3 },
  vignette: true,
  shakeIntensity: 0.7,
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
  particles: { count: 10, color: '#4A3060', direction: 'drift', speed: 5, size: 4, opacity: 0.15 },
  vignette: true,
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
