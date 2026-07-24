#!/usr/bin/env node
/**
 * Sort the dictionary's UNRANKED tail by base-lemma frequency.
 *
 * WHY THIS EXISTS
 * The dictionary is ordered by true wordfreq zipf, and that order is
 * load-bearing: getFeaturedRank (localGenerator) ranks a word by its INDEX in
 * the per-length arrays, and the playable-vocabulary policy uses that rank to
 * decide what may be FEATURED on a board.
 *
 * wordfreq returns zipf 0.0 for a long tail of legal-but-obscure inflections
 * (ABIDER, ABODED, ABOVES, ZINCY...). Having no key to sort by, the corpus
 * rebuild appended those 1,511 words ALPHABETICALLY. That gave the tail an
 * arbitrary A-to-Z bias in a structure whose ordering is supposed to mean
 * "familiarity" — ABIDER outranking ZINCY for no reason but its first letter.
 *
 * Measured impact today: the whole tail sits at per-length rank >= 0.900, above
 * every featured ceiling (~0.86), so no board can currently feature these words
 * and the mis-ordering is LATENT, not live. It is still worth correcting: the
 * ceilings are tuning constants, and the day a rare-mode band reaches past 0.90
 * the alphabet would silently become a difficulty curve.
 *
 * THE FIX
 * These words are overwhelmingly inflections, so their familiarity tracks their
 * BASE word, which usually does have a zipf. For each tail word we derive
 * candidate bases by undoing the common English suffix rules, take the best
 * zipf among the candidates that are real dictionary words, and sort by that
 * descending (ties alphabetical, so the output is deterministic).
 *
 * SURGICAL BY DESIGN: only the zipf-0 tail is reordered, among itself. The
 * correctly-sorted head is left byte-identical, so featured ranks of real
 * vocabulary do not move and no bank needs regenerating.
 *
 * Usage: node scripts/tools/sortDictionaryTail.mjs [--check]
 *   --check exits 1 if the tail is not already correctly sorted (CI-friendly).
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const DICT = path.join(process.cwd(), 'src/dictionary.ts');
const CHECK_ONLY = process.argv.includes('--check');

const src = fs.readFileSync(DICT, 'utf8');
// Anchor on the ASSIGNMENT bracket, not the first '[' in the file — the type
// annotation `string[]` precedes it and a naive indexOf('[') silently captures
// `] = ["THE` as the first word (it corrupts the file rather than throwing).
const open = src.indexOf('= [') + 2;
const close = src.lastIndexOf(']');
if (open < 2 || close <= open) throw new Error('could not locate the DICTIONARY_WORDS array literal');
const words = src
  .slice(open + 1, close)
  .split(',')
  .map(s => s.trim().replace(/^"|"$/g, ''))
  .filter(Boolean);

// --- 1. zipf for every word, from wordfreq (the same source as the main sort).
const zipf = JSON.parse(
  execFileSync('python3', ['-c', `
import sys, json
from wordfreq import zipf_frequency
words = json.load(sys.stdin)
print(json.dumps({w: zipf_frequency(w.lower(), 'en') for w in words}))
`], { input: JSON.stringify(words), maxBuffer: 64 * 1024 * 1024 }).toString(),
);

// --- 2. The tail is the maximal SUFFIX of the array whose words are all zipf 0.
// (Defined by the data, not by a hardcoded index, so the tool is re-runnable.)
let tailStart = words.length;
while (tailStart > 0 && (zipf[words[tailStart - 1]] ?? 0) === 0) tailStart--;
const head = words.slice(0, tailStart);
const tail = words.slice(tailStart);

if (tail.length === 0) {
  console.log('No unranked tail found — nothing to sort.');
  process.exit(0);
}

// --- 3. Base-lemma frequency for each tail word.
const dictSet = new Set(words);
/** Candidate base forms, longest-plausible first. Purely orthographic. */
function baseCandidates(w) {
  const out = [];
  const add = s => { if (s.length >= 3) out.push(s); };
  if (w.endsWith('ING')) {
    add(w.slice(0, -3));            // ABODING -> ABOD
    add(w.slice(0, -3) + 'E');      // ABODING -> ABODE
    add(w.slice(0, -4));            // doubled consonant: RIPPING -> RIP
  }
  if (w.endsWith('ED')) {
    add(w.slice(0, -2));            // ABODED -> ABOD
    add(w.slice(0, -1));            // ABODED -> ABODE
    add(w.slice(0, -3));            // doubled consonant
  }
  if (w.endsWith('ER') || w.endsWith('ES')) {
    add(w.slice(0, -2));            // ABIDER -> ABID
    add(w.slice(0, -1));            // ABIDER -> ABIDE
  }
  if (w.endsWith('EST')) { add(w.slice(0, -3)); add(w.slice(0, -2)); }
  if (w.endsWith('S')) add(w.slice(0, -1));           // ABOVES -> ABOVE
  if (w.endsWith('Y')) { add(w.slice(0, -1)); add(w.slice(0, -2)); } // ZINCY -> ZINC
  if (w.endsWith('LY')) add(w.slice(0, -2));
  return out;
}

