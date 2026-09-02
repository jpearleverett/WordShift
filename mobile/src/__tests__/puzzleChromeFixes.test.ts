/**
 * Puzzle-screen chrome regression pins (device playtest fix batch):
 *
 * 1) Difficulty chip fallback — the setup pill must ALWAYS render a real
 *    difficulty label. An out-of-union live value (a legacy/corrupt autosave
 *    restored wholesale used to poison both the state and the retained
 *    preference) rendered an EMPTY pill, and the same unset value could seed
 *    the next board with a shape matching no selected difficulty.
 * 2) DifficultyMenu structural bound — the PUZZLE SETUP panel renders inside
 *    a transparent full-window Modal whose padded flex layer gives the panel
 *    a DEFINITE height bound (maxHeight '100%'), with a shrinkable,
 *    indicator-visible ScrollView. Two arithmetic generations of this fix
 *    failed on device (Android does not deliver touches to children rendered
 *    outside their parent's bounds, and edge-to-edge insets poisoned the
 *    math); the Modal structure has no measurement left to be wrong.
 * 3) Onboarding home-button spacer — while the home route is withheld during
 *    the tutorial, the stand-in is an invisible layout spacer, never the
 *    styled circle (which read as a blank dead button).
 */

import fs from 'fs';
import path from 'path';

const stateStore: Map<number, unknown> = new Map();
let stateIndex = 0;
let effectCallbacks: (() => void | (() => void))[] = [];

const resetRenderState = () => {
  stateStore.clear();
  stateIndex = 0;
  effectCallbacks = [];
};

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = stateIndex++;
      if (!stateStore.has(index)) {
        stateStore.set(index, typeof initial === 'function' ? (initial as () => unknown)() : initial);
      }
      return [
        stateStore.get(index),
        (value: unknown) => stateStore.set(index, typeof value === 'function'
          ? (value as (previous: unknown) => unknown)(stateStore.get(index))
          : value),
      ];
    },
    useEffect: (effect: () => void | (() => void)) => {
      effectCallbacks.push(effect);
    },
    useRef: (initial: unknown) => ({ current: initial }),
    useCallback: (fn: unknown) => fn,
  };
});

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  Image: 'Image',
  Modal: 'Modal',
  Pressable: 'Pressable',
  Platform: { OS: 'ios', select: (spec: Record<string, unknown>) => spec.ios },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  useWindowDimensions: () => ({ width: 400, height: 800 }),
  // The setup menu now plays a house entrance (backdrop fade + modalIn spring);
  // start(cb) invokes its completion callback so the animated close still calls
  // onClose synchronously (preserving the backdrop-dismiss assertion below).
  Animated: {
    View: 'AnimatedView',
    Text: 'AnimatedText',
    Image: 'AnimatedImage',
    Value: jest.fn().mockImplementation((val: number) => ({
      _value: val,
      interpolate: jest.fn().mockReturnValue('interpolated'),
      setValue: jest.fn(),
      stopAnimation: jest.fn(),
    })),
    timing: jest.fn().mockReturnValue({ start: (cb?: () => void) => cb && cb(), stop: jest.fn() }),
    spring: jest.fn().mockReturnValue({ start: (cb?: () => void) => cb && cb(), stop: jest.fn() }),
    parallel: jest.fn().mockReturnValue({ start: (cb?: () => void) => cb && cb(), stop: jest.fn() }),
    sequence: jest.fn().mockReturnValue({ start: (cb?: () => void) => cb && cb(), stop: jest.fn() }),
    delay: jest.fn().mockReturnValue({ start: (cb?: () => void) => cb && cb(), stop: jest.fn() }),
  },
  Easing: {
    in: (fn: unknown) => fn,
    out: (fn: unknown) => fn,
    inOut: (fn: unknown) => fn,
    ease: (t: number) => t,
    quad: (t: number) => t,
    cubic: (t: number) => t,
    sin: (t: number) => t,
  },
  StyleSheet: {
    absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => {
      if (Array.isArray(style)) {
        return style.reduce<Record<string, unknown>>((acc, item) => {
          if (item && typeof item === 'object') Object.assign(acc, item);
          return acc;
        }, {});
      }
      return style;
    },
  },
}));

jest.mock('../components/ui/PanelCard', () => ({
  PanelCard: (props: { children: unknown; style?: unknown }) => {
    const React = require('react');
    return React.createElement('PanelCard', { style: props.style }, props.children);
  },
}));
jest.mock('../hooks/useScreenInsets', () => ({
  useScreenInsets: () => ({ top: 44, bottom: 34 }),
}));
jest.mock('../components/puzzle/modeIcons', () => ({
  getModeIconSprite: () => null,
}));

import {
  DifficultyMenu,
  DIFFICULTY_LEVELS,
  isValidDifficulty,
  normalizeDifficulty,
  getDifficultyChipLabel,
} from '../components/puzzle/DifficultyMenu';

