/**
 * gameIcons/achievementsMasteryB.mjs — MASTERY CRESTS, PART B (14 icons).
 *
 * One painted crest per variant / modifier achievement (src/services/
 * achievements.ts), filed as assets/ui/achievements/<id>.png. They render at
 * 34dp in the Stats list and 26dp in the unlock toast, in ONE scrolling list
 * with every other achievement, so each crest has to be told from its
 * category-mates by SILHOUETTE alone. Think "a badge a cottage would hang".
 *
 * This family is SEVEN PAIRS, not ladders: a first-win crest and a milestone
 * crest for each variant/modifier, plus the explorer and the apex. The rule for
 * a pair is SAME THEME, DIFFERENT SILHOUETTE — the two sit a row apart in the
 * list, and a pair told apart by count or glow alone would read as one icon
 * drawn twice:
 *
 *   REVERSE  reverse_first  a horseshoe                      -> an iron U
 *            reverse_15     a road winding back up a hill to a tiny cottage
 *                                                            -> a green mound
 *   DOUBLE   double_first   two lettered candy tiles tied with ONE red ribbon
 *                                                            -> two offset squares + a small bow
 *            double_15      a pair of leather work gloves, palms out
 *                                                            -> two scalloped mitts
 *   SPEED    speed_first    a brass pocket stopwatch          -> a disc with a crown
 *            speed_15       a winged boot                     -> a boot with a wing
 *   EXPLORER variant_explorer  a brass compass rose           -> a disc with an 8-point star
 *   BLIND    blind_first    a dark blindfold, knotted         -> a curved band + tails
 *            blind_10       a hand reading a raised-dot letter tile by touch
 *                                                            -> a square with a dotted L + a pointing hand
 *   EXPERT   expert_first   a tall narrow bare pinnacle, a big flag planted
 *                                                            -> a spire + a pennant
 *            expert_25      a broad snowy summit, a rising sun behind it
 *                                                            -> a two-peak massif + a rayed disc
 *   LEXICON  lexicon_first  an old page with a red wax seal   -> a leaf of paper + a red disc
 *            lexicon_25     a hoard: a level stack of three books, a scroll
 *                           along the top, a coin against the front
 *                                                            -> a stepped stack
 *   APEX     max_stack      five tiles fanned into a full circle, a crimson sigil
 *                           at the hub                        -> a five-petal wheel
 *
 * COMPOSITION. Two of the subjects the brief asked for are scenes (a road, a
 * hoard), and the house rule is ONE centred silhouette. Both are therefore built
 * on an ANCHOR MASS the eye lands on first: the road is cut INTO a single green
 * hill mound and the cottage sits on its crown, so the crest is a hill; the hoard
 * is a level, aligned stack of three books with the scroll lying along the top
 * and the coin against the front, so the crest is a stack. Nothing floats and
 * nothing tilts (a first pass with four objects at four angles was unnameable).
 *
 * PALETTE. The two tile subjects wear the game's own candy hues (TILE, from
 * CandyColors.tileColors) and are drawn by the same `tile()` primitive the
 * puzzle ladder uses, so a tile is a tile across the whole list, and every tile
 * keeps the game's NEAR-SQUARE bevel proportions (a first pass let the pair and
 * the touch tile drift to card shapes and they read as a gift box and a phone).
 * Iron is a cool light steel three value steps off the ash paper; leather and
 * wood are the shop's warm browns; brass is the kit's; both peaks are warm bare
 * rock (PEAK) so the summit pair no longer pulls cold against the family and the
 * shadow face holds a clear step above ash. The blindfold is a slate indigo (a
 * "dark cloth" drawn at true black would vanish on ash) with a big lit fold. The
 * apex crest leans dread on purpose: the hub is a near-black disc with a crimson
 * five-point sigil, the one crimson-on-black note in the family.
 *
 * House doctrine (see _draw.mjs): contact shadow and any halo go down on the
 * real canvas FIRST (never contoured), the subject is drawn inside withOutline,
 * the upper-left sheen lands on top of the contour. INK outlines, never #000.
 * The one halo (the summit sun) is lighter than cream parchment in every channel
 * so it can only lift the surface it lands on. No Math.random: every coordinate
 * is a literal, so the generator is byte-reproducible.
 *
 * All coordinates are in the 384x384 supersample space (c = 192 is the centre);
 * each file is downsampled 2x to a 192px PNG.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  canvas, savePNG, down2, W, contactShadow, sheen, withOutline,
  INK, WOOD, PARCH, ACCENT, BRASS, STONE,
  ellipse, roundRect, poly, capsule, arcStroke, tri, starPts, blend, hex,
} from '../shopIcons/_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui/achievements');

// --- palettes ----------------------------------------------------------------
/** [face, edge] pairs from CandyColors.tileColors (src/theme/colors.ts). */
const TILE = {
  pink: ['#FF6B9D', '#D44D7A'], purple: ['#C44DFF', '#9933CC'], blue: ['#4DAFFF', '#2E8BC0'],
  teal: ['#4DE8C2', '#2EAF8E'], yellow: ['#FFD84D', '#CCB030'], orange: ['#FF8C4D', '#CC6633'],
};
const IRON = { hi: '#E3E5EC', base: '#B4B7C4', mid: '#7A7E90', lo: '#484B5A' };
const LEATHER = { hi: '#E0AC6E', base: '#BD7F45', lo: '#7E4B22', cuff: '#5B361A' };
const GOLD = { up: '#FFE9A8', hi: '#FFD469', mid: '#F0A81E', lo: '#A96406', deep: '#6E3D06' };
const CRIMSON = { hi: '#F2685A', base: '#C4302B', lo: '#7C1518' };
const WINE = { hi: '#B84A74', base: '#8C2D52', lo: '#54152F' };
const NAVY = { hi: '#5468B4', base: '#38468C', lo: '#1F2756' };
const CLOTH = { hi: '#8C84B4', base: '#5C5580', lo: '#35304E', deep: '#221F34' };
const SKIN = { hi: '#F8D4AC', base: '#E8AE7C', lo: '#BC7444' };
const LEAF = { hi: '#A6D46A', base: '#6FAF3F', lo: '#3D7A26' };
const ROAD = { hi: '#EFD9A8', base: '#D8B87C', lo: '#9C7A44' };
const SNOW = { hi: '#FFFFFF', lo: '#D6E0EC' };
/** Warm bare rock, both peaks: a lit tan/ochre face and a warm brown shadow face
 *  that stays a clear step above the ash paper (the first pass was slate grey,
 *  which sank into ash at 32px and pulled cold against the brass/wood family). */
const PEAK = { litHi: '#C4A886', litLo: '#9C7E5C', shHi: '#7E5A42', shLo: '#644634', crag: '#5A3E2C' };
const OCHRE = { hi: '#DCB06A', base: '#BC8634', lo: '#7E5316' };
const SAGE = { hi: '#A2C67C', base: '#7AA455', lo: '#4E7A33' };
const OLDPAGE = { hi: '#EBD6A9', base: '#DCC08A', lo: '#B8955F', ink: '#6B4A2A' };
const HALO = '#FFF3D2';              // lighter than cream (#F3E2BF) in every channel

