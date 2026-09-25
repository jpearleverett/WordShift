/**
 * Records the real gameplay clips for trailer2 ("Such a Lovely House").
 *
 *   node scripts/store/refresh/trailer2/record.mjs            # every clip
 *   node scripts/store/refresh/trailer2/record.mjs K1 K8      # only these
 *
 * The Expo web build must be running on http://localhost:8081. Every clip
 * boots a fresh install on the pinned day (capture.mjs), seeds a coherent
 * local save (states2.mjs), reaches its moment through real UI input and is
 * captured clock-stepped. Frames go to $TRAILER2_WORK/clips/<clip>/, events
 * and per-frame probes to $TRAILER2_WORK/events/<clip>.json.
 *
 * Screening, per frame: the game's victory glitch strings, grim or awkward
 * words, achievement toasts, and per clip the exact dialogue text; house
 * clips also reject a resident emote over a plaque.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, dismissIntros } from '../lib.mjs';
import { boot, recordClip, retake, RetakeError, WORK, HANDLE } from './capture.mjs';
import { seed2 } from './states2.mjs';
import {
  openBoard, boardWords, solutionStep, boardProbe, victoryProbe, victoryEvents, toastVisible, dragMove,
  roomBox, panUntil, bottomClamp, homeChrome, residents, emoteClashes, dialogueBlocks,
} from './helpers.mjs';

const CLIPS = {};
const SAVES = path.join(WORK, 'saves');

async function withSession(state, opts, fn) {
  const seed = typeof state === 'string' ? seed2(state) : state;
  const ctx = await boot(seed, opts);
  try { return await fn(ctx.page); } finally { await ctx.browser.close(); }
}
const noToast = page => async () => { const t = await toastVisible(page); return t ? `toast ${t}` : null; };
const combine = (...fns) => async (f, p) => { for (const fn of fns) { const w = await fn(f, p); if (w) return w; } return null; };

// ---------------------------------------------------------------- K1 hook (state A')

/**
 * The opener board PLAY / PANT / HEAR at DPR 5 and 60 fps. The L is pressed
 * at -20 and dragged frame by frame into PANT (release at 26, PLANT), then the
 * T is dragged out of PLANT into HEAR (release at 66, HEART), and the victory
 * card blooms. Frame 0 (the poster) has the L mid-air over the open fan.
 */
CLIPS.K1 = () => retake('K1', () => withSession("A'", { w: 432, h: 844, dsf: 5 }, async page => {
  await openBoard(page, { story: 'finish' });
  await page.getByRole('button', { name: 'RESTART', exact: true }).first().click();
  await page.waitForTimeout(1500);
  const words = await boardWords(page);
  if (words.join(',') !== 'PLAY,PANT,HEAR') throw new Error(`K1: board is ${words}`);
  // Both steps' locators are computed from the untouched board (they are
  // queries, resolved when used: after the first drop for step 1).
  const s0 = await solutionStep(page, 0), s1 = await solutionStep(page, 1);
  const actions = {
    ...dragMove(page, { start: -15, end: 26, from: s0.letter, to: s0.slot, approx: page.getByTestId('puzzle-row-1'), label: 'drag the L out of PLAY', sfxUp: 'valid_move.wav' }),
    ...dragMove(page, { start: 42, end: 66, from: s1.letter, to: s1.slot, approx: page.getByTestId('puzzle-row-2'), label: 'drag the T out of PLANT', sfxUp: 'valid_move_2.wav' }),
  };
  let won = null;
  const out = await recordClip(page, 'K1', { state: "A'", dsf: 5, fps: 60, actions,
    probe: async f => ({ board: await boardProbe(page), victory: f >= 60 ? await victoryProbe(page) : null }),
    until: (probes, f) => {
      if (won === null && probes[f]?.victory?.card >= 0.5) won = f;
      return won !== null ? won + 90 : null;
    },
    afterFrame: noToast(page), meta: { board: 'PLAY/PANT/HEAR (curated opener)' } });
  out.marks = { cardHalfOpaque: won };
  out.events.push(...victoryEvents(out.probes));
  await writeFile(path.join(WORK, 'events', 'K1.json'), JSON.stringify(out, null, 1) + '\n');
  return out;
}), 6);

// ---------------------------------------------------------------- serving a specific bank board

