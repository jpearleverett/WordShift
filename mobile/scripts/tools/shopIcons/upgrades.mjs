/**
 * shopIcons/upgrades.mjs — ROOM DECORATIONS, TIER 1 (the cozy tier).
 *
 * One painted subject per entry in ROOM_UPGRADES (src/services/roomUpgrades.ts),
 * filed as upgrade_<roomId>.png so the shop row's registry key is the id the
 * screen already holds. Subjects are the tier-1 decoration NAMED in that file
 * (Hearthstone, Copper Pots, Gilded Globe...), drawn warm and cozy: this is the
 * tier the player buys while the house is still bright. The dread lives in the
 * deepenings.
 *
 * DELIVERY SIZE IS 56dp, NOT 64. A blind review of the first pass judged these
 * against the shipped assets/ui set at that size and the verdict decided the
 * shape of this revision. Every icon here now obeys the shipped set's discipline:
 *
 *   ONE centred subject. A thick warm-dark contour (withOutline, see _draw.mjs).
 *   Two or three BIG value steps. No satellite elements, no particle fields, no
 *   repeated micro-texture, no full-width hairline rails. Mass filling the frame.
 *
 * THIRD PASS (targeted). Two of these were still not NAMEABLE by a blind grader,
 * which is the disqualifying case, and two more still failed on mass:
 *   - upgrade_belfry read as "two white rings and a small pill on a wooden board",
 *     three disconnected elements floating in a frame — a DIAGRAM of the
 *     decoration, not an object. The board is gone and the chalk itself is the
 *     hero: one flat-ended prismatic stub standing in the ring it drew.
 *   - upgrade_garden and upgrade_jungle_room were both "thin parts separated by
 *     large voids, the opposite of the mass-fills-the-tile rule". The chime's
 *     tubes now OVERLAP into one column (each keeping an ink keyline so they do
 *     not fuse), and the vine is one thick trunk with every leaf anchored onto it.
 * The other nine tiles in this file were graded good at delivery size and are
 * untouched.
 *
 * Specifically undone from the first pass: the kitchen's second pot and its rail
 * (the pair read as buckets), the jungle/star-loft/garden rails (landscape
 * objects stranded in a square frame), the bamboo attic's second lantern and its
 * sparks, the star loft's two moths (now ONE, perched ON the lantern), the sky
 * garden's detached moon, the belfry's near-black plaque (now warm wood, so it
 * survives an ash row), and every scatter of sub-pixel flecks.
 *
 * House doctrine (see _draw.mjs): contact/drop shadow and any soft halo go down
 * on the real canvas FIRST (neither should be contoured), then the subject is
 * drawn inside withOutline, then the upper-left sheen lands on top of the
 * contour. INK for outlines, never #000. No Math.random: every scatter is a
 * literal coordinate table so the generator is byte-reproducible.
 *
 * All coordinates are in the 384x384 supersample space (c = 192 is the centre);
 * the file is downsampled 2x to a 192px PNG = 64dp at @3x.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  canvas, savePNG, down2, W, contactShadow, sheen, withOutline,
  INK, WOOD, PARCH, ACCENT, BRASS, AMB, STONE,
  ellipse, roundRect, poly, capsule, arcStroke, flameLobe, starPts,
} from './_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui/shop');

// --- local palettes ---------------------------------------------------------
const COPPER = { hi: '#FBD09B', base: '#E08C42', mid: '#A85526', lo: '#6E2E0C' };
const GLASS = { hi: '#EAF3F8', base: '#B8CEDA', lo: '#5E7482', dead: '#37505F' };
const LEAF = { hi: '#9ACB60', base: '#5F9639', lo: '#2E5518' };
const BLOOM = { hi: '#FFCFDF', base: '#E67FA8', lo: '#9E3C66' };
const CRYSTAL = { hi: '#F2E9FF', base: '#B9A2E6', lo: '#6E55A8' };
const EARTH = { hi: '#8E6438', base: '#6B4626', lo: '#3E2715' };
const CORAL = { hi: '#B6FFEC', base: '#3AB5A6', lo: '#0E5560' };
const NIGHT = { hi: '#3F4C82', base: '#28305A', lo: '#141834' };
const PETAL = { hi: '#FFFFFF', base: '#F2EDF8', lo: '#A99BC4' };
const CHALK = '#FBF7EC';
const BRASSTUBE = { hi: '#FFECB6', base: '#DDAC4E', lo: '#6E4715' };

// --- local shape helpers (pure, table-driven) --------------------------------

/** A pointed oval leaf/petal centred at (x,y), long axis along `ang`. */
function petalPts(x, y, len, wid, ang) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const local = [
    [-len, 0], [-len * 0.45, -wid * 0.78], [0, -wid],
    [len * 0.55, -wid * 0.66], [len, 0],
    [len * 0.55, wid * 0.66], [0, wid], [-len * 0.45, wid * 0.78],
  ];
  return local.map(([lx, ly]) => [x + lx * ca - ly * sa, y + lx * sa + ly * ca]);
}

