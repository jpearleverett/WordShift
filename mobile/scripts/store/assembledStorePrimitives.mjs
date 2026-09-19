/** Offline source-asset compositor. Never starts the game, browser or network. */
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import ts from 'typescript';

export const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const sourceAssets = new Set();
export const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export const svg = (w, h, content) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${content}</svg>`);
export const asset = file => { sourceAssets.add(file); return path.join(MOBILE, file); };
export const rgbaCanvas = (width, height, background = '#00000000') => sharp({ create: { width, height, channels: 4, background } });
export async function readPure(file) {
  const exports = {};
  const script = ts.transpileModule(await fs.readFile(asset(file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(script, { exports, require: spec => {
    if (/\.(png|webp)$/.test(spec)) { const resolved = path.relative(MOBILE, path.resolve(path.dirname(path.join(MOBILE, file)), spec)); return asset(resolved); }
    throw new Error(`Native/service dependency refused in promotional composition: ${spec}`);
  } }, { timeout: 1000 });
  return exports;
}
const fonts = { title: ['Epunda Slab Bold', 'EpundaSlab-Bold.ttf'], body: ['Figtree', 'Figtree-Regular.ttf'], bold: ['Figtree Bold', 'Figtree-Bold.ttf'], reading: ['Epunda Slab', 'EpundaSlab-Regular.ttf'] };
export async function text(value, { size = 40, width = 940, color = '#3B2416', font = 'body', wrap = false, align = 'left', minSize = 20 } = {}) {
  const [family, filename] = fonts[font];
  for (let current = size; current >= minSize; current--) {
    const input = { text: `<span foreground="${color}">${esc(value)}</span>`, font: `${family} ${current}`, fontfile: asset(`assets/fonts/${filename}`), rgba: true, dpi: 72, ...(wrap ? { width, align, spacing: Math.round(current * .24) } : {}) };
    const result = await sharp({ text: input }).png().toBuffer({ resolveWithObject: true });
    if (result.info.width <= width) return { input: result.data, width: result.info.width, height: result.info.height, size: current };
  }
  throw new Error(`Text cannot fit: ${value}`);
}
export async function centered(value, x, y, options = {}) {
  const result = await text(value, options);
  return { input: result.input, left: Math.round(x - result.width / 2), top: Math.round(y - result.height / 2) };
}
export async function image(file, width, height, fit = 'contain', kernel = 'nearest') {
  return sharp(asset(file)).resize(Math.round(width), Math.round(height), { fit, kernel, background: '#00000000' }).png().toBuffer();
}
export async function frame(width, height, { kind = 'panel', scale = 2.5, phase = 0 } = {}) {
  const registry = await readPure('src/theme/pixelSkin.generated.ts');
  const skin = registry.getPixelSkin(phase);
  const c = Math.round((kind === 'panel' ? registry.PANEL_CORNER_DP : registry.CARD_CORNER_DP) * scale);
  const e = Math.round((kind === 'panel' ? registry.PANEL_EDGE_DP : registry.CARD_EDGE_DP) * scale);
  const parts = skin[kind];
  const specs = [['tl', 0, 0, c, c], ['tr', width-c, 0, c, c], ['bl', 0, height-c, c, c], ['br', width-c, height-c, c, c], ['top', c, 0, width-2*c, e], ['bottom', c, height-e, width-2*c, e], ['left', 0, c, e, height-2*c], ['right', width-e, c, e, height-2*c]];
  const layers = await Promise.all(specs.map(async ([name, left, top, w, h]) => ({ input: await sharp(parts[name]).resize(w, h, { fit: 'fill', kernel: 'nearest' }).png().toBuffer(), left, top })));
  const fill = svg(width, height, `<rect x="${e}" y="${e}" width="${width-2*e}" height="${height-2*e}" fill="${kind === 'panel' ? skin.fill : skin.fillCard}"/>`);
  return sharp(fill).composite(layers).png().toBuffer();
}
export async function button(label, width, { variant = 'primary', scale = 2.5, phase = 0, size = 'md', fontSize = 35 } = {}) {
  const registry = await readPure('src/theme/pixelSkin.generated.ts');
  const skin = registry.getPixelSkin(phase);
  const parts = skin.buttons[variant][size].up;
  const cap = Math.round(registry.BTN_CAP_DP * scale), height = Math.round((size === 'lg' ? registry.BTN_LG_DP : registry.BTN_MD_DP) * scale);
  const pieces = await Promise.all([['l', 0, cap], ['m', cap, width-2*cap], ['r', width-cap, cap]].map(async ([key, left, w]) => ({ input: await sharp(parts[key]).resize(w, height, { fit: 'fill', kernel: 'nearest' }).png().toBuffer(), left, top: 0 })));
  pieces.push(await centered(label, width/2, height/2-4, { size: fontSize, font: 'bold', color: skin.ink[variant], width: width-66 }));
  return rgbaCanvas(width, height).composite(pieces).png().toBuffer();
}
export async function assetManifest() {
  return Promise.all([...sourceAssets].sort().map(async file => ({ file, sha256: createHash('sha256').update(await fs.readFile(path.join(MOBILE,file))).digest('hex') })));
}

/** Source styles in an editorial 390-dp layout. No native layout is claimed. */
export async function assembledBoard({ width = 1080, height = 1600, words, activeRow = 0, locked = {}, difficulty = 'EASY', mode = null, date = null, tileTheme = null }) {
  const palette = await readPure('src/theme/colors.ts');
  if (tileTheme) palette.setEquippedTileTheme(tileTheme);
  const n = v => Math.round(v * width / 390);
  const layers = [];
  const base = palette.getPhaseTheme(0).bgPrimary;
  const longest = Math.max(...words.map(w => w.length));
  const tileSize = longest >= 7 ? 45 : longest >= 6 ? 49 : 56;
  const top = mode === 'DAILY CHALLENGE' ? 150 : 146;
  const rowGap = words.length >= 5 ? 68 : words.length >= 4 ? 92 : 112;
  const rowH = words.length >= 5 ? 60 : 92;
  let shapes = `<rect width="100%" height="100%" fill="${base}"/><rect x="0" y="0" width="100%" height="100%" fill="#1F3D33" opacity=".08"/><circle cx="${n(40)}" cy="${n(50)}" r="${n(20)}" fill="#FFF" opacity=".25"/><circle cx="${n(350)}" cy="${n(50)}" r="${n(20)}" fill="#FFF" opacity=".25"/>`;
  const texture = await sharp(asset('assets/story/optimized/kept-table-header.webp')).resize(width, n(170), {fit:'cover'}).ensureAlpha(.065).png().toBuffer();
  layers.push({ input: texture, left: 0, top: height-n(170) });
  layers.push({ input: await image('assets/ui/wordmark.png', n(236), n(59)), left: n(77), top:n(20) });
  layers.push({input:await image('assets/ui/home.png',n(23),n(23)),left:n(29),top:n(38)});
  layers.push({input:await image('assets/ui/rules.png',n(24),n(24)),left:n(337),top:n(38)});
  if (mode) {
    layers.push(await centered(mode, width/2, n(106), {font:'bold',size:n(17),color:'#F8EDD5',width:width-100}));
    if (date) layers.push(await centered(date, width/2, n(129), {size:n(12),color:'#E8DDC4'}));
  } else layers.push(await centered(difficulty, width-n(60),n(111),{font:'bold',size:n(12),color:'#FFF'}));
  for (let row = 0; row < words.length; row++) {
    const y=n(top+row*rowGap), h=n(rowH);
    const active=row===activeRow, done=row<activeRow;
    shapes += `<rect x="${n(12)}" y="${y}" width="${width-n(24)}" height="${h}" rx="${n(20)}" fill="${active?'#F0E4CB':done?'#E6E0CA':'#F4EBD5'}" fill-opacity="${active?1:done?.55:.22}" stroke="${active?'#C5A56C':'#ECDFC3'}" stroke-opacity="${active?1:.15}" stroke-width="${n(active?3:1)}"/>`;
    const total=words[row].length*tileSize;
    if (active) {
      shapes += `<rect x="${n(24)}" y="${y-n(10)}" width="${n(56)}" height="${n(22)}" rx="${n(8)}" fill="#705430"/>`;
      layers.push(await centered('PICK',n(52),y,{font:'bold',size:n(10),color:'#FFF'}));
    }
    if (done) layers.push({input:await image('assets/ui/check_badge.png',n(24),n(24)),left:n(24),top:y-n(10)});
    for (let i=0;i<words[row].length;i++) {
      const char=words[row][i], isLocked=(locked[row]??[]).includes(i);
      const color = isLocked ? {bg:'#CBD5E1',border:'#94A3B8',ink:'#64748B'} : active ? {...palette.getTileColor(char),ink:palette.getTileInkColor(palette.getTileColor(char).bg)} : {bg:'#EDDFC3',border:'#B29B75',ink:'#4B4032'};
      const x=n(195-total/2+i*tileSize+3),ty=y+Math.round((h-n(tileSize))/2),tw=n(tileSize-6),th=n(tileSize);
      const token=svg(tw,th,`<rect x="2" y="7" width="${tw-4}" height="${th-7}" rx="${n(10)}" fill="${color.border}"/><rect x="0" y="0" width="${tw}" height="${th-7}" rx="${n(10)}" fill="${color.bg}"/><path d="M0 ${n(11)}Q0 0 ${n(10)} 0H${tw-n(10)}Q${tw} 0 ${tw} ${n(10)}V${Math.round(th*.43)}H0Z" fill="#FFF6DB" opacity=".26"/>`);
      layers.push({input:token,left:x,top:ty});
      layers.push(await centered(char,x+tw/2,ty+th*.44,{font:'title',size:n(tileSize*.42),color:color.ink}));
    }
  }
  const controlsY=height-n(83);
  if(n(top+(words.length-1)*rowGap+rowH)>controlsY-24)throw new Error('Board rows overlap the action controls');
  for (const [i,icon,label,fill] of [[0,'undo','UNDO','#DDB477'],[1,'hint','HINT','#88ADC5'],[2,'restart','RESTART','#9ABC8E']]) {
    const x=n(195+(i-1)*104);
    shapes+=`<rect x="${x-n(32)}" y="${controlsY}" width="${n(64)}" height="${n(56)}" rx="${n(18)}" fill="${fill}"/>`;
    layers.push({input:await image(`assets/ui/${icon}.png`,n(34),n(34)),left:x-n(17),top:controlsY+n(10)});
    layers.push(await centered(label,x,controlsY+n(72),{font:'bold',size:n(11),color:'#FFF'}));
  }
  return sharp(svg(width,height,shapes)).composite(layers).removeAlpha().png().toBuffer();
}
