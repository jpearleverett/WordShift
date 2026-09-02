/**
 * gameIcons/difficultyRules.mjs — the DIFFICULTY seals (5 icons) and the
 * How-to-Play RULES steps (4 icons), 192px each.
 *
 * ----------------------------------------------------------------------------
 * DIFFICULTY (assets/ui/difficulty/<tier>.png, rendered 28dp in the setup menu
 * rows and in Stats). ONE VESSEL: a round wax seal hanging on a short ribbon.
 * The five tiers are told apart two ways at once, because at 28dp one of them
 * will always be the one the eye gets first:
 *
 *   by COLOUR   the wax and the ribbon are the tier's CandyColors hue
 *               (green / yellow / orange / red / purple, .main for the wax and
 *               .dark/.shadow for the ribbon — the palette table below is copied
 *               by hand from src/theme/colors.ts, a plain-Node generator cannot
 *               import TypeScript, so the two must be retuned together);
 *   by SILHOUETTE the relief pressed into the wax — a sprout, an oak leaf, a
 *               flame, an upright sword, a crown. The seal's GEOMETRY is byte-
 *               identical across all five (one `SEAL` table, one `wavyPts`
 *               rim, one ribbon), which is the family signature; only the
 *               palette and the pressed symbol change.
 *
 * The relief is drawn as a RAISED stamp, not a same-colour dent: a cream body
 * over an INK drop shadow offset down-right, and (round two) inside its OWN
 * withOutline pass, so every emblem is separated from the wax by real ink, the
 * same contour weight the vessel has. Real wax embosses in its own hue, but a
 * same-hue dent averages to nothing at 28dp — the symbol is the whole point of
 * the icon, so it gets the value step it needs. The cream is tinted a little
 * toward the tier's own light, so it still reads as the wax catching the light
 * rather than a white sticker. Every symbol is >= 1/3 of the seal across (the
 * brief's 1/12-of-frame floor is 16px at 192; the smallest symbol stroke here
 * is 18px in supersample = 9px at 192).
 *
 * Round two (blind review at 28px): two emblems failed nameability and were
 * redrawn; the vessel and the sprout / flame / crown are the same drawings.
 *   OAK LEAF  round one's eight fine lobes averaged to an egg, and its cream
 *             sat within ~0.13 luminance of the gold wax. Now a SIMPLE
 *             silhouette — three deep round lobes a side (notches >= 1/4 of the
 *             leaf's width) under a pointed tip, a straight stem out of the
 *             bottom — filled with its own two-step value (pale gold over deep
 *             amber, `gradTo`), and ONE dark midrib from stem to tip; a single
 *             vein is the one mark that says "leaf" at 28px.
 *   SWORD     round one's blade was a 2px hairline with a centred guard of the
 *             same stroke: a plus sign, and on red wax a medical / religious
 *             cross. Now the blade is >= 1/6 of the disc wide with a two-value
 *             fuller (lit left, shaded right), the crossguard is a short THICK
 *             bar well below the emblem's centre, under it a DARK wine-brown
 *             grip (two value steps under the blade) and a round pommel, and the
 *             whole sword is canted 8 degrees so it can never be a plus.
 *   VESSEL    the seal spanned 59% x 72% of the frame, under the brief's 65-80%
 *             and this is the smallest-delivered family (28dp), so the shared
 *             geometry is scaled up by `K` = 1.12 about the vessel's own bbox
 *             centre (`PIVOT_Y`). One table, one scale: all five tiers move
 *             together and stay identical, and the outer pixel ring stays clear.
 *
 * The wax itself carries the house's value steps: a scalloped rim graded
 * light-to-dark top-down (the scallops are 14 wide lobes, big enough to survive
 * the shrink and the one thing that says "wax seal" rather than "coin"), a dark
 * pressed ring where the die bit, and a lit arc on the far inner wall.
 *
 * ----------------------------------------------------------------------------
 * RULES (assets/ui/rules/step_<n>.png, rendered 48dp beside the How-to-Play
 * steps). Four teaching diagrams built from the game's own beveled candy letter
 * tile (the same extruded chrome themes.mjs draws for theme_default: dark base
 * plane, side plane, flat face, lighter bevel plane, gloss bar, specular dot),
 * one clear action each:
 *
 *   step_1  PICK    a hand lifts one tile UP out of a row of three; the empty
 *                   socket it left stays visible in the row.
 *   step_2  DROP    a tile falls into the gap between two tiles; a green plus
 *                   sits IN the gap as the insertion mark (the brief says "above
 *                   the gap", but the falling tile is already above the gap, and
 *                   a plus stacked over a tile over a slot read as three floors
 *                   of a building; the plus in the socket is what a player will
 *                   recognise as "put it here").
 *   step_3  WORDS   two short tile rows with a big green check mark over them.
 *   step_4  ROWS    three stacked rows (3/3/4 tiles — the bottom row is the one
 *                   that has grown, which is also what gives the flag a tile to
 *                   stand on clear of the rows above) with a small red flag
 *                   planted on the bottom row.
 *
 * Letters ride only the BIG tiles (steps 1 and 2, ~10px wide at 48dp); the
 * small tiles of steps 3 and 4 would carry letter strokes under a pixel at
 * delivery and turn to noise, so they wear the tile chrome alone and still
 * read as candy tiles by their bevel and thickness.
 *
 * House doctrine (see _draw.mjs): contact shadow BEFORE withOutline, subject
 * inside it, upper-left sheen AFTER it. INK contours, never #000. No
 * Math.random anywhere — every coordinate is a literal or derived from one, so
 * the PNGs are byte-reproducible. All coordinates are in the 384x384
 * supersample space (c = 192 is the centre).
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  canvas, savePNG, down2, W, contactShadow, sheen, withOutline, INK, WOOD, BRASS,
  hex, blend, ellipse, roundRect, poly, capsule, arcStroke, flameLobe, tri,
} from '../shopIcons/_draw.mjs';

const OUT_DIFF = path.resolve(import.meta.dirname, '../../../assets/ui/difficulty');
const OUT_RULES = path.resolve(import.meta.dirname, '../../../assets/ui/rules');

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

/** CandyColors.<hue> from src/theme/colors.ts: [light, main, dark, shadow]. */
const TIER = {
  easy:        { light: '#4ADE80', main: '#22C55E', dark: '#16A34A', shadow: '#15803D' },   // green
  medium:      { light: '#FDE047', main: '#FACC15', dark: '#EAB308', shadow: '#CA8A04' },   // yellow
  medium_plus: { light: '#FB923C', main: '#F97316', dark: '#EA580C', shadow: '#C2410C' },   // orange
  hard:        { light: '#F87171', main: '#EF4444', dark: '#DC2626', shadow: '#B91C1C' },   // red
  expert:      { light: '#A855F7', main: '#9333EA', dark: '#7C3AED', shadow: '#5B21B6' },   // purple
};

