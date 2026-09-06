import { useEffect, useState } from 'react';

interface CountUpOptions {
  enabled: boolean;
  durationMs?: number;
  /** A new presentation snaps to its current value; only later changes animate. */
  identity?: unknown;
  increasesOnly?: boolean;
  interpolate?: (fraction: number, target: number, start: number) => number;
}
const linear = (fraction: number, target: number, start: number) => Math.round(start + (target - start) * fraction);

/** Numeric presentation belongs to one target/presentation pair. Switching
 * targets mid-animation continues from the displayed value; stale frames
 * cannot overwrite the next run, and reduced motion is immediate. */
export function useCountUp(target: number, { enabled, durationMs = 400, identity, increasesOnly = false, interpolate = linear }: CountUpOptions) {
  const animate = enabled && durationMs > 0;
  const [run, setRun] = useState(() => ({ target, identity, animate, durationMs, from: target, value: target, version: 0 }));
  let current = run;
  if (run.target !== target || run.identity !== identity || run.animate !== animate || run.durationMs !== durationMs) {
    const from = !animate || run.identity !== identity || (increasesOnly && target < run.value) ? target : run.value;
    current = { target, identity, animate, durationMs, from, value: from, version: run.version + 1 };
    setRun(current);
  }
  const { from, version } = current;
  useEffect(() => {
    if (!animate || from === target) return;
    let frame = 0;
    let cancelled = false;
    let lastPaint = -Infinity;
    const started = Date.now();
    const tick = () => {
      if (cancelled) return;
      const fraction = Math.min(1, Math.max(0, (Date.now() - started) / durationMs));
      // Match the former ~30 ms text cadence: these numbers don't need to
      // re-render an entire store at the display's 60/120 Hz refresh rate.
      if (fraction === 1 || Date.now() - lastPaint >= 30) {
        lastPaint = Date.now();
        const value = interpolate(fraction, target, from);
        setRun(previous => previous.version === version && previous.value !== value ? { ...previous, value } : previous);
      }
      if (fraction < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [animate, durationMs, from, interpolate, target, version]);
  return { value: current.value, running: animate && current.value !== target };
}
