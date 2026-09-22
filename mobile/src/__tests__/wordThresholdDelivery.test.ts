/**
 * Word-threshold lines (dialogue review open item 5): a resident met after a
 * threshold was crossed hears that threshold's line once on a later visit.
 * Vesper, Tock and Moss (and Fennick for 100) join after their thresholds, so
 * their lines, written for arriving late, used to be unreachable.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  peekWordThresholdPage,
  invalidateNarrativeDeliveryCache,
} from '../services/dialogue/animalDialogueNarrative';
import { WORD_THRESHOLD_DIALOGUES } from '../services/dialogue/animalDialogueReactions';

const line = (threshold: number, animal: string) =>
  WORD_THRESHOLD_DIALOGUES.find(e => e.threshold === threshold)!.lines[animal];

async function visit(animal: string, words: number, phase: number, read: number) {
  const page = await peekWordThresholdPage(animal as never, words, Math.max(0, words - 5), phase, read);
  if (page) await page.commit();
  return page?.text ?? null;
}

beforeEach(async () => {
  await (AsyncStorage.clear as () => Promise<void>)();
  invalidateNarrativeDeliveryCache();
});

describe('word-threshold delivery', () => {
  test('a late resident catches up on missed thresholds, one per visit, in order', async () => {
    // Moss is met at ~370 words: 100 and 250 were crossed before he arrived.
    expect(await visit('kakapo', 370, 3, 0)).toBe(line(100, 'kakapo'));
    expect(await visit('kakapo', 380, 3, 4)).toBe(line(250, 'kakapo'));
    expect(await visit('kakapo', 390, 3, 8)).toBeNull();
    // A threshold crossed after he joined uses the ordinary crossing route.
    expect(await visit('kakapo', 502, 3, 12)).toBe(line(500, 'kakapo'));
    expect(await visit('kakapo', 504, 3, 14)).toBeNull();
  });

  test('Fennick catches up on the 100-word line he arrived too late for', async () => {
    expect(await visit('fennec_fox', 130, 1, 0)).toBe(line(100, 'fennec_fox'));
    expect(await visit('fennec_fox', 140, 1, 3)).toBeNull();
  });

  test('a resident present from the start is not handed old thresholds', async () => {
    expect(await visit('fox', 10, 0, 0)).toBeNull();
    // Visited long after 100 was crossed, outside the crossing window: no replay.
    expect(await visit('fox', 180, 1, 30)).toBeNull();
    // The crossing itself still speaks, once.
    expect(await visit('fox', 252, 2, 40)).toBe(line(250, 'fox'));
    expect(await visit('fox', 254, 2, 41)).toBeNull();
  });

  test('a legacy long-standing resident (many lines read, no baseline) replays nothing', async () => {
    expect(await visit('owl', 600, 3, 60)).toBeNull();
  });

  test('the phase gate still applies to catch-up lines', async () => {
    // Met at phase 0 with 110 words: the 100-word line is a phase-1 line.
    expect(await visit('tarsier', 110, 0, 0)).toBeNull();
    expect(await visit('tarsier', 120, 1, 3)).toBe(line(100, 'tarsier'));
  });

  test('a peeked page that never reaches the screen stays unheard', async () => {
    const page = await peekWordThresholdPage('aye_aye', 300, 295, 2, 0);
    expect(page?.text).toBe(line(100, 'aye_aye'));
    // Not committed: the next visit offers it again.
    expect(await visit('aye_aye', 305, 2, 1)).toBe(line(100, 'aye_aye'));
  });
});
