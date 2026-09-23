#!/usr/bin/env node
/**
 * Store images for the refresh-2026-09 Google Play listing.
 *
 * Builds, from the genuine captures in raw/ (made by captureRefresh.mjs) and the
 * copy in copy/listing-en-US.json, everything brief.md sections 3, 4, 5 and 8 ask
 * of the image step:
 *
 *   upload/phone/01-..08-*.png            1080x1920 RGB, caption band + seam + real UI
 *   upload/tablet/t1-..t4-*.png           1440x2560 RGB, full-frame captures, no added text
 *   upload/feature-graphic.png            1024x500 RGB, FG-A (main listing)
 *   upload/experiments/feature-graphic-b.png  1024x500 RGB, FG-B (experiment only)
 *   upload/store-icon-512.png             the live store icon, copied byte for byte
 *   raw/fg-a-360.png                      FG-A at 360 px wide, for the legibility review
 *   manifest.json, alt-text.tsv, contact-sheet.png, preview.html
 *
 * Run from mobile/:
 *
 *   node scripts/store/buildRefresh.mjs              # everything
 *   node scripts/store/buildRefresh.mjs phone tablet  # only some targets
 *
 * Targets: phone, tablet, feature, icon. The review files (manifest, alt text,
 * contact sheet, preview) are always rebuilt from what is on disk, so a partial
 * run never leaves them stale. brief.md names scripts/store/refresh/buildStills.mjs
 * and buildFeature.mjs; both forward here.
 *
 * How the pixels are made:
 *   - Text is typeset by Chromium (Playwright) from HTML in source/layouts/, with the
 *     game's own fonts (Figtree-Bold, EpundaSlab-Bold) loaded from assets/fonts.
 *   - Everything else is composited by sharp. A capture window that is already
 *     1080x1560 (slots 02-06) is placed with no resampling, and the build proves it
 *     by comparing the output pixels with the raw file. Slot 01 and the story cards
 *     (07, 08) are the only captures that are scaled, with lanczos3.
 *   - Nothing inside a capture is edited. Promotional pieces around it (the band,
 *     the seam, the backdrop, the arrow and the card shadow) are added outside it.
 *     The two story cards are lifted off the dimmed scene around their pixel-art
 *     frame with a flood fill that stops at the frame's own outline, so only the
 *     scene pixels in the frame's stepped corners are dropped; the build checks that
 *     nothing inside the frame was touched.
 *
 * It never starts a dev server, never writes outside assets/Play_store/refresh-2026-09,
 * and never touches launch-2026-09 or docs/.
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { Buffer } from 'node:buffer';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROOT = path.join(MOBILE, 'assets/Play_store/refresh-2026-09');
const RAW = path.join(ROOT, 'raw');
const UPLOAD = path.join(ROOT, 'upload');
const LAYOUTS = path.join(ROOT, 'source/layouts');
const PARTS = path.join(LAYOUTS, 'parts');
const FONTS = path.join(MOBILE, 'assets/fonts');
const LIVE_ICON = path.join(MOBILE, 'assets/Play_store/launch-2026-09/upload/store-icon-512.png');
const CHROMIUM = process.env.WORDSHIFT_CHROMIUM || '/opt/pw-browsers/chromium';

const ALL_TARGETS = ['phone', 'tablet', 'feature', 'icon'];
const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
for (const t of requested) if (!ALL_TARGETS.includes(t)) throw new Error(`Unknown target "${t}". Use: ${ALL_TARGETS.join(', ')}`);
const targets = new Set(requested.length ? requested : ALL_TARGETS);

const listing = JSON.parse(await fs.readFile(path.join(ROOT, 'copy/listing-en-US.json'), 'utf8'));
const provenance = JSON.parse(await fs.readFile(path.join(RAW, 'provenance.json'), 'utf8'));

// ---------------------------------------------------------------------------
// Brief section 3: the shared phone template.
// ---------------------------------------------------------------------------
const PHONE = { width: 1080, height: 1920, band: 348, seam: 12, captureTop: 360, captureHeight: 1560 };
const INK = '#3B2416';
const WOOD = '#6B4A2E';
const CREAM = '#FFF6E0';
/** Band palettes (brief section 3). `light` is the band's lightest colour, used for the contrast guard. */
const BANDS = {
  day: { fill: 'linear-gradient(180deg,#1B55A0 0%,#2467BD 100%)', light: '#2467BD', headline: CREAM, support: CREAM, shadow: true, minContrast: 5.2 },
  dusk: { fill: 'linear-gradient(180deg,#684381 0%,#4A2F5E 100%)', light: '#684381', headline: CREAM, support: CREAM, shadow: true, minContrast: 7.2 },
  parchment: { fill: '#F3E2BF', light: '#F3E2BF', headline: INK, support: WOOD, shadow: false, minContrast: 6.2 },
};

/** The raw capture each slot is built from, and how (brief section 3). */
const SLOT_SOURCES = {
  1: { kind: 'stack', raws: ['s01-frame-a-letter-lifted.png', 's01-frame-b-after-move.png'] },
  2: { kind: 'window', raws: ['s02-day-house.png'] },
  3: { kind: 'window', raws: ['s03-dusk-house.png'] },
  4: { kind: 'window', raws: ['s04-panko-dialogue.png'] },
  5: { kind: 'window', raws: ['s05-stacked-modes.png'] },
  6: { kind: 'window', raws: ['s06-pit.png'] },
  7: { kind: 'story', raws: ['s07-cup-choice.png'], backdrop: 'assets/story/pages/cup-03.webp' },
  // Slot 08's card has three stacked buttons under a small picture, so the
  // page's own painting is shown large above it (see captureStory, `hero`).
  8: { kind: 'story', raws: ['s08-supper-02.png'], backdrop: 'assets/story/pages/supper-02.webp', hero: { cardTop: 440, bottom: 26 } },
};

/**
 * Tablet set (brief section 4), all genuine 720x1280 frames at DPR 2, in upload
 * order. The board leads: the game's tablet enlargement no longer pushes the
 * row cards off the screen (getBoardScaleWrapperStyle), so raw/t2-board.png is
 * an honest tablet board shot again. The day house, the cup page and the pit
 * follow; the dusk well frame stays in raw/ but is not uploaded, since the
 * phone set already carries the dusk house (slot 03).
 */
const TABLETS = [
  { id: 'T1', slug: 't1-board', raw: 't2-board.png' },
  { id: 'T2', slug: 't2-house', raw: 't1-house.png' },
  { id: 'T3', slug: 't3-cup', raw: 't3-cup.png' },
  { id: 'T4', slug: 't4-pit', raw: 't2-pit.png' },
];

// ---------------------------------------------------------------------------
// Small helpers.
// ---------------------------------------------------------------------------
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const rel = (from, to) => path.relative(from, to).split(path.sep).join('/');
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const pad2 = (n) => String(n).padStart(2, '0');
const log = (...a) => console.log(...a);

