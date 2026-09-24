/**
 * Guards for the endgame cinematics (finale-staging wave):
 *  - Emoji left phaseEvents entirely: the arrival is IN-ENGINE art
 *    (shadow_figure / roof assets via PhaseScene.image), never a 48px glyph.
 *  - FINAL_PUZZLE_EVENT has one painting per beat and the creature (painted
 *    from the in-game entity) DESCENDS once (effect 'descend').
 *  - HOUSE_COMPLETION_EVENT shows the house + a faint waiting glimpse of the
 *    entity — present, NOT descending (the arrival belongs to the finale).
 *  - POST_REVELATION_EVENT (the Morning After) is morning paintings with the
 *    settled presence inside them; nothing descends.
 *  - Total finale length stays in the ~30s band (at the overlay's shipped
 *    1.25x time scale).
 */

type OverlayEffect = () => void | (() => void);
let mockOverlayLifecycle: {
  state: (initial: unknown) => unknown[];
  ref: (initial: unknown) => { current: unknown };
  effect: (effect: OverlayEffect, deps?: readonly unknown[], layout?: boolean) => void;
} | null = null;

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    default: actual,
    useEffect: (effect: OverlayEffect, deps?: readonly unknown[]) => mockOverlayLifecycle?.effect(effect, deps),
    useLayoutEffect: (effect: OverlayEffect, deps?: readonly unknown[]) => mockOverlayLifecycle?.effect(effect, deps, true),
    useRef: (initial: unknown) => mockOverlayLifecycle?.ref(initial) ?? { current: initial },
    useState: (initial: unknown) => mockOverlayLifecycle?.state(initial) ?? [typeof initial === 'function' ? (initial as () => unknown)() : initial, jest.fn()],
  };
});

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  TouchableOpacity: 'TouchableOpacity',
  Image: 'Image',
  ScrollView: 'ScrollView',
  AppState: { currentState: 'active', addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  useWindowDimensions: () => ({ width: 400, height: 800 }),
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  StyleSheet: {
    absoluteFill: { position: 'absolute' },
    create: (styles: unknown) => styles,
  },
  Animated: {
    View: 'AnimatedView',
    Value: jest.fn().mockImplementation((value: number) => ({
      value,
      setValue: jest.fn(),
      stopAnimation: jest.fn(),
    })),
    timing: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    parallel: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    sequence: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    delay: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    loop: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
  },
}));

jest.mock('../services/settings', () => ({
  getSettingsSync: () => ({ reducedMotion: true }),
  subscribeSettings: () => jest.fn(),
}));
jest.mock('../services/uiSound', () => ({
  createCeremonySoundScope: jest.fn(() => ({ play: jest.fn(), stop: jest.fn() })),
  stopCeremonyMusic: jest.fn(),
}));
jest.mock('../services/a11yAnnounce', () => ({ announceForA11y: jest.fn() }));
jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn() }));
jest.mock('../services/haptics', () => ({
  hapticLight: jest.fn(),
  hapticMedium: jest.fn(),
  hapticHeavy: jest.fn(),
  hapticWarning: jest.fn(),
}));
jest.mock('../theme/fonts', () => ({ BODY_FONT: 'Body', BODY_FONT_BOLD: 'BodyBold', PIXEL_FONT_BOLD: 'PixelBold' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, right: 0, bottom: 20, left: 0 }),
}));
jest.mock('../components/home/AnimalSprite', () => ({ CHARACTER_SPRITES: {} }));
jest.mock('../services/storyArchive', () => ({ getStorySpeakerName: (speaker: string) => speaker }));
jest.mock('../theme/colors', () => ({
  getPhaseTheme: () => ({ vignetteColor: '#000000' }),
}));

import {
  getPhaseTransitionEvent,
  getEventDuration,
  HOUSE_COMPLETION_EVENT,
  buildHouseCompletionEvent,
  FINAL_PUZZLE_EVENT,
  buildFinalPuzzleEvent,
  buildPostRevelationEvent,
  POST_REVELATION_EVENT,
  NEW_CYCLE_EVENT,
  PhaseTransitionEvent,
} from '../services/phaseEvents';
import { getWordPhaseTier } from '../services/localGenerator';
import { DialoguePhase } from '../types/homeWorld';
import { PhaseTransitionOverlay } from '../components/PhaseTransitionOverlay';
import { createCeremonySoundScope } from '../services/uiSound';
import { announceForA11y } from '../services/a11yAnnounce';
import { hapticLight } from '../services/haptics';

