export interface BulkOfferTiming {
  staggerMs: number;
  wordDurationMs: number;
  cascadeDurationMs: number;
}

const MAX_BULK_CASCADE_MS = 1000;
// Big harvests (past this many words) are allowed a longer total cascade so
// they READ bigger — the crescendo the Offer-All flourish wants. Per-word
// stagger stays capped at MAX_STAGGER_MS regardless, so no single word ever
// lands slower; the total only stretches because more words fit the budget.
const BULK_STRETCH_THRESHOLD = 20;
const MAX_BULK_CASCADE_MS_LARGE = 1600;
const SETTLE_BUFFER_MS = 100;
const PHASE_WORD_DURATIONS: readonly number[] = [300, 280, 260, 240, 220, 200];
const MAX_STAGGER_MS = 80;

export function getBulkOfferTiming(
  wordCount: number,
  phase: number,
  reducedMotion: boolean,
): BulkOfferTiming {
  if (reducedMotion || wordCount <= 0) {
    return { staggerMs: 0, wordDurationMs: 0, cascadeDurationMs: 0 };
  }

  const normalizedCount = Math.floor(wordCount);
  const normalizedPhase = Math.max(0, Math.min(PHASE_WORD_DURATIONS.length - 1, Math.floor(phase)));
  const wordDurationMs = PHASE_WORD_DURATIONS[normalizedPhase];
  const cascadeCapMs = normalizedCount > BULK_STRETCH_THRESHOLD
    ? MAX_BULK_CASCADE_MS_LARGE
    : MAX_BULK_CASCADE_MS;
  const availableStaggerMs = Math.max(0, cascadeCapMs - SETTLE_BUFFER_MS - wordDurationMs);
  const staggerMs = normalizedCount > 1
    ? Math.min(MAX_STAGGER_MS, Math.floor(availableStaggerMs / (normalizedCount - 1)))
    : 0;
  const cascadeDurationMs = (normalizedCount - 1) * staggerMs + wordDurationMs + SETTLE_BUFFER_MS;

  return { staggerMs, wordDurationMs, cascadeDurationMs };
}