function hexToRgb(hex) {
  const v = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
}
function relLum([r, g, b]) {
  const f = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [x, y] = [relLum(hexToRgb(a)), relLum(hexToRgb(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function assertAsciiCopy(where, text) {
  if (/[^\x20-\x7E]/.test(text)) throw new Error(`${where}: non-ASCII character in "${text}"`);
  if (/\.\.\.|--/.test(text)) throw new Error(`${where}: "..." or "--" in "${text}"`);
}

function captureEntry(file) {
  const entry = provenance.captures.find((c) => c.file === file);
  if (!entry) throw new Error(`raw/provenance.json has no entry for ${file}`);
  return entry;
}
/** Reads a raw capture and proves it is the file provenance.json describes. */
async function readCapture(file) {
  const entry = captureEntry(file);
  const buffer = await fs.readFile(path.join(RAW, file));
  if (sha256(buffer) !== entry.sha256) throw new Error(`${file} does not match its SHA-256 in raw/provenance.json; re-run the capture step`);
  const meta = await sharp(buffer).metadata();
  if (meta.width !== entry.pixelSize.width || meta.height !== entry.pixelSize.height) throw new Error(`${file}: unexpected size`);
  return { entry, buffer };
}
const windowRect = (entry) => ({ left: entry.window.px.left, top: entry.window.px.top, width: entry.window.px.width, height: entry.window.px.height });

async function rgbRaw(input) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}
function pixelDiff(a, b) {
  if (a.width !== b.width || a.height !== b.height) return { max: Infinity, mean: Infinity };
  let max = 0; let sum = 0;
  for (let i = 0; i < a.data.length; i += 1) { const d = Math.abs(a.data[i] - b.data[i]); sum += d; if (d > max) max = d; }
  return { max, mean: sum / a.data.length };
}
/** Mean luma (Rec. 601 on 8-bit sRGB), the measure the brief's 90.6 for FG-A was taken with. */
async function meanLuma(input) {
  const { data } = await rgbRaw(input);
  let s = 0; for (let i = 0; i < data.length; i += 3) s += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  return s / (data.length / 3);
}
async function writePng(file, pipeline, { width, height, alpha = false, maxBytes = 8 * 1024 * 1024 }) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const encoded = alpha ? pipeline.ensureAlpha() : pipeline.removeAlpha();
  await encoded.toColourspace('srgb').png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(file);
  const meta = await sharp(file).metadata();
  const bytes = (await fs.stat(file)).size;
  const channels = alpha ? 4 : 3;
  if (meta.width !== width || meta.height !== height || meta.channels !== channels) throw new Error(`${rel(ROOT, file)} is ${meta.width}x${meta.height}x${meta.channels}, expected ${width}x${height}x${channels}`);
  if (bytes > maxBytes) throw new Error(`${rel(ROOT, file)} is ${bytes} bytes, over ${maxBytes}`);
  return { bytes, sha256: sha256(await fs.readFile(file)) };
}

const fontFaces = (fromDir) => ['Figtree-Bold', 'EpundaSlab-Bold', 'EpundaSlab-Italic', 'Figtree-Regular'].map((f) => {
  const family = f.startsWith('Figtree') ? 'WS Figtree' : 'WS Epunda';
  const weight = f.endsWith('Bold') ? 700 : 400;
  const style = f.endsWith('Italic') ? 'italic' : 'normal';
  return `@font-face{font-family:'${family}';src:url('${rel(fromDir, path.join(FONTS, `${f}.ttf`))}') format('truetype');font-weight:${weight};font-style:${style};font-display:block}`;
}).join('');
const page = (title, css, body) => `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${fontFaces(LAYOUTS)}*{box-sizing:border-box}html,body{margin:0;padding:0}body{position:relative;overflow:hidden}${css}</style></head><body>${body}</body></html>\n`;

let browser;
async function openLayout(name, html, width, height) {
  const file = path.join(LAYOUTS, `${name}.html`);
  await fs.mkdir(LAYOUTS, { recursive: true });
  await fs.writeFile(file, html);
  const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await tab.goto(pathToFileURL(file).href);
  await tab.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode()));
  });
  const fontProblems = await tab.evaluate(() => [...document.fonts].filter((f) => f.status !== 'loaded' && f.status !== 'unloaded').map((f) => `${f.family} ${f.weight} ${f.status}`));
  if (fontProblems.length) throw new Error(`${name}: font(s) failed to load: ${fontProblems.join(', ')}`);
  return { tab, file };
}
/** Clipped-text guard: every [data-fit] must fit its own box, and must use a loaded game font. */
async function guardText(tab, name) {
  const problems = await tab.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('[data-fit]')) {
      if (el.scrollWidth > el.clientWidth + 0.5 || el.scrollHeight > el.clientHeight + 0.5) out.push(`clipped: "${el.textContent}"`);
      const cs = getComputedStyle(el);
      const probe = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      if (!document.fonts.check(probe, el.textContent)) out.push(`font not ready for "${el.textContent}" (${probe})`);
    }
    return out;
  });
  if (problems.length) throw new Error(`${name}: ${problems.join('; ')}`);
}
async function shot(tab, clip) {
  return tab.screenshot({ type: 'png', animations: 'disabled', clip });
}

// ---------------------------------------------------------------------------
// Caption band (typeset) and seam.
// ---------------------------------------------------------------------------
function bandHtml(slot) {
  const p = BANDS[slot.band];
  const shadowH = p.shadow ? `text-shadow:4px 4px 0 ${INK};` : '';
  const shadowS = p.shadow ? `text-shadow:3px 3px 0 ${INK};` : '';
  const css = `body{width:${PHONE.width}px;height:${PHONE.captureTop}px}
.band{position:absolute;left:0;top:0;width:${PHONE.width}px;height:${PHONE.band}px;background:${p.fill};display:flex;align-items:center;justify-content:center}
.block{transform:translateY(var(--dy,0px));display:flex;flex-direction:column;align-items:center}
.seam{position:absolute;left:0;top:${PHONE.band}px;width:${PHONE.width}px;height:${PHONE.seam}px;background:linear-gradient(180deg,${INK} 0 3px,${WOOD} 3px 9px,${INK} 9px 12px)}
h1{margin:0;font:700 96px/104px 'WS Figtree';color:${p.headline};text-align:center;${shadowH}}
p{margin:18px 0 0;font:700 60px/70px 'WS Epunda';color:${p.support};text-align:center;${shadowS}}
.line{display:block;width:max-content;max-width:966px;margin:0 auto;white-space:nowrap;overflow:hidden;padding:0 6px 6px 0}
.ghost .block{visibility:hidden}`;
  const lines = slot.headline_lines || [slot.headline];
  const body = `<div class="band"><div class="block"><h1>${lines.map((l) => `<span class="line" data-fit>${esc(l)}</span>`).join('')}</h1>${slot.subtitle ? `<p><span class="line" data-fit>${esc(slot.subtitle)}</span></p>` : ''}</div></div><div class="seam"></div>`;
  return page(`WordShift store band ${pad2(slot.order)}`, css, body);
}

/** Bounding box of pixels that differ between two renders of the same page. */
function inkBox(a, b) {
  let top = Infinity; let bottom = -1; let left = Infinity; let right = -1;
  for (let y = 0; y < a.height; y += 1) {
    for (let x = 0; x < a.width; x += 1) {
      const i = (y * a.width + x) * 3;
      if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 36) {
        if (y < top) top = y; if (y > bottom) bottom = y; if (x < left) left = x; if (x > right) right = x;
      }
    }
  }
  return { top, bottom, left, right };
}

async function renderBand(slot) {
  const p = BANDS[slot.band];
  for (const [role, colour] of [['headline', p.headline], ['support', p.support]]) {
    const c = contrast(colour, p.light);
    if (c < Math.min(p.minContrast, 4.5) - 0.01) throw new Error(`slot ${slot.order}: ${role} contrast ${c.toFixed(2)} below ${p.minContrast}`);
  }
  const name = `band-${pad2(slot.order)}`;
  const { tab } = await openLayout(name, bandHtml(slot), PHONE.width, PHONE.captureTop);
  try {
    await guardText(tab, name);
    const lines = await tab.evaluate(() => [...document.querySelectorAll('.line')].map((el) => { const r = el.getBoundingClientRect(); return { text: el.textContent, left: r.left, right: r.right, width: r.width }; }));
    for (const l of lines) if (l.width > 966 || l.left < 54 || l.right > 1026) throw new Error(`${name}: "${l.text}" is ${l.width.toFixed(0)} px wide (max 960 + shadow)`);
    // Optical centring: centre the real ink (glyphs plus their shadow) in the band,
    // not the line boxes, whose ascender/descender padding differs per font.
    const clip = { x: 0, y: 0, width: PHONE.width, height: PHONE.band };
    const withText = await rgbRaw(await shot(tab, clip));
    await tab.evaluate(() => document.body.classList.add('ghost'));
    const bare = await rgbRaw(await shot(tab, clip));
    await tab.evaluate(() => document.body.classList.remove('ghost'));
    const box = inkBox(withText, bare);
    const dy = Math.round(PHONE.band / 2 - (box.top + box.bottom) / 2);
    await tab.evaluate((v) => document.body.style.setProperty('--dy', `${v}px`), dy);
    const finalBand = await rgbRaw(await shot(tab, clip));
    const ink = inkBox(finalBand, bare);
    if (ink.top < 40 || ink.bottom > PHONE.band - 40 || ink.left < 50 || ink.right > PHONE.width - 50) throw new Error(`${name}: text ink ${JSON.stringify(ink)} too close to the band edge`);
    const png = await shot(tab, { x: 0, y: 0, width: PHONE.width, height: PHONE.captureTop });
    return { png, ink, lines, dy };
  } finally { await tab.close(); }
}

// ---------------------------------------------------------------------------
// Capture areas (1080x1560).
// ---------------------------------------------------------------------------
async function captureWindow(file) {
  const { entry, buffer } = await readCapture(file);
  const win = windowRect(entry);
  if (win.width !== PHONE.width || win.height !== PHONE.captureHeight) throw new Error(`${file}: window is ${win.width}x${win.height}, expected 1080x1560 (no resampling)`);
  const png = await sharp(buffer).extract(win).png().toBuffer();
  return { png, sources: [file], exact: { file, win } };
}

/**
 * Slot 01: frame A (the L lifted, the DROP fan over PANT) above frame B (PAY
 * and PLANT after the move), each shown as its own framed panel with a clear
 * gap and a down arrow between them, so the pair reads as before and after
 * rather than as one four-row board. Both crops run the full screen width, so
 * the PICK card's glow, which the game's own screen edge cuts, ends at the
 * panel frame instead of being sliced inside the image.
 */