const ALL_EVENTS: PhaseTransitionEvent[] = [
  ...([1, 2, 3, 4] as DialoguePhase[]).map(p => getPhaseTransitionEvent(p)!),
  HOUSE_COMPLETION_EVENT,
  FINAL_PUZZLE_EVENT,
  POST_REVELATION_EVENT,
  NEW_CYCLE_EVENT,
];

describe('illustrated phase transitions', () => {
  const phaseBoundaries = [
    ...([1, 2, 3, 4] as DialoguePhase[]).map(phase => getPhaseTransitionEvent(phase)!),
    POST_REVELATION_EVENT,
  ];

  test.each(phaseBoundaries.map(event => [event.title, event] as const))(
    '%s has visible artwork on every page',
    (_title, event) => {
      for (const scene of event.scenes) {
        // The former blank pages had neither image nor meaningful backdrop.
        // Require an explicit illustrated subject for every authored passage.
        expect(scene.image).toBeDefined();
        expect(scene.imageOpacity).toBeGreaterThanOrEqual(0.6);
      }
      // A transition should move between places, not repeat a single icon.
      expect(new Set(event.scenes.map(scene => scene.image)).size).toBeGreaterThan(1);
    },
  );

  test('ordinary transitions never reveal the entity before the finale', () => {
    for (const event of phaseBoundaries.slice(0, 4)) {
      expect(event.backdrop?.image).not.toBe('shadow_figure');
      for (const scene of event.scenes) {
        expect(scene.image).not.toBe('shadow_figure');
        expect(scene.effect).not.toBe('descend');
      }
    }
  });

  test('special ceremonies and personalized endings also have art on every page', () => {
    const variants = [
      ...ALL_EVENTS,
      buildFinalPuzzleEvent([], { houseComplete: false, unlockedAnimals: [] }),
      buildFinalPuzzleEvent([], { boundary: 'remember', keptRecord: true, unlockedAnimals: ['fox', 'capybara'] }),
      buildFinalPuzzleEvent([], { boundary: 'release', keptPromise: true, unlockedAnimals: ['rabbit'] }),
      buildPostRevelationEvent({ boundary: 'remember', keptRecord: true }),
      buildPostRevelationEvent({ boundary: 'release' }),
    ];
    for (const event of variants) {
      for (const scene of event.scenes) {
        expect(scene.image).toBeDefined();
        expect(scene.imageOpacity).toBeGreaterThan(0);
      }
    }
  });
});

type ElementLike = { props?: { children?: unknown; accessibilityLabel?: string } };

type NodeLike = {
  type?: unknown;
  props?: {
    children?: unknown;
    onPress?: unknown;
    accessibilityRole?: unknown;
    accessibilityLabel?: unknown;
    accessibilityHint?: unknown;
  };
};

/** First control with the given accessible label, or null. */
function findByLabel(node: unknown, label: string): NodeLike | null {
  if (node == null || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByLabel(child, label);
      if (found) return found;
    }
    return null;
  }
  const element = node as NodeLike;
  if (element.props?.accessibilityLabel === label) return element;
  return findByLabel(element.props?.children, label);
}

