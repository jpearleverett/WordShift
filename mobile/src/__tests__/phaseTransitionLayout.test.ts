/**
 * Ceremony presentation contracts that need the rendered component: art never
 * disappears between pages and reading overflow cannot take the controls away.
 * Rendered geometry is checked by the browser journey; this small hook driver
 * exercises actual page/timer transitions without introducing a test renderer.
 */
type Effect = () => void | (() => void);
type EffectRecord = { deps?: readonly unknown[]; cleanup?: () => void };
type HookDriver = {
  state: (initial: unknown) => unknown[];
  ref: (initial: unknown) => { current: unknown };
  effect: (callback: Effect, deps?: readonly unknown[], layout?: boolean) => void;
};
let mockHooks: HookDriver | null = null;
let mockDimensions = { width: 400, height: 800, fontScale: 1, scale: 1 };
let mockAppStateListener: ((state: string) => void) | undefined;
let mockBackListener: (() => boolean) | undefined;
let mockInsets = { top: 20, right: 0, bottom: 20, left: 0 };
let mockReducedMotion = true;

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: (initial: unknown) => mockHooks!.state(initial),
  useRef: (initial: unknown) => mockHooks!.ref(initial),
  useEffect: (callback: Effect, deps?: readonly unknown[]) => mockHooks!.effect(callback, deps),
  useLayoutEffect: (callback: Effect, deps?: readonly unknown[]) => mockHooks!.effect(callback, deps, true),
}));
jest.mock('react-native', () => {
  const animation = { start: jest.fn(), stop: jest.fn() };
  return {
    View: 'View', Text: 'Text', Pressable: 'Pressable', TouchableOpacity: 'TouchableOpacity',
    Image: 'Image', ScrollView: 'ScrollView',
    AppState: { currentState: 'active', addEventListener: (_event: string, listener: (state: string) => void) => {
      mockAppStateListener = listener;
      return { remove: () => { mockAppStateListener = undefined; } };
    } },
    BackHandler: { addEventListener: (_event: string, listener: () => boolean) => {
      mockBackListener = listener;
      return { remove: () => { mockBackListener = undefined; } };
    } },
    useWindowDimensions: () => mockDimensions,
    Dimensions: { get: () => mockDimensions },
    Easing: { out: (easing: unknown) => easing, cubic: 'cubic' },
    StyleSheet: { absoluteFill: { position: 'absolute' }, create: (styles: unknown) => styles },
    Animated: {
      View: 'AnimatedView',
      Value: jest.fn().mockImplementation((value: number) => ({
        value, setValue: jest.fn(), stopAnimation: jest.fn(),
      })),
      timing: () => animation, parallel: () => animation,
      sequence: () => animation, delay: () => animation, loop: () => animation,
    },
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => mockInsets }));
jest.mock('../hooks/useReducedMotion', () => ({ useReducedMotion: () => mockReducedMotion }));
jest.mock('../services/settings', () => ({ getSettingsSync: () => ({ reducedMotion: mockReducedMotion }) }));
jest.mock('../services/uiSound', () => ({
  createCeremonySoundScope: () => ({ play: jest.fn(), stop: jest.fn() }),
  stopCeremonyMusic: jest.fn(),
}));
jest.mock('../services/a11yAnnounce', () => ({ announceForA11y: jest.fn() }));
jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn() }));
jest.mock('../services/haptics', () => ({
  hapticLight: jest.fn(), hapticMedium: jest.fn(), hapticHeavy: jest.fn(), hapticWarning: jest.fn(),
}));
jest.mock('../theme/fonts', () => ({ BODY_FONT: 'Body', BODY_FONT_BOLD: 'BodyBold', PIXEL_FONT_BOLD: 'PixelBold' }));
jest.mock('../components/StoryPortrait', () => ({ StoryPortrait: 'StoryPortrait' }));
jest.mock('../services/storyArchive', () => ({ getStorySpeakerName: (speaker: string) => speaker }));
jest.mock('../theme/colors', () => ({ getPhaseTheme: () => ({ vignetteColor: '#000000' }) }));

