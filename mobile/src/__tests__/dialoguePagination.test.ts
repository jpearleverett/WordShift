/**
 * Tests for dialogue long-line pagination (useDialogueFlow):
 * - splitDialogueIntoPages: the pure sentence-boundary splitter
 * - resolveVisiblePage: the pure page-queue resolution (cursor + source text)
 *
 * Hook-level drain behavior (Next drains pages before advancing the line,
 * no double side effects) is covered in dialogueFlowPagination.test.ts.
 */

// The pure functions live in the hook module, which imports react-native and
// services with native dependencies — stub those for the Node test env.
jest.mock('react-native', () => ({
  Animated: {
    Value: jest.fn().mockImplementation(() => ({
      setValue: jest.fn(),
      interpolate: jest.fn(),
    })),
    spring: jest.fn(() => ({ start: jest.fn() })),
    timing: jest.fn(() => ({ start: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn() })),
  },
}));
jest.mock('../services/haptics', () => ({
  hapticLight: jest.fn(),
  hapticSelection: jest.fn(),
}));
jest.mock('../services/amberCurrency', () => ({
  markDialogueRead: jest.fn(async () => {}),
  consumeTriggerWords: jest.fn(async () => []),
  consumePendingVariantTutorial: jest.fn(async () => null),
  wereTutorialSeedsPlanted: jest.fn(async () => true),
  markTutorialSeedsPlanted: jest.fn(async () => {}),
  recordConsumedCoordinatedEvent: jest.fn(async () => {}),
  hasSeenGuaranteedCrossRef: jest.fn(async () => true),
  markGuaranteedCrossRefSeen: jest.fn(async () => {}),
  hasSeenFoxPlayNudge: jest.fn(async () => true),
  markFoxPlayNudgeSeen: jest.fn(async () => {}),
}));

import {
  DIALOGUE_PAGE_CHAR_BUDGET,
  splitDialogueIntoPages,
  resolveVisiblePage,
} from '../hooks/useDialogueFlow';
import {
  getCurrentDialogue,
  getTotalDialogueCount,
  getPhase2ExtraDialogues,
} from '../services/dialogue/animalDialogueBase';
import { ANIMAL_AWARENESS_TIERS, AnimalType, DialoguePhase } from '../types/homeWorld';

const BUDGET = DIALOGUE_PAGE_CHAR_BUDGET;