function collectText(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (node == null || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(collectText);
  return collectText((node as ElementLike).props?.children);
}

/**
 * Drives PhaseTransitionOverlay through the hand-rolled hook lifecycle above:
 * `render()` re-renders until the component's own state settles, committing
 * layout effects before passive ones and running each effect's cleanup before
 * a changed effect starts. `dispose()` releases the lifecycle mock.
 */
function createOverlayHarness(event: PhaseTransitionEvent, onComplete: () => void) {
  const values = new Map<number, unknown>();
  const previousEffects = new Map<number, { deps?: readonly unknown[]; cleanup?: () => void }>();
  let pendingEffects: { index: number; effect: OverlayEffect; deps?: readonly unknown[]; layout: boolean }[] = [];
  let cursor = 0;
  let changed = false;
  mockOverlayLifecycle = {
    state(initial) {
      const index = cursor++;
      if (!values.has(index)) values.set(index, typeof initial === 'function' ? initial() : initial);
      return [values.get(index), (update: unknown) => {
        const previous = values.get(index);
        const next = typeof update === 'function' ? update(previous) : update;
        changed ||= !Object.is(previous, next);
        values.set(index, next);
      }];
    },
    ref(initial) {
      const index = cursor++;
      if (!values.has(index)) values.set(index, { current: initial });
      return values.get(index) as { current: unknown };
    },
    effect(effect, deps, layout = false) {
      const index = cursor++;
      const previous = previousEffects.get(index);
      if (!previous || !deps || deps.length !== previous.deps?.length || deps.some((value, i) => !Object.is(value, previous.deps?.[i]))) {
        pendingEffects.push({ index, effect, deps, layout });
      }
    },
  };
  const render = (suspended = false) => {
    let tree: unknown;
    let renders = 0;
    do {
      cursor = 0;
      changed = false;
      pendingEffects = [];
      tree = PhaseTransitionOverlay({ event, suspended, onComplete });
      // Commit layout effects before passive effects, keeping hook identities
      // across renders and running cleanup before a changed effect starts.
      for (const pending of pendingEffects.sort((a, b) => Number(b.layout) - Number(a.layout))) {
        previousEffects.get(pending.index)?.cleanup?.();
        previousEffects.set(pending.index, { deps: pending.deps, cleanup: pending.effect() || undefined });
      }
      if (++renders > 10) throw new Error('Ceremony did not settle its state');
    } while (changed);
    return tree;
  };
  const dispose = () => {
    previousEffects.forEach(effect => effect.cleanup?.());
    mockOverlayLifecycle = null;
  };
  return { render, dispose };
}

test('a suspended ceremony keeps its page and resumes without replaying delivered cues', () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  const event: PhaseTransitionEvent = {
    ...HOUSE_COMPLETION_EVENT,
    readAtOwnPace: false,
    scenes: [
      { text: 'The first page waits.', delay: 0, duration: 1000, effect: 'fade', cue: 'bell' },
      { text: 'The next page answers.', delay: 1000, duration: 1000, effect: 'fade', cue: 'answer' },
    ],
  };
  const onComplete = jest.fn();
  const { render, dispose } = createOverlayHarness(event, onComplete);
  try {
    render();
    jest.advanceTimersByTime(0);
    expect(collectText(render())).toContain('The first page waits.');
    const firstScope = jest.mocked(createCeremonySoundScope).mock.results[0].value;
    expect(firstScope.play).toHaveBeenCalledTimes(1);
    expect(firstScope.play).toHaveBeenCalledWith('story_bell');
    expect(hapticLight).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(600);
    expect(render(true)).toBeNull();
    expect(firstScope.stop).toHaveBeenCalled();
    jest.advanceTimersByTime(5000);
    expect(render(true)).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();

    expect(collectText(render())).toContain('The first page waits.');
    expect(firstScope.play).toHaveBeenCalledTimes(1);
    expect(hapticLight).toHaveBeenCalledTimes(1);
    expect(jest.mocked(announceForA11y).mock.calls.filter(([text]) => text === 'The first page waits.')).toHaveLength(1);
    const resumedScope = jest.mocked(createCeremonySoundScope).mock.results[1].value;
    expect(resumedScope.play).not.toHaveBeenCalled();

    jest.advanceTimersByTime(60_000);
    expect(collectText(render())).toContain('The first page waits.');
    (findByLabel(render(), 'Continue the scene')!.props!.onPress as () => void)();
    expect(collectText(render())).toContain('The next page answers.');
    expect(resumedScope.play).toHaveBeenCalledTimes(1);
    expect(resumedScope.play).toHaveBeenCalledWith('story_answer');
  } finally {
    dispose();
    jest.useRealTimers();
  }
});

