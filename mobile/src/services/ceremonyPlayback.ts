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

// ---------------------------------------------------------------------------
// Preview-graduation deferral (ftue-2). For an engaged new player the phase-1
// pit ceremony lands on win 12 and the blocking preview-graduation card
// (PREVIEW_GRADING_FULL_LIMIT = 12) opens on board 13: two "the rules just
// changed" modals inside one board. Acknowledging a PHASE ceremony arms a
// one-board deferral; the host consults it before showing the graduation card
// on the first neutral board and, when it is armed, skips that ONE board
// without spending the beat. Session-scoped by design (a kill in between
// simply shows the card on the next neutral board, the pre-existing
// behaviour). House/arrival/post-arrival/new-cycle ceremonies never arm it:
// graduation is long past by then.
// ---------------------------------------------------------------------------
let graduationDeferralArmed = false;

/** Arm the one-board graduation deferral (called once a phase ceremony is acknowledged). */
export function notePhaseCeremonyAcknowledged(): void {
  graduationDeferralArmed = true;
}

/**
 * Pure decision: should the preview-graduation card wait one board? True
 * exactly when a phase ceremony was acknowledged and no board has consumed
 * the deferral since.
 */
export function shouldDeferPreviewGraduation(armed: boolean = graduationDeferralArmed): boolean {
  return armed;
}

/**
 * Consume the deferral for the board being opened: returns true (skip the card
 * on THIS board, keep the beat for the next one) at most once per armed
 * ceremony. The host calls it only where the card would otherwise show, so a
 * graded or blind board never spends it.
 */
export function consumePreviewGraduationDeferral(): boolean {
  const defer = shouldDeferPreviewGraduation();
  graduationDeferralArmed = false;
  return defer;
}

/** Test/reset hook: clear any armed deferral. */
export function resetPreviewGraduationDeferral(): void {
  graduationDeferralArmed = false;
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
        if (finished.record.kind === 'phase') notePhaseCeremonyAcknowledged();
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
