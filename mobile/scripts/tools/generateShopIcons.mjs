// Cosmetic Shop item art: one small painted subject per purchasable, so a shop
// row reads as an OBJECT you are buying rather than a strip of colour swatches.
// 48 icons at 192x192 (= 64dp at @3x) in four families, each drawn by its own
// module under scripts/tools/shopIcons/ against the shared kit in _draw.mjs:
//   themes.mjs      9 tile themes + 9 confetti palettes (drawn in their own palettes)
//   upgrades.mjs   13 room decorations, tier 1 (cozy)
//   deepenings.mjs 13 room deepenings, tier 2 (dread)
//   misc.mjs        3 attunement levels, tier 3 + the unmapped-id placeholder
// Smooth, supersampled 2x, dependency-free (zlib + fs only), no Math.random
// anywhere — the whole set is byte-reproducible.
// Run: node scripts/tools/generateShopIcons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { draw as drawThemes } from './shopIcons/themes.mjs';
import { draw as drawUpgrades } from './shopIcons/upgrades.mjs';
import { draw as drawDeepenings } from './shopIcons/deepenings.mjs';
import { draw as drawMisc } from './shopIcons/misc.mjs';

const OUT = path.resolve(import.meta.dirname, '../../assets/ui/shop');
fs.mkdirSync(OUT, { recursive: true });

drawThemes();
drawUpgrades();
drawDeepenings();
drawMisc();

const count = fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length;
console.log(`shop icons: ${count} PNGs in assets/ui/shop`);
