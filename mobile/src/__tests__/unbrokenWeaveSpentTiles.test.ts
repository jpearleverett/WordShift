/**
 * Unbroken Weave: a letter that has crossed the chain once can never move
 * again, so every tile of it in the rows still ahead renders grey like a
 * locked tile, cannot be dragged, and a tap still explains why.
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, rel), 'utf8');
const row = read('../components/Row.tsx');
const tile = read('../components/LetterTile.tsx');
const app = read('../../App.tsx');

describe('spent letters on the Unbroken Weave board', () => {
  test('App hands every row the spent letters as a value-comparable string', () => {
    expect(app).toMatch(/const spentLetterKey = useMemo\(\s*\(\) => \(puzzle\.unbrokenWeaveMode \? \[\.\.\.puzzle\.spentLetters\]\.sort\(\)\.join\(''\) : ''\)/);
    expect(app).toContain('spentLetters={spentLetterKey}');
  });

  test('a spent tile greys out in the source row and every row still ahead, never in a finished row', () => {
    expect(row).toMatch(/const isSpentLetter = \(letter: Letter\): boolean =>\s*!isCompleted && !letter\.isLocked && spentLetters\.length > 0 && spentLetters\.includes\(letter\.char\.toUpperCase\(\)\)/);
    expect(row).toContain("highlight={letter.isLocked || spent ? 'locked' : isSource ? 'source' : 'default'}");
    expect(row).toContain("highlight={letter.isLocked || isSpentLetter(letter) ? 'locked' : 'default'}");
  });

  test('a spent tile cannot be picked up or dragged, but a tap still gets the spent-letter message', () => {
    expect(row).toContain('const canDrag = isSource && !isProcessing && !letter.isLocked && !spent && !!onLetterDragDrop;');
    expect(row).toContain('isInteractable={isSource && !isProcessing && !letter.isLocked && !spent}');
    expect(row).toMatch(/onLockedPress=\{\s*isSource && !isProcessing && \(letter\.isLocked \|\| spent\)/);
  });

  test('a spent letter keeps readable ink, and a tap on it gets rejection feedback, never the pick chime', () => {
    expect(tile).toContain("textColor: spent && !letter.isLocked ? '#A098BC' : '#706890'");
    expect(tile).toContain('{!spent && <View style={[styles.bevelTop');
    expect(app).toMatch(/const spentWeaveLetter = puzzle\.unbrokenWeaveMode\s*&& puzzle\.spentLetters\.includes\(String\(letter\.char\)\.toUpperCase\(\)\);\s*if \(letter\.isLocked \|\| spentWeaveLetter\)/);
  });

  test('screen readers hear that the letter is already used', () => {
    expect(tile).toContain("const letterStateLabel = letter.isLocked ? ', locked' : spent ? ', already used' : '';");
    expect(tile).toContain('disabled: !!letter.isLocked || !!spent');
  });
});
