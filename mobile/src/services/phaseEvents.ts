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
  /** A resident's immediate response shares ceremony persistence and overlay ownership. */
  presentation?: 'cinematic' | 'dialogue';
  phase: DialoguePhase;
  title: string;
  /** Hide the era name for ordinary transitions; special ceremonies keep it. */
  showTitle?: boolean;
  /** Legacy marker for authored effect pacing; every ceremony now waits for Continue. */
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
 * The illustrated rooms and roads give each page a place in the same house;
 * the entity stays reserved for its authored reveal and settled aftermath.
 * 'shadow_figure' is the entity (environment/shadow_figure.png); 'house' is
 * the roof silhouette the player built (environment/roof.png); the three
 * 'ceremony_*' emblems (assets/ui/spots, generateGameIcons) remain registered
 * for authored special scenes. Ordinary passages use the room/road paintings.
 */
export type SceneImage = 'private_room' | 'outward_road' | 'outward_road_night' | 'kept_table' | 'shadow_figure' | 'house' | 'ceremony_curious' | 'ceremony_deeper' | 'ceremony_shadows'
  | ArrivalImage | MorningImage;

/** The Arrival's own paintings (assets/story/arrival), one per beat. */
export type ArrivalImage = 'arrival_table' | 'arrival_call' | 'arrival_house' | 'arrival_seam' | 'arrival_descent'
  | 'arrival_hold' | 'arrival_rooms' | 'arrival_door' | 'arrival_gate' | 'arrival_bell' | 'arrival_settle';
/** The morning after, with the settled presence in every frame. */
export type MorningImage = 'morning_house' | 'morning_door' | 'morning_road' | 'morning_kitchen' | 'morning_table' | 'morning_window';

