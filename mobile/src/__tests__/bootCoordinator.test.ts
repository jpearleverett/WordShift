import { BootServices, createBootCoordinator } from '../services/bootCoordinator';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};
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
  await Promise.resolve(); await Promise.resolve();
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
  for (let i = 0; i < 12; i++) await Promise.resolve();
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
