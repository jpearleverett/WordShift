/**
 * Source-derived promotional reconstruction, NOT a gameplay capture.
 * Only Sharp/Pango and SVG shapes are used. This never starts a browser/app.
 * The source palette, fonts, wordmark and UI sprites stay authoritative;
 * native text layout, the exact screen geometry, and motion are approximated.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import vm from 'node:vm';
import sharp from 'sharp';
import ts from 'typescript';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { const v = clamp(n); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;
const sourceFiles = [
  'src/components/LetterTile.tsx', 'src/components/Row.tsx',
  'src/components/PuzzleAtmosphere.tsx', 'src/components/AnimatedBackground.tsx',
  'src/components/puzzle/AnimatedLogo.tsx', 'src/components/puzzle/ActionButton.tsx',
  'src/constants/tileLayout.ts', 'src/constants/wordLists.ts',
  'src/theme/colors.ts', 'src/theme/fonts.ts', 'src/theme/typeScale.ts',
  'src/styles/appStyles.ts',
];
const assets = [
  'assets/ui/wordmark.png', 'assets/ui/home.png', 'assets/ui/rules.png',
  'assets/ui/undo.png', 'assets/ui/hint.png', 'assets/ui/restart.png',
  'assets/ui/check_badge.png', 'assets/ui/difficulty/easy.png', 'assets/ui/chevron.png',
  'assets/story/optimized/kept-table-header.webp',
  'assets/fonts/EpundaSlab-Bold.ttf', 'assets/fonts/Figtree-Bold.ttf',
];

async function loadPureSource(file) {
  const source = await fs.readFile(path.join(mobile, file), 'utf8');
  const exports = {};
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, { exports, require: spec => { throw new Error(`Unexpected native dependency: ${spec}`); } }, { timeout: 1000 });
  return exports;
}

export async function createPuzzleRenderer({ width = 1080, height = 1540 } = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 390 || height < 550) throw new Error('Use a portrait canvas of at least 390 × 550.');
  const palette = await loadPureSource('src/theme/colors.ts');
  const geometry = await loadPureSource('src/constants/tileLayout.ts');
  const scale = Math.min(width / 390, height / 556);
  const dw = width / scale;
  const dh = height / scale;
  const cx = dw / 2;
  const p = n => Math.round(n * scale);
  const rect = (x, y, w, h, r, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
  const svg = body => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${dw} ${dh}">${body}</svg>`);
  const fontFile = name => path.join(mobile, `assets/fonts/${name === 'tile' ? 'EpundaSlab-Bold' : 'Figtree-Bold'}.ttf`);
  const textCache = new Map();
  async function text(text, size, color, face = 'ui') {
    const key = `${text}/${size}/${color}/${face}`;
    if (!textCache.has(key)) {
      textCache.set(key, sharp({ text: { text: `<span foreground="${color}">${esc(text)}</span>`, font: `${face === 'tile' ? 'Epunda Slab Bold' : 'Figtree Bold'} ${size * scale}`, fontfile: fontFile(face), rgba: true, dpi: 72 } }).png().toBuffer({ resolveWithObject: true }));
    }
    return textCache.get(key);
  }
  const sprites = new Map();
  async function sprite(file, w, h = w, rotation = 0) {
    const key = `${file}/${w}/${h}/${rotation}`;
    if (!sprites.has(key)) sprites.set(key, sharp(path.join(mobile, file)).resize(p(w), p(h), { fit: 'contain', background: '#00000000', kernel: 'nearest' }).rotate(rotation, { background: '#00000000' }).png().toBuffer({ resolveWithObject: true }));
    return sprites.get(key);
  }
  async function centeredText(value, x, y, size, color, face = 'ui') {
    const t = await text(value, size, color, face);
    return { input: t.data, left: p(x) - Math.round(t.info.width / 2), top: p(y) - Math.round(t.info.height / 2) };
  }
  async function centeredSprite(file, x, y, w, h = w, rotation = 0) {
    const s = await sprite(file, w, h, rotation);
    return { input: s.data, left: p(x) - Math.round(s.info.width / 2), top: p(y) - Math.round(s.info.height / 2) };
  }

  const theme = palette.getPhaseTheme(0);
  const baseShapes = `<defs><linearGradient id="wash" x2="0" y2="1"><stop stop-color="#102320" stop-opacity=".16"/><stop offset=".48" stop-color="#5c705a" stop-opacity=".12"/><stop offset="1" stop-color="#b98a4b" stop-opacity=".1"/></linearGradient></defs>${rect(0, 0, dw, dh, 0, theme.bgPrimary)}${rect(0, 0, dw, dh, 0, 'url(#wash)')}${rect(0, 0, 6, dh, 0, '#7C6245', 'opacity=".1"')}${rect(dw - 6, 0, 6, dh, 0, '#7C6245', 'opacity=".1"')}${rect(16, 9, dw - 32, 1, 0, '#725838', 'opacity=".09"')}${rect(16, dh - 10, dw - 32, 1, 0, '#725838', 'opacity=".09"')}${rect(20, 31, 40, 40, 20, '#FFFFFF', 'opacity=".25"')}${rect(dw - 60, 31, 40, 40, 20, '#FFFFFF', 'opacity=".25"')}${rect(dw - 110, 91, 90, 36, 16, '#140A28', 'fill-opacity=".55" stroke="#B496DC" stroke-opacity=".25"')}`;
  const baseLayers = [
    await centeredSprite('assets/ui/wordmark.png', cx, 50, 236, 59),
    await centeredSprite('assets/ui/home.png', 40, 51, 22),
    await centeredSprite('assets/ui/rules.png', dw - 40, 51, 24),
    await centeredSprite('assets/ui/difficulty/easy.png', dw - 89, 109, 16),
    await centeredText('EASY', dw - 59, 109, 12, '#FFFFFF'),
    await centeredSprite('assets/ui/chevron.png', dw - 35, 109, 10, 10, 90),
  ];
  const tableHeight = p(Math.min(dh * .38, 310));
  const table = await sharp(path.join(mobile, 'assets/story/optimized/kept-table-header.webp')).resize(width, tableHeight, { fit: 'cover' }).removeAlpha().ensureAlpha(.065).png().toBuffer();
  baseLayers.unshift({ input: table, left: 0, top: height - tableHeight });
  const base = await sharp(svg(baseShapes)).composite(baseLayers).png().toBuffer();
  const tileCache = new Map();
  async function tile(char, state, rotation = 0, sizeMul = 1) {
    const key = `${char}/${state}/${rotation}/${sizeMul}`;
    if (!tileCache.has(key)) tileCache.set(key, (async () => {
      const color = state === 'selected' ? { bg: '#EC4899', border: '#9D174D', ink: '#FFFFFF' }
        : state === 'source' ? { ...palette.getTileColor(char), ink: palette.getTileInkColor(palette.getTileColor(char).bg) }
          : state === 'locked' ? { bg: '#CBD5E1', border: '#94A3B8', ink: '#64748B' }
            : { bg: '#EDDFC3', border: '#B29B75', ink: '#4B4032' };
      const tw = 60;
      const th = 72;
      const shapes = `<svg xmlns="http://www.w3.org/2000/svg" width="${p(tw)}" height="${p(th)}" viewBox="0 0 ${tw} ${th}"><rect x="8" y="58" width="44" height="8" rx="6" fill="${color.border}"/><rect x="4" y="4" width="52" height="56" rx="14" fill="${color.bg}"/><path d="M18 4H42Q56 4 56 18V32H4V18Q4 4 18 4Z" fill="#FFF6DB" opacity=".28"/><rect x="10" y="8" width="40" height="16" rx="8" fill="#FFF6DB" opacity=".08"/></svg>`;
      const glyph = await text(char, 24, color.ink, 'tile');
      let input = await sharp(Buffer.from(shapes)).composite([{ input: glyph.data, left: Math.round((p(tw) - glyph.info.width) / 2), top: p(32) - Math.round(glyph.info.height / 2) }]).png().toBuffer();
      if (sizeMul !== 1) input = await sharp(input).resize(Math.round(p(tw) * sizeMul)).png().toBuffer();
      return sharp(input).rotate(rotation, { background: '#00000000' }).png().toBuffer({ resolveWithObject: true });
    })());
    return tileCache.get(key);
  }
  async function tileAt(char, state, x, y, rotation = 0, sizeMul = 1) {
    const t = await tile(char, state, rotation, sizeMul);
    return { input: t.data, left: p(x) - Math.round(t.info.width / 2), top: p(y) - Math.round(t.info.height / 2) };
  }
  const rowTop = [146, 258, 370];
  const tileY = rowTop.map(y => y + 49);
  const standard = (index, count) => cx + geometry.standardLetterCenterOffset(index, count, false);
  const arcLetter = i => cx + geometry.arcLetterCenterOffset(i, 4, false);
  const arcOffset = index => { const norm = index / 8 * 2 - 1; return { y: norm * norm * 18 - 9, rotate: norm * 12 }; };
  const provenance = {
    kind: 'source-derived promotional reconstruction', genuineGameplayCapture: false,
    renderer: 'Sharp/Pango native compositor; SVG geometry; no browser or app runtime',
    canvas: { width, height, sourceLayoutWidthDp: 390, scale },
    phase: 0, board: { before: ['PLAY', 'PANT', 'HEAR'], after: ['PAY', 'PLANT', 'HEAR'], movedLetter: 'L', sourceWord: 'PLAY', sourceIndex: 1, destinationWord: 'PANT', destinationIndex: 1, legalMove: 'Remove L from PLAY to form PAY. Insert L after P in PANT to form PLANT.' },
    faithful: ['Original transparent wordmark and UI icon artwork', 'Bundled Epunda Slab Bold letter font and Figtree Bold chrome font', 'Phase-0 background and default per-letter tile palette read from source', 'Standard tile sizing and drop-fan horizontal positions read from source', 'Painted-token bevel, 3D edge, selection pink, locked tile palette, source/target warm row palette', 'Original kept-table texture at source opacity 0.065', 'Original authored PLAY/PANT/HEAR puzzle and legal L move'],
    approximated: ['Overall 390 dp screen layout is compressed into the review panel, without Android safe areas', 'Native React Native shadows, rasterization, fonts and exact flex layout are not reproduced', 'Drop-slot perspective is approximated by SVG geometry; idle particles are omitted', 'The letter flight and neighboring tile movements are editorial keyframes, not runtime animation', 'No transient message is shown; HINT is abbreviated without the fixture balance', 'No score, purchase, leaderboard, victory or completion is claimed'],
    timing: { selected: [0, 1.3], move: [1.3, 2.8], result: [2.8, 6], note: 'One legal move only; the three-row puzzle is not yet complete.' },
    sources: await Promise.all([...sourceFiles, ...assets].map(async file => ({ file: `mobile/${file}`, sha256: createHash('sha256').update(await fs.readFile(path.join(mobile, file))).digest('hex') }))),
  };

  async function render(timeSeconds = 0) {
    const time = Math.max(0, Number(timeSeconds) || 0);
    const progress = smooth((time - 1.3) / 1.5);
    const moving = progress > 0 && progress < 1;
    const complete = progress === 1;
    const layers = [];
    const rowShapes = rowTop.map((y, idx) => {
      const source = complete ? idx === 1 : idx === 0;
      const target = !complete && idx === 1;
      return source ? rect(12, y, dw - 24, 96, 24, '#F0E4CB', 'stroke="#C5A56C" stroke-width="3"')
        : target ? rect(12, y, dw - 24, 96, 24, '#E5DEC7', 'fill-opacity=".84" stroke="#94B8AF" stroke-width="3" stroke-dasharray="7 5"')
          : rect(12, y, dw - 24, 96, 24, '#FFFFFF', `fill-opacity="${complete && idx === 0 ? '.30' : '.15'}" stroke="#FFFFFF" stroke-opacity=".12" stroke-width="2"`);
    }).join('');
    let shapes = rowShapes;
    for (const [idx, label, fill] of complete ? [[1, 'PICK', '#705430']] : [[0, 'PICK', '#705430'], [1, 'DROP', '#365E56']]) {
      shapes += rect(24, rowTop[idx] - 13, 57, 24, 10, fill);
      layers.push(await centeredText(label, 52.5, rowTop[idx] - 1, 11, '#FFFFFF'));
    }
    if (complete) layers.push(await centeredSprite('assets/ui/check_badge.png', 40, rowTop[0] - 1, 28));
    const controlsY = dh - 84;
    for (const [i, icon, label, fill, edge] of [[0, 'undo', 'UNDO', '#DDB477', '#997542'], [1, 'hint', 'HINT', '#88ADC5', '#536F89'], [2, 'restart', 'RESTART', '#9ABC8E', '#5D7955']]) {
      const x = cx + (i - 1) * 104;
      shapes += rect(x - 28, controlsY + 49, 56, 8, 8, edge) + rect(x - 32, controlsY, 64, 56, 18, fill);
      layers.push(await centeredSprite(`assets/ui/${icon}.png`, x, controlsY + 28, 34));
      layers.push(await centeredText(label, x, controlsY + 73, 11, '#FFFFFF'));
    }
    if (!complete) {
      // Interleaved fan uses exactly the source 52 dp letter / 20 dp slot cells.
      for (let i = 0; i < 5; i += 1) {
        const a = arcOffset(i * 2);
        const x = cx - 144 + i * 72;
        shapes += `<g opacity="${1 - progress}" transform="translate(${x} ${tileY[1] + a.y - 2}) rotate(${a.rotate})">${rect(-9, -26, 18, 52, 6, '#FFFFFF', 'fill-opacity=".8" stroke="#638F80" stroke-width="2"')}<circle cx="0" cy="0" r="3" fill="#365E56" opacity=".55"/></g>`;
      }
    }
    for (let i = 0; i < 3; i += 1) {
      const char = 'PAY'[i];
      const originalIndex = i === 0 ? 0 : i + 1;
      layers.push(await tileAt(char, complete ? 'default' : 'source', lerp(standard(originalIndex, 4), standard(i, 3), progress), tileY[0]));
    }
    if (!moving && !complete) layers.push(await tileAt('L', 'selected', standard(1, 4), tileY[0] - 6, 0, 1.08));
    for (let i = 0; i < 4; i += 1) {
      const a = arcOffset(i * 2 + 1);
      const finalIndex = i === 0 ? 0 : i + 1;
      const angle = complete ? 0 : Math.round(lerp(a.rotate, 0, progress) * 2) / 2;
      layers.push(await tileAt('PANT'[i], complete ? 'source' : 'default', lerp(arcLetter(i), standard(finalIndex, 5), progress), tileY[1] + lerp(a.y, 0, progress), angle));
    }
    if (complete) layers.push(await tileAt('L', 'locked', standard(1, 5), tileY[1]));
    for (let i = 0; i < 4; i += 1) layers.push(await tileAt('HEAR'[i], 'default', standard(i, 4), tileY[2]));
    if (moving) {
      const fromX = standard(1, 4);
      const toX = standard(1, 5);
      const x = lerp(fromX, toX, progress) + Math.sin(progress * Math.PI) * 30;
      const y = lerp(tileY[0] - 6, tileY[1], progress) - Math.sin(progress * Math.PI) * 22;
      layers.push(await tileAt('L', 'selected', x, y, 0, 1.08));
    }
    return sharp(base).composite([{ input: svg(shapes) }, ...layers]).png().toBuffer();
  }
  return { render, provenance };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pos = process.argv.indexOf('--out-dir');
  if (pos < 0 || !process.argv[pos + 1]) {
    console.log('Usage: node scripts/store/assembledPuzzle.mjs --out-dir <proof-directory>');
  } else {
    const out = path.resolve(process.argv[pos + 1]);
    await fs.mkdir(out, { recursive: true });
    const renderer = await createPuzzleRenderer();
    await fs.writeFile(path.join(out, 'puzzle-before.png'), await renderer.render(0));
    await fs.writeFile(path.join(out, 'puzzle-after.png'), await renderer.render(4));
    await fs.writeFile(path.join(out, 'puzzle-provenance.json'), `${JSON.stringify(renderer.provenance, null, 2)}\n`);
    console.log(`Wrote source-derived puzzle reconstruction proofs to ${out}`);
  }
}