const BANK = {
  std_easy: { file: 'puzzleBankEasy.ts', label: /^Easy difficulty/ },
  std_medium: { file: 'puzzleBankMedium.ts', label: /^Medium difficulty/ },
  std_mp: { file: 'puzzleBankMediumPlus.ts', label: /^Medium\+ difficulty/ },
  std_expert: { file: 'puzzleBankExpert.ts', label: /^Expert difficulty/ },
};
const STORAGE = key => `wordshift_played_${key}_puzzle_ids`;
async function bankIds(key) {
  const src = await readFile(path.join(new URL('../../../../src/data/', import.meta.url).pathname, BANK[key].file), 'utf8');
  return [...src.matchAll(/id:\s*'([0-9a-f]{12})'/g)].map(m => m[1]);
}

/**
 * The game-written autosave of one bank board, served by the game's own
 * selection in a throwaway session of the SAME state: every other board of
 * that bank is marked played, the difficulty is chosen in the real setup
 * menu, and the only unplayed board is served. The recording session then
 * restores that autosave (the same path the opener board uses).
 */
async function serveBoard(stateId, key, target) {
  const file = path.join(SAVES, `save_${target}_${stateId.replace("'", 'p')}.json`);
  if (existsSync(file)) return readFile(file, 'utf8');
  const base = seed2(stateId);
  const ids = (await bankIds(key)).filter(i => i !== target);
  const s = { ...base, extra: { ...base.extra, [STORAGE(key)]: ids } };
  // The save has no bank id: its rows are compared with the bank entry's words.
  const src = await readFile(path.join(new URL('../../../../src/data/', import.meta.url).pathname, BANK[key].file), 'utf8');
  const want = src.match(new RegExp(`id:'${target}',words:\\[([^\\]]*)\\]`))?.[1]?.replace(/'/g, '').split(',');
  return withSession(s, { w: 432, h: 1060, dsf: 1 }, async page => {
    const rowsNow = () => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || 'null')?.rows?.map(r => r.originalWord ?? r.words.map(l => l.char).join('')) ?? []);
    await openBoard(page, { story: 'defer' });
    // Play serves the preferred difficulty first; when that is the target's
    // bank, the only unplayed board is already on screen (choosing the
    // difficulty again would recycle the bank and serve another).
    if (!want || (await rowsNow()).join('/') !== want.join('/')) {
      await page.getByRole('button', { name: /Tap to change puzzle setup$/ }).click(); await page.waitForTimeout(800);
      await page.getByRole('button', { name: BANK[key].label }).first().click();
      await page.waitForTimeout(2500); await dismissIntros(page);
      const close = page.getByRole('button', { name: 'Close puzzle setup', exact: true });
      if (await close.isVisible().catch(() => false)) { await close.click({ position: { x: 4, y: 4 } }); await page.waitForTimeout(800); }
    }
    const save = await page.evaluate(() => localStorage.getItem('wordshift_in_progress_puzzle'));
    const board = JSON.parse(save);
    const got = await rowsNow();
    if (!want || want.join('/') !== got.join('/')) throw new Error(`serve ${target} in ${stateId}: the game served ${got.join('/')} (the board is not eligible in this state)`);
    await mkdir(SAVES, { recursive: true });
    await writeFile(file, save);
    console.log(`served ${target} in ${stateId}: ${board.rows.map(r => r.words.map(l => l.char).join('')).join('/')}`);
    return save;
  });
}

/**
 * One move of a served board, dragged frame by frame and released on frame
 * `drop`; only that move is played. `words` is the expected rows.
 */
