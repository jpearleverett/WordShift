import { useLayoutEffect, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
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
  useLayoutEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);

  // Active interval handle — stored in a ref so `stopSpeedTimer` can
  // clear it without depending on render state.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const limitRef = useRef<number>(0);
  // True between start and stop/time-up — gates AppState handling so transient
  // foreground events never touch the clock when no run is active.
  const runningRef = useRef<boolean>(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Single source of truth for the countdown interval. `limitRef` holds the
  // remaining seconds budget and `startedAtRef` is reset to now, so both fresh
  // starts and post-background resumes share identical tick logic.
  const beginTicking = useCallback(() => {
    clearTimer();
    startedAtRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const remaining = Math.max(0, limitRef.current - elapsed);
      setSpeedTimeRemaining(remaining);

      if (remaining <= 0) {
        clearTimer();
        runningRef.current = false;
        onTimeUpRef.current();
      }
    }, SPEED_TIMER_INTERVAL_MS);
  }, [clearTimer]);

  const startSpeedTimer = useCallback((seconds: number) => {
    limitRef.current = seconds;
    runningRef.current = true;
    setSpeedTimeRemaining(seconds);
    beginTicking();
  }, [beginTicking]);

  const stopSpeedTimer = useCallback(() => {
    runningRef.current = false;
    clearTimer();
    setSpeedTimeRemaining(null);
  }, [clearTimer]);

  // Pause while backgrounded: a phone call or app switch must not eat the clock.
  // Only true `background` pauses — transient `inactive` (notification banner,
  // Control Center, incoming-call UI) is ignored so the clock isn't churned by
  // events that don't actually suspend the app.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (!runningRef.current) return;

      if (nextState === 'background') {
        if (intervalRef.current !== null) {
          const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
          limitRef.current = Math.max(0, limitRef.current - elapsed);
          clearTimer();
        }
      } else if (nextState === 'active' && intervalRef.current === null) {
        // Returning from a pause. Resume from the banked budget, or fire time-up
        // if the clock expired while we were suspended.
        if (limitRef.current > 0) {
          setSpeedTimeRemaining(limitRef.current);
          beginTicking();
        } else {
          runningRef.current = false;
          setSpeedTimeRemaining(0);
          onTimeUpRef.current();
        }
      }
    });
    return () => subscription.remove();
  }, [clearTimer, beginTicking]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const state: SpeedTimerState = { speedTimeRemaining };
  const actions: SpeedTimerActions = { startSpeedTimer, stopSpeedTimer };
  return [state, actions];
}