// Score every candidate base in one python round-trip.
const allCandidates = [...new Set(tail.flatMap(baseCandidates))];
const baseZipf = JSON.parse(
  execFileSync('python3', ['-c', `
import sys, json
from wordfreq import zipf_frequency
words = json.load(sys.stdin)
print(json.dumps({w: zipf_frequency(w.lower(), 'en') for w in words}))
`], { input: JSON.stringify(allCandidates), maxBuffer: 64 * 1024 * 1024 }).toString(),
);

function familiarity(w) {
  let best = 0;
  for (const base of baseCandidates(w)) {
    // Prefer bases that are themselves real playable words; fall back to any
    // base with a corpus frequency (handles bases we deliberately purged).
    const z = baseZipf[base] ?? 0;
    if (z > best && (dictSet.has(base) || z >= 3)) best = z;
  }
  return best;
}

const scored = tail.map(w => ({ w, f: familiarity(w) }));
scored.sort((a, b) => (b.f - a.f) || (a.w < b.w ? -1 : a.w > b.w ? 1 : 0));
const sortedTail = scored.map(s => s.w);

const changed = sortedTail.some((w, i) => w !== tail[i]);

const withBase = scored.filter(s => s.f > 0).length;
console.log(`Dictionary: ${words.length} words`);
console.log(`Unranked (zipf 0) tail: ${tail.length} words, from index ${tailStart}`);
console.log(`  resolved a base lemma for ${withBase}/${tail.length} (${((withBase / tail.length) * 100).toFixed(1)}%)`);
console.log(`  most familiar: ${sortedTail.slice(0, 8).join(', ')}`);
console.log(`  least familiar: ${sortedTail.slice(-8).join(', ')}`);

if (CHECK_ONLY) {
  if (changed) {
    console.error('\nTail is NOT sorted by base-lemma frequency. Run without --check to fix.');
    process.exit(1);
  }
  console.log('\nTail is correctly sorted.');
  process.exit(0);
}

if (!changed) {
  console.log('\nTail already sorted — no write needed.');
  process.exit(0);
}

const out = [...head, ...sortedTail];
if (out.length !== words.length) throw new Error('word count changed — aborting');
if (new Set(out).size !== new Set(words).size) throw new Error('word set changed — aborting');
// Shape guard: every entry must be a bare A-Z token. A parser that mis-anchors
// on the array literal produces a first entry like `] = ["THE`, which is a
// silent corruption rather than a crash — refuse to write it.
const malformed = out.filter(w => !/^[A-Z]{3,7}$/.test(w));
if (malformed.length > 0) {
  throw new Error(`refusing to write ${malformed.length} malformed entries, e.g. ${JSON.stringify(malformed.slice(0, 3))}`);
}

fs.writeFileSync(
  DICT,
  `export const DICTIONARY_WORDS: string[] = [${out.map(w => `"${w}"`).join(',')}];\n`,
);
console.log(`\nWrote ${DICT} (head untouched, ${tail.length}-word tail reordered).`);
