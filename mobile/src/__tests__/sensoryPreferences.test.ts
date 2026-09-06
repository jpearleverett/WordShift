import * as Haptics from 'expo-haptics';
import { Animated } from 'react-native';
import { useDreadEffects } from '../hooks/useDreadEffects';
import { hapticMoveCommit } from '../services/haptics';

let preferences = { reducedMotion: true, hapticsEnabled: true };
jest.mock('../services/settings', () => ({
  getSettingsSync: () => preferences,
  getSettings: async () => preferences,
}));
jest.mock('react', () => ({
  useRef: (value: unknown) => ({ current: value }),
  useCallback: (callback: unknown) => callback,
  useEffect: () => {},
}));
jest.mock('react-native', () => ({
  Animated: {
    Value: jest.fn(() => ({ setValue: jest.fn() })),
    sequence: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    timing: jest.fn(),
  },
  Easing: { out: (value: unknown) => value, quad: 'quad' },
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

beforeEach(() => { jest.clearAllMocks(); preferences = { reducedMotion: true, hapticsEnabled: true }; });
async function settle() { for (let i = 0; i < 5; i++) await Promise.resolve(); }

test('reduced motion suppresses dread flash/shake while the enabled motor still gives feedback', async () => {
  const [, actions] = useDreadEffects();
  actions.triggerDreadPulse(4);
  await settle();
  expect(Animated.sequence).not.toHaveBeenCalled();
  expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
});

test('the haptic preference suppresses both dread and move feedback independently', async () => {
  preferences.hapticsEnabled = false;
  const [, actions] = useDreadEffects();
  actions.triggerDreadPulse(4);
  await hapticMoveCommit(5, true);
  await settle();
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
});

test('a reduced-motion move still uses the same touch preference as a dread word', async () => {
  await hapticMoveCommit(5, true);
  expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
});


test('disabling touch before a scheduled after-strike prevents that delayed motor hit', async () => {
  jest.useFakeTimers();
  try {
    await hapticMoveCommit(4, true);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    preferences.hapticsEnabled = false;
    jest.runOnlyPendingTimers();
    await settle();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  } finally { jest.useRealTimers(); }
});