/** theme_default's warm members ([face, edge]) for the rules tiles. */
const TILE = {
  pink: ['#FF6B9D', '#D44D7A'],
  gold: ['#FFD84D', '#CCB030'],
  amber: ['#FF8C4D', '#CC6633'],
  blue: ['#4DAFFF', '#2E8BC0'],
};
const SKIN = { hi: '#F9D9B8', base: '#EBB58A', lo: '#C0794E' };
const CHECK = { hi: '#5EE08A', base: '#22C55E', lo: '#15803D' };
const FLAG = { hi: '#F87171', base: '#EF4444', lo: '#B91C1C' };
const CREAM = '#FFF6E2';

// ---------------------------------------------------------------------------
// Local helpers (pure, literal-driven)
// ---------------------------------------------------------------------------

/** Multiply a hex colour's channels by `f` (the tile chrome's shade step). */
function shade(colorHex, f) {
  const n = parseInt(colorHex.slice(1), 16);
  const ch = i => Math.max(0, Math.min(255, Math.round(((n >> i) & 255) * f)));
  return '#' + (((ch(16) << 16) | (ch(8) << 8) | ch(0)) | 0x1000000).toString(16).slice(1).toUpperCase();
}

/** Linear mix of two hex colours, t = 0 -> a, t = 1 -> b. */
function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  const ch = i => Math.max(0, Math.min(255, Math.round((A[i] + (B[i] - A[i]) * t) * 255)));
  return '#' + (((ch(0) << 16) | (ch(1) << 8) | ch(2)) | 0x1000000).toString(16).slice(1).toUpperCase();
}

