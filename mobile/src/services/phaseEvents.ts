import { AnimalType, DialoguePhase } from '../types/homeWorld';
import { getWordPhaseTier } from './localGenerator';

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
  /** Essential ceremonies wait for Continue; reading speed is not a motion preference. */
  readAtOwnPace?: boolean;
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
 * the roof silhouette the player built (environment/roof.png); the three
 * 'ceremony_*' emblems (assets/ui/spots, generateGameIcons) give the phase 1-3
 * ceremonies an image of their own (a lantern with moths, a guttering candle
 * in a dark window, a bare tree's long shadow) where they used to be text on
 * a dark ground.
 */
export type SceneImage = 'private_room' | 'outward_road' | 'outward_road_night' | 'kept_table' | 'shadow_figure' | 'house' | 'ceremony_curious' | 'ceremony_deeper' | 'ceremony_shadows';

export interface PhaseScene {
  text: string;
  /** Named participant, only when present in the supplied story roster. */
  speaker?: AnimalType;
  /** Optional diegetic sound, played when this scene becomes visible. */
  cue?: 'bell' | 'answer';
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
        text: 'There is a place by the hearth for another cup.',
        delay: 0,
        duration: 3000,
        effect: 'fade',
      },
      {
        text: 'This evening, it is warm before anyone fills it.',
        delay: 3200,
        duration: 3000,
        effect: 'fade',
      },
      {
        text: 'Ember checks the kettle, then the empty cup.',
        image: 'ceremony_curious',
        imageOpacity: 0.5,
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
        image: 'ceremony_deeper',
        imageOpacity: 0.5,
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
        image: 'ceremony_shadows',
        imageOpacity: 0.5,
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
        text: 'The words fed the warmth under the house.\nThe warmth has begun to keep things from changing.',
        delay: 3700,
        duration: 3500,
        effect: 'pulse',
        effectIntensity: 0.5,
      },
      {
        text: 'Your friends have found their robes.\nThey do not agree about what comes next.',
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
      // The roll-call: first recruit and last recruit by name. Both are
      // guaranteed unlocked here (the ceremony requires the full house, and
      // unlock order is fixed: Ember first, Moss last).
      text: 'Ember lit the first hearth. Moss answered from the roof.\nEleven keepers found their rooms between them.',
      delay: 3200,
      duration: 3500,
    },
    {
      text: 'You built it.\nPuzzle by puzzle. Word by word.',
      delay: 6900,
      duration: 3500,
    },
    {
      // The oldest planted seed pays off: Ember's onboarding wrong-note
      // ("hoping for someone like you") is revealed as recruitment.
      text: 'Ember looks from the old hearth to the new rooms.\n“I asked you to build a home. I owe you the rest of what I knew.”',
      delay: 10600,
      duration: 3500,
    },
    {
      // A first faint glimpse of the entity — present and waiting, NOT
      // descending: the arrival belongs to the finale, not this ceremony.
      text: 'The house is ready to receive something.\nWhether receiving is enough remains unanswered.',
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
 * The Arrival can follow a complete house or the solve-floor fallback.
 * Only name keepers the player has recruited, and only recall choices supplied
 * by the story spine. An absent boundary is a truthful legacy-save variant.
 */
export interface FinalArrivalContext {
  houseComplete?: boolean;
  unlockedAnimals?: string[];
  boundary?: 'remember' | 'release' | null;
  keptPromise?: boolean;
  keptRecord?: boolean;
  standBeside?: boolean;
}

export const FINAL_PUZZLE_EVENT: PhaseTransitionEvent = {
  readAtOwnPace: true,
  phase: 4,
  title: 'The Arrival',
  bgColor: '#020005',
  textColor: '#C4B5D2',
  accentColor: '#8B2252',
  particles: { count: 25, color: '#8B2252', direction: 'rise', speed: 6, size: 7, opacity: 0.3 },
  vignette: true,
  shakeIntensity: 0.7,
  scenes: [
    { text: 'Midnight. The last letter settles.', image: 'kept_table', imageOpacity: 0.8, delay: 0, duration: 3000 },
    { text: 'The words return through the walls.\nThe incantation has learned the sound of this house.', image: 'house', imageOpacity: 0.45, delay: 3200, duration: 4000 },
    { text: 'The rooms you raised stand above the old foundation.\nYour friends keep their places.', image: 'house', imageOpacity: 0.55, delay: 7400, duration: 4000 },
    { text: 'A note passes through the timber.\nA spoon taps a cup. The small sound still carries.', image: 'house', imageOpacity: 0.35, delay: 11600, duration: 3000 },
    { text: 'For a moment, nothing moves.', delay: 14800, duration: 2000 },
    { text: 'The seam opens above the roof.\nSomething descends, carrying the warmth you knew.', image: 'shadow_figure', imageOpacity: 0.7, effect: 'descend', delay: 17000, duration: 5000 },
    { text: 'The warmth reaches for every room.\nAt the doorstep, a cold draft remains.', image: 'shadow_figure', imageOpacity: 0.7, delay: 22200, duration: 5000 },
    { text: 'Ember leaves the door on its latch.\n“I wanted us safe. I did not know what it would try to stop.”', speaker: 'fox', image: 'shadow_figure', imageOpacity: 0.55, delay: 27400, duration: 4500 },
    { text: 'The seam closes. The presence stays.\nSomewhere in the house, a cup begins to cool.', image: 'shadow_figure', imageOpacity: 0.45, delay: 32100, duration: 3500 },
  ],
};

export function buildFinalPuzzleEvent(
  ritualWords: string[],
  context?: FinalArrivalContext,
): PhaseTransitionEvent {
  const seen = new Set<string>();
  const ranked: { word: string; tier: number }[] = [];
  for (let i = ritualWords.length - 1; i >= 0; i--) {
    const word = (ritualWords[i] || '').toUpperCase().trim();
    if (!word || seen.has(word)) continue;
    seen.add(word);
    const tier = getWordPhaseTier(word);
    if (tier >= 2) ranked.push({ word, tier });
  }
  ranked.sort((a, b) => b.tier - a.tier);
  const top = ranked.slice(0, 3).map(r => r.word);
  if (top.length < 2 && context === undefined) return FINAL_PUZZLE_EVENT;

  const scenes = FINAL_PUZZLE_EVENT.scenes.map(scene => ({ ...scene }));
  if (top.length >= 2) {
    scenes[1].text = `${top.join('. ')}.\nThe incantation returns in the words you actually brought.`;
  }
  const met = new Set(context?.unlockedAnimals ?? ['fox']);
  scenes[7].image = 'kept_table';
  scenes[7].imageOpacity = 0.62;
  if (met.has('fox') && context?.standBeside === true) {
    scenes[7].text = 'Ember stands beside you, leaving a little space.\n“I will tell you when I do not know. That promise I can keep.”';
  } else if (met.has('fox') && context?.standBeside === false) {
    scenes[7].text = 'Ember stays by the hearth.\nYour place in the house does not depend on how close you stand to her.';
  }
  if (context?.boundary) {
    const boundaryImage = context.boundary === 'remember' ? 'private_room' : 'outward_road_night';
    scenes[6].image = boundaryImage;
    scenes[6].imageOpacity = 0.88;
    scenes[8].image = boundaryImage;
    scenes[8].imageOpacity = 0.72;
  }
  // Ember is the first resident, but keep even the generic/legacy API honest
  // when an explicit empty roster is provided by a test or restored snapshot.
  if (!met.has('fox')) {
    scenes[7].text = 'The doorway stays open a hand\'s width.\nWarmth and cold meet there without either disappearing.';
    delete scenes[7].speaker;
  }
  if (context?.houseComplete === true) {
    scenes[2].text = 'Every room you raised stands above the old foundation.\nThe whole household is here.';
  } else if (context?.houseComplete === false) {
    scenes[2].text = 'Some rooms remain unbuilt.\nThe warmth follows the words through the rooms you raised.';
  }
  if (met.has('wombat')) {
    scenes[2].text += '\nWarren braces the join. “Room to move. It needs room to move.”';
    scenes[2].speaker = 'wombat';
  }

  if (met.has('aye_aye')) {
    scenes[3].text = 'Tock takes his paw off the rope.\n“Your words first. She can answer.”';
    scenes[3].speaker = 'aye_aye';
  } else if (met.has('fennec_fox')) {
    scenes[3].text = 'Fennick lowers one ear to the floor.\n“The small sounds are still here. Keep them here.”';
    scenes[3].speaker = 'fennec_fox';
  }

  if (context?.boundary === 'remember') {
    scenes[6].text = context.keptRecord
      ? 'CLOSED.\nThe warmth reaches the private room, then stops at its door.\nThe original words inside remain unchanged.'
      : 'CLOSED.\nThe warmth reaches the private room, then stops at its door.\nA thought can stay there without being corrected.';
  } else if (context?.boundary === 'release') {
    scenes[6].text = 'CLOSER.\nThe warmth gathers at the doorstep, then makes room.\nThe road beyond still leads away.';
  }
  if (context?.boundary && met.has('aye_aye')) {
    scenes[8].text = 'The bell answers once. The seam closes.\nA cup cools. Nobody warms it before asking.';
    scenes[8].speaker = 'aye_aye';
    scenes[8].cue = 'bell';
  } else if (context?.boundary && met.has('kakapo')) {
    scenes[8].text = 'Moss answers with one low call. The seam closes.\nA cup cools. Nobody warms it before asking.';
    scenes[8].speaker = 'kakapo';
    scenes[8].cue = 'answer';
  }
  if (context?.keptRecord && met.has('capybara')) {
    scenes[4].text = 'Chill holds the original page flat.\n“The correction stays beside it. It does not replace it.”';
    scenes[4].speaker = 'capybara';
    scenes[4].duration = 3500;
  } else if (context?.keptPromise && met.has('rabbit')) {
    scenes[4].text = 'Thyme keeps the seed tin in her own pocket.\n“Still mine.”';
    scenes[4].speaker = 'rabbit';
    scenes[4].duration = 3000;
  }

  // Context can add a line to the house tableau or the held pause. Give each
  // scene reading time and recompute timings without changing the choreography.
  let nextDelay = 0;
  for (const scene of scenes) {
    scene.delay = nextDelay;
    scene.duration = Math.max(scene.duration, Math.min(6500, scene.text.split(/\s+/).length * 135));
    nextDelay += scene.duration + 200;
  }
  return { ...FINAL_PUZZLE_EVENT, scenes };
}

// ============================================================================
// POST-REVELATION EVENT
// ============================================================================

/**
 * Cinematic event marking the transition to post-revelation state (Phase 5).
 * Terrible peace. The shadow figure is here. The animals are serene.
 */
export const POST_REVELATION_EVENT: PhaseTransitionEvent = {
  readAtOwnPace: true,
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
      text: 'Some of your friends sleep. Some keep watch.\nFor once, they do not all choose the same thing.',
      delay: 3200,
      duration: 3500,
    },
    {
      text: 'The letters still move.\nThe words still shift.',
      delay: 6900,
      duration: 3000,
    },
    {
      text: 'A chipped cup stays chipped.\nTomorrow, someone may mend it.',
      delay: 10100,
      duration: 3000,
    },
    {
      text: 'The pattern continues.\nSo does the work of living beside it.',
      delay: 13300,
      duration: 3000,
    },
  ],
};


