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