const APP_TSX = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');
const MENU_TSX = fs.readFileSync(
  path.resolve(__dirname, '../components/puzzle/DifficultyMenu.tsx'),
  'utf8',
);
const APP_STYLES = fs.readFileSync(path.resolve(__dirname, '../styles/appStyles.ts'), 'utf8');

type Element = {
  type?: unknown;
  props?: Record<string, unknown> & { children?: unknown };
};

const findByType = (node: unknown, type: string): Element | null => {
  if (node == null || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByType(child, type);
      if (found) return found;
    }
    return null;
  }
  const element = node as Element;
  // Host components stub to strings; mocked function components (PanelCard)
  // stay un-invoked without a renderer, so match their function name too.
  const elementType = element.type as { name?: string } | string | undefined;
  if (
    elementType === type ||
    (typeof elementType === 'function' && (elementType as { name?: string }).name === type)
  ) return element;
  return findByType(element.props?.children, type);
};

const flattenStyle = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((acc, item) => {
      if (item && typeof item === 'object') Object.assign(acc, flattenStyle(item));
      return acc;
    }, {});
  }
  return (style && typeof style === 'object') ? (style as Record<string, unknown>) : {};
};

const findAllByProp = (node: unknown, prop: string, value: unknown): Element[] => {
  const out: Element[] = [];
  const walk = (current: unknown): void => {
    if (current == null || typeof current !== 'object') return;
    if (Array.isArray(current)) {
      current.forEach(walk);
      return;
    }
    const element = current as Element;
    if (element.props?.[prop] === value) out.push(element);
    walk(element.props?.children);
  };
  walk(node);
  return out;
};

beforeEach(() => {
  resetRenderState();
});

describe('difficulty chip fallback (blank-pill regression)', () => {
  test('helpers accept exactly the four real difficulties', () => {
    for (const d of DIFFICULTY_LEVELS) {
      expect(isValidDifficulty(d)).toBe(true);
      expect(normalizeDifficulty(d)).toBe(d);
    }
    for (const bad of [undefined, null, '', 'easy', 'TUTORIAL', 'MEDIUMPLUS', 42, {}]) {
      expect(isValidDifficulty(bad)).toBe(false);
      expect(normalizeDifficulty(bad)).toBe('MEDIUM');
    }
  });

  test('chip label is NEVER empty: valid values render themselves, anything else falls back', () => {
    expect(getDifficultyChipLabel('EASY')).toBe('EASY');
    expect(getDifficultyChipLabel('MEDIUM')).toBe('MEDIUM');
    expect(getDifficultyChipLabel('MEDIUM_PLUS')).toBe('MED+');
    expect(getDifficultyChipLabel('HARD')).toBe('HARD');
    // The blank-pill defect: an unset/legacy value must still yield a label.
    for (const bad of [undefined, null, '', 'easy', 'medium_plus']) {
      const label = getDifficultyChipLabel(bad);
      expect(label.length).toBeGreaterThan(0);
      expect(label).toBe('MEDIUM');
    }
  });

  test('App renders the chip (label + seal + a11y) through the normalizer', () => {
    expect(APP_TSX).toMatch(/const chipDifficulty = normalizeDifficulty\(puzzle\.difficulty\)/);
    expect(APP_TSX).toMatch(/\{getDifficultyChipLabel\(puzzle\.difficulty\)\}/);
    // The tier mark is the generated wax-seal emblem keyed by the NORMALIZED
    // difficulty (an unset/legacy value would otherwise index a missing sprite).
    expect(APP_TSX).toMatch(/DIFFICULTY_ART\[chipDifficulty\]/);
    expect(APP_TSX).toMatch(/Difficulty \$\{chipDifficulty\}/);
    // The raw value must no longer reach the chip Text directly.
    expect(APP_TSX).not.toMatch(/\{puzzle\.difficulty === 'MEDIUM_PLUS' \? 'MED\+' : puzzle\.difficulty\}/);
  });

  test('a board can never start from an unset difficulty', () => {
    // Play normalizes the request before startNewGame...
    expect(APP_TSX).toMatch(/const diff = normalizeDifficulty\(difficulty \|\| puzzle\.difficulty\)/);
    // ...and a saved board whose difficulty is outside the union is discarded
    // instead of restored (restore would poison state + retained preference).
    expect(APP_TSX).toMatch(
      /saved\.gameState === 'PLAYING' && !saved\.isPlayingDaily && isValidDifficulty\(saved\.difficulty\)/,
    );
  });
});

