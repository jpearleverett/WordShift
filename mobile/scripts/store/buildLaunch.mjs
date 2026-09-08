#!/usr/bin/env node
// Reproducible store typesetting around untouched captures and generated key art.
// Run from mobile: node scripts/store/buildLaunch.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import sharp from 'sharp';

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROOT = path.join(MOBILE, 'assets/Play_store/launch-2026-09');
const OUT = path.join(ROOT, 'upload');
const SOURCE = path.join(ROOT, 'source/layouts');
const listing = JSON.parse(await fs.readFile(path.join(MOBILE, 'docs/store-launch/listing-en-US.json'), 'utf8'));
const sources = [
  '02-move-one-letter.png', '03-make-two-words.png', '05-build-a-home.png',
  '06-meet-ember.png', '12-make-it-yours.png', '09-daily-challenge.png',
  '10-puzzle-styles.png', '08-your-choice.png',
];
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const relative = (absolute) => path.relative(SOURCE, absolute).split(path.sep).join('/');
const fonts = `@font-face{font-family:Epunda;src:url('${relative(path.join(MOBILE, 'assets/fonts/EpundaSlab-Bold.ttf'))}')}@font-face{font-family:Figtree;src:url('${relative(path.join(MOBILE, 'assets/fonts/Figtree-Regular.ttf'))}')}`;
const html = (css, body) => `<!doctype html><html lang="en"><meta charset="utf-8"><title>WordShift store artwork</title><style>${fonts}*{box-sizing:border-box}html,body{margin:0}body{overflow:hidden}${css}</style><body>${body}</body></html>`;
await fs.mkdir(SOURCE, { recursive: true });
await fs.mkdir(path.join(OUT, 'phone'), { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.WORDSHIFT_CHROMIUM || undefined,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=256'],
});
const manifest = [];

async function render(name, document, width, height, output, alpha = false) {
  const source = path.join(SOURCE, `${name}.html`);
  await fs.writeFile(source, document);
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  try {
    await page.goto(pathToFileURL(source).href);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode()));
    });
    const overflow = await page.locator('[data-fit]').evaluateAll((nodes) => nodes.filter((n) => n.scrollWidth > n.clientWidth || n.scrollHeight > n.clientHeight).map((n) => n.textContent));
    if (overflow.length) throw new Error(`Clipped copy in ${name}: ${overflow.join(', ')}`);
    const png = await page.screenshot({ type: 'png', animations: 'disabled' });
    // Encoding only: all image composition and typesetting above is native HTML/CSS.
    const encoder = sharp(png).toColourspace('srgb');
    await (alpha ? encoder.ensureAlpha() : encoder.removeAlpha()).png({ compressionLevel: 9 }).toFile(output);
    const metadata = await sharp(output).metadata();
    const bytes = (await fs.stat(output)).size;
    if (metadata.width !== width || metadata.height !== height || metadata.channels !== (alpha ? 4 : 3)) throw new Error(`Incorrect output format: ${name}`);
    if (bytes > (alpha ? 1024 * 1024 : 8 * 1024 * 1024)) throw new Error(`Oversized output: ${name}`);
    const sha256 = createHash('sha256').update(await fs.readFile(output)).digest('hex');
    manifest.push({ file: path.relative(ROOT, output), width, height, channels: metadata.channels, bytes, sha256, source: path.relative(ROOT, source) });
  } finally { await page.close(); }
}

