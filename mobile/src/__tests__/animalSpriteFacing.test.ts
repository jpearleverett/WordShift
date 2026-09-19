import type { Animal, AnimalType, DialoguePhase } from '../types/homeWorld';

type Effect = () => void | (() => void);
let mockLifecycle: {
  state: (initial: unknown) => unknown[];
  ref: (initial: unknown) => { current: unknown };
  effect: (effect: Effect, deps?: readonly unknown[]) => void;
} | null = null;
let mockReducedMotion = false;
let mockLowTier = false;
let mockPremount = true;
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
        stopAnimation(done?: (value: number) => void) { done?.(this.value); }
        interpolate() { return { input: this }; }
      },
      timing: (value: { setValue: (value: number) => void }, config: { toValue: number; duration: number }) => ({
        config,
        start: () => value.setValue(config.toValue),
        stop: jest.fn(),
      }),
      parallel: (animations: { start: () => void }[]) => ({
        start: (done?: (result: { finished: boolean }) => void) => {
          animations.forEach(animation => animation.start());
          if (done) mockTravelCompletions.push(() => done({ finished: true }));
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
jest.mock('../services/deviceTier', () => ({
  shouldSimplifyAnimations: () => mockLowTier,
  shouldPremountSpriteLayers: () => mockPremount,
}));
jest.mock('../theme/fonts', () => ({ BODY_FONT: 'Body', PIXEL_FONT_BOLD: 'Pixel' }));
jest.mock('../components/ui/chromeIcons', () => ({ CHROME_ICONS: { alertPip: 'alert' } }));

import {
  AnimalSprite,
  ANIMAL_SPECIES_NAMES,
  CHARACTER_SPRITES,
  getRestingPhrase,
  getSpriteFacingCorrection,
  getWalkAtlasFrame,
  getWalkFrameDurationMs,
  getGaitPaceScale,
  getPhaseMotionScale,
} from '../components/home/AnimalSprite';

type Node = { props: { children?: unknown; testID?: string; style?: unknown; source?: unknown; onError?: () => void; onLoad?: () => void }; type?: unknown };

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

function findByProp(node: unknown, prop: string): Node | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByProp(child, prop);
      if (found) return found;
    }
    return undefined;
  }
  const element = node as Node;
  const props = element.props as Record<string, unknown> | undefined;
  return props && prop in props ? element : findByProp(props?.children, prop);
}

function flattenStyle(style: unknown): Record<string, any> {
  return Object.assign({}, ...[style].flat(Infinity).filter(value => typeof value === 'object'));
}

function sourceMirror(tree: unknown, pose: 'static' | 'walk-atlas' | 'talk'): number {
  const body = flattenStyle(find(tree, 'animal-sprite-body')!.props.style);
  const layer = flattenStyle(find(tree, `animal-sprite-${pose}`)!.props.style);
  return body.transform[0].scaleX.value * layer.transform[0].scaleX;
}

function atlasImage(tree: unknown): Node {
  return (find(tree, 'animal-sprite-walk-atlas')!.props.children as Node[])[0];
}

function atlasOffset(tree: unknown) {
  const style = flattenStyle(atlasImage(tree).props.style);
  return { x: style.transform[0].translateX.value, y: style.transform[1].translateY.value };
}