// --- local helpers -------------------------------------------------------------
function shade(colorHex, f) {
  const n = parseInt(colorHex.slice(1), 16);
  const ch = i => Math.max(0, Math.min(255, Math.round(((n >> i) & 255) * f)));
  const v = (ch(16) << 16) | (ch(8) << 8) | ch(0);
  return '#' + (v | 0x1000000).toString(16).slice(1).toUpperCase();
}

/** A rotated rounded rectangle as a point list for `poly`. */
function roundRectPts(cx, cy, hw, hh, rad, ang, per = 6) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const r = Math.min(rad, hw, hh);
  const corners = [
    [hw - r, hh - r, 0], [-(hw - r), hh - r, Math.PI / 2],
    [-(hw - r), -(hh - r), Math.PI], [hw - r, -(hh - r), -Math.PI / 2],
  ];
  const pts = [];
  for (const [kx, ky, a0] of corners) {
    for (let i = 0; i <= per; i++) {
      const a = a0 + (i / per) * (Math.PI / 2);
      const lx = kx + Math.cos(a) * r, ly = ky + Math.sin(a) * r;
      pts.push([cx + lx * ca - ly * sa, cy + lx * sa + ly * ca]);
    }
  }
  return pts;
}

/** A rotated oval as a point list (bow loops, coin rims). */
function ovalPts(cx, cy, ra, rb, rot, n = 28) {
  const ca = Math.cos(rot), sa = Math.sin(rot);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, u = Math.cos(a) * ra, v = Math.sin(a) * rb;
    return [cx + u * ca - v * sa, cy + u * sa + v * ca];
  });
}

/** Upper half of an ellipse closed along its flat base — a dome, a cap of hair. */
function domePts(cx, cy, rx, ry, n = 26) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

/** Closed ring stroke (arcStroke double-beads at a full-circle seam). */
function ringStroke(cv, cx, cy, r, th, color, alpha = 1) {
  const [rr, gg, bb] = hex(color);
  const half = th / 2, ext = r + half + 2;
  for (let y = Math.max(0, ~~(cy - ext)); y <= Math.min(cv.h - 1, ~~(cy + ext)); y++)
    for (let x = Math.max(0, ~~(cx - ext)); x <= Math.min(cv.w - 1, ~~(cx + ext)); x++) {
      const d = Math.abs(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r) - half;
      const a = Math.max(0, Math.min(1, 0.5 - d));
      if (a > 0) blend(cv, x, y, rr, gg, bb, a * alpha);
    }
}

/** A polygon pushed outward from its own centroid by `g` (a per-part keyline). */
function grow(pts, g) {
  const n = pts.length;
  const cx = pts.reduce((s, p) => s + p[0], 0) / n, cy = pts.reduce((s, p) => s + p[1], 0) / n;
  return pts.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    return [x + ((x - cx) / d) * g, y + ((y - cy) / d) * g];
  });
}

/** A chain of capsules through `pts` with a width that ramps th0 -> th1. */
function ribbonPath(t, pts, th0, th1, color, alpha = 1, dx = 0, dy = 0) {
  for (let i = 1; i < pts.length; i++) {
    const u = (i - 0.5) / (pts.length - 1);
    const th = th0 + (th1 - th0) * u;
    capsule(t, pts[i - 1][0] + dx, pts[i - 1][1] + dy, pts[i][0] + dx, pts[i][1] + dy, th, color, alpha);
  }
}

/** A tapered strap from (x0,y0) width w0 to (x1,y1) width w1, as a point list. */
function strapPts(x0, y0, x1, y1, w0, w1) {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  const px = -(y1 - y0) / L, py = (x1 - x0) / L;
  return [
    [x0 + px * w0 / 2, y0 + py * w0 / 2], [x1 + px * w1 / 2, y1 + py * w1 / 2],
    [x1 - px * w1 / 2, y1 - py * w1 / 2], [x0 - px * w0 / 2, y0 - py * w0 / 2],
  ];
}

/** Letter glyphs as stroke segments in a unit box (y down). */
const GLYPHS = {
  W: [[-1, -1, -0.55, 1], [-0.55, 1, 0, -0.2], [0, -0.2, 0.55, 1], [0.55, 1, 1, -1]],
  T: [[-0.9, -1, 0.9, -1], [0, -1, 0, 1]],
  R: [[-0.7, -1, -0.7, 1], [-0.7, -1, 0.4, -1], [0.4, -1, 0.8, -0.6], [0.8, -0.6, 0.4, -0.1], [0.4, -0.1, -0.7, -0.1], [0.1, -0.1, 0.8, 1]],
  D: [[-0.7, -1, -0.7, 1], [-0.7, -1, 0.2, -1], [0.2, -1, 0.8, -0.4], [0.8, -0.4, 0.8, 0.4], [0.8, 0.4, 0.2, 1], [0.2, 1, -0.7, 1]],
  S: [[0.8, -0.85, -0.2, -1], [-0.2, -1, -0.8, -0.5], [-0.8, -0.5, 0, -0.05], [0, -0.05, 0.8, 0.45], [0.8, 0.45, 0.2, 1], [0.2, 1, -0.8, 0.85]],
  X: [[-0.8, -1, 0.8, 1], [0.8, -1, -0.8, 1]],
};

/**
 * ONE candy letter tile in the game's own tile chrome (the same primitive the
 * puzzle ladder draws): darker edge slab, bevel plane over the top half, gloss
 * bar, upper-right specular dot. EXTRUDED so it has thickness. `e` is the
 * extrusion depth, `letter` optional, `letterScale` the glyph half-size as a
 * fraction of the tile's smaller half-extent (0.52 is the ladder's default; the
 * ribbon pair uses a bigger glyph so the letters survive a band across them).
 */
