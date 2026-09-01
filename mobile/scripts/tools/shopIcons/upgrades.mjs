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
 * FINAL PASS (targeted; the third pass's note is folded in below where it still
 * holds). Five tiles were named on the closing defect list and only those five
 * changed — upgrade_garden, upgrade_star_loft, upgrade_belfry, upgrade_office and
 * upgrade_bamboo_attic. The other eight were graded good at delivery size across
 * four blind rounds and are untouched, byte for byte.
 *
 *   - upgrade_belfry has now been four different subjects. Rings on a plaque read
 *     as a DIAGRAM; a chalk pointing at a ring's centre read as a magnifying
 *     glass; a chalk across it as a chord fragmented the ring; and the ring drawn
 *     alone, however richly modelled, was still "a bare ring" to every grader.
 *     A drawn LINE does not read as an object at 56dp, so the hero is now the one
 *     thing here with real material presence — a fat cut stick of chalk, seated in
 *     its own dust — lying diagonally THROUGH a closed chalk circle.
 *   - upgrade_garden's tubes were made to OVERLAP by the third pass, which is
 *     exactly what broke it: with no gap, the neighbour drawn last painted over
 *     the previous tube's highlight and four tubes fused into one lobed gold mass
 *     with no keylines. They are now SPACED so only their ink keylines meet, and
 *     the tile draws the whole chime (cord, disc, open cord, tubes, striker,
 *     wind sail) the way its legible tier-2 sibling does.
 *   - upgrade_star_loft's moth was built from bare fills, so its body overran the
 *     right forewing into an un-outlined cut and the rear wing's contour stopped
 *     in mid-air. Every part now lays its own grown ink shape, back to front.
 *   - upgrade_office and upgrade_bamboo_attic both carried a DARK halo: amber and
 *     orange at low alpha are darker than the cream parchment in two channels of
 *     three, so on a light shop row each "glow" laid a grey-brown smudge around
 *     its own light source. Both are warm WHITE now, and both were also running
 *     off the canvas edge, which cost those tiles their contour and contact gap.
 *
 * EVERY subject in this file clears the canvas edge by at least 4px on all four
 * sides, measured, so no tile can lose its contour in a list row.
 *
 * Still true from the third pass: upgrade_jungle_room is one thick trunk with
 * every leaf anchored onto it.
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
 * A chime tube: a cut length of pipe with its own ink keyline and an open mouth
 * at the bottom. Two things here are scar tissue from the previous draft, which
 * packed its tubes so they OVERLAPPED into one column:
 *   - roundRect, not capsule. A capsule's round caps put the tube's real top
 *     th/2 above its stated top, which ate the run of open cord it was supposed
 *     to hang from and welded the block to the disc above it.
 *   - the tubes are now SPACED so their bodies never touch and only their ink
 *     keylines meet. Overlapping bodies meant the neighbour drawn last painted
 *     over the previous tube's highlight, so the right-hand tubes lost all
 *     modelling and four tubes fused into a single lobed gold mass.
 */
function brassTube(cv, x, yTop, yBot, th, pal) {
  const cy = (yTop + yBot) / 2, hh = (yBot - yTop) / 2, hw = th / 2, rad = th * 0.22;
  roundRect(cv, x, cy, hw + 6, hh + 6, rad + 6, INK, 0.92);
  roundRect(cv, x, cy, hw, hh, rad, pal.base);
  roundRect(cv, x - hw * 0.38, cy, hw * 0.28, hh - 7, hw * 0.26, pal.hi, 0.95);
  roundRect(cv, x + hw * 0.54, cy, hw * 0.24, hh - 7, hw * 0.22, pal.lo, 0.7);
  ellipse(cv, x, yBot - 6, hw * 0.8, 9, pal.lo, 0.9);            // the open mouth
  ellipse(cv, x, yBot - 8, hw * 0.54, 5.5, '#5B3A11', 0.85);
}

/**
 * A cut stick — a chamfered rectangle laid along an axis, as a point list for
 * `poly`. Used for the chalk: a stick of chalk has FLAT ends, and both `capsule`
 * and an axis-aligned `roundRect` refuse to give it one on a diagonal.
 * `off` slides the whole outline sideways across the stick's own width, which is
 * how the lit and shaded facets are cut without a second coordinate system.
 */