/** Closed ring stroke (arcStroke double-caps at the seam of a full circle). */
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

/** A rotated rounded rectangle as a polygon (6 segments per corner). */
function roundRectPts(cx, cy, hw, hh, rad, ang = 0) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const pts = [];
  const corners = [[hw - rad, -(hh - rad), -Math.PI / 2], [hw - rad, hh - rad, 0], [-(hw - rad), hh - rad, Math.PI / 2], [-(hw - rad), -(hh - rad), Math.PI]];
  for (const [ox, oy, a0] of corners) {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      const lx = ox + Math.cos(a) * rad, ly = oy + Math.sin(a) * rad;
      pts.push([cx + lx * ca - ly * sa, cy + lx * sa + ly * ca]);
    }
  }
  return pts;
}

/** Scalloped disc: radius r with `lobes` bumps of amplitude `amp`. */
function wavyPts(cx, cy, r, amp, lobes, n = 240) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r + amp * Math.cos(lobes * a);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

/**
 * Straight-stroke capital letters in a unit box (x,y in -1..1, y down), as
 * segment lists. Only letters with no curves are tabled: at 10px a curve is a
 * blob, a straight stroke is still a stroke.
 */
const GLYPH = {
  H: [[-1, -1, -1, 1], [1, -1, 1, 1], [-1, 0, 1, 0]],
  A: [[-1, 1, 0, -1], [0, -1, 1, 1], [-0.55, 0.3, 0.55, 0.3]],
  T: [[-1, -1, 1, -1], [0, -1, 0, 1]],
  E: [[-0.9, -1, -0.9, 1], [-0.9, -1, 0.9, -1], [-0.9, 0, 0.6, 0], [-0.9, 1, 0.9, 1]],
  N: [[-1, 1, -1, -1], [-1, -1, 1, 1], [1, 1, 1, -1]],
};

/**
 * One candy letter tile in the game's own chrome (see themes.mjs candyTile):
 * dark keyline, base plane, side plane, flat face, lighter bevel plane, gloss
 * bar, specular dot. `letter` (optional) is pressed into the face as a cream
 * stroke over its own dark shadow.
 */
function candyTile(t, cx, cy, hw, hh, pal, letter = null) {
  const RR = (dx, dy, w, h, rad) => roundRectPts(cx + dx, cy + dy, w, h, rad, 0);
  const lip = Math.round(hh * 0.42), rad = Math.round(hw * 0.3);
  poly(t, RR(0, lip / 2, hw + 8, hh + lip / 2 + 8, rad + 6), INK);
  poly(t, RR(0, lip, hw, hh, rad), shade(pal[1], 0.54));                  // base plane
  poly(t, RR(0, lip / 2, hw, hh, rad), pal[1]);                           // side plane
  poly(t, RR(0, 0, hw, hh, rad), pal[0]);                                 // face
  poly(t, RR(0, -hh * 0.46, hw - 5, hh * 0.54, rad - 3), shade(pal[0], 1.16));  // bevel plane
  poly(t, RR(0, -hh * 0.62, hw * 0.74, hh * 0.13, Math.max(4, rad * 0.5)), '#FFFFFF', 0.4); // gloss bar
  ellipse(t, cx + hw * 0.56, cy - hh * 0.54, Math.max(5, hw * 0.15), Math.max(5, hw * 0.15), '#FFFFFF', 0.75, 3);
  if (letter && GLYPH[letter]) {
    const s = hw * 0.5, th = Math.max(10, hw * 0.34);
    for (const [x0, y0, x1, y1] of GLYPH[letter]) {
      capsule(t, cx + x0 * s, cy + 6 + y0 * s, cx + x1 * s, cy + 6 + y1 * s, th + 2, shade(pal[1], 0.62), 0.6);
    }
    for (const [x0, y0, x1, y1] of GLYPH[letter]) {
      capsule(t, cx + x0 * s, cy + 1 + y0 * s, cx + x1 * s, cy + 1 + y1 * s, th, CREAM);
    }
  }
}

