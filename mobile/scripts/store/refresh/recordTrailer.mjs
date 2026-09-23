/**
 * Records the real gameplay clips for the refresh-2026-09 trailer
 * (assets/Play_store/refresh-2026-09/brief.md, section 6, "Recording method"
 * and "Clips").
 *
 * Run the app on http://localhost:8081 (this script never starts or stops it), then:
 *
 *   node scripts/store/refresh/recordTrailer.mjs            # every clip
 *   node scripts/store/refresh/recordTrailer.mjs R1 R8      # only these clips
 *
 * Method: clock-stepped capture. Each clip boots a fresh install in headless
 * Chromium at 432 CSS wide, DPR 2.5, and every frame is a 432x768 CSS window
 * of the page (exactly 1080x1920). Home, story and pit clips use a 432x768
 * viewport. Board clips use a 432x844 viewport and the window from CSS 50 to
 * 818: at 768 tall the action bar overlaps a four-row board's last row and the
 * third row's preview labels, so those rows read as cut off; at 844 every row
 * and label fits, and the window drops only the empty top of the header
 * (the part the caption plaque covers anyway).
 * with reduced motion OFF and sound, music and haptics off in the game's own
 * settings. Playwright's fake clock is installed before the page loads and
 * left flowing while the state is staged with real UI input. For the clip
 * itself the clock is paused and advanced by exactly one 30 fps frame
 * (33 or 34 ms) before every screenshot, so every animation the game drives
 * (springs, the typewriter, star pops, drift) lands on the frame grid with
 * no dropped or doubled frames. Input (taps and drags) happens only between
 * frames.
 *
 * Discipline (brief section 10):
 *   - only local progression is seeded (states A to J in states.mjs);
 *   - everything on screen is reached through real UI input;
 *   - the DOM is never edited, hidden, restyled or re-layered;
 *   - every request that is not to localhost / 127.0.0.1 is aborted;
 *   - every recorded frame is screened for the game's victory glitch strings
 *     and every board / pit word is screened for grim words; a failed take is
 *     re-recorded.
 *
 * Output:
 *   $TRAILER_WORK/clips/<clip>/f00000.png ...   frames (1080x1920 PNG), where
 *       file index = clip frame + handle (0.5 s = 15 frames of lead-in handle)
 *   assets/Play_store/refresh-2026-09/video/events/<clip>.json
 *       { clip, state, handle, frames, used, events: [{frame, action, sfx}], probes, marks, screening }
 *
 * TRAILER_WORK defaults to <os tmpdir>/wordshift-trailer. The frames are
 * large (about 1.2 GB for all 14 clips) and are not part of the campaign folder;
 * editTrailer.mjs reads them from the same place.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, launch, panHouse, playSolution, finishStory, dismissIntros, gitHead, srcClean, visibleGlitchTexts } from './lib.mjs';
import { stageState } from './states.mjs';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CAMPAIGN = path.join(mobile, 'assets/Play_store/refresh-2026-09');
const EVENTS = path.join(CAMPAIGN, 'video/events');
export const WORK = process.env.TRAILER_WORK || path.join(os.tmpdir(), 'wordshift-trailer');
export const FPS = 30;
export const HANDLE = 15;
const W = 432, H = 768, DSF = 2.5;
/** Board clips: taller viewport, and the recorded 768 CSS window starts this far down. */
const BOARD = { height: 844, cropTop: 50 };
const HEAD = gitHead();
const SRC_CLEAN = srcClean();

/** Words that must never show on a recorded board, preview or pit word (brief 10.13). */
const GRIM = ['SLAY', 'SLAYS', 'SLAYED', 'SLAIN', 'KILL', 'KILLS', 'KILLED', 'DEAD', 'DEATH', 'DIE', 'DIED', 'DIES', 'GRAVE', 'GRAVES', 'TOMB', 'TOMBS',
  'DOOM', 'GORE', 'BLOOD', 'MURDER', 'CORPSE', 'STAB', 'STABS', 'WOUND', 'MAIM', 'SHOOT', 'SHOT', 'GUN', 'GUNS', 'BOMB', 'HANG', 'HANGS', 'HANGED', 'RAPE', 'SLAUGHTER', 'VOID', 'OMEN',
  'WRAITH', 'CURSE', 'BONE', 'BONES', 'SKULL', 'RABID', 'HATE', 'HATED', 'RAGE', 'WAR', 'WARS', 'PAIN', 'TORTURE', 'ROT', 'ROTS', 'ROTTEN', 'POISON', 'FEAR', 'DREAD', 'GHOST', 'GHOUL', 'DEMON'];
/** Real words that would read awkwardly in a store video. */
const AWKWARD = ['BOSOM', 'BUST', 'BUSTS', 'NUDE', 'NUDES', 'SEXY', 'SEX', 'SEXES', 'SEXED', 'BRA', 'BRAS', 'BUTT', 'TIPSY', 'DRUNK', 'BOOZE', 'SLUT', 'PIMP', 'DRUG', 'DRUGS', 'METH',
  'KINK', 'KINKS', 'KINKY', 'HORNY', 'NAKED', 'LUST', 'LUSTY', 'BUXOM', 'BOOB', 'BOOBS', 'PORN', 'WHORE', 'SPANK', 'THONG', 'PANTY', 'ORGY', 'STRIP', 'STRIPS', 'LEWD', 'RANDY',
  'DIS', 'DISS', 'ASS', 'ARSE', 'CRAP', 'PEE', 'PISS', 'POO', 'DAMN', 'IDIOT', 'STUPID', 'DUMB', 'UGLY', 'FAT', 'LOSER', 'NOOSE', 'COFFIN', 'MORGUE', 'ABUSE', 'ARSON', 'SUICIDE'];

/**
 * Frequency rank of a word within its length (0 = most common, 1 = rarest),
 * the same measure as getFeaturedRank in src/services/localGenerator.ts: the
 * dictionary is sorted by true word frequency. A trailer board may only show
 * familiar words (INANER, a real but validity-only word, once reached the
 * montage and reads as a typo).
 */
let RANK = null;
async function featuredRank(word) {
  if (!RANK) {
    const all = (await readFile(path.join(mobile, 'src/dictionary.ts'), 'utf8')).match(/"[A-Z]+"/g).map(w => w.slice(1, -1));
    const byLen = {}; RANK = new Map();
    for (const w of all) (byLen[w.length] ??= []).push(w);
    for (const list of Object.values(byLen)) list.forEach((w, i) => RANK.set(w, i / list.length));
  }
  return RANK.get(word) ?? 1;
}
/**
 * DROP preview labels that would read as a mistake on screen: a check on a
 * string that is not a word, or a cross on a real word. On a Double Shift
 * first drop the marks grade whether the whole step can still be completed,
 * so both happen in play (as slot 05's capture also screens).
 */
async function confusingPreviews(labels) {
  await featuredRank('A');
  const out = [];
  for (const label of labels) {
    const good = label.match(/forms ([A-Z]+), valid word$/), bad = label.match(/would form ([A-Z]+), not a valid move$/);
    if (good && !RANK.has(good[1])) out.push(`check on ${good[1]}`);
    if (bad && RANK.has(bad[1])) out.push(`cross on ${bad[1]}`);
  }
  return out;
}

/**
 * Board words above this rank sit in the dictionary's obscure, validity-only
 * tail (CLAUDE.md: featured rank above about 0.85), too odd for a trailer;
 * six- and seven-letter words get a little more room.
 */
const rankCeiling = w => (w.length >= 6 ? 0.9 : 0.85);

// ---------------------------------------------------------------- recording core

class RetakeError extends Error {}

/**
 * Page-side probe run after every frame: glitch strings and the words in view
 * (board tiles are read from the saved board; previews and pit words from
 * their accessible names).
 */
