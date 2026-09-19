/** New residents delegate to the durable intro flow after the unlock reload. */
const stateStore = new Map<number, unknown>();
const refStore = new Map<number, { current: unknown }>();
let stateIndex = 0;
let refIndex = 0;
let effects: (() => void | (() => void))[] = [];

jest.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = stateIndex++;
    if (!stateStore.has(index)) stateStore.set(index, initial);
    return [stateStore.get(index), (value: unknown) => stateStore.set(index, value)];
  },
  useRef: (initial: unknown) => {
    const index = refIndex++;
    if (!refStore.has(index)) refStore.set(index, { current: initial });
    return refStore.get(index);
  },
  useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => void | (() => void)) => effects.push(fn),
  useLayoutEffect: (fn: () => void | (() => void)) => effects.push(fn),
}));

jest.mock('../services/homeWorldData', () => ({
  ANIMALS: [{ id: 'rabbit', type: 'rabbit', name: 'Thyme' }],
  purchaseUnlock: jest.fn(async () => ({ success: true })),
  reserveNextUnlock: jest.fn(async () => ({ success: true })),
  skipUnlockGate: jest.fn(async () => ({ success: true })),
  skipReservedUnlock: jest.fn(async () => ({ success: true })),
  getNextUnlock: jest.fn(),
  getUnlockStatus: jest.fn(async () => []),
  isUnlockAvailable: jest.fn(async () => ({ available: true })),
  canReserveUnlock: jest.fn(async () => false),
  canSkipUnlockGate: jest.fn(async () => false),
  getReservedSpeedUpState: jest.fn(async () => 'none'),
}));
jest.mock('../services/amberCurrency', () => ({
  getAmberBalance: jest.fn(async () => 20),
  getReservedUnlockId: jest.fn(async () => null),
  invalidateProgressCache: jest.fn(),
}));
jest.mock('../services/persistenceStorage', () => ({
  ...jest.requireActual('../services/persistenceStorage'),
  recoverPendingStorageTransaction: jest.fn(async () => true),
}));
jest.mock('../services/saveRetry', () => ({ saveWithPlayerRetry: jest.fn(async (save: () => Promise<unknown>) => save()) }));
jest.mock('../services/haptics', () => ({ hapticError: jest.fn(), hapticLight: jest.fn(), hapticSuccess: jest.fn() }));
jest.mock('../services/uiSound', () => ({ playUiSound: jest.fn() }));

import { useUnlockFlow } from '../hooks/useUnlockFlow';
import { Animal, Room } from '../types/homeWorld';
import { getNextUnlock, purchaseUnlock, reserveNextUnlock, skipUnlockGate, skipReservedUnlock } from '../services/homeWorldData';
import { hapticError } from '../services/haptics';
import { recoverPendingStorageTransaction, StorageRecoveryRequiredError } from '../services/persistenceStorage';
import { saveWithPlayerRetry } from '../services/saveRetry';

const loadAllData = jest.fn(async () => {});
const setIntroAnimal = jest.fn();
const setIntroDialogueIndex = jest.fn();
const setShowIntroDialogue = jest.fn();
const resetIntroOverrides = jest.fn();
const setShowCelebration = jest.fn();
const characterUnlock = { id: 'character_rabbit', type: 'character', targetId: 'rabbit', cost: 0 };
const emptyDen = { id: 'cozy_den', isUnlocked: true } as Room;
const waitingFox = { id: 'fox', type: 'fox', roomId: 'cozy_den', isUnlocked: false } as Animal;
const foxInvite = { id: 'character_fox', type: 'character', targetId: 'fox', cost: 0 };

function render(onAnimalIntroduction?: (animal: Animal) => Promise<void>, deferAutomaticInvite = false) {
  stateIndex = 0;
  refIndex = 0;
  const effectStart = effects.length;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const hook = useUnlockFlow({
    progress: null, animals: [waitingFox], loadAllData, setShowCelebration,
    setIntroAnimal, setIntroDialogueIndex, setShowIntroDialogue, resetIntroOverrides,
    onAnimalIntroduction, deferAutomaticInvite,
  });
  effects.slice(effectStart).forEach(effect => effect());
  return hook;
}

beforeEach(() => {
  stateStore.clear();
  refStore.clear();
  effects = [];
  jest.clearAllMocks();
  (getNextUnlock as jest.Mock).mockResolvedValue(foxInvite);
  jest.useFakeTimers();
});
afterEach(() => { jest.useRealTimers(); });

it('leaves the first invite to the home reveal, without closing an invite already opened there', async () => {
  const hook = render(undefined, true);
  await hook.refreshUnlockData([emptyDen], [waitingFox]);
  expect(render(undefined, true).nextUnlock).toEqual(foxInvite);
  expect(render(undefined, true).showInvitePrompt).toBe(false);
  // HomeScreen's reveal timer owns this opening; a subsequent data refresh
  // must not hide the modal or expose the underlying greeting again.
  hook.setShowInvitePrompt(true);
  await hook.refreshUnlockData([emptyDen], [waitingFox]);
  expect(render(undefined, true).showInvitePrompt).toBe(true);
});

it('still opens a waiting free invite automatically outside the home reveal', async () => {
  await render().refreshUnlockData([emptyDen], [waitingFox]);
  expect(render().showInvitePrompt).toBe(true);
});