function stickPts(bx, by, tx, ty, hw, cut, off = 0, trimB = 0, trimT = 0) {
  const L = Math.hypot(tx - bx, ty - by) || 1;
  const dx = (tx - bx) / L, dy = (ty - by) / L, px = -dy, py = dx;
  const P = (a, b) => [bx + dx * a + px * (b + off), by + dy * a + py * (b + off)];
  const a0 = trimB, a1 = L - trimT;
  return [P(a0, hw - cut), P(a0 + cut, hw), P(a1 - cut, hw), P(a1, hw - cut),
    P(a1, -(hw - cut)), P(a1 - cut, -hw), P(a0 + cut, -hw), P(a0, -(hw - cut))];
}

/**
 * A polygon pushed outward from its own centroid by `g`. This is how each moth
 * wing gets a closed ink contour of its own: the previous moth drew its wings as
 * bare fills, so the rear wing's outline simply stopped in mid-air and the body
 * ran off the edge of the forewing into an un-outlined blunt cut.
 */
function grow(pts, g) {
  const n = pts.length;
  const cx = pts.reduce((s, p) => s + p[0], 0) / n, cy = pts.reduce((s, p) => s + p[1], 0) / n;
  return pts.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    return [x + ((x - cx) / d) * g, y + ((y - cy) / d) * g];
  });
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
/** A ROTATED oval as a point list, for `poly` — used for the spout's mouth,
 *  which has to sit square across a diagonal axis (an axis-aligned `ellipse`
 *  cannot, and a spout with no opening reads as a broken second handle). */
