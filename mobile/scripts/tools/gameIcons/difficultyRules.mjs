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
 * over an INK drop shadow offset down-right. Real wax embosses in its own hue,
 * but a same-hue dent averages to nothing at 28dp — the symbol is the whole
 * point of the icon, so it gets the value step it needs. The cream is tinted a
 * little toward the tier's own light, so it still reads as the wax catching the
 * light rather than a white sticker. Every symbol is >= 1/3 of the seal across
 * (the brief's 1/12-of-frame floor is 16px at 192; the smallest symbol stroke
 * here is 18px in supersample = 9px at 192).
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
const SEAL = { cx: 192, cy: 176, r: 98, amp: 7, lobes: 14, press: 74 };
const RIBBON = { top: 120, bottom: 336, notch: 314, inner: 8, outer: 62, spread: 30 };

/** The two ribbon tails, hung behind the seal, notched swallow-tail ends. */
function ribbon(t, pal) {
  const { cx } = SEAL;
  for (const side of [-1, 1]) {
    const x = v => cx + side * v;
    const pts = [
      [x(RIBBON.inner), RIBBON.top], [x(RIBBON.outer), RIBBON.top],
      [x(RIBBON.outer + RIBBON.spread), RIBBON.bottom],
      [x((RIBBON.outer + RIBBON.inner) / 2 + RIBBON.spread / 2 - 2), RIBBON.notch],
      [x(RIBBON.inner + RIBBON.spread - 6), RIBBON.bottom],
    ];
    poly(t, pts, pal.dark, 1, pal.shadow);
    // a lit fold line down the tail's inner edge
    capsule(t, x(RIBBON.inner + 8), SEAL.cy + 60, x(RIBBON.inner + RIBBON.spread + 2), RIBBON.bottom - 22, 7, pal.light, 0.45);
  }
}

/** The wax disc: scalloped rim graded top-down, dark pressed ring, lit far wall. */
function wax(t, pal) {
  const { cx, cy, r, amp, lobes, press } = SEAL;
  poly(t, wavyPts(cx, cy, r, amp, lobes), pal.light, 1, pal.dark);
  poly(t, wavyPts(cx, cy, r - 14, amp * 0.55, lobes), pal.main, 1, pal.dark);   // rim bevel step
  ellipse(t, cx, cy, press + 5, press + 5, INK, 0.55, 3);                        // the die's bite
  roundRect(t, cx, cy, press, press, press, pal.main, 1, pal.dark);              // pressed floor
  arcStroke(t, cx, cy, press - 5, 9, 0.5, Math.PI - 0.5, pal.light, 0.55);      // light on the far wall
}

/**
 * Draw `sym` as a raised relief: an INK keyline all round (eight offset copies
 * of the symbol, which is a poor man's dilation but it is exact and cheap), an
 * ink shadow down-right, then the cream body, then any `detail` the symbol
 * wants drawn INSIDE its body (the flame's inner tongue). The keyline is what
 * keeps the cream relief legible on the YELLOW wax, where cream-on-gold has
 * almost no value step of its own — round one lost the oak leaf there.
 */
function relief(t, pal, sym, detail = null) {
  for (const [ox, oy] of [[-5, 0], [5, 0], [0, -5], [0, 5], [-4, -4], [4, -4], [-4, 4], [4, 4]]) sym(t, INK, 1, ox, oy);
  sym(t, INK, 0.7, 6, 7);
  sym(t, mix(CREAM, pal.light, 0.22), 1, 0, 0);
  if (detail) detail(t, pal);
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

// --- the five pressed symbols, each (t, color, alpha, dx, dy) ---------------
const S = { x: SEAL.cx, y: SEAL.cy };

function symSprout(t, col, al, dx, dy) {
  const x = S.x + dx, y = S.y + dy;
  capsule(t, x, y + 58, x, y - 8, 17, col, al);                                 // stem
  // two fat leaf blades leaving the stem at ~50 degrees, bowed outward, with the
  // stem running up between them so there is a real notch: a seedling with two
  // wings. (Straight thin blades read as a T-bar, then a letter Y; two lobes
  // meeting over a bud read as a heart on a stick. Wings it is.)
  poly(t, leafPts(x - 6, y + 12, x - 54, y - 30, 42, 14), col, al);
  poly(t, leafPts(x + 6, y + 12, x + 54, y - 30, 42, -14), col, al);
}

function symOakLeaf(t, col, al, dx, dy) {
  const x = S.x + dx, y = S.y + dy;
  // three pairs of deep round lobes either side of a spine; wide, so the leaf
  // is a MASS at 28dp and not a stalk with a fringe
  const half = [[0, -66], [16, -56], [18, -42], [40, -42], [46, -24], [26, -14], [48, 0], [46, 16], [26, 22], [42, 36], [34, 48], [14, 48], [10, 54]];
  const pts = half.concat(half.slice(0, -1).reverse().map(([px, py]) => [-px, py]));
  poly(t, pts.map(([px, py]) => [x + px, y + py - 6]), col, al);
  capsule(t, x, y + 42, x, y + 64, 13, col, al);                                // stalk
}

function symFlame(t, col, al, dx, dy) {
  const x = S.x + dx, y = S.y + dy;
  flameLobe(t, x, y - 64, y + 58, 42, col, al);
}
/** The flame's inner tongue, in the wax's own hue: what turns a teardrop into fire. */
function flameTongue(t, pal) {
  flameLobe(t, S.x, S.y - 18, S.y + 50, 21, pal.dark, 1);
  flameLobe(t, S.x, S.y + 4, S.y + 48, 12, pal.main, 1);
}

function symSword(t, col, al, dx, dy) {
  const x = S.x + dx, y = S.y + dy;
  poly(t, [[x, y - 68], [x + 13, y - 44], [x + 13, y + 14], [x - 13, y + 14], [x - 13, y - 44]], col, al);  // blade
  capsule(t, x - 38, y + 22, x + 38, y + 22, 16, col, al);                      // crossguard
  capsule(t, x, y + 28, x, y + 50, 13, col, al);                                // grip
  ellipse(t, x, y + 60, 11, 11, col, al, 2);                                    // pommel
}

function symCrown(t, col, al, dx, dy) {
  const x = S.x + dx, y = S.y + dy;
  poly(t, [[x - 46, y + 30], [x - 46, y - 18], [x - 22, y + 4], [x, y - 40], [x + 22, y + 4], [x + 46, y - 18], [x + 46, y + 30]], col, al);
  poly(t, roundRectPts(x, y + 36, 48, 12, 6), col, al);                          // band
  for (const [px, py] of [[-46, -20], [0, -42], [46, -20]]) ellipse(t, x + px, y + py, 9, 9, col, al, 2);
}

const SYMBOL = { easy: symSprout, medium: symOakLeaf, medium_plus: symFlame, hard: symSword, expert: symCrown };
const DETAIL = { medium_plus: flameTongue };

function drawSeal(tier) {
  const pal = TIER[tier];
  const { cv } = canvas();
  contactShadow(cv, SEAL.cx + 8, RIBBON.bottom + 6, 88, 16, 0.3);
  ellipse(cv, SEAL.cx + 10, SEAL.cy + 12, SEAL.r + 8, SEAL.r + 8, INK, 0.26, 14);   // drop shadow behind the disc
  withOutline(cv, t => {
    ribbon(t, pal);
    wax(t, pal);
    relief(t, pal, SYMBOL[tier], DETAIL[tier] ?? null);
  }, { width: 9 });
  sheen(cv, SEAL.cx - 54, SEAL.cy - 58, 24, 14, 0.45);
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