function tile(t, cx, cy, hw, hh, angDeg, pal, letter = null, e = Math.round(hh * 0.2), letterScale = 0.52) {
  const ang = (angDeg * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (lx, ly) => [cx + lx * ca - ly * sa, cy + lx * sa + ly * ca];
  const RR = (lx, ly, w, h, rad) => roundRectPts(...P(lx, ly), w, h, rad, ang);
  const rad = Math.min(22, hw * 0.28, hh * 0.28);

  poly(t, RR(0, e, hw + 8, hh + e + 8, rad + 6), INK);                      // own keyline
  poly(t, RR(0, 2 * e, hw, hh, rad), shade(pal[1], 0.54));                  // base plane
  poly(t, RR(0, e, hw, hh, rad), pal[1]);                                   // side plane
  poly(t, RR(0, 0, hw, hh, rad), pal[0]);                                   // face
  poly(t, RR(0, -hh * 0.46, hw - 6, hh * 0.54, rad * 0.9), shade(pal[0], 1.16));  // bevel plane
  poly(t, RR(0, -hh * 0.62, hw * 0.76, hh * 0.13, Math.min(13, hh * 0.12)), '#FFFFFF', 0.4);
  const [sx, sy] = P(hw * 0.56, -hh * 0.54);
  ellipse(t, sx, sy, hw * 0.14, hw * 0.14, '#FFFFFF', 0.75, 3);            // specular dot

  if (!letter) return;
  const s = Math.min(hw, hh) * letterScale, th = s * 0.36;
  const dark = shade(pal[1], 0.62), light = '#FFF6E2';
  if (letter === 'O') {
    const [ox, oy] = P(0, s * 0.16);
    arcStroke(t, ox, oy, s * 0.72, th, 0, Math.PI * 2, dark, 0.55);
    const [ox2, oy2] = P(0, s * 0.04);
    arcStroke(t, ox2, oy2, s * 0.72, th * 0.9, 0, Math.PI * 2, light);
    return;
  }
  const seg = GLYPHS[letter];
  for (const [x0, y0, x1, y1] of seg) {
    const a = P(x0 * s, y0 * s + s * 0.16), b = P(x1 * s, y1 * s + s * 0.16);
    capsule(t, a[0], a[1], b[0], b[1], th, dark, 0.55);
  }
  for (const [x0, y0, x1, y1] of seg) {
    const a = P(x0 * s, y0 * s + s * 0.04), b = P(x1 * s, y1 * s + s * 0.04);
    capsule(t, a[0], a[1], b[0], b[1], th * 0.9, light);
  }
}

/**
 * A closed book lying flat in a stack, seen from the front and a little to the
 * right: a leather slab with a lit band along its top edge, a dark band along
 * its bottom edge, and the cream page block showing at the right end (two dark
 * leaf lines so it reads as pages, not a label). Level, never tilted.
 */
function spineBook(t, cx, cy, hw, hh, cover) {
  poly(t, roundRectPts(cx, cy, hw + 7, hh + 7, 12, 0), INK, 0.95);
  poly(t, roundRectPts(cx, cy, hw, hh, 8, 0), cover.base, 1, cover.lo);
  poly(t, roundRectPts(cx - 12, cy - hh + 9, hw - 16, 9, 5, 0), cover.hi, 0.95);            // lit top edge
  poly(t, roundRectPts(cx - 12, cy + hh - 8, hw - 16, 8, 4, 0), shade(cover.lo, 0.72), 0.9); // shaded bottom edge
  const pw = 22;
  poly(t, roundRectPts(cx + hw - pw, cy + 1, pw, hh - 6, 4, 0), '#F5EAD0', 1, '#CDB98F');
  capsule(t, cx + hw - pw * 1.6, cy - hh * 0.32, cx + hw - 5, cy - hh * 0.32, 4.5, '#B79B6A', 0.7);
  capsule(t, cx + hw - pw * 1.6, cy + hh * 0.32, cx + hw - 5, cy + hh * 0.32, 4.5, '#B79B6A', 0.7);
}

/** A gold coin, face on, with a rim and a raised centre. */
function coin(t, cx, cy, r) {
  ellipse(t, cx, cy, r + 6, r + 6, INK, 0.95, 2);
  ellipse(t, cx, cy, r, r, GOLD.lo, 1, 2);
  ellipse(t, cx - 1, cy - 2, r * 0.78, r * 0.78, GOLD.hi, 1, 2);
  ellipse(t, cx + r * 0.1, cy + r * 0.14, r * 0.5, r * 0.5, GOLD.mid, 0.9, 2);
  ellipse(t, cx - r * 0.3, cy - r * 0.32, r * 0.22, r * 0.18, '#FFFFFF', 0.9, 2);
}

// --- the crests ----------------------------------------------------------------
export function draw() {
  fs.mkdirSync(OUT, { recursive: true });

  { // === reverse_first.png — a horseshoe, open end up ===========================
    // One iron U. The band is a thick semicircle with two arms rising off it,
    // each arm bending slightly inward so the open end reads as a horseshoe and
    // not a magnet. Four nail holes, two a side, big enough to survive 34dp.
    const { cv, c } = canvas();
    const cx = c, cy = c + 16, R = 108, TH = 56;
    const armTop = cy - 116;
    contactShadow(cv, cx + 6, cy + R + 32, 124, 18, 0.32);
    withOutline(cv, t => {
      const bandT = (dx, dy, th, color, alpha = 1) => {
        arcStroke(t, cx + dx, cy + dy, R, th, 0, Math.PI, color, alpha);
        capsule(t, cx - R + dx, cy + dy, cx - R + 10 + dx, armTop + dy, th, color, alpha);
        capsule(t, cx + R + dx, cy + dy, cx + R - 10 + dx, armTop + dy, th, color, alpha);
      };
      bandT(0, 0, TH, IRON.lo);                       // the shaded outer body
      bandT(-3, -4, TH - 14, IRON.base);              // the mid band, lifted up-left
      bandT(-8, -9, 14, IRON.hi, 0.9);                // the lit crest, upper-left
      // heel caps: a flat brighter face on each tip so the ends read as cut iron
      for (const s of [-1, 1]) {
        ellipse(t, cx + s * (R - 10), armTop, TH * 0.5, 13, IRON.mid, 1, 2);
        ellipse(t, cx + s * (R - 10) - 4, armTop - 3, TH * 0.32, 7, IRON.hi, 0.9, 2);
      }
      // nail holes, two a side, ringed
      for (const s of [-1, 1]) {
        for (const [ax, ay] of [[R - 2, cy - 70], [R + 2, cy - 12]]) {
          const hx = cx + s * ax, hy = ay;
          ellipse(t, hx, hy, 15, 15, '#2E2A36', 1, 2);
          ellipse(t, hx + 2, hy + 3, 10, 10, '#1E1B26', 1, 2);
          arcStroke(t, hx, hy, 14, 4, 0.3, Math.PI - 0.3, IRON.hi, 0.6);
        }
      }
    }, { width: 10 });
    sheen(cv, cx - 118, armTop + 24, 12, 26, 0.45);
    sheen(cv, cx - 70, cy + 64, 22, 12, 0.35);
    savePNG(path.join(OUT, 'reverse_first.png'), W, W, down2(cv, W, W));
  }

  { // === reverse_15.png — a road winding back up a hill to a cottage =============
    // The anchor is ONE green hill mound; the road is cut INTO it as a broad tan
    // S that starts at the foot and climbs to a tiny red-roofed cottage on the
    // crown. A road on open ground is a rail; a road on a hill is a hill.
    const { cv, c } = canvas();
    const baseY = 332;
    contactShadow(cv, c + 8, baseY + 20, 150, 18, 0.32);
    const hill = [
      [c - 158, baseY], [c - 156, 268], [c - 130, 214], [c - 94, 176], [c - 50, 150],
      [c - 4, 138], [c + 40, 132], [c + 80, 142], [c + 120, 176], [c + 146, 226],
      [c + 158, 282], [c + 160, baseY],
    ];
    // the road as a centreline: foot of the hill, a swing right, back left, up to the door
    const road = [
      [c - 48, baseY - 6], [c + 20, 318], [c + 84, 292], [c + 104, 254], [c + 70, 224],
      [c + 10, 212], [c - 46, 196], [c - 70, 172], [c - 44, 152], [c + 4, 146], [c + 42, 142],
    ];
    withOutline(cv, t => {
      poly(t, hill, LEAF.hi, 1, LEAF.lo);
      // a darker skirt along the foot, so the mound sits rather than floats
      poly(t, [[c - 158, baseY], [c - 154, 300], [c + 156, 300], [c + 160, baseY]], LEAF.lo, 0.5);
      ribbonPath(t, road, 58, 30, shade(ROAD.lo, 0.8));                   // road keyline
      ribbonPath(t, road, 46, 20, ROAD.base);
      ribbonPath(t, road, 24, 8, ROAD.hi, 0.7, -3, -3);                     // lit crown
      // the cottage on the crown
      const hx = c + 52, hy = 112;
      poly(t, roundRectPts(hx, hy + 6, 34, 26, 5, 0), '#F1DFB6', 1, '#C9AA74');   // walls
      roundRect(t, hx - 2, hy + 18, 8, 14, 3, WOOD.seam, 0.95);                  // door
      roundRect(t, hx + 16, hy + 2, 7, 7, 2, '#FFE18A', 1);                      // window
      capsule(t, hx + 22, hy - 32, hx + 22, hy - 12, 12, STONE.lo);              // chimney
      poly(t, [[hx - 46, hy - 16], [hx, hy - 54], [hx + 46, hy - 16]], CRIMSON.hi, 1, CRIMSON.lo);  // roof
      capsule(t, hx - 44, hy - 15, hx + 44, hy - 15, 8, CRIMSON.lo, 0.9);
    }, { width: 10 });
    sheen(cv, c - 96, 196, 34, 16, 0.32);
    savePNG(path.join(OUT, 'reverse_15.png'), W, W, down2(cv, W, W));
  }

  { // === double_first.png — two candy tiles tied together with one red ribbon ===
    // The first pass read as ONE gift box: the two tiles shared a squat card-
    // shaped silhouette and a bow a third of the frame swallowed the seam. Now
    // TWO separate near-square tiles in the game's own proportions, a blue T on
    // the left and a yellow W on the right, the right one overlapping the left
    // by a tenth and lifted, so its own keyline cuts a dark seam through the
    // pair and two contours show. Big letters (a bigger glyph than the ladder's
    // so they survive the band). ONE slim red band wraps both faces at their
    // midline, following the lift; a small bow sits ON the band at the seam,
    // two loops with a dark gap between them and two short tails under it.
    const { cv, c } = canvas();
    const ty = c + 20, lift = 24;
    contactShadow(cv, c + 6, ty + 116, 146, 18, 0.32);
    withOutline(cv, t => {
      tile(t, c - 58, ty, 64, 78, -4, TILE.blue, 'T', 16, 0.7);
      tile(t, c + 58, ty - lift, 64, 78, 4, TILE.yellow, 'W', 16, 0.7);
      // the tails first, so the band lies over their roots
      const tails = [strapPts(c - 2, ty - 4, c - 28, ty + 56, 22, 30), strapPts(c + 4, ty - 6, c + 26, ty + 54, 22, 30)];
      for (const s of tails) { poly(t, grow(s, 6), INK, 0.95); poly(t, s, CRIMSON.base, 1, CRIMSON.lo); }
      // the band, across both faces, tilted with the lift
      const band = strapPts(c - 121, ty + 8, c + 121, ty + 8 - lift, 38, 38);
      poly(t, grow(band, 5), INK, 0.95);
      poly(t, band, CRIMSON.base, 1, CRIMSON.lo);
      poly(t, strapPts(c - 118, ty + 1, c + 118, ty + 1 - lift, 12, 12), CRIMSON.hi, 0.7);
      // the bow on the band: two loops, a dark gap between them, a small knot
      const ky = ty - 4;
      for (const [lx, rot] of [[c - 36, -0.22], [c + 36, 0.22]]) {
        const loop = ovalPts(lx, ky, 28, 19, rot);
        poly(t, grow(loop, 6), INK, 0.95);
        poly(t, loop, CRIMSON.hi, 1, CRIMSON.lo);
        poly(t, ovalPts(lx + (lx < c ? 2 : -2), ky + 1, 14, 9, rot), CRIMSON.lo, 0.6);
      }
      ellipse(t, c, ky, 17, 16, INK, 0.95, 2);
      ellipse(t, c, ky - 1, 12, 11, CRIMSON.hi, 1, 2);
      ellipse(t, c + 2, ky + 3, 7, 5, CRIMSON.lo, 0.6, 2);
    }, { width: 10 });
    sheen(cv, c - 100, ty - 52, 14, 22, 0.42);
    savePNG(path.join(OUT, 'double_first.png'), W, W, down2(cv, W, W));
  }

  { // === double_15.png — a pair of leather work gloves, palms out ================
    // Two mitts, thumbs outward, four chunky fingers each. Fingers are spaced so
    // only their keylines meet: at 34dp that gives a scalloped top edge, which is
    // what says "glove" rather than "paddle".
    const { cv, c } = canvas();
    contactShadow(cv, c + 6, c + 138, 150, 18, 0.32);
    const glove = (t, gx, s) => {
      const palmY = c + 26;
      // thumb, out to the side
      capsule(t, gx + s * 36, palmY - 2, gx + s * 80, palmY - 46, 30, INK, 0.95);
      capsule(t, gx + s * 36, palmY - 2, gx + s * 78, palmY - 44, 22, LEATHER.base);
      capsule(t, gx + s * 40, palmY - 8, gx + s * 76, palmY - 44, 8, LEATHER.hi, 0.6);
      // four fingers
      const F = [[-36, -96], [-12, -108], [12, -104], [36, -90]];
      for (const [fx, top] of F) {
        capsule(t, gx + fx, palmY - 30, gx + fx, c + top, 28, INK, 0.95);
        capsule(t, gx + fx, palmY - 30, gx + fx, c + top, 21, LEATHER.base);
        capsule(t, gx + fx - 4, palmY - 34, gx + fx - 4, c + top + 2, 7, LEATHER.hi, 0.6);
      }
      // palm over the finger roots
      poly(t, roundRectPts(gx, palmY + 6, 56, 62, 22, 0), INK, 0.95);
      poly(t, roundRectPts(gx, palmY + 6, 49, 55, 18, 0), LEATHER.hi, 1, LEATHER.lo);
      poly(t, roundRectPts(gx - s * 4, palmY + 10, 32, 30, 14, 0), LEATHER.base, 0.55);  // palm pad
      // the cuff, a darker band with a lighter welt
      poly(t, roundRectPts(gx, palmY + 74, 56, 22, 8, 0), INK, 0.95);
      poly(t, roundRectPts(gx, palmY + 74, 50, 17, 6, 0), LEATHER.lo, 1, LEATHER.cuff);
      capsule(t, gx - 44, palmY + 62, gx + 44, palmY + 62, 6, LEATHER.hi, 0.5);
    };
    withOutline(cv, t => {
      glove(t, c - 72, -1);
      glove(t, c + 72, 1);
    }, { width: 10 });
    sheen(cv, c - 112, c - 66, 8, 20, 0.4);
    sheen(cv, c - 104, c + 12, 16, 10, 0.35);
    savePNG(path.join(OUT, 'double_15.png'), W, W, down2(cv, W, W));
  }

  { // === speed_first.png — a brass pocket stopwatch =============================
    // A brass case, a cream face, a crown with a ring above it, one side button,
    // four bold hour marks and one hand pointing to two o'clock.
    const { cv, c } = canvas();
    const cx = c, cy = c + 32, R = 112;
    contactShadow(cv, cx + 6, cy + R + 18, 112, 18, 0.32);
    withOutline(cv, t => {
      // the ring, then the crown stem seated on the case
      ringStroke(t, cx, cy - R - 44, 20, 14, BRASS.lo);
      arcStroke(t, cx - 2, cy - R - 46, 18, 7, Math.PI * 1.05, Math.PI * 1.9, BRASS.hi, 0.9);
      capsule(t, cx, cy - R - 30, cx, cy - R + 10, 30, BRASS.lo);
      capsule(t, cx - 6, cy - R - 26, cx - 6, cy - R + 6, 10, BRASS.hi, 0.85);
      roundRect(t, cx, cy - R - 12, 22, 9, 4, BRASS.hi, 1, BRASS.lo);
      // side button, upper right
      capsule(t, cx + R * 0.66, cy - R * 0.66, cx + R * 0.86, cy - R * 0.86, 24, BRASS.lo);
      capsule(t, cx + R * 0.68, cy - R * 0.72, cx + R * 0.84, cy - R * 0.88, 10, BRASS.hi, 0.8);
      // the case
      roundRect(t, cx, cy, R, R, R, BRASS.hi, 1, BRASS.lo);
      ringStroke(t, cx, cy, R - 12, 10, GOLD.deep, 0.55);
      // the face
      ellipse(t, cx, cy, R - 22, R - 22, INK, 0.9, 2);
      ellipse(t, cx, cy, R - 26, R - 26, PARCH.hi, 1, 2);
      ellipse(t, cx + 4, cy + 6, R - 30, R - 30, PARCH.dim, 0.6, 2);
      // four hour marks
      const r0 = R - 34, r1 = R - 56;
      for (const a of [-Math.PI / 2, 0, Math.PI / 2, Math.PI]) {
        capsule(t, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, 13, INK, 0.9);
      }
      // the hand, pointing to two o'clock, with a crimson tip
      const ha = -Math.PI / 3, hl = R - 48;
      capsule(t, cx, cy, cx + Math.cos(ha) * hl, cy + Math.sin(ha) * hl, 16, INK);
      capsule(t, cx + Math.cos(ha) * (hl - 26), cy + Math.sin(ha) * (hl - 26), cx + Math.cos(ha) * hl, cy + Math.sin(ha) * hl, 12, CRIMSON.base);
      capsule(t, cx, cy, cx - Math.cos(ha) * 22, cy - Math.sin(ha) * 22, 12, INK);
      ellipse(t, cx, cy, 13, 13, BRASS.lo, 1, 2);
      ellipse(t, cx - 2, cy - 2, 8, 8, BRASS.hi, 1, 2);
    }, { width: 10 });
    sheen(cv, cx - 58, cy - 62, 30, 20, 0.5);
    sheen(cv, cx - 12, cy - R - 30, 5, 12, 0.4);
    savePNG(path.join(OUT, 'speed_first.png'), W, W, down2(cv, W, W));
  }

  { // === speed_15.png — a winged boot ============================================
    // A brown leather boot, toe to the right, and ONE big three-feather wing
    // sweeping back and up off the ankle. The wing is a third of the crest so it
    // survives 26dp; a small wing on a boot is a buckle.
    const { cv, c } = canvas();
    const bx = c + 14;
    contactShadow(cv, c + 30, c + 138, 130, 16, 0.32);
    withOutline(cv, t => {
      // wing, behind: three feathers, cream with gold roots
      const feathers = [
        [[bx - 40, c - 30], [bx - 86, c - 96], [bx - 154, c - 136], [bx - 124, c - 66], [bx - 60, c - 8]],
        [[bx - 40, c - 16], [bx - 100, c - 56], [bx - 166, c - 72], [bx - 116, c - 22], [bx - 54, c + 8]],
        [[bx - 38, c + 2], [bx - 100, c - 6], [bx - 152, c + 8], [bx - 106, c + 30], [bx - 54, c + 24]],
      ];
      for (const f of feathers) { poly(t, grow(f, 7), INK, 0.95); poly(t, f, '#FCF3DE', 1, '#D8C08C'); }
      for (const f of feathers) {
        capsule(t, f[0][0] - 8, f[0][1], f[2][0] + 20, f[2][1] + 6, 6, GOLD.lo, 0.35);
      }
      poly(t, [[bx - 32, c - 34], [bx - 62, c - 30], [bx - 68, c + 22], [bx - 34, c + 14]], GOLD.mid, 1, GOLD.lo);  // wing root
      // the boot: sole first, then foot, then shaft
      poly(t, roundRectPts(bx + 30, c + 118, 108, 14, 8, 0), INK, 0.95);
      poly(t, roundRectPts(bx + 30, c + 116, 104, 11, 6, 0), '#3E2A1C', 1, '#241610');
      poly(t, roundRectPts(bx - 52, c + 116, 26, 20, 5, 0), '#3E2A1C', 1, '#241610');       // heel
      poly(t, roundRectPts(bx + 36, c + 76, 96, 40, 30, 0), INK, 0.95);
      poly(t, roundRectPts(bx + 36, c + 76, 90, 34, 26, 0), LEATHER.base, 1, LEATHER.lo);   // foot
      poly(t, roundRectPts(bx - 6, c + 6, 54, 86, 16, 0), INK, 0.95);
      poly(t, roundRectPts(bx - 6, c + 6, 48, 80, 12, 0), LEATHER.hi, 1, LEATHER.base);     // shaft
      poly(t, roundRectPts(bx + 44, c + 64, 48, 30, 22, 0), LEATHER.base, 0.9);             // instep blend
      poly(t, roundRectPts(bx - 6, c - 66, 52, 14, 6, 0), LEATHER.lo, 1, LEATHER.cuff);     // folded top
      // toe cap
      poly(t, roundRectPts(bx + 96, c + 78, 30, 30, 22, 0), LEATHER.lo, 0.7);
      // two lace crosses, bold
      for (const ly of [c - 30, c + 6]) {
        capsule(t, bx - 30, ly - 10, bx + 18, ly + 12, 8, LEATHER.cuff, 0.7);
        capsule(t, bx - 30, ly + 12, bx + 18, ly - 10, 8, LEATHER.cuff, 0.7);
      }
    }, { width: 10 });
    sheen(cv, bx - 30, c - 44, 8, 22, 0.4);
    sheen(cv, bx - 120, c - 84, 20, 10, 0.4);
    savePNG(path.join(OUT, 'speed_15.png'), W, W, down2(cv, W, W));
  }

  { // === variant_explorer.png — a brass compass rose =============================
    // A brass disc, a cream dial, an eight-point rose: four short diagonal points
    // in dark brass under four long cardinal points split light/shade, north tip
    // crimson. Distinct from every star in the game by the disc and the 8 points.
    const { cv, c } = canvas();
    const cx = c, cy = c + 4, R = 132;
    contactShadow(cv, cx + 6, cy + R + 16, 124, 18, 0.32);
    withOutline(cv, t => {
      roundRect(t, cx, cy, R, R, R, BRASS.hi, 1, BRASS.lo);
      ringStroke(t, cx, cy, R - 12, 9, GOLD.deep, 0.55);
      ellipse(t, cx, cy, R - 24, R - 24, INK, 0.9, 2);
      ellipse(t, cx, cy, R - 28, R - 28, '#F6EAD0', 1, 2);
      ellipse(t, cx + 4, cy + 6, R - 34, R - 34, '#E6D3AC', 0.55, 2);
      const pt = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
      // diagonal points, short and dark
      for (let k = 0; k < 4; k++) {
        const a = -Math.PI / 4 + (k * Math.PI) / 2;
        poly(t, [pt(a, 72), pt(a + Math.PI / 2 * 0.5, 22), pt(a + Math.PI, 0), pt(a - Math.PI / 2 * 0.5, 22)].map(p => p), GOLD.lo, 1, GOLD.deep);
      }
      // cardinal points, long, each split into a lit half and a shaded half
      for (let k = 0; k < 4; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 2;
        const tip = pt(a, 98), l = pt(a - Math.PI / 4, 24), r = pt(a + Math.PI / 4, 24);
        poly(t, grow([tip, r, [cx, cy], l], 5), INK, 0.9);
        poly(t, [tip, l, [cx, cy]], k === 0 ? CRIMSON.hi : '#FFF7E4');
        poly(t, [tip, r, [cx, cy]], k === 0 ? CRIMSON.lo : NAVY.base);
      }
      // hub
      ellipse(t, cx, cy, 19, 19, INK, 0.95, 2);
      ellipse(t, cx, cy, 15, 15, BRASS.lo, 1, 2);
      ellipse(t, cx - 2, cy - 3, 9, 9, BRASS.hi, 1, 2);
    }, { width: 10 });
    sheen(cv, cx - 78, cy - 78, 26, 16, 0.5);
    savePNG(path.join(OUT, 'variant_explorer.png'), W, W, down2(cv, W, W));
  }

  { // === blind_first.png — a dark blindfold, knotted, across a head =============
    // The brief's bare knotted cloth was tried first and graded as a purple slug:
    // a band with a tail is not an object until it is ON something. So the cloth
    // is tied where a blindfold goes — across the eyes of a simple round head
    // (ears, a cap of hair, a mouth, nothing else) with the knot at the right
    // temple and two tails flying off it. Slate indigo, three value steps off
    // ash, with a lit fold along the top so it holds on both grounds.
    const { cv, c } = canvas();
    const hx = c - 14, hy = c + 10;
    contactShadow(cv, hx + 8, hy + 126, 106, 16, 0.32);
    withOutline(cv, t => {
      // ears, behind the head
      for (const s of [-1, 1]) {
        ellipse(t, hx + s * 96, hy + 14, 22, 28, SKIN.lo, 1, 2);
        ellipse(t, hx + s * 94, hy + 12, 14, 19, SKIN.base, 1, 2);
      }
      // the head, top-lit
      poly(t, ovalPts(hx, hy, 94, 108, 0, 40), SKIN.hi, 1, SKIN.lo);
      // a cap of hair, one dark dome with a lit fringe
      poly(t, domePts(hx, hy - 30, 96, 80), WOOD.seam, 1, WOOD.dark);
      poly(t, domePts(hx - 10, hy - 34, 70, 60), WOOD.mid, 0.7);
      // mouth, a small calm line
      arcStroke(t, hx, hy + 52, 22, 8, Math.PI * 0.15, Math.PI * 0.85, '#8E4A32', 0.9);
      // the blindfold band, across the eyes, wrapped to the head's curve
      const band = [[hx - 100, hy - 8], [hx - 60, hy - 18], [hx - 10, hy - 22], [hx + 40, hy - 18], [hx + 84, hy - 8]];
      ribbonPath(t, band, 54, 54, CLOTH.lo);
      ribbonPath(t, band, 40, 40, CLOTH.base, 1, -2, -4);
      ribbonPath(t, band, 14, 14, CLOTH.hi, 0.9, -3, -15);
      capsule(t, hx - 24, hy - 46, hx - 14, hy + 8, 8, CLOTH.deep, 0.45);      // one fold
      // tails first, then the knot over their roots, at the right temple
      const kx = hx + 106, ky = hy - 10;
      const t1 = strapPts(kx + 4, ky - 2, kx + 54, ky - 62, 30, 14);
      const t2 = strapPts(kx + 6, ky + 8, kx + 50, ky + 66, 30, 14);
      for (const s of [t1, t2]) {
        poly(t, grow(s, 7), INK, 0.95);
        poly(t, s, CLOTH.base, 1, CLOTH.lo);
        poly(t, strapPts(s[0][0] - 3, s[0][1] - 3, (s[1][0] + s[2][0]) / 2 - 3, (s[1][1] + s[2][1]) / 2 - 3, 11, 5), CLOTH.hi, 0.6);
      }
      ellipse(t, kx, ky + 2, 30, 27, INK, 0.95, 2);
      ellipse(t, kx, ky, 26, 23, CLOTH.base, 1, 2);
      ellipse(t, kx - 4, ky - 8, 16, 11, CLOTH.hi, 0.9, 2);
      ellipse(t, kx + 6, ky + 10, 14, 8, CLOTH.lo, 0.8, 2);
    }, { width: 10 });
    sheen(cv, hx - 50, hy - 78, 22, 12, 0.35);
    sheen(cv, hx - 70, hy - 24, 16, 6, 0.4);
    savePNG(path.join(OUT, 'blind_first.png'), W, W, down2(cv, W, W));
  }

  { // === blind_10.png — a hand reading a raised-dot tile by touch ===============
    // The first pass was a tall hot-magenta slab with a 2x2 dot grid, which the
    // blind judge called a phone or a die. Now ONE near-square candy tile in the
    // game's own proportions, candy ORANGE (the warm side of the tile palette),
    // whose face carries a big raised-dot letter L: six cream bumps, each on a
    // darker lower rim, filling most of the face and never a grid. The hand is
    // smaller (about a third of the frame), enters from the lower right, and its
    // index fingertip rests on the L's last dot; its cuff is sage, not tile-hued.
    const { cv, c } = canvas();
    const tx = c - 30, ty = c - 16;
    contactShadow(cv, c + 10, c + 134, 142, 18, 0.32);
    withOutline(cv, t => {
      tile(t, tx, ty, 90, 98, -8, TILE.orange, null, 16);
      // the raised-dot L: four bumps down, two more along the foot
      const ang = (-8 * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang);
      const P = (lx, ly) => [tx + lx * ca - ly * sa, ty + lx * sa + ly * ca];
      const rim = shade(TILE.orange[1], 0.62);
      for (const [lx, ly] of [[-34, -66], [-34, -26], [-34, 14], [-34, 54], [6, 54], [46, 54]]) {
        const [dx, dy] = P(lx, ly);
        ellipse(t, dx + 3, dy + 6, 18, 18, rim, 1, 2);
        ellipse(t, dx, dy, 16, 16, '#FFF6E2', 1, 2);
        ellipse(t, dx - 4, dy - 5, 7, 5, '#FFFFFF', 0.9, 2);
      }
      // the hand, in a local frame scaled by k, index finger pointing up-left
      const k = 0.75;
      const HX = c + 81, HY = c + 73, HA = (-38 * Math.PI) / 180;
      const hca = Math.cos(HA), hsa = Math.sin(HA);
      const H = (lx, ly) => [HX + lx * k * hca - ly * k * hsa, HY + lx * k * hsa + ly * k * hca];
      const fing = (x0, y0, x1, y1, th) => {
        capsule(t, ...H(x0, y0), ...H(x1, y1), th * k + 8, INK, 0.95);
        capsule(t, ...H(x0, y0), ...H(x1, y1), th * k, SKIN.base);
        capsule(t, ...H(x0 - 4, y0), ...H(x1 - 4, y1 + 4), th * k * 0.32, SKIN.hi, 0.6);
      };
      // sleeve cuff, behind everything
      poly(t, roundRectPts(...H(4, 78), 42 * k, 20 * k, 8, HA), INK, 0.95);
      poly(t, roundRectPts(...H(4, 78), 36 * k, 14 * k, 5, HA), SAGE.base, 1, SAGE.lo);
      // curled fingers and thumb
      fing(0, -6, 0, -44, 28);
      fing(26, -2, 26, -36, 26);
      fing(50, 6, 50, -24, 22);
      fing(-40, 30, -86, 8, 30);
      // palm over their roots
      poly(t, roundRectPts(...H(4, 30), 58 * k, 54 * k, 24 * k, HA), INK, 0.95);
      poly(t, roundRectPts(...H(4, 30), 51 * k, 47 * k, 20 * k, HA), SKIN.hi, 1, SKIN.lo);
      // the index finger, long, over the palm, its tip on the L's last dot
      fing(-26, 10, -26, -92, 28);
      ellipse(t, ...H(-26, -92), 13 * k, 13 * k, SKIN.hi, 0.9, 2);
    }, { width: 10 });
    sheen(cv, tx - 54, ty - 62, 12, 20, 0.4);
    savePNG(path.join(OUT, 'blind_10.png'), W, W, down2(cv, W, W));
  }

  { // === expert_first.png — a tall bare pinnacle with a flag planted on top ====
    // The first pass was a broad grey two-shoulder massif that twinned expert_25
    // and sank into ash. Now ONE narrow pinnacle: a base a little over half the
    // frame, sides bowed slightly inward, no second peak, no snow (the snow and
    // the sun belong to expert_25). Warm bare rock: a lit tan face upper-left and
    // a warm brown shadow face a clear step above ash. The pennant is BIG (a
    // quarter of the frame wide) on a thick pole planted just under the apex so
    // the ladder's structural marker survives 26dp.
    const { cv, c } = canvas();
    const baseY = 340, ax = c - 8, ay = 92, px = ax + 8;
    contactShadow(cv, c + 8, baseY + 16, 122, 16, 0.32);
    withOutline(cv, t => {
      const left = [[c - 106, baseY], [c - 82, 262], [c - 50, 170], [ax, ay], [ax + 4, 200], [ax + 12, baseY]];
      const right = [[ax, ay], [c + 22, 172], [c + 64, 262], [c + 106, baseY], [ax + 12, baseY], [ax + 4, 200]];
      poly(t, right, PEAK.shHi, 1, PEAK.shLo);
      poly(t, left, PEAK.litHi, 1, PEAK.litLo);
      // one bold crag line down the lit face
      capsule(t, ax - 6, ay + 44, c - 64, 300, 9, PEAK.crag, 0.3);
      // the pole, planted just under the apex, and the pennant flying right
      capsule(t, px, ay + 26, px, ay - 52, 18, INK, 0.95);
      capsule(t, px, ay + 24, px, ay - 50, 12, WOOD.light);
      capsule(t, px - 2, ay + 20, px - 2, ay - 46, 4, WOOD.rim, 0.7);
      const flag = [[px + 6, ay - 50], [px + 104, ay - 24], [px + 6, ay + 14]];
      poly(t, grow(flag, 6), INK, 0.95);
      poly(t, flag, CRIMSON.hi, 1, CRIMSON.lo);
      poly(t, [[px + 8, ay - 44], [px + 60, ay - 30], [px + 8, ay - 22]], '#F88A7A', 0.45);
      ellipse(t, px, ay - 58, 9, 9, INK, 0.95, 2);
      ellipse(t, px, ay - 58, 6, 6, BRASS.hi, 1, 2);
    }, { width: 10 });
    sheen(cv, c - 58, 226, 10, 30, 0.35);
    savePNG(path.join(OUT, 'expert_first.png'), W, W, down2(cv, W, W));
  }

  { // === expert_25.png — a snowy summit with a rising sun behind it =============
    // The same triangle family as expert_first but with a WHITE cap and a big
    // gold sun with six rays rising off the right shoulder. Two crests, one
    // with a pennant and one with a rayed disc, and nothing else in common.
    const { cv, c } = canvas();
    const baseY = 334, ax = c - 30, ay = 132;
    const sx = c + 34, sy = 184, sr = 82;
    ellipse(cv, sx, sy, 152, 140, HALO, 0.3, 90);                 // sunlight, uncontoured
    contactShadow(cv, c + 8, baseY + 18, 152, 16, 0.32);
    withOutline(cv, t => {
      // the sun and its rays, behind the mountain
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI * 0.95 + (k * Math.PI * 0.9) / 5;
        const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
        poly(t, [
          [sx + ux * (sr - 10) - nx * 16, sy + uy * (sr - 10) - ny * 16],
          [sx + ux * (sr - 10) + nx * 16, sy + uy * (sr - 10) + ny * 16],
          [sx + ux * (sr + 40) + nx * 5, sy + uy * (sr + 40) + ny * 5],
          [sx + ux * (sr + 40) - nx * 5, sy + uy * (sr + 40) - ny * 5],
        ], GOLD.mid, 1, GOLD.lo);
      }
      ellipse(t, sx, sy, sr + 6, sr + 6, GOLD.lo, 1, 2);
      roundRect(t, sx, sy, sr, sr, sr, GOLD.up, 1, GOLD.mid);
      // the mountain
      const left = [[c - 160, baseY], [c - 104, 240], [c - 78, 256], [ax, ay], [ax + 6, baseY]];
      const right = [[ax, ay], [c + 30, 226], [c + 62, 210], [c + 156, baseY], [ax + 6, baseY]];
      poly(t, right, PEAK.shHi, 1, PEAK.shLo);
      poly(t, left, PEAK.litHi, 1, PEAK.litLo);
      // the snow cap, one jagged-bottomed cape over the apex
      const cap = [
        [ax, ay - 2], [c + 30, 226], [c + 14, 212], [c - 4, 234], [c - 24, 214],
        [c - 46, 236], [c - 66, 220], [c - 78, 256],
      ];
      poly(t, grow(cap, 5), INK, 0.9);
      poly(t, cap, SNOW.hi, 1, SNOW.lo);
      capsule(t, ax + 2, ay + 24, c + 8, 214, 9, SNOW.lo, 0.6);
    }, { width: 10 });
    sheen(cv, c - 84, 250, 12, 26, 0.3);
    sheen(cv, sx - 36, sy - 34, 14, 10, 0.5);
    savePNG(path.join(OUT, 'expert_25.png'), W, W, down2(cv, W, W));
  }

  { // === lexicon_first.png — an old parchment page with a red wax seal ===========
    // A leaf of aged paper, a corner turned, three bold faded lines of old
    // writing, and a big red wax seal at the lower right with an embossed ring.
    // The page is aged darker than the cream row so the contour is not the only
    // thing separating them.
    const { cv, c } = canvas();
    const ang = (-6 * Math.PI) / 180;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const P = (lx, ly) => [c + lx * ca - ly * sa, c + 6 + lx * sa + ly * ca];
    contactShadow(cv, c + 8, c + 150, 112, 16, 0.32);
    withOutline(cv, t => {
      const page = [P(-104, -126), P(64, -126), P(104, -86), P(104, 126), P(-104, 126)];
      poly(t, page, OLDPAGE.hi, 1, OLDPAGE.lo);
      // the turned corner
      poly(t, [P(64, -126), P(64, -86), P(104, -86)], INK, 0.9);
      poly(t, [P(66, -122), P(66, -88), P(100, -88)], OLDPAGE.base, 1, OLDPAGE.lo);
      // three lines of old writing: bold, faded, uneven lengths
      for (const [ly, len] of [[-58, 132], [-22, 108], [14, 120]]) {
        capsule(t, ...P(-76, ly), ...P(-76 + len, ly), 13, OLDPAGE.ink, 0.42);
      }
      // the wax seal
      const [wx, wy] = P(44, 70);
      ellipse(t, wx, wy, 52, 50, INK, 0.95, 2);
      ellipse(t, wx, wy, 47, 45, CRIMSON.lo, 1, 2);
      ellipse(t, wx - 2, wy - 4, 38, 36, CRIMSON.base, 1, 2);
      ringStroke(t, wx - 2, wy - 4, 21, 9, CRIMSON.lo, 0.9);
      arcStroke(t, wx - 4, wy - 7, 21, 6, Math.PI * 1.05, Math.PI * 1.85, CRIMSON.hi, 0.9);
      ellipse(t, wx - 2, wy - 4, 9, 9, CRIMSON.hi, 1, 2);
      // a drip off the seal's edge, so it reads as wax
      ellipse(t, wx + 34, wy + 28, 10, 13, CRIMSON.base, 1, 2);
    }, { width: 10 });
    sheen(cv, c - 60, c - 88, 26, 12, 0.35);
    sheen(cv, c + 26, c + 56, 10, 6, 0.45);
    savePNG(path.join(OUT, 'lexicon_first.png'), W, W, down2(cv, W, W));
  }

  { // === lexicon_25.png — a hoard: a stack of old books, a scroll, a gold coin ==
    // The first pass scattered four objects at four angles and the blind judge
    // could not name it. Now ONE anchored silhouette: a level, aligned stack of
    // three closed books (wine, ochre, sage — warm leathers only, no navy), a
    // rolled scroll lying along the top book with two big pale end-caps, and a
    // gold coin leaning against the front-left of the bottom book. Nothing
    // tilts, every part overlaps its neighbour, so the contour closes around one
    // pile and the crest reads as a stack.
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, c + 140, 146, 18, 0.32);
    withOutline(cv, t => {
      spineBook(t, c + 2, c + 88, 126, 32, WINE);
      spineBook(t, c - 6, c + 24, 116, 32, OCHRE);
      spineBook(t, c + 4, c - 40, 104, 32, SAGE);
      // the scroll along the top book
      const sy = c - 92;
      capsule(t, c - 96, sy, c + 92, sy, 50, INK, 0.95);
      capsule(t, c - 96, sy, c + 92, sy, 42, PARCH.base);
      capsule(t, c - 90, sy - 12, c + 86, sy - 12, 12, PARCH.hi, 0.85);
      capsule(t, c - 90, sy + 13, c + 86, sy + 13, 9, PARCH.shadow, 0.7);
      for (const ex of [c - 100, c + 96]) {
        ellipse(t, ex, sy, 26, 26, INK, 0.95, 2);
        ellipse(t, ex, sy, 22, 22, PARCH.dim, 1, 2);
        ellipse(t, ex + 2, sy + 2, 11, 11, PARCH.shadow, 1, 2);
        ellipse(t, ex - 6, sy - 7, 6, 5, '#FFFFFF', 0.7, 2);
      }
      // the coin, leaning on the front-left of the bottom book
      coin(t, c - 104, c + 94, 30);
    }, { width: 10 });
    sheen(cv, c - 84, c - 56, 26, 8, 0.38);
    savePNG(path.join(OUT, 'lexicon_25.png'), W, W, down2(cv, W, W));
  }

  { // === max_stack.png — five tiles fanned like a dealt hand, a crimson sigil ===
    // The brief's full-circle fan was tried first and, at 32px, was a five-colour
    // five-lobe wheel — the same silhouette as all_difficulties' pinwheel one
    // group up the list. So the five tiles are now fanned like a DEALT HAND: all
    // five pivot on one point at the bottom, spread over ~100 degrees, each
    // overlapping the one before, and the pivot is a near-black disc carrying a
    // crimson five-point sigil. Asymmetric top, pinned base: nothing else in the
    // list is a fan. The one crest in the family allowed to lean dread; the tiles
    // keep their candy hues so the hand still reads as the game's own pieces.
    const { cv, c } = canvas();
    const px = c, py = c + 100;                                  // the pivot
    contactShadow(cv, px + 8, py + 44, 124, 16, 0.32);
    withOutline(cv, t => {
      const pals = [TILE.teal, TILE.blue, TILE.pink, TILE.orange, TILE.yellow];
      const letters = ['W', 'O', 'R', 'D', 'S'];
      for (let k = 0; k < 5; k++) {
        const deg = -44 + k * 22, a = (deg * Math.PI) / 180;
        const cx = px + Math.sin(a) * 110, cy = py - Math.cos(a) * 110;
        tile(t, cx, cy, 42, 72, deg, pals[k], letters[k], 10);
      }
      // the hub the hand is pinned on
      ellipse(t, px, py, 50, 50, INK, 1, 2);
      ellipse(t, px, py, 44, 44, '#2A1E27', 1, 2);
      ellipse(t, px - 3, py - 5, 37, 37, '#3A2A36', 1, 2);
      ringStroke(t, px, py, 38, 6, CRIMSON.lo, 0.9);
      poly(t, starPts(px, py, 31, 13), CRIMSON.base, 1, CRIMSON.lo);
      poly(t, starPts(px, py, 20, 8), '#2A1E27', 1);
      ellipse(t, px, py, 6, 6, CRIMSON.hi, 1, 2);
    }, { width: 10 });
    sheen(cv, c - 118, c - 30, 10, 16, 0.4);
    savePNG(path.join(OUT, 'max_stack.png'), W, W, down2(cv, W, W));
  }
}

// Allow `node scripts/tools/gameIcons/achievementsMasteryB.mjs` for a solo render.
if (process.argv[1] && process.argv[1].endsWith('achievementsMasteryB.mjs')) draw();