/** After remembers the enacted boundary without inventing one for legacy saves. */
export function buildPostRevelationEvent(context?: FinalArrivalContext): PhaseTransitionEvent {
  if (!context?.boundary) return POST_REVELATION_EVENT;
  const scenes = POST_REVELATION_EVENT.scenes.map(scene => ({ ...scene }));
  scenes[1].text = context.boundary === 'remember'
    ? 'The private room stays closed.\nNobody inside the house has to give every thought away.'
    : 'The road beyond the house remains a road.\nA departure does not have to become a disappearance.';
  scenes[3].text = context.boundary === 'remember'
    ? context.keptRecord
      ? 'The old page and its correction lie side by side.\nKeeping a memory does not make it the only truth.'
      : 'A sentence is written again.\nThis time nobody turns it into a reassurance.'
    : 'There is warmth at the door when someone returns.\nIt reaches no further than they ask.';
  const image = context.boundary === 'remember' ? 'private_room' : 'outward_road';
  scenes[1].image = image;
  scenes[1].imageOpacity = 0.8;
  return { ...POST_REVELATION_EVENT, scenes, backdrop: { image, opacity: 0.62 } };
}

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
  readAtOwnPace: true,
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
      text: 'The rooms you raised and the friends you invited remain.\nA bright morning is still possible here.',
      delay: 3700,
      duration: 3500,
    },
    {
      text: 'Beneath the stillness, a bright morning is already waking.',
      delay: 7400,
      duration: 3500,
    },
    {
      text: 'They will greet you as if for the first time.\nOne small boundary may be older than the morning.',
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
