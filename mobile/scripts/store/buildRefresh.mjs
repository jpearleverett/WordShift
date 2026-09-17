#!/usr/bin/env node
/**
 * WordShift's second Play campaign: deterministic typesetting around real captures.
 * Run from any directory: node mobile/scripts/store/buildRefresh.mjs
 * --art-only exports the feature, icon and controls before capture is complete.
 * --skip-missing builds available captures while production is in progress.
 * No browser, network, game-state mutation, or screenshot retouching is performed.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

if (process.argv.includes('--help')) {
  console.log(`Usage: node scripts/store/buildRefresh.mjs [--art-only | --skip-missing]\n\nDefault: require all eight genuine current captures and reviewed before/after\ncrop bounds, then export the phone set, feature, icon, challengers and previews.\n--art-only: export finished artwork, measured layout templates and a clearly\n  partial review without creating gameplay screenshots.\n--skip-missing: build available captures; record missing inputs or crop review\n  in the manifest instead of presenting an incomplete campaign as complete.\n\nRaw inputs: assets/Play_store/launch-2026-09-v2/raw/<screenshot-slug>.png\nAdditional opener input: raw/01-one-letter-result.png\nBefore/after crop review: source/layouts/opener-crops.json (reviewed: true).\nThe optional completed trailer is checksummed if present at\nupload/video/wordshift-trailer-30s.mp4.\nRun in the project checkout with npm dependencies and bundled fonts installed.\n--help prints this text without generating or changing files.`);
  process.exit(0);
}

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROOT = path.join(MOBILE, 'assets/Play_store/launch-2026-09-v2');
const PREVIOUS = path.join(MOBILE, 'assets/Play_store/launch-2026-09');
const OUT = path.join(ROOT, 'upload');
const LAYOUTS = path.join(ROOT, 'source/layouts');
const listing = JSON.parse(await fs.readFile(path.join(ROOT, 'copy/listing-en-US.json'), 'utf8'));
const artOnly = process.argv.includes('--art-only');
const skipMissing = artOnly || process.argv.includes('--skip-missing');
const fontFiles = {
  heading: path.join(MOBILE, 'assets/fonts/EpundaSlab-Bold.ttf'),
  body: path.join(MOBILE, 'assets/fonts/Figtree-Regular.ttf'),
};
const fontNames = { heading: 'Epunda Slab Bold', body: 'Figtree-Regular' };
const palettes = {
  light: { background: '#F7EDDA', heading: '#274C3E', support: '#586653', line: '#B39759', edge: '#D3C5A5' },
  dark: { background: '#13282A', heading: '#F7EDDA', support: '#DBCEB0', line: '#C4A45F', edge: '#486056' },
};
const assets = [];
const missing = [];
const escape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const relative = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const sha = async (p) => createHash('sha256').update(await fs.readFile(p)).digest('hex');
const exists = async (p) => { try { await fs.access(p); return true; } catch { return false; } };
const json = async (p, value) => fs.writeFile(p, `${JSON.stringify(value, null, 2)}\n`);
const svg = (width, height, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`);
for (const folder of [OUT, path.join(OUT, 'phone'), path.join(ROOT, 'variants'), LAYOUTS, path.join(ROOT, 'source/controls')]) await fs.mkdir(folder, { recursive: true });

/** Pango measures the exact bundled font, shrinking only when a line needs it. */
async function textLayer(text, { font = 'heading', size = 82, minSize = 42, maxWidth = 924, color = '#274C3E' } = {}) {
  for (let px = size; px >= minSize; px -= 1) {
    const { data, info } = await sharp({ text: { text: `<span foreground="${color}">${escape(text)}</span>`, font: `${fontNames[font]} ${px}`, fontfile: fontFiles[font], rgba: true, dpi: 72 } }).png().toBuffer({ resolveWithObject: true });
    if (info.width <= maxWidth) return { input: data, width: info.width, height: info.height, font_size: px, text, font: relative(fontFiles[font]) };
  }
  throw new Error(`Text exceeds the safe area even at minimum font size: ${text}`);
}