async function frameWords(page) {
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

/**
 * Records one clip. `used` is the number of frames the edit may use (frames
 * 0..used-1); the clip is recorded from frame -HANDLE to used-1+HANDLE, or,
 * when `until(probes)` is given, until that returns a frame index `e` and
 * then to e+HANDLE. `actions[n]` runs just before frame n is captured and
 * returns { action, sfx } for the event log. `probe()` runs after every
 * frame and its result is kept per frame.
 */
async function recordClip(page, clip, { state, used = 0, actions = {}, probe = null, until = null, maxFrames = 600, notes = [], meta = {}, cropTop = 0, afterFrame = null }) {
  const dir = path.join(WORK, 'clips', clip);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  const t = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(t + 100);
  // Page.captureScreenshot straight over CDP: the same compositor frame
  // page.screenshot() returns, without Playwright's per-call bookkeeping.
  const cdp = await page.context().newCDPSession(page);
  const events = [], probes = {}, screening = { glitch: [], grim: [] };
  let end = used ? used - 1 + HANDLE : Infinity;
  let elapsed = 0;
  const wall0 = Date.now();
  if (process.env.TRAILER_DEBUG) console.log(`${clip}: staged, recording`);
  for (let f = -HANDLE; f <= end; f++) {
    if (process.env.TRAILER_DEBUG && f % 30 === 0) console.log(`${clip}: frame ${f} at ${Date.now() - wall0} ms`);
    if (f - -HANDLE > maxFrames) throw new Error(`${clip}: no end after ${maxFrames} frames`);
    if (actions[f]) {
      const ev = await actions[f]();
      for (const e of [].concat(ev || [])) events.push({ frame: f, ...e });
    }
    const target = Math.round(((f + HANDLE + 1) * 1000) / FPS);
    await page.clock.runFor(target - elapsed);
    elapsed = target;
    // The clip's scale is the device scale factor: without it this CDP
    // session captures at CSS size (432x768). With it the PNG is
    // byte-identical to page.screenshot() (checked frame against frame).
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, clip: { x: 0, y: cropTop, width: W, height: H, scale: DSF } });
    const png = Buffer.from(shot.data, 'base64');
    if (png.readUInt32BE(16) !== W * DSF || png.readUInt32BE(20) !== H * DSF) throw new Error(`${clip}: frame ${f} is ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}, not ${W * DSF}x${H * DSF}`);
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
  // Only problems inside the frames the edit can use (plus the handles) fail a take.
  const ok = screening.glitch.length === 0 && screening.grim.length === 0 && !(screening.other ?? []).length;
  const out = {
    clip, state, recordedAt: new Date().toISOString(), gitHead: HEAD, gameSourceMatchesHead: SRC_CLEAN,
    method: `clock-stepped capture: Playwright fake clock paused, runFor(1000/30 ms) then a CDP Page.captureScreenshot per frame of the 432x768 CSS window from y ${cropTop} of a ${W}x${page.viewportSize().height} viewport at DPR 2.5 = 1080x1920; reducedMotion false; sound/music/haptics off in-game`,
    fps: FPS, handle: HANDLE, frameSize: { width: W * DSF, height: H * DSF }, viewport: page.viewportSize(), cropTopCss: cropTop,
    frames, firstFrame: -HANDLE, lastFrame: end, framesDir: path.relative(WORK, dir),
    fileIndex: 'file f%05d.png = clip frame + handle', events, screening: { ...screening, ok }, notes, ...meta, probes,
  };
  await mkdir(EVENTS, { recursive: true });
  await writeFile(path.join(EVENTS, `${clip}.json`), JSON.stringify(out, null, 1) + '\n');
  console.log(`${clip}: ${frames} frames (${-HANDLE}..${end}), ${events.length} events, screening ${ok ? 'ok' : JSON.stringify(screening)}`);
  if (!ok) throw new RetakeError(`${clip}: screening failed ${JSON.stringify(screening)}`);
  return out;
}

async function retake(clip, fn, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try { return await fn(i); }
    catch (e) {
      if (!(e instanceof RetakeError) || i === tries - 1) throw e;
      console.log(`${clip}: retake ${i + 1}: ${e.message}`);
    }
  }
}

async function boot(stateId, height = H) {
  const ctx = await launch({ width: W, height, dsf: DSF, reducedMotion: false, clock: true });
  await stageState(ctx.page, stateId);
  return ctx;
}

// ---------------------------------------------------------------- page helpers
const click = (page, name) => page.getByRole('button', { name, exact: typeof name === 'string' }).first().click();
async function openPuzzle(page) {
  await page.getByRole('button', { name: 'Play puzzle', exact: true }).click({ force: true });
  await page.waitForTimeout(1500);
}
async function waitBoard(page) {
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('puzzle-row-0')).toBeVisible();
}
async function savedBoard(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || 'null'));
}
async function boardWords(page) {
  const b = await savedBoard(page);
  return b ? b.rows.map(r => r.words.map(l => l.char).join('')) : null;
}
/** Every word the saved board shows or forms along its stored solution. */
async function chainWords(page) {
  const board = await savedBoard(page);
  if (!board?.rows) return [];
  const rows = board.rows.map(r => r.words.map(l => l.char));
  const seen = new Set(rows.map(r => r.join('')));
  for (const step of board.solution ?? []) {
    const src = rows[step.stepIndex], dst = rows[step.stepIndex + 1];
    if (!src || !dst) break;
    const at = step.removalPosition ?? src.indexOf(step.letterToMove);
    const [ch] = src.splice(at, 1);
    dst.splice(step.insertionPosition ?? dst.length, 0, ch);
    seen.add(src.join('')); seen.add(dst.join(''));
  }
  return [...seen];
}
function screenChain(words, clip) {
  const bad = words.filter(w => GRIM.includes(w) || AWKWARD.includes(w));
  if (bad.length) throw new RetakeError(`${clip}: board passes through ${bad.join(',')}`);
}
/**
 * Locators for step `k` of the saved board's stored solution: the letter to
 * pick in the source row and the drop zone that forms the stored word.
 */
async function solutionStep(page, k = 0) {
  const board = await savedBoard(page);
  const rows = board.rows.map(r => r.words.map(l => ({ ...l })));
  const opening = board.rows.map(r => r.originalWord).join(',') === 'PLAY,PANT,HEAR';
  let letter = null, slot = null, formed = null;
  for (let n = 0; n <= k; n++) {
    const step = board.solution[n];
    const src = rows[step.stepIndex];
    const removal = step.removalPosition ?? src.findIndex(l => l.char === step.letterToMove && !l.isLocked);
    const dup = src.slice(0, removal).filter(l => l.char === step.letterToMove && !l.isLocked).length;
    const insertion = step.insertionPosition ?? (opening ? [1, 4][step.stepIndex] : undefined);
    const dst = rows[step.stepIndex + 1];
    const [moved] = src.splice(removal, 1);
    dst.splice(insertion, 0, { ...moved, isLocked: true });
    if (n === k) {
      formed = dst.map(v => v.char).join('');
      letter = page.getByTestId(`puzzle-row-${step.stepIndex}`).getByRole('button', { name: `Letter ${step.letterToMove}`, exact: true }).nth(dup);
      slot = page.getByTestId(`puzzle-row-${step.stepIndex + 1}`).getByRole('button', { name: new RegExp(`^(?:Guided drop zone|Drop zone) ${insertion + 1} of \\d+, (?:forms ${formed}, valid word|would form ${formed})$`) });
      return { step, letter, slot, formed, char: step.letterToMove };
    }
  }
  return { letter, slot, formed };
}
/** Effective opacity of an element (product up the ancestor chain), evaluated in the page. */
const EFFECTIVE_OPACITY = `(el) => { let op = 1, a = el; while (a && a !== document.body) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; op *= parseFloat(cs.opacity || '1'); a = a.parentElement; } return op; }`;