export interface PhaseScene {
  text: string;
  /** Named participant, only when present in the supplied story roster. */
  speaker?: AnimalType;
  /** Optional diegetic sound, played when this scene becomes visible. */
  cue?: 'bell' | 'answer';
  /** Illustration displayed with the passage, separate from its reading surface. */
  image?: SceneImage;
  /** Peak opacity for the scene image (default 0.6). */
  imageOpacity?: number;
  /** A modest close view gives consecutive passages distinct framing. */
  imageFraming?: 'wide' | 'detail';
  delay: number; // authored timeline offset, retained for scene/effect metadata
  duration: number; // visual-effect duration; never a deadline for reading
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
        image: 'kept_table',
        imageOpacity: 1,
        delay: 0,
        duration: 3000,
        effect: 'fade',
      },
      {
        text: 'This evening, it is warm before anyone fills it.',
        image: 'kept_table',
        imageOpacity: 1,
        imageFraming: 'detail',
        delay: 3200,
        duration: 3000,
        effect: 'fade',
      },
      {
        text: 'Ember checks the kettle, then the empty cup.',
        image: 'private_room',
        imageOpacity: 1,
        delay: 6400,
        duration: 3000,
        effect: 'pulse',
        effectIntensity: 0.3,
      },
      {
        text: 'Your friends have been thinking, too.\nThey have new things to share.',
        image: 'kept_table',
        imageOpacity: 1,
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
        image: 'kept_table',
        imageOpacity: 1,
        imageFraming: 'detail',
        delay: 0,
        duration: 3000,
        effect: 'fade',
      },
      {
        text: 'Or perhaps it is you who has changed,\nand the words were always like this.',
        image: 'outward_road_night',
        imageOpacity: 1,
        delay: 3200,
        duration: 3000,
        effect: 'pulse',
        effectIntensity: 0.4,
      },
      {
        text: 'Your friends speak softly now...\nof stillness, of endings, of things that pass.',
        image: 'private_room',
        imageOpacity: 1,
        delay: 6400,
        duration: 3500,
        effect: 'fade',
      },
      {
        text: 'And the house has gone quiet.\nThe kind of quiet that is waiting for something.',
        image: 'outward_road_night',
        imageOpacity: 1,
        imageFraming: 'detail',
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
        image: 'private_room',
        imageOpacity: 1,
        delay: 0,
        duration: 3000,
        effect: 'flash',
        effectIntensity: 0.2,
      },
      {
        text: 'The letters tremble now, before they settle.\nAs if reluctant.',
        image: 'kept_table',
        imageOpacity: 1,
        imageFraming: 'detail',
        delay: 3200,
        duration: 3000,
        effect: 'shake',
        effectIntensity: 0.4,
      },
      {
        text: 'Your friends speak of endings. Of purpose.\nOf something that is almost here.',
        image: 'outward_road_night',
        imageOpacity: 1,
        delay: 6400,
        duration: 4000,
        effect: 'particles_rise',
        effectIntensity: 0.6,
      },
      {
        text: 'Go to them.\nWhile they still sound like themselves.',
        image: 'private_room',
        imageOpacity: 1,
        imageFraming: 'detail',
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
        text: 'The words did not stop at the pit.\nThey went down to something under the house, and it has been living on them.',
        image: 'kept_table',
        imageOpacity: 1,
        delay: 0,
        duration: 3500,
        effect: 'flash',
        effectIntensity: 0.3,
      },
      {
        text: 'It has grown fond of this house, fond enough to correct it.\nSad words come back cheerful. What changes, it puts back.',
        image: 'private_room',
        imageOpacity: 1,
        imageFraming: 'detail',
        delay: 3700,
        duration: 3500,
        effect: 'pulse',
        effectIntensity: 0.5,
      },
      {
        text: 'Your friends have put on robes to receive it.\nThey do not agree on how far to let it in.',
        image: 'private_room',
        imageOpacity: 1,
        delay: 7400,
        duration: 4000,
        effect: 'shake',
        effectIntensity: 0.6,
      },
      {
        text: 'Go home.\nSee what your hands have built.',
        image: 'outward_road_night',
        imageOpacity: 1,
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
      imageOpacity: 0.9,
      delay: 0,
      duration: 3000,
    },
    {
      // The roll-call: first recruit and last recruit by name. Both are
      // guaranteed unlocked here (the ceremony requires the full house, and
      // unlock order is fixed: Ember first, Moss last).
      text: 'Ember lit the first hearth. Moss planted the last garden, up on the roof.\nEleven keepers found their rooms between them.',
      image: 'private_room',
      imageOpacity: 1,
      delay: 3200,
      duration: 3500,
    },
    {
      text: 'You built it.\nRoom by room. Word by word.',
      image: 'kept_table',
      imageOpacity: 1,
      imageFraming: 'detail',
      delay: 6900,
      duration: 3500,
    },
    {
      // The oldest planted seed pays off: Ember's onboarding wrong-note
      // ("hoping for someone like you") is revealed as recruitment.
      text: 'Ember looks from the old hearth to the new rooms.\n"I asked you to build a home. I owe you the rest of what I knew."',
      image: 'kept_table',
      imageOpacity: 1,
      delay: 10600,
      duration: 3500,
    },
    {
      // A first faint glimpse of the entity — present and waiting, NOT
      // descending: the arrival belongs to the finale, not this ceremony.
      text: 'The house is ready to receive its guest.\nNobody has told the guest yet where it may not go.',
      image: 'shadow_figure',
      imageOpacity: 0.22,
      delay: 14300,
      duration: 3000,
    },
  ],
};

/**
 * The house can be finished on either side of the Arrival: the finale arms on
 * a real-solve floor (FINALE_ARM_MIN_PUZZLES) independent of the build, so a
 * player short of the last rooms plays the Arrival first and buys Sky Garden
 * and Moss afterwards. The static ceremony above anticipates a waiting
 * presence, which reads as a contradiction once it has descended and settled.
 * With `arrived`, Ember's promise becomes an acknowledgment and the closing
 * glimpse becomes the settled shadow at its post-revelation opacity, never a
 * waiting one. Without context (or before the Arrival) the authored constant
 * is returned untouched.
 */
