import type React from 'react';

type Effect = () => void | (() => void);
let mockState = new Map<number, unknown>();
let mockRefs = new Map<number, { current: unknown }>();
let mockStateIndex = 0;
let mockRefIndex = 0;
let mockEffects: Effect[] = [];

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: (initial: unknown) => {
    const index = mockStateIndex++;
    if (!mockState.has(index)) mockState.set(index, typeof initial === 'function' ? (initial as () => unknown)() : initial);
    return [mockState.get(index), (value: unknown) => mockState.set(index, value)];
  },
  useRef: (initial: unknown) => {
    const index = mockRefIndex++;
    if (!mockRefs.has(index)) mockRefs.set(index, { current: initial });
    return mockRefs.get(index);
  },
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: Effect) => mockEffects.push(effect),
}));
jest.mock('react-native', () => {
  const inert = () => ({ start: jest.fn(), stop: jest.fn() });
  return {
    View: 'View', Text: 'Text', Image: 'Image', TouchableOpacity: 'TouchableOpacity',
    StyleSheet: { create: (styles: unknown) => styles },
    Animated: {
      View: 'AnimatedView', Value: class { setValue() {} },
      loop: inert, sequence: inert, timing: inert,
    },
  };
});
jest.mock('../services/settings', () => ({ getSettingsSync: () => ({ reducedMotion: true }) }));
jest.mock('../services/haptics', () => ({ hapticLight: jest.fn(), hapticMedium: jest.fn() }));
jest.mock('../components/AmberInline', () => ({ AmberInline: 'AmberInline' }));
jest.mock('../services/entitlements', () => ({ isPatronSync: () => false }));
let mockAdsReady = true;
const mockShowRewarded = jest.fn();
jest.mock('../services/ads', () => ({
  showRewarded: (...args: unknown[]) => mockShowRewarded(...args),
  isRewardedCapReached: async () => false,
  isAdsReady: () => mockAdsReady,
}));

import { RewardedAdButton } from '../components/monetization/RewardedAdButton';

type Props = React.ComponentProps<typeof RewardedAdButton>;
type Button = React.ReactElement<{ onPress: () => Promise<void>; disabled: boolean; accessibilityLabel: string }>;
function harness(overrides: Partial<Props> = {}) {
  let input: Props = { placement: 'daily_amber', phase: 0, label: 'Watch', onReward: jest.fn(), ...overrides };
  let cleanups: (() => void)[] = [];
  function render(changes: Partial<Props> = {}): Button {
    input = { ...input, ...changes };
    mockStateIndex = 0;
    mockRefIndex = 0;
    mockEffects = [];
    return RewardedAdButton(input) as Button;
  }
  const tree = render();
  cleanups = mockEffects.map(effect => effect()).filter((cleanup): cleanup is () => void => typeof cleanup === 'function');
  return { tree, render, unmount: () => cleanups.forEach(cleanup => cleanup()) };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  mockState = new Map();
  mockRefs = new Map();
  mockAdsReady = true;
  mockShowRewarded.mockReset().mockResolvedValue({ completed: true });
});

test('same-frame taps share one ad and stay locked until the async reward is saved', async () => {
  const ad = deferred<{ completed: boolean }>();
  const save = deferred<void>();
  mockShowRewarded.mockReturnValue(ad.promise);
  const onReward = jest.fn(() => save.promise);
  const onBusyChange = jest.fn();
  const ui = harness({ onReward, onBusyChange });
  const first = ui.tree.props.onPress();
  await ui.tree.props.onPress();
  expect(mockShowRewarded).toHaveBeenCalledTimes(1);
  ad.resolve({ completed: true });
  await Promise.resolve();
  expect(onReward).toHaveBeenCalledTimes(1);
  const saving = ui.render();
  expect(saving.props.disabled).toBe(true);
  await saving.props.onPress();
  expect(onReward).toHaveBeenCalledTimes(1);
  expect(onBusyChange.mock.calls).toEqual([[true]]);
  save.resolve();
  await first;
  expect(onBusyChange.mock.calls).toEqual([[true], [false]]);
  expect(ui.render().props.disabled).toBe(false);
});

