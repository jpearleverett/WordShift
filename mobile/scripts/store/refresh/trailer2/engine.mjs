/**
 * Frame engine for trailer2: composes output frames from recorded clips (real
 * game renders), the game's own art and typeset captions, mixes the audio and
 * encodes. Everything here is post-production on real frames: crops, zooms,
 * speed changes, cuts and dissolves. Nothing is drawn into the game UI.
 *
 * A timeline is a list of shots over output frames [from, to] (inclusive).
 * Each shot is a stack of layers, bottom first:
 *   { kind: 'frame', clip, src, view, place, opacity, blur, brightness }
 *       clip:  recorded clip id (frames in $TRAILER2_WORK/clips/<clip>)
 *       src:   { start, rate } clip frame shown at the shot's first frame, and
 *              clip frames advanced per output frame (0 freezes, 0.5 on a 60 fps
 *              clip plays at quarter speed...). Or a function (t) => clip frame.
 *       view:  crop rectangle(s) in source pixels, [{ at: 0..1, x, y, w, h, ease }]
 *              interpolated over the shot (zoom interpolated in log space).
 *       place: where the crop lands in the output { x, y, w, h } (default: full frame, cover)
 *   { kind: 'image', png (Buffer) or file, place, opacity }
 *   { kind: 'fn', render(t, k) -> { raw, left, top, w, h } or null, opacity }
 *   { kind: 'fill', color }
 * Shot options: dissolveIn (frames): the first n frames blend over the
 * previous shot, which keeps playing past its end.
 * Captions: { png, left, top, from, to, fadeIn, fadeOut } composited last.
 */
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { WORK, mobile, FPS, HANDLE } from './capture.mjs';

const require = createRequire(import.meta.url);
export const sharp = require('sharp');
const { chromium } = require('@playwright/test');
export const FFMPEG = process.env.FFMPEG || '/usr/local/bin/ffmpeg';
const CHROMIUM = process.env.WORDSHIFT_CHROMIUM || '/opt/pw-browsers/chromium';
export const A = rel => path.join(mobile, 'assets', rel);

// ---------------------------------------------------------------- clips

const clipMeta = new Map();
export async function loadClip(id) {
  if (clipMeta.has(id)) return clipMeta.get(id);
  const ev = JSON.parse(await readFile(path.join(WORK, 'events', `${id}.json`), 'utf8'));
  const meta = { id, dir: path.join(WORK, 'clips', id), frames: ev.frames, w: ev.frameSize.width, h: ev.frameSize.height, fps: ev.fps ?? FPS, ext: ev.ext ?? 'png', events: ev.events, ev };
  clipMeta.set(id, meta);
  return meta;
}
/** File for clip frame f (f is the clip's own frame number; the handle is added and clamped). */
export function clipFile(meta, f) {
  const i = Math.max(0, Math.min(meta.frames - 1, Math.round(f) + HANDLE));
  return path.join(meta.dir, `f${String(i).padStart(5, '0')}.${meta.ext}`);
}

// Decoded source frames, small LRU (a frame is often used by two layers).
const decoded = new Map();
async function decode(file) {
  if (decoded.has(file)) { const v = decoded.get(file); decoded.delete(file); decoded.set(file, v); return v; }
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const v = { data, info };
  decoded.set(file, v);
  while (decoded.size > 6) decoded.delete(decoded.keys().next().value);
  return v;
}

// ---------------------------------------------------------------- geometry

const EASE = {
  linear: k => k,
  in: k => k * k * k,
  out: k => 1 - (1 - k) ** 3,
  inOut: k => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
  sine: k => 0.5 - Math.cos(Math.PI * k) / 2,
};
/** Interpolated crop rectangle at progress k (0..1) over keyframes; size in log space so zooms feel even. */
export function viewAt(view, k) {
  const keys = Array.isArray(view) ? view : [{ at: 0, ...view }];
  if (keys.length === 1 || k <= keys[0].at) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (k <= b.at) {
      const u = (EASE[b.ease ?? 'inOut'])((k - a.at) / Math.max(1e-9, b.at - a.at));
      const w = Math.exp(Math.log(a.w) + (Math.log(b.w) - Math.log(a.w)) * u);
      const h = Math.exp(Math.log(a.h) + (Math.log(b.h) - Math.log(a.h)) * u);
      // centre interpolates linearly
      const cx = a.x + a.w / 2 + (b.x + b.w / 2 - (a.x + a.w / 2)) * u;
      const cy = a.y + a.h / 2 + (b.y + b.h / 2 - (a.y + a.h / 2)) * u;
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    }
  }
  return keys[keys.length - 1];
}

