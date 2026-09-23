/**
 * Writes assets/environment/shadow_halo.png: a 256x256 white radial glow whose
 * alpha falls from the centre to zero at the edge ((1 - r)^1.3). HouseWorld
 * tints it per phase and stretches it into the backlight behind the shadow
 * figure, which reads as one smooth glow where stacked Views banded. Pure
 * Node + pngjs, deterministic. Run from mobile/: node scripts/tools/generateShadowHalo.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '../../assets/environment/shadow_halo.png');
const S = 256;
const png = new PNG({ width: S, height: S });
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const dx = (x + 0.5 - S / 2) / (S / 2);
    const dy = (y + 0.5 - S / 2) / (S / 2);
    const r = Math.sqrt(dx * dx + dy * dy);
    const a = r >= 1 ? 0 : Math.pow(1 - r, 1.3);
    const i = (y * S + x) * 4;
    png.data[i] = 255; png.data[i + 1] = 255; png.data[i + 2] = 255;
    png.data[i + 3] = Math.round(a * 255);
  }
}
fs.writeFileSync(OUT, PNG.sync.write(png));
console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
