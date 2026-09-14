/** Boot work can finish an in-flight durable write after cancellation, but it
 * must not start another stage or publish a ready session. Retried attempts
 * wait for that write before reading the save again. */
export interface BootServices {
  recoverStorage(): Promise<unknown>;
  installCloud(): void;
  restoreCloud(isCurrent: () => boolean): Promise<unknown>;
  holdUploads(pending: Promise<unknown>): void;
  migrate(): Promise<unknown>;
  recoverVictory(): Promise<unknown>;
  warmLocalState(): Promise<unknown>;
  reconcilePurchases(): Promise<readonly { grantId: string }[]>;
  settlePurchase(id: string): Promise<unknown>;
  startSession(onMotionChange: () => void): () => void;
}

export type BootResult = 'ready' | 'cancelled';

/** The boot stage a rejection came from (see getBootFailureStage). */
export type BootStage =
  | 'recoverStorage'
  | 'restoreCloud'
  | 'migrate'
  | 'recoverVictory'
  | 'warmLocalState'
  | 'reconcilePurchases'
  | 'settlePurchase'
  | 'startSession';

export interface BootOptions {
  /**
   * Skip the cloud restore stage only. The player's second escape from a boot
   * that keeps failing while checking the cloud backup: local recovery,
   * migrations, the pending victory and the paid grants all still run, and the
   * cloud provider is still installed so later uploads work as usual.
   */
  skipCloudRestore?: boolean;
}

// A failed stage is remembered on the rejection itself so the host can report
// WHICH stage failed (Sentry/event log) and decide which escape is safe to
// offer. WeakMap keeps the tag off the error's own shape.
const failedStages = new WeakMap<object, BootStage>();

/** The stage a boot rejection came from, when the coordinator tagged it. */
export function getBootFailureStage(error: unknown): BootStage | undefined {
  return error !== null && typeof error === 'object' ? failedStages.get(error) : undefined;
}

function tagStageFailure(stage: BootStage, error: unknown): object {
  // A non-object throw (a bare string) is wrapped so it can carry the tag.
  const tagged: object = error !== null && typeof error === 'object' ? error : new Error(String(error));
  failedStages.set(tagged, stage);
  return tagged;
}

async function runStage<T>(stage: BootStage, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw tagStageFailure(stage, error);
  }
}

export function createBootCoordinator(services: BootServices) {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    start(onMotionChange: () => void, options: BootOptions = {}) {
      let cancelled = false;
      let stopSession: (() => void) | undefined;
      const isCurrent = () => !cancelled;
      const done = tail.then(async (): Promise<BootResult> => {
        if (cancelled) return 'cancelled';
        await runStage('recoverStorage', () => services.recoverStorage());
        if (cancelled) return 'cancelled';
        services.installCloud();
        if (!options.skipCloudRestore) {
          const restored = runStage('restoreCloud', () => services.restoreCloud(isCurrent));
          services.holdUploads(restored);
          await restored;
          if (cancelled) return 'cancelled';
        }
        await runStage('migrate', () => services.migrate());
        if (cancelled) return 'cancelled';
        await runStage('recoverVictory', () => services.recoverVictory());
        if (cancelled) return 'cancelled';
        await runStage('warmLocalState', () => services.warmLocalState());
        if (cancelled) return 'cancelled';
        const grants = await runStage('reconcilePurchases', () => services.reconcilePurchases());
        for (const grant of grants) {
          if (cancelled) return 'cancelled';
          await runStage('settlePurchase', () => services.settlePurchase(grant.grantId));
        }
        if (cancelled) return 'cancelled';
        // Synchronous on purpose: no microtask may separate the cancel check
        // from the session handle, or a cancel landing in between would leave
        // the started session with nothing to stop it.
        try {
          stopSession = services.startSession(() => { if (!cancelled) onMotionChange(); });
        } catch (error) {
          throw tagStageFailure('startSession', error);
        }
        return 'ready';
      });
      // A failed attempt must not poison the serialization boundary for Retry.
      tail = done.catch(() => {});
      return {
        done,
        cancel() {
          cancelled = true;
          stopSession?.();
          stopSession = undefined;
        },
      };
    },
  };
}
