/** Exercise the pit's real callbacks before React can repaint disabled controls. */
type Effect = () => void | (() => void);
type Hooks = {
  state: (initial: unknown) => unknown[];
  ref: (initial: unknown) => { current: unknown };
  memo: (factory: () => unknown, deps: readonly unknown[]) => unknown;
  effect: (callback: Effect, deps?: readonly unknown[]) => void;
};
let mockHooks: Hooks;
let mockBack: (() => boolean) | undefined;
let mockAppState: ((state: string) => void) | undefined;
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: (initial: unknown) => mockHooks.state(initial),
  useRef: (initial: unknown) => mockHooks.ref(initial),
  useMemo: (factory: () => unknown, deps: readonly unknown[]) => mockHooks.memo(factory, deps),
  useCallback: (callback: unknown, deps: readonly unknown[]) => mockHooks.memo(() => callback, deps),
  useEffect: (callback: Effect, deps?: readonly unknown[]) => mockHooks.effect(callback, deps),
  useLayoutEffect: (callback: Effect, deps?: readonly unknown[]) => mockHooks.effect(callback, deps),
}));
jest.mock('react-native', () => {
  const animation = () => ({ start: jest.fn(), stop: jest.fn() });
  return {
    View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', Modal: 'Modal', Image: 'Image',
    StyleSheet: { absoluteFill: {}, create: (value: unknown) => value },
    Platform: { OS: 'android' }, StatusBar: { currentHeight: 24 },
    Dimensions: { get: () => ({ width: 400, height: 800 }) },
    useWindowDimensions: () => ({ width: 400, height: 800 }),
    BackHandler: { addEventListener: (_: string, callback: () => boolean) => { mockBack = callback; return { remove: jest.fn() }; } },
    AppState: { currentState: 'active', addEventListener: (_: string, callback: (state: string) => void) => { mockAppState = callback; return { remove: jest.fn() }; } },
    Easing: { in: (x: unknown) => x, out: (x: unknown) => x, inOut: (x: unknown) => x, quad: jest.fn(), cubic: jest.fn(), linear: jest.fn(), sin: jest.fn() },
    Animated: {
      View: 'AnimatedView', Text: 'AnimatedText', Image: 'AnimatedImage',
      Value: jest.fn().mockImplementation((value: number) => ({ _value: value, setValue: jest.fn(), interpolate: jest.fn().mockReturnValue(0), stopAnimation: jest.fn() })),
      timing: animation, spring: animation, parallel: animation, sequence: animation, loop: animation, delay: animation,
      multiply: jest.fn().mockReturnValue(0), add: jest.fn().mockReturnValue(0),
    },
  };
});
jest.mock('../hooks/useScreenInsets', () => ({ useScreenInsets: () => ({ top: 20, bottom: 20 }) }));
jest.mock('../services/settings', () => ({ getSettingsSync: () => ({ reducedMotion: true }) }));
jest.mock('../services/deviceTier', () => ({ getDeviceTier: () => 'high', shouldSimplifyAnimations: () => true }));
jest.mock('../services/haptics', () => ({ hapticLight: jest.fn(), hapticMedium: jest.fn(), hapticHeavy: jest.fn() }));
jest.mock('../services/uiSound', () => ({ playUiSound: jest.fn(), stopCeremonyMusic: jest.fn() }));
jest.mock('../services/a11yAnnounce', () => ({ announceForA11y: jest.fn() }));
jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn() }));
jest.mock('../services/screenReady', () => ({ markScreenReady: jest.fn() }));
jest.mock('../services/localGenerator', () => ({ getStrongestDreadWord: () => null }));
jest.mock('../services/gameAlert', () => ({ showGameAlert: jest.fn() }));
jest.mock('../services/weeklyQuests', () => ({ updateQuestProgress: jest.fn(async () => []) }));
jest.mock('../services/wordHarvest', () => ({ getHarvestState: jest.fn(), offerBatch: jest.fn(), offerAllBatches: jest.fn(), settleBatchCredit: jest.fn(), reconcilePendingCredits: jest.fn(async () => []) }));
jest.mock('../services/amberCurrency', () => ({ confirmPhaseTransition: jest.fn(), markMandatoryHarvestSeen: jest.fn(async () => {}), hasSeenMandatoryHarvest: jest.fn(async () => true) }));
jest.mock('../services/tending', () => ({
  loadTendingState: jest.fn(async () => ({ level: 0 })),
  getNextTendingInfo: jest.fn(() => ({ nextLevel: 1, cost: 20 })),
  commitTendPurchase: jest.fn(), isTendingAvailable: (phase: number) => phase >= 5, getTendingIntensity: () => 0,
}));
jest.mock('../components/FoxGuide', () => ({ FoxGuide: 'FoxGuide' }));
jest.mock('../components/ui/UtilityMenu', () => ({ UtilityMenu: 'UtilityMenu' }));
jest.mock('../components/AmberInline', () => ({ AmberInline: 'AmberInline', AmberValue: 'AmberValue' }));
jest.mock('../components/ui/NineSlice', () => ({ NineSliceFrame: 'NineSliceFrame', ThreeSliceStrip: 'ThreeSliceStrip' }));