function boardMoveClip(id, { state, key, target, words, dsf = 5, h = 844, pressAt = -12, drop = 0, used = 21 }) {
  return () => retake(id, async () => {
    const save = await serveBoard(state, key, target);
    return withSession(seed2(state, { board: save }), { w: 432, h, dsf }, async page => {
      await openBoard(page, { story: 'defer' });
      const w = await boardWords(page);
      if (w.join('/') !== words) throw new Error(`${id}: board is ${w.join('/')}`);
      const s0 = await solutionStep(page, 0);
      const actions = dragMove(page, { start: pressAt, end: drop, from: s0.letter, to: s0.slot, approx: page.getByTestId(`puzzle-row-${s0.to}`), label: `drag the ${s0.char} into ${s0.formed}`, sfxUp: 'valid_move.wav' });
      return recordClip(page, id, { state, dsf, fps: 30, used, actions, probe: async () => ({ board: await boardProbe(page) }),
        afterFrame: noToast(page), meta: { board: `${key} ${target}`, rows: words, move: `${s0.char}: ${s0.left} and ${s0.formed}` } });
    });
  });
}
CLIPS.K3 = boardMoveClip('K3', { state: "I'", key: 'std_mp', target: '538afda040cf', words: 'SHUNT/FRIED/COALS/BIKER' });
CLIPS.K4 = boardMoveClip('K4', { state: 'H', key: 'std_easy', target: '3b282a59c67d', words: 'WHIP/SING/POTS' });
CLIPS.K5 = boardMoveClip('K5', { state: 'H', key: 'std_mp', target: '4aa3908d3703', words: 'GLAZE/COVER/LANES/CIDER' });
CLIPS.K6 = boardMoveClip('K6', { state: 'H', key: 'std_expert', target: 'de622af3dde3', words: 'FLAVOR/PICKED/CORING/DIVERS/CARING', h: 960, pressAt: 0, drop: 13, used: 30 });
CLIPS.K11 = boardMoveClip('K11', { state: 'P2N9', key: 'std_medium', target: '1f5e9fa7137d', words: 'SOLD/PANT/PASS/DUTY', pressAt: -15, drop: 0, used: 30 });
CLIPS.K11h = boardMoveClip('K11h', { state: 'P2N9', key: 'std_medium', target: 'cfcc12783bd4', words: 'SALT/HOWS/TANK/BUNS', pressAt: -15, drop: 0, used: 30 });

// ---------------------------------------------------------------- house clips

const houseProbe = page => async () => ({ chrome: await homeChrome(page), den: await roomBox(page, 'Cozy Den'), emote: await emoteClashes(page) });
const noEmote = page => async (f, p) => (p?.emote?.length ? `emote over ${p.emote.join(', ')}` : null);
async function settleHome(page) {
  await page.waitForTimeout(3500);
  await dismissIntros(page);
  for (let i = 0; i < 3; i++) {
    const g = page.getByRole('button', { name: /^(Maybe later|Come back to this|Close)$/ });
    if (await g.first().isVisible().catch(() => false)) { await g.first().click(); await page.waitForTimeout(500); }
  }
}

/** K2: the whole phase-0 house in its valley (675x1340 at DPR 3.2, 60 fps); Axel is invited at 120-192. */
CLIPS.K2 = () => retake('K2', () => withSession("I'", { w: 675, h: 1340, dsf: 3.2 }, async page => {
  await settleHome(page);
  const acts = {
    120: async () => { await page.getByRole('button', { name: 'Invite animal to Aquarium Room for 100 amber', exact: true }).click(); return { action: 'tap the empty Aquarium Room invite card', sfx: 'ui_tap.wav' }; },
    184: async () => { const b = await page.getByRole('button', { name: 'Invite for 100 amber', exact: true }).boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); return { action: 'press Invite for 100 amber' }; },
    192: async () => { await page.mouse.up(); return { action: 'release: Axel moves in', sfx: 'unlock.wav' }; },
  };
  return recordClip(page, 'K2', { state: "I'", dsf: 3.2, fps: 60, used: 240, actions: acts,
    probe: async () => ({ ...(await houseProbe(page)()), aquarium: await roomBox(page, 'Aquarium Room') }),
    afterFrame: combine(noToast(page), noEmote(page)) });
}), 6);