/** Victory probe: card opacity (via the Next level button), star sizes, title. */
async function victoryProbe(page) {
  return page.evaluate(src => {
    const eff = eval(src);
    const next = document.querySelector('[aria-label="Next level"]');
    const stars = document.querySelector('[aria-label$=" of 3 stars"]');
    const starW = stars ? [...stars.querySelectorAll('img')].map(i => Math.round(i.getBoundingClientRect().width)) : [];
    let title = null;
    if (stars) { let s = stars.nextElementSibling; if (s) title = s.textContent?.trim() || null; }
    let card = 0;
    if (next) { const r = next.getBoundingClientRect(); card = r.width > 0 ? eff(next) : 0; }
    return { card: Math.round(card * 100) / 100, starW, starsOpacity: stars ? Math.round(eff(stars) * 100) / 100 : 0, title, titleOpacity: stars && stars.nextElementSibling ? Math.round(eff(stars.nextElementSibling) * 100) / 100 : 0 };
  }, EFFECTIVE_OPACITY);
}
/** Star pop and title events from victory probes. */
function victoryEvents(probes) {
  const out = [];
  const frames = Object.keys(probes).map(Number).sort((a, b) => a - b);
  const maxW = Math.max(0, ...frames.flatMap(f => probes[f].starW || []));
  for (let s = 0; s < 3; s++) {
    const f = frames.find(fr => (probes[fr].starW?.[s] ?? 0) >= maxW * 0.35 && probes[fr].starsOpacity > 0.3);
    if (f !== undefined) out.push({ frame: f, action: `star ${s + 1} pops in`, sfx: `star_pop_${s + 1}.wav` });
  }
  const t = frames.find(fr => probes[fr].title && /PERFECT/.test(probes[fr].title) && probes[fr].titleOpacity > 0.5);
  if (t !== undefined) out.push({ frame: t, action: 'PERFECT! title', sfx: 'perfect.wav' });
  return out;
}

// ---------------------------------------------------------------- clips
const CLIPS = {};

/**
 * R1 opener (state A): the untouched opener board, the L lifted at frame 7 (so
 * the lift and the fan opening are the first motion and the poster frame shows
 * the letter up), PLANT, then T into HEART and the win.
 */
CLIPS.R1 = () => retake('R1', async () => {
  const { browser, page } = await boot('A', BOARD.height);
  try {
    await openPuzzle(page);
    await finishStory(page); await dismissIntros(page);
    await waitBoard(page);
    await click(page, 'RESTART'); await page.waitForTimeout(1500);
    const words = await boardWords(page);
    if (words?.join(',') !== 'PLAY,PANT,HEAR') throw new Error(`R1: unexpected board ${words}`);
    const rows = {};
    for (let k = 0; k < 3; k++) rows[`puzzle-row-${k}`] = await page.getByTestId(`puzzle-row-${k}`).boundingBox();
    let nextSeen = null;
    return await recordClip(page, 'R1', {
      state: 'A', cropTop: BOARD.cropTop,
      meta: { rowBoxesCssAtFrame0: rows, boardAtStart: words },
      actions: {
        7: async () => { await page.getByTestId('puzzle-row-0').getByRole('button', { name: 'Letter L', exact: true }).click(); return { action: 'tap Letter L (row 0); the DROP fan opens over PANT', sfx: 'letter_select.wav' }; },
        40: async () => { await page.getByTestId('puzzle-row-1').getByRole('button', { name: /forms PLANT, valid word$/ }).click(); return { action: 'tap drop zone forming PLANT (row 1)', sfx: 'valid_move.wav' }; },
        75: async () => { await page.getByTestId('puzzle-row-1').getByRole('button', { name: 'Letter T', exact: true }).click(); return { action: 'tap Letter T (row 1)', sfx: 'letter_select.wav' }; },
        97: async () => { await page.getByTestId('puzzle-row-2').getByRole('button', { name: /forms HEART, valid word$/ }).click(); return { action: 'tap drop zone forming HEART (row 2); the board is solved', sfx: 'valid_move_2.wav' }; },
      },
      // Frames 76-96: how far the HEAR fan's preview labels hang below row 2 (for the 16:9 crop).
      probe: f => (f >= 97 ? victoryProbe(page) : f >= 76 ? page.getByTestId('puzzle-row-2').evaluate(row => ({ row2Bottom: Math.max(...[...row.querySelectorAll('*')].map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0).map(r => r.bottom)) })) : null),
      until: (probes, f) => {
        if (f < 97) return null;
        if (nextSeen === null && probes[f]?.card >= 0.99) nextSeen = f;
        return nextSeen !== null ? nextSeen + 60 : null;
      },
    }).then(async out => {
      const vp = Object.fromEntries(Object.entries(out.probes).filter(([, v]) => v && v.card !== undefined));
      const fan = Object.values(out.probes).filter(v => v?.row2Bottom).map(v => v.row2Bottom);
      const extra = victoryEvents(vp);
      const halfOpaque = Object.keys(vp).map(Number).sort((a, b) => a - b).find(f => vp[f].starsOpacity >= 0.5);
      out.events.push(...extra);
      out.events.sort((a, b) => a.frame - b.frame);
      out.marks = { victoryCardHalfOpaque: halfOpaque ?? null, nextLevelFullyVisible: nextSeen, row2FanBottomCss: fan.length ? Math.max(...fan) : null };
      await writeFile(path.join(EVENTS, 'R1.json'), JSON.stringify(out, null, 1) + '\n');
      console.log('R1 marks', out.marks, extra);
      return out;
    });
  } finally { await browser.close(); }
});

// ---------------------------------------------------------------- house helpers
// (ported from scripts/store/captureRefresh.mjs, which is a job runner and
// cannot be imported)
const round = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;
/** The room container (about 123 CSS tall) that holds a room's name plaque. */
async function roomBox(page, roomName) {
  return page.evaluate(name => {
    const el = [...document.querySelectorAll('div')].find(d => d.children.length === 0 && d.textContent?.trim().toUpperCase() === name.toUpperCase());
    if (!el) return null;
    let a = el;
    for (let i = 0; i < 8 && a; i++) {
      a = a.parentElement;
      const r = a?.getBoundingClientRect();
      if (r && r.height > 100 && r.height < 170 && r.width > 200) return { x: r.left, y: r.top, width: r.width, height: r.height };
    }
    return null;
  }, roomName);
}
/** The pan gesture swallows about 10 CSS of every drag before it engages. */
const PAN_SLOP = 10;
const panTravel = d => { const a = Math.abs(d); const k = Math.floor((PAN_SLOP * 20) / a) + 1; return k > 20 ? 0 : Math.sign(d) * a * (1 - k / 20); };
async function dragHouseBy(page, move, y0 = 460) {
  if (Math.abs(move) < 0.3) return;
  const height = page.viewportSize().height;
  let d = move + Math.sign(move) * PAN_SLOP;
  for (let a = 10.5; a < 280; a += 0.05) {
    if (Math.abs(panTravel(Math.sign(move) * a) - move) < Math.abs(panTravel(d) - move)) d = Math.sign(move) * a;
  }
  const start = d < 0 ? Math.min(height - 70, Math.max(y0, 300 - d)) : Math.max(180, Math.min(y0, height - 70 - d));
  await panHouse(page, d, 8, start);
}
/** Drag the house (real drags) until measure() reads `target` within `tol` CSS. */
async function panUntil(page, measure, target, tol = 2, y0 = 460) {
  for (let i = 0; i < 14; i++) {
    const v = await measure();
    if (v === null) throw new Error('panUntil: nothing to measure');
    const d = target - v;
    if (Math.abs(d) <= tol) return v;
    await dragHouseBy(page, Math.max(-240, Math.min(240, d)), y0);
  }
  const v = await measure();
  if (Math.abs(target - v) > tol) throw new Error(`panUntil: settled at ${v}, wanted ${target}`);
  return v;
}
async function bottomClamp(page) {
  for (let i = 0; i < 6; i++) await panHouse(page, -300, 8, 460);
}
/** Boxes of every text inside the panned house (a plaque's box for plaque text). */
async function houseTextBoxes(page) {
  return page.evaluate(() => {
    const anyRoomText = [...document.querySelectorAll('div')].find(d => d.children.length === 0 && d.textContent?.trim().toUpperCase() === 'COZY DEN');
    let clip = anyRoomText;
    while (clip && clip.parentElement) {
      clip = clip.parentElement;
      const r = clip.getBoundingClientRect();
      const cs = getComputedStyle(clip);
      if (r.top > 20 && r.bottom >= window.innerHeight - 1 && r.width >= window.innerWidth - 1 && (cs.overflow === 'hidden' || cs.overflowY === 'hidden')) break;
    }
    const out = [];
    for (const el of clip.querySelectorAll('div')) {
      if (el.children.length || !el.textContent?.trim()) continue;
      let r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const lineHeight = r.height;
      let a = el;
      for (let i = 0; i < 3 && a.parentElement; i++) {
        a = a.parentElement; const rr = a.getBoundingClientRect();
        if (rr.height < 45 && rr.width < 320) r = rr; else break;
      }
      out.push({ text: el.textContent.trim().slice(0, 40), x: r.left, y: r.top, width: r.width, height: r.height, plaque: r.height - lineHeight >= 4 });
    }
    return out;
  });
}
/**
 * Smallest house shift (CSS, + = house moves down) in [lo, hi] after which no
 * house text or plaque is sliced by any of `edges` and ok(shift) holds.
 */