async function encode(input, output, { width, height, alpha = false, limit = 8 * 1024 * 1024, info = {} }) {
  let pipeline = sharp(input).toColourspace('srgb');
  pipeline = alpha ? pipeline.ensureAlpha() : pipeline.removeAlpha();
  await pipeline.png({ compressionLevel: 9 }).toFile(output);
  const meta = await sharp(output).metadata();
  const bytes = (await fs.stat(output)).size;
  if (meta.width !== width || meta.height !== height || meta.channels !== (alpha ? 4 : 3)) throw new Error(`Unexpected dimensions or channels: ${output}`);
  if (bytes > limit) throw new Error(`File exceeds its size budget: ${output}`);
  assets.push({ file: relative(output), width, height, channels: meta.channels, bytes, sha256: await sha(output), ...info });
}

async function feature() {
  const art = path.join(ROOT, 'art/den-key-art-v2.png');
  const wordmark = path.join(MOBILE, 'assets/ui/wordmark.png');
  const artBuffer = await sharp(art).resize(1024, 500, { fit: 'cover' }).toBuffer();
  const logo = await sharp(wordmark).resize({ width: 359 }).png().toBuffer({ resolveWithObject: true });
  const first = await textLayer('One letter.', { size: 34, minSize: 34, maxWidth: 350, color: '#FBEAC0' });
  const second = await textLayer('A home full of secrets.', { size: 29, minSize: 25, maxWidth: 355, color: '#FBEAC0' });
  const layers = [
    { input: logo.data, left: 42, top: 141 },
    { input: first.input, left: 53, top: 254 },
    { input: second.input, left: 53, top: 300 },
  ];
  const layout = { canvas: [1024, 500], art: relative(art), wordmark: path.relative(LAYOUTS, wordmark), art_fit: 'cover', logo: { left: 42, top: 141, width: logo.info.width, height: logo.info.height }, text: [{ ...first, input: undefined, left: 53, top: 254 }, { ...second, input: undefined, left: 53, top: 300 }], note: 'Promotional illustration. Text remains in the left wall area; fox, letter tiles and dark doorway stay unobscured.' };
  await json(path.join(LAYOUTS, 'feature.json'), layout);
  await encode(await sharp(artBuffer).composite(layers).toBuffer(), path.join(OUT, 'feature-graphic-1024x500.png'), { width: 1024, height: 500, info: { role: 'default', source: 'source/layouts/feature.json', art: relative(art), alt_text: listing.feature_graphic.alt_text } });
}

async function iconsAndControls() {
  const control = path.join(PREVIOUS, 'upload/store-icon-512.png');
  await encode(await fs.readFile(control), path.join(OUT, 'store-icon-512.png'), { width: 512, height: 512, alpha: true, limit: 1024 * 1024, info: { role: 'default-control', source: '../launch-2026-09/upload/store-icon-512.png', alt_text: listing.icon.alt_text } });
  const challenger = path.join(ROOT, 'art/store-icon-challenger-master.png');
  await encode(await sharp(challenger).resize(512, 512).toBuffer(), path.join(ROOT, 'variants/store-icon-challenger-512.png'), { width: 512, height: 512, alpha: true, limit: 1024 * 1024, info: { role: 'experiment-challenger', source: relative(challenger), alt_text: listing.icon.alt_text } });
  for (const filename of ['store-icon-512.png', 'feature-graphic-1024x500.png']) await fs.copyFile(path.join(PREVIOUS, 'upload', filename), path.join(ROOT, 'source/controls', filename));
  const previousCopy = path.join(PREVIOUS, 'copy/listing-en-US.json');
  await fs.copyFile(previousCopy, path.join(ROOT, 'source/controls/listing-en-US.json'));
  await json(path.join(ROOT, 'source/controls/rollback.json'), { previous_campaign: 'launch-2026-09', repository_directory: 'mobile/assets/Play_store/launch-2026-09', phone_images: 'Restore the previous campaign’s eight upload/phone images in their previous numbered order. They remain in the repository and are not duplicated in this package.', control_files: await Promise.all(['store-icon-512.png', 'feature-graphic-1024x500.png', 'listing-en-US.json'].map(async (file) => ({ file, sha256: await sha(path.join(ROOT, 'source/controls', file)) }))), publication_state: 'This is a rollback reference for the saved previous campaign; it does not verify current Play Console contents.' });
}

