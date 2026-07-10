/**
 * Guard: no stale keeper-count canon in player-facing text.
 *
 * The house roster grew past the original ten keepers (Vesper the tarsier,
 * Tock the aye-aye, and Moss the kakapo joined in the new-animal pass), so
 * any line asserting a hard "ten keepers / ten chambers" count is a canon
 * contradiction the player can disprove by counting the rooms on screen.
 * Player copy must stay count-free ("every keeper", "all of us",
 * "a keeper to every room"). Hyperbole like "ten thousand" is fine and is
 * not matched.
 */
import * as fs from 'fs';
import * as path from 'path';

const STALE_COUNT_RE =
  /\bten (keepers|chambers|rooms|sleepers|doors|places|anomalies)\b|\ball ten\b|\bten of us\b|\bwe are ten\b|\bthe ten of\b/i;

const CONTENT_FILES = [
  'services/dialogue/animalDialogueBase.ts',
  'services/dialogue/animalDialogueIntro.ts',
  'services/dialogue/animalDialogueNarrative.ts',
  'services/dialogue/animalDialogueReactions.ts',
  'services/dialogue/animalDialogueVariants.ts',
  'services/dialogue/animalDialogueTending.ts',
  'services/dialogueChoices.ts',
  'services/phaseEvents.ts',
  'services/phaseNarrative.ts',
];

describe('keeper-count canon guard', () => {
  test.each(CONTENT_FILES)('%s carries no stale ten-keeper count', file => {
    const text = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
    const offenders = text
      .split('\n')
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => STALE_COUNT_RE.test(line))
      .map(({ line, i }) => `${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
    expect(offenders).toEqual([]);
  });
});