async function captureStack([fileA, fileB]) {
  const A = await readCapture(fileA);
  const B = await readCapture(fileB);
  const winA = windowRect(A.entry);
  const winB = windowRect(B.entry);
  if (winA.width !== winB.width) throw new Error('slot 01 frames differ in width');
  // Board background sampled from crop A at (8, 8); the backdrop is the same green, darker.
  const { data, width } = await rgbRaw(A.buffer);
  const i = ((winA.top + 8) * width + (winA.left + 8)) * 3;
  const board = { r: data[i], g: data[i + 1], b: data[i + 2] };
  const backdrop = { r: Math.round(board.r * 0.62), g: Math.round(board.g * 0.62), b: Math.round(board.b * 0.62) };
  const RING = 9; // 6 px wood + 3 px ink, drawn outside the panel
  const MARGIN = 26; const GAP = 108; const SIDE = 40; const RADIUS = 26;
  const scale = Math.min((PHONE.captureHeight - 2 * MARGIN - GAP - 4 * RING) / (winA.height + winB.height), (PHONE.width - 2 * SIDE - 2 * RING) / winA.width);
  const w = Math.round(winA.width * scale);
  const hA = Math.round(winA.height * scale);
  const hB = Math.round(winB.height * scale);
  const outer = (h) => h + 2 * RING;
  const total = outer(hA) + GAP + outer(hB);
  const left = Math.round((PHONE.width - w) / 2);
  const topA = Math.round((PHONE.captureHeight - total) / 2) + RING;
  const topB = topA + hA + RING + GAP + RING;
  // A soft inset shadow in the frame's ink along every panel edge, so the
  // crop edges (where the PICK card's glow and the board's own light shafts
  // are cut) read as the panel's recessed rim rather than a hard slice.
  const INSET = 26;
  const insetShadow = (h) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs>
      <linearGradient id="l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${INK}" stop-opacity="0.5"/><stop offset="1" stop-color="${INK}" stop-opacity="0"/></linearGradient>
      <linearGradient id="r" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${INK}" stop-opacity="0.5"/><stop offset="1" stop-color="${INK}" stop-opacity="0"/></linearGradient>
      <linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INK}" stop-opacity="0.5"/><stop offset="1" stop-color="${INK}" stop-opacity="0"/></linearGradient>
      <linearGradient id="b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${INK}" stop-opacity="0.5"/><stop offset="1" stop-color="${INK}" stop-opacity="0"/></linearGradient></defs>
      <rect x="0" y="0" width="${INSET}" height="${h}" fill="url(#l)"/><rect x="${w - INSET}" y="0" width="${INSET}" height="${h}" fill="url(#r)"/>
      <rect x="0" y="0" width="${w}" height="${INSET}" fill="url(#t)"/><rect x="0" y="${h - INSET}" width="${w}" height="${INSET}" fill="url(#b)"/></svg>`);
  const panel = async (buf, win, h) => {
    const rgb = await sharp(buf).extract(win).resize(w, h, { kernel: 'lanczos3', fit: 'fill' }).removeAlpha().png().toBuffer();
    const shaded = await sharp(rgb).composite([{ input: insetShadow(h), left: 0, top: 0 }]).png().toBuffer();
    const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${RADIUS}" ry="${RADIUS}" fill="#fff"/></svg>`);
    return sharp(shaded).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  };
  const frameSvg = (h) => {
    const W = w + 2 * RING; const H = h + 2 * RING;
    return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="${RADIUS + RING - 1.5}" fill="${INK}"/>
      <rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="${RADIUS + RING - 3}" fill="${WOOD}"/>
      <rect x="${RING}" y="${RING}" width="${w}" height="${h}" rx="${RADIUS}" fill="rgb(${board.r},${board.g},${board.b})"/>
    </svg>`);
  };
  const shadowOf = async (h) => {
    const W = w + 2 * RING + 80; const H = h + 2 * RING + 80;
    const svg = Buffer.from(`<svg width="${W}" height="${H}"><rect x="40" y="52" width="${w + 2 * RING}" height="${h + 2 * RING}" rx="${RADIUS + RING}" fill="${INK}" fill-opacity="0.55"/></svg>`);
    return sharp(svg).blur(14).png().toBuffer();
  };
  // A chunky down arrow in the band's own colours (parchment face, ink outline, hard ink shadow).
  const AW = 104; const AH = 92;
  const arrowPath = (dx, dy) => `M ${30 + dx} ${6 + dy} H ${74 + dx} V ${40 + dy} H ${98 + dx} L ${52 + dx} ${86 + dy} L ${6 + dx} ${40 + dy} H ${30 + dx} Z`;
  const arrow = await sharp(Buffer.from(`<svg width="${AW + 6}" height="${AH + 6}" xmlns="http://www.w3.org/2000/svg">
      <path d="${arrowPath(5, 5)}" fill="${INK}" fill-opacity="0.6"/>
      <path d="${arrowPath(0, 0)}" fill="#F3E2BF" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    </svg>`)).png().toBuffer();
  const a = await panel(A.buffer, winA, hA);
  const b = await panel(B.buffer, winB, hB);
  const layers = [];
  for (const [h, top] of [[hA, topA], [hB, topB]]) layers.push({ input: await shadowOf(h), left: left - RING - 40, top: top - RING - 40 });
  layers.push({ input: frameSvg(hA), left: left - RING, top: topA - RING }, { input: a, left, top: topA });
  layers.push({ input: frameSvg(hB), left: left - RING, top: topB - RING }, { input: b, left, top: topB });
  const gapTop = topA + hA + RING;
  layers.push({ input: arrow, left: Math.round((PHONE.width - AW) / 2), top: Math.round(gapTop + (GAP - AH) / 2) });
  const png = await sharp({ create: { width: PHONE.width, height: PHONE.captureHeight, channels: 3, background: backdrop } })
    .composite(layers).png().toBuffer();
  return { png, sources: [fileA, fileB], scale, fill: backdrop, layout: { left, tops: [topA, topB], width: w, heights: [hA, hB], gap: GAP } };
}

/**
 * Alpha for a story card. The card's pixel-art frame has a closed dark outline
 * (the ink the 9-slice frame is drawn with). Scanning in from each edge of the
 * window, everything before the first solid run of that outline is scene, not card:
 * that is the dimmed home screen showing in the frame's stepped corners and any
 * sliver outside the frame. Only those pixels become transparent.
 */
function cardAlpha({ data, width, height }) {
  const MARGIN = 64; // the frame's corner steps are about 30 px deep at these DPRs
  const RUN = 3;
  const outline = (x, y) => { const i = (y * width + x) * 3; const r = data[i]; const g = data[i + 1]; const b = data[i + 2]; return r >= b && r < 80 && g < 60; };
  const alpha = new Uint8Array(width * height).fill(255);
  const firstRun = (len, at) => { // index of the first RUN-long outline run within MARGIN, or -1
    for (let k = 0; k < Math.min(MARGIN, len - RUN); k += 1) {
      let ok = true; for (let j = 0; j < RUN; j += 1) if (!at(k + j)) { ok = false; break; }
      if (ok) return k;
    }
    return -1;
  };
  for (let y = 0; y < height; y += 1) {
    const l = firstRun(width, (k) => outline(k, y));
    for (let x = 0; x < l; x += 1) alpha[y * width + x] = 0;
    const r = firstRun(width, (k) => outline(width - 1 - k, y));
    for (let x = 0; x < r; x += 1) alpha[y * width + width - 1 - x] = 0;
  }
  for (let x = 0; x < width; x += 1) {
    const t = firstRun(height, (k) => outline(x, k));
    for (let y = 0; y < t; y += 1) alpha[y * width + x] = 0;
    const b = firstRun(height, (k) => outline(x, height - 1 - k));
    for (let y = 0; y < b; y += 1) alpha[(height - 1 - y) * width + x] = 0;
  }
  // Second pass for the concave pixels of the stepped corners that a straight scan
  // cannot see: grow the cleared area through scene-coloured pixels (bluer or greener
  // than red, which no frame, wood or parchment pixel is; the frame outline and its antialiased edge are red-dominant), never past MARGIN.
  const scene = (p) => { const r = data[p * 3]; const g = data[p * 3 + 1]; const b = data[p * 3 + 2]; return b > r || g > r + 12; };
  const near = (p) => { const x = p % width; const y = (p - x) / width; return x < MARGIN || y < MARGIN || x >= width - MARGIN || y >= height - MARGIN; };
  const queue = [];
  for (let p = 0; p < alpha.length; p += 1) if (!alpha[p]) queue.push(p);
  while (queue.length) {
    const p = queue.pop(); const x = p % width;
    for (const q of [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width]) {
      if (q < 0 || q >= alpha.length || !alpha[q] || !near(q) || !scene(q)) continue;
      alpha[q] = 0; queue.push(q);
    }
  }
  let cleared = 0;
  for (let p = 0; p < alpha.length; p += 1) if (!alpha[p]) cleared += 1;
  if (cleared > width * height * 0.02) throw new Error(`card mask cleared ${cleared} px, too many`);
  return { alpha, cleared };
}

/**
 * The one scale both story cards are shown at (07 and 08 are a pair, so they
 * share a template): the largest that fits each card in 1000x1500.
 */
function storyScale() {
  const wins = Object.values(SLOT_SOURCES).filter((x) => x.kind === 'story' && !x.hero).map((x) => windowRect(captureEntry(x.raws[0])));
  return Math.min(1, ...wins.map((w) => Math.min(1000 / w.width, 1500 / w.height)));
}

/**
 * Slots 07 and 08: the whole story card, on its own art blurred behind it
 * (brief section 3). With `hero`, the page's painting is also shown sharp and
 * full width at the top of the capture area, fading into the blurred backdrop,
 * and the card is scaled to fit from `hero.cardTop` down to `hero.bottom` px
 * above the bottom edge, overlapping the painting's lower edge.
 */
async function captureStory(file, backdrop, hero = null) {
  const { entry, buffer } = await readCapture(file);
  const win = windowRect(entry);
  const cardRgb = await rgbRaw(await sharp(buffer).extract(win).png().toBuffer());
  const { alpha, cleared } = cardAlpha(cardRgb);
  const rgba = Buffer.alloc(win.width * win.height * 4);
  for (let p = 0; p < alpha.length; p += 1) {
    rgba[p * 4] = cardRgb.data[p * 3]; rgba[p * 4 + 1] = cardRgb.data[p * 3 + 1]; rgba[p * 4 + 2] = cardRgb.data[p * 3 + 2]; rgba[p * 4 + 3] = alpha[p];
  }
  const scale = hero ? Math.min(1, 1000 / win.width, (PHONE.captureHeight - hero.cardTop - hero.bottom) / win.height) : storyScale();
  const w = Math.round(win.width * scale);
  const h = Math.round(win.height * scale);
  let card = sharp(rgba, { raw: { width: win.width, height: win.height, channels: 4 } });
  if (scale < 1) card = card.resize(w, h, { kernel: 'lanczos3', fit: 'fill' });
  const cardPng = await card.png().toBuffer();
  const left = Math.round((PHONE.width - w) / 2);
  const top = hero ? hero.cardTop : Math.round((PHONE.captureHeight - h) / 2);
  // Backdrop: the page's own art, cover-scaled, blurred sigma 24, brightness x0.80.
  let back = await sharp(path.join(MOBILE, backdrop))
    .resize(PHONE.width, PHONE.captureHeight, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
    .blur(24).modulate({ brightness: 0.8 }).png().toBuffer();
  let heroLayout = null;
  if (hero) {
    // The painting, full width and sharp, its bottom 140 px fading into the blur.
    const meta = await sharp(path.join(MOBILE, backdrop)).metadata();
    const hh = Math.round((PHONE.width * meta.height) / meta.width);
    const art = await sharp(path.join(MOBILE, backdrop)).resize(PHONE.width, hh, { kernel: 'lanczos3' }).removeAlpha().raw().toBuffer();
    const FADE = 140;
    const rgbaArt = Buffer.alloc(PHONE.width * hh * 4);
    for (let y = 0; y < hh; y += 1) {
      const t = Math.min(1, Math.max(0, (hh - 1 - y) / FADE)); const a = Math.round(255 * t * t * (3 - 2 * t));
      for (let x = 0; x < PHONE.width; x += 1) {
        const p = y * PHONE.width + x;
        rgbaArt[p * 4] = art[p * 3]; rgbaArt[p * 4 + 1] = art[p * 3 + 1]; rgbaArt[p * 4 + 2] = art[p * 3 + 2]; rgbaArt[p * 4 + 3] = a;
      }
    }
    back = await sharp(back).composite([{ input: await sharp(rgbaArt, { raw: { width: PHONE.width, height: hh, channels: 4 } }).png().toBuffer(), left: 0, top: 0 }]).png().toBuffer();
    heroLayout = { art: backdrop, width: PHONE.width, height: hh, fadePx: FADE };
  }
  // A soft contact shadow in the frame's own ink, so the card sits on the page.
  const placed = await sharp({ create: { width: PHONE.width, height: PHONE.captureHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: cardPng, left, top: top + 14 }]).png().toBuffer();
  const shadowAlpha = await sharp(await sharp(placed).extractChannel(3).png().toBuffer())
    .linear(0.55, 0).blur(22).raw().toBuffer({ resolveWithObject: true });
  const [sr, sg, sb] = hexToRgb(INK);
  const n = PHONE.width * PHONE.captureHeight;
  const shadowRgba = Buffer.alloc(n * 4);
  for (let p = 0; p < n; p += 1) {
    shadowRgba[p * 4] = sr; shadowRgba[p * 4 + 1] = sg; shadowRgba[p * 4 + 2] = sb; shadowRgba[p * 4 + 3] = shadowAlpha.data[p * shadowAlpha.info.channels];
  }
  const shadow = await sharp(shadowRgba, { raw: { width: PHONE.width, height: PHONE.captureHeight, channels: 4 } }).png().toBuffer();
  const png = await sharp(back).composite([
    { input: shadow, left: 0, top: 0 },
    { input: cardPng, left, top },
  ]).png().toBuffer();
  return { png, sources: [file], scale, cleared, layout: { left, top, width: w, height: h, hero: heroLayout }, card: scale === 1 ? { file, win, left, top } : null };
}

// ---------------------------------------------------------------------------
// Phone screenshots.
// ---------------------------------------------------------------------------
/** Remove PNGs in an upload folder that the current listing no longer names (a renamed slot or tablet frame). */
async function pruneUploads(dir, keep) {
  for (const f of await fs.readdir(dir).catch(() => [])) {
    if (f.endsWith('.png') && !keep.includes(f)) { await fs.rm(path.join(dir, f)); log(`removed stale upload ${rel(ROOT, path.join(dir, f))}`); }
  }
}

async function buildPhone() {
  await pruneUploads(path.join(UPLOAD, 'phone'), listing.screenshots.map((s) => `${s.slug}.png`));
  const results = [];
  for (const slot of listing.screenshots) {
    for (const t of [slot.headline, slot.subtitle || '', ...(slot.headline_lines || [])]) assertAsciiCopy(`slot ${slot.order}`, t);
    if (slot.headline_lines && slot.headline_lines.join(' ') !== slot.headline) throw new Error(`slot ${slot.order}: headline_lines do not spell the headline`);
    const src = SLOT_SOURCES[slot.order];
    const band = await renderBand(slot);
    const area = src.kind === 'stack' ? await captureStack(src.raws)
      : src.kind === 'story' ? await captureStory(src.raws[0], src.backdrop, src.hero ?? null)
        : await captureWindow(src.raws[0]);
    const out = path.join(UPLOAD, 'phone', `${slot.slug}.png`);
    const composed = sharp({ create: { width: PHONE.width, height: PHONE.height, channels: 3, background: INK } })
      .composite([{ input: band.png, left: 0, top: 0 }, { input: area.png, left: 0, top: PHONE.captureTop }]);
    const written = await writePng(out, composed, { width: PHONE.width, height: PHONE.height });
    // No-resample proof: the capture area must equal the raw window pixel for pixel.
    let pixelProof = null;
    if (area.exact) {
      const got = await rgbRaw(await sharp(out).extract({ left: 0, top: PHONE.captureTop, width: PHONE.width, height: PHONE.captureHeight }).png().toBuffer());
      const want = await rgbRaw(await sharp(path.join(RAW, area.exact.file)).extract(area.exact.win).png().toBuffer());
      const d = pixelDiff(got, want);
      if (d.max !== 0) throw new Error(`slot ${slot.order}: capture area differs from raw (max ${d.max})`);
      pixelProof = 'capture area equals the raw window pixel for pixel';
    } else if (area.card) {
      const inset = 24;
      const box = { width: area.card.win.width - inset * 2, height: area.card.win.height - inset * 2 };
      const got = await rgbRaw(await sharp(out).extract({ left: area.card.left + inset, top: PHONE.captureTop + area.card.top + inset, ...box }).png().toBuffer());
      const want = await rgbRaw(await sharp(path.join(RAW, area.card.file)).extract({ left: area.card.win.left + inset, top: area.card.win.top + inset, ...box }).png().toBuffer());
      const d = pixelDiff(got, want);
      if (d.max !== 0) throw new Error(`slot ${slot.order}: story card interior differs from raw (max ${d.max})`);
      pixelProof = 'story card placed unscaled; its interior equals the raw window pixel for pixel';
    }
    log(`phone ${slot.slug}.png  ${written.bytes} bytes  band ${slot.band}  ink y ${band.ink.top}-${band.ink.bottom}${area.scale ? `  scale ${area.scale.toFixed(4)}` : ''}${area.cleared ? `  corner px dropped ${area.cleared}` : ''}`);
    results.push({ slot, out, written, area, band, pixelProof });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Tablet: full-frame captures, re-encoded as RGB with pixels unchanged.
// ---------------------------------------------------------------------------
async function buildTablet() {
  const listed = listing.tablet_screenshots.map((t) => t.slug);
  if (TABLETS.map((t) => t.slug).join() !== listed.join()) throw new Error(`tablet order in listing-en-US.json (${listed}) differs from TABLETS`);
  await pruneUploads(path.join(UPLOAD, 'tablet'), TABLETS.map((t) => `${t.slug}.png`));
  for (const t of TABLETS) {
    const { buffer } = await readCapture(t.raw);
    const out = path.join(UPLOAD, 'tablet', `${t.slug}.png`);
    await writePng(out, sharp(buffer), { width: 1440, height: 2560 });
    const d = pixelDiff(await rgbRaw(out), await rgbRaw(buffer));
    if (d.max !== 0) throw new Error(`${t.slug}: pixels changed on re-encode`);
    log(`tablet ${t.slug}.png  from raw/${t.raw}`);
  }
}

// ---------------------------------------------------------------------------
// Feature graphics (brief section 5).
// ---------------------------------------------------------------------------
const FG = { width: 1024, height: 500, safe: { left: 154, top: 76, right: 870, bottom: 424 }, play: { cx: 512, cy: 250, r: 44 }, noText: { left: 440, top: 180, right: 584, bottom: 320 } };

/** Places each [data-baseline] line so its baseline sits on the requested y, then reports every text box. */
async function placeBaselines(tab) {
  return tab.evaluate(() => {
    for (const el of document.querySelectorAll('[data-baseline]')) {
      el.style.top = '0px';
      const probe = document.createElement('i');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      el.appendChild(probe);
      const offset = probe.getBoundingClientRect().top - el.getBoundingClientRect().top;
      probe.remove();
      el.style.top = `${Number(el.dataset.baseline) - offset}px`;
    }
    return [...document.querySelectorAll('[data-baseline]')].map((el) => {
      const range = document.createRange(); range.selectNodeContents(el);
      const r = range.getBoundingClientRect();
      return { text: el.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom, fontSize: parseFloat(getComputedStyle(el).fontSize) };
    });
  });
}
/** Real ink box of each [data-baseline] line: render with and without that line and diff. */
async function textInk(tab) {
  const clip = { x: 0, y: 0, width: FG.width, height: FG.height };
  const full = await rgbRaw(await shot(tab, clip));
  const count = await tab.evaluate(() => document.querySelectorAll('[data-baseline]').length);
  const boxes = [];
  for (let i = 0; i < count; i += 1) {
    const text = await tab.evaluate((k) => { const el = document.querySelectorAll('[data-baseline]')[k]; el.style.visibility = 'hidden'; return el.textContent; }, i);
    const bare = await rgbRaw(await shot(tab, clip));
    await tab.evaluate((k) => { document.querySelectorAll('[data-baseline]')[k].style.visibility = ''; }, i);
    const b = inkBox(full, bare);
    boxes.push({ text, left: b.left, right: b.right + 1, top: b.top, bottom: b.bottom + 1 });
  }
  return boxes;
}
function checkFgBoxes(name, boxes) {
  for (const b of boxes) {
    const s = FG.safe;
    if (b.left < s.left || b.right > s.right || b.top < s.top || b.bottom > s.bottom) throw new Error(`${name}: "${b.text || b.what}" at ${JSON.stringify(b)} leaves the safe box`);
    const n = FG.noText;
    if (b.text && b.left < n.right && b.right > n.left && b.top < n.bottom && b.bottom > n.top) throw new Error(`${name}: "${b.text}" sits under the play button`);
  }
}

/**
 * FG-A art placement. The brief scaled witness-05 by 1.15 (1104x621) and cut
 * x 28, y 83, which put the owl's and rabbit's faces past x 870 and the
 * capybara's and sloth's heads against x 154, outside the safe box. At 1.06
 * the eight residents' faces fit x 154-870; the painting is shifted 20 px
 * left and 72 px up, which keeps the folded note under the play button and
 * Axel's face and hands outside its circle. The painting then ends 26 px
 * short of the right edge; that strip is the same painting, blurred, with the
 * sharp art feathered into it. Ember's ear tips stay above y 76 (her face is
 * inside); pushing them lower would put Axel's hands under the button.
 */
const FG_A_ART = { scale: 1.06, dx: -20, dy: -72, feather: 28 };
/** Eyes-to-mouth box of each resident in witness-05.webp (960x540 source pixels), measured by eye on a 40 px grid. */
const FG_A_FACES = {
  sloth: [180, 160, 245, 200], capybara: [200, 245, 278, 295], fox: [325, 175, 420, 230], axolotl: [490, 175, 560, 225],
  pangolin: [598, 210, 655, 245], owl: [760, 150, 830, 195], rabbit: [755, 275, 800, 305],
};
const FG_A_AXEL_HANDS = [495, 235, 545, 262];
const fgAPoint = ([x0, y0, x1, y1]) => ({ left: x0 * FG_A_ART.scale + FG_A_ART.dx, top: y0 * FG_A_ART.scale + FG_A_ART.dy, right: x1 * FG_A_ART.scale + FG_A_ART.dx, bottom: y1 * FG_A_ART.scale + FG_A_ART.dy });
/** Distance from the play button's centre to the nearest point of a box. */
function playDistance(b) {
  const x = Math.max(b.left, Math.min(FG.play.cx, b.right)); const y = Math.max(b.top, Math.min(FG.play.cy, b.bottom));
  return Math.hypot(x - FG.play.cx, y - FG.play.cy);
}

async function featureA() {
  const art = path.join(PARTS, 'fg-a-art.png');
  await fs.mkdir(PARTS, { recursive: true });
  const src = path.join(MOBILE, 'assets/story/pages/witness-05.webp');
  const { scale, dx, dy, feather } = FG_A_ART;
  const bw = Math.round(960 * scale); const bh = Math.round(540 * scale);
  const sharpW = bw + dx;
  if (bh + dy < FG.height) throw new Error('FG-A art does not reach the bottom edge');
  const painting = await sharp(src).resize(bw, bh, { kernel: 'lanczos3' }).extract({ left: -dx, top: -dy, width: sharpW, height: FG.height }).removeAlpha().raw().toBuffer();
  const rgba = Buffer.alloc(sharpW * FG.height * 4);
  for (let p = 0; p < sharpW * FG.height; p += 1) {
    const x = p % sharpW;
    const t = Math.min(1, Math.max(0, (sharpW - 1 - x) / feather));
    rgba[p * 4] = painting[p * 3]; rgba[p * 4 + 1] = painting[p * 3 + 1]; rgba[p * 4 + 2] = painting[p * 3 + 2];
    rgba[p * 4 + 3] = Math.round(255 * t * t * (3 - 2 * t));
  }
  const back = await sharp(src).resize(FG.width, FG.height, { fit: 'cover', position: 'right', kernel: 'lanczos3' }).blur(16).png().toBuffer();
  const joined = await sharp(back).composite([{ input: await sharp(rgba, { raw: { width: sharpW, height: FG.height, channels: 4 } }).png().toBuffer(), left: 0, top: 0 }]).png().toBuffer();
  // Tone as the brief gives it.
  await sharp(joined).gamma(1, 1.8).modulate({ saturation: 1.18, brightness: 1.04 }).png().toFile(art);
  const faces = Object.entries(FG_A_FACES).map(([who, b]) => ({ what: `${who} face`, ...fgAPoint(b) }));
  for (const f of faces) {
    const sb = FG.safe;
    if (f.left < sb.left || f.right > sb.right || f.top < sb.top || f.bottom > sb.bottom) throw new Error(`FG-A: ${f.what} ${JSON.stringify(f)} leaves the safe box`);
  }
  const axel = { face: playDistance(fgAPoint(FG_A_FACES.axolotl)), hands: playDistance(fgAPoint(FG_A_AXEL_HANDS)) };
  if (axel.face < FG.play.r || axel.hands < FG.play.r) throw new Error(`FG-A: Axel under the play button ${JSON.stringify(axel)}`);
  const artLuma = await meanLuma(art);
  const mark = path.join(PARTS, 'wordmark-330x83.png');
  await sharp(path.join(MOBILE, 'assets/ui/wordmark.png')).resize(330, 83, { kernel: 'lanczos3', fit: 'fill' }).png().toFile(mark);
  const tagline = listing.feature_graphic.tagline_lines;
  tagline.forEach((t) => assertAsciiCopy('FG-A', t));
  const css = `body{width:${FG.width}px;height:${FG.height}px;background:${INK}}
img{position:absolute;display:block}
.scrim{position:absolute;left:0;top:0;width:${FG.width}px;height:${FG.height}px;background:linear-gradient(180deg,rgba(59,36,22,0) 290px,rgba(59,36,22,.62) 475px,rgba(59,36,22,.62) 500px)}
.t{position:absolute;right:${FG.width - 860}px;white-space:nowrap;font:700 var(--size,44px)/1.3 'WS Epunda';color:${CREAM};text-shadow:3px 3px 0 ${INK}}`;
  const body = `<img src="${rel(LAYOUTS, art)}" style="left:0;top:0;width:1024px;height:500px" alt=""><div class="scrim"></div><img src="${rel(LAYOUTS, mark)}" style="left:160px;top:327px;width:330px;height:83px" alt="WordShift"><span class="t" data-fit data-baseline="364">${esc(tagline[0])}</span><span class="t" data-fit data-baseline="412">${esc(tagline[1])}</span>`;
  const { tab } = await openLayout('feature-a', page('WordShift feature graphic A', css, body), FG.width, FG.height);
  try {
    await guardText(tab, 'feature-a');
    let size = 44; await placeBaselines(tab); let boxes = await textInk(tab);
    while (Math.min(...boxes.map((b) => b.left)) < 510) {
      size -= 1;
      if (size < 36) throw new Error('FG-A tagline does not clear the wordmark at 36 px');
      await tab.evaluate((s) => document.body.style.setProperty('--size', `${s}px`), size);
      await placeBaselines(tab); boxes = await textInk(tab);
    }
    checkFgBoxes('FG-A', [...boxes, { what: 'wordmark', left: 160, right: 490, top: 327, bottom: 410 }]);
    const out = path.join(UPLOAD, 'feature-graphic.png');
    const written = await writePng(out, sharp(await shot(tab, { x: 0, y: 0, width: FG.width, height: FG.height })), { width: FG.width, height: FG.height, maxBytes: 1024 * 1024 * 15 });
    const luma = await meanLuma(out);
    const stats = await sharp(out).stats();
    if (luma < 85) throw new Error(`FG-A mean luminance ${luma.toFixed(1)} is under 85`);
    // Review downscale the brief asks for.
    await sharp(out).resize(360, null, { kernel: 'lanczos3' }).removeAlpha().png().toFile(path.join(RAW, 'fg-a-360.png'));
    log(`feature-graphic.png  ${written.bytes} bytes  tagline ${size}px  left ${Math.min(...boxes.map((b) => b.left)).toFixed(1)}  art luma ${artLuma.toFixed(1)}  final luma ${luma.toFixed(1)}  min channel ${Math.min(...stats.channels.slice(0, 3).map((c) => c.min))}  Axel from play ${axel.face.toFixed(0)}/${axel.hands.toFixed(0)} px`);
    return { out, boxes, size, artLuma, luma, faces, axel };
  } finally { await tab.close(); }
}

/**
 * FG-B hero tiles: the five PICK-row tiles from slot 01 frame B (PLANT, the
 * moved L locked in place), cropped tight on the card's own parchment and
 * scaled so each tile is about 55 px wide at 1024. P L A Y on its own read as
 * a Play button (and sat under Play's own video play button), so the tiles are
 * a whole word that only a puzzle would show. The crop gets a rounded mask and
 * a rim in the card's own border colour (sampled from the capture), so it
 * reads as a small piece of the real card rather than a sliced rectangle.
 */
const HERO_TILE_SOURCE = 's01-frame-b-after-move.png';
const FG_B_TILES = { width: 400, left: 156, top: 322, padX: 10, padY: 4, radius: 13, rim: 3 };
async function heroTiles() {
  const { entry, buffer } = await readCapture(HERO_TILE_SOURCE);
  const t = entry.boxesCss.fgbTiles;
  const panel = entry.boxesCss.fgbRowCardPanel;
  if (!t || !panel) throw new Error(`raw/provenance.json has no fgbTiles / fgbRowCardPanel box for ${HERO_TILE_SOURCE}; re-run captureRefresh.mjs s01`);
  const dpr = entry.deviceScaleFactor;
  const { width: W, padX, padY, radius, rim } = FG_B_TILES;
  const box = { left: Math.round((t.x - padX) * dpr), top: Math.round((t.y - padY) * dpr), width: Math.round((t.width + 2 * padX) * dpr), height: Math.round((t.height + 2 * padY) * dpr) };
  // The card's rim colour: the middle of its top border.
  const { data, width } = await rgbRaw(buffer);
  const rx = Math.round((panel.x + panel.width / 2) * dpr); const ry = Math.round((panel.y + 1) * dpr);
  const k = (ry * width + rx) * 3;
  const rimColour = `rgb(${data[k]},${data[k + 1]},${data[k + 2]})`;
  const scale = W / box.width;
  const H = Math.round(box.height * scale);
  const inner = await sharp(buffer).extract(box).resize(W - 2 * rim, H - 2 * rim, { kernel: 'lanczos3', fit: 'fill' }).png().toBuffer();
  const mask = Buffer.from(`<svg width="${W - 2 * rim}" height="${H - 2 * rim}"><rect width="${W - 2 * rim}" height="${H - 2 * rim}" rx="${radius - rim}" fill="#fff"/></svg>`);
  const masked = await sharp(inner).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  const frame = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${W}" height="${H}" rx="${radius}" fill="${rimColour}"/></svg>`);
  const file = path.join(PARTS, 'fg-b-tiles.png');
  await sharp(frame).composite([{ input: masked, left: rim, top: rim }]).png().toFile(file);
  const tilePx = Math.round((t.width / 5 - 4) * dpr * scale); // one tile, less the gap between tiles
  return { file, width: W, height: H, rimColour, tilePx, cropCss: { x: t.x - padX, y: t.y - padY, width: t.width + 2 * padX, height: t.height + 2 * padY } };
}

