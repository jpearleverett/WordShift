import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { DICTIONARY_WORDS } from '../dictionary';
import { BLOCKED_WORDS, BLOCKED_WORD_SET } from '../constants/blockedWords';
import type { PreGeneratedPuzzle } from '../data/puzzleBankTypes';
import { PUZZLE_BANK_EASY } from '../data/puzzleBankEasy';
import { PUZZLE_BANK_MEDIUM } from '../data/puzzleBankMedium';
import { PUZZLE_BANK_MEDIUM_PLUS } from '../data/puzzleBankMediumPlus';
import { PUZZLE_BANK_HARD } from '../data/puzzleBankHard';
import { PUZZLE_BANK_REVERSE_EASY } from '../data/puzzleBankReverseEasy';
import { PUZZLE_BANK_REVERSE_MEDIUM } from '../data/puzzleBankReverseMedium';
import { PUZZLE_BANK_REVERSE_MEDIUM_PLUS } from '../data/puzzleBankReverseMediumPlus';
import { PUZZLE_BANK_REVERSE_HARD } from '../data/puzzleBankReverseHard';
import { PUZZLE_BANK_DOUBLE_SHIFT_EASY } from '../data/puzzleBankDoubleShiftEasy';
import { PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM } from '../data/puzzleBankDoubleShiftMedium';
import { PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM_PLUS } from '../data/puzzleBankDoubleShiftMediumPlus';
import { PUZZLE_BANK_DOUBLE_SHIFT_HARD } from '../data/puzzleBankDoubleShiftHard';

const BANKS: PreGeneratedPuzzle[][] = [
  PUZZLE_BANK_EASY,
  PUZZLE_BANK_MEDIUM,
  PUZZLE_BANK_MEDIUM_PLUS,
  PUZZLE_BANK_HARD,
  PUZZLE_BANK_REVERSE_EASY,
  PUZZLE_BANK_REVERSE_MEDIUM,
  PUZZLE_BANK_REVERSE_MEDIUM_PLUS,
  PUZZLE_BANK_REVERSE_HARD,
  PUZZLE_BANK_DOUBLE_SHIFT_EASY,
  PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM,
  PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM_PLUS,
  PUZZLE_BANK_DOUBLE_SHIFT_HARD,
];