/**
 * The crop of a decoded frame, scaled to out (ow x oh), RGB raw. The source is
 * scaled first and then cut at whole output pixels, so a slow pan or zoom
 * moves by at most half an output pixel of rounding (no crawl).
 */
async function cropScaled(src, rect, ow, oh) {
  const { data, info } = src;
  const s = ow / rect.w;
  const sw = Math.max(ow, Math.round(info.width * s)), sh = Math.max(oh, Math.round(info.height * s));
  let left = Math.round(rect.x * s), top = Math.round(rect.y * s);
  // Keep inside the scaled source; a crop that runs off the frame is a bug in the timeline.
  left = Math.max(0, Math.min(sw - ow, left)); top = Math.max(0, Math.min(sh - oh, top));
  // Resize only the region we need (plus a margin) for speed.
  const mx = Math.max(0, Math.floor(left / s) - 2), my = Math.max(0, Math.floor(top / s) - 2);
  const mw = Math.min(info.width - mx, Math.ceil(ow / s) + 6), mh = Math.min(info.height - my, Math.ceil(oh / s) + 6);
  const rw = Math.round(mw * s), rh = Math.round(mh * s);
  const buf = await sharp(data, { raw: info }).extract({ left: mx, top: my, width: mw, height: mh })
    .resize(rw, rh, { kernel: s < 1 ? 'lanczos3' : 'mitchell' }).raw().toBuffer();
  const ex = Math.max(0, Math.min(rw - ow, left - Math.round(mx * s))), ey = Math.max(0, Math.min(rh - oh, top - Math.round(my * s)));
  return sharp(buf, { raw: { width: rw, height: rh, channels: 3 } }).extract({ left: ex, top: ey, width: ow, height: oh }).raw().toBuffer();
}

// ---------------------------------------------------------------- layers

function lerpKeys(keys, k, fallback) {
  if (keys === undefined) return fallback;
  if (typeof keys === 'number') return keys;
  if (typeof keys === 'function') return keys(k);
  const ks = keys;
  if (k <= ks[0].at) return ks[0].v;
  for (let i = 1; i < ks.length; i++) if (k <= ks[i].at) {
    const u = (EASE[ks[i].ease ?? 'linear'])((k - ks[i - 1].at) / Math.max(1e-9, ks[i].at - ks[i - 1].at));
    return ks[i - 1].v + (ks[i].v - ks[i - 1].v) * u;
  }
  return ks[ks.length - 1].v;
}