async function featureB() {
  await fs.mkdir(PARTS, { recursive: true });
  const art = path.join(PARTS, 'fg-b-art.png');
  await sharp(path.join(MOBILE, 'assets/rooms/cozy_den.webp'))
    .extract({ left: 22, top: 22, width: 1412, height: 676 })
    .resize({ height: 500, kernel: 'lanczos3' })
    .extract({ left: 10, top: 0, width: 1024, height: 500 })
    .modulate({ brightness: 1.08, saturation: 1.15 })
    .png().toFile(art);
  const mark = path.join(PARTS, 'wordmark-280x70.png');
  await sharp(path.join(MOBILE, 'assets/ui/wordmark.png')).resize(280, 70, { kernel: 'lanczos3', fit: 'fill' }).png().toFile(mark);
  const tiles = await heroTiles();
  const T = FG_B_TILES;
  if (T.top + tiles.height > FG.safe.bottom) throw new Error(`FG-B hero tiles end at y ${T.top + tiles.height}, below 424`);
  if (T.top <= FG.noText.bottom && T.left + tiles.width > FG.noText.left) throw new Error('FG-B hero tiles overlap the play-button box');
  const tagline = listing.feature_graphic_variant_b.tagline_lines;
  tagline.forEach((t) => assertAsciiCopy('FG-B', t));
  const css = `body{width:${FG.width}px;height:${FG.height}px;background:${INK}}
img{position:absolute;display:block}
.wash{position:absolute;left:0;top:0;width:${FG.width}px;height:${FG.height}px;background:linear-gradient(90deg,rgba(59,36,22,.62) 0px,rgba(59,36,22,0) 430px)}
.t{position:absolute;left:166px;white-space:nowrap;font:700 44px/1.3 'WS Figtree';color:${CREAM};text-shadow:3px 3px 0 ${INK}}
.tiles{filter:drop-shadow(0 6px 8px rgba(59,36,22,.55))}`;
  const body = `<img src="${rel(LAYOUTS, art)}" style="left:0;top:0;width:1024px;height:500px" alt=""><div class="wash"></div><img src="${rel(LAYOUTS, mark)}" style="left:156px;top:88px;width:280px;height:70px" alt="WordShift"><span class="t" data-fit data-baseline="214">${esc(tagline[0])}</span><span class="t" data-fit data-baseline="262">${esc(tagline[1])}</span><img class="tiles" src="${rel(LAYOUTS, tiles.file)}" style="left:${T.left}px;top:${T.top}px;width:${tiles.width}px;height:${tiles.height}px" alt="">`;
  const { tab } = await openLayout('feature-b', page('WordShift feature graphic B', css, body), FG.width, FG.height);
  try {
    await guardText(tab, 'feature-b');
    await placeBaselines(tab);
    const boxes = await textInk(tab);
    checkFgBoxes('FG-B', [...boxes, { what: 'wordmark', left: 156, right: 436, top: 88, bottom: 158 }, { what: 'tiles', left: T.left, right: T.left + tiles.width, top: T.top, bottom: T.top + tiles.height }]);
    const out = path.join(UPLOAD, 'experiments', 'feature-graphic-b.png');
    const written = await writePng(out, sharp(await shot(tab, { x: 0, y: 0, width: FG.width, height: FG.height })), { width: FG.width, height: FG.height, maxBytes: 1024 * 1024 * 15 });
    const luma = await meanLuma(out);
    log(`experiments/feature-graphic-b.png  ${written.bytes} bytes  tiles ${tiles.width}x${tiles.height} (one tile about ${tiles.tilePx} px)  luma ${luma.toFixed(1)}  lines ${boxes.map((b) => `${b.text} ${(b.right - b.left).toFixed(0)}px`).join(', ')}`);
    return { out, boxes, luma };
  } finally { await tab.close(); }
}

