import type { Animal, AnimalType, DialoguePhase } from '../types/homeWorld';

type Effect = () => void | (() => void);
let mockLifecycle: {
  state: (initial: unknown) => unknown[];
  ref: (initial: unknown) => { current: unknown };
  effect: (effect: Effect, deps?: readonly unknown[]) => void;
} | null = null;
let mockReducedMotion = false;
let mockLowTier = false;
const mockTravelCompletions: (() => void)[] = [];

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    default: actual,
    useState: (initial: unknown) => mockLifecycle!.state(initial),
    useRef: (initial: unknown) => mockLifecycle!.ref(initial),
    useEffect: (effect: Effect, deps?: readonly unknown[]) => mockLifecycle!.effect(effect, deps),
    useCallback: (callback: unknown) => callback,
  };
});

jest.mock('react-native', () => {
  const inert = () => ({ start: jest.fn(), stop: jest.fn() });
  return {
    View: 'View', Text: 'Text', Image: 'Image', TouchableOpacity: 'TouchableOpacity',
    StyleSheet: { create: (styles: unknown) => styles },
    Platform: { OS: 'android' },
    Animated: {
      View: 'AnimatedView', Text: 'AnimatedText', Image: 'AnimatedImage',
      Value: class {
        value: number;
        constructor(value: number) { this.value = value; }
        setValue(value: number) { this.value = value; }
        interpolate() { return { input: this }; }
      },
      timing: (value: { setValue: (value: number) => void }, config: { toValue: number; duration: number }) => ({
        config,
        start: () => value.setValue(config.toValue),
        stop: jest.fn(),
      }),
      parallel: (animations: { start: () => void }[]) => ({
        start: (done?: () => void) => {
          animations.forEach(animation => animation.start());
          if (done) mockTravelCompletions.push(done);
        },
        stop: jest.fn(),
      }),
      loop: inert, sequence: inert, spring: inert, delay: inert,
      add: () => ({ interpolate: () => 0 }), multiply: () => 1,
    },
    Easing: { inOut: (value: unknown) => value, in: (value: unknown) => value, out: (value: unknown) => value, sin: 0, ease: 0, linear: 0 },
  };
});
// Native asset handles are truthy; the suite's default zero stub would hide talk/robe layers.
jest.mock('./__mocks__/fileMock', () => 1);
jest.mock('react-native-gesture-handler', () => ({ TouchableOpacity: 'TouchableOpacity' }));
jest.mock('../services/homeWorldData', () => ({ ANIMAL_EMOJIS: {} }));
jest.mock('../services/settings', () => ({ getSettingsSync: () => ({ reducedMotion: mockReducedMotion }) }));
jest.mock('../services/deviceTier', () => ({ shouldSimplifyAnimations: () => mockLowTier }));
jest.mock('../theme/fonts', () => ({ BODY_FONT: 'Body', PIXEL_FONT_BOLD: 'Pixel' }));
jest.mock('../components/ui/chromeIcons', () => ({ CHROME_ICONS: { alertPip: 'alert' } }));

import {
  AnimalSprite,
  CHARACTER_SPRITES,
  getSpriteFacingCorrection,
  getWalkAtlasFrame,
  getWalkFrameDurationMs,
} from '../components/home/AnimalSprite';

type Node = { props: { children?: unknown; testID?: string; style?: unknown; source?: unknown; onError?: () => void }; type?: unknown };

function find(node: unknown, testID: string): Node | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = find(child, testID);
      if (found) return found;
    }
    return undefined;
  }
  const element = node as Node;
  return element.props?.testID === testID ? element : find(element.props?.children, testID);
}

function flattenStyle(style: unknown): Record<string, any> {
  return Object.assign({}, ...[style].flat(Infinity).filter(value => typeof value === 'object'));
}

function sourceMirror(tree: unknown, pose: 'static' | 'walk-atlas' | 'talk'): number {
  const body = flattenStyle(find(tree, 'animal-sprite-body')!.props.style);
  const layer = flattenStyle(find(tree, `animal-sprite-${pose}`)!.props.style);
  return body.transform[0].scaleX.value * layer.transform[0].scaleX;
}

