import type { PendingCeremony } from '../types/homeWorld';
import type { PhaseTransitionEvent } from '../services/phaseEvents';

jest.mock('../services/amberCurrency', () => ({
  acknowledgeCeremony: jest.fn(), getPendingCeremonies: jest.fn(),
}));
jest.mock('../services/gameAlert', () => ({ showGameAlert: jest.fn() }));

import { createCeremonyPlayback } from '../services/ceremonyPlayback';
import { showGameAlert } from '../services/gameAlert';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
async function settle() {
  for (let index = 0; index < 20; index++) await Promise.resolve();
}
function record(phase: 1 | 2 | 3, cycle = 0): PendingCeremony {
  return { id: `${cycle}:phase:${phase}`, phase, cycle, kind: 'phase', previousPhase: (phase - 1) as 0 | 1 | 2 };
}
const authoredEvent: PhaseTransitionEvent = {
  title: 'A scene', phase: 2, bgColor: '#100B15', textColor: '#F2E7D6', accentColor: '#E7C796',
  scenes: [{ text: 'A passage that is still owed.', delay: 0, duration: 1000 }],
};
function fixture(initial = [record(2)]) {
  let durable = initial.map(entry => ({ ...entry }));
  const read = jest.fn(async () => durable.map(entry => ({ ...entry })));
  const acknowledge = jest.fn(async (id: string) => { durable = durable.filter(entry => entry.id !== id); });
  const build = jest.fn(async (_entry: PendingCeremony) => authoredEvent);
  const onEvent = jest.fn<void, [PhaseTransitionEvent | null]>();
  const onWaiting = jest.fn<void, [boolean]>();
  const dependencies = { read, acknowledge, build, onEvent, onWaiting };
  return {
    dependencies,
    current: () => onEvent.mock.calls.at(-1)?.[0] ?? null,
    ids: () => durable.map(entry => entry.id),
    replace: (entries: PendingCeremony[]) => { durable = entries.map(entry => ({ ...entry })); },
  };
}

beforeEach(() => jest.clearAllMocks());

test('a fresh controller replays a durable unacknowledged scene without consuming it', async () => {
  const save = fixture();
  const first = createCeremonyPlayback(save.dependencies);
  await first.refresh();
  const oldPresentation = save.current();
  expect(oldPresentation?.scenes).toEqual(authoredEvent.scenes);
  expect(save.ids()).toEqual([record(2).id]);
  first.reset();
  const restarted = createCeremonyPlayback(save.dependencies);
  await restarted.refresh();
  expect(save.current()?.scenes).toEqual(authoredEvent.scenes);
  expect(save.current()).not.toBe(oldPresentation);
  expect(save.dependencies.acknowledge).not.toHaveBeenCalled();
  expect(save.ids()).toEqual([record(2).id]);
});

test('overlapping refreshes serialize reads and keep the same presentation and page owner', async () => {
  const save = fixture();
  const pendingRead = deferred<PendingCeremony[]>();
  save.dependencies.read.mockImplementationOnce(() => pendingRead.promise);
  const controller = createCeremonyPlayback(save.dependencies);
  const first = controller.refresh();
  const second = controller.refresh();
  await settle();
  expect(save.dependencies.read).toHaveBeenCalledTimes(1);
  pendingRead.resolve([record(2)]);
  await Promise.all([first, second]);
  const presentation = save.current();
  await controller.refresh();
  expect(save.current()).toBe(presentation);
  expect(save.dependencies.build).toHaveBeenCalledTimes(1);
  expect(save.dependencies.onEvent).toHaveBeenCalledTimes(1);
  expect(save.dependencies.acknowledge).not.toHaveBeenCalled();
  expect(save.dependencies.onWaiting).toHaveBeenLastCalledWith(false);
});

test('competing completion callbacks share one acknowledgement and cannot race the next scene', async () => {
  const save = fixture([record(2), record(3)]);
  const acknowledgement = deferred<void>();
  save.dependencies.acknowledge.mockImplementationOnce(async id => {
    await acknowledgement.promise;
    save.replace([record(3)]);
    expect(id).toBe(record(2).id);
  });
  const controller = createCeremonyPlayback(save.dependencies);
  await controller.refresh();
  const event = save.current();
  const first = controller.complete(event);
  const second = controller.complete(event);
  expect(second).toBe(first);
  await settle();
  expect(save.dependencies.acknowledge).toHaveBeenCalledTimes(1);
  expect(save.current()).toBe(event);
  expect(save.dependencies.onWaiting).toHaveBeenLastCalledWith(true);
  expect(save.ids()).toEqual([record(2).id, record(3).id]);
  acknowledgement.resolve();
  expect(await first).toEqual(record(2));
  expect(await second).toEqual(record(2));
  expect(save.ids()).toEqual([record(3).id]);
  expect(save.current()).not.toBe(event);
  expect(save.dependencies.onWaiting).toHaveBeenLastCalledWith(false);
});

