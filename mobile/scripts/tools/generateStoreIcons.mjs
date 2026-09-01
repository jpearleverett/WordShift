// Store item art: one painted object per real-money purchasable, so a store row
// reads as GOODS ON A SHELF rather than a title, a sentence and a price pill.
// 13 icons at 192x192 (= 64dp at @3x), drawn by scripts/tools/storeIcons/store.mjs
// against the shared kit in scripts/tools/shopIcons/_draw.mjs — the same kit,
// doctrine and light source as the 58 Cosmetic Shop icons, so the paid list and
// the amber list read as one world:
//   store.mjs   the starter pack + the free daily faucet + the amber ladder
//               (pouch/jar/hoard) + the hint ladder (handful/satchel) + Supporter,
//               the Keeper's Collection, the Patron key, Remove Ads, the season
//               premium track, and the unmapped-id placeholder
// Smooth, supersampled 2x, dependency-free (zlib + fs only), no Math.random
// anywhere — the whole set is byte-reproducible.
// Run: node scripts/tools/generateStoreIcons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { draw as drawStore } from './storeIcons/store.mjs';

const OUT = path.resolve(import.meta.dirname, '../../assets/ui/store');
fs.mkdirSync(OUT, { recursive: true });

drawStore();

const count = fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length;
console.log(`store icons: ${count} PNGs in assets/ui/store`);