test('Back and Continue allow rereading without replaying ceremony sound or haptic cues', () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  const event: PhaseTransitionEvent = {
    ...HOUSE_COMPLETION_EVENT,
    readAtOwnPace: false,
    scenes: [
      { text: 'The first page waits.', delay: 0, duration: 1000, effect: 'fade', cue: 'bell' },
      { text: 'The next page answers.', delay: 1000, duration: 1000, effect: 'fade', cue: 'answer' },
    ],
  };
  const onComplete = jest.fn();
  const { render, dispose } = createOverlayHarness(event, onComplete);
  try {
    render();
    jest.advanceTimersByTime(0);
    render();
    const scope = jest.mocked(createCeremonySoundScope).mock.results[0].value;
    expect(scope.play).toHaveBeenCalledWith('story_bell');
    (findByLabel(render(), 'Continue the scene')!.props!.onPress as () => void)();
    jest.advanceTimersByTime(350);
    expect(collectText(render())).toContain('The next page answers.');
    expect(scope.play).toHaveBeenCalledWith('story_answer');
    expect(scope.play).toHaveBeenCalledTimes(2);
    expect(hapticLight).toHaveBeenCalledTimes(2);

    (findByLabel(render(), 'Previous passage')!.props!.onPress as () => void)();
    jest.advanceTimersByTime(350);
    expect(collectText(render())).toContain('The first page waits.');
    expect(jest.mocked(announceForA11y).mock.calls.filter(([text]) => text === 'The first page waits.')).toHaveLength(2);
    (findByLabel(render(), 'Continue the scene')!.props!.onPress as () => void)();
    jest.advanceTimersByTime(350);
    expect(collectText(render())).toContain('The next page answers.');
    expect(scope.play).toHaveBeenCalledTimes(2);
    expect(hapticLight).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(60_000);
    expect(onComplete).not.toHaveBeenCalled();
    (findByLabel(render(), 'Finish the scene')!.props!.onPress as () => void)();
    expect(onComplete).toHaveBeenCalledTimes(1);
  } finally {
    dispose();
    jest.useRealTimers();
  }
});

describe('ordinary transition title subtlety', () => {
  const ordinaryEvents = ([1, 2, 3, 4] as DialoguePhase[])
    .map(phase => getPhaseTransitionEvent(phase)!);
  const titledEvents = [HOUSE_COMPLETION_EVENT, FINAL_PUZZLE_EVENT, POST_REVELATION_EVENT];

  test('only ordinary phase transitions suppress their title', () => {
    for (const event of ordinaryEvents) {
      expect(event.showTitle).toBe(false);
    }
    for (const event of titledEvents) {
      expect(event.showTitle).not.toBe(false);
    }
  });

  test('the overlay omits suppressed titles but keeps special-event titles', () => {
    for (const event of ordinaryEvents) {
      const tree = PhaseTransitionOverlay({ event, onComplete: jest.fn() });
      expect(collectText(tree)).not.toContain(event.title);
    }
    for (const event of titledEvents) {
      const tree = PhaseTransitionOverlay({ event, onComplete: jest.fn() });
      expect(collectText(tree)).toContain(event.title);
    }
  });

  test('accessibility announces visible content, never a suppressed title', () => {
    for (const event of ordinaryEvents) {
      const tree = PhaseTransitionOverlay({ event, onComplete: jest.fn() }) as ElementLike;
      expect(tree.props?.accessibilityLabel).toBe('A moment in the house');
      expect(tree.props?.accessibilityLabel).not.toContain(event.title);
    }
    for (const event of titledEvents) {
      const tree = PhaseTransitionOverlay({ event, onComplete: jest.fn() }) as ElementLike;
      expect(tree.props?.accessibilityLabel).toBe(event.title);
    }
  });
});

describe('emoji has left phaseEvents', () => {
  test('no scene carries an emoji property (in-engine art only)', () => {
    for (const event of ALL_EVENTS) {
      for (const scene of event.scenes) {
        expect(scene).not.toHaveProperty('emoji');
      }
    }
  });

  test('no scene text contains emoji characters', () => {
    // Surrogate pairs + common symbol/pictograph planes.
    const emojiLike = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    for (const event of ALL_EVENTS) {
      expect(emojiLike.test(event.title)).toBe(false);
      for (const scene of event.scenes) {
        expect(emojiLike.test(scene.text)).toBe(false);
      }
    }
  });
});