test('an earned account reward is completed even when the Store unmounts during its ad', async () => {
  const ad = deferred<{ completed: boolean }>();
  mockShowRewarded.mockReturnValue(ad.promise);
  const onReward = jest.fn().mockResolvedValue(undefined);
  const onBusyChange = jest.fn();
  const ui = harness({ onReward, onBusyChange, completeAfterUnmount: true });
  const pending = ui.tree.props.onPress();
  ui.unmount();
  ad.resolve({ completed: true });
  await pending;
  expect(onReward).toHaveBeenCalledTimes(1);
  expect(onBusyChange.mock.calls).toEqual([[true], [false]]);
});

test('a stale screen-specific reward still does not rescue a board that has already closed', async () => {
  const ad = deferred<{ completed: boolean }>();
  mockShowRewarded.mockReturnValue(ad.promise);
  const onReward = jest.fn();
  const ui = harness({ onReward, placement: 'speed_rescue' });
  const pending = ui.tree.props.onPress();
  ui.unmount();
  ad.resolve({ completed: true });
  await pending;
  expect(onReward).not.toHaveBeenCalled();
});

test('a failed grant retries its original earned reward without watching another ad', async () => {
  const failedSave = new Error('save unavailable');
  const onReward = jest.fn().mockRejectedValueOnce(failedSave).mockResolvedValue(undefined);
  const onRewardError = jest.fn();
  const ui = harness({ onReward, onRewardError });
  await expect(ui.tree.props.onPress()).resolves.toBeUndefined();
  expect(onRewardError).toHaveBeenCalledWith(failedSave);
  // A depleted/disconnected ad provider must not hide an already earned grant.
  mockAdsReady = false;
  const unrelatedReward = jest.fn();
  const retry = ui.render({ onReward: unrelatedReward });
  expect(retry.props.disabled).toBe(false);
  expect(retry.props.accessibilityLabel).toBe('Retry saving your earned reward. No additional ad.');
  await retry.props.onPress();
  expect(mockShowRewarded).toHaveBeenCalledTimes(1);
  expect(onReward).toHaveBeenCalledTimes(2);
  expect(unrelatedReward).not.toHaveBeenCalled();
});

test('ad-provider rejection is handled and frees the parent operation lock for a later retry', async () => {
  mockShowRewarded.mockRejectedValueOnce(new Error('provider failed'));
  const onReward = jest.fn();
  const onBusyChange = jest.fn();
  const ui = harness({ onReward, onBusyChange });
  await expect(ui.tree.props.onPress()).resolves.toBeUndefined();
  expect(onReward).not.toHaveBeenCalled();
  const retry = ui.render();
  expect(retry.props.accessibilityLabel).toBe('Try again');
  await retry.props.onPress();
  expect(mockShowRewarded).toHaveBeenCalledTimes(2);
  expect(onReward).toHaveBeenCalledTimes(1);
  expect(onBusyChange.mock.calls).toEqual([[true], [false], [true], [false]]);
});

test('a parent operation that begins before rerender prevents a competing ad immediately', async () => {
  let parentBusy = false;
  const ui = harness({ canStart: () => !parentBusy });
  parentBusy = true;
  await ui.tree.props.onPress();
  expect(mockShowRewarded).not.toHaveBeenCalled();
  parentBusy = false;
  await ui.render({ disabled: true }).props.onPress();
  expect(mockShowRewarded).not.toHaveBeenCalled();
});

test('closing an ad without earning its reward never invokes the grant', async () => {
  mockShowRewarded.mockResolvedValue({ completed: false });
  const onReward = jest.fn();
  const ui = harness({ onReward });
  await ui.tree.props.onPress();
  expect(onReward).not.toHaveBeenCalled();
  expect(ui.render().props.disabled).toBe(false);
});
