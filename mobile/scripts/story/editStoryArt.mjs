/**
 * editStoryArt.mjs: targeted retouch of one story illustration through a hosted
 * image-edit model, pasted back onto the untouched original.
 *
 * Why: the per-page story illustrations were generated as object-only still
 * lifes, but the generator slipped in human hands, human figures and stray pets
 * (a cat asleep on the window seat of an animal cottage). Regenerating a whole
 * page from text loses the page's composition and drifts in style, so the fix
 * is an EDIT: a square crop around the defect goes to an instruction-following
 * image-edit model, comes back with only the defect changed, and is composited
 * onto the original through a feathered mask. Everything outside the paste
 * window stays byte-identical to the shipped art.
 *
 * Usage (from mobile/):
 *   node scripts/story/editStoryArt.mjs --id witness-02 --region 0.53,0.28,1.00,0.62 \
 *     --prompt "Replace the human hand with ..." [--model qwen|seedream|kontext] \
 *     [--mode crop|full] [--seed 7] [--attempt a1] [--source <png>] [--paste region|window]
 *
 * Output goes to the scratch directory in $STORY_EDIT_OUT (default
 * scripts/story/.edits, gitignored): <id>/<attempt>.png (composited 960x540),
 * <attempt>.raw.png (model output), <attempt>.sheet.png (before | after) and
 * <attempt>.json (request, cost, crop window). A ledger.jsonl accumulates cost.
 * Needs RUNPOD_API_KEY. Never writes into assets/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, arg, i, all) => {
  if (arg.startsWith('--')) acc.push([arg.slice(2), all[i + 1] !== undefined && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
  return acc;
}, []));
const root = path.resolve(import.meta.dirname, '../..');
const id = args.id;
const model = args.model ?? 'qwen';
const mode = args.mode ?? 'crop';
const attempt = args.attempt ?? `${model}-${mode}-${Date.now().toString(36)}`;
const key = process.env.RUNPOD_API_KEY;
if (!id || !args.prompt || !args.region) throw new Error('Required: --id --region x0,y0,x1,y1 --prompt');
if (!key) throw new Error('RUNPOD_API_KEY is not set');
const outRoot = process.env.STORY_EDIT_OUT ?? path.join(root, 'scripts/story/.edits');
const outDir = path.join(outRoot, id);
fs.mkdirSync(outDir, { recursive: true });
const source = args.source ?? path.join(root, 'assets/story/pages', `${id}.webp`);
const W = 960, H = 540;
const original = await sharp(source).resize(W, H, { fit: 'cover' }).removeAlpha().png().toBuffer();
const frac = args.region.split(',').map(Number);
if (frac.length !== 4 || frac.some(Number.isNaN)) throw new Error('Bad --region');
const box = { x0: Math.max(0, Math.floor(frac[0] * W)), y0: Math.max(0, Math.floor(frac[1] * H)), x1: Math.min(W, Math.ceil(frac[2] * W)), y1: Math.min(H, Math.ceil(frac[3] * H)) };
const bw = box.x1 - box.x0, bh = box.y1 - box.y0;

// The edit window: a square that holds the defect with breathing room, so the
// model sees enough context to continue the sleeve, cushion or table under it.
let window;
let effectiveMode = mode;
if (mode === 'crop') {
  const side = Math.min(H, Math.max(320, Math.round(Math.max(bw, bh) * 1.4 + 48)));
  if (Math.max(bw, bh) * 1.1 > H) effectiveMode = 'full';
  else {
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
    const left = Math.round(Math.min(Math.max(0, cx - side / 2), W - side));
    const top = Math.round(Math.min(Math.max(0, cy - side / 2), H - side));
    window = { left, top, width: side, height: side };
  }
}
if (effectiveMode === 'full') window = { left: 0, top: 0, width: W, height: H };

const input = effectiveMode === 'crop'
  ? await sharp(original).extract(window).png().toBuffer()
  : original;
const dataUri = 'data:image/png;base64,' + input.toString('base64');
const seed = args.seed !== undefined ? Number(args.seed) : -1;
const endpoints = {
  qwen: ['https://api.runpod.ai/v2/qwen-image-edit-2511/runsync', { prompt: args.prompt, images: [dataUri], size: effectiveMode === 'crop' ? '1024*1024' : '1536*1080', seed, output_format: 'png' }],
  seedream: ['https://api.runpod.ai/v2/seedream-v4-edit/runsync', { prompt: args.prompt, images: [dataUri], size: effectiveMode === 'crop' ? '1024*1024' : '1920*1088', enable_safety_checker: true }],
  kontext: ['https://api.runpod.ai/v2/black-forest-labs-flux-1-kontext-dev/runsync', { prompt: args.prompt, image: dataUri, negative_prompt: args.negative ?? 'human hand, fingers, skin, photographic fur, blur', size: effectiveMode === 'crop' ? '1024*1024' : '960*544', num_inference_steps: 28, guidance: Number(args.guidance ?? 2.5), seed, output_format: 'png' }],
};
if (!endpoints[model]) throw new Error(`Unknown model ${model}`);
const [url, body] = endpoints[model];
const started = Date.now();
const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ input: body }) });
const json = await response.json().catch(() => ({ status: `HTTP ${response.status}` }));
const resultUrl = json.output?.image_url ?? json.output?.result;
const cost = Number(json.output?.cost ?? 0);
const meta = { id, attempt, model, mode: effectiveMode, requestedMode: mode, region: frac, box, window, prompt: args.prompt, seed, status: json.status, cost, error: json.error ?? null, ms: Date.now() - started, source: path.relative(root, source) };
fs.appendFileSync(path.join(outRoot, 'ledger.jsonl'), JSON.stringify({ ...meta, at: new Date().toISOString() }) + '\n');
if (!resultUrl) {
  fs.writeFileSync(path.join(outDir, `${attempt}.json`), JSON.stringify({ ...meta, response: json }, null, 2));
  console.log(JSON.stringify({ ok: false, ...meta }));
  process.exit(2);
}
const rawBuffer = Buffer.from(await (await fetch(resultUrl)).arrayBuffer());
const rawPath = path.join(outDir, `${attempt}.raw.png`);
await sharp(rawBuffer).png().toFile(rawPath);

// Paste window: by default the whole edit window with a feathered border;
// --paste region limits it to the defect box plus a margin, for a model that
// re-textured the surroundings more than it should have.
const feather = 18;
const pasteRect = args.paste === 'region'
  ? { x0: Math.max(0, box.x0 - 24), y0: Math.max(0, box.y0 - 24), x1: Math.min(W, box.x1 + 24), y1: Math.min(H, box.y1 + 24) }
  : { x0: window.left, y0: window.top, x1: window.left + window.width, y1: window.top + window.height };
const edited = await sharp(rawBuffer).resize(window.width, window.height, { fit: 'cover' }).removeAlpha().raw().toBuffer();
const editedFull = await sharp(original).composite([{ input: edited, raw: { width: window.width, height: window.height, channels: 3 }, left: window.left, top: window.top }]).removeAlpha().raw().toBuffer();
const mask = Buffer.alloc(W * H);
for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
  if (x < pasteRect.x0 || x >= pasteRect.x1 || y < pasteRect.y0 || y >= pasteRect.y1) continue;
  // Distance to the paste edge, but an edge that coincides with the picture
  // edge needs no feather (there is nothing to blend into).
  const d = Math.min(pasteRect.x0 === 0 ? feather : x - pasteRect.x0, pasteRect.x1 === W ? feather : pasteRect.x1 - 1 - x,
    pasteRect.y0 === 0 ? feather : y - pasteRect.y0, pasteRect.y1 === H ? feather : pasteRect.y1 - 1 - y);
  mask[y * W + x] = Math.round(255 * Math.min(1, Math.max(0, (d + 1) / feather)));
}
const layer = await sharp(editedFull, { raw: { width: W, height: H, channels: 3 } }).joinChannel(mask, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
const composited = await sharp(original).composite([{ input: layer }]).png().toBuffer();
const finalPath = path.join(outDir, `${attempt}.png`);
fs.writeFileSync(finalPath, composited);
const sheetPath = path.join(outDir, `${attempt}.sheet.png`);
await sharp({ create: { width: W * 2 + 8, height: H, channels: 3, background: '#222' } })
  .composite([{ input: original, left: 0, top: 0 }, { input: composited, left: W + 8, top: 0 }]).png().toFile(sheetPath);
fs.writeFileSync(path.join(outDir, `${attempt}.json`), JSON.stringify({ ...meta, pasteRect, finalPath, rawPath, sheetPath }, null, 2));
console.log(JSON.stringify({ ok: true, id, attempt, model, mode: effectiveMode, cost, window, pasteRect, finalPath, sheetPath }));