/** The recessed empty socket a tile has left (or is about to fill) in a row. */
function socket(t, cx, cy, hw, hh) {
  const rad = Math.round(hw * 0.3);
  poly(t, roundRectPts(cx, cy + 8, hw + 4, hh + 8, rad + 4), INK, 0.9);
  poly(t, roundRectPts(cx, cy + 8, hw - 2, hh + 2, rad), '#6E5646', 1, '#4A3628');
}

// ---------------------------------------------------------------------------
// THE SEAL — fixed geometry, shared by all five tiers
// ---------------------------------------------------------------------------

/**
 * Round-two vessel scale. Every seal length below is written in round one's
 * 384-space units and mapped through these: `L` scales a length, `SX`/`SY`
 * scale a coordinate about the vessel's bbox centre (192, 203), so the seal
 * grows in place — the outer pixel ring stays clear (the ribbon's contact
 * shadow now bottoms out at supersample ~376 of 384) and the five tiers keep
 * one geometry.
 */
const K = 1.12;
const PIVOT_Y = 203;
const L = v => v * K;
const SX = v => 192 + (v - 192) * K;
const SY = v => PIVOT_Y + (v - PIVOT_Y) * K;

const SEAL = { cx: 192, cy: SY(176), r: L(98), amp: L(7), lobes: 14, press: L(74) };
const RIBBON = { top: SY(120), bottom: SY(336), notch: SY(314), inner: L(8), outer: L(62), spread: L(30) };

/** The two ribbon tails, hung behind the seal, notched swallow-tail ends. */
function ribbon(t, pal) {
  const { cx } = SEAL;
  for (const side of [-1, 1]) {
    const x = v => cx + side * v;
    const pts = [
      [x(RIBBON.inner), RIBBON.top], [x(RIBBON.outer), RIBBON.top],
      [x(RIBBON.outer + RIBBON.spread), RIBBON.bottom],
      [x((RIBBON.outer + RIBBON.inner) / 2 + RIBBON.spread / 2 - L(2)), RIBBON.notch],
      [x(RIBBON.inner + RIBBON.spread - L(6)), RIBBON.bottom],
    ];
    poly(t, pts, pal.dark, 1, pal.shadow);
    // a lit fold line down the tail's inner edge
    capsule(t, x(RIBBON.inner + L(8)), SEAL.cy + L(60), x(RIBBON.inner + RIBBON.spread + L(2)), RIBBON.bottom - L(22), L(7), pal.light, 0.45);
  }
}

/** The wax disc: scalloped rim graded top-down, dark pressed ring, lit far wall. */
function wax(t, pal) {
  const { cx, cy, r, amp, lobes, press } = SEAL;
  poly(t, wavyPts(cx, cy, r, amp, lobes), pal.light, 1, pal.dark);
  poly(t, wavyPts(cx, cy, r - L(14), amp * 0.55, lobes), pal.main, 1, pal.dark);   // rim bevel step
  ellipse(t, cx, cy, press + L(5), press + L(5), INK, 0.55, 3);                     // the die's bite
  roundRect(t, cx, cy, press, press, press, pal.main, 1, pal.dark);                 // pressed floor
  arcStroke(t, cx, cy, press - L(5), L(9), 0.5, Math.PI - 0.5, pal.light, 0.55);   // light on the far wall
}

/**
 * Draw `sym` as a raised relief: an INK drop shadow down-right (the symbol
 * drawn solid in ink, offset), then the coloured body inside its OWN
 * withOutline pass, so the emblem carries the same warm-dark contour the
 * vessel does and is separated from the wax by ink whatever the wax's value.
 * Round one used a 5px eight-copy keyline here and lost the oak leaf on the
 * yellow wax at 28px (cream on gold with a hairline between them); a full
 * contour is what lets the crown and flame be read by their edge, so every
 * emblem gets it. Symbols take (t, pal, dx, dy, ink, alpha): with `ink` set
 * they draw their whole silhouette in that one colour (the shadow pass), with
 * `ink` null they draw in their real colours plus any inside detail.
 */
