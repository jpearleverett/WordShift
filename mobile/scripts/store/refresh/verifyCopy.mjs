#!/usr/bin/env node
// Verifies the refresh-2026-09 store copy pack (copy/ plus alt-text.tsv and the
// SRT when they exist). Run from anywhere:
//
//   node mobile/scripts/store/refresh/verifyCopy.mjs
//
// It checks what the brief (section 8 and section 10) requires of the text:
// Play character limits, plain ASCII (no en/em dashes, no curly quotes), no
// "..." or "--", no promotional or call-to-action words in player-facing
// strings (trailer captions and SRT cue text included), alt text of 140
// characters or fewer, the counts recorded in listing-en-US.json, that each
// .txt file holds exactly its field plus one final newline, and that every cue
// of video/captions-en.srt equals the matching trailer.captions entry (text,
// start and end). It exits 1 on any failure and prints a short report.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const campaign = path.resolve(here, '../../../assets/Play_store/refresh-2026-09');
const copyDir = path.join(campaign, 'copy');

const failures = [];
const warnings = [];
const fail = message => failures.push(message);
const warn = message => warnings.push(message);
const chars = text => [...text].length;

// 1. Every text file in copy/ (and alt-text.tsv, the SRT) is plain ASCII with
//    none of the forbidden punctuation.
const FORBIDDEN_CODEPOINTS = [0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d];
const textFiles = fs.readdirSync(copyDir).map(name => path.join(copyDir, name));
for (const extra of [path.join(campaign, 'alt-text.tsv'), path.join(campaign, 'video/captions-en.srt')]) {
  if (fs.existsSync(extra)) textFiles.push(extra);
}
// An SRT cue timing line ("00:00:01,400 --> 00:00:03,400") must carry "-->";
// it is the format, not copy, so it is left out of the punctuation checks.
const SRT_TIMING = /^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/;
for (const file of textFiles) {
  const raw = fs.readFileSync(file, 'utf8');
  const rel = path.relative(campaign, file);
  const text = file.endsWith('.srt') ? raw.split(/\r?\n/).filter(line => !SRT_TIMING.test(line)).join('\n') : raw;
  for (const cp of FORBIDDEN_CODEPOINTS) {
    if (text.includes(String.fromCodePoint(cp))) fail(`${rel}: contains U+${cp.toString(16).toUpperCase().padStart(4, '0')}`);
  }
  const nonAscii = [...text].filter(ch => ch.codePointAt(0) > 0x7f);
  if (nonAscii.length) fail(`${rel}: ${nonAscii.length} non-ASCII character(s), first ${JSON.stringify(nonAscii[0])}`);
  if (text.includes('...')) fail(`${rel}: contains "..."`);
  if (text.includes('--')) fail(`${rel}: contains "--"`);
}

// 2. The three field files: exactly the field plus one final newline.
const FIELD_FILES = { app_name: ['app-name.txt', 30], short_description: ['short-description.txt', 80], full_description: ['full-description.txt', 4000] };
const listing = JSON.parse(fs.readFileSync(path.join(copyDir, 'listing-en-US.json'), 'utf8'));
const fields = {};
for (const [key, [file, limit]] of Object.entries(FIELD_FILES)) {
  const raw = fs.readFileSync(path.join(copyDir, file), 'utf8');
  if (!raw.endsWith('\n') || raw.endsWith('\n\n')) fail(`${file}: must end with exactly one newline`);
  const value = raw.replace(/\n$/, '');
  if (value !== value.trim()) fail(`${file}: leading or trailing whitespace inside the field`);
  fields[key] = value;
  const n = chars(value);
  if (n > limit) fail(`${file}: ${n} characters, over the ${limit} limit`);
  if (listing[key] !== value) fail(`listing-en-US.json ${key} does not match ${file}`);
  if (listing.character_counts?.[key] !== n) fail(`listing-en-US.json character_counts.${key} is ${listing.character_counts?.[key]}, actual ${n}`);
}
if (fields.app_name.includes(':') && !/^WordShift: /.test(fields.app_name)) fail('app name must lead with the brand');
if (/[.!?]$/.test(fields.short_description)) fail('short description is one sentence with no final punctuation');
if (/[A-Z]{4,}/.test(fields.short_description)) fail('short description has capitals for emphasis');