/** Renders one layer at output frame t within shot, returns { raw, left, top, w, h, opacity } or null. */
async function renderLayer(layer, shot, t, W, H) {
  const span = Math.max(1, shot.to - shot.from);
  const k = Math.max(0, Math.min(1, (t - shot.from) / span));
  const opacity = lerpKeys(layer.opacity, k, 1);
  if (opacity <= 0.001) return null;
  const place0 = typeof layer.place === 'function' ? layer.place(k, t) : (layer.place ?? { x: 0, y: 0, w: W, h: H });
  const place = { x: Math.round(place0.x), y: Math.round(place0.y), w: Math.round(place0.w), h: Math.round(place0.h) };
  if (layer.kind === 'fill') {
    const [r, g, b] = hex(layer.color);
    const raw = Buffer.alloc(place.w * place.h * 3);
    for (let i = 0; i < raw.length; i += 3) { raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; }
    return { raw, left: place.x, top: place.y, w: place.w, h: place.h, opacity };
  }
  if (layer.kind === 'fn') {
    // A layer the caller renders itself: returns { raw, left, top, w, h } (RGB).
    const r = await layer.render(t, k);
    return r ? { ...r, opacity } : null;
  }
  if (layer.kind === 'image') {
    const key = layer._key ??= Symbol('img');
    layer._cache ??= await sharp(layer.png ?? layer.file).resize(place.w, place.h, { fit: layer.fit ?? 'fill' }).ensureAlpha().raw().toBuffer();
    return { rgba: layer._cache, left: place.x, top: place.y, w: place.w, h: place.h, opacity, key };
  }
  // frame layer
  const meta = await loadClip(layer.clip);
  const src = layer.src ?? { start: 0, rate: 1 };
  const cf = typeof src === 'function' ? src(t - shot.from, t) : src.start + (t - shot.from) * (src.rate ?? 1);
  const file = clipFile(meta, cf);
  const decodedFrame = await decode(file);
  const view = typeof layer.view === 'function' ? layer.view(t - shot.from, t) : viewAt(layer.view ?? { x: 0, y: 0, w: meta.w, h: meta.h }, lerpKeys(layer.viewProgress, k, k));
  // Fit the view's aspect to the place's aspect (cover): widen or heighten around the centre.
  let rect = { ...view };
  const pa = place.w / place.h, va = rect.w / rect.h;
  if (Math.abs(pa - va) > 1e-3) {
    if (va > pa) { const nw = rect.h * pa; rect.x += (rect.w - nw) / 2; rect.w = nw; }
    else { const nh = rect.w / pa; rect.y += (rect.h - nh) / 2; rect.h = nh; }
  }
  const blur = lerpKeys(layer.blur, k, 0), bright = lerpKeys(layer.brightness, k, 1);
  if (blur > 0 || bright !== 1) {
    // Cheap path for backgrounds: downscale, blur, upscale.
    const small = await cropScaled(decodedFrame, rect, Math.round(place.w / 4), Math.round(place.h / 4));
    let img = sharp(small, { raw: { width: Math.round(place.w / 4), height: Math.round(place.h / 4), channels: 3 } });
    if (blur > 0) img = img.blur(Math.max(0.3, blur / 4));
    if (bright !== 1) img = img.modulate({ brightness: bright });
    const raw = await sharp(await img.raw().toBuffer(), { raw: { width: Math.round(place.w / 4), height: Math.round(place.h / 4), channels: 3 } })
      .resize(place.w, place.h, { kernel: 'cubic' }).raw().toBuffer();
    return { raw, left: place.x, top: place.y, w: place.w, h: place.h, opacity };
  }
  const raw = await cropScaled(decodedFrame, rect, place.w, place.h);
  return { raw, left: place.x, top: place.y, w: place.w, h: place.h, opacity, mask: layer.mask };
}