async function tidyShift(page, { lo, hi, edges, ok = () => true, step = 1 }) {
  const boxes = await houseTextBoxes(page);
  const depth = (b, sh, e) => Math.max(0, Math.min(e - (b.y + sh), b.y + b.height + sh - e));
  const sliced = sh => boxes.filter(b => edges.some(e => depth(b, sh, e) > (b.plaque ? 0.5 : 1.5))).map(b => b.text);
  const runs = [];
  for (let sh = lo; sh <= hi + 1e-9; sh += step) {
    if (!(ok(sh) && sliced(sh).length === 0)) continue;
    const last = runs[runs.length - 1];
    if (last && Math.abs(last.to + step - sh) < 1e-6) last.to = round(sh); else runs.push({ from: round(sh), to: round(sh) });
  }
  if (!runs.length) return { shift: null, slicedBefore: sliced(0) };
  const at0 = runs.find(r => r.from <= 0 && r.to >= 0);
  if (at0 && (lo === hi || ((at0.from <= -1 || lo === 0) && at0.to >= 1))) return { shift: 0, slicedBefore: [] };
  const mid = r => (r.from + r.to) / 2;
  runs.sort((a, b) => Math.abs(mid(a)) - Math.abs(mid(b)));
  return { shift: round(mid(runs[0])), slicedBefore: sliced(0) };
}
async function shiftHouse(page, shift, refRoom, tol = 0.6) {
  if (!shift) return;
  const y0 = (await roomBox(page, refRoom)).y;
  await panUntil(page, async () => (await roomBox(page, refRoom)).y, y0 + shift, tol, Math.round(page.viewportSize().height * 0.55));
}
/** The resident dialogue sheet: the ancestor of the speech bubble that reaches the bottom of the screen. */
async function dialogueSheetBox(page) {
  return page.getByTestId('resident-dialogue-bubble').evaluate(el => {
    let a = el, best = null;
    while (a.parentElement) {
      a = a.parentElement;
      const r = a.getBoundingClientRect();
      if (r.width >= window.innerWidth - 1 && r.height >= window.innerHeight - 1) break;
      if (r.bottom >= window.innerHeight - 2 && r.width >= window.innerWidth * 0.9) best = { x: r.left, y: r.top, width: r.width, height: r.height };
    }
    return best;
  });
}
const bubbleText = page => page.getByTestId('resident-dialogue-bubble').innerText().then(t => t.replace(/\s+/g, ' ').trim()).catch(() => '');
/** Probe for a typing dialogue: the bubble text so far and the sheet box. */
async function dialogueProbe(page) {
  return page.evaluate(() => {
    const b = document.querySelector('[data-testid="resident-dialogue-bubble"]');
    if (!b) return { text: '' };
    let a = b, sheet = null;
    while (a.parentElement) {
      a = a.parentElement;
      const r = a.getBoundingClientRect();
      if (r.width >= window.innerWidth - 1 && r.height >= window.innerHeight - 1) break;
      if (r.bottom >= window.innerHeight - 2 && r.width >= window.innerWidth * 0.9) sheet = { x: r.left, y: r.top, width: r.width, height: r.height };
    }
    return { text: b.innerText.replace(/\s+/g, ' ').trim(), sheet };
  });
}
/**
 * Resident emote puffs (the rare-idle "?", heart and so on) that overlap a room
 * or name plaque on this frame. A puff over a plaque garbles the room name
 * ("AQU ? M ROOM"), so a take showing one is recorded again.
 */
async function emoteClashes(page, visibleFrom = -1e9) {
  return page.evaluate(visibleFrom => {
    const vis = el => { let op = 1, a = el; while (a && a !== document.body) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; op *= parseFloat(cs.opacity || '1'); a = a.parentElement; } return op; };
    const puffs = [...document.querySelectorAll('img')].filter(i => /emote_/.test(i.getAttribute('src') || '') && vis(i.parentElement) > 0.05).map(i => i.parentElement.getBoundingClientRect());
    if (!puffs.length) return [];
    const plaques = [...document.querySelectorAll('div')].filter(d => d.children.length === 0 && /^[A-Z][A-Z' ]{2,}$/.test(d.textContent?.trim() || '')).map(d => {
      let r = d.getBoundingClientRect(), a = d;
      for (let k = 0; k < 3 && a.parentElement; k++) { a = a.parentElement; const rr = a.getBoundingClientRect(); if (rr.height < 45 && rr.width < 320) r = rr; else break; }
      return { text: d.textContent.trim(), r };
    }).filter(p => p.r.bottom > 0 && p.r.top < window.innerHeight && p.r.right > 0 && p.r.left < window.innerWidth);
    // A plaque behind an open dialogue sheet is out of sight (tapping a resident
    // also pops an emote over them, which the sheet then covers).
    let sheetTop = Infinity;
    const bubble = document.querySelector('[data-testid="resident-dialogue-bubble"]');
    for (let a = bubble; a && a.parentElement; ) {
      a = a.parentElement; const r = a.getBoundingClientRect();
      if (r.width >= window.innerWidth - 1 && r.height >= window.innerHeight - 1) break;
      if (r.bottom >= window.innerHeight - 2 && r.width >= window.innerWidth * 0.9) sheetTop = r.top;
    }
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    return plaques.filter(p => p.r.top < sheetTop - 2 && p.r.bottom > visibleFrom && puffs.some(q => hit(p.r, q))).map(p => p.text);
  }, visibleFrom);
}
/** afterFrame hook for house clips: any emote over a plaque inside frames [lo, hi] fails the take. */
const noEmoteOverPlaque = (page, lo = -Infinity, hi = Infinity, visibleFrom = -1e9) => async f => {
  if (f < lo || f > hi) return null;
  const c = await emoteClashes(page, visibleFrom);
  return c.length ? `emote over ${c.join(', ')}` : null;
};

/** Drags recorded one step per frame: returns actions for frames [from, to]. */
function dragActions(page, { from, to, x, y0, y1, label }) {
  const acts = {};
  const n = to - from;
  acts[from] = async () => { await page.mouse.move(x, y0); await page.mouse.down(); return { action: `${label}: press at (${x},${y0})`, sfx: null }; };
  for (let k = 1; k <= n; k++) {
    const prev = acts[from + k];
    acts[from + k] = async () => {
      if (prev) await prev();
      await page.mouse.move(x, y0 + ((y1 - y0) * k) / n);
      if (k === n) { await page.mouse.up(); return { action: `${label}: release at (${x},${y1})`, sfx: null }; }
      return [];
    };
  }
  return acts;
}
/** Open the puzzle setup menu (the difficulty chip). */
async function openSetup(page) {
  await page.getByRole('button', { name: /Tap to change puzzle setup$/ }).click();
  await page.waitForTimeout(800);
}
const setupOpen = page => page.getByRole('button', { name: 'Close puzzle setup', exact: true }).isVisible().catch(() => false);
async function closeSetup(page) {
  if (await setupOpen(page)) {
    await page.getByRole('button', { name: 'Close puzzle setup', exact: true }).click({ position: { x: 4, y: 4 } });
    await page.waitForTimeout(800);
  }
}
/** Pick a difficulty in the real setup menu (re-serves a board). */
async function chooseDifficulty(page, label) {
  if (!(await setupOpen(page))) await openSetup(page);
  await page.getByRole('button', { name: new RegExp(`^${label} difficulty`) }).first().click();
  await page.waitForTimeout(2200);
  await dismissIntros(page);
  await closeSetup(page);
  await waitBoard(page);
}
/** A board whose stored chain carries no grim or awkward word, re-serving (by re-picking the difficulty) when it does. */
async function cleanBoard(page, clip, reserve, { rankRows = false } = {}) {
  for (let i = 0; i < 14; i++) {
    const chain = await chainWords(page);
    const bad = chain.filter(w => GRIM.includes(w) || AWKWARD.includes(w));
    const rare = [];
    // chainWords replays single-letter steps; a Double Shift board is ranked on its rows.
    for (const w of rankRows ? (await boardWords(page)) : chain) if (w.length >= 3 && (await featuredRank(w)) > rankCeiling(w)) rare.push(`${w} ${(await featuredRank(w)).toFixed(2)}`);
    if (!bad.length && !rare.length && chain.length) return chain;
    console.log(`${clip}: board passes through ${[...bad, ...rare].join(',')}; serving another`);
    await reserve();
  }
  throw new RetakeError(`${clip}: no clean board`);
}