import { OfferingPitScreen, createPitCeremonyClock } from '../components/OfferingPitScreen';
import { confirmPhaseTransition } from '../services/amberCurrency';
import { getHarvestState, offerAllBatches, settleBatchCredit, HarvestState } from '../services/wordHarvest';
import { commitTendPurchase } from '../services/tending';
import { showGameAlert } from '../services/gameAlert';
import { announceForA11y } from '../services/a11yAnnounce';
import { PIT_WARD_COUNT, getPitTransitionCeremonyText } from '../services/phaseNarrative';
import { stopCeremonyMusic } from '../services/uiSound';
import type React from 'react';

type Props = React.ComponentProps<typeof OfferingPitScreen>;
type Node = { type?: unknown; props?: Record<string, unknown> & { children?: unknown } };
function find(tree: unknown, predicate: (node: Node) => boolean): Node | undefined {
  if (Array.isArray(tree)) return tree.map(child => find(child, predicate)).find(Boolean);
  if (!tree || typeof tree !== 'object') return undefined;
  const node = tree as Node;
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function byLabel(tree: unknown, label: string): Node {
  const node = find(tree, value => value.props?.accessibilityLabel === label);
  expect(node).toBeDefined();
  return node!;
}
function press(node: Node) { (node.props!.onPress as () => void)(); }
const emptyHarvest = { pendingBatches: [], totalWordsOffered: 0 } as unknown as HarvestState;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
async function flush() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
function mount(overrides: Partial<Props> = {}) {
  const props: Props = { phase: 0, amberBalance: 1000, phaseProgressFraction: 1, pendingPhaseTransition: 1, onClose: jest.fn(), onOpenStore: jest.fn(), onPhaseTransitionConfirmed: jest.fn(), onPhaseTransitionReady: jest.fn(), onNavigationGuardChange: jest.fn(), ...overrides };
  const values = new Map<number, unknown>();
  const effects = new Map<number, { deps?: readonly unknown[]; cleanup?: () => void }>();
  let pending: { index: number; callback: Effect; deps?: readonly unknown[] }[] = [];
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
    memo(factory, deps) {
      const index = cursor++;
      const previous = values.get(index) as { deps: readonly unknown[]; value: unknown } | undefined;
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) values.set(index, { deps, value: factory() });
      return (values.get(index) as { value: unknown }).value;
    },
    effect(callback, deps) {
      const index = cursor++;
      const previous = effects.get(index);
      if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous.deps?.[i]))) pending.push({ index, callback, deps });
    },
  };
  const render = (next: Partial<Props> = {}) => {
    Object.assign(props, next);
    let tree: unknown;
    let rounds = 0;
    do {
      cursor = 0; changed = false; pending = [];
      tree = OfferingPitScreen(props);
      for (const effect of pending) {
        effects.get(effect.index)?.cleanup?.();
        effects.set(effect.index, { deps: effect.deps, cleanup: effect.callback() || undefined });
      }
      if (++rounds > 20) throw new Error('Pit did not settle');
    } while (changed);
    return tree;
  };
  render();
  return { render, props, dispose: () => effects.forEach(effect => effect.cleanup?.()) };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.mocked(getHarvestState).mockResolvedValue(emptyHarvest);
  jest.mocked(confirmPhaseTransition).mockResolvedValue({ newPhase: 1, previousPhase: 0 });
});
afterEach(() => { jest.useRealTimers(); });

