/**
 * GiftOverlay tests (the marquee gift moment for the starter pack /
 * first-purchase 2x).
 *
 * Node env, no renderer — the project's component-test convention: React hooks
 * are mocked to run synchronously and `react-native` primitives become string
 * tags, so the rendered component is a plain `React.createElement` tree we can
 * traverse. The child chrome (PanelCard / CandyButton / RewardReveal) and the
 * theme/service leaves are mocked to trivial stubs so the test isolates
 * GiftOverlay's own presentation contract:
 *   - renders the gift title, subtitle, and each granted item (amount + label)
 *   - the single CTA dismisses via onClose
 *   - marks the reward moment (haptic + amber sound) when shown
 *   - renders nothing when not visible
 */

// ---------------------------------------------------------------------------
// Manual synchronous React-hook mock (mirrors monetizationUI.test.ts)
// ---------------------------------------------------------------------------

const stateStore: Map<number, unknown> = new Map();
let stateIndex = 0;
let effectCallbacks: { fn: () => void | (() => void); cleanup?: () => void }[] = [];
const refStore: Map<number, { current: unknown }> = new Map();
let refIndex = 0;

function resetHookState() {
  stateStore.clear();
  refStore.clear();
  stateIndex = 0;
  refIndex = 0;
  effectCallbacks = [];
}

function rewindHookIndices() {
  stateIndex = 0;
  refIndex = 0;
  effectCallbacks = [];
}

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useState: (initial: unknown) => {
      const idx = stateIndex++;
      if (!stateStore.has(idx)) {
        stateStore.set(idx, typeof initial === 'function' ? (initial as () => unknown)() : initial);
      }
      const value = stateStore.get(idx);
      const setter = (valOrFn: unknown) => {
        if (typeof valOrFn === 'function') {
          stateStore.set(idx, (valOrFn as (prev: unknown) => unknown)(stateStore.get(idx)));
        } else {
          stateStore.set(idx, valOrFn);
        }
      };
      return [value, setter];
    },
    useEffect: (fn: () => void | (() => void)) => {
      effectCallbacks.push({ fn });
    },
    useRef: (initial: unknown) => {
      const idx = refIndex++;
      if (!refStore.has(idx)) refStore.set(idx, { current: initial });
      return refStore.get(idx)!;
    },
    useCallback: (fn: unknown) => fn,
    useMemo: (fn: () => unknown) => fn(),
  };
});

// ---------------------------------------------------------------------------
// react-native primitives → string tags (component-test convention)
// ---------------------------------------------------------------------------

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Modal: 'Modal',
  Image: 'Image',
  StyleSheet: { create: (s: unknown) => s, absoluteFill: {} },
  Easing: {
    in: () => 'ease',
    out: () => 'ease',
    inOut: () => 'ease',
    ease: 'ease',
    quad: 'quad',
    sin: 'sin',
    cubic: 'cubic',
  },
  Animated: {
    View: 'AnimatedView',
    Value: jest.fn().mockImplementation((val: number) => ({
      _value: val,
      setValue: jest.fn(),
      interpolate: jest.fn().mockReturnValue('interpolated'),
    })),
    timing: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    spring: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    parallel: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    sequence: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
  },
}));

// ---------------------------------------------------------------------------
// Theme + service + child-chrome mocks (isolate GiftOverlay's own tree)
// ---------------------------------------------------------------------------

jest.mock('../theme/surfaces', () => ({
  SURFACE: { modalIn: { friction: 7, tension: 65 }, modalOutMs: 120 },
  getSurfaceTheme: () => ({
    overlay: 'rgba(0,0,0,0.5)',
    glow: '#fff',
    amberText: '#B8860B',
    title: '#222',
    muted: '#555',
    body: '#333',
  }),
}));

jest.mock('../theme/fonts', () => ({
  BODY_FONT: 'BodyFont',
  PIXEL_FONT_BOLD: 'PixelBold',
}));

const mockHapticSuccess = jest.fn();
jest.mock('../services/haptics', () => ({
  hapticSuccess: (...a: unknown[]) => mockHapticSuccess(...a),
}));

const mockPlayUiSound = jest.fn();
jest.mock('../services/uiSound', () => ({
  playUiSound: (...a: unknown[]) => mockPlayUiSound(...a),
}));

let mockReducedMotion = true;
jest.mock('../services/settings', () => ({
  getSettingsSync: () => ({ reducedMotion: mockReducedMotion, soundEnabled: false, hapticsEnabled: false }),
}));

jest.mock('../components/ui/PanelCard', () => {
  const R = jest.requireActual('react');
  return { PanelCard: ({ children }: { children: unknown }) => R.createElement('View', null, children) };
});