test('a failed acknowledgement parks the scene until player retry and never consumes the next entry', async () => {
  const save = fixture([record(2), record(3)]);
  save.dependencies.acknowledge.mockRejectedValueOnce(new Error('storage unavailable'));
  const controller = createCeremonyPlayback(save.dependencies);
  await controller.refresh();
  const event = save.current();
  const finishing = controller.complete(event);
  await settle();
  expect(save.ids()).toEqual([record(2).id, record(3).id]);
  expect(save.current()).toBe(event);
  expect(save.dependencies.build).toHaveBeenCalledTimes(1);
  expect(save.dependencies.onWaiting).toHaveBeenLastCalledWith(true);
  expect(controller.complete(event)).toBe(finishing);
  expect(await controller.complete({ ...authoredEvent })).toBeNull();
  expect(showGameAlert).toHaveBeenCalledTimes(1);
  const buttons = jest.mocked(showGameAlert).mock.calls[0][2];
  expect(buttons?.[0].text).toBe('Retry save');
  buttons?.[0].onPress?.();
  await finishing;
  expect(save.dependencies.acknowledge.mock.calls.map(([id]) => id)).toEqual([record(2).id, record(2).id]);
  expect(save.ids()).toEqual([record(3).id]);
  expect(save.current()).not.toBe(event);
  expect(save.dependencies.onWaiting).toHaveBeenLastCalledWith(false);
});

test('queued scenes are presented in order and only explicit completion drains each entry', async () => {
  const queued = [record(1), record(2), record(3)];
  const save = fixture(queued);
  const controller = createCeremonyPlayback(save.dependencies);
  await controller.refresh();
  for (let index = 0; index < queued.length; index++) {
    expect(save.ids()).toEqual(queued.slice(index).map(entry => entry.id));
    expect(save.dependencies.build).toHaveBeenLastCalledWith(queued[index]);
    const event = save.current();
    expect(event).not.toBeNull();
    expect(await controller.complete(event)).toEqual(queued[index]);
  }
  expect(save.current()).toBeNull();
  expect(save.ids()).toEqual([]);
  expect(save.dependencies.acknowledge.mock.calls.map(([id]) => id)).toEqual(queued.map(entry => entry.id));
});

test('reset detaches an unfinished build so it cannot block or revive the next generation', async () => {
  const save = fixture();
  const oldBuild = deferred<PhaseTransitionEvent>();
  save.dependencies.build.mockImplementationOnce(() => oldBuild.promise);
  const controller = createCeremonyPlayback(save.dependencies);
  const oldRefresh = controller.refresh();
  await settle();
  expect(save.dependencies.build).toHaveBeenCalledTimes(1);
  controller.reset();
  save.replace([record(3)]);
  const newRefresh = controller.refresh();
  await settle();
  // Do not release the old promise to let the replacement make progress.
  expect(save.dependencies.build).toHaveBeenCalledTimes(2);
  await newRefresh;
  const replacement = save.current();
  expect(replacement).not.toBeNull();
  oldBuild.resolve({ ...authoredEvent, title: 'The abandoned scene' });
  await oldRefresh;
  expect(save.current()).toBe(replacement);
  expect(save.dependencies.onWaiting).toHaveBeenLastCalledWith(false);
  expect(save.dependencies.acknowledge).not.toHaveBeenCalled();
});

test('an abandoned build failure after reset cannot open a stale retry prompt over the replacement', async () => {
  const save = fixture();
  const oldBuild = deferred<PhaseTransitionEvent>();
  save.dependencies.build.mockImplementationOnce(() => oldBuild.promise);
  const controller = createCeremonyPlayback(save.dependencies);
  const oldRefresh = controller.refresh();
  await settle();
  controller.reset();
  save.replace([record(3)]);
  await controller.refresh();
  const replacement = save.current();
  oldBuild.reject(new Error('old generation failed'));
  await oldRefresh;
  expect(save.current()).toBe(replacement);
  expect(showGameAlert).not.toHaveBeenCalled();
});

test('a stale completion cannot acknowledge a new cycle that reused the same authored event', async () => {
  const save = fixture([record(2), record(2, 1)]);
  const controller = createCeremonyPlayback(save.dependencies);
  await controller.refresh();
  const oldEvent = save.current();
  await controller.complete(oldEvent);
  const nextCycleEvent = save.current();
  expect(nextCycleEvent).not.toBe(oldEvent);
  expect(await controller.complete(oldEvent)).toBeNull();
  expect(save.dependencies.acknowledge).toHaveBeenCalledTimes(1);
  expect(save.ids()).toEqual([record(2, 1).id]);
  expect(await controller.complete(nextCycleEvent)).toEqual(record(2, 1));
  expect(save.ids()).toEqual([]);
});