import { PhaseTransitionOverlay } from '../components/PhaseTransitionOverlay';
import {
  getPhaseTransitionEvent,
  POST_REVELATION_EVENT,
  NEW_CYCLE_EVENT,
  HOUSE_COMPLETION_EVENT,
  FINAL_PUZZLE_EVENT,
  buildPostRevelationEvent,
  PhaseTransitionEvent,
} from '../services/phaseEvents';

type Node = { type?: unknown; props?: Record<string, unknown> & { children?: unknown } };
function find(node: unknown, matches: (candidate: Node) => boolean): Node | undefined {
  if (Array.isArray(node)) return node.map(child => find(child, matches)).find(Boolean);
  if (!node || typeof node !== 'object') return undefined;
  const candidate = node as Node;
  return matches(candidate) ? candidate : find(candidate.props?.children, matches);
}
function byId(tree: unknown, testID: string): Node | undefined {
  return find(tree, node => node.props?.testID === testID);
}
function text(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join(' ');
  return node && typeof node === 'object' ? text((node as Node).props?.children) : '';
}
function flatStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatStyle));
  return style && typeof style === 'object' ? style as Record<string, unknown> : {};
}
function press(node: Node | undefined) {
  expect(typeof node?.props?.onPress).toBe('function');
  (node!.props!.onPress as () => void)();
}

function mount(event: PhaseTransitionEvent, onComplete = jest.fn()) {
  const values = new Map<number, unknown>();
  const effects = new Map<number, EffectRecord>();
  let pending: { index: number; callback: Effect; deps?: readonly unknown[]; layout: boolean }[] = [];
  let cursor = 0;
  let changed = false;
  mockHooks = {
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
    effect(callback, deps, layout = false) {
      const index = cursor++;
      const previous = effects.get(index);
      if (!previous || !deps || deps.length !== previous.deps?.length ||
          deps.some((value, i) => !Object.is(value, previous.deps?.[i]))) {
        pending.push({ index, callback, deps, layout });
      }
    },
  };
  const render = (suspended = false, replacementEvent = event) => {
    event = replacementEvent;
    let tree: unknown;
    let count = 0;
    do {
      cursor = 0;
      changed = false;
      pending = [];
      tree = PhaseTransitionOverlay({ event, onComplete, suspended });
      for (const effect of pending.sort((a, b) => Number(b.layout) - Number(a.layout))) {
        effects.get(effect.index)?.cleanup?.();
        effects.set(effect.index, { deps: effect.deps, cleanup: effect.callback() || undefined });
      }
      if (++count > 10) throw new Error('Ceremony state did not settle');
    } while (changed);
    return tree;
  };
  render();
  jest.advanceTimersByTime(mockReducedMotion ? 0 : 600);
  return {
    render,
    onComplete,
    dispose: () => {
      effects.forEach(effect => effect.cleanup?.());
      mockHooks = null;
    },
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  mockDimensions = { width: 400, height: 800, fontScale: 1, scale: 1 };
  mockInsets = { top: 20, right: 0, bottom: 20, left: 0 };
  mockReducedMotion = true;
});
afterEach(() => {
  mockHooks = null;
  jest.useRealTimers();
});

const phaseEvents = [
  ...([1, 2, 3, 4] as const).map(phase => getPhaseTransitionEvent(phase)!),
  POST_REVELATION_EVENT,
  HOUSE_COMPLETION_EVENT,
  FINAL_PUZZLE_EVENT,
  NEW_CYCLE_EVENT,
];