try {
  await render('feature', html(`body{width:1024px;height:500px;background:#17483c}.art{position:absolute;width:1024px;height:500px;object-fit:cover}.logo{position:absolute;left:56px;top:116px;width:460px;height:115px;object-fit:contain}.tagline{position:absolute;left:82px;top:253px;margin:0;color:#fff0cb;font:29px/1.35 Epunda;width:425px;text-shadow:0 2px 7px #102b24}`, `<img class="art" src="${relative(path.join(ROOT, 'art/den-key-art.png'))}" alt=""><img class="logo" src="${relative(path.join(MOBILE, 'assets/ui/wordmark.png'))}" alt="WordShift"><p class="tagline" data-fit>A little wordplay.<br>A world to uncover.</p>`), 1024, 500, path.join(OUT, 'feature-graphic-1024x500.png'));
  await render('icon', html('body,img{width:512px;height:512px;display:block}', `<img src="${relative(path.join(ROOT, 'art/store-icon-master.png'))}" alt="">`), 512, 512, path.join(OUT, 'store-icon-512.png'), true);
  for (let i = 0; i < listing.screenshots.length; i += 1) {
    const item = listing.screenshots[i];
    const imagePath = path.join(ROOT, 'raw', sources[i]);
    const raw = await sharp(imagePath).metadata();
    if (raw.width !== 1170 || raw.height !== 2100) throw new Error(`Expected 1170x2100 capture: ${sources[i]}`);
    const dark = i === 7;
    const css = `body{width:1080px;height:1920px;background:${dark ? '#233b35' : '#f7edda'};color:${dark ? '#f8e8bf' : '#274c3e'}}.wash{position:absolute;left:0;right:0;top:300px;bottom:0;background:${dark ? 'linear-gradient(#233b35,#152b2c)' : 'linear-gradient(#f7edda,#ddd4b9)'}}header{position:absolute;left:84px;top:66px;width:925px;height:181px}h1{font:86px/1.13 Epunda;letter-spacing:-2px;margin:0;height:106px;white-space:nowrap}p{font:35px/1.3 Figtree;margin:17px 0 0;height:50px;white-space:nowrap;color:${dark ? '#d1c8a9' : '#586653'}}.capture{position:absolute;left:90px;top:270px;width:900px;height:${900 * 2100 / 1170}px;border-radius:22px;box-shadow:0 18px 42px #13291c30;display:block}.line{position:absolute;top:251px;left:90px;width:104px;height:4px;background:#b39759}`;
    const document = html(css, `<div class="wash"></div><header><h1 data-fit>${escape(item.headline)}</h1><p data-fit>${escape(item.subtitle)}</p></header><div class="line"></div><img class="capture" src="${relative(imagePath)}" alt="${escape(item.alt_text)}">`);
    await render(item.slug, document, 1080, 1920, path.join(OUT, 'phone', `${item.slug}.png`));
    manifest.at(-1).capture = `raw/${sources[i]}`;
    manifest.at(-1).alt_text = item.alt_text;
    manifest.at(-1).caption_region_fraction = 270 / 1920;
  }
  const contactStyle = 'body{width:1200px;height:1610px;background:#173e34;color:#f6ecd5;font-family:Figtree}h1{font:36px Epunda;margin:24px 36px}.feature{position:absolute;left:36px;top:95px;width:900px;height:439.453px}.icon{position:absolute;left:978px;top:125px;width:180px;height:180px}.meta{position:absolute;left:978px;top:330px;width:190px;font:21px/1.5 Figtree}.grid{position:absolute;left:36px;right:36px;top:580px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px 16px}figure{margin:0}figure img{width:100%;display:block}figcaption{font:15px Figtree;margin-top:7px}';
  await render('contact-sheet', html(contactStyle, `<h1>WordShift — Google Play launch set</h1><img class="feature" src="${relative(path.join(OUT, 'feature-graphic-1024x500.png'))}" alt=""><img class="icon" src="${relative(path.join(OUT, 'store-icon-512.png'))}" alt=""><div class="meta">8 phone images<br>Feature graphic<br>Store icon<br>English copy</div><div class="grid">${listing.screenshots.map((s) => `<figure><img src="${relative(path.join(OUT, 'phone', `${s.slug}.png`))}" alt=""><figcaption>${s.order}. ${escape(s.headline)}</figcaption></figure>`).join('')}</div>`), 1200, 1610, path.join(ROOT, 'contact-sheet.png'));
  manifest.pop(); // Review artifact, not an eleventh Play Console upload.
} finally { await browser.close(); }