// ---------------------------------------------------------------- remaining clips

/** R2 boards (state H): Medium, Medium+ and Expert, one short take each. */
for (const [id, label, mode] of [['R2a', 'Medium', 'commit'], ['R2b', 'Medium Plus', 'commit'], ['R2c', 'Expert', 'lift']]) {
  CLIPS[id] = () => retake(id, async () => {
    const { browser, page } = await boot('H', BOARD.height);
    try {
      await openPuzzle(page);
      await finishStory(page); await dismissIntros(page);
      await waitBoard(page);
      await chooseDifficulty(page, label);
      const chain = await cleanBoard(page, id, () => chooseDifficulty(page, label));
      const words = await boardWords(page);
      const s0 = await solutionStep(page, 0);
      const actions = {};
      if (mode === 'commit') {
        await s0.letter.click();
        await page.waitForTimeout(1500);
        actions[9] = async () => { await s0.slot.click(); return { action: `tap drop zone forming ${s0.formed}`, sfx: 'valid_move.wav' }; };
      } else {
        actions[8] = async () => { await s0.letter.click(); return { action: `tap Letter ${s0.char} (row ${s0.step.stepIndex})`, sfx: 'letter_select.wav' }; };
      }
      return await recordClip(page, id, { state: 'H', used: 28, actions, cropTop: BOARD.cropTop, meta: { difficulty: label, boardAtStart: words, chainWords: chain } });
    } finally { await browser.close(); }
  });
}

/** R3 day house (state B): from the bottom clamp, a slow drag reveals the rooms above. */
CLIPS.R3 = () => retake('R3', async () => {
  const { browser, page } = await boot('B');
  try {
    await page.waitForTimeout(2500);
    await bottomClamp(page);
    return await recordClip(page, 'R3', { state: 'B', used: 84, afterFrame: noEmoteOverPlaque(page, 0, 90),
      actions: dragActions(page, { from: 6, to: 60, x: 8, y0: 300, y1: 660, label: 'drag the house down' }) });
  } finally { await browser.close(); }
});

/**
 * R4 invite (state I): the empty Aquarium Room, held for 20 frames (0.67 s)
 * so the four-room house reads under its caption, then the invite card at
 * frame 20, and Axel is invited (frame 42). The edit cuts on that tap: the moment Axel moves in, the
 * next room's locked card ("Opens at level 19") takes the aquarium's old place
 * on screen (the house grows at the top, so every room shifts down one), and
 * no pan can hide it while the empty aquarium is on screen.
 */
CLIPS.R4 = () => retake('R4', async () => {
  const { browser, page } = await boot('I');
  try {
    await page.waitForTimeout(2500);
    const target = Math.round(H / 2 - 123 / 2);
    await panUntil(page, async () => (await roomBox(page, 'Aquarium Room'))?.y ?? null, target, 3);
    return await recordClip(page, 'R4', { state: 'I', used: 72, afterFrame: noEmoteOverPlaque(page, 0, 42),
      actions: {
        20: async () => { await page.getByRole('button', { name: 'Invite animal to Aquarium Room for 100 amber', exact: true }).click(); return { action: 'tap Invite animal to Aquarium Room for 100 amber', sfx: 'ui_tap.wav' }; },
        42: async () => { await page.getByRole('button', { name: 'Invite for 100 amber', exact: true }).click(); return { action: 'tap Invite for 100 amber; Axel moves in', sfx: 'unlock.wav' }; },
      } });
  } finally { await browser.close(); }
});

/** R5 Axel (state J): tap Axel, his first line types out. */
CLIPS.R5 = () => retake('R5', async () => {
  const { browser, page } = await boot('J');
  try {
    await page.waitForTimeout(2500);
    const axel = page.getByRole('button', { name: /^Axel the axolotl/ }).first();
    // The Aquarium Room's top at CSS 320: in the 9:16 cut's lifted view (CSS
    // 192..768) the caption plaque ends at CSS 358, so it covers the room's
    // name plaque and the locked room above ("Opens at level 19") while Axel
    // stands below it, above the dialogue sheet. Tapping him pops a small emote
    // that rises through his room's name plaque; the caption hides that
    // stretch, and any emote over a plaque below it fails the take (the 16:9
    // cut shows only the sheet).
    await panUntil(page, async () => (await roomBox(page, 'Aquarium Room'))?.y ?? null, 320, 3);
    const room = await roomBox(page, 'Aquarium Room');
    if (room.y + 32.5 > 357) throw new Error(`R5: the room's name plaque would show under the caption (${room.y})`);
    const b = await axel.boundingBox();
    if (!(b.y >= 150 && b.y + b.height <= 600)) throw new Error(`R5: Axel out of range ${JSON.stringify(b)}`);
    const out = await recordClip(page, 'R5', { state: 'J', used: 100, probe: () => dialogueProbe(page), afterFrame: noEmoteOverPlaque(page, 0, 114, 360), meta: { aquariumRoomTopCss: room.y },
      actions: { 3: async () => { await axel.click(); return { action: 'tap Axel the axolotl; his conversation opens', sfx: 'dialogue.wav' }; } } });
    const LINE = 'Hello! I was following a bubble. Then we both forgot what we were doing.';
    if (out.probes[56]?.text !== LINE) throw new RetakeError(`R5: the page reads "${out.probes[56]?.text}"`);
    return out;
  } finally { await browser.close(); }
});

/** R6a reverse (state H): Reverse Shift chosen in the setup menu, the first letter picked. */
CLIPS.R6a = () => retake('R6a', async () => {
  const { browser, page } = await boot('H', BOARD.height);
  try {
    await openPuzzle(page);
    await finishStory(page); await dismissIntros(page);
    await waitBoard(page);
    const pickReverse = async () => {
      await openSetup(page);
      await page.setViewportSize({ width: W, height: 1060 }); await page.waitForTimeout(800);
      if (!(await setupOpen(page))) await openSetup(page);
      await page.getByRole('button', { name: /^Reverse Shift/ }).first().click();
      await page.waitForTimeout(2500);
      await dismissIntros(page);
      if (!(await setupOpen(page))) await openSetup(page);
      await page.setViewportSize({ width: W, height: BOARD.height }); await page.waitForTimeout(800);
      await closeSetup(page);
      await waitBoard(page);
    };
    await pickReverse();
    const chain = await cleanBoard(page, 'R6a', pickReverse);
    const s0 = await solutionStep(page, 0);
    return await recordClip(page, 'R6a', { state: 'H', used: 24, cropTop: BOARD.cropTop, meta: { boardAtStart: await boardWords(page), chainWords: chain },
      actions: { 6: async () => { await s0.letter.click(); return { action: `tap Letter ${s0.char} (row ${s0.step.stepIndex})`, sfx: 'letter_select.wav' }; } } });
  } finally { await browser.close(); }
});