jest.mock('../components/ui/CandyButton', () => {
  const R = jest.requireActual('react');
  return {
    CandyButton: ({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) =>
      R.createElement('Text', { accessibilityLabel, onPress }, label),
  };
});

jest.mock('../components/ui/RewardReveal', () => {
  const R = jest.requireActual('react');
  return {
    RewardReveal: ({ amount, label }: { amount: number; label?: string }) =>
      R.createElement('Text', { accessibilityLabel: `reveal-${label ?? ''}` }, String(amount)),
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GiftOverlay } from '../components/monetization/GiftOverlay';

// ---------------------------------------------------------------------------
// Tiny tree helpers
// ---------------------------------------------------------------------------

type El = { props?: Record<string, unknown>; children?: unknown } & Record<string, unknown>;

function walk(node: unknown, visit: (el: El) => void): void {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach(n => walk(n, visit));
    return;
  }
  const el = node as El;
  if (el.props) {
    visit(el);
    walk((el.props as Record<string, unknown>).children, visit);
  }
}

function findByA11yLabel(tree: unknown, label: string): El | null {
  let found: El | null = null;
  walk(tree, el => {
    if (!found && (el.props as Record<string, unknown>)?.accessibilityLabel === label) found = el;
  });
  return found;
}

/** Collect the props of every rendered RewardReveal element (they carry `amount`). */
function collectReveals(tree: unknown): { amount: number; label?: string }[] {
  const out: { amount: number; label?: string }[] = [];
  walk(tree, el => {
    const p = el.props as Record<string, unknown> | undefined;
    if (p && typeof p.amount === 'number') out.push({ amount: p.amount as number, label: p.label as string });
  });
  return out;
}

function textOf(tree: unknown): string {
  const parts: string[] = [];
  walk(tree, el => {
    const children = (el.props as Record<string, unknown>)?.children;
    const collect = (c: unknown) => {
      if (typeof c === 'string' || typeof c === 'number') parts.push(String(c));
      else if (Array.isArray(c)) c.forEach(collect);
    };
    collect(children);
  });
  return parts.join(' ');
}

function renderC(Comp: (props: any) => unknown, props: Record<string, unknown>) {
  rewindHookIndices();
  const tree = Comp(props as any);
  const pending = effectCallbacks.slice();
  effectCallbacks = [];
  for (const e of pending) {
    const cleanup = e.fn();
    if (typeof cleanup === 'function') e.cleanup = cleanup;
  }
  return tree;
}

beforeEach(() => {
  resetHookState();
  mockReducedMotion = true;
  mockHapticSuccess.mockReset();
  mockPlayUiSound.mockReset();
});

// ===========================================================================

describe('GiftOverlay', () => {
  const starterProps = {
    visible: true,
    phase: 0,
    title: "The Keeper's Welcome",
    subtitle: 'A welcome gift, set on the shelf for you.',
    items: [
      { icon: 1, amount: 400, label: 'amber' },
      { icon: 2, amount: 5, label: 'hints' },
    ],
    onClose: jest.fn(),
  };

  it('renders the gift title, subtitle, and every granted item', () => {
    const tree = renderC(GiftOverlay as any, { ...starterProps, onClose: jest.fn() });
    const text = textOf(tree);
    expect(text).toContain('A GIFT');
    expect(text).toContain("The Keeper's Welcome");
    expect(text).toContain('A welcome gift, set on the shelf for you.');
    // Both granted items are presented as RewardReveals (amount + label).
    const reveals = collectReveals(tree);
    expect(reveals.map(r => r.amount)).toEqual(expect.arrayContaining([400, 5]));
    expect(reveals.find(r => r.label === 'amber')).toBeTruthy();
    expect(reveals.find(r => r.label === 'hints')).toBeTruthy();
  });

  it('renders a single CTA that dismisses via onClose', () => {
    const onClose = jest.fn();
    const tree = renderC(GiftOverlay as any, { ...starterProps, onClose });
    const cta = findByA11yLabel(tree, 'Accept gift');
    expect(cta).toBeTruthy();
    (cta!.props as any).onPress();
    // reducedMotion path closes immediately.
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('marks the reward moment (haptic + amber sound) when shown', () => {
    renderC(GiftOverlay as any, { ...starterProps, onClose: jest.fn() });
    expect(mockHapticSuccess).toHaveBeenCalledTimes(1);
    expect(mockPlayUiSound).toHaveBeenCalledWith('amber_earn');
  });

  it('renders the first-purchase single-item gift', () => {
    const tree = renderC(GiftOverlay as any, {
      visible: true,
      phase: 2,
      title: 'Doubled, with thanks',
      items: [{ icon: 1, amount: 240, label: 'amber' }],
      onClose: jest.fn(),
    });
    const text = textOf(tree);
    expect(text).toContain('Doubled, with thanks');
    const reveals = collectReveals(tree);
    expect(reveals).toHaveLength(1);
    expect(reveals[0].amount).toBe(240);
    expect(reveals[0].label).toBe('amber');
  });

  it('renders nothing when not visible', () => {
    const tree = renderC(GiftOverlay as any, { ...starterProps, visible: false, onClose: jest.fn() });
    expect(tree).toBeNull();
  });
});
