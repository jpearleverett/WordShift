// Copy and word gates (spec 7.2, gates 1, 2 and 7's source grep).
//
//   node scripts/store/cinematic/qa/lint.mjs      -> prints results, exits 1 on any failure
//
// Every string the film shows is listed here or read from the caption table, and a
// scan of the shot sources fails when a new literal appears that this file does not know.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAPTIONS, SRT_LINES } from '../src/timeline/events.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const MOBILE = path.resolve(ROOT, '../../..');

/** Words shown on tiles, jars and the blueprint (spec section 4). */
export const TILE_WORDS = [
  'PLAY', 'PANT', 'HEAR', 'PAY', 'PLANT', 'PLAN', 'HEART',
  'SNAP', 'MILE', 'NAP', 'SMILE',
  'SPOON', 'SUPER', 'SOON', 'SUPPER',
  'GLOVES', 'LITTER', 'LOVES', 'GLITTER',
  'MOST', 'MOSTLY',
];
export const LABEL_WORDS = ['SAGE', 'MINT', 'DILL', 'PLAN'];
/** Every other on-screen string outside the caption table. */
export const OTHER_STRINGS = [
  'Three moths live in my fur. I call all three Gerald.',
  'Sloane',
  'A cozy word game.',
];
/** Moves the film performs (section 4): [source, target, result source, result target]. */
export const MOVES = [
  ['PLAY', 'PANT', 'PAY', 'PLANT'],
  ['PLANT', 'HEAR', 'PLAN', 'HEART'],
  ['SNAP', 'MILE', 'NAP', 'SMILE'],
  ['SPOON', 'SUPER', 'SOON', 'SUPPER'],
  ['GLOVES', 'LITTER', 'LOVES', 'GLITTER'],
];

const BANNED = ['download', 'install', 'play now', 'get it', 'try', 'best', '#1', 'top', 'new', 'free', 'sale', 'now', 'today', 'limited', 'composed', 'orchestral'];

const failures = [];
const fail = (gate, msg) => failures.push(`${gate}: ${msg}`);

// ---- gate 1: copy lint
const copy = [...CAPTIONS.map((c) => c.text), ...SRT_LINES.map((c) => c.text), ...OTHER_STRINGS];
for (const s of new Set(copy)) {
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp < 32 || cp > 126) fail('copy', `non-ASCII U+${cp.toString(16).toUpperCase()} in "${s}"`);
  }
  if (s.includes('!')) fail('copy', `"!" in "${s}"`);
  const low = ` ${s.toLowerCase().replace(/[^a-z0-9#' ]/g, ' ')} `;
  for (const b of BANNED) if (low.includes(` ${b} `)) fail('copy', `banned "${b}" in "${s}"`);
}

// ---- gate 2: words exist, are not blocked, and every move is a real remove-and-insert
const dictSrc = fs.readFileSync(path.join(MOBILE, 'src/dictionary.ts'), 'utf8');
const DICT = new Set(JSON.parse(dictSrc.slice(dictSrc.indexOf('= [') + 2, dictSrc.lastIndexOf(']') + 1)));
const blockedSrc = fs.readFileSync(path.join(MOBILE, 'src/constants/blockedWords.ts'), 'utf8');
const BLOCKED = new Set([...blockedSrc.slice(blockedSrc.indexOf('BLOCKED_WORDS = ['), blockedSrc.indexOf('];')).matchAll(/'([A-Z]+)'/g)].map((m) => m[1]));
if (DICT.size < 10000 || BLOCKED.size < 20) fail('words', `could not parse the dictionary (${DICT.size}) or blocklist (${BLOCKED.size})`);
for (const w of new Set([...TILE_WORDS, ...LABEL_WORDS])) {
  if (!DICT.has(w)) fail('words', `${w} is not in dictionary.ts`);
  if (BLOCKED.has(w)) fail('words', `${w} is blocked`);
}
for (const [a, b, a2, b2] of MOVES) {
  let ok = false;
  for (let i = 0; i < a.length && !ok; i++) {
    const ch = a[i];
    if (a.slice(0, i) + a.slice(i + 1) !== a2) continue;
    for (let j = 0; j <= b.length; j++) if (b.slice(0, j) + ch + b.slice(j) === b2) { ok = true; break; }
  }
  if (!ok) fail('words', `move ${a}/${b} -> ${a2}/${b2} is not one letter moved`);
}

// ---- gate 7 (source half): no nondeterminism in the frame code
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const srcFiles = walk(path.join(ROOT, 'src')).filter((f) => f.endsWith('.js'));
const code = (f) => fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
// main.js's live-preview mode reads the wall clock on purpose; renderAt(t) never does
for (const f of srcFiles.filter((x) => !x.endsWith(`${path.sep}main.js`))) {
  const txt = code(f);
  const m = txt.match(/Math\.random|Date\.now|new Date\(|performance\.now/);
  if (m) fail('determinism', `${path.relative(ROOT, f)} uses ${m[0]}`);
}

// ---- unknown literals: uppercase words in quotes in the shot sources must be known words
const known = new Set([...TILE_WORDS, ...LABEL_WORDS, 'L', 'M', 'O', 'S', 'T', 'Y']);
for (const f of srcFiles.filter((x) => x.includes(`${path.sep}shots${path.sep}`))) {
  const txt = code(f);
  for (const m of txt.matchAll(/['"`]([A-Z]{3,8})['"`]/g)) {
    if (!known.has(m[1]) && !/^(S\d\d|MSAA|RGB|RGBA|HDR)$/.test(m[1])) fail('words', `${path.relative(ROOT, f)} shows an unlisted word "${m[1]}" (add it to qa/lint.mjs after checking it)`);
  }
}

// ---- asset allowlist (spec 6.4): scan source paths for blocked assets
const BLOCKED_ASSETS = [/robed/, /aye_aye/, /workshop/, /shadow_figure/, /\bentity/, /pit_entrance/, /pitt_/, /sky_(day|storm|shadow|peace|night)/, /story\//];
for (const f of srcFiles) {
  const txt = code(f);
  for (const re of BLOCKED_ASSETS) if (re.test(txt)) fail('assets', `${path.relative(ROOT, f)} references ${re}`);
}

const result = { ok: failures.length === 0, failures, counts: { strings: new Set(copy).size, words: TILE_WORDS.length + LABEL_WORDS.length, moves: MOVES.length, sources: srcFiles.length } };
console.log(JSON.stringify(result, null, 2));
if (import.meta.url === `file://${process.argv[1]}`) process.exit(result.ok ? 0 : 1);
export default result;
