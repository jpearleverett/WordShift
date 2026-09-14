import { BootServices, createBootCoordinator, getBootFailureStage } from '../services/bootCoordinator';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};
// Each stage now runs inside a tagging wrapper (one more await per stage), so
// a stage "in flight" is a few microtasks further along than a bare await.
const flush = async (turns: number) => { for (let i = 0; i < turns; i++) await Promise.resolve(); };
function fixture(overrides: Partial<BootServices> = {}) {
  const stages: string[] = [];
  const stop = jest.fn();
  const stage = (name: string) => jest.fn(async () => { stages.push(name); });
  const services: BootServices = {
    recoverStorage: stage('storage'), installCloud: () => { stages.push('provider'); },
    restoreCloud: stage('restore'), holdUploads: () => { stages.push('hold'); },
    migrate: stage('migrate'), recoverVictory: stage('victory'), warmLocalState: stage('local'),
    reconcilePurchases: async () => { stages.push('purchases'); return [{ grantId: 'paid-1' }, { grantId: 'paid-2' }]; },
    settlePurchase: async (id) => { stages.push(id); },
    startSession: jest.fn(() => { stages.push('session'); return stop; }),
    ...overrides,
  };
  return { coordinator: createBootCoordinator(services), stages, stop, services };
}

test('ready requires recovered writes, bounded restore, migrations, local caches and every paid grant', async () => {
  const f = fixture();
  const boot = f.coordinator.start(jest.fn());
  await expect(boot.done).resolves.toBe('ready');
  expect(f.stages).toEqual(['storage', 'provider', 'restore', 'hold', 'migrate', 'victory', 'local', 'purchases', 'paid-1', 'paid-2', 'session']);
  boot.cancel(); boot.cancel();
  expect(f.stop).toHaveBeenCalledTimes(1);
});

test('unmount during cloud restore prevents migration or mounting optional SDKs', async () => {
  const waiting = deferred();
  let canApply!: () => boolean;
  const f = fixture({ restoreCloud: (current) => { canApply = current; return waiting.promise; } });
  const boot = f.coordinator.start(jest.fn());
  await flush(10);
  boot.cancel();
  expect(canApply()).toBe(false);
  waiting.resolve();
  await expect(boot.done).resolves.toBe('cancelled');
  expect(f.services.migrate).not.toHaveBeenCalled();
  expect(f.services.startSession).not.toHaveBeenCalled();
});

test('remount waits for a cancelled paid write before the next recovery reads storage', async () => {
  const waiting = deferred();
  const settle = jest.fn().mockImplementationOnce(() => waiting.promise).mockResolvedValue(undefined);
  const f = fixture({ settlePurchase: settle });
  const first = f.coordinator.start(jest.fn());
  await flush(40);
  expect(settle).toHaveBeenCalledWith('paid-1');
  first.cancel();
  const second = f.coordinator.start(jest.fn());
  await Promise.resolve();
  expect(f.services.recoverStorage).toHaveBeenCalledTimes(1);
  waiting.resolve();
  await expect(first.done).resolves.toBe('cancelled');
  await expect(second.done).resolves.toBe('ready');
  expect(f.services.recoverStorage).toHaveBeenCalledTimes(2);
  expect(f.services.startSession).toHaveBeenCalledTimes(1);
});

test('failed recovery stays closed and a fresh attempt can succeed', async () => {
  const recover = jest.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined);
  const f = fixture({ recoverStorage: recover });
  await expect(f.coordinator.start(jest.fn()).done).rejects.toThrow('disk full');
  expect(f.services.startSession).not.toHaveBeenCalled();
  await expect(f.coordinator.start(jest.fn()).done).resolves.toBe('ready');
});

test('system preference callbacks cannot update a disposed session', async () => {
  let notify!: () => void;
  const refresh = jest.fn();
  const f = fixture({ startSession: (callback) => { notify = callback; return jest.fn(); } });
  const boot = f.coordinator.start(refresh);
  await boot.done;
  notify(); boot.cancel(); notify();
  expect(refresh).toHaveBeenCalledTimes(1);
});

test('a rejection carries the stage it came from', async () => {
  const storage = fixture({ recoverStorage: jest.fn().mockRejectedValue(new Error('{bad')) });
  const storageError = await storage.coordinator.start(jest.fn()).done.catch((e: unknown) => e);
  expect(getBootFailureStage(storageError)).toBe('recoverStorage');

  const cloud = fixture({ restoreCloud: jest.fn().mockRejectedValue(new Error('conflict')) });
  const cloudError = await cloud.coordinator.start(jest.fn()).done.catch((e: unknown) => e);
  expect(getBootFailureStage(cloudError)).toBe('restoreCloud');
  expect(cloud.services.migrate).not.toHaveBeenCalled();

  const victory = fixture({ recoverVictory: jest.fn().mockRejectedValue(new Error('needs recovery')) });
  const victoryError = await victory.coordinator.start(jest.fn()).done.catch((e: unknown) => e);
  expect(getBootFailureStage(victoryError)).toBe('recoverVictory');

  // A bare string throw is wrapped so it can carry the tag too.
  const bare = fixture({ warmLocalState: jest.fn().mockRejectedValue('nope') });
  const bareError = await bare.coordinator.start(jest.fn()).done.catch((e: unknown) => e);
  expect(bareError).toBeInstanceOf(Error);
  expect((bareError as Error).message).toBe('nope');
  expect(getBootFailureStage(bareError)).toBe('warmLocalState');

  const session = fixture({ startSession: jest.fn(() => { throw new Error('no session'); }) });
  const sessionError = await session.coordinator.start(jest.fn()).done.catch((e: unknown) => e);
  expect(getBootFailureStage(sessionError)).toBe('startSession');
  expect(getBootFailureStage(new Error('untagged'))).toBeUndefined();
  expect(getBootFailureStage(null)).toBeUndefined();
});

test('skipCloudRestore skips ONLY the cloud restore stage', async () => {
  const restore = jest.fn().mockRejectedValue(new Error('conflict'));
  const hold = jest.fn();
  const f = fixture({ restoreCloud: restore, holdUploads: hold });
  await expect(f.coordinator.start(jest.fn()).done).rejects.toThrow('conflict');
  await expect(f.coordinator.start(jest.fn(), { skipCloudRestore: true }).done).resolves.toBe('ready');
  expect(restore).toHaveBeenCalledTimes(1);
  // The upload hold rode the first attempt's restore; the skipped attempt
  // never arms one.
  expect(hold).toHaveBeenCalledTimes(1);
  // Local recovery, the provider install, migrations, the pending victory,
  // local caches and every paid grant still run in order.
  expect(f.stages).toEqual(['storage', 'provider', 'storage', 'provider', 'migrate', 'victory', 'local', 'purchases', 'paid-1', 'paid-2', 'session']);
});
