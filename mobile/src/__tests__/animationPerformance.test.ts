jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Image: 'Image',
  StyleSheet: {
    create: (styles: unknown) => styles,
    absoluteFillObject: {},
  },
  Dimensions: {
    get: () => ({ width: 400, height: 800 }),
  },
}));

jest.mock('react-native-reanimated', () => {
  const animated = {
    View: 'AnimatedView',
    createAnimatedComponent: (Component: unknown) => Component,
  };

  return {
    __esModule: true,
    default: animated,
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useDerivedValue: (factory: () => unknown) => ({ value: factory() }),
    withSpring: (value: unknown) => value,
    withTiming: (value: unknown) => value,
    withSequence: (...values: unknown[]) => values[values.length - 1],
    withDelay: (_delay: number, value: unknown) => value,
    withRepeat: (value: unknown) => value,
    cancelAnimation: jest.fn(),
    Easing: {
      out: (value: unknown) => value,
      in: (value: unknown) => value,
      inOut: (value: unknown) => value,
      cubic: 'cubic',
      quad: 'quad',
      sin: 'sin',
      back: (_amount: number) => 'back',
    },
  };
});

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Circle: 'Circle',
  RoundedRect: 'RoundedRect',
  BlurMask: 'BlurMask',
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: 'GestureDetector',
  Gesture: {
    Pan: () => ({
      enabled() { return this; },
      minDistance() { return this; },
      onBegin() { return this; },
      onStart() { return this; },
      onUpdate() { return this; },
      onEnd() { return this; },
      onFinalize() { return this; },
    }),
  },
}));

jest.mock('../services/settings', () => ({
  getSettingsSync: () => ({ reducedMotion: false }),
}));

jest.mock('../services/deviceTier', () => ({
  shouldSimplifyAnimations: () => false,
}));

jest.mock('../services/localGenerator', () => ({
  getWordPhaseTier: () => 0,
}));

jest.mock('../services/haptics', () => ({
  hapticSelection: jest.fn(),
  hapticHeavy: jest.fn(),
}));

import { shouldRenderTileGlow } from '../components/LetterTile';
import { areRowPropsEqual } from '../components/Row';

const noop = () => {};

function createRowProps(overrides: Record<string, unknown> = {}) {
  return {
    rowData: {
      id: 'row-1',
      originalWord: 'COLD',
      words: [
        { id: 'l1', char: 'C', isLocked: false },
        { id: 'l2', char: 'O', isLocked: false },
        { id: 'l3', char: 'L', isLocked: false },
        { id: 'l4', char: 'D', isLocked: false },
      ],
    },
    rowIndex: 3,
    activeRowIndex: 0,
    moveDirection: 'down',
    selectedLetter: null,
    onLetterPress: noop,
    onSlotPress: noop,
    isProcessing: false,
    phase: 0,
    wordLength: 4,
    concealLetters: false,
    guidanceActive: false,
    guidedLetterId: null,
    guidedSlotIndex: null,
    invalidDropSignal: 0,
    successDropSignal: 0,
    slotPreviews: undefined,
    onLetterDragDrop: noop,
    onDragActiveChange: noop,
    overlaySharedValues: undefined,
    onSetDragSnapshot: noop,
    ...overrides,
  };
}

describe('animation performance helpers', () => {
  test('only mounts tile glow canvas when needed', () => {
    expect(shouldRenderTileGlow(false, false)).toBe(false);
    expect(shouldRenderTileGlow(true, false)).toBe(true);
    expect(shouldRenderTileGlow(false, true)).toBe(false);
  });

  test('row comparator ignores unrelated selected-letter churn on distant rows', () => {
    const prev = createRowProps();
    const next = createRowProps({
      selectedLetter: { id: 'new-letter', char: 'A', isLocked: false },
      invalidDropSignal: 4,
      successDropSignal: 3,
    });

    expect(areRowPropsEqual(prev as never, next as never)).toBe(true);
  });

  test('row comparator rerenders source rows when selected letter changes', () => {
    const prev = createRowProps({ rowIndex: 0, activeRowIndex: 0 });
    const next = createRowProps({
      rowIndex: 0,
      activeRowIndex: 0,
      selectedLetter: { id: 'picked', char: 'C', isLocked: false },
    });

    expect(areRowPropsEqual(prev as never, next as never)).toBe(false);
  });

  test('row comparator rerenders target rows when previews or feedback signals change', () => {
    const prev = createRowProps({
      rowIndex: 1,
      activeRowIndex: 0,
      selectedLetter: { id: 'picked', char: 'C', isLocked: false },
      slotPreviews: [{ word: 'COLD', isValid: true }],
    });
    const next = createRowProps({
      rowIndex: 1,
      activeRowIndex: 0,
      selectedLetter: { id: 'picked', char: 'C', isLocked: false },
      slotPreviews: [{ word: 'CORD', isValid: true }],
    });
    const nextWithSignal = createRowProps({
      rowIndex: 1,
      activeRowIndex: 0,
      selectedLetter: { id: 'picked', char: 'C', isLocked: false },
      slotPreviews: [{ word: 'COLD', isValid: true }],
      successDropSignal: 1,
    });

    expect(areRowPropsEqual(prev as never, next as never)).toBe(false);
    expect(areRowPropsEqual(prev as never, nextWithSignal as never)).toBe(false);
  });
});