describe('FINAL_PUZZLE_EVENT — the in-engine arrival', () => {
  const ALL = ['fox', 'wombat', 'fennec_fox', 'capybara', 'rabbit', 'aye_aye', 'kakapo'];
  test('the creature descends once, in its own painting', () => {
    const descend = FINAL_PUZZLE_EVENT.scenes.filter(s => s.effect === 'descend');
    expect(descend).toHaveLength(1);
    expect(descend[0].image).toBe('arrival_descent');
    expect(descend[0].duration).toBeGreaterThanOrEqual(4000);
  });

  test('every page has its own Arrival painting, never the old blurred shadow or the roof sprite', () => {
    for (const event of [FINAL_PUZZLE_EVENT, buildFinalPuzzleEvent(['VOID', 'TOMB'], { houseComplete: true, unlockedAnimals: ALL, boundary: 'remember', keptRecord: true, standBeside: true })]) {
      for (const scene of event.scenes) {
        expect(scene.image).toMatch(/^arrival_/);
      }
    }
  });

  test('the house, the call and the seam come before the descent; the settling comes last', () => {
    const images = FINAL_PUZZLE_EVENT.scenes.map(s => s.image);
    const descent = images.indexOf('arrival_descent');
    for (const before of ['arrival_table', 'arrival_call', 'arrival_house', 'arrival_seam']) {
      expect(images.indexOf(before as never)).toBeLessThan(descent);
    }
    // The creature settles, then one last small thing: the cup of tea going cold.
    expect(images[images.length - 2]).toBe('arrival_settle');
    expect(FINAL_PUZZLE_EVENT.scenes[FINAL_PUZZLE_EVENT.scenes.length - 1].text).toMatch(/goes cold/);
    expect(FINAL_PUZZLE_EVENT.scenes[FINAL_PUZZLE_EVENT.scenes.length - 1].effect).not.toBe('descend');
  });

  test('important endings are read at the player pace with a full authored timing budget', () => {
    for (const event of [FINAL_PUZZLE_EVENT, POST_REVELATION_EVENT, NEW_CYCLE_EVENT]) {
      expect(event.readAtOwnPace).toBe(true);
      expect(getEventDuration(event)).toBeGreaterThan(0);
    }
    expect(getEventDuration(FINAL_PUZZLE_EVENT) * 1.25).toBeGreaterThan(40000);
  });

  test('a speaker is attributed only on a page that is purely their quoted words', () => {
    const event = buildFinalPuzzleEvent([], { houseComplete: true, unlockedAnimals: ALL, boundary: 'release', keptRecord: true, standBeside: true });
    const spoken = event.scenes.filter(scene => scene.speaker);
    expect(spoken.length).toBeGreaterThan(0);
    for (const scene of spoken) expect(scene.text).toMatch(/^".*"$/s);
    // Narration never carries a name badge, bell and boom included.
    for (const scene of event.scenes.filter(scene => !scene.speaker)) expect(scene.text.startsWith('"')).toBe(false);
    expect(event.scenes.find(scene => scene.cue === 'bell')?.speaker).toBeUndefined();
  });
});

describe('buildFinalPuzzleEvent — the personalized Arrival', () => {
  test('names the player deepest ritual words in the call', () => {
    const dread = ['void', 'tomb', 'grave'].filter(w => getWordPhaseTier(w.toUpperCase()) >= 2);
    expect(dread.length).toBeGreaterThanOrEqual(2);
    const event = buildFinalPuzzleEvent(['apple', ...dread, 'sunny']);
    const line = event.scenes.find(scene => scene.image === 'arrival_call')!.text;
    for (const w of dread) expect(line).toContain(w.toUpperCase());
    expect(line).toContain('come in');
    expect(line).not.toMatch(/[–—]/);
    expect(event.scenes.filter(s => s.effect === 'descend')).toHaveLength(1);
    expect(event.scenes.length).toBe(FINAL_PUZZLE_EVENT.scenes.length);
  });

  test('never mutates the shared FINAL_PUZZLE_EVENT constant', () => {
    const before = JSON.stringify(FINAL_PUZZLE_EVENT);
    buildFinalPuzzleEvent(['VOID', 'TOMB', 'GRAVE', 'ABYSS'], { unlockedAnimals: ['fox', 'wombat'], boundary: 'remember' });
    expect(JSON.stringify(FINAL_PUZZLE_EVENT)).toBe(before);
  });
});