function createHarness(type: AnimalType = 'fennec_fox') {
  const values = new Map<number, unknown>();
  const effects = new Map<number, { deps?: readonly unknown[]; cleanup?: () => void }>();
  let pending: { index: number; effect: Effect; deps?: readonly unknown[] }[] = [];
  let cursor = 0;
  let changed = false;
  mockLifecycle = {
    state(initial) {
      const index = cursor++;
      if (!values.has(index)) values.set(index, typeof initial === 'function' ? initial() : initial);
      return [values.get(index), (next: unknown) => {
        const previous = values.get(index);
        const value = typeof next === 'function' ? next(previous) : next;
        changed ||= !Object.is(value, previous);
        values.set(index, value);
      }];
    },
    ref(initial) {
      const index = cursor++;
      if (!values.has(index)) values.set(index, { current: initial });
      return values.get(index) as { current: unknown };
    },
    effect(effect, deps) {
      const index = cursor++;
      const previous = effects.get(index);
      if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous.deps?.[i]))) {
        pending.push({ index, effect, deps });
      }
    },
  };
  const animal = { type, name: 'Fennick', position: { x: 50, y: 50 }, hasNewDialogue: true } as Animal;
  return {
    render(phase: DialoguePhase = 0): unknown {
      let tree: unknown;
      let renders = 0;
      do {
        cursor = 0;
        changed = false;
        pending = [];
        tree = AnimalSprite({ animal, roomWidth: 320, roomHeight: 200, currentPhase: phase, onPress: jest.fn() });
        for (const update of pending) {
          effects.get(update.index)?.cleanup?.();
          effects.set(update.index, { deps: update.deps, cleanup: update.effect() || undefined });
        }
        if (++renders > 10) throw new Error('Animal did not settle');
      } while (changed);
      return tree;
    },
    dispose() {
      effects.forEach(effect => effect.cleanup?.());
      mockLifecycle = null;
    },
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  mockReducedMotion = false;
  mockLowTier = false;
  mockTravelCompletions.length = 0;
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('the fennec faces its direction of travel in every source pose', () => {
  test('idle, talk and robes are left-facing artwork; the new walk art is right-facing', () => {
    for (const pose of ['idle', 'talk', 'robed', 'robedTalk'] as const) {
      expect(getSpriteFacingCorrection('fennec_fox', pose)).toBe(-1);
    }
    expect(getSpriteFacingCorrection('fennec_fox', 'walk')).toBe(1);
    expect(getSpriteFacingCorrection('fox', 'idle')).toBe(1);
    expect(getSpriteFacingCorrection('fox', 'walk')).toBe(1);
  });

  test.each([['right', 0.9, 1], ['left', 0.1, -1]] as const)(
    'walks %s, then stops without reversing its visible facing',
    (_direction, random, expected) => {
      jest.spyOn(Math, 'random').mockReturnValue(random);
      const harness = createHarness();
      try {
        const initial = harness.render();
        // Idle initially preserves the source pixels, which natively face left.
        expect(sourceMirror(initial, 'static')).toBe(1);
        jest.advanceTimersByTime(3000);
        const moving = harness.render();
        // Pixels in the atlas face right: body x layer = intended direction.
        expect(sourceMirror(moving, 'walk-atlas')).toBe(expected);
        // Idle/talk pixels face left: their total mirror must be the opposite.
        expect(sourceMirror(moving, 'static')).toBe(-expected);
        expect(sourceMirror(moving, 'talk')).toBe(-expected);
        expect(flattenStyle(find(moving, 'animal-sprite-static')!.props.style).opacity).toBe(0);
        mockTravelCompletions.shift()!();
        const stopped = harness.render();
        expect(sourceMirror(stopped, 'static')).toBe(-expected);
        expect(flattenStyle(find(stopped, 'animal-sprite-static')!.props.style).opacity).toBe(1);
        expect(flattenStyle(find(stopped, 'animal-sprite-walk-atlas')!.props.style).opacity).toBe(0);
      } finally { harness.dispose(); }
    },
  );

  test('a robed fennec glides right with the same direction correction', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const harness = createHarness();
    try {
      harness.render(4);
      jest.advanceTimersByTime(6000);
      const tree = harness.render(4);
      expect(sourceMirror(tree, 'static')).toBe(-1);
      expect(find(tree, 'animal-sprite-walk-atlas')).toBeUndefined();
      expect(find(tree, 'animal-sprite-talk')).toBeUndefined();
    } finally { harness.dispose(); }
  });

  test.each(['reduced motion', 'low tier'] as const)('%s keeps the static artwork and avoids decoding an atlas', mode => {
    mockReducedMotion = mode === 'reduced motion';
    mockLowTier = mode === 'low tier';
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const harness = createHarness();
    try {
      const initial = harness.render();
      expect(sourceMirror(initial, 'static')).toBe(1);
      jest.advanceTimersByTime(3000);
      const tree = harness.render();
      expect(find(tree, 'animal-sprite-walk-atlas')).toBeUndefined();
      expect(sourceMirror(tree, 'static')).toBe(mockReducedMotion ? 1 : -1);
    } finally { harness.dispose(); }
  });
});