function relief(t, pal, sym) {
  sym(t, pal, 6, 7, INK, 0.7);
  withOutline(t, tt => sym(tt, pal, 0, 0, null, 1), { width: 9 });
}

/** The relief cream, tinted a little toward the tier's own light. */
const creamFor = pal => mix(CREAM, pal.light, 0.22);

/**
 * Point mapper for a symbol: offsets in round-one units, scaled by K, optionally
 * rotated by `ang` (radians, clockwise on screen) about the seal centre.
 */
function mapper(dx, dy, ang = 0) {
  const ox = SEAL.cx + dx, oy = SEAL.cy + dy, ca = Math.cos(ang), sa = Math.sin(ang);
  return (px, py) => [ox + (px * ca - py * sa) * K, oy + (px * sa + py * ca) * K];
}

/** A curved leaf blade from (bx,by) to (tx,ty), bowed by `bend`, widest at mid. */
function leafPts(bx, by, tx, ty, width, bend, steps = 16) {
  const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const cx = (bx + tx) / 2 + nx * bend, cy = (by + ty) / 2 + ny * bend;
  const up = [], dn = [];
  for (let i = 0; i <= steps; i++) {
    const u = 1 - i / steps, v = i / steps;
    const sx = u * u * bx + 2 * u * v * cx + v * v * tx;
    const sy = u * u * by + 2 * u * v * cy + v * v * ty;
    const w = (width / 2) * Math.pow(Math.sin(Math.PI * v), 0.65);
    up.push([sx + nx * w, sy + ny * w]);
    dn.push([sx - nx * w, sy - ny * w]);
  }
  return up.concat(dn.reverse());
}

// --- the five pressed symbols, each (t, pal, dx, dy, ink, alpha) ------------

function symSprout(t, pal, dx, dy, ink, al) {
  const P = mapper(dx, dy), col = ink ?? creamFor(pal);
  capsule(t, ...P(0, 58), ...P(0, -8), L(17), col, al);                          // stem
  // two fat leaf blades leaving the stem at ~50 degrees, bowed outward, with the
  // stem running up between them so there is a real notch: a seedling with two
  // wings. (Straight thin blades read as a T-bar, then a letter Y; two lobes
  // meeting over a bud read as a heart on a stick. Wings it is.)
  poly(t, leafPts(...P(-6, 12), ...P(-54, -30), L(42), L(14)), col, al);
  poly(t, leafPts(...P(6, 12), ...P(54, -30), L(42), L(-14)), col, al);
}

/** Oak leaf relief values: pale gold catching the light over deep amber. */
const LEAF = { hi: '#FFF1B8', lo: '#D8951E' };

function symOakLeaf(t, pal, dx, dy, ink, al) {
  const P = mapper(dx, dy);
  // pointed tip, three deep round lobes a side, base pinched to the stem. The
  // right half is tabled tip-to-base and mirrored; notch x (18/24/16) against a
  // 54 half-width keeps every notch >= 1/4 of the leaf's width deep.
  const half = [
    [0, -70], [12, -60], [28, -54], [38, -42], [32, -32], [18, -28],             // lobe 1
    [34, -20], [50, -12], [54, 2], [48, 14], [34, 20], [22, 18],                 // lobe 2 (widest)
    [34, 28], [46, 38], [44, 50], [32, 58], [16, 60], [0, 58],                   // lobe 3 into the base
  ];
  const pts = half.concat(half.slice(1, -1).reverse().map(([px, py]) => [-px, py]));
  poly(t, pts.map(([px, py]) => P(px, py)), ink ?? LEAF.hi, al, ink ? null : LEAF.lo);
  poly(t, [P(-7, 54), P(7, 54), P(7, 76), P(-7, 76)], ink ?? LEAF.lo, al);       // straight stem
  capsule(t, ...P(0, 76), ...P(0, 76), L(14), ink ?? LEAF.lo, al);              // stem's round foot
  if (!ink) capsule(t, ...P(0, -54), ...P(0, 52), L(9), INK, 0.65);             // the one midrib
}