describe('HOUSE_COMPLETION_EVENT — the temple ceremony', () => {
  test('opens on the house the player built', () => {
    expect(HOUSE_COMPLETION_EVENT.scenes[0].image).toBe('house');
  });

  test('closes on a faint waiting glimpse of the entity, never a descent', () => {
    const last = HOUSE_COMPLETION_EVENT.scenes[HOUSE_COMPLETION_EVENT.scenes.length - 1];
    expect(last.image).toBe('shadow_figure');
    // A glimpse: faint, and NOT the arrival — descend is reserved for the finale.
    expect(last.imageOpacity ?? 0.6).toBeLessThanOrEqual(0.3);
    for (const scene of HOUSE_COMPLETION_EVENT.scenes) {
      expect(scene.effect).not.toBe('descend');
    }
  });

  // The finale arms on a real-solve floor independent of the build, so the
  // house can be finished AFTER the Arrival (buy Sky Garden and Moss in Phase
  // 5). The static ceremony anticipates a waiting presence; the built variant
  // must not, once it has descended and settled.
  describe('buildHouseCompletionEvent (narrative-1)', () => {
    test('without context, or before the Arrival, returns the authored constant untouched', () => {
      expect(buildHouseCompletionEvent()).toBe(HOUSE_COMPLETION_EVENT);
      expect(buildHouseCompletionEvent({ arrived: false })).toBe(HOUSE_COMPLETION_EVENT);
      expect(buildHouseCompletionEvent({ houseComplete: true, boundary: 'remember' })).toBe(HOUSE_COMPLETION_EVENT);
    });

    test('after the Arrival, Ember stops promising the reveal and the shadow stops waiting', () => {
      const event = buildHouseCompletionEvent({ arrived: true });
      const texts = event.scenes.map(scene => scene.text).join('\n');
      expect(texts).not.toContain('I owe you the rest of what I knew');
      expect(texts).not.toContain('ready to receive');
      expect(texts).not.toContain('remains unanswered');
      expect(event.scenes[3].text).toContain('after you learned what I knew');
      expect(event.scenes[4].text).toContain('already here to see it finished');
      // The settled presence at After's opacity: present, never a descent.
      const last = event.scenes[event.scenes.length - 1];
      expect(last.image).toBe('shadow_figure');
      expect(last.imageOpacity).toBe(0.14);
      for (const scene of event.scenes) expect(scene.effect).not.toBe('descend');
      // Same length and choreography: only the two contradicting scenes change.
      expect(event.scenes).toHaveLength(HOUSE_COMPLETION_EVENT.scenes.length);
      expect(event.scenes.slice(0, 3)).toEqual(HOUSE_COMPLETION_EVENT.scenes.slice(0, 3));
    });

    test('never mutates the shared HOUSE_COMPLETION_EVENT constant', () => {
      const before = HOUSE_COMPLETION_EVENT.scenes.map(scene => ({ ...scene }));
      buildHouseCompletionEvent({ arrived: true });
      expect(HOUSE_COMPLETION_EVENT.scenes).toEqual(before);
    });
  });
});

describe('POST_REVELATION_EVENT — the Morning After', () => {
  test('every page is a morning painting with the settled presence in it, and nothing descends', () => {
    expect(POST_REVELATION_EVENT.title).toBe('The Morning After');
    for (const scene of POST_REVELATION_EVENT.scenes) {
      expect(scene.image).toMatch(/^morning_/);
      expect(scene.effect).not.toBe('descend');
      expect(scene.speaker).toBeUndefined();
    }
  });
});