it('lets a deliberate den tap open the invite during the home reveal', async () => {
  await render(undefined, true).refreshUnlockData([emptyDen], [waitingFox]);
  render(undefined, true).handleRoomPress(emptyDen);
  expect(render(undefined, true).showInvitePrompt).toBe(true);
});

it('uses the current reveal policy when an earlier unlock read finishes', async () => {
  let finish!: (value: typeof foxInvite) => void;
  (getNextUnlock as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const pending = render().refreshUnlockData([emptyDen], [waitingFox]);
  render(undefined, true);
  finish(foxInvite);
  await pending;
  expect(render(undefined, true).showInvitePrompt).toBe(false);
});

it('uses the latest intro callback after the purchase refresh, without opening the generic intro', async () => {
  const stale = jest.fn(async () => {});
  const current = jest.fn(async () => {});
  const hook = render(stale);
  await hook.handlePurchase(characterUnlock as never);
  expect(loadAllData).toHaveBeenCalledTimes(1);
  expect(stale).not.toHaveBeenCalled();
  render(current);
  await jest.advanceTimersByTimeAsync(300);
  expect(stale).not.toHaveBeenCalled();
  expect(current).toHaveBeenCalledWith(expect.objectContaining({ type: 'rabbit' }));
  expect(setIntroAnimal).not.toHaveBeenCalled();
  expect(setShowIntroDialogue).not.toHaveBeenCalled();
});

it.each(['handlePurchase', 'handleSkip', 'handleSpeedUpReserved'] as const)(
  '%s preserves the generic introduction fallback and clears stale override text', async (action) => {
    const hook = render();
    await hook[action](characterUnlock as never);
    await jest.advanceTimersByTimeAsync(300);
    expect(resetIntroOverrides).toHaveBeenCalledTimes(1);
    expect(setIntroAnimal).toHaveBeenCalledWith(expect.objectContaining({ type: 'rabbit' }));
    expect(setIntroDialogueIndex).toHaveBeenCalledWith(0);
    expect(setShowIntroDialogue).toHaveBeenCalledWith(true);
  }
);

it('reports an opening failure without treating the purchase as failed or consuming an intro', async () => {
  const showIntroduction = jest.fn(async () => { throw new Error('disk full'); });
  await render(showIntroduction).handlePurchase(characterUnlock as never);
  await jest.advanceTimersByTimeAsync(300);
  expect(render(showIntroduction).purchaseError).toMatch(/friend has arrived.*Tap them to try again/);
  expect(loadAllData).toHaveBeenCalledTimes(1);
  expect(setShowIntroDialogue).not.toHaveBeenCalled();
});

it('cancels a delayed introduction on unmount', async () => {
  const showIntroduction = jest.fn(async () => {});
  const hook = render(showIntroduction);
  const cleanups = effects.map(effect => effect());
  await hook.handlePurchase(characterUnlock as never);
  cleanups.forEach(cleanup => cleanup?.());
  await jest.advanceTimersByTimeAsync(300);
  expect(showIntroduction).not.toHaveBeenCalled();
});

it('honors purchases whose caller supplies its own intro', async () => {
  const showIntroduction = jest.fn(async () => {});
  await render(showIntroduction).handlePurchase(characterUnlock as never, { suppressIntro: true });
  await jest.advanceTimersByTimeAsync(300);
  expect(showIntroduction).not.toHaveBeenCalled();
  expect(setShowIntroDialogue).not.toHaveBeenCalled();
});

it.each([
  ['handlePurchase', purchaseUnlock],
  ['handleReserve', reserveNextUnlock],
  ['handleSkip', skipUnlockGate],
  ['handleSpeedUpReserved', skipReservedUnlock],
] as const)('%s catches an uncommitted storage failure and keeps the purchase retryable', async (action, service) => {
  (service as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  const result = await render()[action](characterUnlock as never);
  if (action === 'handlePurchase') expect(result).toBe(false);
  expect(render().purchaseError).toMatch(/could not save.*try again/);
  expect(hapticError).toHaveBeenCalledTimes(1);
  expect(loadAllData).not.toHaveBeenCalled();
  expect(setShowCelebration).not.toHaveBeenCalled();
});

it('completes a committed unlock journal without attempting a second purchase', async () => {
  (purchaseUnlock as jest.Mock).mockRejectedValueOnce(new StorageRecoveryRequiredError(new Error('disk full')));
  expect(await render().handlePurchase(characterUnlock as never)).toBe(true);
  expect(purchaseUnlock).toHaveBeenCalledTimes(1);
  expect(saveWithPlayerRetry).toHaveBeenCalledTimes(1);
  expect(recoverPendingStorageTransaction).toHaveBeenCalledTimes(1);
  expect(loadAllData).toHaveBeenCalledTimes(1);
  expect(setShowCelebration).toHaveBeenCalledWith(true);
});

it('does not open a second purchase while the first is saving', async () => {
  let finish!: (value: { success: boolean }) => void;
  (purchaseUnlock as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const hook = render();
  const first = hook.handlePurchase(characterUnlock as never);
  expect(await hook.handlePurchase(characterUnlock as never)).toBe(false);
  finish({ success: true });
  expect(await first).toBe(true);
  expect(purchaseUnlock).toHaveBeenCalledTimes(1);
  expect(setShowCelebration).toHaveBeenCalledTimes(1);
});
