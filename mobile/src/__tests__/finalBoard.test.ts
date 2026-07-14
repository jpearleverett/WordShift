import { CURATED_FINAL_PUZZLE } from '../constants/wordLists';
import { buildFinalBoard, FINAL_BOARD_GENERATION_TIMEOUT_MS } from '../services/finalBoard';
import * as localGenerator from '../services/localGenerator';

const cloneCuratedBoard = () => ({
  ...CURATED_FINAL_PUZZLE,
  words: [...CURATED_FINAL_PUZZLE.words],
  solution: CURATED_FINAL_PUZZLE.solution.map(step => ({ ...step })),
});

describe('buildFinalBoard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('generates a personalized seven-row HARD board from the strongest valid five-letter dread word', async () => {
    const generated = cloneCuratedBoard();
    const generate = jest
      .spyOn(localGenerator, 'generateLocalPuzzle')
      .mockResolvedValue(generated);

    const result = await buildFinalBoard(['void', 'dread', 'ALTAR', 'DOOM', 'not-a-word']);

    expect(generate).toHaveBeenCalledWith('HARD', {
      wordLength: 5,
      targetRows: 7,
      startWord: 'ALTAR',
    });
    expect(result).toBe(generated);
  });

  test('returns the curated board by identity when personalized generation rejects', async () => {
    jest
      .spyOn(localGenerator, 'generateLocalPuzzle')
      .mockRejectedValue(new Error('generation failed'));

    await expect(buildFinalBoard(['ALTAR'])).resolves.toBe(CURATED_FINAL_PUZZLE);
  });

  test('rejects a generated board with the wrong shape', async () => {
    const generated = cloneCuratedBoard();
    generated.words = generated.words.slice(0, 6);
    generated.solution = generated.solution.slice(0, 5);
    jest.spyOn(localGenerator, 'generateLocalPuzzle').mockResolvedValue(generated);

    await expect(buildFinalBoard(['ALTAR'])).resolves.toBe(CURATED_FINAL_PUZZLE);
  });

  test('rejects an unsolvable generated board even when its dimensions match', async () => {
    const generated = cloneCuratedBoard();
    generated.words = Array(7).fill('XXXXX');
    jest.spyOn(localGenerator, 'generateLocalPuzzle').mockResolvedValue(generated);

    await expect(buildFinalBoard(['ALTAR'])).resolves.toBe(CURATED_FINAL_PUZZLE);
  });

  test('does not generate without a valid five-letter dread word', async () => {
    const generate = jest.spyOn(localGenerator, 'generateLocalPuzzle');

    await expect(buildFinalBoard(['VOID', 'UNKNOWN_WORD', 'HAPPY'])).resolves.toBe(
      CURATED_FINAL_PUZZLE,
    );
    expect(generate).not.toHaveBeenCalled();
  });

  test('bounds personalized generation time before falling back', async () => {
    jest.useFakeTimers();
    jest
      .spyOn(localGenerator, 'generateLocalPuzzle')
      .mockImplementation(() => new Promise(() => undefined));

    const result = buildFinalBoard(['ALTAR']);
    await jest.advanceTimersByTimeAsync(FINAL_BOARD_GENERATION_TIMEOUT_MS);

    await expect(result).resolves.toBe(CURATED_FINAL_PUZZLE);
  });
});