function symFlame(t, pal, dx, dy, ink, al) {
  const P = mapper(dx, dy), col = ink ?? creamFor(pal);
  const [x, top] = P(0, -64), [, bot] = P(0, 58);
  flameLobe(t, x, top, bot, L(42), col, al);
  if (!ink) {
    // the flame's inner tongue, in the wax's own hue: what turns a teardrop into fire
    flameLobe(t, x, P(0, -18)[1], P(0, 50)[1], L(21), pal.dark, 1);
    flameLobe(t, x, P(0, 4)[1], P(0, 48)[1], L(12), pal.main, 1);
  }
}

/** Sword relief values: blade lit / shaded halves, leather-wrapped grip. */
const SWORD = { shade: '#C4B7A5', gripHi: '#A96B33', gripLo: '#6A3C1A' };
const SWORD_CANT = (8 * Math.PI) / 180;

function symSword(t, pal, dx, dy, ink, al) {
  const P = mapper(dx, dy, SWORD_CANT), cream = creamFor(pal);
  const pts = arr => arr.map(([px, py]) => P(px, py));
  // blade 34 wide (>= 1/6 of the disc) and 90 long, so the point is the thing
  // the eye lands on; the guard is a short bar THINNER than the blade (24
  // against 34 — a bar as thick as the blade made the top half a T at 28px)
  if (ink) {
    poly(t, pts([[0, -76], [17, -52], [17, 14], [-17, 14], [-17, -52]]), ink, al);
  } else {
    // two-value fuller: the left face lit, the right face in shade, split on the
    // blade's own centre line so the point still reads as a point
    poly(t, pts([[0, -76], [0, 14], [-17, 14], [-17, -52]]), cream, al);
    poly(t, pts([[0, -76], [17, -52], [17, 14], [0, 14]]), SWORD.shade, al);
  }
  poly(t, pts([[-42, 14], [42, 14], [42, 38], [-42, 38]]), ink ?? cream, al);    // short crossguard, low
  capsule(t, ...P(-42, 26), ...P(-42, 26), L(24), ink ?? cream, al);              // rounded guard ends
  capsule(t, ...P(42, 26), ...P(42, 26), L(24), ink ?? cream, al);
  poly(t, pts([[-10, 37], [10, 37], [10, 53], [-10, 53]]), ink ?? SWORD.gripHi, al, ink ? null : SWORD.gripLo); // wrapped grip
  capsule(t, ...P(0, 62), ...P(0, 62), L(22), ink ?? cream, al);                  // round pommel
}

function symCrown(t, pal, dx, dy, ink, al) {
  const P = mapper(dx, dy), col = ink ?? creamFor(pal);
  poly(t, [[-46, 30], [-46, -18], [-22, 4], [0, -40], [22, 4], [46, -18], [46, 30]].map(([px, py]) => P(px, py)), col, al);
  const [bx, by] = P(0, 36);
  poly(t, roundRectPts(bx, by, L(48), L(12), L(6)), col, al);                     // band
  for (const [px, py] of [[-46, -20], [0, -42], [46, -20]]) ellipse(t, ...P(px, py), L(9), L(9), col, al, 2);
}

const SYMBOL = { easy: symSprout, medium: symOakLeaf, medium_plus: symFlame, hard: symSword, expert: symCrown };

function drawSeal(tier) {
  const pal = TIER[tier];
  const { cv } = canvas();
  contactShadow(cv, SEAL.cx + L(8), RIBBON.bottom + L(6), L(88), L(16), 0.3);
  ellipse(cv, SEAL.cx + L(10), SEAL.cy + L(12), SEAL.r + L(8), SEAL.r + L(8), INK, 0.26, 14);   // drop shadow behind the disc
  withOutline(cv, t => {
    ribbon(t, pal);
    wax(t, pal);
    relief(t, pal, SYMBOL[tier]);
  }, { width: 9 });
  sheen(cv, SEAL.cx - L(54), SEAL.cy - L(58), L(24), L(14), 0.45);
  savePNG(path.join(OUT_DIFF, `${tier}.png`), W, W, down2(cv, W, W));
}

// ---------------------------------------------------------------------------
// THE RULES STEPS
// ---------------------------------------------------------------------------

