import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { OnboardingStep } from '../services/onboarding';

/** Hydration determines the initial destination; elapsed wall time never opens
 * the home screen while a saved board is still being read. A failed route is
 * retryable, and cleanup invalidates every deferred navigation callback. */
export function useInitialGameRoute(
  hydrated: boolean,
  step: OnboardingStep,
  route: (step: OnboardingStep, isCurrent: () => boolean) => Promise<void>,
) {
  const latest = useRef({ step, route });
  useLayoutEffect(() => { latest.current = { step, route }; }, [step, route]);
  const [status, setStatus] = useState<'opening' | 'ready' | 'failed'>('opening');
  const [attempt, retryAttempt] = useReducer((value: number) => value + 1, 0);
  useEffect(() => {
    if (!hydrated) return;
    let current = true;
    const launch = latest.current;
    launch.route(launch.step, () => current).then(() => {
      if (current) setStatus('ready');
    }).catch((error) => {
      if (!current) return;
      console.warn('Opening initial game route failed:', error);
      setStatus('failed');
    });
    return () => { current = false; };
  }, [hydrated, attempt]);
  const retry = useCallback(() => { setStatus('opening'); retryAttempt(); }, []);
  return { status, retry };
}