/** K2b: the "A NEW FRIEND!" card and Axel's first words, phone framing at DPR 5. */
const AXEL = ['Oh!', 'Hello!', 'A bubble popped and there you were.', "That's the best thing a bubble has ever done."];
CLIPS.K2b = () => retake('K2b', () => withSession("I'", { w: 432, h: 768, dsf: 5 }, async page => {
  await settleHome(page);
  await panUntil(page, async () => (await roomBox(page, 'Aquarium Room'))?.y ?? null, 322, 3);
  await page.waitForTimeout(1500);
  const acts = {
    0: async () => { await page.getByRole('button', { name: 'Invite animal to Aquarium Room for 100 amber', exact: true }).click(); return { action: 'tap the invite card', sfx: 'ui_tap.wav' }; },
    40: async () => { await page.getByRole('button', { name: 'Invite for 100 amber', exact: true }).click(); return { action: 'Invite for 100 amber: Axel moves in', sfx: 'unlock.wav' }; },
  };
  const out = await recordClip(page, 'K2b', { state: "I'", dsf: 5, fps: 30, used: 90, actions: acts,
    probe: async f => ({ blocks: f >= 40 ? await dialogueBlocks(page, AXEL) : null, medallion: await page.evaluate(() => {
      const r = [...document.querySelectorAll('div,span')].find(d => d.children.length === 0 && /^A NEW FRIEND!?$/i.test(d.textContent.trim()));
      const img = [...document.querySelectorAll('img')].find(i => /axolotl/i.test(i.getAttribute('src') || '') && i.getBoundingClientRect().width > 60);
      const b = el => { if (!el) return null; const q = el.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; };
      return { ribbon: b(r), portrait: b(img) };
    }) }), afterFrame: noToast(page) });
  const last = out.probes[out.lastFrame - HANDLE];
  if (!last?.blocks || last.blocks.text !== AXEL.join(' ')) throw new RetakeError(`K2b: sheet reads ${last?.blocks?.text}`);
  return out;
}), 6);

/** K7a: the Jungle Hammock is built (phase 1, afternoon), K7b: Sloane's intro page 4 (same session). */
const SLOANE = ['Three moths live in my fur.', 'I call all three Gerald.', 'They arrived separately, but three names would only complicate the administration.'];
CLIPS.K7 = () => retake('K7', () => withSession('BUILD24', { w: 432, h: 768, dsf: 5 }, async page => {
  await settleHome(page);
  const card = page.getByRole('button', { name: 'Build Jungle Hammock for 200 amber', exact: true }).first();
  await panUntil(page, async () => { const b = await card.boundingBox(); return b ? b.y + b.height / 2 : null; }, 450, 3);
  await page.waitForTimeout(1500);
  const a = {
    0: async () => { await card.click({ force: true }); return { action: 'tap the Jungle Hammock card', sfx: 'ui_tap.wav' }; },
    20: async () => { await page.getByRole('button', { name: 'Unlock room for 200 amber', exact: true }).click(); return { action: 'Unlock room for 200 amber: the room is built', sfx: 'unlock.wav' }; },
  };
  const k7a = await recordClip(page, 'K7a', { state: 'BUILD24', dsf: 5, fps: 30, used: 50, actions: a,
    probe: async () => ({ ...(await houseProbe(page)()), jungle: await roomBox(page, 'Jungle Hammock') }), afterFrame: combine(noToast(page), noEmote(page)) });
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: /^Invite animal to Jungle Hammock/ }).first().click(); await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Invite for 100 amber', exact: true }).click(); await page.waitForTimeout(1200);
  for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: 'Continue intro', exact: true }).click(); await page.waitForTimeout(700); }
  await page.waitForTimeout(800);
  const k7b = await recordClip(page, 'K7b', { state: 'BUILD24', dsf: 5, fps: 30, used: 110, probe: async () => ({ blocks: await dialogueBlocks(page, SLOANE) }), afterFrame: noToast(page) });
  const t = k7b.probes[0]?.blocks?.text;
  if (t !== SLOANE.join(' ')) throw new RetakeError(`K7b: sheet reads ${t}`);
  return { k7a, k7b };
}), 6);

