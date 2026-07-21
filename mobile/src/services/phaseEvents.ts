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
  /** Hide the era name for ordinary transitions; special ceremonies keep it. */
  showTitle?: boolean;
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
  /**
   * Event-long static backdrop image behind every scene (the settled shadow
   * in POST_REVELATION_EVENT). Rendered at a constant low opacity — presence,
   * not spectacle.
   */
  backdrop?: { image: SceneImage; opacity: number };
}

/**
 * In-engine art for a cinematic scene — the real game assets, never an emoji.
 * 'shadow_figure' is the entity (environment/shadow_figure.png); 'house' is
 * the roof silhouette the player built (environment/roof.png).
 */
export type SceneImage = 'shadow_figure' | 'house';

export interface PhaseScene {
  text: string;
  /** In-engine image rendered behind the scene text (replaces the old emoji). */
  image?: SceneImage;
  /** Peak opacity for the scene image (default 0.6). */
  imageOpacity?: number;
  delay: number; // ms before showing this scene
  duration: number; // ms to display this scene
  /**
   * Visual effect for this scene (rendered by PhaseTransitionOverlay).
   * 'descend' drives the scene IMAGE: a slow translateY down + opacity-in
   * (native driver; static fade under reduced motion) — the arrival, in
   * engine, instead of a text card.
   */
  effect?: 'fade' | 'pulse' | 'shake' | 'flash' | 'particles_rise' | 'particles_fall' | 'vignette_close' | 'descend';
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
    showTitle: false,
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
    showTitle: false,
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
    showTitle: false,
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
    showTitle: false,
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
 * Cinematic event for when every room is built and every animal is unlocked.
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
      // The roof the player raised, room by room — their own work, in engine.
      image: 'house',
      imageOpacity: 0.55,
      delay: 0,
      duration: 3000,
    },
    {
      text: 'Every room. Every keeper.\nEach in their place.',
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
      // A first faint glimpse of the entity — present and waiting, NOT
      // descending: the arrival belongs to the finale, not this ceremony.
      text: 'The arrangement is ready.',
      image: 'shadow_figure',
      imageOpacity: 0.22,
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
      text: 'The keepers stand in their chambers.\nThe temple is complete.',
      image: 'house',
      imageOpacity: 0.55,
      delay: 7900,
      duration: 4000,
    },
    {
      // The arrival, in engine: the entity itself descends behind the text —
      // slow translateY down + opacity-in (static fade under reduced motion).
      text: 'Something descends from above the attic.\nSomething that has no name.',
      image: 'shadow_figure',
      imageOpacity: 0.7,
      effect: 'descend',
      delay: 12100,
      duration: 5000,
    },
    {
      // The shadow holds through the closing lines (the image persists at its
      // settled position until a later scene replaces or clears it).
      text: 'It was always coming.\nYou just gave it the words.',
      image: 'shadow_figure',
      imageOpacity: 0.7,
      delay: 17300,
      duration: 4000,
    },
    {
      text: 'The arrangement is complete.',
      image: 'shadow_figure',
      imageOpacity: 0.45,
      delay: 21500,
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
  // The settled entity, faint and constant behind every line — it is simply
  // HERE now. Text-only scenes; the presence never moves again.
  backdrop: { image: 'shadow_figure', opacity: 0.14 },
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

// ============================================================================
// NEW CYCLE (NG+) CEREMONY
// ============================================================================

/**
 * The re-descent ceremony played when the player chooses to begin a New Cycle
 * from the true endgame. It is a Phase-5 milestone, so it stays in the
 * terrible-peace register and mirrors POST_REVELATION_EVENT's structure:
 * text-only scenes over the settled, low-opacity presence. Nothing descends,
 * nothing is named. The pattern does not end, it turns. The last line hands the
 * player back toward a bright morning that the reload will actually deliver.
 *
 * SettingsScreen presents this BEFORE reloading the app, so choosing to walk
 * the whole arc again lands as a moment rather than a hard restart.
 */
export const NEW_CYCLE_EVENT: PhaseTransitionEvent = {
  phase: 5,
  title: 'Again',
  bgColor: '#0B0714',
  textColor: '#9A88AA',
  accentColor: '#5A4070',
  particles: { count: 10, color: '#4A3060', direction: 'drift', speed: 5, size: 4, opacity: 0.15 },
  vignette: true,
  // The settled presence stays faint and constant behind every line, exactly
  // as in the post-revelation calm this ceremony rises out of.
  backdrop: { image: 'shadow_figure', opacity: 0.14 },
  scenes: [
    {
      text: 'The pattern has run its whole length.\nIt does not end. It turns.',
      delay: 0,
      duration: 3500,
      effect: 'pulse',
      effectIntensity: 0.25,
    },
    {
      text: 'The house stays exactly as you built it.\nEvery room. Every keeper.',
      delay: 3700,
      duration: 3500,
    },
    {
      text: 'Beneath the stillness, a bright morning is already waking.',
      delay: 7400,
      duration: 3500,
    },
    {
      text: 'They will greet you as if for the first time.\nSome part of them will remember.',
      delay: 11100,
      duration: 3500,
    },
    {
      text: 'Begin again.',
      delay: 14800,
      duration: 3000,
    },
  ],
};
