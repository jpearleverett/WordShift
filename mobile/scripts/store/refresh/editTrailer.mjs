/**
 * Edits the refresh-2026-09 trailer from the clips recordTrailer.mjs wrote
 * (assets/Play_store/refresh-2026-09/brief.md, section 6: "Edit timeline",
 * "9:16 cut layout", "16:9 master layout", "Audio" and "Encode").
 *
 *   node scripts/store/refresh/editTrailer.mjs            # both cuts, audio, SRT, stills
 *   node scripts/store/refresh/editTrailer.mjs 9x16       # one cut only (audio and SRT are rebuilt too)
 *
 * Reads:  $TRAILER_WORK/clips/<clip>/f%05d.png and video/events/<clip>.json
 * Writes: video/trailer-9x16-1080x1920.mp4, video/trailer-16x9-1920x1080.mp4,
 *         video/captions-en.srt, video/youtube-thumbnail-1280x720.png,
 *         video/poster-9x16-1080x1920.png, video/trailer-report.json
 *
 * Every frame before the end card is a recorded frame of the real game.
 * Frames are only placed and scaled (never zoomed past their own pixels); the game UI
 * inside them is never altered. Added elements (caption plaques, the end
 * card, the 16:9 sky background, resident sprites beside the phone column)
 * use the game's own fonts and art, and are composited around the capture.
 * Composited frames are piped straight into ffmpeg as raw RGB.
 */
import { createRequire } from 'node:module';
import { Buffer } from 'node:buffer';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const { chromium } = require('@playwright/test');

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CAMPAIGN = path.join(mobile, 'assets/Play_store/refresh-2026-09');
const VIDEO = path.join(CAMPAIGN, 'video');
const EVENTS = path.join(VIDEO, 'events');
const WORK = process.env.TRAILER_WORK || path.join(os.tmpdir(), 'wordshift-trailer');
const FFMPEG = process.env.FFMPEG || '/usr/local/bin/ffmpeg';
const CHROMIUM = process.env.WORDSHIFT_CHROMIUM || '/opt/pw-browsers/chromium';
const FPS = 30, TOTAL = 900, HANDLE = 15, DPR = 2.5;
const A = rel => path.join(mobile, 'assets', rel);
/**
 * Where the 16:9 background band is centred in each sky (fraction of the
 * scaled art's height). The brief says 45%, which on these skies is the tree
 * line and blurs to a murky green; 25% is the open sky and mountains, and at
 * dusk 28% puts the sunset behind the phone and the end card wordmark.
 */
const SKY_BAND_169 = { sky_day: 0.25, sky_afternoon: 0.25, sky_dusk: 0.28 };
const DUSK_BAND_169 = SKY_BAND_169.sky_dusk;

// ---------------------------------------------------------------- the edit

/** Caption text, keyed by id. Plain ASCII, no dashes, no promotional words (brief 10.10). */
const CAPTIONS = {
  lift: 'Lift a letter.',
  drop: 'Drop it in. Two real words.',
  puzzles: 'Over 4,000 puzzles.',
  house: 'Your wins build the house.',
  friends: 'Everyone has something to say.',
  modes: 'Reverse. Double. Race the clock.',
  answers: 'Your answers stay with them.',
  words: 'Where do the words go?',
};
const END_LINE = 'The house is very fond of you.';
/**
 * 9:16 plaque minimum heights. "friends" runs over S6 (the day house, where the
 * plaque also covers the home header and the Next: sign, so neither peeks out
 * under it) and S7, so both shots get the same box and it does not jump at the cut.
 */
const MIN_H_916 = { friends: 318 };
/** Authored line breaks: the 9:16 two-line fallback, and the 16:9 candidates (x 80..620, text in 476). */
const LINES_916 = {
  friends: ['Everyone has', 'something to say.'],
  modes: ['Reverse. Double.', 'Race the clock.'],
  answers: ['Your answers', 'stay with them.'],
  drop: ['Drop it in.', 'Two real words.'],
  house: ['Your wins', 'build the house.'],
  words: ['Where do', 'the words go?'],
  puzzles: ['Over 4,000', 'puzzles.'],
  lift: ['Lift a letter.'],
};
const LINES_169 = {
  lift: [['Lift a letter.']],
  drop: [['Drop it in.', 'Two real words.']],
  puzzles: [['Over 4,000 puzzles.'], ['Over 4,000', 'puzzles.']],
  house: [['Your wins', 'build the house.'], ['Your wins build', 'the house.'], ['Your wins', 'build the', 'house.']],
  friends: [['Everyone has', 'something to say.'], ['Everyone has', 'something', 'to say.']],
  modes: [['Reverse. Double.', 'Race the clock.'], ['Reverse.', 'Double.', 'Race the clock.']],
  answers: [['Your answers', 'stay with them.'], ['Your answers', 'stay with', 'them.']],
  words: [['Where do the', 'words go?'], ['Where do', 'the words go?']],
};

/**
 * Shots in timeline order. `from`/`to` are inclusive timeline frames.
 * `parts` lists the clip ranges played back to back (hard cuts between them).
 * `layout916` / `layout169` pick the treatment; `sprite` is the 16:9 right
 * panel resident (never a robed sprite).
 */