// 3. Player-facing strings (everything a player, reviewer or viewer reads).
const owned = [];
const push = (where, text) => { if (typeof text === 'string' && text) owned.push([where, text]); };
push('app_name', fields.app_name);
push('short_description', fields.short_description);
push('full_description', fields.full_description);
for (const alt of listing.short_description_alternatives ?? []) push(`short alternative ${alt.id}`, alt.text);
push('app_name_alternative', listing.app_name_alternative?.text);
for (const s of listing.screenshots ?? []) {
  push(`screenshot ${s.order} headline`, s.headline);
  push(`screenshot ${s.order} subtitle`, s.subtitle);
  push(`screenshot ${s.order} alt`, s.alt_text);
}
for (const t of listing.tablet_screenshots ?? []) push(`tablet ${t.slug} alt`, t.alt_text);
for (const fg of [listing.feature_graphic, listing.feature_graphic_variant_b]) {
  push(`${fg.id} tagline`, fg.tagline);
  push(`${fg.id} alt`, fg.alt_text);
}
push('icon alt', listing.icon?.alt_text);
// Pre-checked fallback lines for the full description (for example the daily
// rank line): the swapped text must still fit, keep the keywords and pass every
// string check below.
for (const fb of listing.full_description_fallbacks ?? []) {
  if (!fields.full_description.includes(fb.replace)) fail(`fallback ${fb.id}: the line to replace is not in the full description`);
  const swapped = fields.full_description.replace(fb.replace, fb.with);
  if (chars(swapped) > 4000) fail(`fallback ${fb.id}: ${chars(swapped)} characters, over 4000`);
  push(`full_description with fallback ${fb.id}`, swapped);
}
push('trailer title', listing.trailer?.title);
push('trailer description', listing.trailer?.description);
push('trailer alt', listing.trailer?.alt);
const captions = (listing.trailer?.captions ?? []).map(c => [`trailer caption ${c.shot}`, c.text]);

// The SRT is what viewers read on YouTube: parse its cues, require each one to
// equal the listing's trailer.captions entry (text, start, end, same order),
// and scan its text like every other player-facing string.
const srtFile = path.join(campaign, 'video/captions-en.srt');
const srtCues = [];
if (fs.existsSync(srtFile)) {
  const blocks = fs.readFileSync(srtFile, 'utf8').replace(/\r/g, '').trim().split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split('\n');
    const timing = lines[1]?.match(/^(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})$/);
    if (!/^\d+$/.test(lines[0] ?? '') || !timing || lines.length < 3) { fail(`video/captions-en.srt: malformed cue ${JSON.stringify(block.slice(0, 60))}`); continue; }
    srtCues.push({ index: Number(lines[0]), start: timing[1], end: timing[2], text: lines.slice(2).join(' ') });
  }
  srtCues.forEach((cue, i) => { if (cue.index !== i + 1) fail(`video/captions-en.srt: cue ${i + 1} is numbered ${cue.index}`); });
  const listed = listing.trailer?.captions ?? [];
  if (srtCues.length !== listed.length) fail(`video/captions-en.srt has ${srtCues.length} cues, trailer.captions has ${listed.length}`);
  for (let i = 0; i < Math.min(srtCues.length, listed.length); i++) {
    const cue = srtCues[i], want = listed[i];
    for (const key of ['text', 'start', 'end']) {
      if (cue[key] !== want[key]) fail(`SRT cue ${i + 1} ${key} ${JSON.stringify(cue[key])} does not match trailer.captions ${want.shot} ${JSON.stringify(want[key])}`);
    }
  }
} else {
  warn('video/captions-en.srt not built yet: SRT cues not checked');
}

