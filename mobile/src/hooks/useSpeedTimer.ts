import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SPEED_TIMER_INTERVAL_MS } from '../constants/timing';

export interface SpeedTimerState {
  speedTimeRemaining: number | null;
}

export interface SpeedTimerActions {
  /** Start countdown from the given number of seconds. */
  startSpeedTimer: (seconds: number) => void;
  /** Stop the timer and clear the remaining-time display. */
  stopSpeedTimer: () => void;
}

/**
 * Manages the speed-variant countdown timer.
 *
 * Owns the `speedTimeRemaining` state and the setInterval that drives
 * it.  When the timer reaches 0 the provided `onTimeUp` callback fires
 * exactly once.
 */
export function useSpeedTimer(
  onTimeUp: () => void,
): [SpeedTimerState, SpeedTimerActions] {
  const [speedTimeRemaining, setSpeedTimeRemaining] = useState<number | null>(null);

  // Stable ref for the time-up callback so the interval closure never
  // captures a stale version.
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  // Active interval handle — stored in a ref so `stopSpeedTimer` can
  // clear it without depending on render state.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const limitRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startSpeedTimer = useCallback((seconds: number) => {
    clearTimer();
    limitRef.current = seconds;
    startedAtRef.current = Date.now();
    setSpeedTimeRemaining(seconds);

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const remaining = Math.max(0, limitRef.current - elapsed);
      setSpeedTimeRemaining(remaining);

      if (remaining <= 0) {
        clearTimer();
        onTimeUpRef.current();
      }
    }, SPEED_TIMER_INTERVAL_MS);
  }, [clearTimer]);

  const stopSpeedTimer = useCallback(() => {
    clearTimer();
    setSpeedTimeRemaining(null);
  }, [clearTimer]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const state: SpeedTimerState = { speedTimeRemaining };
  const actions: SpeedTimerActions = useMemo(() => ({ startSpeedTimer, stopSpeedTimer }), [startSpeedTimer, stopSpeedTimer]);
  return [state, actions];
}
