/**
 * Guards for the endgame cinematics (finale-staging wave):
 *  - Emoji left phaseEvents entirely: the arrival is IN-ENGINE art
 *    (shadow_figure / roof assets via PhaseScene.image), never a 48px glyph.
 *  - FINAL_PUZZLE_EVENT renders the entity DESCENDING behind the text
 *    (effect 'descend'), with the house silhouette earlier in the sequence.
 *  - HOUSE_COMPLETION_EVENT shows the house + a faint waiting glimpse of the
 *    entity — present, NOT descending (the arrival belongs to the finale).
 *  - POST_REVELATION_EVENT keeps text-only scenes over a settled low-opacity
 *    shadow backdrop.
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
  TouchableOpacity: 'TouchableOpacity',
  Image: 'Image',
  ScrollView: 'ScrollView',
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
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

type ElementLike = { props?: { children?: unknown; accessibilityLabel?: string } };

function collectText(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (node == null || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(collectText);
  return collectText((node as ElementLike).props?.children);
}

test('a suspended ceremony keeps its page and resumes without replaying delivered cues', () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
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
  const event: PhaseTransitionEvent = {
    ...HOUSE_COMPLETION_EVENT,
    readAtOwnPace: false,
    scenes: [
      { text: 'The first page waits.', delay: 0, duration: 1000, effect: 'fade', cue: 'bell' },
      { text: 'The next page answers.', delay: 1000, duration: 1000, effect: 'fade', cue: 'answer' },
    ],
  };
  const onComplete = jest.fn();
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

    jest.advanceTimersByTime(1249);
    expect(collectText(render())).toContain('The first page waits.');
    jest.advanceTimersByTime(1);
    expect(collectText(render())).toContain('The next page answers.');
    expect(resumedScope.play).toHaveBeenCalledTimes(1);
    expect(resumedScope.play).toHaveBeenCalledWith('story_answer');
  } finally {
    previousEffects.forEach(effect => effect.cleanup?.());
    mockOverlayLifecycle = null;
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
  test('the entity descends behind the text', () => {
    const descend = FINAL_PUZZLE_EVENT.scenes.find(s => s.effect === 'descend');
    expect(descend).toBeDefined();
    expect(descend!.image).toBe('shadow_figure');
    // The descent needs room to breathe.
    expect(descend!.duration).toBeGreaterThanOrEqual(4000);
  });

  test('the temple appears as the house silhouette before the arrival', () => {
    const houseIdx = FINAL_PUZZLE_EVENT.scenes.findIndex(s => s.image === 'house');
    const shadowIdx = FINAL_PUZZLE_EVENT.scenes.findIndex(s => s.image === 'shadow_figure');
    expect(houseIdx).toBeGreaterThanOrEqual(0);
    expect(shadowIdx).toBeGreaterThan(houseIdx);
  });

  test('the settled shadow persists through the closing lines', () => {
    const scenes = FINAL_PUZZLE_EVENT.scenes;
    const lastTwo = scenes.slice(-2);
    for (const scene of lastTwo) {
      expect(scene.image).toBe('shadow_figure');
      // Persisting scenes must NOT re-descend — the arrival happens once.
      expect(scene.effect).not.toBe('descend');
    }
  });

  test('important endings are read at the player pace with a full authored timing budget', () => {
    for (const event of [FINAL_PUZZLE_EVENT, POST_REVELATION_EVENT, NEW_CYCLE_EVENT]) {
      expect(event.readAtOwnPace).toBe(true);
      expect(getEventDuration(event)).toBeGreaterThan(0);
    }
    // Reduced motion removes effects; it must not shorten reading time.
    expect(getEventDuration(FINAL_PUZZLE_EVENT) * 1.25).toBeGreaterThan(40000);
  });

  test('a held breath precedes the descent: the scene before it carries no image', () => {
    const idx = FINAL_PUZZLE_EVENT.scenes.findIndex(s => s.effect === 'descend');
    expect(idx).toBeGreaterThan(0);
    expect(FINAL_PUZZLE_EVENT.scenes[idx - 1].image).toBeUndefined();
  });
});

describe('buildFinalPuzzleEvent — the personalized Arrival', () => {
  test('names the player deepest ritual words in the incantation scene', () => {
    const dread = ['void', 'tomb', 'grave'].filter(
      w => getWordPhaseTier(w.toUpperCase()) >= 2
    );
    expect(dread.length).toBeGreaterThanOrEqual(2); // sanity: real dread words
    const event = buildFinalPuzzleEvent(['apple', ...dread, 'sunny']);
    expect(event).not.toBe(FINAL_PUZZLE_EVENT);
    const line = event.scenes[1].text;
    for (const w of dread) expect(line).toContain(w.toUpperCase());
    expect(line).toContain('incantation');
    expect(line).not.toMatch(/[–—]/);
    // Only the incantation scene changes; the descend choreography and scene
    // count are untouched.
    expect(event.scenes.filter(s => s.effect === 'descend')).toHaveLength(1);
    expect(event.scenes.length).toBe(FINAL_PUZZLE_EVENT.scenes.length);
  });

  test('falls back to the generic event when fewer than two dread words exist', () => {
    expect(buildFinalPuzzleEvent([])).toBe(FINAL_PUZZLE_EVENT);
    expect(buildFinalPuzzleEvent(['SUNNY', 'HAPPY'])).toBe(FINAL_PUZZLE_EVENT);
    expect(buildFinalPuzzleEvent(['VOID'])).toBe(FINAL_PUZZLE_EVENT);
  });

  test('never mutates the shared FINAL_PUZZLE_EVENT constant', () => {
    const before = FINAL_PUZZLE_EVENT.scenes[1].text;
    buildFinalPuzzleEvent(['VOID', 'TOMB', 'GRAVE', 'ABYSS']);
    expect(FINAL_PUZZLE_EVENT.scenes[1].text).toBe(before);
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
});

describe('POST_REVELATION_EVENT — terrible peace', () => {
  test('text-only scenes over the settled shadow backdrop', () => {
    expect(POST_REVELATION_EVENT.backdrop).toBeDefined();
    expect(POST_REVELATION_EVENT.backdrop!.image).toBe('shadow_figure');
    // Settled presence: low, static, constant.
    expect(POST_REVELATION_EVENT.backdrop!.opacity).toBeLessThanOrEqual(0.2);
    for (const scene of POST_REVELATION_EVENT.scenes) {
      expect(scene.image).toBeUndefined();
      expect(scene.effect).not.toBe('descend');
    }
  });
});

describe('NEW_CYCLE_EVENT — the serene re-descent', () => {
  test('stays in the terrible-peace register: text-only over the settled backdrop, no arrival', () => {
    // A Phase-5 milestone ceremony, mirroring POST_REVELATION_EVENT's shape.
    expect(NEW_CYCLE_EVENT.phase).toBe(5);
    expect(NEW_CYCLE_EVENT.backdrop).toBeDefined();
    expect(NEW_CYCLE_EVENT.backdrop!.image).toBe('shadow_figure');
    expect(NEW_CYCLE_EVENT.backdrop!.opacity).toBeLessThanOrEqual(0.2);
    for (const scene of NEW_CYCLE_EVENT.scenes) {
      // Nothing descends, nothing named — the pattern only turns.
      expect(scene.image).toBeUndefined();
      expect(scene.effect).not.toBe('descend');
    }
    expect(NEW_CYCLE_EVENT.scenes.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Arrival remembers the actual household and decisions', () => {
  test('an unfinished house does not become complete and unseen animals do not speak', () => {
    const event = buildFinalPuzzleEvent([], { houseComplete: false, unlockedAnimals: [] });
    expect(event.scenes[2].text).toMatch(/remain unbuilt/);
    expect(event.scenes.every(scene => !scene.speaker)).toBe(true);
    expect(event.scenes.map(scene => scene.text).join(' ')).not.toMatch(/Ember|Warren|Tock|Moss|Thyme|Chill/);
  });

  test('a complete recruited household keeps the old foundation and new bracing distinct', () => {
    const event = buildFinalPuzzleEvent([], { houseComplete: true, unlockedAnimals: ['fox', 'wombat'] });
    expect(event.scenes[2].text).toMatch(/old foundation/);
    expect(event.scenes[2].text).toMatch(/whole household/);
    expect(event.scenes[2].speaker).toBe('wombat');
    expect(event.scenes[2].text).toMatch(/braces the join/);
  });

  test('CLOSED and CLOSER show different enacted boundaries and illustrations', () => {
    const closed = buildFinalPuzzleEvent([], { boundary: 'remember', unlockedAnimals: ['fox'] });
    const closer = buildFinalPuzzleEvent([], { boundary: 'release', unlockedAnimals: ['fox'] });
    expect(closed.scenes[6].text).toMatch(/CLOSED.*private room/s);
    expect(closed.scenes[6].image).toBe('private_room');
    expect(closer.scenes[6].text).toMatch(/CLOSER.*road beyond still leads away/s);
    expect(closer.scenes[6].image).toBe('outward_road_night');
    expect(closed.scenes.filter(scene => scene.effect === 'descend')).toHaveLength(1);
    expect(closer.scenes.filter(scene => scene.effect === 'descend')).toHaveLength(1);
  });

  test('Tock answers once only if he has been recruited', () => {
    const withTock = buildFinalPuzzleEvent([], { boundary: 'remember', unlockedAnimals: ['aye_aye', 'kakapo'] });
    const withoutTock = buildFinalPuzzleEvent([], { boundary: 'remember', unlockedAnimals: ['kakapo'] });
    const withoutEither = buildFinalPuzzleEvent([], { boundary: 'remember', unlockedAnimals: [] });
    const bells = withTock.scenes.filter(scene => scene.cue === 'bell');
    expect(bells).toHaveLength(1);
    expect(bells[0].speaker).toBe('aye_aye');
    expect(withTock.scenes.some(scene => scene.cue === 'answer')).toBe(false);
    expect(withoutTock.scenes.filter(scene => scene.cue === 'answer')).toHaveLength(1);
    expect(withoutTock.scenes.find(scene => scene.cue === 'answer')?.speaker).toBe('kakapo');
    expect(withoutEither.scenes.some(scene => scene.cue)).toBe(false);
  });

  test('kept record and seed confidence refer to the actual chosen objects', () => {
    const record = buildFinalPuzzleEvent([], { keptRecord: true, unlockedAnimals: ['capybara'] });
    expect(record.scenes[4].speaker).toBe('capybara');
    expect(record.scenes[4].text).toMatch(/original page/);
    const seeds = buildFinalPuzzleEvent([], { keptPromise: true, unlockedAnimals: ['rabbit'] });
    expect(seeds.scenes[4].speaker).toBe('rabbit');
    expect(seeds.scenes[4].text).toMatch(/seed tin.*own pocket/s);
  });

  test('Ember keeps the distance the player asked for', () => {
    const beside = buildFinalPuzzleEvent([], { standBeside: true, unlockedAnimals: ['fox'] });
    const apart = buildFinalPuzzleEvent([], { standBeside: false, unlockedAnimals: ['fox'] });
    expect(beside.scenes[7].text).toMatch(/stands beside you/);
    expect(apart.scenes[7].text).toMatch(/stays by the hearth/);
    expect(apart.scenes[7].text).not.toMatch(/stands beside/);
  });

  test('After carries each boundary without inventing an original page or a legacy choice', () => {
    expect(buildPostRevelationEvent()).toBe(POST_REVELATION_EVENT);
    expect(buildPostRevelationEvent({ boundary: null })).toBe(POST_REVELATION_EVENT);
    const kept = buildPostRevelationEvent({ boundary: 'remember', keptRecord: true });
    const rewritten = buildPostRevelationEvent({ boundary: 'remember', keptRecord: false });
    const road = buildPostRevelationEvent({ boundary: 'release' });
    expect(kept.scenes[3].text).toMatch(/old page and its correction/);
    expect(rewritten.scenes[3].text).toMatch(/written again/);
    expect(rewritten.scenes[3].text).not.toMatch(/old page/);
    expect(kept.backdrop?.image).toBe('private_room');
    expect(road.backdrop?.image).toBe('outward_road');
    expect(road.scenes[1].text).toMatch(/road/);
  });
});