/** R6b stack (state G): Double Shift with Challenge and Speed on, the first letter picked while the clock runs. */
CLIPS.R6b = () => retake('R6b', async () => {
  const { browser, page } = await boot('G', BOARD.height);
  try {
    await openPuzzle(page);
    await finishStory(page); await dismissIntros(page);
    await waitBoard(page);
    await openSetup(page);
    await page.setViewportSize({ width: W, height: 1060 }); await page.waitForTimeout(800);
    for (const re of [/^Double Shift/, /^Challenge mode, off/, /^Speed Shift, off/]) {
      if (!(await setupOpen(page))) await openSetup(page);
      await page.getByRole('button', { name: re }).first().click();
      await page.waitForTimeout(2200);
      await dismissIntros(page);
    }
    const reserve = async () => {
      if (!(await setupOpen(page))) await openSetup(page);
      await page.setViewportSize({ width: W, height: 1060 }); await page.waitForTimeout(600);
      await page.getByRole('button', { name: /^Double Shift/ }).first().click();
      await page.waitForTimeout(2200); await dismissIntros(page);
    };
    if (!(await setupOpen(page))) await openSetup(page);
    await page.setViewportSize({ width: W, height: BOARD.height }); await page.waitForTimeout(800);
    await closeSetup(page);
    let chain = await cleanBoard(page, 'R6b', async () => { await reserve(); if (!(await setupOpen(page))) await openSetup(page); await page.setViewportSize({ width: W, height: BOARD.height }); await page.waitForTimeout(600); await closeSetup(page); }, { rankRows: true });
    // Pick the first letter once (and put it back) to read the DROP previews; a
    // board whose previews would read as a mistake is served again.
    let s0;
    for (let i = 0; ; i++) {
      s0 = await solutionStep(page, 0);
      await s0.letter.click(); await page.waitForTimeout(600);
      const labels = await page.getByTestId(`puzzle-row-${s0.step.stepIndex + 1}`).getByRole('button').evaluateAll(els => els.map(e => e.getAttribute('aria-label')).filter(Boolean));
      await s0.letter.click(); await page.waitForTimeout(600);
      const confusing = await confusingPreviews(labels);
      if (!confusing.length) break;
      if (i >= 10) throw new RetakeError(`R6b: previews read as mistakes on every board (${confusing.join('; ')})`);
      console.log(`R6b: previews ${confusing.join('; ')}; serving another`);
      await reserve(); if (!(await setupOpen(page))) await openSetup(page); await page.setViewportSize({ width: W, height: BOARD.height }); await page.waitForTimeout(600); await closeSetup(page);
      chain = await cleanBoard(page, 'R6b', async () => { await reserve(); if (!(await setupOpen(page))) await openSetup(page); await page.setViewportSize({ width: W, height: BOARD.height }); await page.waitForTimeout(600); await closeSetup(page); }, { rankRows: true });
    }
    const board = await savedBoard(page);
    return await recordClip(page, 'R6b', { state: 'G', used: 24, cropTop: BOARD.cropTop, meta: { boardAtStart: await boardWords(page), chainWords: chain, doubleShift: board?.currentVariant === 'double_shift' },
      actions: { 6: async () => { await s0.letter.click(); return { action: `tap Letter ${s0.char} (row ${s0.step.stepIndex})`, sfx: 'letter_select.wav' }; } } });
  } finally { await browser.close(); }
});

/** The Speed Shift countdown as shown (seconds), or null. */
const speedClock = page => page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find(d => d.children.length === 0 && /^\d{1,3}s$/.test(d.textContent?.trim() || ''));
  return el ? Number(el.textContent.trim().slice(0, -1)) : null;
});

/**
 * R6c race the clock (state G): Cathedral Glass bought in the Tile Shop with
 * amber, then a standard Medium board with Speed Shift switched on in the
 * setup menu. The fake clock is stepped to just past a countdown tick before
 * the clip starts, so the clock visibly ticks (frame 11) inside the 24 frames
 * the edit uses; the first letter is picked at frame 6.
 */
CLIPS.R6c = () => retake('R6c', async () => {
  const { browser, page } = await boot('G', BOARD.height);
  try {
    await page.getByRole('button', { name: 'Open utility menu', exact: true }).click();
    await page.waitForTimeout(700);
    // The cosmetic shop's name follows the story (getShopTitle): "Adornments" by this point.
    await page.getByRole('button', { name: /^Open (Tile Shop|Adornments)$/ }).click();
    await expect(page.getByRole('button', { name: 'Go back', exact: true })).toBeVisible();
    const buy = page.getByRole('button', { name: 'Buy Cathedral Glass for 700 amber', exact: true });
    await buy.scrollIntoViewIfNeeded(); await buy.click(); await page.waitForTimeout(1500);
    await dismissIntros(page);
    await expect(page.getByRole('button', { name: /^Buy Cathedral Glass/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Go back', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    await dismissIntros(page);
    await openPuzzle(page);
    await finishStory(page); await dismissIntros(page);
    await waitBoard(page);
    // Medium, standard style, Speed on (Challenge stays off).
    await openSetup(page);
    await page.setViewportSize({ width: W, height: 1060 }); await page.waitForTimeout(800);
    if (!(await setupOpen(page))) await openSetup(page);
    await page.getByRole('button', { name: /^Medium difficulty/ }).first().click();
    await page.waitForTimeout(2200); await dismissIntros(page);
    if (!(await setupOpen(page))) await openSetup(page);
    await page.getByRole('button', { name: /^Speed Shift, off/ }).first().click();
    await page.waitForTimeout(2200); await dismissIntros(page);
    const reserve = async () => {
      if (!(await setupOpen(page))) await openSetup(page);
      await page.setViewportSize({ width: W, height: 1060 }); await page.waitForTimeout(600);
      await page.getByRole('button', { name: /^Medium difficulty/ }).first().click();
      await page.waitForTimeout(2200); await dismissIntros(page);
      if (!(await setupOpen(page))) await openSetup(page);
      await page.setViewportSize({ width: W, height: BOARD.height }); await page.waitForTimeout(600);
      await closeSetup(page);
    };
    if (!(await setupOpen(page))) await openSetup(page);
    await page.setViewportSize({ width: W, height: BOARD.height }); await page.waitForTimeout(800);
    await closeSetup(page);
    await waitBoard(page);
    const chain = await cleanBoard(page, 'R6c', reserve);
    if ((await speedClock(page)) === null) throw new Error('R6c: no Speed Shift countdown on the board');
    const s0 = await solutionStep(page, 0);
    const chip = await page.getByRole('button', { name: /Tap to change puzzle setup$/ }).getAttribute('aria-label');
    const words = await boardWords(page);
    // Step the (paused) clock to the moment the countdown changes. recordClip
    // keeps it paused and advances 100 ms before frame -15, so the next tick
    // lands about 900 ms later, at frame 11.
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 50);
    const c0 = await speedClock(page);
    for (let i = 0; i < 80 && (await speedClock(page)) === c0; i++) await page.clock.runFor(20);
    return await recordClip(page, 'R6c', { state: 'G', used: 24, cropTop: BOARD.cropTop,
      meta: { boardAtStart: words, chainWords: chain, setupChip: chip, cosmetic: 'Cathedral Glass (bought for 700 amber in the Tile Shop)', speedShift: true },
      probe: () => speedClock(page),
      actions: { 6: async () => { await s0.letter.click(); return { action: `tap Letter ${s0.char} (row ${s0.step.stepIndex})`, sfx: 'letter_select.wav' }; } } })
      .then(async out => {
        const ticks = Object.entries(out.probes).map(([f, v]) => [Number(f), v]).filter(([f, v], i, a) => i > 0 && v !== a[i - 1][1]).map(([f]) => f);
        out.marks = { countdownTicksAtFrames: ticks };
        await writeFile(path.join(EVENTS, 'R6c.json'), JSON.stringify(out, null, 1) + '\n');
        if (!ticks.some(f => f >= 2 && f <= 21)) throw new RetakeError(`R6c: no countdown tick inside the used frames (${ticks})`);
        return out;
      });
  } finally { await browser.close(); }
});

/** R7 cup (state A): the cup scene's choice page, the flower cup chosen, Ember answers. */
CLIPS.R7 = () => retake('R7', async () => {
  const { browser, page } = await boot('A');
  try {
    await openPuzzle(page);
    await expect(page.getByRole('heading', { name: 'A place at the table', exact: true })).toBeVisible();
    const flower = page.getByRole('button', { name: 'The flower cup. Cocoa, please.', exact: true });
    for (let i = 0; i < 6 && !(await flower.isVisible().catch(() => false)); i++) {
      await page.getByTestId('story-scene-scroll').getByRole('button', { name: 'Continue', exact: true }).click();
      await page.waitForTimeout(900);
    }
    await expect(flower).toBeVisible();
    await page.waitForTimeout(1500);
    return await recordClip(page, 'R7', { state: 'A', used: 72,
      probe: () => page.evaluate(() => document.querySelector('[data-testid="story-scene-scroll"]')?.innerText.replace(/\s+/g, ' ').slice(0, 200) ?? ''),
      // The brief taps at frame 15; at 36 the choice page stays up long enough (1.2 s) to read the question before Ember answers.
      // The press is held for 8 frames (0.27 s) so the chosen answer's pressed state shows before the page turns.
      actions: {
        36: async () => { const b = await flower.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); return { action: 'press The flower cup. Cocoa, please.', sfx: null }; },
        44: async () => { await page.mouse.up(); return { action: 'release: The flower cup. Cocoa, please. is chosen', sfx: 'story_answer.wav' }; },
      } });
  } finally { await browser.close(); }
});

/** Pit word boxes and the ward hint. */
async function pitLayout(page) {
  const words = await page.getByRole('button', { name: /^Word: .*, tap to offer$/ }).evaluateAll(els => els.map(e => {
    const r = e.getBoundingClientRect();
    return { word: e.getAttribute('aria-label').replace(/^Word: /, '').replace(/, tap to offer$/, ''), x: r.left, y: r.top, width: r.width, height: r.height };
  }));
  const hint = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find(d => d.children.length === 0 && d.textContent?.trim() === 'Something stirs below...');
    if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height };
  });
  return { words, hint };
}
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/**
 * The path a tapped pit word takes (OfferingPitScreen devourWord): its top-left
 * corner spirals from where it floats to the pit centre (0.5 W, 0.72 H) over
 * 2.5 turns with radius R (1 - p)^1.8, while it scales from 1.2 to 0.05 and
 * spins once, fading out over the last 35 % of the time (progress p = t^2).
 * Returns the box the chip's rotated, scaled outline covers while it is still
 * clearly visible (p up to 0.85, opacity above about 25%).
 */