/** Ink-edged pointed oval (leaf or flower petal). */
function petal(cv, x, y, len, wid, ang, top, bottom) {
  poly(cv, petalPts(x, y, len + 7, wid + 7, ang), INK, 0.95);
  poly(cv, petalPts(x, y, len, wid, ang), top, 1, bottom);
}

/** An open flower of `n` petals radiating from (x,y). Kept BIG on purpose. */
function bloom(cv, x, y, r, n, rot, top, bottom, coreHi, coreLo) {
  for (let i = 0; i < n; i++) {
    const a = rot + (i * Math.PI * 2) / n;
    petal(cv, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.62, r * 0.36, a, top, bottom);
  }
  ellipse(cv, x, y, r * 0.36, r * 0.36, INK, 0.95);
  ellipse(cv, x, y, r * 0.28, r * 0.28, coreHi);
  ellipse(cv, x + r * 0.08, y + r * 0.09, r * 0.16, r * 0.16, coreLo, 0.85);
}

/**
 * Half of a smooth elliptical stroke — a chalk ring drawn on the ground, seen at
 * the same shallow angle as the ground. arcStroke only does CIRCLES, so this is a
 * chain of overlapping capsules along the ellipse. Splitting it into a far half
 * and a near half lets a subject stand between them, which is the only cue that
 * makes a ring on the floor read as a ring on the floor rather than as a symbol
 * floating on the tile.
 */
function groundRingArc(cv, cx, cy, rx, ry, front, th, color, alpha = 1, n = 40) {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    if ((Math.sin((a0 + a1) / 2) >= 0) !== front) continue;
    capsule(cv, cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry,
      cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry, th, color, alpha);
  }
}

/**
 * A FAT chime tube carrying its own ink keyline. The keyline is the whole point:
 * the chime tiles pack their tubes so they OVERLAP into one solid column (thin
 * tubes with voids between them were the set's worst thumbnail failure), and once
 * they overlap, only an internal dark edge can keep three tubes from fusing into
 * a single grey slab.
 */
function fatTube(cv, x, yTop, yBot, th, pal) {
  capsule(cv, x, yTop, x, yBot, th + 13, INK, 0.92);
  capsule(cv, x, yTop, x, yBot, th, pal.base);
  capsule(cv, x - th * 0.25, yTop + 6, x - th * 0.25, yBot - 6, th * 0.34, pal.hi, 0.95);
  capsule(cv, x + th * 0.3, yTop + 6, x + th * 0.3, yBot - 6, th * 0.22, pal.lo, 0.6);
}

/**
 * One meridian rib of a paper lantern: a curve bulging out to `f` of the half
 * width at the equator and meeting the poles. Drawn as a short chain of
 * capsules, which is what keeps a rib a real stroke instead of a hairline.
 */
function lanternRib(cv, x, y, hw, hh, f, th, color, alpha) {
  const N = 10, pts = [];
  for (let i = 0; i <= N; i++) {
    const t = -1 + (2 * i) / N;
    pts.push([x + f * hw * Math.sqrt(Math.max(0, 1 - t * t)), y + t * hh]);
  }
  for (let i = 1; i <= N; i++) capsule(cv, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], th, color, alpha);
}

/** Upper half of an ellipse as a closed polygon — a dome, a lid, a shell. */
function domePts(cx, cy, rx, ry, n = 26) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

/**
 * A hanging lantern. Two of the tier-1 decorations use one (the bamboo attic's
 * paper lanterns and the star loft's glass moth lantern), and so do two of the
 * deepenings, so it lives here as one shared shape with a `paper` body variant
 * and a `lit` switch.
 *
 * The warm halo is NOT drawn here: light bleeding past the silhouette must not be
 * contoured, so callers lay it on the real canvas with `lanternHalo` before
 * calling this inside withOutline.
 *
 *   drawLantern(cv, c, { x, y, s, lit, paper })
 */
export function lanternHalo(cv, { x, y, s = 1, paper = false }) {
  const u = v => v * s;
  ellipse(cv, x, y, u(paper ? 118 : 96), u(paper ? 112 : 116), paper ? '#FFC96A' : '#FFD07A', 0.3, 90);
  ellipse(cv, x, y, u(76), u(82), '#FFE7AE', 0.22, 60);
}

