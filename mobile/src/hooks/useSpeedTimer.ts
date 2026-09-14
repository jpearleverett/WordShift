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
 *
 * `paused` holds the clock while an in-app surface covers the board (the
 * setup menu, which stays open across modifier toggles and re-serves the
 * board under itself, or the How-to-Play sheet). It banks the remaining
 * seconds exactly like the AppState background pause and resumes from that
 * bank when the surface closes; a run STARTED while paused shows its full
 * budget and begins ticking only once the board is actually visible.
 */
export function useSpeedTimer(
  onTimeUp: () => void,
  paused: boolean = false,
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
  // The two hold reasons. Either one keeps the interval cleared; the clock
  // resumes only when both have lifted.
  const pausedRef = useRef<boolean>(paused);
  const backgroundedRef = useRef<boolean>(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Single source of truth for the countdown interval. `limitRef` holds the
  // remaining seconds budget and `startedAtRef` is reset to now, so both fresh
  // starts and post-hold resumes share identical tick logic.
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

  // Bank the seconds used so far and stop ticking. No-op when already held.
  const suspendTicking = useCallback(() => {
    if (intervalRef.current === null) return;
    const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
    limitRef.current = Math.max(0, limitRef.current - elapsed);
    clearTimer();
  }, [clearTimer]);

  // Resume from the banked budget once no hold remains, or fire time-up if
  // the clock expired while held.
  const resumeTicking = useCallback(() => {
    if (!runningRef.current || intervalRef.current !== null) return;
    if (pausedRef.current || backgroundedRef.current) return;
    if (limitRef.current > 0) {
      setSpeedTimeRemaining(limitRef.current);
      beginTicking();
    } else {
      runningRef.current = false;
      setSpeedTimeRemaining(0);
      onTimeUpRef.current();
    }
  }, [beginTicking]);

  const startSpeedTimer = useCallback((seconds: number) => {
    // A restart while held replaces the banked budget; the old interval (if
    // any) is dropped so the new run never inherits its start time.
    clearTimer();
    limitRef.current = seconds;
    runningRef.current = true;
    setSpeedTimeRemaining(seconds);
    if (pausedRef.current || backgroundedRef.current) return; // ticks on resume
    beginTicking();
  }, [beginTicking, clearTimer]);

  const stopSpeedTimer = useCallback(() => {
    runningRef.current = false;
    clearTimer();
    setSpeedTimeRemaining(null);
  }, [clearTimer]);

  // In-app hold (setup menu / rules sheet over a live board).
  useEffect(() => {
    pausedRef.current = paused;
    if (!runningRef.current) return;
    if (paused) suspendTicking();
    else resumeTicking();
  }, [paused, suspendTicking, resumeTicking]);

  // Pause while backgrounded: a phone call or app switch must not eat the clock.
  // Only true `background` pauses — transient `inactive` (notification banner,
  // Control Center, incoming-call UI) is ignored so the clock isn't churned by
  // events that don't actually suspend the app.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        backgroundedRef.current = true;
        if (runningRef.current) suspendTicking();
      } else if (nextState === 'active') {
        backgroundedRef.current = false;
        // Returning from a pause (a no-op when the interval is still live,
        // e.g. after a transient `inactive`, or while the menu hold remains).
        resumeTicking();
      }
    });
    return () => subscription.remove();
  }, [suspendTicking, resumeTicking]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const state: SpeedTimerState = { speedTimeRemaining };
  const actions: SpeedTimerActions = { startSpeedTimer, stopSpeedTimer };
  return [state, actions];
}