function createHarness(type: AnimalType = 'fennec_fox', extraProps: Record<string, unknown> = {}) {
  const decodedSources = new Set<unknown>();
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
    render(phase: DialoguePhase = 0, decodeAtlas = true): unknown {
      let tree: unknown;
      let renders = 0;
      do {
        cursor = 0;
        changed = false;
        pending = [];
        tree = AnimalSprite({ animal, roomWidth: 320, roomHeight: 200, currentPhase: phase, onPress: jest.fn(), ...extraProps });
        for (const update of pending) {
          effects.get(update.index)?.cleanup?.();
          effects.set(update.index, { deps: update.deps, cleanup: update.effect() || undefined });
        }
        const atlas = find(tree, 'animal-sprite-walk-atlas');
        if (decodeAtlas && atlas) {
          const image = atlasImage(tree);
          if (image.props.onLoad && !decodedSources.has(image.props.source)) {
            decodedSources.add(image.props.source);
            image.props.onLoad();
          }
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
  mockPremount = true;
  mockTravelCompletions.length = 0;
  // Different native asset handles let late callbacks prove outfit isolation.
  CHARACTER_SPRITES.fennec_fox!.walkAtlas!.source = 101;
  CHARACTER_SPRITES.fennec_fox!.robedWalkAtlas!.source = 102;
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
    expect(getSpriteFacingCorrection('fennec_fox', 'robedWalk')).toBe(1);
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

  test.each([
    [4, 'right', 0.9, 1], [4, 'left', 0.1, -1],
    [5, 'right', 0.9, 1], [5, 'left', 0.1, -1],
  ] as const)('a phase-%s robed fennec walks %s through all eight frames', (phase, _direction, random, expected) => {
    jest.spyOn(Math, 'random').mockReturnValue(random);
    const harness = createHarness();
    try {
      harness.render(phase);
      jest.advanceTimersByTime(7000);
      const started = harness.render(phase);
      expect(sourceMirror(started, 'walk-atlas')).toBe(expected);
      expect(sourceMirror(started, 'static')).toBe(-expected);
      expect(find(started, 'animal-sprite-talk')).toBeUndefined();
      expect(flattenStyle(find(started, 'animal-sprite-static')!.props.style).opacity).toBe(0);
      const source = atlasImage(started).props.source;
      expect(source).toBe(CHARACTER_SPRITES.fennec_fox!.robedWalkAtlas!.source);
      const cadence = getWalkFrameDurationMs('fennec_fox') * getGaitPaceScale(
        24, 2000 * getPhaseMotionScale(phase).speedMul, 2000,
      );
      const offsets = [atlasOffset(started)];
      for (let frame = 1; frame < 8; frame++) {
        jest.advanceTimersByTime(Math.ceil(cadence));
        const tree = harness.render(phase);
        expect(atlasImage(tree).props.source).toBe(source);
        offsets.push(atlasOffset(tree));
      }
      expect(new Set(offsets.map(offset => `${offset.x},${offset.y}`)).size).toBe(8);
      expect(new Set(offsets.map(offset => offset.y))).toEqual(new Set([0, -90]));
      mockTravelCompletions.shift()!();
      const stopped = harness.render(phase);
      expect(atlasOffset(stopped)).toEqual({ x: 0, y: 0 });
      expect(flattenStyle(find(stopped, 'animal-sprite-static')!.props.style).opacity).toBe(1);
      expect(sourceMirror(stopped, 'static')).toBe(-expected);
    } finally { harness.dispose(); }
  });

  test.each([
    ['reduced motion', 0], ['low tier', 0], ['reduced motion', 4], ['low tier', 4], ['reduced motion', 5], ['low tier', 5],
  ] as const)('%s in phase %s keeps the static artwork and avoids decoding an atlas', (mode, phase) => {
    mockReducedMotion = mode === 'reduced motion';
    mockLowTier = mode === 'low tier';
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const harness = createHarness();
    try {
      const initial = harness.render(phase);
      expect(sourceMirror(initial, 'static')).toBe(1);
      jest.advanceTimersByTime(7000);
      const tree = harness.render(phase);
      expect(find(tree, 'animal-sprite-walk-atlas')).toBeUndefined();
      expect(sourceMirror(tree, 'static')).toBe(mockReducedMotion ? 1 : -1);
    } finally { harness.dispose(); }
  });
});

describe('sprite layer pre-mount budget', () => {
  test('the high tier pre-mounts the walk atlas and the talk layer before either is needed', () => {
    const harness = createHarness();
    try {
      const tree = harness.render();
      expect(find(tree, 'animal-sprite-walk-atlas')).toBeDefined();
      expect(find(tree, 'animal-sprite-talk')).toBeDefined();
    } finally { harness.dispose(); }
  });

  test('a lower tier mounts the walk atlas on the first walk and keeps it afterwards', () => {
    mockPremount = false;
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const harness = createHarness();
    try {
      const initial = harness.render();
      expect(find(initial, 'animal-sprite-walk-atlas')).toBeUndefined();
      expect(find(initial, 'animal-sprite-talk')).toBeUndefined();
      jest.advanceTimersByTime(3000);
      const moving = harness.render();
      expect(flattenStyle(find(moving, 'animal-sprite-walk-atlas')!.props.style).opacity).toBe(1);
      expect(sourceMirror(moving, 'walk-atlas')).toBe(1);
      mockTravelCompletions.shift()!();
      const stopped = harness.render();
      // Latched: no re-decode on the next step.
      expect(flattenStyle(find(stopped, 'animal-sprite-walk-atlas')!.props.style).opacity).toBe(0);
      expect(find(stopped, 'animal-sprite-talk')).toBeUndefined();
    } finally { harness.dispose(); }
  });

  test('a lower tier mounts the talk layer when the first talk-frame idle beat starts', () => {
    mockPremount = false;
    // 0.9 keeps the wander far off (the beat needs a still animal) and puts
    // the first idle beat at 8000 + 0.9 * 20000 ms.
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const harness = createHarness();
    try {
      expect(find(harness.render(), 'animal-sprite-talk')).toBeUndefined();
      jest.advanceTimersByTime(2500);
      expect(find(harness.render(), 'animal-sprite-talk')).toBeUndefined();
      jest.advanceTimersByTime(24000);
      const tree = harness.render();
      expect(find(tree, 'animal-sprite-talk')).toBeDefined();
    } finally {
      // Release the idle-beat turnstile the mocked parallel never completes.
      mockTravelCompletions.splice(0).forEach(done => done());
      harness.dispose();
    }
  });
});

describe('accessibility label', () => {
  test('species read as display names, never the enum', () => {
    for (const name of Object.values(ANIMAL_SPECIES_NAMES)) {
      expect(name).not.toMatch(/_/);
      expect(name).toBe(name.toLowerCase());
    }
    expect(Object.keys(ANIMAL_SPECIES_NAMES).sort()).toEqual(Object.keys(CHARACTER_SPRITES).sort());
    expect(ANIMAL_SPECIES_NAMES.fennec_fox).toBe('fennec fox');
    expect(ANIMAL_SPECIES_NAMES.red_panda).toBe('red panda');
    expect(ANIMAL_SPECIES_NAMES.aye_aye).toBe('aye-aye');
    const harness = createHarness();
    try {
      const label = findByProp(harness.render(), 'accessibilityLabel')!.props as Record<string, unknown>;
      expect(label.accessibilityLabel).toBe('Fennick the fennec fox');
    } finally { harness.dispose(); }
  });

  test('a resting animal describes its rest vaguely, never the exact puzzle countdown', () => {
    expect(getRestingPhrase(1)).toBe('resting, almost ready');
    expect(getRestingPhrase(3)).toBe('resting, a little longer');
    expect(getRestingPhrase(7)).toBe('resting, needs more puzzles');
    expect(getRestingPhrase(undefined)).toBe('resting');
    const harness = createHarness('fennec_fox', { isOnCooldown: true, cooldownPuzzlesLeft: 4 });
    try {
      const label = findByProp(harness.render(), 'accessibilityLabel')!.props as Record<string, unknown>;
      expect(label.accessibilityLabel).toBe('Fennick the fennec fox, resting, needs more puzzles');
      expect(label.accessibilityLabel).not.toMatch(/\d/);
    } finally { harness.dispose(); }
  });
});

describe('packed animal walk cycles', () => {
  test('all residents have normal and robed cycles, preserving the fox source animation', () => {
    const types = Object.keys(CHARACTER_SPRITES) as AnimalType[];
    expect(types).toHaveLength(13);
    const atlases = types.filter(type => CHARACTER_SPRITES[type]?.walkAtlas);
    expect(atlases).toHaveLength(12);
    expect(atlases).not.toContain('fox');
    expect(atlases).toContain('axolotl');
    expect(CHARACTER_SPRITES.fox?.walk).toHaveLength(10);
    for (const type of types) {
      expect(CHARACTER_SPRITES[type]!.robedWalkAtlas).toMatchObject({ columns: 4, rows: 2, frameCount: 8 });
    }
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

  test('the current outfit stays visible until its own atlas has decoded', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const harness = createHarness();
    try {
      const first = harness.render(3, false);
      const staleNormalImage = atlasImage(first);
      jest.advanceTimersByTime(4000);
      const waiting = harness.render(3, false);
      expect(flattenStyle(find(waiting, 'animal-sprite-static')!.props.style).opacity).toBe(1);
      expect(flattenStyle(find(waiting, 'animal-sprite-walk-atlas')!.props.style).opacity).toBe(0);
      harness.render(4, false);
      jest.advanceTimersByTime(6000);
      // A late normal-clothes decode cannot reveal a still-undecoded robe.
      staleNormalImage.props.onLoad!();
      const robedWaiting = harness.render(4, false);
      expect(atlasImage(robedWaiting).props.source).toBe(102);
      expect(flattenStyle(find(robedWaiting, 'animal-sprite-static')!.props.style).opacity).toBe(1);
      expect(find(robedWaiting, 'animal-sprite-talk')).toBeUndefined();
      // An error from that obsolete image also cannot disable the robe.
      staleNormalImage.props.onError!();
      const robedReady = harness.render(4);
      expect(atlasImage(robedReady).props.source).toBe(102);
      expect(flattenStyle(find(robedReady, 'animal-sprite-walk-atlas')!.props.style).opacity).toBe(1);
      expect(flattenStyle(find(robedReady, 'animal-sprite-static')!.props.style).opacity).toBe(0);
    } finally { harness.dispose(); }
  });

  test('changing outfit resets the walk and ignores the old travel completion', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const harness = createHarness();
    try {
      harness.render(3);
      jest.advanceTimersByTime(4000);
      harness.render(3);
      jest.advanceTimersByTime(500);
      expect(atlasOffset(harness.render(3))).not.toEqual({ x: 0, y: 0 });
      const oldTravelDone = mockTravelCompletions.shift()!;
      const changed = harness.render(4);
      expect(atlasOffset(changed)).toEqual({ x: 0, y: 0 });
      expect(flattenStyle(find(changed, 'animal-sprite-static')!.props.style).opacity).toBe(1);
      jest.advanceTimersByTime(6000);
      const moving = harness.render(4);
      expect(flattenStyle(find(moving, 'animal-sprite-walk-atlas')!.props.style).opacity).toBe(1);
      oldTravelDone();
      expect(flattenStyle(find(harness.render(4), 'animal-sprite-walk-atlas')!.props.style).opacity).toBe(1);
      mockTravelCompletions.shift()!();
      expect(flattenStyle(find(harness.render(4), 'animal-sprite-static')!.props.style).opacity).toBe(1);
      const normalAgain = harness.render(3);
      expect(atlasImage(normalAgain).props.source).toBe(101);
      expect(atlasOffset(normalAgain)).toEqual({ x: 0, y: 0 });
    } finally { harness.dispose(); }
  });

  test('an interrupted walk resumes from its actual position and finishes the facing turn', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const harness = createHarness();
    try {
      harness.render(3);
      jest.advanceTimersByTime(4000);
      const moving = harness.render(3) as Node;
      const position = flattenStyle(moving.props.style).transform[0].translateX.input;
      const facing = flattenStyle(find(moving, 'animal-sprite-body')!.props.style).transform[0].scaleX;
      // Native animations can be between their endpoints when a new phase
      // interrupts them. The ordinary timing mock jumps straight to x=74.
      position.setValue(56);
      facing.setValue(-0.3);
      const stopped = harness.render(4);
      expect(position.value).toBe(56);
      expect(sourceMirror(stopped, 'static')).toBe(1);
      // x=78 is a valid rightward leg from the actual x=56. Using the
      // abandoned x=74 target would reject it as too short and turn left.
      random.mockReturnValue(58 / 60);
      jest.advanceTimersByTime(6000);
      expect(sourceMirror(harness.render(4), 'walk-atlas')).toBe(1);
      expect(position.value).toBe(78);
    } finally { harness.dispose(); }
  });

  test('a failed robed atlas falls back to the robe without breaking normal walks', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const harness = createHarness();
    try {
      harness.render(4);
      jest.advanceTimersByTime(6000);
      atlasImage(harness.render(4)).props.onError!();
      const fallback = harness.render(4);
      expect(find(fallback, 'animal-sprite-walk-atlas')).toBeUndefined();
      expect(flattenStyle(find(fallback, 'animal-sprite-static')!.props.style).opacity).toBe(1);
      expect((find(fallback, 'animal-sprite-static')!.props.children as Node[])[0].props.source)
        .toBe(CHARACTER_SPRITES.fennec_fox!.robed);
      harness.render(3);
      jest.advanceTimersByTime(4000);
      expect(flattenStyle(find(harness.render(3), 'animal-sprite-walk-atlas')!.props.style).opacity).toBe(1);
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


describe('house character sizing', () => {
  test('Axel keeps one grounded size across static, talking, walking and robed layers', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const harness = createHarness('axolotl');
    try {
      const idle = harness.render(0);
      const art = find(idle, 'animal-sprite-art')!;
      const sizing = flattenStyle(art.props.style);
      const scale = sizing.transform.find((item: { scale?: number }) => item.scale != null).scale;
      const offset = sizing.transform.find((item: { translateY?: number }) => item.translateY != null).translateY;
      expect(scale).toBeGreaterThanOrEqual(0.85);
      expect(scale).toBeLessThanOrEqual(0.9);
      const originalFootY = 90 * 407 / 500;
      expect(45 + (originalFootY - 45) * scale + offset).toBeCloseTo(originalFootY);
      expect(find(art, 'animal-sprite-static')).toBeDefined();
      expect(find(art, 'animal-sprite-talk')).toBeDefined();
      jest.advanceTimersByTime(5000);
      const moving = harness.render(0);
      expect(find(find(moving, 'animal-sprite-art'), 'animal-sprite-walk-atlas')).toBeDefined();
      expect(flattenStyle(find(moving, 'animal-sprite-art')!.props.style)).toEqual(sizing);
      const robed = harness.render(4);
      expect(flattenStyle(find(robed, 'animal-sprite-art')!.props.style)).toEqual(sizing);
      expect(find(find(robed, 'animal-sprite-art'), 'animal-sprite-walk-atlas')).toBeDefined();
    } finally { harness.dispose(); }
  });
});