function ovalPts(cx, cy, ra, rb, rot, n = 24) {
  const ca = Math.cos(rot), sa = Math.sin(rot);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, u = Math.cos(a) * ra, v = Math.sin(a) * rb;
    return [cx + u * ca - v * sa, cy + u * sa + v * ca];
  });
}

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
    // The dead wick and its cold pan. The pan used to be a lone ellipse at alpha
    // exactly 0.5, which is the one alpha withOutline's seed test rejects: it was
    // composited but never contoured, so it read as a pale smudge floating loose
    // in the glass. Both parts now sit well above that threshold and are shapes.
    capsule(cv, x, y - u(20), x, y + u(14), u(11), GLASS.lo, 0.85);  // dead wick
    roundRect(cv, x, y + u(24), u(22), u(8), u(4), GLASS.lo, 0.9);   // its cold pan
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
      // Spout, left — two tapering segments ending in a FLARED, OPEN MOUTH.
      // Without the mouth the spout was a featureless nub and graded as "a second
      // broken handle"; the opening is what tells the eye which end pours. It is
      // a rotated oval (see ovalPts) because the spout runs on a diagonal, so an
      // axis-aligned ellipse would sit across it crooked.
      capsule(t, c - 88, 214, c - 124, 184, 48, COPPER.base);
      capsule(t, c - 122, 186, c - 146, 160, 30, COPPER.base);
      capsule(t, c - 128, 176, c - 146, 155, 12, COPPER.hi, 0.7);
      const spoutAng = Math.atan2(160 - 186, -146 + 122);          // along the spout
      poly(t, ovalPts(c - 151, 155, 13, 26, spoutAng), COPPER.hi, 1, COPPER.mid);
      poly(t, ovalPts(c - 152, 154, 7, 18, spoutAng), COPPER.lo);   // the bore
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
      // The dome's highlight rides a radius of 46, INSIDE the dome. At 76 it swung
      // wide of a form only 58 tall, so its upper-left half hung past the
      // silhouette — a pale stroke arcing away into the background, contoured
      // along with everything else because it sits above withOutline's 0.5 seed.
      arcStroke(t, c, 150, 46, 15, Math.PI * 1.16, Math.PI * 1.70, '#FFE6C4', 0.6);
      // Knob: a NECK that starts above the dome and ends well inside it, with the
      // ball seated on the neck. The old ball floated with a 3px kiss against the
      // dome, which withOutline drew as two contours meeting — a detached bead.
      capsule(t, c, 76, c, 112, 30, COPPER.mid);
      capsule(t, c - 9, 80, c - 9, 108, 10, COPPER.hi, 0.55);
      ellipse(t, c, 66, 30, 26, COPPER.hi);
      ellipse(t, c + 8, 74, 17, 12, COPPER.mid, 0.6);
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
    // The cast light is WARM WHITE, not amber. A glow is a glow only if it
    // lightens the surface it lands on, and #FFC65C at 0.2 is darker than the
    // cream parchment in two channels of three: on a light shop row the old halo
    // dropped a grey-brown smudge around the lamp, and it also ran 12px off the
    // bottom of the canvas, which cost the tile its contour and its contact gap
    // along that edge. These two stops sit above cream in every channel, so they
    // can only lift it, and both are comfortably inside the frame.
    ellipse(cv, c, 176, 150, 130, '#FFF3D2', 0.26, 100);              // cast light, uncontoured
    ellipse(cv, c, 142, 100, 84, '#FFFCEE', 0.26, 64);
    contactShadow(cv, c + 10, 350, 108, 18, 0.32);
    withOutline(cv, t => {
      ellipse(t, c, 332, 96, 27, BRASS.hi);                           // base
      ellipse(t, c, 340, 82, 17, BRASS.lo, 0.85);
      capsule(t, c, 334, c, 168, 28, BRASS.lo);                       // pole
      capsule(t, c - 7, 330, c - 7, 172, 9, BRASS.hi, 0.9);
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

  { // === upgrade_garden.png — Wind Chimes: the WHOLE chime, warm brass, ragged ===
    // REBUILT, and this time against its own tier-2 sibling rather than against
    // the abstract rule that mass must fill the tile. Pass three obeyed that rule
    // by packing three fat tubes until they OVERLAPPED, and the result was worse
    // than the voids it replaced: with no gap between them the neighbour drawn
    // last painted over the previous tube's highlight, so the two right-hand
    // tubes lost all modelling, every keyline disappeared, and the subject fused
    // into one lobed gold mass terminating at four different heights with the
    // contour broken open on the lower right. A blind grader could not name it.
    //
    // deepen_garden solves this same subject legibly by drawing the COMPLETE
    // object: hanging cord, suspension disc, a real run of open cord, the tube
    // block, then a striker and a wind sail hanging below it. Those last parts
    // are what nobody mistakes for test tubes or a xylophone, so this tile is
    // staged the same way — and the two stay clearly apart where it matters.
    // Tier-1 is warm brass, four tubes cut to RAGGED lengths, a round turned bob
    // and a wide flat wind paddle: a chime in a breeze. Tier-2 is cold steel,
    // every tube one measure, disc-topped and dead still.
    //
    // Three proportions are load-bearing and were all wrong in the first rebuild,
    // which read as a pendant chandelier:
    //   - the tubes are LONG (about 3x their width). Short tubes read as bulbs.
    //   - the disc is FLAT and NARROWER than the tube block. A wide domed disc
    //     over short tubes is a lampshade, whatever it is painted like.
    //   - the striker is a ball sitting on a WIDE flat sail. A ball tapering into
    //     something narrower below it is an acorn.
    // And the tubes are SPACED so their bodies never touch and only their ink
    // keylines meet, which leaves one continuous dark seam between neighbours —
    // the only thing that keeps four bright tubes from reading as a slab at 56dp.
    const { cv, c } = canvas();
    const TX = [c - 96, c - 32, c + 32, c + 96];    // bodies 10 apart, keylines touching
    const TB = [222, 280, 268, 214];                // ragged, but a deliberate arc
    withOutline(cv, t => {
      capsule(t, c, 26, c, 52, 11, WOOD.dark);                       // it hangs
      capsule(t, c - 4, 30, c - 4, 48, 4.5, WOOD.rim, 0.55);
      ellipse(t, c, 66, 104, 14, WOOD.dark);                         // suspension disc
      ellipse(t, c, 57, 104, 14, WOOD.base);
      ellipse(t, c - 32, 52, 36, 5, WOOD.rim, 0.6);
      // A REAL RUN of open cord between the disc and the tube tops. Without it the
      // disc's contour and the tube block's contour merge and the whole object
      // reads as a cabinet rather than as something hanging in the air.
      for (const x of TX) capsule(t, x, 74, x, 130, 9, WOOD.seam, 0.95);
      for (let i = 0; i < TX.length; i++) brassTube(t, TX[i], 124, TB[i], 54, BRASSTUBE);
      capsule(t, c, 272, c, 296, 9, WOOD.seam);                      // striker cord
      // The striker: one turned wooden bob, and deliberately the DARKEST value on
      // the tile — a pale bob in front of pale brass is a shape with no value
      // behind it, which is how the last draft lost it.
      ellipse(t, c, 308, 26, 24, WOOD.seam);
      ellipse(t, c - 3, 303, 21, 19, WOOD.dark);
      ellipse(t, c - 9, 296, 9, 7, WOOD.mid, 0.9);
      // The wind sail, wider than it is tall and overlapping the bob with its own
      // grown keyline: an 8px cord between two masses is narrower than the
      // contour that would be drawn on both sides of it, so the two would fuse.
      const sail = [[c - 37, 328], [c + 37, 333], [c + 31, 357], [c - 31, 352]];
      poly(t, grow(sail, 6), INK, 0.95);
      poly(t, sail, WOOD.base, 1, WOOD.dark);
    }, { width: 9 });
    sheen(cv, c - 40, 52, 24, 5, 0.45);
    sheen(cv, c - 88, 160, 8, 40, 0.5);
    savePNG(path.join(OUT, 'upgrade_garden.png'), W, W, down2(cv, W, W));
  }

  { // === upgrade_bamboo_attic.png — ONE glowing paper lantern ===
    // Two lanterns drifting on a diagonal with a dust of sparks read as debris.
    // One big centred globe with a soft cast shadow reads as a lantern.
    //
    // The halo was rebuilt for the final pass. At s = 1.8 it ran 43px past the
    // left edge, 43px past the right and 52px past the bottom, so the tile lost
    // its contour and its contact gap on three sides at once and sat a step lower
    // than its neighbours in a list. It was also drawn in ORANGE, which is darker
    // than the cream parchment in two channels of three, so on a light shop row a
    // "glow" laid a brown smudge around the lantern. Both stops are now warm
    // WHITE — above cream in every channel, so they can only lighten — and both
    // sit a clear 20px inside the frame while still reading past the paper body.
    const { cv, c } = canvas();
    ellipse(cv, c, 206, 152, 148, '#FFF2CE', 0.26, 108);              // bloom, uncontoured
    ellipse(cv, c, 206, 134, 130, '#FFFAE8', 0.24, 82);
    contactShadow(cv, c + 6, 350, 100, 14, 0.24);
    withOutline(cv, t => {
      drawLantern(t, c, { x: c, y: 206, s: 1.75, lit: true, paper: true, hanger: false });
    }, { width: 10 });
    sheen(cv, c - 64, 158, 26, 20, 0.45);
    savePNG(path.join(OUT, 'upgrade_bamboo_attic.png'), W, W, down2(cv, W, W));
  }

  { // === upgrade_star_loft.png — the Moth Lantern: ONE lantern, ONE moth on it ===
    // The lantern was graded good. The MOTH was not, and it failed in exactly the
    // way a shape built from bare fills fails: the body bar overran the right
    // forewing and ended in a blunt un-outlined cut floating over the blue glass,
    // the highlight laid along the body poked out past it as a stray brown stub,
    // the rear wing's outline stopped in mid-air, and the wings carried no
    // contour at all — the only subject on the sheet that did not.
    //
    // So the moth is rebuilt part by part, BACK TO FRONT, and every part lays its
    // own grown ink shape (see `grow`) before its fill: hind wings, then fore
    // wings over them, then the antennae, then the body over all four wing roots,
    // then the head over the body and the antenna stubs. Nothing terminates in
    // open air and nothing overruns anything, because the body is contained
    // inside the wing span by construction rather than by luck.
    //
    // Two proportions decide whether it reads at 56dp. The moth is UPRIGHT — head
    // up, wings spread, antennae in a V — since a horizontal body reads as a twig.
    // And the WINGS carry the mass: the first rebuild gave the body and head so
    // much ink that four small wings read as pale blobs around a dark cross, so
    // the wings are now nearly twice the area and the body and head are thin.
    const { cv, c } = canvas();
    ellipse(cv, c - 8, 206, 132, 148, '#9FB6D8', 0.16, 110);          // cold moonlight
    contactShadow(cv, c + 8, 360, 96, 14, 0.22);
    withOutline(cv, t => {
      drawLantern(t, c, { x: c - 4, y: 218, s: 1.66, lit: false, paper: false, hanger: true });

      // --- ONE oversized moth, perched across the glass -----------------------
      const MX = c - 4, MY = 222, MA = -0.1;
      const ca = Math.cos(MA), sa = Math.sin(MA);
      const P = ([lx, ly]) => [MX + lx * ca - ly * sa, MY + lx * sa + ly * ca];
      const wing = (pts, sgn) => pts.map(([x, y]) => P([x * sgn, y]));
      const FORE = [[8, -34], [42, -46], [70, -20], [48, 14], [14, 4]];
      const HIND = [[10, 4], [46, 16], [50, 42], [24, 48], [8, 26]];

      for (const sgn of [-1, 1]) {                                   // hind wings, behind
        const w = wing(HIND, sgn);
        poly(t, grow(w, 7), INK, 0.95);
        poly(t, w, '#D9CAA7', 1, '#8B7E5E');
      }
      for (const sgn of [-1, 1]) {                                   // fore wings, over them
        const w = wing(FORE, sgn);
        poly(t, grow(w, 7), INK, 0.95);
        poly(t, w, '#FCF5E4', 1, '#AFA281');
        // ONE band per forewing: a moth's single big value step, never a texture
        poly(t, [P([20 * sgn, -32]), P([44 * sgn, -36]), P([58 * sgn, -12]), P([30 * sgn, -8])],
          '#8B7952', 0.55);
      }
      for (const sgn of [-1, 1]) {                                   // antennae, from the head
        const a1 = P([6 * sgn, -42]), a2 = P([18 * sgn, -62]), a3 = P([30 * sgn, -80]);
        capsule(t, a1[0], a1[1], a2[0], a2[1], 11, INK, 0.95);
        capsule(t, a2[0], a2[1], a3[0], a3[1], 10, INK, 0.95);
        capsule(t, a1[0], a1[1], a2[0], a2[1], 5.5, '#6F5A3C');
        capsule(t, a2[0], a2[1], a3[0], a3[1], 5, '#6F5A3C');
        ellipse(t, a3[0], a3[1], 7, 7, INK, 0.95);                   // a club, never a cut end
        ellipse(t, a3[0], a3[1], 4.5, 4.5, '#A8946C');
      }
      const bT = P([0, -30]), bB = P([0, 32]);                       // body, inside the wings
      capsule(t, bT[0], bT[1], bB[0], bB[1], 28, INK, 0.95);
      capsule(t, bT[0], bT[1], bB[0], bB[1], 18, '#6F5A3C');
      const sT = P([-3, -22]), sB = P([-3, 24]);
      capsule(t, sT[0], sT[1], sB[0], sB[1], 6, '#A8946C', 0.85);    // dorsal stripe, inset
      const hd = P([0, -40]);                                        // head, over both
      ellipse(t, hd[0], hd[1], 16, 16, INK, 0.95);
      ellipse(t, hd[0], hd[1], 11, 11, '#6F5A3C');
      const he = P([-4, -44]);
      ellipse(t, he[0], he[1], 5, 4.5, '#A8946C', 0.9);
    }, { width: 8 });
    sheen(cv, c - 52, 108, 18, 8, 0.42);
    savePNG(path.join(OUT, 'upgrade_star_loft.png'), W, W, down2(cv, W, W));
  }

  { // === upgrade_belfry.png — Chalk Circles: the chalk itself, the ring behind ==
    // FOURTH SUBJECT, and the four failures behind it are the whole argument.
    // Rings on a plaque read as a DIAGRAM of the decoration. A chalk pointing at a
    // ring's centre rendered a magnifying glass. A chalk laid across the ring as a
    // chord fragmented the ring. And the ring drawn alone as a fat tapering bead,
    // shaded round and overrunning its own start, was still only "a bare ring" or
    // "a pale hoop" to a blind grader.
    //
    // The lesson taken is that a DRAWN LINE will not read as an object at 56dp,
    // however it is modelled. So the hero is the one thing on this tile with real
    // material presence — a fat cut stick of chalk, seated on a bed of its own
    // dust with a contact shadow under it — and the ring is demoted to CONTEXT.
    //
    // The staging took four tries of its own and every failure named a rule.
    // A chalk leaning UP the ring's lower-left flank chained into the stroke: an
    // open C beside a white stub at a tangent is a blade with a handle, and it
    // graded as a sickle. A chalk lying FLAT under the ring, wholly inside its
    // silhouette, stopped being a second object and read as a tag on a keyring.
    // A chalk standing against the outside of the rim gave a lollipop, because
    // ANY bar meeting a circle at its edge and stopping there is a handle. And a
    // chalk laid radially is the magnifying glass from pass two.
    //
    // What is left, and what this draws: the ring is CLOSED (swept past 360 with
    // its tail laid over its own start, which is both what a hand-drawn circle
    // does and what stops it ever reading as a blade), and the chalk lies
    // DIAGONALLY THROUGH it — butt outside the ring at the lower left, tip well
    // inside the open middle — crossing the stroke exactly once at about fifty
    // degrees to the tangent there. Passing through is what kills the handle: an
    // object that continues past a rim is lying on the circle, not hanging off
    // it. The axis still misses the centre by two thirds of a radius and the tip
    // stops well short of it, so neither the magnifying glass nor the chord
    // comes back, and the ring is occluded in ONE place and emerges on both
    // sides of it.
    const { cv, c } = canvas();
    const RCX = c + 30, RCY = 142, RRX = 104, RRY = 96;
    const A0 = -2.4, A1 = A0 + Math.PI * 2 + 0.3;           // a closed ring, tail over start
    const N = 112;
    // Thin where the hand sets down and lifts, fat through the middle of the
    // swing. It never goes below 12: under that the contour swallows the chalk
    // core and a tapering end reads as a dark blob rather than a lift-off.
    const beadAt = u => 16 + 13 * Math.pow(Math.max(0, Math.sin(Math.min(1, u * 1.02) * Math.PI * 0.99)), 0.4);
    const ptAt = u => {
      const a = A0 + (A1 - A0) * u;
      const wob = 1 + 0.03 * Math.sin(a * 3 + 0.7);         // chalk is never machined
      return [RCX + Math.cos(a) * RRX * wob, RCY + Math.sin(a) * RRY * wob];
    };
    const ring = (g, u0, u1, dx, dy, k, color, alpha = 1) => {
      const steps = Math.max(2, Math.round(N * (u1 - u0)));
      for (let i = 0; i < steps; i++) {
        const a = u0 + ((u1 - u0) * i) / steps, b = u0 + ((u1 - u0) * (i + 1)) / steps;
        const [x0, y0] = ptAt(a), [x1, y1] = ptAt(b);
        capsule(g, x0 + dx, y0 + dy, x1 + dx, y1 + dy, beadAt(a) * k, color, alpha);
      }
    };
    const bead = (g, u0, u1) => {
      ring(g, u0, u1, 4, 6, 1.0, '#B0A489');                // shaded flank, lower-right
      ring(g, u0, u1, 0, 0, 0.86, '#DCD4BA');               // the mark itself
      ring(g, u0, u1, -5, -6, 0.34, '#F1EAD4', 0.9);        // lit crown, upper-left
    };
    const BX = c - 82, BY = 328, TPX = c + 30, TPY = 212;   // the chalk lies through it
    ellipse(cv, c - 66, 348, 78, 16, '#F7F1E2', 0.4, 48);   // its dust, uncontoured
    contactShadow(cv, c - 74, 352, 56, 11, 0.3);
    withOutline(cv, g => {
      bead(g, 0, 0.92);
      ring(g, 0.9, 1, 0, 0, 1.26, INK, 0.92);               // the tail lies ACROSS the start
      bead(g, 0.9, 1);
      // The chalk over it, keylined, so the ring reads as passing BEHIND an object
      // rather than as a hoop with a bite taken out of it.
      poly(g, stickPts(BX, BY, TPX, TPY, 45, 13), INK, 0.95);
      poly(g, stickPts(BX, BY, TPX, TPY, 38, 10), '#FCF7EA', 1, '#A79B80');
      // THREE flat value steps across the width, not a gradient: a prism has
      // facets, and a single smooth ramp on a pale slab read as a blank label.
      poly(g, stickPts(BX, BY, TPX, TPY, 11, 4, -23, 15, 17), '#FFFFFF', 0.85);
      poly(g, stickPts(BX, BY, TPX, TPY, 12, 4, 25, 15, 17), '#8E8268', 0.9);
      // the flat cut end: chalk is a stick that was snapped, not a rod that was turned
      const L = Math.hypot(TPX - BX, TPY - BY), px = -(TPY - BY) / L, py = (TPX - BX) / L;
      capsule(g, TPX - px * 30, TPY - py * 30, TPX + px * 30, TPY + py * 30, 15, CHALK, 0.95);
    }, { width: 10 });
    sheen(cv, c - 64, 106, 14, 10, 0.35);
    sheen(cv, c + 4, 216, 15, 12, 0.35);
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