function buildShots(clips) {
  const r1 = clips.R1;
  const half = r1.marks?.victoryCardHalfOpaque ?? 102;
  // S3 starts at the first frame with the victory card at least half opaque;
  // when that is at or before 102 the opener simply runs on.
  const s3start = Math.max(102, half);
  const r9 = clips.R9;
  // S7 opens on the first R5 frame where Axel's sheet already covers the home
  // screen's PLAY dock (its top at or above CSS 690); before that, the lifted
  // layout shows the dock floating mid-frame. The tap's sound is kept (sfxLead).
  const s7from = Number(Object.keys(clips.R5.probes).map(Number).sort((a, b) => a - b).find(f => f >= 0 && clips.R5.probes[f]?.sheet && clips.R5.probes[f].sheet.y <= 690));
  if (!Number.isFinite(s7from)) throw new Error(`R5: no usable sheet-up frame (${s7from})`);
  // S7 holds Axel's line for 0.6 s once it has typed out, then cuts: past that
  // the frame is a still image. The frames saved go to S11, where Panko's
  // longer line needs the time to be read.
  const AXEL_LINE = 'Hello! I was following a bubble. Then we both forgot what we were doing.';
  const axelDone = Object.keys(clips.R5.probes).map(Number).sort((a, b) => a - b).find(f => f >= s7from && clips.R5.probes[f]?.text === AXEL_LINE);
  if (axelDone === undefined) throw new Error('R5: Axel\'s line never completes');
  const s7len = axelDone - s7from + 1 + 18;
  if (s7from + s7len - 1 > clips.R5.lastFrame) throw new Error('R5: too short for S7');
  // S11 takes what S7 gave up (S7 was 94 frames, S11 72), ending on the last
  // frame of R9's hold on the finished line; S12 still opens at frame 750.
  const s11len = 72 + (94 - s7len);
  const r9to = r9.marks.usedTo, r9from = r9to - s11len + 1;
  if (r9from < r9.firstFrame || r9.marks.revealComplete === undefined || r9to - r9.marks.revealComplete < 45) throw new Error(`R9: needs a 45-frame hold and ${s11len} frames (${JSON.stringify(r9.marks)})`);
  const at = (() => { let t = 0; return n => { const from = t; t += n; return [from, t - 1]; }; })();
  const L = { S1: 42, S2: 60, S3: 54, S4: 84, S5: 42, S6: 92, S7: s7len, S8: 72, S9: 72, S10: 66, S11: s11len, S12: 78, END: 72 };
  const F = Object.fromEntries(Object.entries(L).map(([k, n]) => [k, at(n)]));
  if (F.END[1] !== TOTAL - 1 || F.S12[0] !== 750) throw new Error(`timeline does not add up ${JSON.stringify(F)}`);
  // Board clips are 768 CSS windows from CSS 50 of an 844 tall screen; the
  // caption plaque sits at the top of those frames, over the empty header
  // strip and clear of the setup chips below it.
  const boardTop = 24;
  return [
    { id: 'S1', from: F.S1[0], to: F.S1[1], parts: [['R1', 0]], caption: 'lift', layout169: 'rows', plaqueTop916: boardTop },
    { id: 'S2', from: F.S2[0], to: F.S2[1], parts: [['R1', 42]], caption: 'drop', layout169: 'rows', plaqueTop916: boardTop },
    { id: 'S3', from: F.S3[0], to: F.S3[1], parts: [['R1', s3start]], caption: null, sprite: 'fox' },
    { id: 'S4', from: F.S4[0], to: F.S4[1], parts: [['R2a', 0], ['R2b', 0], ['R2c', 0]], partLength: 28, caption: 'puzzles', sprite: 'fox', plaqueTop916: boardTop },
    // S5 is Axel's invite (state I, the four-room house) and S6 the grown day
    // house (state B), so the house only ever grows on screen: S5 cuts on the
    // "Invite Axel!" tap (R4 frame 42, whose result frame already shows the
    // next room's locked "Opens at level 19" card in the aquarium's old place,
    // so S5 ends on frame 41 and the tap's unlock chime lands on the cut and
    // rings on), and S6 lands on the house with Axel already home. S6 ends on
    // the aquarium with his news badge, and S7 is his first line.
    { id: 'S5', from: F.S5[0], to: F.S5[1], parts: [['R4', 0]], caption: 'house', sprite: 'fox', plaqueTop916: 96, sfxTail: 1 },
    { id: 'S6', from: F.S6[0], to: F.S6[1], parts: [['R3', 0]], caption: 'friends', sprite: 'sloth', plaqueTop916: 96 },
    { id: 'S7', from: F.S7[0], to: F.S7[1], parts: [['R5', s7from]], caption: 'friends', layout916: 'lift', layout169: 'sheet', plaqueTop916: 96, sfxLead: s7from },
    { id: 'S8', from: F.S8[0], to: F.S8[1], parts: [['R6a', 0], ['R6b', 0], ['R6c', 0]], partLength: 24, caption: 'modes', plaqueTop916: boardTop },
    // S9: a slow push-in (0.80 to 0.85 in the 9:16 cut, 1.00 to 1.05 inside the 16:9 column) so the story page never sits frozen.
    { id: 'S9', from: F.S9[0], to: F.S9[1], parts: [['R7', 0]], caption: 'answers', sprite: 'fox', layout916: 'inset', inset916: { scale: [0.8, 0.85], top: 285 }, push169: 0.05 },
    { id: 'S10', from: F.S10[0], to: F.S10[1], parts: [['R8', 0]], caption: 'words', sprite: 'fox' },
    { id: 'S11', from: F.S11[0], to: F.S11[1], parts: [['R9', r9from]], caption: null, layout916: 'lift', layout169: 'sheet', leftSprite: 'owl' },
    { id: 'S12', from: F.S12[0], to: F.S12[1], parts: [['R10', 0]], caption: null },
    { id: 'END', from: F.END[0], to: F.END[1], end: true },
  ];
}
/** For timeline frame t: the shot, the clip and the clip frame shown. */
function sourceFor(shots, t) {
  const shot = shots.find(s => t >= s.from && t <= s.to);
  if (shot.end) return { shot };
  const k = t - shot.from;
  if (shot.partLength) {
    const i = Math.min(shot.parts.length - 1, Math.floor(k / shot.partLength));
    const [clip, start] = shot.parts[i];
    return { shot, clip, frame: start + k - i * shot.partLength, part: i };
  }
  const [clip, start] = shot.parts[0];
  return { shot, clip, frame: start + k, part: 0 };
}
/**
 * Caption on frame t and its opacity: hard in at a cut. The 16:9 plaque fades
 * out over 6 frames before a shot with no caption; the 9:16 plaque sits over
 * the game's header, which would ghost through a fading plaque, so there it
 * always cuts out on the shot boundary (kind '916').
 */
function captionFor(shots, t, kind = '169') {
  const i = shots.findIndex(s => t >= s.from && t <= s.to);
  const shot = shots[i];
  if (!shot.caption) return null;
  const next = shots[i + 1];
  let alpha = 1;
  if (kind === '916') return { id: shot.caption, alpha };
  if (next && !next.caption && !next.end) alpha = Math.min(1, (shot.to - t + 1) / 6);
  else if (next && next.end) alpha = Math.min(1, (shot.to - t + 1) / 6);
  return { id: shot.caption, alpha };
}

// ---------------------------------------------------------------- clips

async function loadClips(ids) {
  const clips = {};
  for (const id of ids) {
    const file = path.join(EVENTS, `${id}.json`);
    if (!existsSync(file)) throw new Error(`missing ${file}: run recordTrailer.mjs ${id}`);
    clips[id] = JSON.parse(await readFile(file, 'utf8'));
    clips[id].dir = path.join(WORK, clips[id].framesDir);
  }
  return clips;
}
function framePath(clips, clip, frame) {
  const c = clips[clip];
  if (frame < c.firstFrame || frame > c.lastFrame) throw new Error(`${clip} has no frame ${frame} (${c.firstFrame}..${c.lastFrame})`);
  return path.join(c.dir, `f${String(frame + HANDLE).padStart(5, '0')}.png`);
}

// ---------------------------------------------------------------- overlays (typeset in Chromium with the game's fonts)

// Fonts are inlined as data URLs: a page made with setContent cannot load file:// fonts.
const fontFace = (family, file) => `@font-face { font-family: '${family}'; src: url(data:font/ttf;base64,${readFileSync(A('fonts/' + file)).toString('base64')}) format('truetype'); }`;
const PLAQUE_CSS = `
  ${fontFace('Figtree-Bold', 'Figtree-Bold.ttf')}
  ${fontFace('EpundaSlab-Italic', 'EpundaSlab-Italic.ttf')}
  html, body { margin: 0; background: transparent; }
  .plaque { position: absolute; left: 3px; top: 3px; box-sizing: border-box;
    background: #F3E2BF; border: 8px solid #6B4A2E;
    box-shadow: 0 0 0 3px #3B2416; display: flex; align-items: center; justify-content: center; }
  .text { font-family: 'Figtree-Bold'; color: #3B2416; text-align: center; line-height: 1.12; text-wrap: balance; }
`;