function spiralExtent(w, W, H) {
  const cx = W * 0.5, cy = H * 0.72;
  const R = Math.hypot(w.x - cx, w.y - cy), a0 = Math.atan2(w.y - cy, w.x - cx);
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  // Up to p 0.85 (time 0.92): after that the chip is under 25% opacity and a speck.
  for (let p = 0; p <= 0.8501; p += 0.005) {
    const tau = Math.sqrt(p);
    const r = R * (1 - p) ** 1.8, a = a0 + 2.5 * 2 * Math.PI * p, s = 1.2 - 1.15 * p;
    const turn = 2 * Math.PI * tau ** 3;
    // The axis-aligned box of the rotated, scaled chip around its centre.
    const hw = ((w.width * Math.abs(Math.cos(turn)) + w.height * Math.abs(Math.sin(turn))) / 2) * s;
    const hh = ((w.width * Math.abs(Math.sin(turn)) + w.height * Math.abs(Math.cos(turn))) / 2) * s;
    const x = cx + r * Math.cos(a) + w.width / 2, y = cy + r * Math.sin(a) + w.height / 2;
    left = Math.min(left, x - hw); right = Math.max(right, x + hw);
    top = Math.min(top, y - hh); bottom = Math.max(bottom, y + hh);
  }
  return { left, right, top, bottom, radius: R };
}
/** The tapped word's chip on screen: its box and effective opacity, or null once it is gone. */
async function chipProbe(page, word) {
  return page.evaluate(label => {
    const el = [...document.querySelectorAll('[aria-label]')].find(e => e.getAttribute('aria-label') === label);
    if (!el) return null;
    let op = 1, a = el;
    while (a && a !== document.body) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden') { op = 0; break; } op *= parseFloat(cs.opacity || '1'); a = a.parentElement; }
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height, opacity: Math.round(op * 1000) / 1000 };
  }, `Word: ${word}, tap to offer`);
}

/**
 * R8 pit (state F): a real win, Collect, the words float over the pit; one is
 * tapped and spirals down into it. The tapped word is one whose whole spiral
 * stays on the 432x768 screen (the game's spiral swings out by up to about
 * 0.8 R, so a word far from the pit centre leaves the screen edge mid-flight);
 * every frame of the take is then checked: the word must stay on screen while
 * it is visible and be seen spiralling in for at least 10 frames. The pit's
 * own devour sound plays when the word reaches the pit, as in the game.
 */
CLIPS.R8 = () => retake('R8', async attempt => {
  const { browser, page } = await boot('F');
  try {
    await openPuzzle(page);
    await finishStory(page); await dismissIntros(page);
    await waitBoard(page);
    screenChain(await chainWords(page), 'R8');
    await playSolution(page);
    for (let i = 0; i < 8; i++) {
      const g = await visibleGlitchTexts(page);
      if (g.length) throw new RetakeError(`R8: victory glitch ${g.join(',')}`);
      await page.waitForTimeout(400);
    }
    const collect = page.getByRole('button', { name: 'Collect amber in the pit', exact: true });
    await expect(collect).toBeVisible({ timeout: 30_000 });
    await collect.click({ force: true });
    await finishStory(page, 7000);
    await page.waitForTimeout(2500);
    await dismissIntros(page);
    await page.waitForTimeout(2500);
    // The words spawn at random spots. Until no two words overlap and none
    // covers the hint, walk home and back into the pit (real navigation),
    // which lays the same words out afresh (as slot 06 does).
    const vp = page.viewportSize();
    let words = [], hint = null, visit = 0, picked = [];
    for (; visit < 30; visit++) {
      if (visit) {
        await page.getByRole('button', { name: 'Return home', exact: true }).click({ force: true });
        await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(1200);
        for (let i = 0; i < 3; i++) await panHouse(page, -300, 8, 480);
        await page.getByRole('button', { name: /^Enter the Offering Pit/ }).first().click({ force: true });
        await page.waitForTimeout(3000);
        await dismissIntros(page);
      }
      // The words drift, so the layout is read twice, a second apart, and
      // must keep 10 CSS of clear space around every word both times.
      const pad = w => ({ x: w.x - 10, y: w.y - 10, width: w.width + 20, height: w.height + 20 });
      // How far a word's predicted spiral stays inside the screen (negative: it
      // pokes out by that much). A slack of -0.3 of the chip's half width lets
      // a quarter of it graze an edge for a frame or two, never leave.
      const slack = w => { const e = spiralExtent(w, vp.width, vp.height); return Math.min(e.left, vp.width - e.right, e.top, vp.height - e.bottom) + 0.3 * (w.width / 2); };
      let clean = true;
      for (let look = 0; look < 2 && clean; look++) {
        if (look) await page.waitForTimeout(1000);
        ({ words, hint } = await pitLayout(page));
        if (!hint) throw new Error('R8: no "Something stirs below..." hint at the pit');
        // The words must not overlap each other or the hint; the word to tap
        // also keeps 10 CSS of clear space around it.
        const clash = words.some((a, i) => words.some((b, j) => j > i && overlaps(a, b))) || words.some(w => overlaps(w, hint));
        const inside = words.every(w => w.x >= 6 && w.y >= 70 && w.x + w.width <= vp.width - 6 && w.y + w.height <= vp.height - 6);
        const candidates = words.filter(w => slack(w) >= 0 && !words.some(o => o !== w && overlaps(pad(w), o)) && !overlaps(pad(w), hint));
        picked = candidates.map(w => ({ w, e: spiralExtent(w, vp.width, vp.height), slack: slack(w) })).sort((a, b) => b.slack - a.slack);
        console.log(`R8 visit ${visit} look ${look}: ${words.map(w => `${w.word}@${Math.round(w.x)},${Math.round(w.y)}`).join(' ')} clash ${clash} candidates ${candidates.map(w => w.word).join(',') || 'none'}`);
        clean = words.length >= 3 && !clash && inside && candidates.length > 0;
      }
      if (clean) break;
    }
    if (visit === 30) throw new RetakeError('R8: no clean pit layout');
    // Of the words whose spiral stays on screen, the one with the most room.
    const fits = picked;
    const pick = fits[0].w;
    const out = await recordClip(page, 'R8', { state: 'F', used: 66, meta: { wordsAtStart: words.map(w => w.word), tapped: pick.word, pitVisit: visit, predictedSpiralCss: fits[0].e },
      probe: () => chipProbe(page, pick.word),
      // The pop and the spiral take about 1.6 s, so the tap lands at frame 6 (the brief says 12) to finish inside the shot.
      actions: { 6: async () => { await page.getByRole('button', { name: `Word: ${pick.word}, tap to offer`, exact: true }).click(); return { action: `tap floating word ${pick.word}; it pops, then spirals into the pit`, sfx: null }; } } });
    // Frame checks on the recorded take: while the word is visible (opacity
    // above 0.25) its box stays on screen, and it is seen moving for 10 frames
    // or more between the pop and reaching the pit.
    const frames = Object.keys(out.probes).map(Number).filter(f => f >= 6).sort((a, b) => a - b);
    const shown = frames.filter(f => out.probes[f] && out.probes[f].opacity > 0.25);
    const insideShare = b => { const w = Math.max(0, Math.min(vp.width, b.x + b.width) - Math.max(0, b.x)), h = Math.max(0, Math.min(vp.height, b.y + b.height) - Math.max(0, b.y)); return (w * h) / Math.max(1, b.width * b.height); };
    const grazing = shown.filter(f => insideShare(out.probes[f]) < 0.999);
    const offscreen = shown.filter(f => insideShare(out.probes[f]) < 0.75);
    const moving = shown.filter((f, i) => i > 0 && Math.hypot(out.probes[f].x - out.probes[shown[i - 1]].x, out.probes[f].y - out.probes[shown[i - 1]].y) > 1);
    const gone = frames.find(f => f > 6 && (!out.probes[f] || out.probes[f].opacity <= 0.02));
    out.screening.pitFlight = { visibleFrames: shown.length, movingFrames: moving.length, framesGrazingAnEdge: grazing, framesMoreThanAQuarterOffScreen: offscreen, goneAtFrame: gone ?? null };
    if (offscreen.length || grazing.length > 4) throw new RetakeError(`R8: ${pick.word} leaves the screen (${JSON.stringify(out.screening.pitFlight)})`);
    if (moving.length < 10) throw new RetakeError(`R8: ${pick.word} is seen moving for only ${moving.length} frames`);
    if (gone === undefined || gone > 60) throw new RetakeError(`R8: ${pick.word} has not reached the pit by frame 60 (${gone})`);
    // The game plays its devour sound when the word reaches the pit (handleWordDevoured).
    out.events.push({ frame: gone, action: `${pick.word} reaches the pit; the pending amber drops`, sfx: 'pit_devour.wav' });
    out.events.sort((a, b) => a.frame - b.frame);
    await writeFile(path.join(EVENTS, 'R8.json'), JSON.stringify(out, null, 1) + '\n');
    console.log('R8 flight', out.screening.pitFlight);
    return out;
  } finally { await browser.close(); }
}, 10);