// "top" is allowed only as a position ("the top word"), never as a ranking.
const BANNED = [
  /\bbest\b/i, /#1\b/, /\btop\b(?! (word|row)\b)/i, /\bnew\b/i, /\bfree\b/i, /\bsale\b/i, /\bdiscount\b/i,
  /\b(download|install|play|try|get it) now\b/i, /\bno ads\b/i, /\bhand-?crafted\b/i, /\bhand-?tuned\b/i,
  /\bblind offering\b/i, /\bpractice boards?\b/i, /\bphase\b/i, /\bstage\b/i, /\bcomposed\b/i, /\borchestral\b/i,
  /\bmillion\b/i, /\baward/i, /\beditor'?s choice\b/i, /\bpopular\b/i,
  /under the floor/i, /the house is listening/i, /paying attention/i, /already written/i,
  /\bCLOSED\b/, /\bCLOSER\b/, /\brobe/i, /\bshadow\b/i, /\barrival\b/i, /\bcult\b/i, /\bsummon/i,
];
const scan = (list, report) => {
  for (const [where, text] of list) {
    for (const re of BANNED) if (re.test(text)) report(`${where}: matches ${re}`);
    if (text.includes('...')) report(`${where}: contains "..."`);
    if (/\p{Extended_Pictographic}/u.test(text)) report(`${where}: contains an emoji`);
  }
};
scan(owned, fail);
// Trailer captions are player-facing too (burned in and uploaded as the SRT).
scan(captions, fail);
scan(srtCues.map(c => [`SRT cue ${c.index}`, c.text]), fail);

// 4. Alt text: 140 characters or fewer.
for (const [where, text] of owned) {
  if (/ alt$/.test(where) && !/trailer/.test(where) && chars(text) > 140) fail(`${where}: ${chars(text)} characters, over 140`);
}

// 5. Distinct surfaces (brief boundary 11): no two short surfaces are equal,
//    and "Mostly." appears only in slot 03 and the end of the full description.
const surfaces = [
  ['short_description', fields.short_description],
  ...(listing.screenshots ?? []).flatMap(s => [[`screenshot ${s.order} headline`, s.headline], [`screenshot ${s.order} subtitle`, s.subtitle]]),
  [`FG-A tagline`, listing.feature_graphic?.tagline],
  [`FG-B tagline`, listing.feature_graphic_variant_b?.tagline],
  ...captions,
].filter(([, t]) => t);
const norm = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
for (let i = 0; i < surfaces.length; i++) {
  for (let j = i + 1; j < surfaces.length; j++) {
    if (norm(surfaces[i][1]) === norm(surfaces[j][1])) fail(`"${surfaces[i][1]}" repeats on ${surfaces[i][0]} and ${surfaces[j][0]}`);
  }
}
const mostly = [...owned, ...captions].filter(([, t]) => /\bMostly\b/.test(t)).map(([w]) => w);
// Slot 03's alt text repeats its burned-in headline for screen readers, so it may carry the line too.
const mostlyAllowed = new Set(['screenshot 3 headline', 'screenshot 3 alt', 'full_description']);
for (const w of mostly) if (!mostlyAllowed.has(w) && !/^full_description with fallback /.test(w)) fail(`"Mostly." used on ${w}`);
if (!/A cozy word game\. Mostly\.$/.test(fields.full_description)) fail('full description must end with the "Mostly." line');

// 6. Report.
const full = fields.full_description.toLowerCase();
const count = phrase => (full.match(new RegExp(phrase, 'g')) ?? []).length;
console.log(`app name           ${chars(fields.app_name)}/30   ${fields.app_name}`);
console.log(`short description  ${chars(fields.short_description)}/80   ${fields.short_description}`);
console.log(`full description   ${chars(fields.full_description)}/4000`);
console.log(`keywords           word puzzle ${count('word puzzle')}, word game ${count('word game')}, cozy ${count('cozy')}, word ladders ${count('word ladders')}, offline ${count('offline')}, daily ${count('daily')}`);
console.log(`first 167 chars    ${JSON.stringify(fields.full_description.slice(0, 167))}`);
for (const fb of listing.full_description_fallbacks ?? []) {
  const swapped = fields.full_description.replace(fb.replace, fb.with).toLowerCase();
  console.log(`fallback ${fb.id}`.padEnd(19) + ` ${chars(swapped)}/4000, daily ${(swapped.match(/daily/g) ?? []).length}`);
}
if (listing.trailer?.description) console.log(`trailer description ${chars(listing.trailer.description)} characters (YouTube limit 5000)`);
if (!fields.full_description.slice(0, 167).includes('cozy word puzzle game')) fail('"cozy word puzzle game" is not in the first 167 characters');
for (const w of warnings) console.log(`WARN  ${w}`);
for (const f of failures) console.log(`FAIL  ${f}`);
console.log(failures.length ? `\n${failures.length} failure(s)` : `\nAll copy checks passed (${textFiles.length} files, ${owned.length} strings).`);
process.exit(failures.length ? 1 : 0);