/** Collapse all whitespace so rejoin comparisons ignore split-point spacing. */
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('splitDialogueIntoPages', () => {
  it('exports a ~420 character budget', () => {
    expect(BUDGET).toBe(420);
  });

  it('returns short text unchanged as a single page (same string identity)', () => {
    const text = 'Hello, friend! The fire is warm today.';
    const pages = splitDialogueIntoPages(text);
    expect(pages).toHaveLength(1);
    // Identity matters: HomeScreen compares dialogueText === activeChoice.prompt
    expect(pages[0]).toBe(text);
  });

  it('returns text exactly at the budget as a single page', () => {
    const text = 'a'.repeat(BUDGET);
    expect(splitDialogueIntoPages(text)).toEqual([text]);
  });

  it('returns an empty string as a single (empty) page without crashing', () => {
    expect(splitDialogueIntoPages('')).toEqual(['']);
  });

  it('splits a long multi-sentence line into non-empty pages within the budget', () => {
    const sentences = Array.from(
      { length: 14 },
      (_, i) => `This is sentence number ${i + 1} of the long tarsier watch, and the sky holds very still tonight.`
    );
    const text = sentences.join(' ');
    expect(text.length).toBeGreaterThan(BUDGET * 2);

    const pages = splitDialogueIntoPages(text);
    expect(pages.length).toBeGreaterThanOrEqual(3);
    for (const page of pages) {
      expect(page.length).toBeGreaterThan(0);
      expect(page.length).toBeLessThanOrEqual(BUDGET);
    }
    // Rejoining preserves the content modulo whitespace at split points
    expect(norm(pages.join(' '))).toBe(norm(text));
  });

  it('never splits mid-sentence when every sentence fits the budget', () => {
    const sentences = Array.from(
      { length: 12 },
      (_, i) => `Sentence ${i + 1} keeps a steady length so the packer has plenty of clean boundaries to choose from here.`
    );
    const text = sentences.join(' ');
    const pages = splitDialogueIntoPages(text);
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      // Every page is made of whole sentences: starts like one, ends like one
      expect(page).toMatch(/^Sentence \d+/);
      expect(page).toMatch(/[.!?]$/);
    }
  });

  it('packs consecutive sentences greedily so each page is as full as possible', () => {
    // Sentences of exactly 30 chars each; budget 100 fits three (30*3 + 2
    // separators = 92) but not four (123).
    const s = (c: string) => c.repeat(29) + '.';
    const parts = [s('A'), s('B'), s('C'), s('D'), s('E')];
    const text = parts.join(' ');
    const pages = splitDialogueIntoPages(text, 100);
    expect(pages).toEqual([
      `${parts[0]} ${parts[1]} ${parts[2]}`,
      `${parts[3]} ${parts[4]}`,
    ]);
  });

  it('keeps punctuation runs (... and ?!) attached to their sentence', () => {
    const sentences = [
      `The letters remember more than we do, and they have been patient for such a long while now...`,
      `Did you hear it too, out past the treeline, when the frogs went quiet all at once tonight?!`,
      `I hung in my hammock and counted every hush in the canopy until the counting stopped meaning anything.`,
      `It is closer now, and the ropes all lean the same direction, the way the leaves do before rain.`,
      `Nothing that patient has ever been in a hurry, which is exactly what worries me about the quiet.`,
    ];
    const text = sentences.join(' ');
    expect(text.length).toBeGreaterThan(BUDGET);

    const pages = splitDialogueIntoPages(text);
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      // No page starts with stranded punctuation and none ends mid-sentence
      expect(page).not.toMatch(/^[.!?]/);
      expect(page).toMatch(/[.!?]$/);
    }
    expect(norm(pages.join(' '))).toBe(norm(text));
  });

  it('treats newlines as sentence boundaries', () => {
    const lines = Array.from(
      { length: 6 },
      (_, i) => `line ${i + 1} has no terminal punctuation but still needs to break cleanly at the newline mark for the page`
    );
    const text = lines.join('\n');
    expect(text.length).toBeGreaterThan(BUDGET);

    const pages = splitDialogueIntoPages(text);
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      expect(page.length).toBeLessThanOrEqual(BUDGET);
      // Pages start at a line boundary, never mid-line
      expect(page).toMatch(/^line \d+/);
    }
    expect(norm(pages.join(' '))).toBe(norm(text));
  });

  it('hard-splits a single monster sentence at word boundaries', () => {
    const word = 'watching';
    const text = Array.from({ length: 110 }, () => word).join(' ');
    expect(text.length).toBeGreaterThan(BUDGET * 2);
    expect(text).not.toMatch(/[.!?]/);

    const pages = splitDialogueIntoPages(text);
    expect(pages.length).toBeGreaterThanOrEqual(3);
    for (const page of pages) {
      expect(page.length).toBeGreaterThan(0);
      expect(page.length).toBeLessThanOrEqual(BUDGET);
      // No word is ever cut: every token on every page is the intact word
      for (const token of page.split(' ')) {
        expect(token).toBe(word);
      }
    }
    // With single-space separators the rejoin is exact
    expect(pages.join(' ')).toBe(text);
  });

  it('only cuts mid-word when a single word exceeds the whole budget', () => {
    const text = 'z'.repeat(50) + ' ' + 'y'.repeat(120);
    const pages = splitDialogueIntoPages(text, 100);
    for (const page of pages) {
      expect(page.length).toBeLessThanOrEqual(100);
      expect(page.length).toBeGreaterThan(0);
    }
    // A 120-char single word cannot fit any page, so it is cut mid-word; every
    // non-space character survives, in order (only split whitespace differs).
    expect(pages.join('').replace(/ /g, '')).toBe(text.replace(/ /g, ''));
  });

  it('appends no extra characters (no ellipses, no page counters)', () => {
    const sentences = Array.from(
      { length: 10 },
      (_, i) => `Everything the pit is given it keeps, and it has been given sentence ${i + 1} to hold for us tonight.`
    );
    const text = sentences.join(' ');
    const pages = splitDialogueIntoPages(text);
    expect(pages.length).toBeGreaterThan(1);
    // Every character shown to the player exists in the original text
    for (const page of pages) {
      expect(text).toContain(page);
    }
  });

  it('splits every real base dialogue line into lossless pages within the budget', () => {
    const animalTypes = Object.keys(ANIMAL_AWARENESS_TIERS) as AnimalType[];
    let longLines = 0;
    for (const type of animalTypes) {
      for (let phase = 0; phase <= 4; phase++) {
        const total = getTotalDialogueCount(type, phase as DialoguePhase);
        for (let i = 0; i < total; i++) {
          const line = getCurrentDialogue(type, i, phase as DialoguePhase);
          if (!line) continue;
          const pages = splitDialogueIntoPages(line.text);
          if (pages.length > 1) longLines++;
          for (const page of pages) {
            expect(page.length).toBeGreaterThan(0);
            expect(page.length).toBeLessThanOrEqual(BUDGET);
          }
          expect(norm(pages.join(' '))).toBe(norm(line.text));
        }
      }
      for (const extra of getPhase2ExtraDialogues(type)) {
        const pages = splitDialogueIntoPages(extra);
        for (const page of pages) {
          expect(page.length).toBeGreaterThan(0);
          expect(page.length).toBeLessThanOrEqual(BUDGET);
        }
        expect(norm(pages.join(' '))).toBe(norm(extra));
      }
    }
    // The corpus genuinely contains over-budget lines (the newest animals),
    // so the splitter is exercised for real — not vacuously green.
    expect(longLines).toBeGreaterThan(0);
  });
});

