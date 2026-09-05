import { clearEvents } from '../services/eventLogger';
/**
 * Monetization UI tests (PatronModal + RewardedAdButton).
 *
 * The test env is Node with no React renderer, so — like the hook tests — we mock
 * React's hooks to run synchronously and drive the component function ourselves.
 * `react-native` primitives are mocked to string tags (the project's component-test
 * convention), so a rendered component is a plain `React.createElement` tree we can
 * traverse: find nodes by `accessibilityLabel`, invoke their `onPress`, flush
 * effects, re-render, and assert on the resulting tree / on the mocked services.
 *
 * Coverage:
 *  - PatronModal renders the Patron benefits (amber bonus + gold theme).
 *  - A successful purchase grants/reflects Patron status.
 *  - The billing-unavailable path shows the calm "not available" state, never throws.
 *  - RewardedAdButton is hidden when no provider is connected, and for Patrons.
 *  - RewardedAdButton fires its reward callback on a completed view.
 */

// ---------------------------------------------------------------------------
// Manual synchronous React-hook mock (mirrors useGamePersistence.test.ts)
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
  TouchableOpacity: 'TouchableOpacity',
  Modal: 'Modal',
  Image: 'Image',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: (s: unknown) => s },
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
// Service mocks
// ---------------------------------------------------------------------------

jest.mock('../services/settings', () => ({
  getSettingsSync: () => ({ reducedMotion: true, soundEnabled: false, hapticsEnabled: false }),
}));

jest.mock('../services/haptics', () => ({
  hapticLight: jest.fn(),
  hapticMedium: jest.fn(),
}));

// AmberInline pulls in a real PNG require; stub to a plain element.
jest.mock('../components/AmberInline', () => ({
  AmberInline: () => null,
}));

const mockPurchaseProduct = jest.fn();
const mockRestorePurchases = jest.fn();
const mockGetProducts = jest.fn();
jest.mock('../services/iap', () => ({
  PRODUCT_IDS: {
    PATRON_KEY: 'com.wordshift.patron_key',
    COSMETIC_BUNDLE: 'com.wordshift.cosmetic_bundle',
    REMOVE_ADS: 'com.wordshift.remove_ads',
  },
  getProducts: (...args: unknown[]) => mockGetProducts(...args),
  purchaseProduct: (...args: unknown[]) => mockPurchaseProduct(...args),
  restorePurchases: (...args: unknown[]) => mockRestorePurchases(...args),
}));

let mockIsPatron = false;
let mockIsAdFree = false;
jest.mock('../services/entitlements', () => ({
  isPatronSync: () => mockIsPatron,
  isAdFreeSync: () => mockIsPatron || mockIsAdFree,
}));