test.each([
  { name: 'ordinary phone', width: 400, height: 800, fontScale: 1, top: 20, bottom: 20 },
  { name: 'small phone with large text and safe areas', width: 320, height: 568, fontScale: 2, top: 44, bottom: 48 },
])('every phase page keeps artwork and controls outside text scrolling: $name', dimensions => {
  mockDimensions = { width: dimensions.width, height: dimensions.height, fontScale: dimensions.fontScale, scale: 1 };
  mockInsets = { top: dimensions.top, bottom: dimensions.bottom, left: 0, right: 0 };
  for (const original of phaseEvents) {
    const event = { ...original, readAtOwnPace: true };
    const harness = mount(event);
    try {
      for (let page = 0; page < event.scenes.length; page++) {
        const tree = harness.render();
        const art = byId(tree, 'phase-transition-art');
        const reading = byId(tree, 'phase-transition-reading');
        const footer = byId(tree, 'phase-transition-footer');
        const next = byId(tree, 'phase-transition-next');
        const back = byId(tree, 'phase-transition-back');
        expect(art).toBeDefined();
        expect(find(art, node => node.type === 'Image')).toBeDefined();
        // A text-only passage used to collapse its entire illustrated stage.
        expect(flatStyle(art?.props?.style).height).toBeGreaterThanOrEqual(72);
        expect(reading?.type).toBe('ScrollView');
        expect(text(reading)).toContain(event.scenes[page].text);
        expect(byId(reading, 'phase-transition-art')).toBeUndefined();
        expect(byId(reading, 'phase-transition-footer')).toBeUndefined();
        expect(byId(reading, 'phase-transition-next')).toBeUndefined();
        expect(byId(reading, 'phase-transition-back')).toBeUndefined();
        expect(byId(footer, 'phase-transition-next')).toBe(next);
        expect(byId(footer, 'phase-transition-back')).toBe(back);
        expect(back?.props?.accessibilityLabel).toBe('Previous passage');
        expect(back?.props?.disabled).toBe(page === 0);
        expect(flatStyle(back?.props?.style).minHeight).toBeGreaterThanOrEqual(48);
        expect(flatStyle(next?.props?.style).minHeight).toBeGreaterThanOrEqual(48);
        expect(next?.props?.accessibilityLabel).toBe(page === event.scenes.length - 1
          ? 'Finish the scene' : 'Continue the scene');
        expect(find(tree, node => node.props?.accessibilityLabel === 'Skip transition')).toBeDefined();
        press(next);
        jest.advanceTimersByTime(350);
      }
      expect(harness.onComplete).toHaveBeenCalledTimes(1);
    } finally {
      harness.dispose();
    }
  }
});

test('Continue advances exactly one page and the final page waits for an explicit Continue', () => {
  const event: PhaseTransitionEvent = {
    ...getPhaseTransitionEvent(1)!,
    readAtOwnPace: false,
    scenes: ['First passage.', 'Second passage.', 'Last passage.'].map((passage, index) => ({
      text: passage, image: 'private_room', delay: index * 1000, duration: 1000, effect: 'fade',
    })),
  };
  const harness = mount(event);
  try {
    let tree = harness.render();
    expect(text(tree)).toContain('First passage.');
    jest.advanceTimersByTime(1000);
    press(byId(tree, 'phase-transition-next'));
    tree = harness.render();
    expect(text(tree)).toContain('Second passage.');
    jest.advanceTimersByTime(60_000);
    tree = harness.render();
    expect(text(tree)).toContain('Second passage.');
    expect(text(tree)).not.toContain('Last passage.');
    expect(harness.onComplete).not.toHaveBeenCalled();
    press(byId(tree, 'phase-transition-next'));
    tree = harness.render();
    expect(text(tree)).toContain('Last passage.');
    const finish = byId(tree, 'phase-transition-next');
    jest.advanceTimersByTime(350);
    press(finish);
    press(finish);
    jest.advanceTimersByTime(60_000);
    expect(harness.onComplete).toHaveBeenCalledTimes(1);
  } finally {
    harness.dispose();
  }
});