async function phone(item) {
  const capture = path.join(ROOT, 'raw', `${item.slug}.png`);
  if (!(await exists(capture))) { missing.push(relative(capture)); if (skipMissing) return; throw new Error(`Missing real capture: ${capture}`); }
  const meta = await sharp(capture).metadata();
  const palette = item.order === 4 ? palettes.dark : palettes.light;
  const heading = await textLayer(item.headline, { color: palette.heading, maxWidth: 928, size: 82, minSize: 60 });
  const support = await textLayer(item.subtitle, { font: 'body', color: palette.support, maxWidth: 924, size: 38, minSize: 31 });
  const scaled = await sharp(capture).resize({ width: 900, height: 1616, fit: 'inside', withoutEnlargement: false }).png().toBuffer({ resolveWithObject: true });
  const left = Math.round((1080 - scaled.info.width) / 2);
  const top = 248;
  const frame = svg(1080, 1920, `<rect x="${left - 3}" y="${top - 3}" width="${scaled.info.width + 6}" height="${scaled.info.height + 6}" rx="4" fill="${palette.edge}"/><rect x="${left}" y="219" width="105" height="4" fill="${palette.line}"/>`);
  const composed = await sharp({ create: { width: 1080, height: 1920, channels: 3, background: palette.background } }).composite([{ input: frame }, { input: heading.input, left: 76, top: 75 }, { input: support.input, left: 78, top: 163 }, { input: scaled.data, left, top }]).toBuffer();
  await json(path.join(LAYOUTS, `${item.slug}.json`), { canvas: [1080, 1920], palette, caption_region_fraction: top / 1920, heading: { ...heading, input: undefined, left: 76, top: 75 }, subtitle: { ...support, input: undefined, left: 78, top: 163 }, capture: { file: relative(capture), sha256: await sha(capture), original: [meta.width, meta.height], rendered: [scaled.info.width, scaled.info.height], left, top, fit: 'inside', crop: false, retouched: false }, note: 'The full original screen is scaled uniformly; game UI, progress and controls are not altered.' });
  await encode(composed, path.join(OUT, 'phone', `${item.slug}.png`), { width: 1080, height: 1920, info: { role: 'default', source: `source/layouts/${item.slug}.json`, capture: relative(capture), capture_sha256: await sha(capture), original_capture_dimensions: [meta.width, meta.height], caption_region_fraction: top / 1920, alt_text: item.alt_text } });
}

async function pendingPhoneLayouts() {
  const cropConfig = path.join(LAYOUTS, 'opener-crops.json');
  if (!(await exists(cropConfig))) await json(cropConfig, { reviewed: false, coordinate_system: 'Each rectangle uses normalized left, top, width and height from 0 to 1 in its original capture.', before: null, after: null, instructions: 'Inspect the genuine before and after images. Set rectangles around their two relevant word rows, verify that no meaningful gameplay state is removed, then set reviewed to true. No crop bounds have been visually verified in this environment.' });
  for (const item of listing.screenshots) {
    const capture = path.join(ROOT, 'raw', `${item.slug}.png`);
    const output = path.join(LAYOUTS, `${item.slug}.json`);
    if (await exists(capture)) continue;
    missing.push(relative(capture));
    const palette = item.order === 4 ? palettes.dark : palettes.light;
    const heading = await textLayer(item.headline, { color: palette.heading, maxWidth: 928, size: 82, minSize: 60 });
    const support = await textLayer(item.subtitle, { font: 'body', color: palette.support, maxWidth: 924, size: 38, minSize: 31 });
    await json(output, { status: 'template-awaiting-authentic-capture', canvas: [1080, 1920], palette, caption_region_fraction: 248 / 1920, heading: { ...heading, input: undefined, left: 76, top: 75 }, subtitle: { ...support, input: undefined, left: 78, top: 163 }, capture: { file: relative(capture), maximum_rendered_size: [900, 1616], horizontal_alignment: 'center', top: 248, fit: 'inside', crop: false, retouched: false }, capture_brief: item.capture, note: 'This is an editable layout template, not a completed or verified screenshot. The exporter requires the genuine current capture before producing a Play upload image.' });
  }
  if (!(await exists(path.join(ROOT, 'raw/01-one-letter-result.png')))) {
    missing.push('raw/01-one-letter-result.png');
    await json(path.join(LAYOUTS, `${listing.opener_challenger.slug}.json`), { status: 'template-awaiting-authentic-before-and-after-captures', canvas: [1080, 1920], headline: listing.opener_challenger.headline, subtitle: listing.opener_challenger.subtitle, captures: ['raw/01-one-letter.png', 'raw/01-one-letter-result.png'], panels: ['Clearly labelled BEFORE THE MOVE crop of the genuine two-row board', 'Clearly labelled AFTER THE MOVE crop of the same board after the legal L insertion'], note: 'Inspect both raw captures and set normalized crop bounds in opener-crops.json before exporting. No synthetic tiles or reconstructed UI.' });
  }
}