/** The teaching hand: forearm from the upper right, palm, four fingers curled
 *  down over the tile's top edge, thumb down its right side. */
function hand(t, tx, ty, hw, hh) {
  const px = tx + 36, py = ty - hh - 26;                                      // palm centre
  capsule(t, px + 22, py - 8, px + 60, py - 28, 40, SKIN.base);               // forearm, short: it must clear the top edge
  poly(t, roundRectPts(px, py, 40, 30, 18), SKIN.hi, 1, SKIN.base);          // palm
  for (let k = 0; k < 4; k++) {                                              // fingers, over the face
    const fx = tx - hw + 12 + k * 22;
    capsule(t, fx, py + 14, fx, ty - hh + 20, 20, SKIN.base);
    capsule(t, fx - 4, py + 14, fx - 4, ty - hh + 8, 8, SKIN.hi, 0.6);
    capsule(t, fx, ty - hh + 14, fx, ty - hh + 20, 20, SKIN.lo, 0.5);        // fingertip shade
  }
  capsule(t, px + 8, py + 18, tx + hw + 6, ty - 4, 22, SKIN.base);           // thumb
}

function drawStep1() {
  const { cv, c } = canvas();
  const hw = 40, hh = 44, rowY = c + 78, lift = { x: c - 6, y: c - 46 };
  contactShadow(cv, c + 8, rowY + 76, 132, 18, 0.32);
  withOutline(cv, t => {
    candyTile(t, c - 98, rowY, hw, hh, TILE.gold, 'H');
    socket(t, c - 6, rowY, hw, hh);
    candyTile(t, c + 86, rowY, hw, hh, TILE.amber, 'T');
    candyTile(t, lift.x, lift.y, hw, hh, TILE.pink, 'A');
    hand(t, lift.x, lift.y, hw, hh);
  }, { width: 9 });
  sheen(cv, c - 118, rowY - 34, 12, 7, 0.45);
  sheen(cv, c + 14, c - 148, 14, 8, 0.45);
  savePNG(path.join(OUT_RULES, 'step_1.png'), W, W, down2(cv, W, W));
}

function drawStep2() {
  const { cv, c } = canvas();
  const hw = 40, hh = 44, rowY = c + 78, drop = { x: c, y: c - 66 };
  contactShadow(cv, c + 8, rowY + 76, 132, 18, 0.32);
  withOutline(cv, t => {
    candyTile(t, c - 92, rowY, hw, hh, TILE.amber, 'T');
    socket(t, c, rowY, hw, hh);
    candyTile(t, c + 92, rowY, hw, hh, TILE.gold, 'N');
    // the insertion mark, a candy-green plus seated in the socket
    capsule(t, c - 22, rowY + 10, c + 22, rowY + 10, 18, CHECK.lo);
    capsule(t, c, rowY - 12, c, rowY + 32, 18, CHECK.lo);
    capsule(t, c - 22, rowY + 6, c + 22, rowY + 6, 16, CHECK.base);
    capsule(t, c, rowY - 16, c, rowY + 28, 16, CHECK.base);
    capsule(t, c - 14, rowY + 2, c + 14, rowY + 2, 5, CHECK.hi, 0.7);
    candyTile(t, drop.x, drop.y, hw, hh, TILE.pink, 'E');
    // two short fall marks either side of the tile, so it is DROPPING, not floating
    for (const side of [-1, 1]) {
      const x = drop.x + side * (hw + 26);
      capsule(t, x, drop.y - 24, x, drop.y + 8, 9, INK, 0.95);
      capsule(t, x, drop.y - 24, x, drop.y + 8, 5, CREAM, 0.9);
      tri(t, [x - 12, drop.y + 12], [x + 12, drop.y + 12], [x, drop.y + 32], INK, 0.95);
      tri(t, [x - 8, drop.y + 14], [x + 8, drop.y + 14], [x, drop.y + 28], CREAM, 0.9);
    }
  }, { width: 9 });
  sheen(cv, c - 112, rowY - 34, 12, 7, 0.45);
  sheen(cv, drop.x - 20, drop.y - 34, 12, 7, 0.45);
  savePNG(path.join(OUT_RULES, 'step_2.png'), W, W, down2(cv, W, W));
}