test('Back revisits the previous passage and invalidates callbacks from an earlier visit', () => {
  const harness = mount(shortEvent());
  try {
    const first = harness.render();
    press(byId(first, 'phase-transition-back'));
    expect(text(harness.render())).toContain('First passage.');
    press(byId(first, 'phase-transition-next'));
    jest.advanceTimersByTime(350);
    const second = harness.render();
    press(byId(second, 'phase-transition-next'));
    jest.advanceTimersByTime(350);
    const last = harness.render();
    expect(text(last)).toContain('Last passage.');
    press(byId(last, 'phase-transition-back'));
    press(byId(last, 'phase-transition-back'));
    jest.advanceTimersByTime(350);
    expect(text(harness.render())).toContain('Second passage.');
    // Index equality alone is insufficient after Back returns to this index.
    press(byId(second, 'phase-transition-next'));
    press(byId(second, 'phase-transition-back'));
    expect(text(harness.render())).toContain('Second passage.');
    press(byId(harness.render(), 'phase-transition-back'));
    jest.advanceTimersByTime(350);
    expect(text(harness.render())).toContain('First passage.');
    press(byId(first, 'phase-transition-next'));
    expect(text(harness.render())).toContain('First passage.');
    expect(byId(harness.render(), 'phase-transition-back')?.props?.accessibilityState).toEqual({ disabled: true });
    press(byId(harness.render(), 'phase-transition-next'));
    expect(text(harness.render())).toContain('Second passage.');
    expect(harness.onComplete).not.toHaveBeenCalled();
  } finally {
    harness.dispose();
  }
});

test.each([
  ['After', POST_REVELATION_EVENT],
  ['Again', NEW_CYCLE_EVENT],
] as const)('%s keeps its settled presence above opaque room and road paintings', (_title, event) => {
  const harness = mount(event);
  try {
    for (let page = 0; page < event.scenes.length; page++) {
      const tree = harness.render();
      if (event.scenes[page].image !== 'shadow_figure') {
        const art = byId(tree, 'phase-transition-art');
        const children = (Array.isArray(art?.props?.children) ? art.props.children : [art?.props?.children]) as Node[];
        const paintingIndex = children.findIndex(node => node?.type === 'AnimatedView' && !!find(node, child => child.type === 'Image'));
        const presenceIndex = children.findIndex(node => node?.type === 'View' && !!find(node, child =>
          child.type === 'Image' && flatStyle(child.props?.style).opacity === event.backdrop?.opacity));
        expect(paintingIndex).toBeGreaterThanOrEqual(0);
        // Later native siblings paint on top. At opacity 1, an illustration
        // would completely conceal the promised presence if this is reversed.
        expect(presenceIndex).toBeGreaterThan(paintingIndex);
      }
      press(byId(tree, 'phase-transition-next'));
      jest.advanceTimersByTime(350);
    }
  } finally {
    harness.dispose();
  }
});

test('a personalized environmental backdrop remains behind the foreground scene', () => {
  const event = buildPostRevelationEvent({ boundary: 'remember' });
  const harness = mount(event);
  try {
    const art = byId(harness.render(), 'phase-transition-art');
    const children = (Array.isArray(art?.props?.children) ? art.props.children : [art?.props?.children]) as Node[];
    const foregroundIndex = children.findIndex(node => node?.type === 'AnimatedView' && !!find(node, child => child.type === 'Image'));
    const backgroundIndex = children.findIndex(node => node?.type === 'View' && !!find(node, child =>
      child.type === 'Image' && flatStyle(child.props?.style).opacity === event.backdrop?.opacity));
    expect(backgroundIndex).toBeGreaterThanOrEqual(0);
    expect(backgroundIndex).toBeLessThan(foregroundIndex);
  } finally {
    harness.dispose();
  }
});


function shortEvent(readAtOwnPace = false): PhaseTransitionEvent {
  return {
    ...getPhaseTransitionEvent(1)!, readAtOwnPace,
    scenes: ['First passage.', 'Second passage.', 'Last passage.'].map((passage, index) => ({
      text: passage, image: 'private_room', delay: index * 1000, duration: 1000,
    })),
  };
}

function skipButton(tree: unknown) {
  return find(tree, node => node.props?.accessibilityLabel === 'Skip transition');
}