function hex(c) { const n = parseInt(c.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

/** Alpha-composites a rendered layer into the RGB canvas in place. */
function blit(canvas, W, H, L) {
  const { left, top, w, h, opacity } = L;
  for (let y = 0; y < h; y++) {
    const cy = top + y; if (cy < 0 || cy >= H) continue;
    for (let x = 0; x < w; x++) {
      const cx = left + x; if (cx < 0 || cx >= W) continue;
      const o = (cy * W + cx) * 3;
      let a = opacity, r, g, b;
      if (L.rgba) { const i = (y * w + x) * 4; r = L.rgba[i]; g = L.rgba[i + 1]; b = L.rgba[i + 2]; a *= L.rgba[i + 3] / 255; }
      else { const i = (y * w + x) * 3; r = L.raw[i]; g = L.raw[i + 1]; b = L.raw[i + 2]; }
      if (L.maskAlpha) a *= L.maskAlpha[y * w + x] / 255;
      if (a >= 0.999) { canvas[o] = r; canvas[o + 1] = g; canvas[o + 2] = b; }
      else if (a > 0.001) { canvas[o] += (r - canvas[o]) * a; canvas[o + 1] += (g - canvas[o + 1]) * a; canvas[o + 2] += (b - canvas[o + 2]) * a; }
    }
  }
}

const maskCache = new Map();
/** Rounded-rect alpha mask (w x h, radius r) as one byte per pixel. */
async function roundedMask(w, h, r) {
  const key = `${w}x${h}r${r}`;
  if (maskCache.has(key)) return maskCache.get(key);
  const svg = Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);
  const m = await sharp(svg).extractChannel(3).raw().toBuffer();
  maskCache.set(key, m);
  return m;
}

/** Renders the shot's layer stack at output frame t into a fresh canvas. */
async function renderShot(shot, t, W, H) {
  const canvas = Buffer.alloc(W * H * 3);
  for (const layer of shot.layers) {
    const L = await renderLayer(layer, shot, t, W, H);
    if (!L) continue;
    if (layer.outline) {
      const o = layer.outline;
      const key = `sh:${L.w}x${L.h}:${o.px}:${o.shadowPx}`;
      let sh = maskCache.get(key);
      if (!sh) {
        const pad = o.shadowPx * 3;
        const svg = Buffer.from(`<svg width="${L.w + 2 * pad}" height="${L.h + 2 * pad}" xmlns="http://www.w3.org/2000/svg"><rect x="${pad}" y="${pad + Math.round(o.shadowPx / 2)}" width="${L.w}" height="${L.h}" fill="${o.shadowColor ?? '#1A0F08'}" fill-opacity="${o.shadowOpacity ?? 0.45}"/></svg>`);
        const rgba = await sharp(svg).blur(o.shadowPx / 2).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        sh = { rgba: rgba.data, w: rgba.info.width, h: rgba.info.height, pad };
        maskCache.set(key, sh);
      }
      blit(canvas, W, H, { rgba: sh.rgba, left: L.left - sh.pad, top: L.top - sh.pad, w: sh.w, h: sh.h, opacity: L.opacity });
      const [r, g, b] = hex(o.color ?? '#3B2416');
      const ow = L.w + 2 * o.px, oh = L.h + 2 * o.px;
      const raw = Buffer.alloc(ow * oh * 3);
      for (let i = 0; i < raw.length; i += 3) { raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; }
      blit(canvas, W, H, { raw, left: L.left - o.px, top: L.top - o.px, w: ow, h: oh, opacity: L.opacity });
    }
    if (L.mask) L.maskAlpha = await roundedMask(L.w, L.h, L.mask.radius);
    blit(canvas, W, H, L);
  }
  return canvas;
}

/** Scale the composed shot about a point: zoom { from, to, s0, s1, cx, cy, ease } over output frames. */
async function postZoom(canvas, W, H, z, t) {
  const u = Math.max(0, Math.min(1, (t - z.from) / Math.max(1, z.to - z.from)));
  const sc = z.s0 + (z.s1 - z.s0) * (EASE[z.ease ?? 'inOut'])(u);
  if (sc <= 1.0005) return canvas;
  const w = W / sc, h = H / sc;
  const x = Math.max(0, Math.min(W - w, z.cx - (z.cx) / sc)), y = Math.max(0, Math.min(H - h, z.cy - (z.cy) / sc));
  return cropScaled({ data: canvas, info: { width: W, height: H, channels: 3 } }, { x, y, w, h }, W, H);
}

/** Composes output frame t of a cut. */
export function makeComposer(cut) {
  const { W, H, shots, captions = [] } = cut;
  return async t => {
    const i = shots.findIndex(s => t >= s.from && t <= s.to);
    if (i < 0) throw new Error(`no shot covers frame ${t}`);
    const shot = shots[i];
    let canvas = await renderShot(shot, t, W, H);
    if (shot.postZoom) canvas = await postZoom(canvas, W, H, shot.postZoom, t);
    const d = shot.dissolveIn ?? 0;
    if (d > 0 && i > 0 && t - shot.from < d) {
      // The previous shot keeps playing under the dissolve.
      const prev = await renderShot(shots[i - 1], t, W, H);
      const a = EASE.sine((t - shot.from + 1) / (d + 1));
      for (let p = 0; p < canvas.length; p++) canvas[p] = prev[p] + (canvas[p] - prev[p]) * a;
    }
    for (const c of captions) {
      if (t < c.from || t > c.to) continue;
      let op = 1;
      if (c.fadeIn && t < c.from + c.fadeIn) op = (t - c.from + 1) / (c.fadeIn + 1);
      if (c.fadeOut && t > c.to - c.fadeOut) op = Math.min(op, (c.to - t + 1) / (c.fadeOut + 1));
      c._rgba ??= await sharp(c.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let top = c.top;
      if (c.rise && t < c.from + c.rise.frames) top += Math.round(c.rise.px * (1 - EASE.out((t - c.from) / c.rise.frames)));
      blit(canvas, W, H, { rgba: c._rgba.data, left: c.left, top, w: c._rgba.info.width, h: c._rgba.info.height, opacity: op });
    }
    return canvas;
  };
}

// ---------------------------------------------------------------- typesetting (Chromium, the game's own fonts)

const fontFace = (family, file) => `@font-face { font-family: '${family}'; src: url(data:font/ttf;base64,${readFileSync(A('fonts/' + file)).toString('base64')}) format('truetype'); }`;
let _browser = null;
export async function browser() {
  _browser ??= await chromium.launch({ executablePath: CHROMIUM, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  return _browser;
}
export async function closeBrowser() { if (_browser) await _browser.close(); _browser = null; }

/** Renders arbitrary HTML (with the game's fonts available) to a transparent PNG of its #root box. */
export async function renderHtml(html, css = '', { width = 1200, height = 1200 } = {}) {
  const b = await browser();
  const page = await b.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(`<style>
    ${fontFace('Figtree-Bold', 'Figtree-Bold.ttf')}
    ${fontFace('Figtree', 'Figtree-Regular.ttf')}
    ${fontFace('EpundaSlab', 'EpundaSlab-Regular.ttf')}
    ${fontFace('EpundaSlab-Bold', 'EpundaSlab-Bold.ttf')}
    ${fontFace('EpundaSlab-Italic', 'EpundaSlab-Italic.ttf')}
    html, body { margin: 0; background: transparent; }
    #root { position: absolute; left: 0; top: 0; display: inline-block; }
    ${css}</style><div id="root">${html}</div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  const box = await page.locator('#root').boundingBox();
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: Math.ceil(box.width), height: Math.ceil(box.height) } });
  await page.close();
  return { png, width: Math.ceil(box.width), height: Math.ceil(box.height) };
}

// ---------------------------------------------------------------- audio

export function ff(args) {
  try { return execFileSync(FFMPEG, ['-hide_banner', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }).toString() + ''; }
  catch (e) { const err = e.stderr?.toString() ?? ''; if (e.status === 0) return err; throw new Error(`ffmpeg failed: ${err.slice(-2000)}`); }
}
function ffErr(args) {
  // ffmpeg prints its analysis on stderr; capture it on success too.
  const r = require('node:child_process').spawnSync(FFMPEG, ['-hide_banner', '-y', ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr.slice(-2000)}`);
  return r.stderr;
}
export function loudness(file, ss = 0, t = null) {
  const out = ffErr(['-ss', String(ss), ...(t ? ['-t', String(t)] : []), '-i', file, '-af', 'ebur128', '-f', 'null', '-']);
  const m = out.match(/Integrated loudness:\s+I:\s+(-?[\d.]+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Mixes beds and sound effects to a normalized WAV.
 * beds: [{ file, ss, at, dur, fadeIn: [st, d], fadeOut: [st, d], lufs? (target for the segment), gainDb? }]
 * sfx:  [{ file, at (s), gainDb?, trim? (s) }]
 */
export function mixAudio({ beds, sfx, duration, out, targetBedLufs = -20 }) {
  const inputs = [], chains = [], labels = [];
  const report = { beds: [], sfx: [] };
  beds.forEach((b, i) => {
    const seg = loudness(b.file, b.ss, b.dur);
    const gain = b.gainDb ?? (seg === null ? -6 : Math.max(-24, Math.min(8, (b.lufs ?? targetBedLufs) - seg)));
    report.beds.push({ file: path.relative(mobile, b.file), startInFile: b.ss, at: b.at, duration: b.dur, segmentLufs: seg, gainDb: Number(gain.toFixed(2)) });
    inputs.push('-ss', String(b.ss), '-t', String(b.dur), '-i', b.file);
    const fades = [
      b.fadeIn ? `afade=t=in:st=${b.fadeIn[0]}:d=${b.fadeIn[1]}` : null,
      b.fadeOut ? `afade=t=out:st=${b.fadeOut[0].toFixed(3)}:d=${b.fadeOut[1]}` : null,
    ].filter(Boolean).join(',');
    const ms = Math.round(b.at * 1000);
    chains.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${gain.toFixed(2)}dB${b.filter ? ',' + b.filter : ''}${fades ? ',' + fades : ''},adelay=${ms}|${ms},apad=whole_dur=${duration}[m${i}]`);
    labels.push(`[m${i}]`);
  });
  sfx.forEach((e, k) => {
    const i = beds.length + k;
    inputs.push('-i', e.file);
    const ms = Math.round(e.at * 1000);
    const trim = e.trim ? `,atrim=0:${e.trim.toFixed(3)},afade=t=out:st=${Math.max(0, e.trim - 0.25).toFixed(3)}:d=0.25` : '';
    chains.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${(e.gainDb ?? 0)}dB${trim},adelay=${ms}|${ms},apad=whole_dur=${duration}[s${k}]`);
    labels.push(`[s${k}]`);
    report.sfx.push({ file: path.relative(mobile, e.file), at: Number(e.at.toFixed(3)), gainDb: e.gainDb ?? 0, trim: e.trim ?? null, why: e.why });
  });
  chains.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=0:${duration}[mix]`);
  const raw = path.join(WORK, 'mix-raw.wav');
  ffErr([...inputs, '-filter_complex', chains.join(';'), '-map', '[mix]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', raw]);
  // Peaks held first so the two-pass loudnorm can stay linear (as the first trailer).
  const i0 = loudness(raw);
  const gain = -14 - i0;
  const ceiling = Math.min(1, 10 ** ((-1.5 - gain) / 20));
  const limited = path.join(WORK, 'mix-limited.wav');
  ffErr(['-i', raw, '-af', `alimiter=limit=${ceiling.toFixed(4)}:attack=2:release=60:level=disabled`, '-ar', '48000', '-c:a', 'pcm_s24le', limited]);
  const pass1 = ffErr(['-i', limited, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-']);
  const j = JSON.parse(pass1.slice(pass1.lastIndexOf('{'), pass1.lastIndexOf('}') + 1));
  const pass2 = ffErr(['-i', limited, '-af', `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true:print_format=summary,aresample=48000`,
    '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', out]);
  const check = ffErr(['-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  report.rawIntegrated = i0;
  report.loudnormType = pass2.match(/Normalization Type:\s+(\w+)/)?.[1] ?? null;
  report.final = {
    integrated: Number(check.match(/Integrated loudness:\s+I:\s+(-?[\d.]+)/)?.[1]),
    truePeak: Number(check.match(/True peak:\s+Peak:\s+(-?[\d.]+)/)?.[1]),
    lra: Number(check.match(/Loudness range:\s+LRA:\s+(-?[\d.]+)/)?.[1]),
  };
  return report;
}

// ---------------------------------------------------------------- encode

export async function encode({ W, H, frames, compose, audio, out, keep = [], onKeep = null }) {
  const dur = (frames / FPS).toFixed(3);
  const args = ['-hide_banner', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-', ...(audio ? ['-i', audio] : []),
    '-map', '0:v', ...(audio ? ['-map', '1:a'] : []), '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-maxrate', '16M', '-bufsize', '32M', ...(audio ? ['-c:a', 'aac', '-b:a', '384k', '-ar', '48000', '-ac', '2'] : []), '-movflags', '+faststart', '-t', dur, out];
  const p = spawn(FFMPEG, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', d => { err += d; });
  const done = new Promise((resolve, reject) => p.on('close', code => (code === 0 ? resolve() : reject(new Error(`encode failed:\n${err.slice(-3000)}`)))));
  const t0 = Date.now();
  for (let t = 0; t < frames; t++) {
    const buf = await compose(t);
    if (buf.length !== W * H * 3) throw new Error(`frame ${t}: ${buf.length} bytes`);
    if (keep.includes(t) && onKeep) await onKeep(t, buf);
    if (!p.stdin.write(buf)) await new Promise(r => p.stdin.once('drain', r));
    if (t % 150 === 0) console.log(`${path.basename(out)}: frame ${t} (${Math.round((Date.now() - t0) / 1000)} s)`);
  }
  p.stdin.end();
  await done;
  console.log(`${path.basename(out)}: encoded in ${Math.round((Date.now() - t0) / 1000)} s`);
}

export async function writePng(buf, W, H, file) {
  await mkdir(path.dirname(file), { recursive: true });
  await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png().toFile(file);
}

export function inspect(file) {
  const r = require('node:child_process').spawnSync(FFMPEG, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const txt = r.stderr;
  return {
    duration: txt.match(/Duration: ([\d:.]+)/)?.[1],
    video: txt.match(/Video: ([^\n]+)/)?.[1]?.trim(),
    audio: txt.match(/Audio: ([^\n]+)/)?.[1]?.trim(),
  };
}
export { existsSync, writeFile, mkdir };
