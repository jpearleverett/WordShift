import { passesBankMonotony } from '../../scripts/gatedMonotony';
import { GATED_POLICY_HASH } from '../../scripts/gatedCheckpoint';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const mobile = resolve(__dirname, '../..');
let fixture: string;
const node = (script: string, args: string[], env = process.env) => spawnSync(process.execPath, [script, ...args], { env, encoding: 'utf8' });

beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), 'wordshift-gated-tools-'));
  mkdirSync(join(fixture, 'scripts/tools'), { recursive: true });
  mkdirSync(join(fixture, 'src/data/vocabulary'), { recursive: true });
  copyFileSync(join(mobile, 'src/data/vocabulary/puzzleVocabulary.ts'), join(fixture, 'src/data/vocabulary/puzzleVocabulary.ts'));
  for (const script of ['swapGatedBanks.mjs', 'tools/gatedBankTarget.mjs', 'tools/generateGatedPuzzles.mjs', 'tools/gatedCheckpointCount.mjs']) {
    copyFileSync(join(mobile, 'scripts', script), join(fixture, 'scripts', script));
  }
});
afterEach(() => rmSync(fixture, { recursive: true, force: true }));

test('all 30 wrapper selections forward the driver tier and optional LEXICON argument without generating banks', () => {
  const capture = join(fixture, 'args');
  const bin = join(fixture, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'bash'), '#!/bin/sh\nprintf "%s\\n" "$@" > "$WORDSHIFT_GATED_CAPTURE"\nexit "${WORDSHIFT_GATED_EXIT:-0}"\n', { mode: 0o755 });
  const env = { ...process.env, PATH: bin, WORDSHIFT_GATED_CAPTURE: capture };
  const drivers = { standard: 'runGatedRegen.sh', reverse: 'runGatedReverseRegen.sh', double: 'runGatedDoubleRegen.sh' };
  for (const [family, driver] of Object.entries(drivers)) {
    for (const difficulty of ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD', 'EXPERT']) {
      for (const lexicon of [false, true]) {
        const selection = `${lexicon ? 'LEX_' : ''}${difficulty}`;
        const result = node(join(fixture, 'scripts/tools/generateGatedPuzzles.mjs'), [family, selection], env);
        expect(result.status).toBe(0);
        expect(readFileSync(capture, 'utf8').trim().split('\n')).toEqual([`scripts/${driver}`, difficulty, ...(lexicon ? ['LEXICON'] : [])]);
        expect(result.stdout).toContain(`<minimum-count> ${family} ${selection} --dry-run`);
      }
    }
  }
  const failed = node(join(fixture, 'scripts/tools/generateGatedPuzzles.mjs'), ['reverse', 'LEX_EXPERT'], { ...env, WORDSHIFT_GATED_EXIT: '7' });
  expect(failed.status).toBe(7);
  expect(failed.stdout).not.toContain('swapGatedBanks.mjs');
  expect(node(join(fixture, 'scripts/tools/generateGatedPuzzles.mjs'), ['standard', 'LEX_FAKE'], env).status).toBe(1);
}, 10000);

const content = (exportName: string, id: string) => `// Vocabulary policy: ${GATED_POLICY_HASH}\nexport const ${exportName} = [{id:'${id}'}];\n`;
test('targeted swaps cover all 30 banks, dry-run writes nothing, and real fixture swaps back up only the selected bank', () => {
  const data = join(fixture, 'src/data');
  for (const family of ['standard', 'reverse', 'double']) {
    for (const [difficulty, title] of [['EASY', 'Easy'], ['MEDIUM', 'Medium'], ['MEDIUM_PLUS', 'MediumPlus'], ['HARD', 'Hard'], ['EXPERT', 'Expert']]) {
      for (const lexicon of [false, true]) {
        const selection = `${lexicon ? 'LEX_' : ''}${difficulty}`;
        const kind = family === 'standard' ? '' : `${family}_`;
        const key = `${lexicon ? 'lexicon_' : ''}${kind}${difficulty.toLowerCase()}`;
        const suffix = family === 'reverse' ? 'Reverse' : family === 'double' ? 'DoubleShift' : '';
        const live = `${lexicon ? 'lexicon' : 'puzzle'}Bank${suffix}${title}.ts`;
        const exportKind = family === 'reverse' ? 'REVERSE_' : family === 'double' ? (lexicon ? 'DOUBLE_' : 'DOUBLE_SHIFT_') : '';
        const exportName = `${lexicon ? 'LEXICON' : 'PUZZLE'}_BANK_${exportKind}${difficulty}`;
        // Cross-check the mapping with the actual live export, without writing it.
        expect(readFileSync(join(mobile, 'src/data', live), 'utf8')).toContain(`export const ${exportName}`);
        const sidecar = `.gatedRegen${family === 'reverse' ? 'Reverse' : family === 'double' ? 'Double' : ''}_${key}_output.ts`;
        writeFileSync(join(data, live), content(exportName, 'old'));
        writeFileSync(join(data, sidecar), content(exportName, 'new'));
        const args = ['1', family, selection];
        const dry = node(join(fixture, 'scripts/swapGatedBanks.mjs'), [...args, '--dry-run']);
        expect(dry.status).toBe(0);
        expect(dry.stdout).toContain(`DRY RUN — would replace ${live}`);
        expect(readFileSync(join(data, live), 'utf8')).toBe(content(exportName, 'old'));
        expect(existsSync(join(data, `.pre_gated_${key}.ts.bak`))).toBe(false);
        const applied = node(join(fixture, 'scripts/swapGatedBanks.mjs'), args);
        expect(applied.status).toBe(0);
        expect(applied.stdout).toContain('1 swapped');
        expect(readFileSync(join(data, live), 'utf8')).toBe(content(exportName, 'new'));
        expect(readFileSync(join(data, `.pre_gated_${key}.ts.bak`), 'utf8')).toBe(content(exportName, 'old'));
      }
    }
  }
}, 15000);