test('Skip requires a separate confirmation and cancelling keeps the same page at reader pace', () => {
  const harness = mount(shortEvent());
  try {
    const original = harness.render();
    jest.advanceTimersByTime(1000);
    // Two callbacks from the original button cannot confirm the second action.
    press(skipButton(original));
    press(skipButton(original));
    jest.advanceTimersByTime(1);
    let tree = harness.render();
    expect(byId(tree, 'phase-transition-skip-confirmation')).toBeDefined();
    expect(text(byId(tree, 'phase-transition-reading'))).toContain('First passage.');
    expect(harness.onComplete).not.toHaveBeenCalled();
    const staleConfirm = byId(tree, 'phase-transition-confirm-skip');
    press(byId(tree, 'phase-transition-keep-reading'));
    press(staleConfirm);
    tree = harness.render();
    expect(byId(tree, 'phase-transition-skip-confirmation')).toBeUndefined();
    jest.advanceTimersByTime(60_000);
    expect(text(harness.render())).toContain('First passage.');
    expect(harness.onComplete).not.toHaveBeenCalled();
    press(skipButton(harness.render()));
    tree = harness.render();
    press(byId(tree, 'phase-transition-confirm-skip'));
    press(byId(tree, 'phase-transition-confirm-skip'));
    expect(harness.onComplete).toHaveBeenCalledTimes(1);
  } finally { harness.dispose(); }
});

test('Android Back asks before skipping and Back from that prompt returns to the same page', () => {
  const harness = mount(shortEvent());
  try {
    harness.render();
    expect(mockBackListener?.()).toBe(true);
    expect(byId(harness.render(), 'phase-transition-skip-confirmation')).toBeDefined();
    expect(harness.onComplete).not.toHaveBeenCalled();
    expect(mockBackListener?.()).toBe(true);
    const tree = harness.render();
    expect(byId(tree, 'phase-transition-skip-confirmation')).toBeUndefined();
    expect(text(tree)).toContain('First passage.');
    expect(harness.onComplete).not.toHaveBeenCalled();
  } finally { harness.dispose(); }
  expect(mockBackListener).toBeUndefined();
});

test('Android Back navigates to the previous passage without opening Skip confirmation', () => {
  const harness = mount(shortEvent());
  try {
    press(byId(harness.render(), 'phase-transition-next'));
    jest.advanceTimersByTime(350);
    expect(text(harness.render())).toContain('Second passage.');
    expect(mockBackListener?.()).toBe(true);
    const tree = harness.render();
    expect(text(tree)).toContain('First passage.');
    expect(byId(tree, 'phase-transition-skip-confirmation')).toBeUndefined();
    expect(harness.onComplete).not.toHaveBeenCalled();
  } finally { harness.dispose(); }
});

test('backgrounding preserves the unread page and foregrounding still waits for Continue', () => {
  const harness = mount(shortEvent());
  try {
    const original = harness.render();
    jest.advanceTimersByTime(1000);
    mockAppStateListener?.('background');
    // Native AppState can change before React commits the pause and its cleanup.
    jest.advanceTimersByTime(60_000);
    press(byId(original, 'phase-transition-next'));
    press(skipButton(original));
    expect(text(harness.render())).toContain('First passage.');
    expect(harness.onComplete).not.toHaveBeenCalled();
    mockAppStateListener?.('active');
    expect(text(harness.render())).toContain('First passage.');
    jest.advanceTimersByTime(60_000);
    expect(text(harness.render())).toContain('First passage.');
    press(byId(harness.render(), 'phase-transition-next'));
    expect(text(harness.render())).toContain('Second passage.');
  } finally { harness.dispose(); }
  expect(mockAppStateListener).toBeUndefined();
});

test.each([false, true])('all ceremonies wait indefinitely on every page with reduced motion %s', reducedMotion => {
  mockReducedMotion = reducedMotion;
  for (const event of phaseEvents) {
    const harness = mount(event);
    try {
      for (let page = 0; page < event.scenes.length; page++) {
        harness.render();
        jest.advanceTimersByTime(600_000);
        const tree = harness.render();
        expect(text(byId(tree, 'phase-transition-reading'))).toContain(event.scenes[page].text);
        expect(harness.onComplete).not.toHaveBeenCalled();
        press(byId(tree, 'phase-transition-next'));
      }
      expect(harness.onComplete).toHaveBeenCalledTimes(1);
    } finally { harness.dispose(); }
  }
});