describe('DifficultyMenu height bound (clipped-panel regression)', () => {
  const baseProps = {
    visible: true,
    currentDifficulty: 'MEDIUM' as const,
    gameMode: 'standard' as const,
    currentVariant: 'standard' as const,
    variantOptions: [],
    phase: 0 as const,
    onSelectDifficulty: jest.fn(),
    onSelectVariant: jest.fn(),
    onToggleChallengeMode: jest.fn(),
  };

  test('the menu renders inside a transparent full-window Modal (structural bound)', () => {
    const tree = DifficultyMenu({ ...baseProps, onClose: jest.fn() });
    const modal = findByType(tree, 'Modal');
    expect(modal).not.toBeNull();
    expect(modal!.props?.transparent).toBe(true);
    expect(modal!.props?.statusBarTranslucent).toBe(true);
    // Android back must dismiss.
    expect(typeof modal!.props?.onRequestClose).toBe('function');
  });

  test('panel is capped at the definite 100% of the padded modal layer', () => {
    const tree = DifficultyMenu(baseProps);
    const panel = findByType(tree, 'PanelCard');
    expect(panel).not.toBeNull();
    const style = flattenStyle(panel!.props?.style);
    // '100%' is DEFINITE here: the parent layer carries inline top/bottom
    // paddings built from the live insets, and the Modal gives it the whole
    // window. No arithmetic bound to drift on any device.
    expect(style.maxHeight).toBe('100%');
  });

  test('the padded layer carries the anchor offset and the bottom safe-area', () => {
    const tree = DifficultyMenu(baseProps);
    const layers = findAllByProp(tree, 'pointerEvents', 'box-none');
    expect(layers.length).toBeGreaterThanOrEqual(1);
    const style = flattenStyle(layers[0].props?.style);
    // mocked insets: top 44 + anchor 171; bottom 34 + margin 12.
    expect(style.paddingTop).toBe(44 + 171);
    expect(style.paddingBottom).toBe(34 + 12);
    expect(style.flex).toBe(1);
  });

  test('the option list scrolls: shrinkable region, visible indicator, safe bottom padding', () => {
    const tree = DifficultyMenu(baseProps);
    const scroll = findByType(tree, 'ScrollView');
    expect(scroll).not.toBeNull();
    expect(scroll!.props?.showsVerticalScrollIndicator).toBe(true);
    const style = flattenStyle(scroll!.props?.style);
    // flexShrink lets the list compress inside the '100%'-capped panel (and
    // then scroll); flexGrow 0 keeps short menus at natural height.
    expect(style.flexShrink).toBe(1);
    expect(style.flexGrow).toBe(0);
    const contentStyle = flattenStyle(scroll!.props?.contentContainerStyle);
    // The layer's bottom padding already clears the safe area, so the content
    // padding only needs the wood-band clearance.
    expect(contentStyle.paddingBottom as number).toBeGreaterThanOrEqual(28);
  });

  test('backdrop dismisses and no measurement arithmetic remains', () => {
    const onClose = jest.fn();
    const tree = DifficultyMenu({ ...baseProps, onClose });
    const backdrop = findByType(tree, 'Pressable');
    expect(backdrop).not.toBeNull();
    (backdrop!.props?.onPress as (() => void) | undefined)?.();
    expect(onClose).toHaveBeenCalled();
    // The failed arithmetic generation is gone for good: no window math, no
    // position measurement, no module-load Dimensions snapshot.
    expect(MENU_TSX).not.toMatch(/useWindowDimensions/);
    expect(MENU_TSX).not.toMatch(/measureInWindow/);
    expect(MENU_TSX).not.toMatch(/Dimensions\.get\('window'\)/);
  });
});

describe('onboarding home-button spacer (blank-circle regression)', () => {
  test('the withheld home button renders the invisible spacer, not the styled circle', () => {
    expect(APP_TSX).toMatch(/style=\{styles\.headerHomeSpacer\}/);
    expect(APP_TSX).toMatch(/headerHomeSpacer\}\s*\n\s*pointerEvents="none"/);
    expect(APP_TSX).toMatch(/accessible=\{false\}/);
    // The old placeholder (button chrome with no icon) must be gone.
    expect(APP_TSX).not.toMatch(/<View style=\{styles\.headerHomeButton\} \/>/);
  });

  test('spacer matches the button footprint with zero visible chrome; the real button is untouched', () => {
    const { appStyles } = require('../styles/appStyles');
    const spacer = appStyles.headerHomeSpacer as Record<string, unknown>;
    const button = appStyles.headerHomeButton as Record<string, unknown>;
    expect(spacer.width).toBe(button.width);
    expect(spacer.height).toBe(button.height);
    expect(spacer.backgroundColor).toBeUndefined();
    expect(spacer.borderRadius).toBeUndefined();
    expect(spacer.borderWidth).toBeUndefined();
    // Post-onboarding the real button keeps its exact circle chrome.
    expect(button.backgroundColor).toBe('rgba(255, 255, 255, 0.25)');
    expect(button.borderRadius).toBe(20);
    expect(APP_STYLES).toContain('headerHomeSpacer');
  });
});