test('the ceremony clock preserves remaining foreground time and cancels paused callbacks', () => {
  const clock = createPitCeremonyClock();
  const first = jest.fn(); const second = jest.fn();
  clock.schedule(first, 1000);
  jest.advanceTimersByTime(400); clock.setActive(false);
  const cancel = clock.schedule(second, 200);
  jest.advanceTimersByTime(60000);
  expect(first).not.toHaveBeenCalled(); expect(second).not.toHaveBeenCalled();
  cancel(); clock.setActive(true); jest.advanceTimersByTime(599);
  expect(first).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1); expect(first).toHaveBeenCalledTimes(1);
  expect(second).not.toHaveBeenCalled(); clock.clear();
});

test('arrival, immediate duplicate ignition, home/store/menu and Android Back cannot bypass the rite', async () => {
  const harness = mount(); await flush();
  const tree = harness.render();
  press(byLabel(tree, 'Return home'));
  press(byLabel(tree, '1000 amber. Tap to open the store'));
  press(byLabel(tree, 'Open utility menu'));
  expect(harness.props.onClose).not.toHaveBeenCalled(); expect(harness.props.onOpenStore).not.toHaveBeenCalled();
  expect(mockBack!()).toBe(true);
  const guard = jest.mocked(harness.props.onNavigationGuardChange!).mock.calls[0][0]!;
  expect(guard()).toBe(true);
  const activate = byLabel(tree, 'Activate the ward marks');
  press(activate); press(activate);
  expect(stopCeremonyMusic).toHaveBeenCalledTimes(1);
  harness.render(); jest.advanceTimersByTime(20000); await flush();
  expect(confirmPhaseTransition).toHaveBeenCalledTimes(1);
  expect(harness.props.onPhaseTransitionConfirmed).toHaveBeenCalledWith(1);
  harness.dispose();
});

test('background time does not advance text or confirm, and rapid taps cannot consume unread lines', async () => {
  const harness = mount(); await flush();
  press(byLabel(harness.render(), 'Activate the ward marks')); harness.render();
  jest.advanceTimersByTime(PIT_WARD_COUNT * 200 + 200 + 650);
  const firstLine = getPitTransitionCeremonyText(1)[0];
  expect(announceForA11y).toHaveBeenLastCalledWith(firstLine);
  mockAppState!('background'); jest.advanceTimersByTime(60000);
  expect(confirmPhaseTransition).not.toHaveBeenCalled();
  expect(announceForA11y).toHaveBeenLastCalledWith(firstLine);
  mockAppState!('active'); jest.advanceTimersByTime(400);
  const advance = byLabel(harness.render(), 'Continue the ceremony');
  for (let i = 0; i < 8; i++) press(advance);
  expect(announceForA11y).toHaveBeenCalledTimes(2);
  expect(confirmPhaseTransition).not.toHaveBeenCalled();
  jest.advanceTimersByTime(20000); await flush();
  expect(confirmPhaseTransition).toHaveBeenCalledTimes(1);
  harness.dispose();
});

test('cancelling the initial wait does not permanently consume the auto-start', async () => {
  const harness = mount(); await flush(); harness.render();
  jest.advanceTimersByTime(500);
  harness.render({ isOnboarding: true });
  harness.render({ isOnboarding: false });
  jest.advanceTimersByTime(20000); await flush();
  expect(confirmPhaseTransition).toHaveBeenCalledTimes(1);
  harness.dispose();
});

test('unmounting before confirmation cannot advance the phase and a return starts the pending rite', async () => {
  const first = mount(); await flush();
  press(byLabel(first.render(), 'Activate the ward marks'));
  first.render(); jest.advanceTimersByTime(500); first.dispose();
  jest.advanceTimersByTime(60000); await flush();
  expect(confirmPhaseTransition).not.toHaveBeenCalled();
  const returned = mount(); await flush(); returned.render();
  jest.advanceTimersByTime(20000); await flush();
  expect(confirmPhaseTransition).toHaveBeenCalledTimes(1);
  returned.dispose();
});