describe('launch vocabulary hygiene', () => {
  test('the playable dictionary excludes every runtime-blocked word', () => {
    const leaked = DICTIONARY_WORDS.filter(word => BLOCKED_WORD_SET.has(word));
    expect(leaked).toEqual([]);
  });

  test('every bank allWords entry excludes every runtime-blocked word', () => {
    const leaked: string[] = [];
    for (const bank of BANKS) {
      for (const puzzle of bank) {
        for (const word of puzzle.allWords) {
          if (BLOCKED_WORD_SET.has(word)) leaked.push(`${puzzle.id}:${word}`);
        }
      }
    }
    expect(leaked).toEqual([]);
  });

  test('canonical hidden source remainders exclude every runtime-blocked word', () => {
    const leaked: string[] = [];
    for (const bank of BANKS) {
      for (const puzzle of bank) {
        for (const step of puzzle.solution) {
          const removals = step.removalPositions ?? (
            step.removalPosition === undefined ? [] : [step.removalPosition]
          );
          const remainder = removals
            .slice()
            .sort((a, b) => b - a)
            .reduce(
              (word, index) => word.slice(0, index) + word.slice(index + 1),
              step.sourceWord,
            );
          if (BLOCKED_WORD_SET.has(remainder)) {
            leaked.push(`${puzzle.id}:${step.stepIndex}:source:${remainder}`);
          }
        }
      }
    }
    expect(leaked).toEqual([]);
  });

  test('every available Double Shift drop1 source and target intermediate excludes blocked words', () => {
    const leaked: string[] = [];
    for (const bank of BANKS.filter(candidate =>
      candidate.some(puzzle => puzzle.isDoubleShift),
    )) {
      for (const puzzle of bank) {
        for (const step of puzzle.solution) {
          const removals = step.removalPositions;
          const letters = step.lettersToMove;
          expect(removals).toHaveLength(2);
          expect(letters).toHaveLength(2);

          for (const removal of removals ?? []) {
            const sourceIntermediate =
              step.sourceWord.slice(0, removal) +
              step.sourceWord.slice(removal + 1);
            if (BLOCKED_WORD_SET.has(sourceIntermediate)) {
              leaked.push(`${puzzle.id}:${step.stepIndex}:drop1-source:${sourceIntermediate}`);
            }
          }

          for (const letter of letters ?? []) {
            for (let insertion = 0; insertion <= step.targetWord.length; insertion++) {
              const targetIntermediate =
                step.targetWord.slice(0, insertion) +
                letter +
                step.targetWord.slice(insertion);
              if (BLOCKED_WORD_SET.has(targetIntermediate)) {
                leaked.push(`${puzzle.id}:${step.stepIndex}:drop1-target:${targetIntermediate}`);
              }
            }
          }
        }
      }
    }
    expect(leaked).toEqual([]);
  });

  test('the purge tool parses the runtime TypeScript blocked-word source', () => {
    const script = fs.readFileSync(
      path.join(process.cwd(), 'scripts/tools/purgeProfanity.mjs'),
      'utf8',
    );
    expect(BLOCKED_WORDS.length).toBeGreaterThan(100);
    expect(script).toContain('src/constants/blockedWords.ts');
    expect(script).not.toMatch(/export const BLOCKED_WORDS\s*=/);
  });

  test('the purge tool drops Double Shift entries with blocked first-half source or target words', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wordshift-purge-'));
    const mobile = path.join(root, 'mobile');
    const scriptDir = path.join(mobile, 'scripts/tools');
    const constantsDir = path.join(mobile, 'src/constants');
    const dataDir = path.join(mobile, 'src/data');
    fs.mkdirSync(scriptDir, { recursive: true });
    fs.mkdirSync(constantsDir, { recursive: true });
    fs.mkdirSync(dataDir, { recursive: true });

    try {
      const script = path.join(scriptDir, 'purgeProfanity.mjs');
      fs.copyFileSync(
        path.join(process.cwd(), 'scripts/tools/purgeProfanity.mjs'),
        script,
      );
      fs.writeFileSync(
        path.join(constantsDir, 'blockedWords.ts'),
        "export const BLOCKED_WORDS = ['ABCD', 'ABCDEF'] as const;\n",
      );
      fs.writeFileSync(
        path.join(mobile, 'src/dictionary.ts'),
        'export const DICTIONARY_WORDS = ["SAFE","ABCD","ABCDEF"];\n',
      );
      fs.writeFileSync(
        path.join(root, 'dictionary.txt'),
        'safe\nabcd\nabcdef\n',
      );

      const bankFile = path.join(dataDir, 'puzzleBankDoubleShiftFixture.ts');
      fs.writeFileSync(bankFile, `// Total puzzles: 2
export const PUZZLE_BANK_DOUBLE_SHIFT_FIXTURE = [
  {id:'blocked-source',words:['ABCDE','LMNOP'],solution:[{stepIndex:0,sourceWord:'ABCDE',targetWord:'LMNOP',letterToMove:'A',explanation:\`Move 'A' and 'E' from ABCDE to form ALMNOPE.\`,insertionPosition:0,removalPosition:0,lettersToMove:['A','E'],insertionPositions:[0,6],removalPositions:[0,4]}],wordLength:5,qualityScore:50,dreadTier:0,dreadWordCount:0,allWords:['ABCDE','LMNOP','ALMNOPE'],semanticTags:[],isDoubleShift:true},
  {id:'blocked-target',words:['AQRST','BCDEF'],solution:[{stepIndex:0,sourceWord:'AQRST',targetWord:'BCDEF',letterToMove:'A',explanation:\`Move 'A' and 'T' from AQRST to form BCDEFAT.\`,insertionPosition:5,removalPosition:0,lettersToMove:['A','T'],insertionPositions:[5,6],removalPositions:[0,4]}],wordLength:5,qualityScore:50,dreadTier:0,dreadWordCount:0,allWords:['AQRST','BCDEF','BCDEFAT'],semanticTags:[],isDoubleShift:true},
];
`);

      execFileSync(process.execPath, [script], { cwd: mobile, stdio: 'pipe' });
      const purged = fs.readFileSync(bankFile, 'utf8');
      expect(purged).not.toContain("id:'blocked-source'");
      expect(purged).not.toContain("id:'blocked-target'");
      expect(purged).toContain('// Total puzzles: 0');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