test('reading text and scrolling are passive; only navigation controls change the passage', () => {
  const harness = mount(shortEvent());
  try {
    const tree = harness.render();
    const reading = byId(tree, 'phase-transition-reading');
    expect(find(reading, node => node.type === 'Pressable')).toBeUndefined();
    (reading!.props!.onScroll as (event: unknown) => void)({ nativeEvent: { contentOffset: { y: 80 } } });
    jest.advanceTimersByTime(60_000);
    expect(text(harness.render())).toContain('First passage.');
    expect(harness.onComplete).not.toHaveBeenCalled();
  } finally { harness.dispose(); }
});

test('suspension preserves a revisited passage and ignores queued navigation until resumed', () => {
  const harness = mount(shortEvent());
  try {
    press(byId(harness.render(), 'phase-transition-next'));
    jest.advanceTimersByTime(350);
    const second = harness.render();
    expect(harness.render(true)).toBeNull();
    press(byId(second, 'phase-transition-next'));
    press(byId(second, 'phase-transition-back'));
    jest.advanceTimersByTime(60_000);
    expect(text(harness.render())).toContain('Second passage.');
    press(byId(harness.render(), 'phase-transition-back'));
    jest.advanceTimersByTime(350);
    const first = harness.render();
    harness.render(true);
    press(byId(first, 'phase-transition-next'));
    jest.advanceTimersByTime(60_000);
    expect(text(harness.render())).toContain('First passage.');
    expect(harness.onComplete).not.toHaveBeenCalled();
  } finally { harness.dispose(); }
});

test('rapid Continue taps across renders and stale page callbacks cannot consume unseen pages', () => {
  const harness = mount(shortEvent(true));
  try {
    const first = byId(harness.render(), 'phase-transition-next');
    press(first);
    press(first);
    let tree = harness.render();
    expect(text(tree)).toContain('Second passage.');
    press(byId(tree, 'phase-transition-next'));
    jest.advanceTimersByTime(349);
    press(byId(tree, 'phase-transition-next'));
    expect(text(harness.render())).toContain('Second passage.');
    jest.advanceTimersByTime(1);
    press(first);
    expect(text(harness.render())).toContain('Second passage.');
    press(byId(tree, 'phase-transition-next'));
    tree = harness.render();
    expect(text(tree)).toContain('Last passage.');
    press(byId(tree, 'phase-transition-next'));
    expect(harness.onComplete).not.toHaveBeenCalled();
    jest.advanceTimersByTime(350);
    press(byId(tree, 'phase-transition-next'));
    press(byId(tree, 'phase-transition-next'));
    expect(harness.onComplete).toHaveBeenCalledTimes(1);
  } finally { harness.dispose(); }
});

test('callbacks from an old event cannot finish its replacement or advance it', () => {
  const onePage = { ...shortEvent(true), scenes: shortEvent(true).scenes.slice(0, 1) };
  const harness = mount(onePage);
  try {
    const original = harness.render();
    press(skipButton(original));
    const confirmation = byId(harness.render(), 'phase-transition-confirm-skip');
    harness.render(false, shortEvent(true));
    jest.advanceTimersByTime(0);
    press(confirmation);
    press(byId(original, 'phase-transition-next'));
    press(skipButton(original));
    const tree = harness.render();
    expect(text(tree)).toContain('First passage.');
    expect(byId(tree, 'phase-transition-skip-confirmation')).toBeUndefined();
    expect(harness.onComplete).not.toHaveBeenCalled();
  } finally { harness.dispose(); }
});

test('unmount cancels timers and makes already queued input callbacks inert', () => {
  const onePage = { ...shortEvent(), scenes: shortEvent().scenes.slice(0, 1) };
  const harness = mount(onePage);
  const original = harness.render();
  harness.dispose();
  jest.advanceTimersByTime(60_000);
  press(byId(original, 'phase-transition-next'));
  press(skipButton(original));
  expect(harness.onComplete).not.toHaveBeenCalled();
});