describe('packed animal walk cycles', () => {
  test('all eleven requested residents have eight frames, preserving fox and excluding axolotl', () => {
    const types = Object.keys(CHARACTER_SPRITES) as AnimalType[];
    const atlases = types.filter(type => CHARACTER_SPRITES[type]?.walkAtlas);
    expect(atlases).toHaveLength(11);
    expect(atlases).not.toContain('fox');
    expect(atlases).not.toContain('axolotl');
    expect(CHARACTER_SPRITES.fox?.walk).toHaveLength(10);
    expect(CHARACTER_SPRITES.axolotl?.walk).toBeUndefined();
    for (const type of atlases) {
      expect(CHARACTER_SPRITES[type]!.walkAtlas).toMatchObject({ columns: 4, rows: 2, frameCount: 8 });
    }
  });

  test('every atlas frame fills the same 90dp viewport and wraps seamlessly', () => {
    const atlas = CHARACTER_SPRITES.fennec_fox!.walkAtlas!;
    expect(getWalkAtlasFrame(atlas, 0)).toEqual({ width: 360, height: 180, left: -0, top: -0 });
    expect(getWalkAtlasFrame(atlas, 3)).toMatchObject({ left: -270, top: -0 });
    expect(getWalkAtlasFrame(atlas, 4)).toMatchObject({ left: -0, top: -90 });
    expect(getWalkAtlasFrame(atlas, 7)).toMatchObject({ left: -270, top: -90 });
    expect(getWalkAtlasFrame(atlas, 8)).toEqual(getWalkAtlasFrame(atlas, 0));
  });

  test('the fox keeps 125ms timing, while quicker residents step faster than slower ones', () => {
    expect(getWalkFrameDurationMs('fox')).toBe(125);
    expect(getWalkFrameDurationMs('rabbit')).toBeLessThan(getWalkFrameDurationMs('capybara'));
    expect(getWalkFrameDurationMs('fennec_fox')).toBeLessThan(getWalkFrameDurationMs('sloth'));
  });

  test('an atlas decode failure keeps the original static animal and its direction', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const harness = createHarness();
    try {
      harness.render();
      jest.advanceTimersByTime(3000);
      const moving = harness.render();
      const image = (find(moving, 'animal-sprite-walk-atlas')!.props.children as Node[])[0];
      image.props.onError!();
      const fallback = harness.render();
      expect(find(fallback, 'animal-sprite-walk-atlas')).toBeUndefined();
      expect(sourceMirror(fallback, 'static')).toBe(-1);
      expect(flattenStyle(find(fallback, 'animal-sprite-static')!.props.style).opacity).toBe(1);
    } finally { harness.dispose(); }
  });

  test('advancing the cycle moves a fixed-source image, and the next stroll starts at frame zero', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const harness = createHarness();
    const atlasImage = (tree: unknown) => (find(tree, 'animal-sprite-walk-atlas')!.props.children as Node[])[0];
    const offset = (node: Node) => {
      const style = flattenStyle(node.props.style);
      return { x: style.transform[0].translateX.value, y: style.transform[1].translateY.value };
    };
    try {
      harness.render();
      jest.advanceTimersByTime(3000);
      const started = atlasImage(harness.render());
      expect(offset(started)).toEqual({ x: 0, y: 0 });
      jest.advanceTimersByTime(500);
      // The native values advance without requiring a component render.
      expect(offset(started)).not.toEqual({ x: 0, y: 0 });
      const advanced = atlasImage(harness.render());
      expect(advanced.props.source).toBe(started.props.source);
      mockTravelCompletions.shift()!();
      expect(offset(atlasImage(harness.render()))).toEqual({ x: 0, y: 0 });
      jest.advanceTimersByTime(8000);
      expect(offset(atlasImage(harness.render()))).toEqual({ x: 0, y: 0 });
    } finally { harness.dispose(); }
  });
});