export function buildHouseCompletionEvent(context?: FinalArrivalContext): PhaseTransitionEvent {
  if (context?.arrived !== true) return HOUSE_COMPLETION_EVENT;
  const scenes = HOUSE_COMPLETION_EVENT.scenes.map(scene => ({ ...scene }));
  scenes[3].text = 'Ember looks from the old hearth to the new rooms.\n"I asked you to build a home. You finished it after you learned what I knew."';
  scenes[4].text = 'The house is whole.\nWhat came through was already here to see it finished.';
  // The settled presence, at the opacity After leaves it: present, not waiting.
  scenes[4].imageOpacity = 0.14;
  return { ...HOUSE_COMPLETION_EVENT, scenes };
}

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
  /**
   * The Arrival has already happened (the final board is complete, or the
   * save is post-revelation). Lets a ceremony that can play on either side of
   * the Arrival, the house completion, stop anticipating a presence that has
   * already descended and settled.
   */
  arrived?: boolean;
  unlockedAnimals?: string[];
  boundary?: 'remember' | 'release' | null;
  keptPromise?: boolean;
  keptRecord?: boolean;
  standBeside?: boolean;
}

const ARRIVAL_STYLE = {
  readAtOwnPace: true,
  phase: 4 as DialoguePhase,
  title: 'The Arrival',
  bgColor: '#020005',
  textColor: '#C4B5D2',
  accentColor: '#8B2252',
  particles: { count: 25, color: '#8B2252', direction: 'rise' as const, speed: 6, size: 7, opacity: 0.3 },
  vignette: true,
  shakeIntensity: 0.7,
};

/** Reading time follows the words; the authored timeline is effect metadata only. */
function timeScenes(scenes: PhaseScene[]): PhaseScene[] {
  let nextDelay = 0;
  return scenes.map(scene => {
    const duration = Math.max(scene.duration, Math.min(6500, scene.text.split(/\s+/).length * 135));
    const timed = { ...scene, delay: nextDelay, duration };
    nextDelay += duration + 200;
    return timed;
  });
}

