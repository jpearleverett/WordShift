import { useCallback, useEffect, useReducer, useState } from 'react';
import { appBootstrap } from '../services/appBootstrap';

/** Owns one cancellable bootstrap attempt and its system-motion subscription. */
export function useAppBoot() {
  const [status, setStatus] = useState<'opening' | 'ready' | 'failed'>('opening');
  const [attempt, retryAttempt] = useReducer((value: number) => value + 1, 0);
  const [, refreshMotion] = useReducer((value: number) => value + 1, 0);
  useEffect(() => {
    let current = true;
    const boot = appBootstrap.start(refreshMotion);
    boot.done.then((result) => {
      if (current && result === 'ready') setStatus('ready');
    }).catch((error) => {
      if (!current) return;
      console.warn('Bootstrap init failed:', error);
      setStatus('failed');
    });
    return () => { current = false; boot.cancel(); };
  }, [attempt]);
  const retry = useCallback(() => { setStatus('opening'); retryAttempt(); }, []);
  return { status, retry };
}