describe('NEW_CYCLE_EVENT — the serene re-descent', () => {
  test('returns to familiar rooms and morning over the settled backdrop, without another arrival', () => {
    // A Phase-5 milestone ceremony, mirroring POST_REVELATION_EVENT's shape.
    expect(NEW_CYCLE_EVENT.phase).toBe(5);
    expect(NEW_CYCLE_EVENT.backdrop).toBeDefined();
    expect(NEW_CYCLE_EVENT.backdrop!.image).toBe('shadow_figure');
    expect(NEW_CYCLE_EVENT.backdrop!.opacity).toBeLessThanOrEqual(0.2);
    for (const scene of NEW_CYCLE_EVENT.scenes) {
      // Nothing descends; the settled presence accompanies ordinary life.
      expect(scene.image).toBeDefined();
      expect(scene.image).not.toBe('shadow_figure');
      expect(scene.effect).not.toBe('descend');
    }
    expect(NEW_CYCLE_EVENT.scenes.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Arrival remembers the actual household and decisions', () => {
  const texts = (event: { scenes: { text: string }[] }) => event.scenes.map(scene => scene.text).join('\n');

  test('an unfinished house stays unfinished and unseen animals never appear', () => {
    const event = buildFinalPuzzleEvent([], { houseComplete: false, unlockedAnimals: [] });
    expect(event.scenes.find(scene => scene.image === 'arrival_house')!.text).toMatch(/unbuilt/);
    expect(event.scenes.every(scene => !scene.speaker)).toBe(true);
    expect(texts(event)).not.toMatch(/Ember|Warren|Tock|Moss|Thyme|Chill|Fennick/);
  });

  test('a complete household: everyone waits, and Warren speaks his own page', () => {
    const event = buildFinalPuzzleEvent([], { houseComplete: true, unlockedAnimals: ['fox', 'wombat'] });
    expect(event.scenes.find(scene => scene.image === 'arrival_house' && !scene.speaker)!.text).toMatch(/Everyone who lives here/);
    const warren = event.scenes.find(scene => scene.speaker === 'wombat')!;
    expect(warren.text).toMatch(/beams flex/);
  });

  test('CLOSED and CLOSER show different enacted boundaries and paintings', () => {
    const closed = buildFinalPuzzleEvent([], { boundary: 'remember', unlockedAnimals: ['fox'] });
    const closer = buildFinalPuzzleEvent([], { boundary: 'release', unlockedAnimals: ['fox'] });
    // The page names the choice outright: a first-time reader needs the setup.
    const door = closed.scenes.find(scene => scene.text.startsWith('Your last word was CLOSED'))!;
    const gate = closer.scenes.find(scene => scene.text.startsWith('Your last word was CLOSER'))!;
    expect(door.text).toMatch(/one room it can never enter/);
    expect(door.image).toBe('arrival_door');
    expect(gate.text).toMatch(/road open/);
    expect(gate.image).toBe('arrival_gate');
    expect(closed.scenes.filter(scene => scene.effect === 'descend')).toHaveLength(1);
  });

  test('the bell rings only if Tock lives here, and Moss answers only if he does', () => {
    const withTock = buildFinalPuzzleEvent([], { boundary: 'remember', unlockedAnimals: ['aye_aye', 'kakapo'] });
    const withoutTock = buildFinalPuzzleEvent([], { boundary: 'remember', unlockedAnimals: ['kakapo'] });
    const withoutEither = buildFinalPuzzleEvent([], { boundary: 'remember', unlockedAnimals: [] });
    expect(withTock.scenes.filter(scene => scene.cue === 'bell')).toHaveLength(1);
    expect(withTock.scenes.find(scene => scene.cue === 'bell')!.text).toMatch(/Moss answers/);
    expect(withTock.scenes.some(scene => scene.cue === 'answer')).toBe(false);
    expect(withoutTock.scenes.filter(scene => scene.cue === 'answer')).toHaveLength(1);
    expect(withoutEither.scenes.some(scene => scene.cue)).toBe(false);
  });

  test('a kept record and the seed tin come back in their owners\' own words', () => {
    const record = buildFinalPuzzleEvent([], { keptRecord: true, boundary: 'remember', unlockedAnimals: ['capybara'] });
    expect(record.scenes.find(scene => scene.speaker === 'capybara')!.text).toMatch(/original/);
    expect(texts(record)).toMatch(/I AM AFRAID/);
    const seeds = buildFinalPuzzleEvent([], { keptPromise: true, unlockedAnimals: ['rabbit'] });
    expect(seeds.scenes.find(scene => scene.speaker === 'rabbit')!.text).toMatch(/seed tin/);
  });

  test('Ember keeps the distance the player asked for', () => {
    const beside = buildFinalPuzzleEvent([], { standBeside: true, unlockedAnimals: ['fox'] });
    const apart = buildFinalPuzzleEvent([], { standBeside: false, unlockedAnimals: ['fox'] });
    expect(beside.scenes.find(scene => scene.speaker === 'fox')!.text).toMatch(/right here/);
    expect(texts(apart)).toMatch(/stays by the hearth/);
    expect(apart.scenes.some(scene => scene.speaker === 'fox')).toBe(false);
  });

  test('the Morning After carries each boundary without inventing a page or a choice', () => {
    const none = buildPostRevelationEvent();
    const kept = buildPostRevelationEvent({ boundary: 'remember', keptRecord: true });
    const room = buildPostRevelationEvent({ boundary: 'remember', keptRecord: false });
    const road = buildPostRevelationEvent({ boundary: 'release' });
    expect(texts(none)).not.toMatch(/private room|I AM AFRAID/);
    expect(kept.scenes[1].text).toMatch(/I AM AFRAID/);
    expect(kept.scenes[1].image).toBe('morning_door');
    expect(room.scenes[1].text).not.toMatch(/I AM AFRAID/);
    expect(road.scenes[1].image).toBe('morning_road');
    expect(road.scenes[1].text).toMatch(/road/);
  });
});
