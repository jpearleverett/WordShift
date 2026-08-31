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

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    default: actual,
    useEffect: () => undefined,
    useRef: (initial: unknown) => ({ current: initial }),
    useState: (initial: unknown) => [initial, jest.fn()],
  };
});

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Image: 'Image',
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
}));
jest.mock('../services/haptics', () => ({
  hapticLight: jest.fn(),
  hapticMedium: jest.fn(),
  hapticHeavy: jest.fn(),
  hapticWarning: jest.fn(),
}));
jest.mock('../theme/fonts', () => ({ BODY_FONT_BOLD: 'BodyBold' }));
jest.mock('../theme/colors', () => ({
  getPhaseTheme: () => ({ vignetteColor: '#000000' }),
}));

import {
  getPhaseTransitionEvent,
  getEventDuration,
  HOUSE_COMPLETION_EVENT,
  FINAL_PUZZLE_EVENT,
  buildFinalPuzzleEvent,
  POST_REVELATION_EVENT,
  NEW_CYCLE_EVENT,
  PhaseTransitionEvent,
} from '../services/phaseEvents';
import { getWordPhaseTier } from '../services/localGenerator';
import { DialoguePhase } from '../types/homeWorld';
import { PhaseTransitionOverlay } from '../components/PhaseTransitionOverlay';

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
      expect(tree.props?.accessibilityLabel).toBe(event.scenes[0].text);
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

  test('total length stays in the ~30s band (Skip remains the fast exit)', () => {
    // getEventDuration is the raw scene budget; the overlay applies 1.25x.
    const shippedMs = getEventDuration(FINAL_PUZZLE_EVENT) * 1.25;
    expect(shippedMs).toBeGreaterThanOrEqual(27000);
    expect(shippedMs).toBeLessThanOrEqual(35000);
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
