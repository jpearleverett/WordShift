/**
 * Puzzle-screen chrome regression pins (device playtest fix batch):
 *
 * 1) Difficulty chip fallback — the setup pill must ALWAYS render a real
 *    difficulty label. An out-of-union live value (a legacy/corrupt autosave
 *    restored wholesale used to poison both the state and the retained
 *    preference) rendered an EMPTY pill, and the same unset value could seed
 *    the next board with a shape matching no selected difficulty.
 * 2) DifficultyMenu height bound — the PUZZLE SETUP panel is height-bounded
 *    to the visible area (live window height + safe-area insets + measured
 *    anchor top) with a shrinkable, indicator-visible ScrollView, so the last
 *    rows (e.g. Blind Return) can never be clipped past the screen bottom
 *    with no way to scroll.
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
  Platform: { OS: 'ios', select: (spec: Record<string, unknown>) => spec.ios },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  useWindowDimensions: () => ({ width: 400, height: 800 }),
  StyleSheet: {
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

  test('App renders the chip (label + dot + a11y) through the normalizer', () => {
    expect(APP_TSX).toMatch(/const chipDifficulty = normalizeDifficulty\(puzzle\.difficulty\)/);
    expect(APP_TSX).toMatch(/\{getDifficultyChipLabel\(puzzle\.difficulty\)\}/);
    expect(APP_TSX).toMatch(/chipDifficulty === 'EASY' && styles\.difficultyDotEasy/);
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

  test('panel carries a numeric maxHeight bounded to the visible area', () => {
    const tree = DifficultyMenu(baseProps);
    const panel = findByType(tree, 'PanelCard');
    expect(panel).not.toBeNull();
    const style = flattenStyle(panel!.props?.style);
    // window 800, insets top 44 / bottom 34, static anchor 171, margin 12:
    // 800 - 44 - 171 - 34 - 12 = 539 (within the 300..900 clamp).
    expect(style.maxHeight).toBe(539);
  });

  test('the option list scrolls: shrinkable region, visible indicator, safe bottom padding', () => {
    const tree = DifficultyMenu(baseProps);
    const scroll = findByType(tree, 'ScrollView');
    expect(scroll).not.toBeNull();
    expect(scroll!.props?.showsVerticalScrollIndicator).toBe(true);
    const style = flattenStyle(scroll!.props?.style);
    // flexShrink lets the list compress inside the bounded panel (and then
    // scroll) instead of growing the auto-height absolute anchor offscreen;
    // the arithmetic maxHeight stays as a backstop.
    expect(style.flexShrink).toBe(1);
    expect(style.flexGrow).toBe(0);
    expect(typeof style.maxHeight).toBe('number');
    expect(style.maxHeight as number).toBeLessThan(539);
    const contentStyle = flattenStyle(scroll!.props?.contentContainerStyle);
    // Bottom inset (34) rides the content padding so the last row clears the
    // home indicator.
    expect(contentStyle.paddingBottom as number).toBeGreaterThanOrEqual(28 + 34);
  });

  test('bounds derive from the LIVE window and the measurement retries after a rejected sample', () => {
    // Live dimensions, not the module-load Dimensions snapshot.
    expect(MENU_TSX).toMatch(/useWindowDimensions\(\)/);
    expect(MENU_TSX).not.toMatch(/Dimensions\.get\('window'\)/);
    // Re-measure on open: a zero-frame measureInWindow sample must not strand
    // the panel on the static header estimate forever.
    expect(MENU_TSX).toMatch(/useEffect\(\(\) => \{\s*\n\s*if \(!visible\) return undefined;/);
    expect(MENU_TSX).toMatch(/setTimeout\(measurePanelTop, 0\)/);
    expect(MENU_TSX).toMatch(/setTimeout\(measurePanelTop, 150\)/);
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