export function drawLantern(cv, c, opts = {}) {
  const { x = c, y = c, s = 1, lit = true, paper = false, hanger = true } = opts;
  const u = v => v * s;

  if (hanger) {                                                     // ring + cord
    capsule(cv, x, y - u(paper ? 62 : 62), x, y - u(paper ? 84 : 88), u(7), INK, 0.95);
    arcStroke(cv, x, y - u(98), u(14), u(9), Math.PI * 0.08, Math.PI * 1.92, BRASS.lo);
    arcStroke(cv, x - u(2), y - u(99), u(12), u(5), Math.PI * 0.15, Math.PI * 1.1, BRASS.hi, 0.8);
  }

  if (paper) {
    const bodyHi = lit ? '#FFEDB2' : '#EFE0C0', bodyLo = lit ? '#D96E19' : '#B3956A';
    const hw = u(72), hh = u(56);
    roundRect(cv, x, y, hw, hh, u(52), bodyHi, 1, bodyLo);
    // four meridian ribs: this is what stops a round paper lantern reading as fruit
    for (const f of [-0.84, -0.44, 0.44, 0.84]) {
      lanternRib(cv, x, y, hw, hh * 0.99, f, u(7), bodyLo, 0.5);
      lanternRib(cv, x - u(3), y, hw, hh * 0.99, f, u(3), lit ? '#FFF6D2' : '#FFFFFF', 0.32);
    }
    capsule(cv, x - hw * 0.9, y + hh * 0.52, x + hw * 0.9, y + hh * 0.52, u(14), bodyLo, 0.3);
    roundRect(cv, x, y - u(56), u(34), u(15), u(5), WOOD.light, 1, WOOD.dark);  // caps
    roundRect(cv, x, y + u(56), u(34), u(15), u(5), WOOD.light, 1, WOOD.dark);
    capsule(cv, x, y - u(70), x, y - u(80), u(9), WOOD.dark);                   // finial
    ellipse(cv, x, y - u(84), u(11), u(10), WOOD.light);
    if (lit) ellipse(cv, x, y + u(2), u(30), u(28), '#FFF6D2', 0.45, 30);
    return;
  }

  // glass-and-brass lantern
  poly(cv, [[x - u(50), y - u(50)], [x + u(50), y - u(50)], [x + u(28), y - u(76)], [x - u(28), y - u(76)]], BRASS.hi, 1, BRASS.lo);
  roundRect(cv, x, y, u(46), u(54), u(8), lit ? '#FFE39B' : '#6D8CA3', 1, lit ? '#F0972E' : '#1E3140');
  if (lit) {
    flameLobe(cv, x, y - u(26), y + u(30), u(20), '#FF9A2E');
    flameLobe(cv, x, y - u(12), y + u(28), u(12), '#FFF0B4');
  } else {
    capsule(cv, x, y - u(20), x, y + u(16), u(11), GLASS.lo, 0.7);  // dead wick
    ellipse(cv, x, y + u(22), u(15), u(7), GLASS.lo, 0.5);
  }
  for (const dx of [-40, 40]) capsule(cv, x + u(dx), y - u(52), x + u(dx), y + u(52), u(12), INK, 0.95);
  capsule(cv, x - u(44), y - u(4), x + u(44), y - u(4), u(8), INK, 0.6);
  roundRect(cv, x, y + u(64), u(52), u(13), u(6), BRASS.hi, 1, BRASS.lo);   // base
  capsule(cv, x - u(48), y + u(58), x + u(48), y + u(58), u(7), INK, 0.5);
}

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });

  { // === upgrade_cozy_den.png — Hearthstone: a carved slab before a small fire ===
    const { cv, c } = canvas();
    ellipse(cv, c, 180, 108, 96, '#FF8A2B', 0.22, 80);                // firelight, uncontoured
    contactShadow(cv, c + 8, 352, 146, 24, 0.32);
    withOutline(cv, t => {
      flameLobe(t, c + 4, 44, 252, 84, '#D8461B');
      flameLobe(t, c, 76, 250, 66, '#FF7A28');
      flameLobe(t, c - 6, 128, 248, 44, '#FFC24E');
      flameLobe(t, c - 8, 174, 246, 23, '#FFF0BE');
      for (const [x1, y1, x2, y2] of [[c - 88, 246, c + 42, 222], [c - 36, 228, c + 92, 250]]) {
        capsule(t, x1, y1, x2, y2, 34, WOOD.mid);
        capsule(t, x1, y1 - 7, x2, y2 - 7, 12, WOOD.light, 0.75);
        capsule(t, x1, y1 + 9, x2, y2 + 9, 8, WOOD.seam, 0.45);
      }
      poly(t, [[c - 132, 246], [c + 132, 246], [c + 156, 288], [c - 156, 288]], STONE.hi, 1, STONE.base);
      roundRect(t, c, 316, 154, 38, 12, STONE.base, 1, STONE.lo);
      capsule(t, c - 144, 292, c + 144, 292, 10, STONE.hi, 0.5);
      arcStroke(t, c, 314, 34, 15, 0, Math.PI * 2, STONE.lo, 0.9);    // one bold carved ring
      arcStroke(t, c, 314, 34, 7, Math.PI * 1.05, Math.PI * 1.9, STONE.hi, 0.8);
    }, { width: 9 });
    ellipse(cv, c, 262, 96, 15, '#FFC98A', 0.3, 30);                  // firelight on the top face
    sheen(cv, c - 86, 262, 44, 10, 0.5);
    savePNG(path.join(OUT, 'upgrade_cozy_den.png'), W, W, down2(cv, W, W));
  }

  { // === upgrade_kitchen.png — Copper Pots: ONE big lidded copper pot ===
    // Was two vessels on a rail, which read as buckets/pails. A spout, a loop
    // handle and a knobbed dome make the vessel unmistakable at 56dp.
    const { cv, c } = canvas();
    contactShadow(cv, c + 6, 340, 132, 24, 0.3);
    withOutline(cv, t => {
      // spout, left — two tapering segments
      capsule(t, c - 88, 214, c - 124, 184, 48, COPPER.base);
      capsule(t, c - 122, 186, c - 146, 160, 30, COPPER.base);
      capsule(t, c - 128, 176, c - 146, 155, 12, COPPER.hi, 0.7);
      // loop handle, right
      arcStroke(t, c + 94, 226, 50, 30, -Math.PI * 0.52, Math.PI * 0.52, COPPER.mid);
      arcStroke(t, c + 94, 226, 50, 12, -Math.PI * 0.44, Math.PI * 0.1, COPPER.hi, 0.65);
      // body
      roundRect(t, c, 236, 100, 80, 42, COPPER.hi, 1, COPPER.lo);
      capsule(t, c - 90, 258, c + 90, 258, 26, COPPER.mid, 0.42);     // belly band
      capsule(t, c - 86, 300, c + 86, 300, 16, COPPER.lo, 0.35);
      // rim plate + domed lid + knob
      roundRect(t, c, 160, 116, 16, 7, COPPER.hi, 1, COPPER.mid);
      poly(t, domePts(c, 150, 96, 58), COPPER.hi, 1, COPPER.mid);
      arcStroke(t, c, 150, 76, 13, Math.PI * 1.18, Math.PI * 1.66, '#FFE6C4', 0.6);
      capsule(t, c, 74, c, 92, 18, COPPER.mid);
      ellipse(t, c, 72, 26, 23, COPPER.hi);
      ellipse(t, c + 6, 80, 15, 11, COPPER.mid, 0.65);
    }, { width: 9 });
    sheen(cv, c - 52, 214, 20, 34, 0.5);
    sheen(cv, c - 40, 122, 22, 12, 0.45);
    savePNG(path.join(OUT, 'upgrade_kitchen.png'), W, W, down2(cv, W, W));
  }

  { // === upgrade_study.png — Gilded Globe on a turned wooden stand ===
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 352, 110, 22, 0.32);
    withOutline(cv, t => {
      roundRect(t, c, 340, 88, 20, 10, WOOD.light, 1, WOOD.dark);     // foot
      capsule(t, c, 336, c, 288, 26, WOOD.base);                      // column
      capsule(t, c - 7, 332, c - 7, 292, 9, WOOD.rim, 0.6);
      ellipse(t, c, 294, 36, 15, WOOD.light);
      arcStroke(t, c, 186, 134, 18, 0, Math.PI * 2, BRASS.lo);        // meridian ring
      arcStroke(t, c, 186, 134, 8, Math.PI * 1.05, Math.PI * 1.95, BRASS.hi, 0.9);
      roundRect(t, c, 186, 114, 114, 114, '#63B4D8', 1, '#0F3F63');   // sphere
      // continents: four bold blobs, no hairlines
      poly(t, [[c - 86, 158], [c - 34, 130], [c + 6, 152], [c - 12, 198], [c - 54, 210], [c - 90, 188]], ACCENT.main, 1, ACCENT.lo);
      poly(t, [[c + 20, 210], [c + 64, 190], [c + 90, 216], [c + 66, 260], [c + 30, 252]], ACCENT.main, 1, ACCENT.lo);
      poly(t, [[c + 30, 116], [c + 80, 122], [c + 92, 158], [c + 46, 168], [c + 22, 144]], ACCENT.main, 1, ACCENT.lo);
      poly(t, [[c - 98, 238], [c - 56, 226], [c - 36, 260], [c - 76, 274]], ACCENT.main, 1, ACCENT.lo);
      arcStroke(t, c, 186, 126, 22, -Math.PI * 0.44, Math.PI * 0.44, BRASS.lo);  // front meridian
      arcStroke(t, c, 186, 126, 13, -Math.PI * 0.42, Math.PI * 0.42, BRASS.hi);
      arcStroke(t, c, 186, 126, 5, -Math.PI * 0.34, Math.PI * 0.06, '#FFEFC0', 0.6);
      capsule(t, c, 50, c, 70, 15, BRASS.hi);                         // axis pin
    }, { width: 9 });
    sheen(cv, c - 54, 132, 30, 22, 0.4);
    savePNG(path.join(OUT, 'upgrade_study.png'), W, W, down2(cv, W, W));
  }

  { // === upgrade_aquarium.png — Bioluminescent Coral on a dark rock ===
    // The stray specks are gone; the branch count is down and the tips are up,
    // so what survives 56dp is the branching silhouette plus five big lamps.
    const { cv, c } = canvas();
    ellipse(cv, c, 190, 156, 148, CORAL.base, 0.24, 118);             // uncontoured bloom
    contactShadow(cv, c + 6, 350, 128, 20, 0.3);
    withOutline(cv, t => {
      roundRect(t, c - 2, 330, 140, 32, 22, '#74889E', 1, '#25323E');  // rock
      ellipse(t, c - 96, 314, 40, 22, '#8397AC');
      ellipse(t, c + 92, 318, 32, 19, '#5E7186');
      const limbs = [
        [c, 332, c, 212, 78], [c - 4, 254, c - 92, 174, 62], [c - 92, 174, c - 116, 112, 48],
        [c + 4, 248, c + 96, 180, 62], [c + 96, 180, c + 120, 118, 48],
        [c - 2, 238, c + 8, 98, 54], [c + 6, 156, c + 66, 108, 36], [c - 2, 174, c - 58, 124, 36],
      ];
      for (const [x1, y1, x2, y2, th] of limbs) capsule(t, x1, y1, x2, y2, th, CORAL.base);
      for (const [x1, y1, x2, y2, th] of limbs) {
        capsule(t, x1 - th * 0.22, y1 - th * 0.08, x2 - th * 0.22, y2 - th * 0.08, th * 0.32, CORAL.hi, 0.55);
        capsule(t, x1 + th * 0.28, y1, x2 + th * 0.28, y2, th * 0.2, CORAL.lo, 0.4);
      }
      for (const [x, y, r] of [[c - 118, 108, 33], [c + 122, 114, 33], [c + 8, 94, 35], [c + 68, 106, 28], [c - 60, 122, 28]]) {
        ellipse(t, x, y, r, r, CORAL.hi);
        ellipse(t, x + r * 0.2, y + r * 0.24, r * 0.66, r * 0.66, CORAL.base, 0.5);
        ellipse(t, x - r * 0.26, y - r * 0.28, r * 0.4, r * 0.4, '#FFFFFF', 0.85);
      }
    }, { width: 9 });
    sheen(cv, c - 26, 250, 14, 32, 0.3);
    savePNG(path.join(OUT, 'upgrade_aquarium.png'), W, W, down2(cv, W, W));
  }

  { // === upgrade_jungle_room.png — Hanging Vines: ONE fall, one mass ===
    // REBUILT. Pass two hung three separate strands and read as "two separate
    // stalks with a visible gap down the middle, roughly a dozen small parts, no
    // single centred mass, both stems run off the top edge". Three strands can only
    // ever be three strands: whatever leaves you hang on them, the gaps between
    // them are the loudest shapes in the tile at 56dp.
    //
    // So there is now ONE thick vine, waving down the centre from a woody node
    // (which is what stops it running off the top edge), and every leaf and bloom
    // is placed so that its inner end OVERLAPS the trunk — the leaf x-offsets below
    // are measured off the trunk's own interpolated position at that height, never
    // off the tile centre, so nothing can float free of the mass.
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 356, 92, 15, 0.2);
    withOutline(cv, t => {
      const trunk = [[c + 4, 46], [c - 14, 120], [c + 16, 206], [c - 8, 290], [c + 6, 332]];
      for (let i = 1; i < trunk.length; i++) {
        capsule(t, trunk[i - 1][0], trunk[i - 1][1], trunk[i][0], trunk[i][1], 42, ACCENT.lo);
        capsule(t, trunk[i - 1][0] - 9, trunk[i - 1][1], trunk[i][0] - 9, trunk[i][1], 14, ACCENT.main, 0.8);
      }
      ellipse(t, c + 4, 50, 27, 24, ACCENT.lo);                       // the node it hangs from
      ellipse(t, c - 4, 44, 15, 12, ACCENT.main, 0.7);
      for (const [x, y, ang, len] of [
        [c - 79, 96, 2.75, 64], [c + 67, 152, 0.42, 64], [c - 55, 210, 2.70, 66],
        [c + 68, 268, 0.40, 62], [c - 67, 318, 2.62, 58],
      ]) petal(t, x, y, len, len * 0.52, ang, LEAF.hi, LEAF.lo);
      bloom(t, c + 86, 104, 50, 5, -0.5, BLOOM.hi, BLOOM.lo, AMB.hi, AMB.lo);
      bloom(t, c - 80, 264, 46, 5, -1.1, BLOOM.hi, BLOOM.lo, AMB.hi, AMB.lo);
    }, { width: 8 });
    sheen(cv, c - 12, 66, 12, 22, 0.35);
    savePNG(path.join(OUT, 'upgrade_jungle_room.png'), W, W, down2(cv, W, W));
  }

  { // === upgrade_desert_room.png — Star Map, a half-rolled canvas chart ===
    // Five BIG stars on FAT links; the old thin ten-star field averaged to mush.
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 348, 132, 22, 0.32);
    withOutline(cv, t => {
      capsule(t, c - 150, 56, c + 150, 56, 24, WOOD.base);            // dowel
      capsule(t, c - 144, 48, c + 144, 48, 9, WOOD.rim, 0.75);
      for (const x of [c - 148, c + 148]) ellipse(t, x, 56, 14, 16, WOOD.dark);
      roundRect(t, c, 176, 126, 118, 10, PARCH.hi, 1, PARCH.shadow); // canvas sheet
      roundRect(t, c, 172, 106, 100, 6, NIGHT.hi, 1, NIGHT.lo);      // painted night field
      const links = [[-70, 84, -14, 128], [-14, 128, 46, 100], [-14, 128, 8, 200], [8, 200, 74, 176]];
      for (const [x1, y1, x2, y2] of links) capsule(t, c + x1, y1, c + x2, y2, 13, '#8FA6E6', 0.8);
      for (const [x, y, r] of [[-70, 84, 27], [-14, 128, 31], [46, 100, 25], [8, 200, 28], [74, 176, 24]]) {
        poly(t, starPts(c + x, y, r, r * 0.44), '#FFFFFF');
      }
      capsule(t, c - 130, 306, c + 130, 306, 56, PARCH.base);        // the rolled bottom
      capsule(t, c - 128, 292, c + 128, 292, 18, PARCH.hi, 0.85);
      capsule(t, c - 128, 322, c + 128, 322, 14, PARCH.shadow, 0.7);
      for (const x of [c - 130, c + 130]) {
        ellipse(t, x, 306, 22, 24, PARCH.dim);
        arcStroke(t, x, 306, 11, 7, Math.PI * 0.2, Math.PI * 1.8, PARCH.shadow, 0.85);
      }
    }, { width: 9 });
    sheen(cv, c - 92, 96, 40, 12, 0.4);
    savePNG(path.join(OUT, 'upgrade_desert_room.png'), W, W, down2(cv, W, W));
  }

  { // === upgrade_office.png — Standing Lamp, a warm brass floor lamp ===
    const { cv, c } = canvas();
    ellipse(cv, c, 240, 176, 156, '#FFC65C', 0.2, 118);               // cast light, uncontoured
    contactShadow(cv, c + 10, 356, 112, 22, 0.32);
    withOutline(cv, t => {
      ellipse(t, c, 338, 96, 27, BRASS.hi);                           // base
      ellipse(t, c, 346, 82, 17, BRASS.lo, 0.85);
      capsule(t, c, 340, c, 168, 28, BRASS.lo);                       // pole
      capsule(t, c - 7, 336, c - 7, 172, 9, BRASS.hi, 0.9);
      ellipse(t, c, 262, 24, 13, BRASS.hi);
      poly(t, [[c - 130, 188], [c + 130, 188], [c + 78, 74], [c - 78, 74]], '#FFF3CC', 1, '#E89A2C');
      capsule(t, c - 128, 184, c + 128, 184, 18, '#E0801E', 0.55);    // lit lower rim
      capsule(t, c - 78, 80, c + 78, 80, 13, '#FFFBE8', 0.75);
    }, { width: 9 });
    sheen(cv, c - 68, 118, 22, 34, 0.5);
    savePNG(path.join(OUT, 'upgrade_office.png'), W, W, down2(cv, W, W));
  }

  { // === upgrade_burrow.png — Crystal Formation in earthen rock ===
    const { cv, c } = canvas();
    ellipse(cv, c, 204, 150, 142, CRYSTAL.base, 0.22, 118);           // violet glow, uncontoured
    contactShadow(cv, c + 8, 348, 132, 22, 0.32);
    withOutline(cv, t => {
      const shards = [
        [[c - 110, 158], [c - 164, 302], [c - 46, 302], c - 82],
        [[c + 108, 132], [c + 44, 302], [c + 158, 302], c + 134],
        [[c - 4, 62], [c - 74, 308], [c + 70, 308], c + 28],
      ];
      for (const [apex, bl, br, rx] of shards) {
        poly(t, [apex, bl, [rx, br[1]]], CRYSTAL.hi, 1, CRYSTAL.base);        // lit left facet
        poly(t, [apex, [rx, br[1]], br], '#7A61B4', 1, '#42306C');            // shaded right facet
        capsule(t, apex[0], apex[1] + 12, rx, br[1] - 12, 9, '#FFFFFF', 0.6); // ridge glint
      }
      roundRect(t, c, 332, 154, 40, 26, EARTH.hi, 1, EARTH.lo);               // earth mound
      for (const [x, y, rx, ry] of [[c - 110, 312, 38, 20], [c + 6, 306, 44, 22], [c + 118, 314, 36, 19]]) {
        ellipse(t, x, y - 2, rx, ry, EARTH.base);
        ellipse(t, x - rx * 0.3, y - ry * 0.55, rx * 0.42, ry * 0.36, EARTH.hi, 0.75);
      }
    }, { width: 9 });
    sheen(cv, c - 28, 116, 13, 34, 0.5);
    savePNG(path.join(OUT, 'upgrade_burrow.png'), W, W, down2(cv, W, W));
  }

  { // === upgrade_garden.png — Wind Chimes: one hanging mass, not a rank of tubes ===
    // REBUILT. Pass two already cut five thin tubes to three fat ones, and it still
    // graded as "thin vertical capsules separated by large voids, the opposite of
    // the mass-fills-the-tile rule" — and a fair reading of it was test tubes or a
    // xylophone. Spacing the tubes apart is what did it: at 56dp the gaps are wider
    // than the tubes, so the eye gets a picket fence rather than an object.
    //
    // The tubes now OVERLAP by ~26px into one solid tapered column, each holding
    // its own ink keyline so the column still reads as three tubes rather than a
    // slab. The silhouette is deliberately a pendant — wide cap, tapering column,
    // one big round bob under it — because the tier-2 sibling is a flat-bottomed
    // block with no bob, and a pair of chime tiles has to be told apart by outline
    // before either is read in detail. Temperature separates them too: warm brass
    // here, cold white there.
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 358, 96, 14, 0.22);
    withOutline(cv, t => {
      roundRect(t, c, 74, 140, 25, 12, WOOD.light, 1, WOOD.dark);     // cap
      capsule(t, c - 128, 58, c + 128, 58, 10, WOOD.rim, 0.7);
      capsule(t, c - 126, 88, c + 126, 88, 8, WOOD.seam, 0.4);
      for (const x of [c - 58, c + 58, c]) capsule(t, x, 94, x, 122, 14, WOOD.dark, 0.95);
      fatTube(t, c - 58, 118, 222, 84, BRASSTUBE);                    // three lengths, well
      fatTube(t, c + 58, 118, 198, 84, BRASSTUBE);                    // apart, so the bottom
      fatTube(t, c, 118, 244, 92, BRASSTUBE);                         // edge is ragged
      // The column is kept SHORT on purpose: the bob has to hang in clear air with
      // a real run of cord above it, or it fuses to the centre tube's rounded end
      // and the whole subject reads as a bunch of something. The bob is also the
      // DARKEST wood in the palette, not the lightest — a pale disc against pale
      // brass was a shape with no value behind it.
      capsule(t, c, 236, c, 288, 13, WOOD.seam, 0.95);                // bob cord
      ellipse(t, c, 320, 46, 46, WOOD.dark);                          // the wooden bob
      ellipse(t, c - 6, 312, 34, 32, WOOD.mid);
      ellipse(t, c - 15, 300, 15, 11, WOOD.base, 0.9);
    }, { width: 9 });
    sheen(cv, c - 90, 64, 28, 8, 0.45);
    sheen(cv, c - 74, 178, 10, 44, 0.4);
    savePNG(path.join(OUT, 'upgrade_garden.png'), W, W, down2(cv, W, W));
  }

  { // === upgrade_bamboo_attic.png — ONE glowing paper lantern ===
    // Two lanterns drifting on a diagonal with a dust of sparks read as debris.
    // One big centred globe with a soft cast shadow reads as a lantern.
    const { cv, c } = canvas();
    lanternHalo(cv, { x: c, y: 208, s: 1.8, paper: true });
    contactShadow(cv, c + 6, 360, 104, 15, 0.24);
    withOutline(cv, t => {
      drawLantern(t, c, { x: c, y: 208, s: 1.8, lit: true, paper: true, hanger: false });
    }, { width: 10 });
    sheen(cv, c - 66, 158, 26, 20, 0.45);
    savePNG(path.join(OUT, 'upgrade_bamboo_attic.png'), W, W, down2(cv, W, W));
  }

  { // === upgrade_star_loft.png — the Moth Lantern: ONE lantern, ONE moth on it ===
    // Was a lantern plus two flanking moths on a full-width rail: three elements
    // where the shipped set uses one. The moth now sits ON the glass, so the
    // silhouette is single and the moth cannot vanish into empty space.
    const { cv, c } = canvas();
    ellipse(cv, c - 8, 206, 132, 148, '#9FB6D8', 0.16, 110);          // cold moonlight
    contactShadow(cv, c + 8, 360, 96, 14, 0.22);
    withOutline(cv, t => {
      drawLantern(t, c, { x: c - 4, y: 218, s: 1.66, lit: false, paper: false, hanger: true });
      // one oversized moth, perched across the glass
      const mx = c + 4, my = 216, a = -0.2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const off = (dx, dy) => [mx + dx * ca - dy * sa, my + dx * sa + dy * ca];
      for (const sgn of [-1, 1]) {
        const [hx, hy] = off(-32, sgn * 28);
        petal(t, hx, hy, 35, 22, a + sgn * 1.98, '#E4D6B8', '#877A5F');
        const [fx, fy] = off(3, sgn * 38);
        petal(t, fx, fy, 48, 28, a + sgn * 1.3, '#FDF7E9', '#A2946F');
      }
      const [bx1, by1] = off(-34, 0), [bx2, by2] = off(32, 0);
      capsule(t, bx1, by1, bx2, by2, 23, '#3F3122');
      capsule(t, bx1 - 3, by1 - 4, bx2 - 3, by2 - 4, 9, '#C0AD8A', 0.85);
      for (const sgn of [-1, 1]) {
        const [ax1, ay1] = off(29, sgn * 5), [ax2, ay2] = off(49, sgn * 19);
        capsule(t, ax1, ay1, ax2, ay2, 8, '#3F3122');
      }
    }, { width: 8 });
    sheen(cv, c - 44, 168, 12, 26, 0.4);
    savePNG(path.join(OUT, 'upgrade_star_loft.png'), W, W, down2(cv, W, W));
  }

  { // === upgrade_belfry.png — Chalk Circles: the chalk itself, mid-stroke ===
    // REDESIGNED. Pass one put white rings on a near-black plaque and dissolved on
    // an ash row. Pass two warmed the plaque, and was read blind as "two white
    // rings and a small pill on a wooden board" — three disconnected elements
    // floating inside a frame with no relationship to each other. It was a DIAGRAM
    // of the decoration, not an object, and a framed board is not a subject: it is
    // a second frame drawn inside the row's own.
    //
    // So the board is gone and the chalk is the hero: one fat stick, and one bold
    // ring it is in the middle of drawing. The two are a single connected mass
    // (the stick crosses the ring's lower-left terminus, so withOutline contours
    // them as one silhouette), the ring is deliberately LEFT OPEN at the lower
    // right so the pair can never settle into a prohibition sign, and the stick is
    // laid off-centre and off-diameter for the same reason.
    //
    // An all-white subject on cream is the risk here, so the ring carries a real
    // dark side (STONE.lo across its lower-right) rather than a soft shade: that
    // plus the INK contour gives three big steps — white stick, chalk ring, stone
    // shadow — none of which depend on the row's background colour.
    const { cv, c } = canvas();
    // The stick: flat-ended, drawn along an axis with an explicit perpendicular so
    // the three facets stay parallel. FLAT ends matter — every earlier attempt used
    // a round-capped capsule, and a white lozenge is a pill, not a piece of chalk.
    const AX = c - 86, AY = 326, BX = c + 106, BY = 126, HW = 56;
    const al = Math.hypot(BX - AX, BY - AY);
    const px = -(BY - AY) / al, py = (BX - AX) / al;   // perpendicular, down-right
    const q = (x, y, d) => [x + px * d, y + py * d];
    const face = (d0, d1) => [q(AX, AY, d0), q(BX, BY, d0), q(BX, BY, d1), q(AX, AY, d1)];
    const RX = c - 64, RY = 330;
    ellipse(cv, c - 40, 342, 78, 36, PARCH.shadow, 0.45, 44);         // chalk dust, uncontoured
    contactShadow(cv, c - 34, 356, 142, 18, 0.3);
    withOutline(cv, t => {
      // the ring the chalk has been drawing, on the floor: far half, then the
      // stick, then the near half, so the stick is physically INSIDE the ring
      groundRingArc(t, RX, RY, 100, 32, false, 26, '#E2D9C2');
      poly(t, face(-HW, HW), CHALK);                                  // the stick
      poly(t, face(-HW, -HW * 0.32), '#FFFFFF', 0.85);                // lit top facet
      poly(t, face(HW * 0.34, HW), '#C7BA9E', 0.8);                   // shaded under facet
      poly(t, [q(BX, BY, -HW), q(BX, BY, HW),
        q(BX - (BX - AX) * 0.055, BY - (BY - AY) * 0.055, HW),
        q(BX - (BX - AX) * 0.055, BY - (BY - AY) * 0.055, -HW)], '#DED3B8', 0.9);  // worn end
      groundRingArc(t, RX, RY, 100, 32, true, 26, '#F4EEDC');
      groundRingArc(t, RX, RY + 11, 100, 32, true, 11, STONE.lo, 0.45);
    }, { width: 10 });
    sheen(cv, c + 26, 190, 14, 44, 0.4);
    savePNG(path.join(OUT, 'upgrade_belfry.png'), W, W, down2(cv, W, W));
  }

  { // === upgrade_sky_garden.png — Moonflower Bed: three oversized blooms ===
    // The detached moon in the corner read as a rendering artifact and split the
    // focus, so it is gone; the moonlight survives as an uncontoured cold halo.
    const { cv, c } = canvas();
    ellipse(cv, c, 178, 156, 150, '#CFD8F2', 0.2, 120);               // moonlight, uncontoured
    contactShadow(cv, c + 8, 356, 138, 19, 0.32);
    withOutline(cv, t => {
      const stems = [[c - 80, 194], [c + 2, 156], [c + 86, 214]];
      for (const [x, y] of stems) {
        capsule(t, x + (c - x) * 0.16, 336, x, y, 20, ACCENT.lo);
        capsule(t, x + (c - x) * 0.16 - 5, 332, x - 5, y, 7, ACCENT.main, 0.75);
      }
      for (const [x, y, a] of [[c - 108, 288, 2.62], [c - 34, 266, 0.42], [c + 44, 300, 2.66], [c + 110, 288, 0.4]]) {
        petal(t, x, y, 45, 25, a, LEAF.hi, LEAF.lo);
      }
      roundRect(t, c, 338, 138, 34, 22, EARTH.hi, 1, EARTH.lo);       // soil trough
      capsule(t, c - 130, 318, c + 130, 318, 14, '#A87C48', 0.6);
      bloom(t, c - 80, 190, 58, 6, -1.05, PETAL.hi, PETAL.lo, AMB.hi, AMB.lo);
      bloom(t, c + 2, 152, 52, 6, -0.5, PETAL.hi, PETAL.lo, AMB.hi, AMB.lo);
      bloom(t, c + 86, 210, 48, 6, -1.4, PETAL.hi, PETAL.lo, AMB.hi, AMB.lo);
    }, { width: 8 });
    sheen(cv, c - 116, 158, 14, 12, 0.4);
    savePNG(path.join(OUT, 'upgrade_sky_garden.png'), W, W, down2(cv, W, W));
  }
}

// Allow `node scripts/tools/shopIcons/upgrades.mjs` for a solo render.
if (process.argv[1] && process.argv[1].endsWith('upgrades.mjs')) draw();