test('failed phase saving remains fenced, retries only persistence, and hands off after forced unmount', async () => {
  const completion = deferred<{ newPhase: 1; previousPhase: 0 }>();
  jest.mocked(confirmPhaseTransition).mockRejectedValueOnce(new Error('full storage')).mockReturnValueOnce(completion.promise);
  const harness = mount(); await flush(); harness.render();
  jest.advanceTimersByTime(20000); await flush();
  expect(showGameAlert).toHaveBeenCalledTimes(1);
  expect(harness.props.onPhaseTransitionConfirmed).not.toHaveBeenCalled();
  expect(mockBack!()).toBe(true);
  const buttons = jest.mocked(showGameAlert).mock.calls[0][2]!;
  buttons[0].onPress!(); await flush(); harness.dispose();
  completion.resolve({ newPhase: 1, previousPhase: 0 }); await flush();
  expect(confirmPhaseTransition).toHaveBeenCalledTimes(2);
  expect(harness.props.onPhaseTransitionConfirmed).toHaveBeenCalledTimes(1);
  expect(harness.props.onPhaseTransitionReady).toHaveBeenCalledTimes(1);
  expect(offerAllBatches).not.toHaveBeenCalled();
});

test('a recovered no-op phase save still wakes the parent ceremony queue', async () => {
  jest.mocked(confirmPhaseTransition).mockResolvedValueOnce(null);
  const harness = mount(); await flush(); harness.render();
  jest.advanceTimersByTime(20000); await flush();
  expect(harness.props.onPhaseTransitionReady).toHaveBeenCalledTimes(1);
  expect(harness.props.onPhaseTransitionConfirmed).not.toHaveBeenCalled();
  harness.dispose();
});

test('Offer All double tap plus same-task home/back stays one offer through credit settlement', async () => {
  jest.mocked(getHarvestState).mockResolvedValue({ ...emptyHarvest, pendingBatches: [{ id: 'batch', words: ['CAT'], amberValue: 20 }] } as unknown as HarvestState);
  const offering = deferred<Awaited<ReturnType<typeof offerAllBatches>>>();
  const credit = deferred<number>();
  jest.mocked(offerAllBatches).mockReturnValueOnce(offering.promise);
  jest.mocked(settleBatchCredit).mockReturnValueOnce(credit.promise);
  const harness = mount({ pendingPhaseTransition: null }); await flush();
  const tree = harness.render();
  const button = find(tree, node => typeof node.props?.accessibilityLabel === 'string' && node.props.accessibilityLabel.includes('amber from 1 words'))!;
  expect(button).toBeDefined();
  press(button); press(button); press(byLabel(tree, 'Return home'));
  expect(mockBack!()).toBe(true); expect(harness.props.onClose).not.toHaveBeenCalled();
  expect(offerAllBatches).toHaveBeenCalledTimes(1);
  offering.resolve({ creditId: 'credit', amberAwarded: 20, wordsOffered: 1 } as Awaited<ReturnType<typeof offerAllBatches>>); await flush();
  expect(mockBack!()).toBe(true);
  jest.mocked(getHarvestState).mockResolvedValue(emptyHarvest);
  credit.resolve(1020); await flush();
  jest.advanceTimersByTime(2000); await flush();
  expect(settleBatchCredit).toHaveBeenCalledTimes(1);
  expect(mockBack!()).toBe(false);
  harness.dispose();
});

test('tending cannot double-purchase or close the modal before its durable result', async () => {
  const purchase = deferred<Awaited<ReturnType<typeof commitTendPurchase>>>();
  jest.mocked(commitTendPurchase).mockReturnValueOnce(purchase.promise);
  const harness = mount({ phase: 5, pendingPhaseTransition: null }); await flush();
  let tree = harness.render();
  press(find(tree, node => typeof node.props?.accessibilityLabel === 'string' && node.props.accessibilityLabel.startsWith('Tend the pattern,'))!);
  await flush(); tree = harness.render();
  const button = find(tree, node => typeof node.props?.accessibilityLabel === 'string' && node.props.accessibilityLabel.includes('20 amber') && node.props.accessibilityLabel !== '1000 amber. Tap to open the store')!;
  expect(button).toBeDefined(); press(button); press(button);
  press(byLabel(tree, 'Close tending'));
  expect(mockBack!()).toBe(true); expect(commitTendPurchase).toHaveBeenCalledTimes(1);
  expect(find(harness.render(), node => node.type === 'Modal')?.props?.visible).toBe(true);
  purchase.resolve({ success: true, newBalance: 980, level: 1, milestone: null, totalAmberTended: 20, amountSpent: 20, recovered: false }); await flush();
  expect(mockBack!()).toBe(false); harness.dispose();
});
