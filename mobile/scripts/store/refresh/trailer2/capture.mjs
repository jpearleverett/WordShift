/**
 * Capture core for the second trailer (trailer2). The same discipline as
 * ../recordTrailer.mjs (brief section 10): only local progression is seeded,
 * everything on screen is reached through real UI input, the DOM is never
 * edited, and every request that is not to localhost is aborted (lib.mjs).
 *
 * What is new here: each clip chooses its own window and device scale factor,
 * so a close-up can be recorded at DPR 5 (2160 px wide from a 432 CSS window)
 * and cropped without softening, and a whole-house shot can use a taller
 * window. Clock-stepped capture is unchanged: the page clock is paused and
 * advanced one 30 fps frame before every screenshot, and input happens only
 * between frames.
 *
 * Frames:  $TRAILER2_WORK/clips/<clip>/f00000.png ...  (file index = frame + HANDLE)
 * Events:  $TRAILER2_WORK/events/<clip>.json
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, gitHead, srcClean, visibleGlitchTexts } from '../lib.mjs';
import { stageState } from '../states.mjs';

export const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const WORK = process.env.TRAILER2_WORK || path.join(os.tmpdir(), 'wordshift-trailer2');
export const FPS = 30;
export const HANDLE = 15;
const HEAD = gitHead();
const SRC_CLEAN = srcClean();

/** Words that must never show on a recorded board, preview or pit word (brief 10.13). */
export const GRIM = ['SLAY', 'SLAYS', 'SLAYED', 'SLAIN', 'KILL', 'KILLS', 'KILLED', 'DEAD', 'DEATH', 'DIE', 'DIED', 'DIES', 'GRAVE', 'GRAVES', 'TOMB', 'TOMBS',
  'DOOM', 'GORE', 'BLOOD', 'MURDER', 'CORPSE', 'STAB', 'STABS', 'WOUND', 'MAIM', 'SHOOT', 'SHOT', 'GUN', 'GUNS', 'BOMB', 'HANG', 'HANGS', 'HANGED', 'RAPE', 'SLAUGHTER', 'VOID', 'OMEN',
  'WRAITH', 'CURSE', 'BONE', 'BONES', 'SKULL', 'RABID', 'HATE', 'HATED', 'RAGE', 'WAR', 'WARS', 'PAIN', 'TORTURE', 'ROT', 'ROTS', 'ROTTEN', 'POISON', 'FEAR', 'DREAD', 'GHOST', 'GHOUL', 'DEMON'];
/** Real words that would read awkwardly in a store video. */
export const AWKWARD = ['BOSOM', 'BUST', 'BUSTS', 'NUDE', 'NUDES', 'SEXY', 'SEX', 'SEXES', 'SEXED', 'BRA', 'BRAS', 'BUTT', 'TIPSY', 'DRUNK', 'BOOZE', 'SLUT', 'PIMP', 'DRUG', 'DRUGS', 'METH',
  'KINK', 'KINKS', 'KINKY', 'HORNY', 'NAKED', 'LUST', 'LUSTY', 'BUXOM', 'BOOB', 'BOOBS', 'PORN', 'WHORE', 'SPANK', 'THONG', 'PANTY', 'ORGY', 'STRIP', 'STRIPS', 'LEWD', 'RANDY',
  'DIS', 'DISS', 'ASS', 'ARSE', 'CRAP', 'PEE', 'PISS', 'POO', 'DAMN', 'IDIOT', 'STUPID', 'DUMB', 'UGLY', 'FAT', 'LOSER', 'NOOSE', 'COFFIN', 'MORGUE', 'ABUSE', 'ARSON', 'SUICIDE'];

let RANK = null;
/** Frequency rank within a word's length (0 most common, 1 rarest), as getFeaturedRank. */
export async function featuredRank(word) {
  if (!RANK) {
    const all = (await readFile(path.join(mobile, 'src/dictionary.ts'), 'utf8')).match(/"[A-Z]+"/g).map(w => w.slice(1, -1));
    const byLen = {}; RANK = new Map();
    for (const w of all) (byLen[w.length] ??= []).push(w);
    for (const list of Object.values(byLen)) list.forEach((w, i) => RANK.set(w, i / list.length));
  }
  return RANK.get(word) ?? 1;
}
/** Board words above this rank are obscure, validity-only words: too odd for a trailer. */
export const rankCeiling = w => (w.length >= 6 ? 0.9 : 0.85);

export class RetakeError extends Error {}

/** Words in view: the saved board's rows, preview labels and pit words. */
export async function frameWords(page) {
  return page.evaluate(() => {
    const labels = [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label'));
    const words = new Set();
    for (const l of labels) {
      let m = l.match(/(?:forms|would form) ([A-Z]+)/); if (m) words.add(m[1]);
      m = l.match(/^Word: ([A-Za-z]+), tap to offer$/); if (m) words.add(m[1].toUpperCase());
    }
    const board = JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || 'null');
    if (board?.rows) for (const r of board.rows) words.add(r.words.map(l => l.char).join(''));
    return [...words];
  });
}

/** Boot a fresh install in a window of the clip's size and stage a seeded state. */
export async function boot(stateId, { w = 432, h = 768, dsf = 2.5 } = {}) {
  const ctx = await launch({ width: w, height: h, dsf, reducedMotion: false, clock: true });
  await stageState(ctx.page, stateId);
  return ctx;
}

