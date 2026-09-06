let mockQueue: unknown[];
jest.mock('react', () => ({
  useState: (initial: unknown[]) => {
    mockQueue ??= initial;
    return [mockQueue, (update: unknown[] | ((previous: unknown[]) => unknown[])) => {
      mockQueue = typeof update === 'function' ? update(mockQueue) : update;
    }];
  },
  useCallback: (callback: unknown) => callback,
}));
jest.mock('../services/achievements', () => ({
  checkAchievements: jest.fn(),
  buildAchievementCheckState: jest.fn(async () => ({})),
}));
jest.mock('../services/amberCurrency', () => ({}));
jest.mock('../services/dailyChallenge', () => ({}));
jest.mock('../services/haptics', () => ({ hapticHeavy: jest.fn() }));
jest.mock('../services/uiSound', () => ({ playUiSound: jest.fn() }));

import { useAchievementQueue } from '../hooks/useAchievementQueue';
import { checkAchievements } from '../services/achievements';

function renderHook() {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- Manual React harness invokes the hook under controlled state.
  return useAchievementQueue();
}

beforeEach(() => { mockQueue = []; jest.clearAllMocks(); });

test('a duplicate dismissal cannot discard the next achievement', async () => {
  (checkAchievements as jest.Mock).mockResolvedValue([{ id: 'first' }, { id: 'second' }]);
  await renderHook()[1].checkAchievementsNow();
  const [first, actions] = renderHook();
  expect(first.currentAchievement?.id).toBe('first');
  actions.dismissAchievement();
  actions.dismissAchievement();
  expect(renderHook()[0].currentAchievement?.id).toBe('second');
});

test('an old animation completion does not consume the currently visible toast', async () => {
  (checkAchievements as jest.Mock).mockResolvedValue([{ id: 'first' }, { id: 'second' }]);
  await renderHook()[1].checkAchievementsNow();
  const oldDismiss = renderHook()[1].dismissAchievement;
  oldDismiss();
  const second = renderHook();
  oldDismiss();
  expect(renderHook()[0].currentAchievement?.id).toBe('second');
  second[1].dismissAchievement();
  expect(renderHook()[0].currentAchievement).toBeNull();
});