/**
 * R9 Panko (state D): the house panned so her kitchen will sit behind the
 * dialogue sheet (as slot 04), then she is tapped and her line types out.
 * The edit uses R9_USED frames ending R9_HOLD frames after the line completes.
 */
const R9_HOLD = 60, R9_USED = 118;
CLIPS.R9 = () => retake('R9', async () => {
  const LINE = 'Something funny happened. I went to bed with the spice jars in one order and woke up to find them in another. I must have moved them in my sleep. I must have.';
  const { browser, page } = await boot('D');
  try {
    await page.waitForTimeout(1500);
    await bottomClamp(page);
    const panko = page.getByRole('button', { name: /^Panko the pangolin/ }).first();
    for (let k = 0; k < 6; k++) {
      const b = await panko.boundingBox();
      if (b && b.y >= 120 && b.y + b.height <= H - 120) break;
      await panHouse(page, b && b.y < 120 ? 250 : -250, 8, b && b.y < 120 ? 300 : Math.round(H * 0.7));
    }
    // Measure the sheet (risen, with its first line typing: about where the
    // used frames start, and finished) and the lifted kitchen, then close
    // without Next (consumes nothing).
    await panko.click();
    await page.waitForTimeout(550);
    const sheetShort = await dialogueSheetBox(page);
    await page.waitForTimeout(2650);
    let said = await bubbleText(page);
    // A cross-resident reference can replace the first page at random; a fresh install is simply tried again.
    if (said !== LINE) throw new RetakeError(`R9: first page was "${said}"`);
    const sheet0 = await dialogueSheetBox(page);
    const kitchen0 = await roomBox(page, 'Rustic Kitchen');
    // The 9:16 cut shows CSS 192..768, so nothing may be sliced at 192 or at the
    // sheet's top edge. The kitchen stays behind the sheet even while the sheet
    // is at its shortest (the line is still typing), so its top never shows above it.
    const shortTop = Math.max(sheet0.y, sheetShort?.y ?? sheet0.y);
    const tidy = await tidyShift(page, { lo: 0, hi: 420, edges: [192, shortTop], ok: sh => kitchen0.y + sh >= shortTop + 8 });
    await page.getByRole('button', { name: 'Close dialogue', exact: true }).click({ position: { x: 4, y: 4 } });
    await page.waitForTimeout(900);
    if (tidy.shift === null) throw new Error(`R9: no clean framing ${JSON.stringify(tidy)}`);
    await shiftHouse(page, tidy.shift, 'Cozy Den', 2.5);
    const pb = await panko.boundingBox();
    // Tappable: her centre above the PLAY dock (CSS 700), below the header.
    if (!(pb.y >= 120 && pb.y + pb.height / 2 <= H - 90)) throw new Error(`R9: Panko out of reach ${JSON.stringify(pb)}`);
    let complete = null;
    return await recordClip(page, 'R9', { state: 'D', meta: { line: LINE, houseDraggedDownCss: tidy.shift, sheetCss: sheet0, sheetWhileTypingCss: sheetShort },
      // Emotes are checked per frame but judged only on the frames the edit uses (below).
      probe: async () => ({ ...(await dialogueProbe(page)), emote: await emoteClashes(page) }),
      // The finished line is held for R9_HOLD frames (2 s) so the payoff can be
      // read before the cut to dusk (the typewriter itself runs at 15 ms a
      // character, faster than anyone reads).
      until: (probes, f) => {
        if (complete === null && probes[f]?.text === LINE) complete = f;
        // A cross-resident reference can replace the page at random on this
        // opening too; the typewriter text must stay a prefix of the line.
        const shown = probes[f]?.text;
        if (complete === null && shown && !LINE.startsWith(shown)) throw new RetakeError(`R9: the page reads "${shown.slice(0, 60)}"`);
        return complete !== null ? complete + R9_HOLD : null;
      },
      actions: { 3: async () => { await panko.click(); return { action: 'tap Panko the pangolin; her conversation opens', sfx: 'dialogue.wav' }; } } })
      .then(async out => {
        out.marks = { revealComplete: complete, usedFrom: Math.max(0, complete + R9_HOLD - (R9_USED - 1)), usedTo: complete + R9_HOLD, hold: R9_HOLD };
        const clash = Object.entries(out.probes).filter(([f, v]) => Number(f) >= out.marks.usedFrom && Number(f) <= out.marks.usedTo && v?.emote?.length);
        out.screening.emoteOverPlaqueInUsedFrames = clash.map(([f, v]) => ({ frame: Number(f), plaques: v.emote }));
        await writeFile(path.join(EVENTS, 'R9.json'), JSON.stringify(out, null, 1) + '\n');
        if (clash.length) throw new RetakeError(`R9: emote over ${clash[0][1].emote.join(', ')} at frame ${clash[0][0]}`);
        return out;
      });
  } finally { await browser.close(); }
}, 8);

/** R10 dusk (state C): near the bottom clamp, a slow drag settles on the kitchen, the den and the well. */
CLIPS.R10 = () => retake('R10', async () => {
  const { browser, page } = await boot('C');
  try {
    await page.waitForTimeout(2000);
    await bottomClamp(page);
    const den0 = (await roomBox(page, 'Cozy Den')).y;
    await dragHouseBy(page, 120);
    const den1 = (await roomBox(page, 'Cozy Den')).y;
    return await recordClip(page, 'R10', { state: 'C', used: 78, meta: { draggedDownCss: round(den1 - den0) }, afterFrame: noEmoteOverPlaque(page, 0, 85),
      actions: dragActions(page, { from: 6, to: 54, x: 8, y0: 560, y1: 440, label: 'drag the house up' }) });
  } finally { await browser.close(); }
});

// ---------------------------------------------------------------- main
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