/** K8: Panko's spice jars (state D, phase 1), phone framing at DPR 5, typed out and held. */
const PANKO = 'Something funny happened. I went to bed with the spice jars in one order and woke up to find them in another. I must have moved them in my sleep. I must have.';
CLIPS.K8 = () => retake('K8', () => withSession('D', { w: 432, h: 768, dsf: 5 }, async page => {
  await settleHome(page);
  await panUntil(page, async () => { const r = await roomBox(page, 'Rustic Kitchen'); return r ? r.y + r.h / 2 : null; }, 450, 3);
  await page.waitForTimeout(1500);
  const panko = page.getByRole('button', { name: /^Panko the pangolin/ }).first();
  let complete = null;
  const out = await recordClip(page, 'K8', { state: 'D', dsf: 5, fps: 30,
    actions: { 60: async () => { await panko.click(); return { action: 'tap Panko the pangolin', sfx: 'dialogue.wav' }; } },
    probe: async f => ({ ...(await houseProbe(page)()), kitchen: await roomBox(page, 'Rustic Kitchen'), blocks: f >= 60 ? await dialogueBlocks(page) : null }),
    until: (probes, f) => {
      const t = probes[f]?.blocks?.text;
      if (t && !PANKO.startsWith(t)) throw new RetakeError(`K8: the page reads "${t.slice(0, 60)}"`);
      if (complete === null && t === PANKO) complete = f;
      return complete !== null ? complete + 95 : null;
    }, afterFrame: combine(noToast(page), noEmote(page)) });
  out.marks = { revealComplete: complete };
  await writeFile(path.join(WORK, 'events', 'K8.json'), JSON.stringify(out, null, 1) + '\n');
  return out;
}), 8);

/** K9 and K10: the whole house, afternoon (B) and sunset (E'), same window, resting. */
function wideRest(id, state, used) {
  return () => retake(id, () => withSession(state, { w: 1500, h: 2667, dsf: 1.44 }, async page => {
    await settleHome(page);
    const res = await residents(page);
    // Emote puffs are not screened here: in these whole-house views a room
    // plaque is about 10 px tall, too small for a puff to garble anything
    // legible (the phone-scale close-ups keep the check).
    return recordClip(page, id, { state, dsf: 1.44, fps: 30, used, probe: houseProbe(page), afterFrame: noToast(page), meta: { residents: res } });
  }), 6);
}
CLIPS.K9 = wideRest('K9', 'B', 40);
CLIPS.K10 = wideRest('K10', "E'", 180);

/** K12: Ember at dusk (P2N9E): her line types out and holds. */
const EMBER1 = 'I am fond of you, whatever my fire is up to.';
CLIPS.K12 = () => retake('K12', () => withSession('P2N9E', { w: 432, h: 768, dsf: 5 }, async page => {
  await settleHome(page);
  await panUntil(page, async () => { const r = await roomBox(page, 'Cozy Den'); return r ? r.y + r.h / 2 : null; }, 500, 20);
  await page.waitForTimeout(1500);
  const ember = page.getByRole('button', { name: /^Ember the fox/ }).first();
  let full = null;
  const out = await recordClip(page, 'K12', { state: 'P2N9E', dsf: 5, fps: 30,
    actions: { 40: async () => { await ember.click(); return { action: 'tap Ember the fox', sfx: 'dialogue.wav' }; } },
    probe: async f => ({ ...(await houseProbe(page)()), blocks: f >= 40 ? await dialogueBlocks(page) : null }),
    until: (probes, f) => {
      const b = probes[f]?.blocks;
      if (b?.blocks?.[0] && !EMBER1.startsWith(b.blocks[0].text) && !b.blocks[0].text.startsWith(EMBER1)) throw new RetakeError(`K12: the page reads "${b.text.slice(0, 60)}"`);
      if (full === null && b?.blocks?.[0]?.text === EMBER1) full = f;
      return full !== null ? full + 75 : null;
    }, afterFrame: combine(noToast(page), noEmote(page)) });
  out.marks = { block1Complete: full };
  await writeFile(path.join(WORK, 'events', 'K12.json'), JSON.stringify(out, null, 1) + '\n');
  return out;
}), 8);

// ---------------------------------------------------------------- main
if (process.argv[2] === '--serve') {
  const [state, key, id] = process.argv.slice(3);
  const save = await serveBoard(state, key, id);
  const b = JSON.parse(save);
  console.log(b.rows.map(r => r.words.map(l => l.char).join('')).join('/'));
  process.exit(0);
}
const wanted = process.argv.slice(2).filter(a => !a.startsWith('-'));
const run = wanted.length ? wanted : Object.keys(CLIPS);
let failed = 0;
for (const id of run) {
  if (!CLIPS[id]) { console.error(`unknown clip ${id}`); failed++; continue; }
  const t0 = Date.now();
  try { await CLIPS[id](); console.log(`${id} done in ${Math.round((Date.now() - t0) / 1000)} s`); }
  catch (e) { failed++; console.error(`clip ${id} failed: ${e.stack || e.message}`); }
}
process.exitCode = failed ? 1 : 0;
