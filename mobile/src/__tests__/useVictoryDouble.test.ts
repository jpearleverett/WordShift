const mockStates: unknown[] = [];
const mockRefs: { current: unknown }[] = [];
let mockStateIndex = 0;
let mockRefIndex = 0;
let mockEffects: (() => void | (() => void))[] = [];
jest.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = mockStateIndex++;
    if (!(index in mockStates)) mockStates[index] = initial;
    return [mockStates[index], (value: unknown) => { mockStates[index] = value; }];
  },
  useRef: (initial: unknown) => {
    const index = mockRefIndex++;
    return mockRefs[index] ??= { current: initial };
  },
  useCallback: (callback: unknown) => callback,
  useLayoutEffect: (callback: () => void) => { callback(); },
  useEffect: (callback: () => void | (() => void)) => { mockEffects.push(callback); },
}));
jest.mock('../services/victoryDouble', () => ({ claimVictoryDouble: jest.fn() }));
jest.mock('../services/gameAlert', () => ({ showGameAlert: jest.fn() }));
import { useVictoryDouble } from '../hooks/useVictoryDouble';
import { claimVictoryDouble, VictoryDoubleResult } from '../services/victoryDouble';
import { showGameAlert } from '../services/gameAlert';
const grant = claimVictoryDouble as jest.Mock;
const balance = jest.fn();

function render(id: string | null = 'win-1') {
  mockStateIndex = 0;
  mockRefIndex = 0;
  // eslint-disable-next-line react-hooks/rules-of-hooks -- Controlled hook harness exercises async ownership before rerenders.
  return useVictoryDouble(id ? { harvestBatchId: id, amberEarned: 30 } : null, balance);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(ok => { resolve = ok; });
  return { promise, resolve };
}
async function flush() { for (let i = 0; i < 6; i++) await Promise.resolve(); }

beforeEach(() => {
  mockStates.length = 0;
  mockRefs.length = 0;
  mockEffects = [];
  jest.clearAllMocks();
  grant.mockResolvedValue({ status: 'claimed', amount: 30, newBalance: 130 });
});

test('same-frame double taps share one pending grant and the exit waits for it', async () => {
  const result = deferred<VictoryDoubleResult>();
  grant.mockReturnValueOnce(result.promise);
  const hook = render();
  const first = hook.claim();
  expect(hook.claim()).toBe(first);
  let left = false;
  const exit = hook.awaitPending().then(() => { left = true; });
  await flush();
  expect(grant).toHaveBeenCalledTimes(1);
  expect(left).toBe(false);
  result.resolve({ status: 'claimed', amount: 30, newBalance: 130 });
  await Promise.all([first, exit]);
  expect(left).toBe(true);
  expect(render().claimed).toBe(true);
  await hook.claim();
  expect(grant).toHaveBeenCalledTimes(1);
});

test('a delayed old grant cannot mark the next victory claimed, and its stale callback is inert', async () => {
  const result = deferred<VictoryDoubleResult>();
  grant.mockReturnValueOnce(result.promise);
  const old = render();
  const work = old.claim();
  await flush();
  render('win-2');
  result.resolve({ status: 'claimed', amount: 30, newBalance: 130 });
  await work;
  expect(render('win-2').claimed).toBe(false);
  await old.claim();
  expect(grant).toHaveBeenCalledTimes(1);
  await render('win-2').claim();
  expect(grant).toHaveBeenLastCalledWith('win-2');
  expect(render('win-2').claimed).toBe(true);
});

test('storage retry keeps navigation waiting and retries the captured victory without a new ad', async () => {
  grant.mockRejectedValueOnce(new Error('Storage full'));
  const hook = render();
  const work = hook.claim();
  let left = false;
  const exit = hook.awaitPending().then(() => { left = true; });
  await flush();
  expect(showGameAlert).toHaveBeenCalledTimes(1);
  expect(left).toBe(false);
  expect(render().claimed).toBe(false);
  (showGameAlert as jest.Mock).mock.calls[0][2][0].onPress();
  await Promise.all([work, exit]);
  expect(grant.mock.calls).toEqual([['win-1'], ['win-1']]);
  expect(balance).toHaveBeenCalledWith(130);
  expect(render().claimed).toBe(true);
});

test('session reset retires UI callbacks but keeps the in-flight reward owned until saved', async () => {
  const result = deferred<VictoryDoubleResult>();
  grant.mockReturnValueOnce(result.promise);
  const hook = render();
  const work = hook.claim();
  await flush();
  hook.reset();
  render('win-2');
  expect(render('win-2').claim()).toBe(work);
  result.resolve({ status: 'claimed', amount: 30, newBalance: 130 });
  await work;
  expect(balance).not.toHaveBeenCalled();
  expect(render('win-2').claimed).toBe(false);
});

test('unmount does not drop a grant already earned, but cannot publish stale UI', async () => {
  const result = deferred<VictoryDoubleResult>();
  grant.mockReturnValueOnce(result.promise);
  const hook = render();
  const cleanup = mockEffects[0]() as () => void;
  const work = hook.claim();
  await flush();
  cleanup();
  result.resolve({ status: 'claimed', amount: 30, newBalance: 130 });
  await work;
  expect(grant).toHaveBeenCalledTimes(1);
  expect(balance).not.toHaveBeenCalled();
});