async function openerChallenger() {
  const before = path.join(ROOT, 'raw/01-one-letter.png');
  const after = path.join(ROOT, 'raw/01-one-letter-result.png');
  if (!(await exists(before)) || !(await exists(after))) { missing.push('raw/01-one-letter-result.png'); if (skipMissing) return; throw new Error('The opener challenger needs both genuine before and after captures.'); }
  const configFile = path.join(LAYOUTS, 'opener-crops.json');
  const crops = JSON.parse(await fs.readFile(configFile, 'utf8'));
  if (crops.reviewed !== true) {
    missing.push('source/layouts/opener-crops.json: genuine before/after crop bounds require visual review');
    if (skipMissing) return;
    throw new Error('Inspect both genuine opener captures, set normalized bounds in source/layouts/opener-crops.json, and set reviewed:true before exporting the challenger.');
  }
  for (const name of ['before', 'after']) {
    const c = crops[name];
    if (!c || !['left', 'top', 'width', 'height'].every((key) => Number.isFinite(c[key])) || c.left < 0 || c.top < 0 || c.width <= 0 || c.height <= 0 || c.left + c.width > 1 || c.top + c.height > 1) throw new Error(`Invalid normalized ${name} crop rectangle.`);
  }
  const item = listing.opener_challenger;
  const heading = await textLayer(item.headline, { size: 82, minSize: 55, maxWidth: 928 });
  const support = await textLayer(item.subtitle, { font: 'body', size: 38, minSize: 29, maxWidth: 924, color: palettes.light.support });
  const composites = [{ input: heading.input, left: 76, top: 75 }, { input: support.input, left: 78, top: 163 }];
  const panels = [];
  for (const [index, [name, file]] of Object.entries([['before', before], ['after', after]])) {
    const m = await sharp(file).metadata();
    const c = crops[name];
    const region = { left: Math.round(m.width * c.left), top: Math.round(m.height * c.top), width: Math.round(m.width * c.width), height: Math.round(m.height * c.height) };
    const panel = await sharp(file).extract(region).resize({ width: 916, height: 660, fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
    const top = Number(index) === 0 ? 353 : 1135;
    const label = await textLayer(Number(index) === 0 ? 'BEFORE THE MOVE' : 'AFTER THE MOVE', { font: 'body', size: 30, minSize: 30, color: palettes.light.support, maxWidth: 920 });
    composites.push({ input: label.input, left: 82, top: top - 55 }, { input: panel.data, left: Math.round((1080 - panel.info.width) / 2), top });
    panels.push({ capture: relative(file), capture_sha256: await sha(file), crop_pixels: region, rendered: [panel.info.width, panel.info.height], top });
  }
  composites.push({ input: svg(1080, 1920, '<path d="M 540 1026 v 46 m -18 -18 l 18 18 l 18 -18" stroke="#B39759" stroke-width="7" fill="none" stroke-linecap="round"/>') });
  const composed = await sharp({ create: { width: 1080, height: 1920, channels: 3, background: palettes.light.background } }).composite(composites).toBuffer();
  await json(path.join(LAYOUTS, `${item.slug}.json`), { canvas: [1080, 1920], heading: { ...heading, input: undefined }, subtitle: { ...support, input: undefined }, panels, note: 'Clearly separated genuine board crops demonstrate a single legal move. The decorative arrow sits outside the gameplay image.' });
  await encode(composed, path.join(ROOT, 'variants', `${item.slug}.png`), { width: 1080, height: 1920, info: { role: 'experiment-challenger', source: `source/layouts/${item.slug}.json`, capture: panels.map((p) => p.capture), alt_text: item.alt_text } });
}

async function videoMetadata() {
  const file = path.join(OUT, 'video/wordshift-trailer-30s.mp4');
  if (!(await exists(file))) return;
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }));
  const stream = probe.streams.find((s) => s.codec_type === 'video');
  assets.push({ file: relative(file), role: 'youtube-promo-source', width: stream.width, height: stream.height, duration_seconds: Number(probe.format.duration), bytes: (await fs.stat(file)).size, sha256: await sha(file), codec: stream.codec_name, pixel_format: stream.pix_fmt, note: 'Play Console takes a qualifying YouTube video URL, not an MP4 file upload.' });
}