// ---------------------------------------------------------------------------
// Review files: alt text, manifest, contact sheet, preview.
// ---------------------------------------------------------------------------
function altRows() {
  const rows = [];
  for (const s of listing.screenshots) rows.push({ id: pad2(s.order), file: `upload/phone/${s.slug}.png`, text: s.alt_text });
  rows.push({ id: 'FG-A', file: 'upload/feature-graphic.png', text: listing.feature_graphic.alt_text });
  rows.push({ id: 'FG-B', file: 'upload/experiments/feature-graphic-b.png', text: listing.feature_graphic_variant_b.alt_text });
  for (const t of listing.tablet_screenshots) rows.push({ id: TABLETS.find((x) => x.slug === t.slug).id, file: `upload/tablet/${t.slug}.png`, text: t.alt_text });
  for (const r of rows) {
    assertAsciiCopy(`alt ${r.id}`, r.text);
    if (r.text.length > 140) throw new Error(`alt ${r.id} is ${r.text.length} characters, over 140`);
  }
  return rows;
}

async function describe(file) {
  const buf = await fs.readFile(file);
  const meta = await sharp(buf).metadata();
  return { file: rel(ROOT, file), width: meta.width, height: meta.height, channels: meta.channels, bytes: buf.length, sha256: sha256(buf) };
}