describe('resolveVisiblePage', () => {
  const longText = Array.from(
    { length: 14 },
    (_, i) => `Sentence number ${i + 1} keeps this line comfortably past a single page for the resolution tests here.`
  ).join(' ');

  it('shows page 0 for a fresh line (no page source yet)', () => {
    const { pages, index } = resolveVisiblePage(longText, null, 0);
    expect(pages.length).toBeGreaterThan(1);
    expect(index).toBe(0);
  });

  it('honors the cursor while the source text matches', () => {
    const { pages, index } = resolveVisiblePage(longText, longText, 1);
    expect(index).toBe(1);
    expect(pages[index].length).toBeLessThanOrEqual(BUDGET);
  });

  it('self-heals to page 0 when the underlying line changes (stale source)', () => {
    const otherLine = 'A fresh short line.';
    const { pages, index } = resolveVisiblePage(otherLine, longText, 2);
    expect(index).toBe(0);
    expect(pages).toEqual([otherLine]);
  });

  it('clamps an overflowing cursor to the last page', () => {
    const { pages, index } = resolveVisiblePage(longText, longText, 99);
    expect(index).toBe(pages.length - 1);
  });

  it('always resolves a short line to its single page', () => {
    const text = 'Hello, friend!';
    expect(resolveVisiblePage(text, text, 5)).toEqual({ pages: [text], index: 0 });
    expect(resolveVisiblePage(text, null, 0)).toEqual({ pages: [text], index: 0 });
  });

  it('drain is due exactly while the index is before the last page', () => {
    const { pages } = resolveVisiblePage(longText, null, 0);
    // Simulate the hook's drain loop: advance one page per Next tap
    let source: string | null = null;
    let cursor = 0;
    const seen: string[] = [];
    for (;;) {
      const view = resolveVisiblePage(longText, source, cursor);
      seen.push(view.pages[view.index]);
      if (view.index >= view.pages.length - 1) break; // hook proceeds to next line
      source = longText;
      cursor = view.index + 1;
    }
    expect(seen).toEqual(pages);
  });
});
