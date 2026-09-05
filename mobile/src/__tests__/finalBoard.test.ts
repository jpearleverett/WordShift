import { COMMON_WORDS, CURATED_FINAL_PUZZLE } from '../constants/wordLists';
import { buildFinalBoard } from '../services/finalBoard';

describe('the final arrangement', () => {
  test('keeps both boundary choices regardless of the personal word history', async () => {
    const first = await buildFinalBoard(['ALTAR', 'DREAD']);
    const second = await buildFinalBoard([]);
    expect(first).toEqual(CURATED_FINAL_PUZZLE);
    expect(second).toEqual(first);
    first.words[0] = 'CHANGED';
    first.solution[0].letterToMove = 'X';
    expect(second).toEqual(CURATED_FINAL_PUZZLE);
  });

  test('every legal route completes and the only final words are CLOSED and CLOSER', () => {
    const endings: string[] = [];
    const deadEnds: string[] = [];
    const walk = (words: string[], row: number, locked: number) => {
      if (row === words.length - 1) { endings.push(words[row]); return; }
      let moves = 0;
      const source = words[row];
      const target = words[row + 1];
      for (let remove = 0; remove < source.length; remove++) {
        if (remove === locked) continue;
        const reduced = source.slice(0, remove) + source.slice(remove + 1);
        if (!COMMON_WORDS.has(reduced)) continue;
        for (let insert = 0; insert <= target.length; insert++) {
          const formed = target.slice(0, insert) + source[remove] + target.slice(insert);
          if (!COMMON_WORDS.has(formed)) continue;
          moves++;
          const next = [...words]; next[row] = reduced; next[row + 1] = formed;
          walk(next, row + 1, insert);
        }
      }
      if (moves === 0) deadEnds.push(words.join(','));
    };
    walk([...CURATED_FINAL_PUZZLE.words], 0, -1);
    expect(deadEnds).toEqual([]);
    expect(endings.sort()).toEqual(['CLOSED', 'CLOSER']);
  });
});