function gitHead() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: MOBILE, encoding: 'utf8' }).trim(); } catch { return null; }
}

async function buildReview(phoneResults) {
  const alts = altRows();
  const altById = Object.fromEntries(alts.map((a) => [a.id, a]));
  await fs.writeFile(path.join(ROOT, 'alt-text.tsv'), `${['id\ttext', ...alts.map((a) => `${a.id}\t${a.text}`)].join('\n')}\n`);

  const assets = [];
  for (const s of listing.screenshots) {
    const file = path.join(UPLOAD, 'phone', `${s.slug}.png`);
    if (!existsSync(file)) continue;
    const r = phoneResults?.find((x) => x.slot.order === s.order);
    const src = SLOT_SOURCES[s.order];
    assets.push({
      ...(await describe(file)), use: `Phone screenshot ${s.order} of 8`, alt_id: pad2(s.order), alt_text: altById[pad2(s.order)].text,
      headline: s.headline, support: s.subtitle || null, band: s.band,
      caption_region: { height_px: PHONE.captureTop, fraction: +(PHONE.captureTop / PHONE.height).toFixed(4) },
      captures: src.raws.map((f) => ({ file: `raw/${f}`, sha256: captureEntry(f).sha256, window_px: captureEntry(f).window.px })),
      treatment: src.kind === 'window' ? 'capture window placed 1:1 (no resampling)' : src.kind === 'stack' ? 'frames A and B cropped to their rows (8 CSS in from each screen edge), scaled together with lanczos3 and shown as two framed panels with a gap and a down arrow between, on a darker board green' : src.hero ? 'story card lifted off the dimmed scene at its frame outline and scaled to fit below the page\'s own painting, which is shown sharp and full width above it and fades into the same painting blurred (blur 24, brightness 0.8); soft shadow under the card' : 'story card lifted off the dimmed scene at its frame outline, placed on its own art (cover, blur 24, brightness 0.8) with a soft shadow',
      ...(r?.area?.scale ? { scale: +r.area.scale.toFixed(5) } : {}),
      ...(r?.pixelProof ? { pixel_proof: r.pixelProof } : {}),
    });
  }
  for (const t of TABLETS) {
    const file = path.join(UPLOAD, 'tablet', `${t.slug}.png`);
    if (!existsSync(file)) continue;
    const entry = captureEntry(t.raw);
    assets.push({ ...(await describe(file)), use: 'Tablet screenshot (7-inch and 10-inch slots)', alt_id: t.id, alt_text: altById[t.id].text, captures: [{ file: `raw/${t.raw}`, sha256: entry.sha256, viewport: entry.viewport, device_scale_factor: entry.deviceScaleFactor }], treatment: 'full frame, pixels unchanged, re-encoded as RGB' });
  }
  for (const [file, use, id, source] of [
    [path.join(UPLOAD, 'feature-graphic.png'), 'Feature graphic (main listing)', 'FG-A', 'assets/story/pages/witness-05.webp (picture only), assets/ui/wordmark.png'],
    [path.join(UPLOAD, 'experiments/feature-graphic-b.png'), 'Feature graphic B (experiment only)', 'FG-B', 'assets/rooms/cozy_den.webp, assets/ui/wordmark.png, the five PLANT PICK-row tiles from raw/s01-frame-b-after-move.png'],
  ]) {
    if (!existsSync(file)) continue;
    assets.push({ ...(await describe(file)), use, alt_id: id, alt_text: altById[id].text, mean_luma: +(await meanLuma(file)).toFixed(1), art: source });
  }
  const icon = path.join(UPLOAD, 'store-icon-512.png');
  if (existsSync(icon)) assets.push({ ...(await describe(icon)), use: 'Store icon (unchanged; byte copy of launch-2026-09/upload/store-icon-512.png)' });
  for (const [f, use] of [['video/trailer-9x16-1080x1920.mp4', 'Play preview video (upload to YouTube)'], ['video/trailer-16x9-1920x1080.mp4', 'Trailer master (YouTube channel, press)'], ['video/youtube-thumbnail-1280x720.png', 'YouTube thumbnail'], ['video/captions-en.srt', 'Trailer captions']]) {
    const file = path.join(ROOT, f);
    if (!existsSync(file)) continue;
    const buf = await fs.readFile(file);
    assets.push({ file: f, bytes: buf.length, sha256: sha256(buf), use });
  }
  const manifest = {
    campaign: 'refresh-2026-09',
    generated_by: 'node mobile/scripts/store/buildRefresh.mjs',
    git_head: gitHead(),
    locale: 'en-US',
    gameplay_provenance: 'Gameplay images are genuine renders of the current WordShift build (Expo web, headless Chromium) from raw/, made by scripts/store/captureRefresh.mjs; see raw/provenance.json and raw/SUBSTITUTIONS.md. Only local progression was seeded and only real UI input was used. Captions, bands, seams, backdrops, arrows and shadows sit outside the captures. Not Android device captures.',
    phone_template: { size: '1080x1920', band_px: PHONE.band, seam_px: PHONE.seam, caption_region_fraction: PHONE.captureTop / PHONE.height, headline: 'Figtree-Bold 96/104', support: 'EpundaSlab-Bold 60/70' },
    assets,
  };
  await fs.writeFile(path.join(ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await buildContactSheet();
  await buildPreview(alts);
}

async function buildContactSheet() {
  const shots = listing.screenshots.map((s) => ({ s, file: path.join(UPLOAD, 'phone', `${s.slug}.png`) })).filter((x) => existsSync(x.file));
  const fgA = path.join(UPLOAD, 'feature-graphic.png');
  const fgB = path.join(UPLOAD, 'experiments/feature-graphic-b.png');
  // Thumbnails are pre-scaled by sharp (lanczos3), so the sheet shows what a gallery shows.
  const thumbs = path.join(PARTS, 'thumbs');
  await fs.mkdir(thumbs, { recursive: true });
  const thumb = async (file, width, name) => { const out = path.join(thumbs, name); await sharp(file).resize(width, null, { kernel: 'lanczos3' }).png().toFile(out); return out; };
  const phoneThumbs = [];
  for (const { s, file } of shots) phoneThumbs.push({ s, file: await thumb(file, 180, `${s.slug}.png`) });
  const fgThumbs = [];
  for (const [file, label] of [[fgA, 'FG-A (main listing)'], [fgB, 'FG-B (experiment)']]) if (existsSync(file)) fgThumbs.push({ label, file: await thumb(file, 740, `${path.basename(file, '.png')}-740.png`) });
  // The same two at the sizes a listing shows them (brief section 5 checks 360 and 256 wide), with the video play button drawn in.
  const smallThumbs = [];
  for (const w of [360, 256]) {
    for (const [file, label] of [[fgA, 'FG-A'], [fgB, 'FG-B']]) if (existsSync(file)) smallThumbs.push({ label: `${label} at ${w} px`, width: w, height: Math.round((w * FG.height) / FG.width), file: await thumb(file, w, `${path.basename(file, '.png')}-${w}.png`) });
  }
  const W = 1700;
  const css = `body{width:${W}px;height:1000px;background:#F7F1E6;color:${INK};font-family:'WS Figtree'}
h1{position:absolute;left:40px;top:24px;margin:0;font:700 30px/1.2 'WS Figtree'}
.meta{position:absolute;left:40px;top:64px;font:400 17px/1.4 'WS Figtree';color:${WOOD}}
.phones{position:absolute;left:40px;top:118px;display:flex;gap:26px}
figure{margin:0}
figure img{display:block;border-radius:10px;box-shadow:0 2px 8px rgba(59,36,22,.25)}
figcaption{font:700 15px/1.3 'WS Figtree';margin-top:10px;width:180px}
figcaption span{display:block;font-weight:400;color:${WOOD}}
.fgs{position:absolute;left:40px;top:520px;display:flex;gap:40px}
.fgs figcaption{width:auto}
.fgs img{border-radius:14px}
.small{position:absolute;left:40px;top:950px;display:flex;gap:28px;align-items:flex-end}
.small figure{position:relative}
.small img{border-radius:8px}
.small .play{position:absolute;border-radius:50%;background:rgba(0,0,0,.45);box-shadow:0 0 0 2px rgba(255,255,255,.8);transform:translate(-50%,-50%)}
.small figcaption{width:auto}`;
  const body = `<h1>WordShift Play listing refresh (refresh-2026-09)</h1><div class="meta">Phone screenshots 01-08 at 180 px wide, the size a gallery shows them. Feature graphics below at 740 px wide (full size is 1024), then at 360 and 256 px wide. Built by scripts/store/buildRefresh.mjs.</div><div class="phones">${phoneThumbs.map(({ s, file }) => `<figure><img src="${rel(LAYOUTS, file)}" width="180" height="320" alt=""><figcaption>${pad2(s.order)} ${esc(s.headline)}<span>${esc(s.band)} band</span></figcaption></figure>`).join('')}</div><div class="fgs">${fgThumbs.map(({ label, file }) => `<figure><img src="${rel(LAYOUTS, file)}" width="740" height="361" alt=""><figcaption>${esc(label)}</figcaption></figure>`).join('')}</div><div class="small">${smallThumbs.map(({ label, file, width, height }) => { const d = Math.round((2 * FG.play.r * width) / FG.width); return `<figure><img src="${rel(LAYOUTS, file)}" width="${width}" height="${height}" alt=""><div class="play" style="left:${width / 2}px;top:${height / 2}px;width:${d}px;height:${d}px"></div><figcaption>${esc(label)}, play button shown</figcaption></figure>`; }).join('')}</div>`;
  const { tab } = await openLayout('contact-sheet', page('WordShift refresh contact sheet', css, body), W, 1000);
  try {
    const height = await tab.evaluate(() => Math.ceil(Math.max(...[...document.querySelectorAll('figure')].map((f) => f.getBoundingClientRect().bottom))) + 36);
    await tab.setViewportSize({ width: W, height });
    const out = path.join(ROOT, 'contact-sheet.png');
    await writePng(out, sharp(await shot(tab, { x: 0, y: 0, width: W, height })), { width: W, height, maxBytes: 20 * 1024 * 1024 });
    log(`contact-sheet.png  ${W}x${height}`);
  } finally { await tab.close(); }
}

async function buildPreview(alts) {
  const altByFile = Object.fromEntries(alts.map((a) => [a.file, a.text]));
  const has = (f) => existsSync(path.join(ROOT, f));
  const icon = has('upload/store-icon-512.png') ? 'upload/store-icon-512.png' : null;
  const video = has('video/trailer-9x16-1080x1920.mp4') ? 'video/trailer-9x16-1080x1920.mp4' : null;
  const phones = listing.screenshots.filter((s) => has(`upload/phone/${s.slug}.png`));
  const tablets = TABLETS.filter((t) => has(`upload/tablet/${t.slug}.png`));
  const css = `*{box-sizing:border-box}body{margin:0;background:#FBF7EF;color:#2A1B11;font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:1180px;margin:auto;padding:32px 24px 64px}
h1{font-size:30px;line-height:1.2;margin:0 0 4px}h2{font-size:21px;margin:40px 0 12px}
.note{color:#6B4A2E;font-size:14px;max-width:880px}
.app{display:flex;gap:20px;align-items:center;margin:24px 0}
.app img{width:96px;height:96px;border-radius:22px;box-shadow:0 2px 8px rgba(59,36,22,.25)}
.app .name{font-size:24px;font-weight:700}.app .short{color:#4B3A2C}
.fg{position:relative;max-width:1024px}
.fg img,.fg video{width:100%;display:block;border-radius:14px}
.fg .play{position:absolute;left:50%;top:50%;width:8.6%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:rgba(0,0,0,.45);box-shadow:0 0 0 2px rgba(255,255,255,.8)}
.strip{display:flex;gap:10px;overflow-x:auto;padding-bottom:10px}
.strip img{height:300px;border-radius:10px;display:block;box-shadow:0 1px 5px rgba(59,36,22,.25)}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
figure{margin:0}figure img{width:100%;display:block;border-radius:10px;box-shadow:0 1px 5px rgba(59,36,22,.25)}
figcaption{font-size:13px;color:#6B4A2E;padding-top:8px}
figcaption b{color:#2A1B11;display:block;font-size:14px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.desc{white-space:pre-wrap;background:#fff;border:1px solid #E6D9C2;border-radius:12px;padding:22px;max-width:760px}
.toggle{font-size:14px;margin:8px 0}
@media(max-width:800px){.grid{grid-template-columns:repeat(2,1fr)}.two{grid-template-columns:1fr}.strip img{height:220px}main{padding:20px 16px}}`;
  const body = `<main>
<h1>WordShift Play listing refresh</h1>
<p class="note">Review page for the refresh-2026-09 campaign. It is not a Play Console page. Upload the files named under each image; copy and alt text come from copy/ and alt-text.tsv.</p>
<div class="app">${icon ? `<img src="${icon}" alt="Store icon">` : ''}<div><div class="name">${esc(listing.app_name)}</div><div class="short">${esc(listing.short_description)}</div></div></div>
<h2>Feature graphic</h2>
<div class="fg"><img src="upload/feature-graphic.png" alt="${esc(altByFile['upload/feature-graphic.png'])}"><div class="play" id="play" title="Where Play draws the video play button"></div></div>
<label class="toggle"><input type="checkbox" id="showPlay" checked> Show where the video play button sits</label>
<h2>Phone screenshots, gallery size</h2>
<div class="strip">${phones.map((s) => `<img src="upload/phone/${s.slug}.png" alt="${esc(altByFile[`upload/phone/${s.slug}.png`])}">`).join('')}</div>
<h2>Phone screenshots, in upload order</h2>
<div class="grid">${phones.map((s) => `<figure><a href="upload/phone/${s.slug}.png"><img src="upload/phone/${s.slug}.png" alt="${esc(altByFile[`upload/phone/${s.slug}.png`])}"></a><figcaption><b>${pad2(s.order)}. ${esc(s.headline)}</b>upload/phone/${s.slug}.png<br>Alt: ${esc(altByFile[`upload/phone/${s.slug}.png`])}</figcaption></figure>`).join('')}</div>
${tablets.length ? `<h2>Tablet screenshots (7-inch and 10-inch)</h2><p class="note">${esc(listing.tablet_note || '')}</p><div class="grid">${tablets.map((t) => `<figure><a href="upload/tablet/${t.slug}.png"><img src="upload/tablet/${t.slug}.png" alt="${esc(altByFile[`upload/tablet/${t.slug}.png`])}"></a><figcaption><b>${t.id}</b>upload/tablet/${t.slug}.png<br>Alt: ${esc(altByFile[`upload/tablet/${t.slug}.png`])}</figcaption></figure>`).join('')}</div>` : ''}
${video ? `<h2>Preview video</h2><div class="fg" style="max-width:360px"><video src="${video}" controls playsinline preload="metadata"></video></div>` : ''}
<h2>Feature graphic B (experiment only)</h2>
<div class="fg"><img src="upload/experiments/feature-graphic-b.png" alt="${esc(altByFile['upload/experiments/feature-graphic-b.png'])}"></div>
<h2>Full description</h2>
<div class="desc">${esc(listing.full_description)}</div>
<p class="note"><a href="manifest.json">manifest.json</a> (sizes and SHA-256) &middot; <a href="alt-text.tsv">alt-text.tsv</a> &middot; <a href="contact-sheet.png">contact-sheet.png</a> &middot; <a href="brief.md">brief.md</a></p>
</main>
<script>document.getElementById('showPlay').addEventListener('change',function(e){document.getElementById('play').style.display=e.target.checked?'':'none'});</script>`;
  const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WordShift listing refresh preview</title><style>${css}</style></head><body>${body}</body></html>\n`;
  await fs.writeFile(path.join(ROOT, 'preview.html'), html);
  log('preview.html');
}

// ---------------------------------------------------------------------------
browser = await chromium.launch({ executablePath: CHROMIUM, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
let phoneResults = null;
try {
  if (targets.has('phone')) phoneResults = await buildPhone();
  if (targets.has('tablet')) await buildTablet();
  if (targets.has('feature')) { await featureA(); await featureB(); }
  if (targets.has('icon')) {
    await fs.mkdir(UPLOAD, { recursive: true });
    await fs.copyFile(LIVE_ICON, path.join(UPLOAD, 'store-icon-512.png'));
    if (sha256(await fs.readFile(LIVE_ICON)) !== sha256(await fs.readFile(path.join(UPLOAD, 'store-icon-512.png')))) throw new Error('icon copy differs');
    log('store-icon-512.png  copied unchanged');
  }
  await buildReview(phoneResults);
} finally {
  await browser.close();
}
