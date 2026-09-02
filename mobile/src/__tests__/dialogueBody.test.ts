/**
 * Guards for the speech-bubble body renderer (components/home/DialogueBody, splitter in services/dialogueText).
 *
 * The split is PRESENTATION ONLY: the dialogue flow compares `dialogueText`
 * against choice prompts by equality and the whisper gallery records the
 * unsplit line, so a splitter that silently dropped or reordered a character
 * would corrupt both. Re-joining the blocks with one space must reproduce the
 * input exactly.
 */
import { splitIntoSentences } from '../services/dialogueText';

describe('splitIntoSentences', () => {
  it('splits on sentence boundaries', () => {
    expect(splitIntoSentences('One thing happened. Then another. And a third.')).toEqual([
      'One thing happened.',
      'Then another.',
      'And a third.',
    ]);
  });

  it('is lossless: re-joining with one space reproduces the input', () => {
    const samples = [
      'The kettle sang. I said thank you before I thought about who I was thanking.',
      'I counted the leaves today, and every one drifted inward. That is new.',
      'Come back tomorrow and I will show you why.',
      'Is that you? It is. Good.',
      'She said "the height makes my ears ring." I told her the height is the best part.',
    ];
    for (const s of samples) {
      expect(splitIntoSentences(s).join(' ')).toBe(s);
    }
  });

  it('keeps an abbreviation-free single sentence whole', () => {
    const one = 'There is a smaller sound beneath the breathing now, quicker than the rest.';
    expect(splitIntoSentences(one)).toEqual([one]);
  });

  it('handles a growing typewriter PREFIX without throwing or losing text', () => {
    const full = 'The fire went out. When it came back it was taller. I have been polite since.';
    for (let i = 1; i <= full.length; i++) {
      const prefix = full.slice(0, i);
      const parts = splitIntoSentences(prefix);
      // A prefix ending mid-whitespace loses only that whitespace.
      expect(parts.join(' ')).toBe(prefix.replace(/\s+$/, ''));
    }
  });

  it('returns nothing for empty or whitespace-only text', () => {
    expect(splitIntoSentences('')).toEqual([]);
    expect(splitIntoSentences('   ')).toEqual([]);
  });
});