test('targeted selection refuses missing, undersized and structurally wrong sidecars; legacy scan stays core-only', () => {
  const script = join(fixture, 'scripts/swapGatedBanks.mjs');
  const data = join(fixture, 'src/data');
  expect(node(script, ['1', 'reverse', 'LEX_EXPERT']).status).toBe(1);
  const live = join(data, 'lexiconBankReverseExpert.ts');
  const sidecar = join(data, '.gatedRegenReverse_lexicon_reverse_expert_output.ts');
  const original = content('LEXICON_BANK_REVERSE_EXPERT', 'old');
  writeFileSync(live, original);
  writeFileSync(sidecar, content('LEXICON_BANK_REVERSE_EXPERT', 'new'));
  expect(node(script, ['2', 'reverse', 'LEX_EXPERT']).status).toBe(1);
  writeFileSync(sidecar, content('LEXICON_BANK_REVERSE_EXPERT', 'new').replace(GATED_POLICY_HASH, 'old-policy'));
  expect(node(script, ['1', 'reverse', 'LEX_EXPERT']).status).toBe(1);
  writeFileSync(sidecar, content('WRONG_EXPORT', 'new'));
  expect(node(script, ['1', 'reverse', 'LEX_EXPERT']).status).toBe(1);
  expect(readFileSync(live, 'utf8')).toBe(original);
  const legacy = node(script, ['1', '--dry-run']);
  expect(legacy.status).toBe(0);
  expect(legacy.stdout).toContain('12 skipped');
  expect(legacy.stdout).not.toContain('LEXICON');
  for (const args of [['0'], ['1.5'], ['NaN'], ['1', 'standard'], ['1', 'reverse', 'LEX_EXPERT', 'extra']]) expect(node(script, args).status).toBe(1);
});


test('a full but stale checkpoint cannot bypass regeneration through the driver count shortcut', () => {
  const script = join(fixture, 'scripts/tools/gatedCheckpointCount.mjs');
  const checkpoint = join(fixture, 'src/data/checkpoint.json');
  expect(node(script, [checkpoint]).stdout.trim()).toBe('0');
  writeFileSync(checkpoint, JSON.stringify({ puzzles: Array.from({ length: 500 }, () => ({})), vocabularyPolicyHash: 'old' }));
  const stale = node(script, [checkpoint]);
  expect(stale.status).toBe(1);
  expect(stale.stderr).toContain('Checkpoint vocabulary policy changed');
  writeFileSync(checkpoint, JSON.stringify({ puzzles: [{ id: 'reviewed' }], vocabularyPolicyHash: GATED_POLICY_HASH }));
  expect(node(script, [checkpoint]).stdout.trim()).toBe('1');
});


test('top-ups dilute inherited letter spikes and refuse additions that exceed the existing 30% guards', () => {
  const puzzle = (start: string, moved: string) => ({ words: [start + 'EAR'], solution: [{ stepIndex: 0, sourceWord: start + 'EAR', targetWord: 'LAST', letterToMove: moved, explanation: '' }] });
  const balanced = Array.from({ length: 20 }, (_, index) => puzzle(String.fromCharCode(65 + index % 10), String.fromCharCode(65 + index % 10)));
  expect(passesBankMonotony(balanced, puzzle('A', 'A'))).toBe(true);
  const spiked = balanced.map((entry, index) => index < 8 ? puzzle('A', 'S') : entry);
  expect(passesBankMonotony(spiked, puzzle('A', 'B'))).toBe(false);
  expect(passesBankMonotony(spiked, puzzle('B', 'S'))).toBe(false);
  expect(passesBankMonotony(spiked, puzzle('B', 'B'))).toBe(true);
  expect(passesBankMonotony([], puzzle('A', 'S'))).toBe(true);
});
