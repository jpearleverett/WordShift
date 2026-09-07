/** Delivery-only derivatives. Keep the inspected artwork masters unchanged. */
import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/story');
const output = path.join(root, 'optimized');
await mkdir(output, { recursive: true });
let sourceBytes = 0;
let outputBytes = 0;
for (const name of ['kept-table', 'private-room', 'outward-road', 'outward-road-night']) {
  const source = path.join(root, `${name}.png`);
  sourceBytes += (await stat(source)).size;
  // Heroes retain enough samples for a 430dp phone at 3x. Headers do not
  // decode a full cinematic plate just to show a shallow journal illustration.
  for (const [kind, width] of [['hero', 1290], ['header', 780]]) {
    const target = path.join(output, `${name}-${kind}.webp`);
    await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 92, effort: 6 }).toFile(target);
    outputBytes += (await stat(target)).size;
  }
}
console.log(JSON.stringify({ sourceBytes, outputBytes, savedPercent: Math.round((1 - outputBytes / sourceBytes) * 100) }));
