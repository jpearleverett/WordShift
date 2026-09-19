import type { PendingCeremony } from '../types/homeWorld';
import type { PhaseTransitionEvent } from './phaseEvents';
import { acknowledgeCeremony, getPendingCeremonies } from './amberCurrency';
import { saveWithPlayerRetry } from './saveRetry';

interface PlaybackDependencies {
  build: (ceremony: PendingCeremony) => Promise<PhaseTransitionEvent>;
  onEvent: (event: PhaseTransitionEvent | null) => void;
  onWaiting: (waiting: boolean) => void;
  read?: typeof getPendingCeremonies;
  acknowledge?: typeof acknowledgeCeremony;
  retry?: typeof saveWithPlayerRetry;
}

/** The disk queue owns delivery; animation and navigation never consume it. */
export function createCeremonyPlayback({
  build, onEvent, onWaiting,
  read = getPendingCeremonies,
  acknowledge = acknowledgeCeremony,
  retry = saveWithPlayerRetry,
}: PlaybackDependencies) {
  let generation = 0;
  let active: { record: PendingCeremony; event: PhaseTransitionEvent } | null = null;
  let serial: Promise<unknown> = Promise.resolve();
  let completing: { event: PhaseTransitionEvent; promise: Promise<PendingCeremony | null> } | null = null;

  function enqueue<T>(work: (owner: number) => Promise<T>): Promise<T> {
    const owner = generation;
    const run = serial.catch(() => {}).then(() => work(owner));
    serial = run;
    return run;
  }

  async function readNext(owner: number): Promise<void> {
    if (owner !== generation) return;
    try {
      const queue = await read();
      if (owner !== generation) return;
      const record = queue[0];
      if (!record) {
        active = null;
        onEvent(null);
        return;
      }
      // A refresh while reading must not restart the current page or its audio.
      if (active?.record.id === record.id) return;
      const authored = await build(record);
      if (owner !== generation) return;
      // Authored event constants can recur in later cycles. Give each actual
      // presentation its own identity so a stale completion cannot consume it.
      const event = { ...authored };
      active = { record, event };
      onEvent(event);
    } catch (error) {
      // Reset abandons this generation, including any late build/read error.
      // Its retry prompt must not cover the replacement scene.
      if (owner === generation) throw error;
    }
  }

  function refresh(): Promise<void> {
    return enqueue(async owner => {
      if (owner !== generation) return;
      onWaiting(true);
      try {
        await retry(() => readNext(owner), {
          title: 'Your next scene is waiting',
          message: 'We could not open your saved scene. Please retry. Your progress is safe.',
        });
      } finally { if (owner === generation) onWaiting(false); }
    });
  }

  function complete(expectedEvent: PhaseTransitionEvent | null): Promise<PendingCeremony | null> {
    if (!expectedEvent || active?.event !== expectedEvent) return Promise.resolve(null);
    if (completing?.event === expectedEvent) return completing.promise;
    const finished = active;
    const promise = enqueue(async owner => {
      if (owner !== generation || active !== finished) return null;
      onWaiting(true);
      try {
        await retry(async () => {
          if (owner === generation) await acknowledge(finished.record.id);
        }, {
          title: 'Your scene is complete',
          message: 'We need to finish saving this moment. Please retry before continuing.',
        });
        if (owner !== generation) return null;
        active = null;
        onEvent(null);
        await retry(() => readNext(owner), {
          title: 'Your next scene is waiting',
          message: 'We could not open the next saved scene. Please retry.',
        });
        return finished.record;
      } finally {
        if (owner === generation) onWaiting(false);
        if (completing?.event === expectedEvent) completing = null;
      }
    });
    completing = { event: expectedEvent, promise };
    return promise;
  }

  function reset(): void {
    generation += 1;
    // An abandoned read/build may never settle; the new owner must not wait
    // behind it. Generation checks keep its later result from being delivered.
    serial = Promise.resolve();
    active = null;
    completing = null;
    onEvent(null);
    onWaiting(false);
  }

  return { refresh, complete, reset };
}