const mockShowRewarded = jest.fn();
const mockIsRewardedCapReached = jest.fn();
let mockAdProviderName = 'Not Connected';
let mockAdsReady = false;
jest.mock('../services/ads', () => ({
  showRewarded: (...args: unknown[]) => mockShowRewarded(...args),
  isRewardedCapReached: (...args: unknown[]) => mockIsRewardedCapReached(...args),
  getAdProviderName: () => mockAdProviderName,
  isAdsReady: () => mockAdsReady,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { PatronModal } from '../components/monetization/PatronModal';
import { RewardedAdButton } from '../components/monetization/RewardedAdButton';
import { PATRON_AMBER_BONUS } from '../constants/gameBalance';

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

/** Collect all text content in the tree into one string. */
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

/** Render the component fn with the manual hook mock and flush effects once. */
async function renderC(Comp: (props: any) => unknown, props: Record<string, unknown>) {
  rewindHookIndices();
  const tree = Comp(props as any);
  // Run queued effects (they may schedule async work).
  const pending = effectCallbacks.slice();
  effectCallbacks = [];
  for (const e of pending) {
    const cleanup = e.fn();
    if (typeof cleanup === 'function') e.cleanup = cleanup;
  }
  // Let any awaited microtasks settle.
  await Promise.resolve();
  await Promise.resolve();
  return tree;
}

beforeEach(() => {
  resetHookState();
  mockIsPatron = false;
  mockIsAdFree = false;
  mockAdProviderName = 'Not Connected';
  mockAdsReady = false;
  mockPurchaseProduct.mockReset();
  mockRestorePurchases.mockReset();
  mockGetProducts.mockReset().mockResolvedValue([]);
  mockShowRewarded.mockReset();
  mockIsRewardedCapReached.mockReset().mockResolvedValue(false);
});

// ===========================================================================
// PatronModal
// ===========================================================================

describe('PatronModal', () => {
  it('renders the Patron benefits (amber bonus + gold tile theme)', async () => {
    const tree = await renderC(PatronModal as any, { visible: true, phase: 0, onClose: jest.fn() });
    const text = textOf(tree);
    expect(text).toContain('Become a Patron');
    // The +N amber benefit reads the real constant, not an invented number.
    // ('+' and the number render as adjacent text nodes; textOf space-joins them.)
    expect(text).toContain('+');
    expect(text).toContain(String(PATRON_AMBER_BONUS));
    expect(text).toContain('amber on every puzzle');
    // The exclusive cosmetic is named.
    expect(text).toContain('Patron');
    expect(text).toContain('tile set');
    // Restore affordance present for a non-Patron.
    expect(findByA11yLabel(tree, 'Restore purchases')).not.toBeNull();
  });

  it('reflects Patron status after a successful purchase', async () => {
    mockPurchaseProduct.mockImplementation(async () => {
      // A real purchase writes the entitlement before resolving; emulate that.
      mockIsPatron = true;
      return { success: true, productId: 'com.wordshift.patron_key' };
    });
    const onPatronChange = jest.fn();

    let tree = await renderC(PatronModal as any, {
      visible: true,
      phase: 0,
      onClose: jest.fn(),
      onPatronChange,
    });

    const buyBtn = findByA11yLabel(tree, 'Become a Patron');
    expect(buyBtn).toBeTruthy();
    await (buyBtn!.props as any).onPress();

    expect(mockPurchaseProduct).toHaveBeenCalledWith('com.wordshift.patron_key');
    expect(onPatronChange).toHaveBeenCalledWith(true);

    // Re-render → now shows the active-Patron state, no buy button.
    tree = await renderC(PatronModal as any, {
      visible: true,
      phase: 0,
      onClose: jest.fn(),
      onPatronChange,
    });
    expect(textOf(tree)).toContain('You are a Patron');
    expect(findByA11yLabel(tree, 'Become a Patron')).toBeNull();
  });

  it('shows a calm unavailable state when billing is unavailable (no throw)', async () => {
    // NoOp/unconfigured backend → success:false, error 'billing_unavailable'.
    mockPurchaseProduct.mockResolvedValue({ success: false, error: 'billing_unavailable' });

    let tree = await renderC(PatronModal as any, { visible: true, phase: 0, onClose: jest.fn() });
    const buyBtn = findByA11yLabel(tree, 'Become a Patron');
    expect(buyBtn).toBeTruthy();

    // Must not throw on the unavailable path.
    await expect((buyBtn!.props as any).onPress()).resolves.toBeUndefined();

    // Re-render → calm copy, still a non-Patron, no crash.
    tree = await renderC(PatronModal as any, { visible: true, phase: 0, onClose: jest.fn() });
    expect(textOf(tree)).toContain('available right now');
    expect(mockIsPatron).toBe(false);
  });

  it('restore that finds nothing leaves the player a non-Patron without error', async () => {
    mockRestorePurchases.mockResolvedValue({ entitlements: [] });
    const onPatronChange = jest.fn();
    const tree = await renderC(PatronModal as any, {
      visible: true,
      phase: 2,
      onClose: jest.fn(),
      onPatronChange,
    });
    const restoreBtn = findByA11yLabel(tree, 'Restore purchases');
    await (restoreBtn!.props as any).onPress();
    expect(mockRestorePurchases).toHaveBeenCalled();
    expect(onPatronChange).toHaveBeenCalledWith(false);
  });
});

// ===========================================================================
// RewardedAdButton
// ===========================================================================

describe('RewardedAdButton', () => {
  const baseProps = {
    placement: 'quest_bonus' as const,
    label: 'Tend the offering for bonus amber',
    phase: 0,
  };

  it('renders nothing when no ad provider is connected', async () => {
    mockAdProviderName = 'Not Connected';
    mockAdsReady = false;
    const tree = await renderC(RewardedAdButton as any, { ...baseProps, onReward: jest.fn() });
    expect(tree).toBeNull();
  });

  it('renders nothing when a provider is registered but not ready', async () => {
    mockAdProviderName = 'Google AdMob';
    mockAdsReady = false;
    const tree = await renderC(RewardedAdButton as any, { ...baseProps, onReward: jest.fn() });
    expect(tree).toBeNull();
  });

  it('renders a disabled affordance when unavailable but showWhenUnavailable is set', async () => {
    mockAdProviderName = 'Not Connected';
    mockAdsReady = false;
    const tree = await renderC(RewardedAdButton as any, {
      ...baseProps,
      onReward: jest.fn(),
      showWhenUnavailable: true,
    });
    expect(tree).not.toBeNull();
    const btn = findByA11yLabel(tree, baseProps.label);
    expect(btn).toBeTruthy();
    expect((btn!.props as any).accessibilityState.disabled).toBe(true);
  });

  it('is suppressed entirely for Patron holders even with a provider', async () => {
    mockAdProviderName = 'FakeAds';
    mockAdsReady = true;
    mockIsPatron = true;
    const tree = await renderC(RewardedAdButton as any, {
      ...baseProps,
      onReward: jest.fn(),
      showWhenUnavailable: true,
    });
    expect(tree).toBeNull();
  });

  it('fires onReward when the player completes a rewarded view', async () => {
    mockAdProviderName = 'FakeAds';
    mockAdsReady = true;
    mockShowRewarded.mockResolvedValue({ completed: true });
    const onReward = jest.fn();

    const tree = await renderC(RewardedAdButton as any, { ...baseProps, onReward });
    const btn = findByA11yLabel(tree, baseProps.label);
    expect(btn).toBeTruthy();

    await (btn!.props as any).onPress();

    expect(mockShowRewarded).toHaveBeenCalledWith('quest_bonus');
    expect(onReward).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire onReward when the view is not completed (dismissed)', async () => {
    mockAdProviderName = 'FakeAds';
    mockAdsReady = true;
    mockShowRewarded.mockResolvedValue({ completed: false, reason: 'dismissed' });
    const onReward = jest.fn();

    const tree = await renderC(RewardedAdButton as any, { ...baseProps, onReward });
    const btn = findByA11yLabel(tree, baseProps.label);
    await (btn!.props as any).onPress();

    expect(mockShowRewarded).toHaveBeenCalled();
    expect(onReward).not.toHaveBeenCalled();
  });
});

// These service/UI tests enqueue telemetry events; cancel their debounce before
// Jest disposes the module registry and its lazy telemetry import.
afterEach(clearEvents);
