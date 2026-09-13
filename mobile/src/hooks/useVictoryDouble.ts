import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { VictoryData } from './useGamePersistence';
import { claimVictoryDouble } from '../services/victoryDouble';
import { saveWithPlayerRetry } from '../services/saveRetry';

/** Owns a claim through storage retry and fences callbacks from an older win.
 * Victory exits await pending work before replacing its durable receipt. */
export function useVictoryDouble(
  victory: Pick<VictoryData, 'harvestBatchId' | 'amberEarned'> | null,
  onBalance: (balance: number) => void,
) {
  const id = victory?.harvestBatchId ?? null;
  const [claimedFor, setClaimedFor] = useState<string | null>(null);
  const activeId = useRef<string | null>(id);
  const balanceCallback = useRef(onBalance);
  const claimedId = useRef<string | null>(null);
  const generation = useRef(0);
  const pending = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);

  useLayoutEffect(() => {
    activeId.current = id;
    balanceCallback.current = onBalance;
  }, [id, onBalance]);

  useEffect(() => {
    const lifetime = mounted;
    const epoch = generation;
    lifetime.current = true;
    return () => { lifetime.current = false; epoch.current++; };
  }, []);

  const claim = useCallback((): Promise<void> => {
    if (!mounted.current || !id || id !== activeId.current || (victory?.amberEarned ?? 0) <= 0) return Promise.resolve();
    if (pending.current) return pending.current;
    if (claimedId.current === id) return Promise.resolve();
    const epoch = generation.current;
    const task = Promise.resolve().then(() => saveWithPlayerRetry(
      () => claimVictoryDouble(id),
      {
        title: 'Your bonus is waiting',
        message: 'We could not finish saving your bonus. Free device storage if it is full, then retry. Your bonus will be added only once.',
      },
    )).then(result => {
      if (result.status === 'unavailable' || !mounted.current || generation.current !== epoch) return;
      balanceCallback.current(result.newBalance);
      if (activeId.current === id) {
        claimedId.current = id;
        setClaimedFor(id);
      }
    }).finally(() => {
      if (pending.current === task) pending.current = null;
    });
    // Synchronous ownership closes the gap before React renders a disabled CTA.
    pending.current = task;
    return task;
  }, [id, victory?.amberEarned]);

  const awaitPending = useCallback(async () => { await pending.current; }, []);
  const reset = useCallback(() => {
    generation.current++;
    activeId.current = null;
    claimedId.current = null;
    setClaimedFor(null);
    // Keep a real in-flight grant owned until it settles; reset only retires UI.
  }, []);

  return { claimed: id !== null && claimedFor === id, claim, awaitPending, reset };
}