/**
 * The Arrival. Every page has its own painting, and a page carries a
 * resident's portrait ONLY when that resident is the one speaking on it: the
 * page is then just their words. Narration is never attributed to anyone.
 * (The previous version put Warren's name over narration about Moss, Tock's
 * over Fennick's quote, and Tock's over a page where he never spoke.)
 *
 * The creature is the SAME one the player has watched behind the house since
 * the storm: arrival_descent / arrival_hold / arrival_settle were painted
 * from the in-game entity layers, not the old blurred shadow.
 */
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
  // Ember is the first resident; an explicit empty roster (a test or a
  // restored snapshot) keeps every named beat honest.
  const met = new Set(context?.unlockedAnimals ?? ['fox']);
  const scenes: PhaseScene[] = [];
  const add = (scene: Omit<PhaseScene, 'delay' | 'duration' | 'imageOpacity'> & { duration?: number; imageOpacity?: number }) =>
    scenes.push({ imageOpacity: 1, delay: 0, duration: 3500, ...scene });

  add({ text: 'Midnight. The last letter settles into place.\nAround the long table, nobody moves.', image: 'arrival_table', duration: 3000 });
  add({
    text: top.length >= 2
      ? `${top.join('. ')}.\nEvery word you offered rises out of the pit and runs up through the walls. Together they say one thing: come in.`
      : 'Every word you offered rises out of the pit and runs up through the walls.\nTogether they say one thing: come in.',
    image: 'arrival_call', duration: 4000,
  });
  add({
    text: context?.houseComplete === true
      ? 'Every room you built is lit.\nEveryone who lives here is watching from the doors and windows, waiting.'
      : context?.houseComplete === false
        ? 'The rooms you built are lit. Beyond them, the unbuilt ones stand open to the night.\nYour friends wait in their doorways.'
        : 'The rooms you built are lit.\nYour friends wait in their doorways.',
    image: 'arrival_house', duration: 4000,
  });
  if (met.has('wombat')) {
    add({ text: '"Let the beams flex. A house that can\'t give will crack."', speaker: 'wombat', image: 'arrival_house', imageFraming: 'detail', duration: 3000 });
  }
  add({
    text: met.has('kakapo')
      ? 'Above the roof, the sky splits along one straight line, like a seam coming undone.\nOn the roof, Moss holds the breath he has saved all his life.'
      : 'Above the roof, the sky splits along one straight line, like a seam coming undone.',
    image: 'arrival_seam', duration: 4000,
  });
  add({
    text: 'Something enormous comes down through the gap. Under the floor it always felt like warmth.\nUp close it is smoke, and horns, and a grin full of teeth. It has waited a very long time to be let in.',
    image: 'arrival_descent', effect: 'descend', duration: 5000,
  });
  add({ text: 'It settles over the house and closes its hands around the walls.\nNot to crush them. To hold them, the way you hold something you are afraid to lose.', image: 'arrival_hold', duration: 4000 });
  if (met.has('fennec_fox')) {
    add({ text: '"The small sounds are still here. The kettle. The floorboards. Keep them here."', speaker: 'fennec_fox', image: 'arrival_hold', imageFraming: 'detail', duration: 3500 });
  }
  add({
    text: 'It moves through every room, warming and straightening as it goes.\nCrooked frames hang true. A chipped cup is whole again. A half-written page finishes itself.',
    image: 'arrival_rooms', duration: 5000,
  });
  if (context?.keptRecord && met.has('capybara')) {
    add({ text: '"The corrected copy can sit beside the original. It can\'t replace it."', speaker: 'capybara', image: 'arrival_rooms', imageFraming: 'detail', duration: 3500 });
  } else if (context?.keptPromise && met.has('rabbit')) {
    add({ text: '"My seed tin stays in my pocket. It\'s still mine."', speaker: 'rabbit', image: 'arrival_gate', imageFraming: 'detail', duration: 3000 });
  }
  if (context?.boundary === 'remember') {
    add({
      text: context.keptRecord && met.has('capybara')
        ? 'Your last word was CLOSED: one room it can never enter. It reaches that room, and stops.\nIt presses against the door. The door holds. Inside, I AM AFRAID is still written in Chill\'s own hand.'
        : 'Your last word was CLOSED: one room it can never enter. It reaches that room, and stops.\nIt presses against the door. The door holds. Inside, every thought stays exactly as its owner left it.',
      image: 'arrival_door', duration: 5000,
    });
  } else if (context?.boundary === 'release') {
    add({
      text: 'Your last word was CLOSER: one road out it can never close. It reaches the front door, and stops.\nIt draws back from the gate and leaves the road open. Anyone can leave. Anyone can come back.',
      image: 'arrival_gate', duration: 5000,
    });
  } else {
    add({ text: 'In the end it stops at the front door, and goes no further.\nIt does not say why.', image: 'arrival_door', duration: 4000 });
  }
  // Ember stands by the boundary the player chose, not back at the table.
  const emberImage: PhaseScene['image'] = context?.boundary === 'release' ? 'arrival_gate' : 'arrival_door';
  if (met.has('fox')) {
    if (context?.standBeside === true) {
      add({ text: '"I\'m right here. I said I\'d tell you when I don\'t know something. I don\'t know what happens now."', speaker: 'fox', image: emberImage, imageFraming: 'detail', duration: 4000 });
    } else if (context?.standBeside === false) {
      add({ text: 'Ember stays by the hearth, at the distance you asked for.\nShe does not come closer, even now.', image: 'arrival_rooms', imageFraming: 'detail', duration: 3500 });
    } else {
      add({ text: '"I wanted us safe. I didn\'t know it would try to stop us from changing."', speaker: 'fox', image: emberImage, imageFraming: 'detail', duration: 3500 });
    }
  }
  if (met.has('aye_aye')) {
    add({
      text: met.has('kakapo')
        ? 'Tock rings the bell once.\nFrom the roof, Moss answers with one low boom, in his own voice.'
        : 'Tock rings the bell once. The sound carries a long way.',
      image: 'arrival_bell', cue: 'bell', duration: 3500,
    });
  } else if (met.has('kakapo')) {
    add({ text: 'From the roof, Moss answers with one low boom, in his own voice.', image: 'arrival_seam', imageFraming: 'detail', cue: 'answer', duration: 3000 });
  }
  add({
    text: 'The seam in the sky closes. The thing that came through does not leave.\nIt settles around the house like fog, and closes its eyes.',
    image: 'arrival_settle', duration: 4000,
  });
  add({ text: 'Somewhere inside, a cup of tea goes cold.\nNothing warms it back up without asking.', image: 'arrival_table', imageFraming: 'detail', duration: 3500 });
  return { ...ARRIVAL_STYLE, scenes: timeScenes(scenes) };
}

/** The legacy, context-free Arrival (tests and old snapshots). */
export const FINAL_PUZZLE_EVENT: PhaseTransitionEvent = buildFinalPuzzleEvent([]);