/**
 * Records one clip. `used` frames (0..used-1) are for the edit, recorded with
 * HANDLE frames either side; or `until(probes, f)` returns the last used
 * frame. `actions[n]` runs just before frame n is captured and returns
 * { action, sfx } for the event log. `window` is the recorded CSS rectangle
 * { x, y, w, h } at scale `dsf` (defaults to the whole viewport).
 */
export async function recordClip(page, clip, { state, dsf, window: win = null, used = 0, actions = {}, probe = null, until = null, maxFrames = 900, notes = [], meta = {}, afterFrame = null }) {
  const vp = page.viewportSize();
  const rect = win ?? { x: 0, y: 0, w: vp.width, h: vp.height };
  const pxW = Math.round(rect.w * dsf), pxH = Math.round(rect.h * dsf);
  const dir = path.join(WORK, 'clips', clip);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  const t = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(t + 100);
  const cdp = await page.context().newCDPSession(page);
  const events = [], probes = {}, screening = { glitch: [], grim: [] };
  let end = used ? used - 1 + HANDLE : Infinity;
  let elapsed = 0;
  for (let f = -HANDLE; f <= end; f++) {
    if (f - -HANDLE > maxFrames) throw new Error(`${clip}: no end after ${maxFrames} frames`);
    if (actions[f]) {
      const ev = await actions[f]();
      for (const e of [].concat(ev || [])) events.push({ frame: f, ...e });
    }
    const target = Math.round(((f + HANDLE + 1) * 1000) / FPS);
    await page.clock.runFor(target - elapsed);
    elapsed = target;
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale: dsf } });
    const png = Buffer.from(shot.data, 'base64');
    if (png.readUInt32BE(16) !== pxW || png.readUInt32BE(20) !== pxH) throw new Error(`${clip}: frame ${f} is ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}, not ${pxW}x${pxH}`);
    await writeFile(path.join(dir, `f${String(f + HANDLE).padStart(5, '0')}.png`), png);
    const glitch = await visibleGlitchTexts(page);
    if (glitch.length) screening.glitch.push({ frame: f, glitch });
    const words = await frameWords(page);
    const bad = words.filter(w => GRIM.includes(w) || AWKWARD.includes(w));
    if (bad.length) screening.grim.push({ frame: f, words: bad });
    if (probe) probes[f] = await probe(f);
    if (afterFrame) {
      const why = await afterFrame(f, probes[f]);
      if (why) screening.other = [...(screening.other ?? []), { frame: f, why }];
    }
    if (until && end === Infinity) {
      const e = until(probes, f);
      if (e !== null && e !== undefined) end = e + HANDLE;
    }
  }
  await page.clock.resume();
  await cdp.detach().catch(() => {});
  const frames = end + HANDLE + 1;
  const ok = screening.glitch.length === 0 && screening.grim.length === 0 && !(screening.other ?? []).length;
  const out = {
    clip, state, recordedAt: new Date().toISOString(), gitHead: HEAD, gameSourceMatchesHead: SRC_CLEAN,
    method: `clock-stepped capture: Playwright fake clock paused, runFor(1000/30 ms) then a CDP Page.captureScreenshot of the CSS rectangle ${JSON.stringify(rect)} of a ${vp.width}x${vp.height} viewport at DPR ${dsf} = ${pxW}x${pxH}; reducedMotion false; sound/music/haptics off in-game`,
    fps: FPS, handle: HANDLE, frameSize: { width: pxW, height: pxH }, viewport: vp, window: rect, dsf,
    frames, firstFrame: -HANDLE, lastFrame: end, framesDir: path.relative(WORK, dir),
    fileIndex: 'file f%05d.png = clip frame + handle', events, screening: { ...screening, ok }, notes, ...meta, probes,
  };
  await mkdir(path.join(WORK, 'events'), { recursive: true });
  await writeFile(path.join(WORK, 'events', `${clip}.json`), JSON.stringify(out, null, 1) + '\n');
  console.log(`${clip}: ${frames} frames (${-HANDLE}..${end}) at ${pxW}x${pxH}, ${events.length} events, screening ${ok ? 'ok' : JSON.stringify(screening)}`);
  if (!ok) throw new RetakeError(`${clip}: screening failed ${JSON.stringify(screening)}`);
  return out;
}

export async function retake(clip, fn, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try { return await fn(i); }
    catch (e) {
      if (!(e instanceof RetakeError) || i === tries - 1) throw e;
      console.log(`${clip}: retake ${i + 1}: ${e.message}`);
    }
  }
}

/** Per-frame mouse drag actions: down at `from`, one move per frame, up at `to`. */
export function dragActions(page, { from, to, x, y0, y1, x1 = x, label }) {
  const acts = {};
  acts[from] = async () => { await page.mouse.move(x, y0); await page.mouse.down(); return { action: `${label}: press at (${x},${y0})` }; };
  for (let f = from + 1; f < to; f++) {
    const k = (f - from) / (to - from);
    acts[f] = async () => { await page.mouse.move(x + (x1 - x) * k, y0 + (y1 - y0) * k); };
  }
  acts[to] = async () => { await page.mouse.move(x1, y1); await page.mouse.up(); return { action: `${label}: release at (${x1},${y1})` }; };
  return acts;
}