function drawStep3() {
  const { cv, c } = canvas();
  const hw = 28, hh = 30, step = 62, xs = [c - 112, c - 50, c + 12];
  contactShadow(cv, c + 4, c + 106, 140, 18, 0.32);
  withOutline(cv, t => {
    const rows = [[c - 66, [TILE.gold, TILE.pink, TILE.amber]], [c + 34, [TILE.amber, TILE.gold, TILE.pink]]];
    for (const [y, pals] of rows) for (let i = 0; i < 3; i++) candyTile(t, xs[i], y, hw, hh, pals[i]);
    // the check: one thick bent stroke, dark copy beneath for thickness
    const a = [c + 46, c + 30], b = [c + 88, c + 84], d = [c + 148, c - 60];
    capsule(t, a[0] + 5, a[1] + 7, b[0] + 5, b[1] + 7, 36, CHECK.lo);
    capsule(t, b[0] + 5, b[1] + 7, d[0] + 5, d[1] + 7, 36, CHECK.lo);
    capsule(t, a[0], a[1], b[0], b[1], 34, CHECK.base);
    capsule(t, b[0], b[1], d[0], d[1], 34, CHECK.base);
    capsule(t, a[0] - 6, a[1] - 8, b[0] - 6, b[1] - 8, 9, CHECK.hi, 0.8);
    capsule(t, b[0] - 6, b[1] - 8, d[0] - 6, d[1] - 8, 9, CHECK.hi, 0.8);
  }, { width: 9 });
  sheen(cv, xs[0] - 12, c - 90, 9, 5, 0.45);
  sheen(cv, c + 120, c - 40, 10, 6, 0.45);
  savePNG(path.join(OUT_RULES, 'step_3.png'), W, W, down2(cv, W, W));
}

function drawStep4() {
  const { cv, c } = canvas();
  const hw = 26, hh = 27, step = 58, x0 = c - 104;
  const rows = [[c - 100, 3, [TILE.gold, TILE.pink, TILE.amber]], [c - 8, 3, [TILE.amber, TILE.gold, TILE.pink]], [c + 84, 4, [TILE.pink, TILE.amber, TILE.gold, TILE.blue]]];
  contactShadow(cv, c + 6, c + 152, 150, 16, 0.32);
  withOutline(cv, t => {
    for (const [y, n, pals] of rows) for (let i = 0; i < n; i++) candyTile(t, x0 + i * step, y, hw, hh, pals[i]);
    // the flag, planted on the bottom row's last tile
    const fx = x0 + 3 * step, base = c + 84 - hh + 4, top = 52;
    capsule(t, fx, base, fx, top, 12, WOOD.dark);
    capsule(t, fx - 2, base - 6, fx - 2, top + 6, 4, WOOD.rim, 0.7);
    poly(t, [[fx + 6, top + 2], [fx + 86, top + 30], [fx + 6, top + 60]], FLAG.base, 1, FLAG.lo);
    poly(t, [[fx + 6, top + 2], [fx + 44, top + 16], [fx + 6, top + 22]], FLAG.hi, 0.8);
    ellipse(t, fx, top - 4, 10, 10, BRASS.hi, 1, 2);
    ellipse(t, fx + 2, top - 1, 6, 6, BRASS.lo, 0.7, 2);
    ellipse(t, fx, base + 2, 14, 6, WOOD.seam, 0.8, 2);                     // seat on the tile
  }, { width: 9 });
  sheen(cv, x0 - 12, c - 122, 9, 5, 0.45);
  sheen(cv, c + 82, 44, 6, 4, 0.5);
  savePNG(path.join(OUT_RULES, 'step_4.png'), W, W, down2(cv, W, W));
}

export function draw() {
  fs.mkdirSync(OUT_DIFF, { recursive: true });
  fs.mkdirSync(OUT_RULES, { recursive: true });
  for (const tier of ['easy', 'medium', 'medium_plus', 'hard', 'expert']) drawSeal(tier);
  drawStep1();
  drawStep2();
  drawStep3();
  drawStep4();
}