// ============================================================================
// POST-REVELATION EVENT
// ============================================================================

/**
 * The Morning After. It now plays straight after the Arrival (acknowledging
 * the Arrival marks post-revelation, see acknowledgeCeremony) instead of
 * waiting for the player to win one more ordinary board, which left the
 * story hanging on a routine puzzle at its most important moment. The
 * presence is painted into every frame, so no separate backdrop floats over
 * the art.
 */
export function buildPostRevelationEvent(context?: FinalArrivalContext): PhaseTransitionEvent {
  const boundary = context?.boundary ?? null;
  const scenes: PhaseScene[] = [
    { text: 'Morning. It is still here.\nIt lies curled around the house like fog that will not lift, its eyes closed.', image: 'morning_house', imageOpacity: 1, delay: 0, duration: 3500 },
    boundary === 'remember'
      ? { text: context?.keptRecord
          ? 'The private room is still shut.\nBehind the door, I AM AFRAID is still on the page. Nobody has corrected it.'
          : 'The private room is still shut.\nWhatever anyone thinks in there stays their own.', image: 'morning_door', imageOpacity: 1, delay: 0, duration: 3500 }
      : boundary === 'release'
        ? { text: 'Someone walks down the road at first light. Nothing stops them.\nLater, they walk back. That was their choice too.', image: 'morning_road', imageOpacity: 1, delay: 0, duration: 3500 }
        : { text: 'The front door opens.\nThe road outside is still there.', image: 'morning_road', imageOpacity: 1, delay: 0, duration: 3000 },
    { text: 'In the kitchen, somebody burns the toast. For a moment everyone waits to see if it will fix itself.\nIt does not.', image: 'morning_kitchen', imageOpacity: 1, delay: 0, duration: 3500 },
    { text: 'Some of your friends are angry. Some are relieved. Some have not said anything yet.\nFor once, nobody tells them they should all feel the same.', image: 'morning_table', imageOpacity: 1, delay: 0, duration: 4000 },
    { text: 'The letters still move. The words still shift. The house still wants your words.\nThe difference is that now you know who is listening.', image: 'morning_window', imageOpacity: 1, delay: 0, duration: 4000 },
  ];
  return {
    readAtOwnPace: true,
    phase: 4,
    title: 'The Morning After',
    bgColor: '#0A0510',
    textColor: '#8A7A9A',
    accentColor: '#4A3060',
    particles: { count: 10, color: '#4A3060', direction: 'drift', speed: 5, size: 4, opacity: 0.15 },
    vignette: true,
    scenes: timeScenes(scenes),
  };
}

/** The legacy, context-free Morning After. */
export const POST_REVELATION_EVENT: PhaseTransitionEvent = buildPostRevelationEvent();

// ============================================================================
// NEW CYCLE (NG+) CEREMONY
// ============================================================================

/**
 * The re-descent ceremony played when the player chooses to begin a New Cycle
 * from the true endgame. It is a Phase-5 milestone, so it stays in the
 * terrible-peace register and mirrors POST_REVELATION_EVENT's structure:
 * familiar rooms and roads with the settled, low-opacity presence. Nothing descends,
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
      image: 'kept_table',
      imageOpacity: 1,
      imageFraming: 'detail',
      delay: 0,
      duration: 3500,
      effect: 'pulse',
      effectIntensity: 0.25,
    },
    {
      text: 'The rooms you raised and the friends you invited remain.\nThe robes are folded away. Nobody remembers wearing them.',
      image: 'private_room',
      imageOpacity: 1,
      delay: 3700,
      duration: 3500,
    },
    {
      text: 'Beneath the stillness, a bright morning is already waking.',
      image: 'outward_road',
      imageOpacity: 1,
      delay: 7400,
      duration: 3500,
    },
    {
      text: 'Your friends will greet you as if for the first time.\nOne small boundary may be older than the morning.',
      image: 'private_room',
      imageOpacity: 1,
      imageFraming: 'detail',
      delay: 11100,
      duration: 3500,
    },
    {
      text: 'Begin again.',
      image: 'outward_road',
      imageOpacity: 1,
      imageFraming: 'detail',
      delay: 14800,
      duration: 3000,
    },
  ],
};
