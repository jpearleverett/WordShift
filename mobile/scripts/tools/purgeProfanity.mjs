// Removes profanity/slurs from the playable dictionary, the generation word
// list, and all pre-generated puzzle banks. Bank puzzles that contain a
// blocked word anywhere in their chain or solution are dropped entirely.
// Run: node scripts/tools/purgeProfanity.mjs
import fs from 'fs';
import path from 'path';

const MOBILE = path.resolve(import.meta.dirname, '../..');
const REPO = path.resolve(MOBILE, '..');

function readBlockedWords() {
  const file = path.join(MOBILE, 'src/constants/blockedWords.ts');
  const source = fs.readFileSync(file, 'utf8');
  const arraySource = /export const BLOCKED_WORDS\s*=\s*\[([\s\S]*?)\]\s*as const;/.exec(source)?.[1];
  if (!arraySource) {
    throw new Error(`Could not parse BLOCKED_WORDS from ${file}`);
  }
  const words = Array.from(arraySource.matchAll(/['"]([A-Z]+)['"]/g), match => match[1]);
  if (words.length === 0 || new Set(words).size !== words.length) {
    throw new Error(`BLOCKED_WORDS must be a non-empty duplicate-free string array in ${file}`);
  }
  return words;
}

const BLOCKED = new Set(readBlockedWords());

/**
 * Stored `allWords` includes starting and formed words, but not the shorter
 * source remainder produced by each removal. A dictionary purge can therefore
 * leave a bank entry whose visible words are clean but whose required hidden
 * remainder was deleted. Inspect the canonical step objects as an additional
 * guard so the solvability suite stays green after every vocabulary pass.
 */
function entryHasBlockedCanonicalIntermediate(entry) {
  const steps = entry.match(/\{stepIndex:\d+,[^{}]*\}/g) ?? [];
  for (const step of steps) {
    const source = /sourceWord:'([A-Z]+)'/.exec(step)?.[1];
    if (!source) continue;

    const pairRaw = /removalPositions:\[([0-9,]+)\]/.exec(step)?.[1];
    if (pairRaw) {
      const pairPositions = pairRaw.split(',').map(Number);
      const target = /targetWord:'([A-Z]+)'/.exec(step)?.[1];
      const letters = /lettersToMove:\['([A-Z])','([A-Z])'\]/.exec(step);

      // Double Shift lets either stored letter move first and drop into any
      // target slot. Do not assume the generated letter/position arrays share
      // an ordering: inspect every available first removal and every possible
      // first insertion, matching the shipped free-form drop1 rules.
      for (const position of pairPositions) {
        const firstSource =
          source.slice(0, position) +
          source.slice(position + 1);
        if (BLOCKED.has(firstSource)) return true;
      }
      if (target && letters) {
        for (const letter of [letters[1], letters[2]]) {
          for (let position = 0; position <= target.length; position++) {
            const firstTarget =
              target.slice(0, position) +
              letter +
              target.slice(position);
            if (BLOCKED.has(firstTarget)) return true;
          }
        }
      }

      const positions = pairPositions.sort((a, b) => b - a);
      let remainder = source;
      for (const position of positions) {
        remainder = remainder.slice(0, position) + remainder.slice(position + 1);
      }
      if (BLOCKED.has(remainder)) return true;
      continue;
    }

    const storedPosition = /removalPosition:(\d+)/.exec(step)?.[1];
    if (storedPosition !== undefined) {
      const position = Number(storedPosition);
      const remainder = source.slice(0, position) + source.slice(position + 1);
      if (BLOCKED.has(remainder)) return true;
      continue;
    }

    // Reverse hints do not persist a removal position. If every occurrence of
    // the moved character produces a blocked remainder, no shipped-rule move
    // can use that stored step.
    const letter = /letterToMove:'([A-Z])'/.exec(step)?.[1];
    if (!letter) continue;
    const remainders = [...source]
      .map((char, index) => char === letter
        ? source.slice(0, index) + source.slice(index + 1)
        : null)
      .filter(Boolean);
    if (remainders.length > 0 && remainders.every(word => BLOCKED.has(word))) {
      return true;
    }
  }
  return false;
}

// 1) Mobile dictionary (validation + generation source for the app)
{
  const file = path.join(MOBILE, 'src/dictionary.ts');
  const src = fs.readFileSync(file, 'utf8');
  const start = src.indexOf('= [') + 2;
  const end = src.lastIndexOf(']');
  const words = JSON.parse(src.slice(start, end + 1));
  const kept = words.filter(w => !BLOCKED.has(w));
  console.log(`dictionary.ts: removed ${words.length - kept.length} of ${words.length} words:`);
  console.log('  ' + words.filter(w => BLOCKED.has(w)).join(', '));
  fs.writeFileSync(file, src.slice(0, start) + JSON.stringify(kept) + src.slice(end + 1));
}

// 2) Repo-root generation word list (lowercase, one word per line)
{
  const file = path.join(REPO, 'dictionary.txt');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const kept = lines.filter(l => !BLOCKED.has(l.trim().toUpperCase()));
  console.log(`dictionary.txt: removed ${lines.length - kept.length} of ${lines.length} lines`);
  fs.writeFileSync(file, kept.join('\n'));
}

// 3) Puzzle banks: drop any puzzle whose entry references a blocked word.
//    Bank entries are single-line object literals; every chain word and every
//    step's source/target word appears single-quoted ('WORD') somewhere in the
//    entry — EXCEPT a leg's final formed word, which only appears inside the
//    explanation template string ("...to form WORD."), so both patterns are
//    scanned.
{
  const dataDir = path.join(MOBILE, 'src/data');
  const tokenRe = /'([A-Z]{3,8})'/g;
  const formedRe = /form ([A-Z]{3,8})\./g;
  for (const name of fs.readdirSync(dataDir).filter(f => f.startsWith('puzzleBank') && f !== 'puzzleBankTypes.ts')) {
    const file = path.join(dataDir, name);
    let src = fs.readFileSync(file, 'utf8');
    const open = src.indexOf('= [');
    const close = src.lastIndexOf('];');
    const body = src.slice(open + 3, close);
    const entries = body.split(/\n(?=\s*\{id:)/).filter(e => e.trim().length > 0);
    const kept = entries.filter(entry => {
      for (const m of entry.matchAll(tokenRe)) {
        if (BLOCKED.has(m[1])) return false;
      }
      for (const m of entry.matchAll(formedRe)) {
        if (BLOCKED.has(m[1])) return false;
      }
      if (entryHasBlockedCanonicalIntermediate(entry)) return false;
      return true;
    });
    const removed = entries.length - kept.length;
    if (removed > 0) {
      let out = src.slice(0, open + 3) + '\n' + kept.map(e => e.replace(/\s+$/, '')).join('\n') + '\n' + src.slice(close);
      out = out.replace(/\/\/ Total puzzles: \d+/, `// Total puzzles: ${kept.length}`);
      fs.writeFileSync(file, out);
    }
    console.log(`${name}: kept ${kept.length}, removed ${removed}`);
  }
}

// 4) Safety check: curated/fallback puzzle pools must not contain blocked words
{
  for (const rel of ['src/constants.ts', 'src/constants/wordLists.ts']) {
    const file = path.join(MOBILE, rel);
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    const hits = new Set();
    for (const m of src.matchAll(/["']([A-Z]{3,8})["']/g)) {
      if (BLOCKED.has(m[1])) hits.add(m[1]);
    }
    console.log(`${rel}: ${hits.size === 0 ? 'clean' : 'CONTAINS BLOCKED WORDS: ' + [...hits].join(', ')}`);
  }
}