async function contactSheet() {
  const completed = assets.filter((a) => a.file.startsWith('upload/phone/')).length === 8;
  const width = 1200, height = completed ? 1660 : 1040;
  const heading = await textLayer('WordShift · Google Play refresh', { size: 42, minSize: 42, maxWidth: 1128, color: '#F7EDDA' });
  const layers = [{ input: heading.input, left: 36, top: 26 }];
  const featureBuffer = await sharp(path.join(OUT, 'feature-graphic-1024x500.png')).resize(888, 434).toBuffer();
  layers.push({ input: featureBuffer, left: 36, top: 102 });
  layers.push({ input: await sharp(path.join(OUT, 'store-icon-512.png')).resize(170, 170).toBuffer(), left: 970, top: 113 });
  layers.push({ input: await sharp(path.join(ROOT, 'variants/store-icon-challenger-512.png')).resize(170, 170).toBuffer(), left: 970, top: 349 });
  for (const [label, top] of [['CURRENT ICON', 300], ['ICON CHALLENGER', 532]]) {
    const text = await textLayer(label, { font: 'body', size: 17, minSize: 17, maxWidth: 208, color: '#DDCEAE' });
    layers.push({ input: text.input, left: 963, top });
  }
  for (const item of listing.screenshots) {
    const file = path.join(OUT, 'phone', `${item.slug}.png`);
    const col = (item.order - 1) % 4, row = Math.floor((item.order - 1) / 4);
    if (!completed) {
      const left = 36 + col * 286, top = 609 + row * 188;
      layers.push({ input: svg(270, 161, '<rect width="270" height="161" rx="9" fill="#284C40"/>'), left, top });
      const title = await textLayer(`${item.order}. ${item.headline}`, { size: 18, minSize: 15, maxWidth: 242, color: '#F7EDDA' });
      const pending = await textLayer('CURRENT CAPTURE PENDING', { font: 'body', size: 12, minSize: 12, maxWidth: 242, color: '#DDCEAE' });
      layers.push({ input: title.input, left: left + 14, top: top + 29 }, { input: pending.input, left: left + 14, top: top + 88 });
      continue;
    }
    if (!(await exists(file))) continue;
    layers.push({ input: await sharp(file).resize(270, 480).toBuffer(), left: 36 + col * 286, top: 592 + row * 525 });
    const label = await textLayer(`${item.order}. ${item.headline}`, { font: 'body', size: 16, minSize: 12, maxWidth: 270, color: '#F7EDDA' });
    layers.push({ input: label.input, left: 36 + col * 286, top: 1087 + row * 525 });
  }
  await sharp({ create: { width, height, channels: 3, background: '#173E34' } }).composite(layers).png({ compressionLevel: 9 }).toFile(path.join(ROOT, 'contact-sheet.png'));
}