/**
 * Renders every caption plaque for one layout. 9:16: 1056 wide (x 12..1068),
 * text 76 px, max text width 888, else 68 px, else two lines at 76 px.
 * 16:9: 540 wide (x 80..620), text 72 px in 476, up to three lines.
 */
async function renderPlaques(browser, layout) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>${PLAQUE_CSS}</style><div id="probe" class="text" style="position:absolute; white-space:nowrap; visibility:hidden"></div><div id="p" class="plaque"><div id="t" class="text"></div></div>`);
  await page.evaluate(() => document.fonts.ready);
  const width = (text, size) => page.evaluate(({ text, size }) => {
    const probe = document.getElementById('probe'); probe.style.fontSize = `${size}px`; probe.textContent = text; return probe.getBoundingClientRect().width;
  }, { text, size });
  // 9:16: x 12..1068, wide enough to cover the in-game header's round buttons
  // (at x 60..1020 they peeked out at both ends). Opaque, because at the
  // brief's 92% the WordShift logo under it showed through as a ghost.
  const plaqueW = layout === '916' ? 1056 : 540;
  const innerW = layout === '916' ? 888 : 476;
  const out = {};
  for (const [id, text] of Object.entries(CAPTIONS)) {
    let spec;
    if (layout === '916') {
      // One line at 76 px, else one line at 68 px, else the authored two-line break at 76 px.
      const w76 = await width(text, 76), w68 = await width(text, 68);
      if (w76 <= innerW) spec = { size: 76, lines: [text], textWidth: w76 };
      else if (w68 <= innerW) spec = { size: 68, lines: [text], textWidth: w68 };
      else {
        const lines = LINES_916[id];
        const ws = []; for (const l of lines) ws.push(await width(l, 76));
        if (Math.max(...ws) > innerW) throw new Error(`9:16 caption ${id} does not fit at 76 px`);
        spec = { size: 76, lines, textWidth: Math.max(...ws) };
      }
    } else {
      // 72 px in 476, up to three lines: the authored break with the fewest
      // lines that fits at 64 px or more, at the largest size it fits.
      let best = null;
      for (const lines of LINES_169[id]) {
        for (let size = 72; size >= 64; size -= 2) {
          const ws = []; for (const l of lines) ws.push(await width(l, size));
          if (Math.max(...ws) <= innerW) {
            if (!best || lines.length < best.lines.length || (lines.length === best.lines.length && size > best.size)) best = { size, lines, textWidth: Math.max(...ws) };
            break;
          }
        }
      }
      if (!best) throw new Error(`16:9 caption ${id} does not fit`);
      spec = best;
    }
    const h = await page.evaluate(({ spec, plaqueW, innerW, minH }) => {
      const p = document.getElementById('p'), t = document.getElementById('t');
      t.replaceChildren(...spec.lines.map(l => { const d = document.createElement('div'); d.textContent = l; d.style.whiteSpace = 'nowrap'; return d; }));
      t.style.fontSize = `${spec.size}px`;
      t.style.width = `${innerW}px`;
      p.style.width = `${plaqueW}px`;
      p.style.height = 'auto';
      p.style.padding = '36px 0';
      p.style.minHeight = minH ? `${minH}px` : '';
      return Math.round(p.getBoundingClientRect().height);
    }, { spec, plaqueW, innerW, minH: layout === '916' ? MIN_H_916[id] ?? 0 : 0 });
    // The plaque sits at (3,3) so its 3 px outer line (a box-shadow ring) is inside the image.
    const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: plaqueW + 6, height: h + 6 } });
    out[id] = { png, width: plaqueW + 6, height: h + 6, size: spec.size, lines: spec.lines, measuredWidth: Math.round(spec.textWidth) };
  }
  await page.close();
  return out;
}
/** The end card line as a transparent full-frame overlay, baseline-positioned with SVG text. */
async function renderEndLine(browser, { width, height, size, baseline }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(`<style>${PLAQUE_CSS} svg { position:absolute; left:0; top:0 }</style>
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width / 2 + 3}" y="${baseline + 3}" text-anchor="middle" font-family="EpundaSlab-Italic" font-size="${size}" fill="#3B2416">${END_LINE}</text>
      <text id="line" x="${width / 2}" y="${baseline}" text-anchor="middle" font-family="EpundaSlab-Italic" font-size="${size}" fill="#FFF6E0">${END_LINE}</text>
    </svg>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  const measured = await page.evaluate(() => Math.round(document.getElementById('line').getBBox().width));
  const png = await page.screenshot({ omitBackground: true });
  await page.close();
  return { png, measured };
}

// ---------------------------------------------------------------- backgrounds and fixed art

