/**
 * useAppBoot: a boot that cannot open is REPORTED (Sentry + event log) with
 * the stage that threw, and the failed card gets a second escape that skips
 * only the cloud restore stage when that is the stage that failed.
 *
 * Manual synchronous React-hook harness (no renderer), the useSpeedTimer
 * pattern: effects run after each render when their deps change, with the
 * previous cleanup invoked first. The real bootCoordinator drives the
 * attempt so the stage tag on the rejection is the genuine one.
 */

type Effect = { deps: unknown[] | undefined; cleanup: void | (() => void) };
const states: unknown[] = [];
const refs: { current: unknown }[] = [];
const effects: Effect[] = [];
let pendingEffects: { index: number; fn: () => void | (() => void); deps: unknown[] | undefined }[] = [];
let stateIndex = 0;
let refIndex = 0;
let effectIndex = 0;
let reducerIndex = 0;
const reducers: unknown[] = [];

const depsChanged = (next: unknown[] | undefined, prev: unknown[] | undefined) =>
  !next || !prev || next.length !== prev.length || next.some((d, i) => !Object.is(d, prev[i]));

jest.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = stateIndex++;
    if (!(index in states)) states[index] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
    return [states[index], (value: unknown) => {
      states[index] = typeof value === 'function' ? (value as (prev: unknown) => unknown)(states[index]) : value;
    }];
  },
  useReducer: (reducer: (v: unknown) => unknown, initial: unknown) => {
    const index = reducerIndex++;
    if (!(index in reducers)) reducers[index] = initial;
    return [reducers[index], () => { reducers[index] = reducer(reducers[index]); }];
  },
  useRef: (initial: unknown) => {
    const index = refIndex++;
    return refs[index] ??= { current: initial };
  },
  useCallback: (callback: unknown) => callback,
  useEffect: (fn: () => void | (() => void), deps?: unknown[]) => {
    pendingEffects.push({ index: effectIndex++, fn, deps });
  },
}));

const reportError = jest.fn();
jest.mock('../services/errorReporting', () => ({ reportError: (...args: unknown[]) => reportError(...args) }));

import { createBootCoordinator, BootServices, BootOptions } from '../services/bootCoordinator';

// The app bootstrap is a real coordinator over stub services, so a failing
// stage produces the same tagged rejection production would.
let restoreCloud: jest.Mock;
let recoverStorage: jest.Mock;
const start = jest.fn();
jest.mock('../services/appBootstrap', () => ({
  appBootstrap: { start: (onMotion: () => void, options?: BootOptions) => start(onMotion, options) },
}));

import { useAppBoot } from '../hooks/useAppBoot';

function render() {
  stateIndex = 0;
  refIndex = 0;
  effectIndex = 0;
  reducerIndex = 0;
  pendingEffects = [];
  // eslint-disable-next-line react-hooks/rules-of-hooks -- controlled hook harness
  const result = useAppBoot();
  for (const effect of pendingEffects) {
    const previous = effects[effect.index];
    if (previous && !depsChanged(effect.deps, previous.deps)) continue;
    if (previous?.cleanup) previous.cleanup();
    effects[effect.index] = { deps: effect.deps, cleanup: effect.fn() };
  }
  return result;
}

const settle = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };

beforeEach(() => {
  states.length = 0;
  refs.length = 0;
  effects.length = 0;
  reducers.length = 0;
  reportError.mockClear();
  start.mockClear();
  restoreCloud = jest.fn().mockResolvedValue(false);
  recoverStorage = jest.fn().mockResolvedValue(undefined);
  const services: BootServices = {
    recoverStorage: () => recoverStorage(),
    installCloud: () => {},
    restoreCloud: (isCurrent) => restoreCloud(isCurrent),
    holdUploads: () => {},
    migrate: async () => {},
    recoverVictory: async () => {},
    warmLocalState: async () => {},
    reconcilePurchases: async () => [],
    settlePurchase: async () => {},
    startSession: () => () => {},
  };
  const coordinator = createBootCoordinator(services);
  start.mockImplementation((onMotion: () => void, options?: BootOptions) => coordinator.start(onMotion, options));
});

test('a cloud-restore failure is reported with its stage and offers the cloud-only continue', async () => {
  restoreCloud.mockRejectedValueOnce(new Error('conflict'));
  render();
  await settle();
  let hook = render();
  expect(hook.status).toBe('failed');
  expect(hook.failedStage).toBe('restoreCloud');
  expect(hook.canContinueWithoutCloud).toBe(true);
  expect(reportError).toHaveBeenCalledTimes(1);
  const [error, context] = reportError.mock.calls[0];
  expect((error as Error).message).toBe('conflict');
  expect(context).toEqual({ source: 'app_boot', metadata: { attempt: 0, stage: 'restoreCloud', skipCloudRestore: false } });
  expect(start).toHaveBeenLastCalledWith(expect.any(Function), { skipCloudRestore: false });

  // The second escape: the retry skips ONLY the cloud stage and opens.
  hook.continueWithoutCloud();
  hook = render();
  expect(hook.status).toBe('opening');
  expect(start).toHaveBeenLastCalledWith(expect.any(Function), { skipCloudRestore: true });
  await settle();
  hook = render();
  expect(hook.status).toBe('ready');
  expect(restoreCloud).toHaveBeenCalledTimes(1);
  expect(recoverStorage).toHaveBeenCalledTimes(2);
});

test('a local recovery failure is reported but never offers to skip the cloud stage; retry re-runs everything', async () => {
  recoverStorage.mockRejectedValueOnce(new Error('{bad'));
  render();
  await settle();
  let hook = render();
  expect(hook.status).toBe('failed');
  expect(hook.failedStage).toBe('recoverStorage');
  expect(hook.canContinueWithoutCloud).toBe(false);
  expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
    source: 'app_boot',
    metadata: { attempt: 0, stage: 'recoverStorage', skipCloudRestore: false },
  });

  hook.retry();
  hook = render();
  expect(start).toHaveBeenLastCalledWith(expect.any(Function), { skipCloudRestore: false });
  await settle();
  hook = render();
  expect(hook.status).toBe('ready');
  expect(restoreCloud).toHaveBeenCalledTimes(1);
});

test('a retry after the cloud-only continue restores the cloud stage', async () => {
  restoreCloud.mockRejectedValueOnce(new Error('conflict')).mockRejectedValueOnce(new Error('still down'));
  render();
  await settle();
  let hook = render();
  hook.continueWithoutCloud();
  render();
  await settle();
  hook = render();
  expect(hook.status).toBe('ready');
  // An ordinary retry (attempt 2) puts the cloud stage back: it fails again
  // and the report names the attempt and that the stage was NOT skipped.
  hook.retry();
  render();
  await settle();
  hook = render();
  expect(hook.status).toBe('failed');
  expect(reportError).toHaveBeenLastCalledWith(expect.any(Error), {
    source: 'app_boot',
    metadata: { attempt: 2, stage: 'restoreCloud', skipCloudRestore: false },
  });
});

test('a rejection after unmount is neither reported nor applied', async () => {
  restoreCloud.mockRejectedValueOnce(new Error('conflict'));
  render();
  // Unmount: run the effect cleanup.
  for (const effect of effects) effect.cleanup?.();
  await settle();
  expect(reportError).not.toHaveBeenCalled();
});
