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

export function createBootCoordinator(services: BootServices) {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    start(onMotionChange: () => void) {
      let cancelled = false;
      let stopSession: (() => void) | undefined;
      const isCurrent = () => !cancelled;
      const done = tail.then(async (): Promise<BootResult> => {
        if (cancelled) return 'cancelled';
        await services.recoverStorage();
        if (cancelled) return 'cancelled';
        services.installCloud();
        const restored = services.restoreCloud(isCurrent);
        services.holdUploads(restored);
        await restored;
        if (cancelled) return 'cancelled';
        await services.migrate();
        if (cancelled) return 'cancelled';
        await services.recoverVictory();
        if (cancelled) return 'cancelled';
        await services.warmLocalState();
        if (cancelled) return 'cancelled';
        const grants = await services.reconcilePurchases();
        for (const grant of grants) {
          if (cancelled) return 'cancelled';
          await services.settlePurchase(grant.grantId);
        }
        if (cancelled) return 'cancelled';
        stopSession = services.startSession(() => { if (!cancelled) onMotionChange(); });
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