async function previews() {
  const imageRef = async (file, inline) => inline ? `data:image/png;base64,${(await fs.readFile(path.join(ROOT, file))).toString('base64')}` : file;
  for (const inline of [false, true]) {
    const imgs = new Map();
    for (const asset of assets.filter((a) => a.file.endsWith('.png'))) imgs.set(asset.file, await imageRef(asset.file, inline));
    const imageMarkup = (file, alt) => `<img loading="lazy" src="${imgs.get(file)}" alt="${escape(alt)}">`;
    const gallery = listing.screenshots.map((s) => `<figure>${imgs.has(`upload/phone/${s.slug}.png`) ? imageMarkup(`upload/phone/${s.slug}.png`, s.alt_text) : '<div class="pending">Current gameplay capture pending<br><small>Editable layout prepared</small></div>'}<figcaption>${s.order}. ${escape(s.headline)}<br><span>${escape(s.subtitle)}</span></figcaption></figure>`).join('');
    const challengerFile = `variants/${listing.opener_challenger.slug}.png`;
    const videoExists = await exists(path.join(OUT, 'video/wordshift-trailer-30s.mp4'));
    const video = videoExists && !inline ? '<video controls preload="metadata" playsinline src="upload/video/wordshift-trailer-30s.mp4"></video>' : videoExists ? '<p>The 30-second portrait trailer is supplied separately in the complete package.</p>' : '<p>Capture and final trailer export are pending. The complete edit timeline and caption track are included as production sources.</p>';
    const doc = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WordShift — Play Store refresh</title><style>*{box-sizing:border-box}body{margin:0;background:#173e34;color:#f7edda;font:17px/1.6 system-ui,sans-serif}main{max-width:1240px;margin:auto;padding:38px 28px}h1,h2{font-family:Georgia,serif;line-height:1.2}h1{font-size:42px}h2{font-size:28px;margin-top:42px}img{max-width:100%;display:block}a{color:#ebcc83}.hero{display:grid;grid-template-columns:1fr 156px;gap:24px;align-items:center}.gallery{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px 18px;margin:30px 0}figure{margin:0;min-width:0}figcaption{font-size:14px;line-height:1.45;margin-top:11px}figcaption span,.note{color:#c7d3c5}.variants{display:grid;grid-template-columns:230px 156px;gap:32px;align-items:start}.copy{max-width:860px;background:#f7edda;color:#274c3e;padding:30px;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere}.note{max-width:940px;font-size:14px}video{display:block;max-height:720px;max-width:100%;background:#102824}.pill{display:inline-block;border:1px solid #7a937d;border-radius:30px;padding:3px 12px;font-size:13px}@media(max-width:750px){main{padding:22px 16px}h1{font-size:31px}.hero{grid-template-columns:1fr 78px;gap:12px}.gallery{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 12px}.variants{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.copy{padding:20px}}</style><main><span class="pill">English · approved creative direction</span><h1>One letter.<br>A home full of secrets.</h1><p>A clearer puzzle hook, a lived-in woodland home, and a first glimpse of the mystery after dark.</p><div class="hero">${imageMarkup('upload/feature-graphic-1024x500.png', listing.feature_graphic.alt_text)}${imageMarkup('upload/store-icon-512.png', listing.icon.alt_text)}</div><h2>The eight-image story</h2><div class="gallery">${gallery}</div><h2>30-second portrait trailer</h2>${video}<h2>Separate experiment challengers</h2><p class="note">Keep the current icon in the initial upload. Test one challenger at a time, with the other listing elements held constant.</p><div class="variants">${imgs.has(challengerFile) ? `<figure>${imageMarkup(challengerFile, listing.opener_challenger.alt_text)}<figcaption>Alternate opening image</figcaption></figure>` : ''}<figure>${imageMarkup('variants/store-icon-challenger-512.png', listing.icon.alt_text)}<figcaption>Simpler Ember icon</figcaption></figure></div><h2>Paste-ready listing copy</h2><section class="copy"><strong>${escape(listing.app_name)}</strong>\n\n${escape(listing.short_description)}\n\n${escape(listing.full_description)}</section><p class="note">The screenshots show actual React Native web rendering with staged attainable saves. Full screens are scaled uniformly; the alternate opener uses clearly separated genuine board crops. This package does not establish signed Android verification or publication. The feature and icon illustrations are promotional artwork.</p>${inline ? '' : '<p><a href="copy/full-description.txt">Full description</a> · <a href="alt-text.tsv">Alt text</a> · <a href="manifest.json">Specifications and checksums</a></p>'}</main></html>`;
    const status = missing.length ? '<p class="status"><strong>Artwork and copy are ready. Current gameplay screenshots and trailer capture are pending.</strong><br>The cards below are layout briefs, not upload screenshots. No store publication has been verified.</p>' : '';
    const withStatus = doc.replace('</style>', '.pending{min-height:146px;border:1px solid #688477;border-radius:10px;background:#284c40;padding:22px 16px;font-size:16px;color:#f7edda}.pending small{color:#c7d3c5}.status{padding:18px;border:1px solid #9d915f;background:#2b493c;border-radius:10px;max-width:960px}</style>').replace('<h2>The eight-image story</h2>', `${status}<h2>The eight-image story</h2>`);
    const finalDoc = missing.length ? withStatus.replace('The screenshots show actual React Native web rendering with staged attainable saves. Full screens are scaled uniformly; the alternate opener uses clearly separated genuine board crops.', 'The planned screenshots must use actual React Native rendering with documented capture states. No final gameplay screenshot is included in this partial review. The completed exporter preserves full-screen proportions and separates genuine before-and-after crops in the alternate opener.') : withStatus;
    await fs.writeFile(path.join(ROOT, inline ? 'preview-standalone.html' : 'preview.html'), finalDoc);
  }
}

for (const [field, limit] of [['app_name', 30], ['short_description', 80], ['full_description', 4000]]) if ([...listing[field]].length > limit) throw new Error(`${field} exceeds ${limit} characters.`);
for (const asset of [...listing.screenshots, listing.opener_challenger, listing.feature_graphic, listing.icon]) if ([...asset.alt_text].length > 140) throw new Error(`Alt text exceeds 140 characters: ${asset.alt_text}`);
await feature();
await iconsAndControls();
await pendingPhoneLayouts();
if (!artOnly) {
  for (const item of listing.screenshots) await phone(item);
  await openerChallenger();
}
await videoMetadata();
const rawProvenance = path.join(ROOT, 'raw/provenance.json');
const provenance = await exists(rawProvenance) ? JSON.parse(await fs.readFile(rawProvenance, 'utf8')) : null;
const hasGameplayExports = assets.some((a) => a.file.startsWith('upload/phone/'));
await json(path.join(ROOT, 'manifest.json'), { generated_by: 'node mobile/scripts/store/buildRefresh.mjs', campaign: listing.campaign, locale: listing.locale, status: artOnly || missing.length ? 'production-in-progress' : 'image-assets-complete', missing_sources: [...new Set(missing)], typography: { heading: 'Epunda Slab Bold, bundled TTF', supporting: 'Figtree Regular, bundled TTF', renderer: 'Sharp / libvips / Pango, bundled font paths and measured pixel bounds' }, gameplay_provenance: hasGameplayExports ? 'Actual React Native web captures supplied to the exporter. Save-state provenance is recorded separately with raw captures. Default phone images preserve full screens and uniformly scale them; the alternate opener separates reviewed genuine board crops. Not a signed Android device capture.' : 'Planned: authentic current React Native gameplay captures with documented save-state provenance. No gameplay image has been exported or verified for this campaign in this environment. Layout templates are prepared; current capture inputs are pending.', capture_provenance: provenance, generated_art: 'Built-in image generation. Prompts and references: source/artwork-prompts.json. Promotional artwork appears only in the feature graphic and icon.', publication_state: 'Package export does not establish Play Console publication.', assets });
await fs.writeFile(path.join(ROOT, 'alt-text.tsv'), ['file\talt_text', ...assets.filter((a) => a.alt_text).map((a) => `${a.file}\t${a.alt_text}`)].join('\n') + '\n');
await contactSheet();
await previews();
console.log(JSON.stringify({ campaign: listing.campaign, status: artOnly || missing.length ? 'in-progress' : 'image-assets-complete', assets: assets.map(({ file, width, height, bytes }) => ({ file, width, height, bytes })), missing }, null, 2));