/** Sky art cover-cropped to 1920x1080 around 45% of its height, blurred and dimmed (16:9 background). */
async function sky169(name, brightness = 0.88, centre = 0.45) {
  const src = A(`environment/${name}.webp`);
  const meta = await sharp(src).metadata();
  const h = Math.round((meta.height * 1920) / meta.width);
  const top = Math.max(0, Math.min(h - 1080, Math.round(h * centre - 540)));
  const scaled = await sharp(src).resize(1920, h).extract({ left: 0, top, width: 1920, height: 1080 }).toBuffer();
  return sharp(scaled).blur(22).modulate({ brightness }).removeAlpha().raw().toBuffer();
}
/** sky_dusk for the 9:16 end card: 1080 wide, 1920 rows from y 170, blurred and dimmed. */
async function sky916End() {
  const src = A('environment/sky_dusk.webp');
  const meta = await sharp(src).metadata();
  const h = Math.round((meta.height * 1080) / meta.width);
  const scaled = await sharp(src).resize(1080, h).extract({ left: 0, top: Math.min(170, h - 1920), width: 1080, height: 1920 }).toBuffer();
  return sharp(scaled).blur(22).modulate({ brightness: 0.75 }).removeAlpha().png().toBuffer();
}
async function endCard(size) {
  if (size === '916') {
    const bg = await sky916End();
    const mark = await sharp(A('ui/wordmark.png')).resize(820, 205).png().toBuffer();
    return sharp(bg).composite([{ input: mark, left: Math.round((1080 - 820) / 2), top: 560 }]).removeAlpha().png().toBuffer();
  }
  const bg = await sharp(await sky169('sky_dusk', 0.75, DUSK_BAND_169), { raw: { width: 1920, height: 1080, channels: 3 } }).png().toBuffer();
  const mark = await sharp(A('ui/wordmark.png')).resize(760, 190).png().toBuffer();
  return sharp(bg).composite([{ input: mark, left: Math.round((1920 - 760) / 2), top: 330 }]).removeAlpha().png().toBuffer();
}
/** Rounded-corner mask (white on transparent) for a w x h layer. */
function roundMask(w, h, r) {
  return Buffer.from(`<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);
}
/** Soft drop shadow for a w x h rounded rect: offset (0,12), blur 40, #3B2416 at 45%. Returns { png, left, top } relative to the rect. */
async function dropShadow(w, h, r) {
  const pad = 100;
  const svg = Buffer.from(`<svg width="${w + 2 * pad}" height="${h + 2 * pad}"><rect x="${pad}" y="${pad + 12}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#3B2416" fill-opacity="0.45"/></svg>`);
  const png = await sharp(svg).blur(20).png().toBuffer();
  return { png, left: -pad, top: -pad };
}
/**
 * Clip an overlay to the base frame. sharp mis-places an overlay that runs
 * past the right or bottom edge, so every layer is cut to the visible part
 * first. Returns null when nothing of it is visible.
 */
async function clipLayer(layer, baseW, baseH) {
  const meta = await sharp(layer.input).metadata();
  const x0 = Math.max(0, layer.left), y0 = Math.max(0, layer.top);
  const x1 = Math.min(baseW, layer.left + meta.width), y1 = Math.min(baseH, layer.top + meta.height);
  if (x1 <= x0 || y1 <= y0) return null;
  if (x0 === layer.left && y0 === layer.top && x1 - x0 === meta.width && y1 - y0 === meta.height) return layer;
  const input = await sharp(layer.input).extract({ left: x0 - layer.left, top: y0 - layer.top, width: x1 - x0, height: y1 - y0 }).png().toBuffer();
  return { ...layer, input, left: x0, top: y0 };
}
async function compositeClipped(base, layers, baseW, baseH) {
  const out = [];
  for (const l of layers) { const c = await clipLayer(l, baseW, baseH); if (c) out.push(c); }
  return base.composite(out);
}
/** Scale an RGBA PNG's alpha by `a` (0..1). */
async function fade(png, a) {
  if (a >= 0.999) return png;
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * a);
  return sharp(data, { raw: info }).png().toBuffer();
}

// ---------------------------------------------------------------- frame composition

function makeComposer(kind, ctx) {
  const { clips, shots, plaques, sprites, fixed } = ctx;
  const plaqueCache = new Map();
  const plaque = async (id, alpha) => {
    const key = `${id}:${alpha.toFixed(3)}`;
    if (!plaqueCache.has(key)) plaqueCache.set(key, await fade(plaques[id].png, alpha));
    return plaqueCache.get(key);
  };
  const r1Rows = clips.R1.rowBoxesCssAtFrame0;
  const px = v => Math.round(v * DPR);

  if (kind === '916') {
    return async t => {
      const src = sourceFor(shots, t);
      const layers = [];
      let base;
      if (src.shot.end) {
        base = sharp(fixed.end916);
        const k = t - 846;
        if (k >= 0) layers.push({ input: await fade(fixed.endLine916, Math.min(1, (k + 1) / 13)), left: 0, top: 0 });
        // 12-frame dissolve from the last dusk frame into the card.
        if (t < 840) {
          const last = await sharp(framePath(clips, 'R10', 77)).removeAlpha().ensureAlpha(1 - (t - 827) / 13).png().toBuffer();
          layers.push({ input: last, left: 0, top: 0 });
        }
      } else {
        const file = framePath(clips, src.clip, src.frame);
        const layout = src.shot.layout916;
        if (layout === 'inset') {
          // The frame scaled down under the caption (so the plaque never
          // covers the scene art), over a blurred, dimmed copy of itself.
          const { top } = src.shot.inset916;
          const [s0, s1] = [].concat(src.shot.inset916.scale, src.shot.inset916.scale);
          const k = (t - src.shot.from) / Math.max(1, src.shot.to - src.shot.from);
          const scale = s0 + (s1 - s0) * k;
          const w = Math.round(1080 * scale), h = Math.round(1920 * scale);
          const fill = await sharp(file).blur(30).modulate({ brightness: 0.55 }).png().toBuffer();
          const small = await sharp(file).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
          base = sharp(fill);
          layers.push({ input: small, left: Math.round((1080 - w) / 2), top });
        } else if (layout === 'lift') {
          const top = await sharp(file).extract({ left: 0, top: 480, width: 1080, height: 1440 }).png().toBuffer();
          const fill = await sharp(file).extract({ left: 0, top: 1440, width: 1080, height: 480 }).blur(30).modulate({ brightness: 0.6 }).png().toBuffer();
          base = sharp({ create: { width: 1080, height: 1920, channels: 3, background: '#000' } });
          layers.push({ input: top, left: 0, top: 0 }, { input: fill, left: 0, top: 1440 });
        } else {
          base = sharp(file);
        }
        const cap = captionFor(shots, t, '916');
        if (cap && cap.alpha > 0) layers.push({ input: await plaque(cap.id, cap.alpha), left: 12 - 3, top: (src.shot.plaqueTop916 ?? 150) - 3 });
      }
      return (await compositeClipped(base, layers, 1080, 1920)).removeAlpha().raw().toBuffer();
    };
  }

  // 16:9 master
  const PHONE = { left: 674, top: 32, width: 572, height: 1016, radius: 28 };
  return async t => {
    const src = sourceFor(shots, t);
    const layers = [];
    let bg;
    if (src.shot.end) {
      const out = sharp(fixed.end169);
      const k = t - 846;
      if (k >= 0) layers.push({ input: await fade(fixed.endLine169, Math.min(1, (k + 1) / 13)), left: 0, top: 0 });
      if (t < 840) layers.push({ input: await sharp(await ctx.lastDusk169()).removeAlpha().ensureAlpha(1 - (t - 827) / 13).png().toBuffer(), left: 0, top: 0 });
      return (await compositeClipped(out, layers, 1920, 1080)).removeAlpha().raw().toBuffer();
    }
    // Background: sky_day until S8, a 15-frame crossfade to afternoon from S8's first frame, dusk from S12 (750).
    const s8 = shots.find(s => s.id === 'S8').from, s12 = shots.find(s => s.id === 'S12').from;
    if (t >= s12) bg = fixed.sky.dusk;
    else if (t >= s8 + 15) bg = fixed.sky.afternoon;
    else if (t >= s8) {
      bg = fixed.sky.day;
      layers.push({ input: await sharp(fixed.sky.afternoon, { raw: { width: 1920, height: 1080, channels: 3 } }).ensureAlpha((t - s8 + 1) / 15).png().toBuffer(), left: 0, top: 0 });
    } else bg = fixed.sky.day;
    const file = framePath(clips, src.clip, src.frame);
    const layout = src.shot.layout169;
    let panel;
    if (layout === 'rows') {
      // Rows 0..2 of the opener at frame 0, scaled to 1180 wide at x 680..1860, centred vertically.
      // Row boxes are viewport CSS; the clip's frames start at cropTopCss.
      const r = ['puzzle-row-0', 'puzzle-row-1', 'puzzle-row-2'].map(k => r1Rows[k]);
      const off = clips.R1.cropTopCss ?? 0;
      // Down to 8 CSS below the HEAR fan's preview labels (frames 76-96), which hang below row 2's box.
      const y0 = Math.min(...r.map(b => b.y)) - 14 - off;
      const y1 = Math.max(Math.max(...r.map(b => b.y + b.height)) - 4, (clips.R1.marks?.row2FanBottomCss ?? 0) + 8) - off;
      const crop = { left: 0, top: px(y0), width: 1080, height: Math.min(1920 - px(y0), px(y1 - y0)) };
      // Up to 1180 wide in x 680..1860 and no taller than 1000, centred in both.
      const k = Math.min(1180 / crop.width, 1000 / crop.height);
      const w = Math.round(crop.width * k), h = Math.round(crop.height * k);
      panel = { crop, width: w, height: h, left: Math.round(1270 - w / 2), top: Math.round(540 - h / 2), radius: 28 };
    } else if (layout === 'sheet') {
      const sheetTop = ctx.sheetTop[src.clip];
      const crop = { left: 0, top: px(sheetTop), width: 1080, height: 1920 - px(sheetTop) };
      const w = 1000, h = Math.round((crop.height * w) / crop.width);
      panel = { crop, width: w, height: h, left: 760, top: Math.round(540 - h / 2), radius: 28 };
    } else if (src.shot.push169) {
      // A slow push-in about the frame centre.
      const z = 1 + src.shot.push169 * ((t - src.shot.from) / Math.max(1, src.shot.to - src.shot.from));
      const cw = Math.round(1080 / z), ch = Math.round(1920 / z);
      panel = { crop: { left: Math.round((1080 - cw) / 2), top: Math.round((1920 - ch) / 2), width: cw, height: ch }, ...PHONE };
    } else {
      panel = { crop: null, ...PHONE };
    }
    let img = sharp(file);
    if (panel.crop) img = img.extract(panel.crop);
    const scaled = await img.resize(panel.width, panel.height, { kernel: 'lanczos3' }).png().toBuffer();
    const masked = await sharp(scaled).ensureAlpha().composite([{ input: roundMask(panel.width, panel.height, panel.radius), blend: 'dest-in' }]).png().toBuffer();
    const shadow = await ctx.shadowFor(panel.width, panel.height, panel.radius);
    layers.push({ input: shadow.png, left: panel.left + shadow.left, top: panel.top + shadow.top }, { input: masked, left: panel.left, top: panel.top });
    const cap = captionFor(shots, t);
    if (cap && cap.alpha > 0) {
      const p = plaques[cap.id];
      layers.push({ input: await plaque(cap.id, cap.alpha), left: Math.round(350 - p.width / 2), top: Math.round(540 - p.height / 2) });
    }
    if (src.shot.leftSprite) layers.push({ input: sprites[src.shot.leftSprite], left: Math.round(350 - 210), top: 960 - 420 });
    if (src.shot.sprite) layers.push({ input: sprites[src.shot.sprite], left: Math.round((1330 + 1840) / 2 - 210), top: 960 - 420 });
    return (await compositeClipped(sharp(bg, { raw: { width: 1920, height: 1080, channels: 3 } }), layers, 1920, 1080)).removeAlpha().raw().toBuffer();
  };
}

// ---------------------------------------------------------------- audio

/** SFX events placed on the timeline (only those inside the frames each shot uses). */
function timelineSfx(clips, shots) {
  const out = [];
  for (const shot of shots) {
    if (shot.end) continue;
    const len = shot.to - shot.from + 1;
    const parts = shot.partLength ? shot.parts.map(([c, s], i) => ({ clip: c, start: s, t0: shot.from + i * shot.partLength, n: shot.partLength })) : [{ clip: shot.parts[0][0], start: shot.parts[0][1], t0: shot.from, n: len }];
    for (const p of parts) {
      for (const e of clips[p.clip].events) {
        if (!e.sfx) continue;
        // sfxLead: an action just before a shot's first frame (a tap whose result
        // opens the shot) still sounds, on the shot's first frame.
        const lead = !shot.partLength ? shot.sfxLead ?? 0 : 0;
        // sfxTail: an action on the frame just after a shot's last one (the tap
        // the shot cuts on) sounds on the cut.
        const tail = !shot.partLength ? shot.sfxTail ?? 0 : 0;
        if (e.frame < p.start - lead || e.frame >= p.start + p.n + tail) continue;
        out.push({ t: p.t0 + Math.max(0, e.frame - p.start), sfx: e.sfx, clip: p.clip, clipFrame: e.frame, action: e.action, shot: shot.id });
      }
    }
  }
  const seen = new Set();
  return out.filter(e => { const k = `${e.t}:${e.sfx}`; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => a.t - b.t);
}
/** File durations (s) of the SFX that can outlast a shot, and level trims: story_answer is a 4.4 s swell at about -12 dB RMS, loud against the music bus. */
const SFX_DURATION = { 'perfect.wav': 2.9, 'story_answer.wav': 4.4, 'unlock.wav': 1.55 };
const SFX_GAIN_DB = { 'story_answer.wav': -6 };
/** Sounds that ring on over the next shot instead of being cut with their own (the invite chime lands on the S5 to S6 cut). */
const SFX_RING_THROUGH = new Set(['unlock.wav']);
const ALLOWED_SFX = new Set(['letter_select.wav', 'valid_move.wav', 'valid_move_2.wav', 'valid_move_3.wav', 'star_pop_1.wav', 'star_pop_2.wav', 'star_pop_3.wav', 'perfect.wav', 'ui_tap.wav', 'unlock.wav', 'dialogue.wav', 'story_answer.wav', 'pit_devour.wav']);

function ff(args, { quiet = true } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, ['-hide_banner', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('close', code => (code === 0 ? resolve(err) : reject(new Error(`ffmpeg failed (${code}):\n${err.slice(-3000)}`))));
    if (!quiet) p.stderr.pipe(process.stderr);
  });
}
/** Integrated loudness (LUFS) of a file segment, via ebur128. */
async function loudness(file, ss, t) {
  const err = await ff(['-ss', String(ss), '-t', String(t), '-i', file, '-af', 'ebur128', '-f', 'null', '-']);
  const m = err.match(/Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS/);
  return m ? Number(m[1]) : null;
}

/**
 * The mix (brief 6, "Audio"): three of the game's own music beds on a bus set
 * to about -20 LUFS, the recorded actions' SFX at file level, then a two-pass
 * loudnorm to I -14, TP -1, LRA 11, 48 kHz stereo.
 */
async function buildAudio(clips, shots, report) {
  const beds = [
    { file: A('music/puzzle_phase0.mp3'), ss: 2.0, at: 0.0, dur: 8.4, fadeIn: [0, 0.15], fadeOut: [7.6, 0.8] },
    { file: A('music/home_phase0.mp3'), ss: 25.0, at: 7.6, dur: 17.4, fadeIn: [0, 0.8], fadeOut: [17.4 - 0.015, 0.015] },
    { file: A('music/home_phase2.mp3'), ss: 71.0, at: 25.4, dur: 4.6, fadeIn: [0, 0.3], fadeOut: [3.4, 1.2] },
  ];
  // Each bed's gain puts its used segment at about -20 LUFS integrated.
  for (const b of beds) {
    b.lufs = await loudness(b.file, b.ss, b.dur);
    b.gainDb = b.lufs === null ? -6 : Math.max(-20, Math.min(6, -20 - b.lufs));
  }
  const sfx = timelineSfx(clips, shots);
  for (const e of sfx) if (!ALLOWED_SFX.has(e.sfx)) throw new Error(`SFX ${e.sfx} is not on the brief's list`);
  const inputs = [], chains = [], labels = [];
  beds.forEach((b, i) => {
    inputs.push('-ss', String(b.ss), '-t', String(b.dur), '-i', b.file);
    chains.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${b.gainDb.toFixed(2)}dB,` +
      `afade=t=in:st=${b.fadeIn[0]}:d=${b.fadeIn[1]},afade=t=out:st=${b.fadeOut[0].toFixed(3)}:d=${b.fadeOut[1]},` +
      `adelay=${Math.round(b.at * 1000)}|${Math.round(b.at * 1000)},apad=whole_dur=30[m${i}]`);
    labels.push(`[m${i}]`);
  });
  sfx.forEach((e, k) => {
    const i = beds.length + k;
    inputs.push('-i', A(`sounds/${e.sfx}`));
    const ms = Math.round((e.t * 1000) / FPS);
    // A long sound (the story swell, the PERFECT fanfare) is faded out 0.3 s
    // after its shot ends, so it never plays on under an unrelated shot.
    // Continuous footage runs on across shots (S1 to S3 are one take of R1),
    // so the limit is the end of the unbroken run the event belongs to.
    let j = shots.findIndex(s => s.id === e.shot), runEnd = shots[j].to;
    while (shots[j + 1] && !shots[j].partLength && !shots[j + 1].partLength && !shots[j + 1].end
      && shots[j + 1].parts[0][0] === shots[j].parts[0][0] && shots[j + 1].parts[0][1] === shots[j].parts[0][1] + (shots[j].to - shots[j].from + 1)) {
      j++; runEnd = shots[j].to;
    }
    const room = (runEnd + 1 - e.t) / FPS + 0.3;
    const trim = !SFX_RING_THROUGH.has(e.sfx) && SFX_DURATION[e.sfx] > room ? `,atrim=0:${room.toFixed(3)},afade=t=out:st=${Math.max(0, room - 0.4).toFixed(3)}:d=0.4` : '';
    const gain = SFX_GAIN_DB[e.sfx] ?? 0;
    e.gainDb = gain; e.trimmedTo = trim ? Number(room.toFixed(3)) : null;
    chains.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${gain}dB${trim},adelay=${ms}|${ms},apad=whole_dur=30[s${k}]`);
    labels.push(`[s${k}]`);
  });
  chains.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=0:30[mix]`);
  const raw = path.join(WORK, 'mix-raw.wav');
  await ff([...inputs, '-filter_complex', chains.join(';'), '-map', '[mix]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', raw]);
  // The SFX peak near -3 dBFS while the mix sits well under -14 LUFS, so the
  // gain loudnorm needs would push them past -1 dBTP and force it out of
  // linear mode. A brickwall limiter first holds the peaks at the ceiling that
  // gain will leave at -1.5 dBTP; then the two-pass loudnorm stays linear.
  const i0 = await loudness(raw, 0, 30);
  const gain = -14 - i0;
  const ceiling = Math.min(1, 10 ** ((-1.5 - gain) / 20));
  const limited = path.join(WORK, 'mix-limited.wav');
  await ff(['-i', raw, '-af', `alimiter=limit=${ceiling.toFixed(4)}:attack=2:release=60:level=disabled`, '-ar', '48000', '-c:a', 'pcm_s24le', limited]);
  const pass1 = await ff(['-i', limited, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-']);
  const j = JSON.parse(pass1.slice(pass1.lastIndexOf('{'), pass1.lastIndexOf('}') + 1));
  const mix = path.join(WORK, 'mix.wav');
  const pass2 = await ff(['-i', limited, '-af', `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true:print_format=summary,aresample=48000`,
    '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', mix]);
  const normalization = pass2.match(/Normalization Type:\s+(\w+)/)?.[1] ?? null;
  const check = await ff(['-i', mix, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  report.audio = {
    beds: beds.map(b => ({ file: path.relative(mobile, b.file), startInFile: b.ss, at: b.at, duration: b.dur, segmentLufs: b.lufs, gainDb: Number(b.gainDb.toFixed(2)) })),
    sfx: sfx.map(e => ({ frame: e.t, time: Number((e.t / FPS).toFixed(3)), sfx: e.sfx, gainDb: e.gainDb, trimmedToSeconds: e.trimmedTo, from: `${e.clip} frame ${e.clipFrame}`, action: e.action })),
    rawIntegrated: i0, preLimiterCeilingDb: Number((20 * Math.log10(ceiling)).toFixed(2)),
    loudnormPass1: j, loudnormPass2Type: normalization,
    final: {
      integrated: Number(check.match(/Integrated loudness:\s+I:\s+(-?[\d.]+)/)?.[1]),
      truePeak: Number(check.match(/True peak:\s+Peak:\s+(-?[\d.]+)/)?.[1]),
      lra: Number(check.match(/Loudness range:\s+LRA:\s+(-?[\d.]+)/)?.[1]),
    },
  };
  return mix;
}

// ---------------------------------------------------------------- encode

async function encode(kind, compose, mix, out, ctx) {
  const [w, h] = kind === '916' ? [1080, 1920] : [1920, 1080];
  const args = ['-hide_banner', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${w}x${h}`, '-r', String(FPS), '-i', '-', '-i', mix,
    // RGB to BT.709 limited-range YUV, tagged as such: untagged HD video is
    // played back as BT.709, so a BT.601 conversion (swscale's default) shifts
    // every colour on YouTube and Play.
    '-map', '0:v', '-map', '1:a', '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-maxrate', '16M', '-bufsize', '32M', '-c:a', 'aac', '-b:a', '384k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', '-t', '30', out];
  const p = spawn(FFMPEG, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', d => { err += d; });
  const done = new Promise((resolve, reject) => p.on('close', code => (code === 0 ? resolve() : reject(new Error(`encode ${kind} failed:\n${err.slice(-3000)}`)))));
  const t0 = Date.now();
  for (let t = 0; t < TOTAL; t++) {
    const buf = await compose(t);
    if (buf.length !== w * h * 3) throw new Error(`${kind} frame ${t}: ${buf.length} bytes`);
    if (ctx.keep?.[kind]?.includes(t)) ctx.kept[`${kind}:${t}`] = { buf, w, h };
    if (!p.stdin.write(buf)) await new Promise(r => p.stdin.once('drain', r));
    if (t % 150 === 0) console.log(`${kind}: frame ${t} (${Math.round((Date.now() - t0) / 1000)} s)`);
  }
  p.stdin.end();
  await done;
  console.log(`${kind}: encoded ${path.relative(mobile, out)} in ${Math.round((Date.now() - t0) / 1000)} s`);
}
/** Duration, size, codecs and rates as ffmpeg reports them. */
function inspect(file) {
  let txt = '';
  try { execFileSync(FFMPEG, ['-hide_banner', '-i', file], { stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { txt = e.stderr.toString(); }
  return {
    duration: txt.match(/Duration: ([\d:.]+)/)?.[1],
    video: txt.match(/Video: ([^\n]+)/)?.[1]?.trim(),
    audio: txt.match(/Audio: ([^\n]+)/)?.[1]?.trim(),
    faststart: null,
  };
}
/** True when the moov atom precedes mdat (faststart). */
async function isFaststart(file) {
  const buf = await readFile(file);
  let off = 0, moov = -1, mdat = -1;
  while (off + 8 <= buf.length) {
    const size = buf.readUInt32BE(off), type = buf.toString('latin1', off + 4, off + 8);
    if (type === 'moov') moov = off; if (type === 'mdat') mdat = off;
    if (size < 8) break;
    off += size;
  }
  return moov >= 0 && mdat >= 0 && moov < mdat;
}

// ---------------------------------------------------------------- YouTube thumbnail

/**
 * The YouTube thumbnail (1280x720): the cast painting FG-A uses
 * (assets/story/pages/witness-05.webp, picture only, the same tone), the
 * wordmark large at the bottom left, and the real PICK-row tiles spelling
 * PLANT (the moved L locked in) cropped from the stills capture
 * raw/s01-frame-b-after-move.png at the bottom right, clear of YouTube's
 * duration badge. The only words are the wordmark and PLANT, so it reads at
 * YouTube's small list sizes (about 168x94); PLAY on its own read as a Play
 * button next to YouTube's own.
 */
async function buildThumbnail() {
  const W = 1280, H = 720;
  const art = await sharp(A('story/pages/witness-05.webp')).resize(W, H, { kernel: 'lanczos3' })
    .gamma(1, 1.8).modulate({ saturation: 1.18, brightness: 1.04 }).removeAlpha().png().toBuffer();
  const scrim = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0.55" stop-color="#3B2416" stop-opacity="0"/><stop offset="0.97" stop-color="#3B2416" stop-opacity="0.72"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/></svg>`);
  const mark = { width: 600, height: 150, left: 44, top: 540 };
  const markPng = await sharp(A('ui/wordmark.png')).resize(mark.width, mark.height, { kernel: 'lanczos3', fit: 'fill' }).png().toBuffer();
  // The PLANT PICK-row tiles (slot 01 frame B), cropped as FG-B crops them,
  // with the card's own rim colour. P L A Y alone read as a Play button.
  const raw = path.join(CAMPAIGN, 'raw/s01-frame-b-after-move.png');
  const prov = JSON.parse(await readFile(path.join(CAMPAIGN, 'raw/provenance.json'), 'utf8')).captures.find(c => c.file === 's01-frame-b-after-move.png');
  const t = prov.boxesCss.fgbTiles, panel = prov.boxesCss.fgbRowCardPanel, dpr = prov.deviceScaleFactor;
  const box = { left: Math.round((t.x - 10) * dpr), top: Math.round((t.y - 4) * dpr), width: Math.round((t.width + 20) * dpr), height: Math.round((t.height + 8) * dpr) };
  const { data, info } = await sharp(raw).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const k = (Math.round((panel.y + 1) * dpr) * info.width + Math.round((panel.x + panel.width / 2) * dpr)) * 3;
  const rim = 4, radius = 16, TW = 560, TH = Math.round((box.height * TW) / box.width);
  const inner = await sharp(raw).extract(box).resize(TW - 2 * rim, TH - 2 * rim, { kernel: 'lanczos3', fit: 'fill' }).png().toBuffer();
  const innerMask = Buffer.from(`<svg width="${TW - 2 * rim}" height="${TH - 2 * rim}"><rect width="${TW - 2 * rim}" height="${TH - 2 * rim}" rx="${radius - rim}" fill="#fff"/></svg>`);
  const tilesPng = await sharp(Buffer.from(`<svg width="${TW}" height="${TH}" xmlns="http://www.w3.org/2000/svg"><rect width="${TW}" height="${TH}" rx="${radius}" fill="rgb(${data[k]},${data[k + 1]},${data[k + 2]})"/></svg>`))
    .composite([{ input: await sharp(inner).ensureAlpha().composite([{ input: innerMask, blend: 'dest-in' }]).png().toBuffer(), left: rim, top: rim }]).png().toBuffer();
  const tiles = { width: TW, height: TH, left: W - TW - 60, top: H - TH - 60 };
  const shadow = await sharp(Buffer.from(`<svg width="${TW + 80}" height="${TH + 80}"><rect x="40" y="50" width="${TW}" height="${TH}" rx="${radius}" fill="#3B2416" fill-opacity="0.55"/></svg>`)).blur(12).png().toBuffer();
  const out = path.join(VIDEO, 'youtube-thumbnail-1280x720.png');
  await sharp(art).composite([
    { input: scrim, left: 0, top: 0 },
    { input: markPng, left: mark.left, top: mark.top },
    { input: shadow, left: tiles.left - 40, top: tiles.top - 40 },
    { input: tilesPng, left: tiles.left, top: tiles.top },
  ]).removeAlpha().png().toFile(out);
  return { file: path.relative(CAMPAIGN, out), art: 'assets/story/pages/witness-05.webp (picture only)', wordmark: mark, tiles: { ...tiles, source: 'raw/s01-frame-b-after-move.png (fgbTiles: PLANT)' } };
}

// ---------------------------------------------------------------- SRT

const srtTime = f => {
  const ms = Math.round((f * 1000) / FPS);
  const hh = String(Math.floor(ms / 3600000)).padStart(2, '0'), mm = String(Math.floor(ms / 60000) % 60).padStart(2, '0');
  const ss = String(Math.floor(ms / 1000) % 60).padStart(2, '0'), mmm = String(ms % 1000).padStart(3, '0');
  return `${hh}:${mm}:${ss},${mmm}`;
};
function buildSrt(shots) {
  const cues = [];
  for (const s of shots) {
    if (!s.caption) continue;
    const last = cues[cues.length - 1];
    if (last && last.id === s.caption && last.to === s.from - 1) { last.to = s.to; continue; }
    cues.push({ id: s.caption, from: s.from, to: s.to });
  }
  cues.push({ id: 'end', from: 846, to: 899, text: END_LINE });
  return cues.map((c, i) => `${i + 1}\n${srtTime(c.from)} --> ${srtTime(c.to + 1)}\n${c.text ?? CAPTIONS[c.id]}\n`).join('\n');
}

// ---------------------------------------------------------------- main

const want = process.argv.slice(2);
const kinds = want.filter(a => a === '9x16' || a === '16x9');
const doKinds = kinds.length ? kinds.map(k => (k === '9x16' ? '916' : '169')) : ['916', '169'];
await mkdir(VIDEO, { recursive: true });
const CLIP_IDS = ['R1', 'R2a', 'R2b', 'R2c', 'R3', 'R4', 'R5', 'R6a', 'R6b', 'R6c', 'R7', 'R8', 'R9', 'R10'];
const overlaysOnly = want.includes('--overlays');
const clips = overlaysOnly ? {} : await loadClips(CLIP_IDS);
const shots = overlaysOnly ? [] : buildShots(clips);
const report = { builtAt: new Date().toISOString(), fps: FPS, frames: TOTAL, shots: [], clips: {} };
for (const s of shots) {
  const src0 = s.end ? null : sourceFor(shots, s.from), src1 = s.end ? null : sourceFor(shots, s.to);
  report.shots.push({ id: s.id, frames: [s.from, s.to], time: [Number((s.from / FPS).toFixed(2)), Number(((s.to + 1) / FPS).toFixed(2))],
    source: s.end ? 'end card (not UI)' : s.parts.map(([c], i) => `${c} ${s.partLength ? `${s.parts[i][1]}..${s.parts[i][1] + s.partLength - 1}` : `${src0.frame}..${src1.frame}`}`).join(', '),
    caption: s.caption ? CAPTIONS[s.caption] : s.end ? END_LINE : null });
}
if (!overlaysOnly) for (const id of CLIP_IDS) report.clips[id] = { state: clips[id].state, recordedAt: clips[id].recordedAt, frames: clips[id].frames, screening: clips[id].screening, meta: Object.fromEntries(Object.entries(clips[id]).filter(([k]) => ['boardAtStart', 'chainWords', 'difficulty', 'tapped', 'wordsAtStart', 'line', 'marks', 'cosmetic'].includes(k))) };

const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
const plaques916 = await renderPlaques(browser, '916');
const plaques169 = await renderPlaques(browser, '169');
const endLine916 = await renderEndLine(browser, { width: 1080, height: 1920, size: 64, baseline: 940 });
const endLine169 = await renderEndLine(browser, { width: 1920, height: 1080, size: 60, baseline: 700 });
await browser.close();
report.plaques = {
  '9x16': Object.fromEntries(Object.entries(plaques916).map(([k, v]) => [k, { text: CAPTIONS[k], size: v.size, lines: v.lines, measuredWidth: v.measuredWidth, height: v.height }])),
  '16x9': Object.fromEntries(Object.entries(plaques169).map(([k, v]) => [k, { text: CAPTIONS[k], size: v.size, lines: v.lines, measuredWidth: v.measuredWidth, height: v.height }])),
  endLineMeasured: { '9x16': endLine916.measured, '16x9': endLine169.measured },
};
if (want.includes('--overlays')) {
  // Review mode: write the plaques and both end cards to $TRAILER_WORK/review and stop.
  const dir = path.join(WORK, 'review'); await mkdir(dir, { recursive: true });
  for (const [k, v] of Object.entries(plaques916)) await writeFile(path.join(dir, `plaque916_${k}.png`), v.png);
  for (const [k, v] of Object.entries(plaques169)) await writeFile(path.join(dir, `plaque169_${k}.png`), v.png);
  await sharp(await endCard('916')).composite([{ input: endLine916.png }]).png().toFile(path.join(dir, 'end916.png'));
  await sharp(await endCard('169')).composite([{ input: endLine169.png }]).png().toFile(path.join(dir, 'end169.png'));
  console.log(JSON.stringify(report.plaques, null, 1));
  process.exit(0);
}
const fixed = {
  end916: await endCard('916'), end169: await endCard('169'), endLine916: endLine916.png, endLine169: endLine169.png,
  sky: { day: await sky169('sky_day', 0.88, SKY_BAND_169.sky_day), afternoon: await sky169('sky_afternoon', 0.88, SKY_BAND_169.sky_afternoon), dusk: await sky169('sky_dusk', 0.88, DUSK_BAND_169) },
};
const sprites = {};
for (const a of ['fox', 'sloth', 'owl']) sprites[a] = await sharp(A(`characters/${a}/idle.png`)).resize(420, 420, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
// The dialogue sheet's top edge (CSS) for the 16:9 sheet crop: the highest
// top it reaches inside the frames the shot uses (the sheet grows as the
// line types out), so the crop always holds the whole sheet.
const sheetTop = {};
for (const shot of shots.filter(s => s.layout169 === 'sheet')) {
  const [id, start] = shot.parts[0];
  const n = shot.to - shot.from + 1;
  const tops = Object.entries(clips[id].probes || {}).filter(([f]) => Number(f) >= start && Number(f) < start + n)
    .map(([, p]) => p?.sheet?.y).filter(v => typeof v === 'number' && v > 0 && v < 768);
  if (!tops.length) throw new Error(`${id}: no dialogue sheet in probes`);
  sheetTop[id] = Math.floor(Math.min(...tops));
}
report.sheetTopCss = sheetTop;
const shadowCache = new Map();
const ctx = {
  clips, shots, fixed, sprites, report, sheetTop,
  shadowFor: async (w, h, r) => { const k = `${w}x${h}`; if (!shadowCache.has(k)) shadowCache.set(k, await dropShadow(w, h, r)); return shadowCache.get(k); },
  lastDusk169: null,
  keep: { '916': [20, 60, 130, 200, 280, 360, 430, 500, 575, 645, 710, 790, 870], '169': [20, 60, 130, 200, 280, 360, 430, 500, 575, 645, 710, 790, 870] },
  kept: {},
};
let lastDusk = null;
ctx.lastDusk169 = async () => {
  if (!lastDusk) { const c169 = makeComposer('169', { ...ctx, plaques: plaques169 }); lastDusk = await sharp(await c169(827), { raw: { width: 1920, height: 1080, channels: 3 } }).png().toBuffer(); }
  return lastDusk;
};
const onlyFrames = want.find(a => a.startsWith('--frames='));
if (onlyFrames) {
  // Review mode: compose only these timeline frames of each cut into $TRAILER_WORK/review and stop.
  const dir = path.join(WORK, 'review'); await mkdir(dir, { recursive: true });
  const list = onlyFrames.slice(9).split(',').map(Number);
  for (const kind of doKinds) {
    const compose = makeComposer(kind, { ...ctx, plaques: kind === '916' ? plaques916 : plaques169 });
    const [w, h] = kind === '916' ? [1080, 1920] : [1920, 1080];
    for (const t of list) await sharp(await compose(t), { raw: { width: w, height: h, channels: 3 } }).png().toFile(path.join(dir, `${kind}_${String(t).padStart(3, '0')}.png`));
  }
  console.log(`wrote ${list.length * doKinds.length} review frames to ${dir}`);
  process.exit(0);
}
const mix = await buildAudio(clips, shots, report);
report.outputs = {};
for (const kind of doKinds) {
  const out = path.join(VIDEO, kind === '916' ? 'trailer-9x16-1080x1920.mp4' : 'trailer-16x9-1920x1080.mp4');
  const compose = makeComposer(kind, { ...ctx, plaques: kind === '916' ? plaques916 : plaques169 });
  await encode(kind, compose, mix, out, ctx);
  report.outputs[path.basename(out)] = { ...inspect(out), faststart: await isFaststart(out), bytes: (await readFile(out)).length };
}
// Stills: the YouTube thumbnail is composed (buildThumbnail); the poster is the 9:16 cut's frame 20.
report.thumbnail = await buildThumbnail();
if (ctx.kept['916:20']) {
  const { buf, w, h } = ctx.kept['916:20'];
  await sharp(buf, { raw: { width: w, height: h, channels: 3 } }).png().toFile(path.join(VIDEO, 'poster-9x16-1080x1920.png'));
}
// Review frames (not deliverables): the kept frames of each cut, for checking by eye.
const reviewDir = path.join(WORK, 'review');
await mkdir(reviewDir, { recursive: true });
for (const [k, { buf, w, h }] of Object.entries(ctx.kept)) await sharp(buf, { raw: { width: w, height: h, channels: 3 } }).png().toFile(path.join(reviewDir, `${k.replace(':', '_')}.png`));
await writeFile(path.join(VIDEO, 'captions-en.srt'), buildSrt(shots));
await writeFile(path.join(VIDEO, 'trailer-report.json'), JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify(report.outputs, null, 1));
console.log('audio', JSON.stringify(report.audio.final));