await fs.writeFile(path.join(ROOT, 'manifest.json'), `${JSON.stringify({ generated_by: 'node mobile/scripts/store/buildLaunch.mjs', locale: 'en-US', gameplay_provenance: 'Actual React Native web rendering at 390x700, deviceScaleFactor 3, staged attainable local save states. Gameplay pixels are unchanged; full captures are scaled uniformly inside editorial layouts. Not an Android device capture.', generated_art: 'Built-in image_gen; prompts and references in source/prompts.json. Promotional art is used only in the feature graphic and store icon.', assets: manifest }, null, 2)}\n`);
await fs.writeFile(path.join(ROOT, 'alt-text.tsv'), ['file\talt_text', `feature-graphic-1024x500.png\t${listing.feature_graphic.alt_text}`, `store-icon-512.png\t${listing.icon.alt_text}`, ...listing.screenshots.map((s) => `phone/${s.slug}.png\t${s.alt_text}`)].join('\n') + '\n');
await fs.mkdir(path.join(ROOT, 'copy'), { recursive: true });
for (const file of ['app-name.txt', 'short-description.txt', 'full-description.txt', 'listing-en-US.json', 'README.md', 'claims-and-sources.md']) await fs.copyFile(path.join(MOBILE, 'docs/store-launch', file), path.join(ROOT, 'copy', file));
const preview = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WordShift — Google Play launch set</title><style>*{box-sizing:border-box}body{margin:0;background:#173e34;color:#f6ecd5;font:17px/1.6 system-ui,sans-serif}main{max-width:1240px;margin:auto;padding:40px 28px}h1{font:700 40px Georgia,serif;line-height:1.2}h2{font:700 25px Georgia,serif}a{color:#ebcc83}.hero{display:grid;grid-template-columns:1fr 160px;gap:24px;align-items:center}.hero img{width:100%;display:block}.gallery{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:32px}figure{margin:0}figure img{width:100%;display:block}figcaption{font-size:13px;padding:9px 0;color:#c7d3c5}.copy{max-width:760px;background:#f7edda;color:#274c3e;padding:30px;margin-top:40px;border-radius:12px;white-space:pre-wrap}.note{color:#c7d3c5;font-size:14px;max-width:900px}@media(max-width:750px){.gallery{grid-template-columns:repeat(2,1fr)}.hero{grid-template-columns:1fr 85px}main{padding:24px 16px}h1{font-size:30px}}</style><main><h1>WordShift<br>Google Play launch set</h1><p>One letter moves. Two words change. A little home grows.</p><div class="hero"><a href="upload/feature-graphic-1024x500.png"><img src="upload/feature-graphic-1024x500.png" alt="${escape(listing.feature_graphic.alt_text)}"></a><a href="upload/store-icon-512.png"><img src="upload/store-icon-512.png" alt="${escape(listing.icon.alt_text)}"></a></div><div class="gallery">${listing.screenshots.map((s) => `<figure><a href="upload/phone/${s.slug}.png"><img src="upload/phone/${s.slug}.png" alt="${escape(s.alt_text)}"></a><figcaption>${s.order}. ${escape(s.headline)}</figcaption></figure>`).join('')}</div><section class="copy"><strong>${escape(listing.app_name)}</strong>\n\n${escape(listing.short_description)}\n\n${escape(listing.full_description)}</section><p class="note">Upload the eight numbered phone PNGs in order. Feature: 1024×500 opaque PNG. Store icon: 512×512 RGBA PNG. Phone images: 1080×1920 opaque PNG. Copy and alt text are supplied separately. The screenshots show actual app code rendered on web with staged, attainable saves; compare font/layout against the signed Android build before submitting. The two illustrations are promotional artwork, not gameplay screenshots.</p><p><a href="copy/full-description.txt">Full description</a> · <a href="alt-text.tsv">Asset alt text</a> · <a href="manifest.json">Asset specifications</a></p></main></html>`;
await fs.writeFile(path.join(ROOT, 'preview.html'), preview);
console.log(JSON.stringify(manifest.map(({ file, width, height, bytes }) => ({ file, width, height, bytes })), null, 2));
