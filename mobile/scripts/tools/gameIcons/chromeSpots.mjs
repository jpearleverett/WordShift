/**
 * gameIcons/chromeSpots.mjs — CHROME GLYPHS (9 icons, 256px, saved FLAT in
 * assets/ui beside their shipped siblings) + two EMPTY-STATE SPOTS (256px,
 * assets/ui/spots/).
 *
 * The chrome set lands at 20-27dp: a device shrinks each 256px file roughly
 * 10x, so every one of the nine is ONE bold silhouette with two or three big
 * value steps and nothing finer than ~1/12 of the frame. The contour is drawn
 * heavier than the 192px shop set (withOutline width 20 on the 512 supersample
 * = 10px at 256 = ~1px at 24dp): at that size the contour IS the drawing, and
 * it is what lets a parchment card survive cream paper and a green book survive
 * ash paper. The two spots render at 96dp and carry a little more detail under
 * the same doctrine (spotsB's contour weight, 13).
 *
 * Two subjects were drawn AGAINST an existing sibling on purpose:
 *   sun.png          the store's daily-amber icon is a full spiky sun disc with
 *                    a hex gem for a face. This is a LOW RISING sun: a half-disc
 *                    seated on a thick grass-and-earth horizon band with five
 *                    fat rays fanning above it. The horizon is the tell.
 *   season_pass.png  the store's season premium is a TICKET (notched, stubbed).
 *                    This is a landscape PASS CARD with square corners: a
 *                    parchment face inside a plum border, TWO thick plum title
 *                    bars at the upper left, and one big PLAIN ROUND wax seal
 *                    (r = 56, so 54% of the card's height) sitting ON the
 *                    card's lower-right corner with two dovetailed ribbon
 *                    tails hanging out from under it past the card's bottom
 *                    edge. Round 1 ran the ribbon as a diagonal SASH whose
 *                    upper end crossed the card's top-right corner: at 32px
 *                    that read as a TORN corner, and its lumpy blob seal
 *                    averaged into the sash as one red smear beside row 9's
 *                    rosette. The seal is now a smooth disc with two value
 *                    steps, one pressed ring and a small pressed star, so the
 *                    scalloped pleat ring belongs to ribbon.png alone.
 *   book_closed/open the shipped journal.png is a BURGUNDY tome with brass
 *                    corner braces, an amber boss and a crimson bookmark. This
 *                    book is FOREST-GREEN leather with a plain blind-embossed
 *                    panel, raised spine bands and a brown strap-and-brass-
 *                    buckle CLASP. Closed and open are the SAME book: same
 *                    leather, same page cream, same brass buckle (on the
 *                    fore-edge when closed, hanging off the right cover when
 *                    open), the same overall height of frame.
 *
 * The rest of the chrome:
 *   hourglass.png    a wooden-framed hourglass: two turned plates, two posts,
 *                    a pale-blue glass waisted between them, amber sand heaped
 *                    in the top bulb, a thin stream, a heap in the bottom bulb.
 *   rules.png        a wooden signpost: one post seated in an earth mound, ONE
 *                    arrow board pointing right, two nail heads.
 *   shop_sign.png    ONE silhouette anchored on a big plank board (68% of the
 *                    frame wide). Its hardware is WARM: a short WOOD bracket
 *                    beam (th 46, so >= 1/12 of the frame) sitting inside the
 *                    board's own width, joined to it by two chunky BRASS links
 *                    (th 36, >= 1/16) that overlap both, so the whole hangs as
 *                    one connected shape. The house-painter's brush is the
 *                    ONLY emblem, a big near-horizontal mark centred on the
 *                    board: a fat dark-wood handle (th 56), a wide brass
 *                    ferrule, and a broad cream bristle wedge 112px across at
 *                    its square-cut end, its last third dipped in one candy
 *                    pink. Round 1 hung the board from a cool IRON rod on two
 *                    thin links, which went dark-on-dark on ash so the board
 *                    floated, and drew a thin tapering brush lying across the
 *                    board's edge with a second paint dab beside it: three
 *                    competing masses that averaged to a diagonal smear. No
 *                    grey survives here, and the brush stays inside the board.
 *   clover.png       a four-leaf clover: four heart-shaped leaves on the
 *                    diagonals around a dark hub, the two upper leaves lit and
 *                    the lower two shaded, one short stem down-right.
 *   ribbon.png       a prize rosette: a scalloped candy-red pleat ring, a cream
 *                    inner ring, a brass button centre with a small star, two
 *                    notched tails below.
 * The spots:
 *   spots/empty_ledger.png   ONE still life, not a flat spread: the blank
 *                    ledger is drawn in a slight top-down PERSPECTIVE, a wine
 *                    leather trapezoid narrower at its far edge than its near
 *                    one, with a thick stacked page block along the near edge
 *                    and a brass corner cap on the near-right corner, so the
 *                    outline is a box/wedge rather than book_open's butterfly
 *                    and each page is taller than it is wide. The pages carry
 *                    THREE fat rules and one red margin line each, nothing
 *                    finer. A big cream-to-tan quill lies across the spread on
 *                    a warm shaft, vane ~90px wide, with a brass nib resting
 *                    on the near edge; a squat CLAY inkpot with a brass cap
 *                    overlaps the ledger's front-left corner so the two share
 *                    one contour and one contact shadow, its ink shown only as
 *                    a dark INK meniscus. Round 1 drew a flat landscape spread
 *                    (row 4's silhouette at small size) with sub-1/12 page
 *                    hatching, a white plume that averaged to a stroke, and a
 *                    detached COBALT pot: the family's only cold mass, sitting
 *                    dark-on-dark on ash.
 *   spots/empty_gallery.png  an EMPTY gilt picture frame (the drawing round 1
 *                    got right) hung from ONE big round BRASS nail head by a
 *                    shallow V of thick warm twine (th 22, >= 1/24 of the
 *                    frame), the whole hanging assembly inside the silhouette.
 *                    The mount is a warm faded PLASTER, top-lit, so "empty"
 *                    reads without a cold flat patch. ONE moth, 114px across,
 *                    sits astride the frame's lower-right corner: two big
 *                    cream-to-tan wing lobes with one dark spot each, a short
 *                    dark body, a round head and two fat antennae, every part
 *                    keylined so it holds on ash. Round 1's near-black cord
 *                    tangled with a tiny moth on the top rail into a squiggle
 *                    read as a cobweb or dried flowers, and its cool grey
 *                    interior was the family's only cold fill.
 *
 * Palette: the kit's WOOD/PARCH/BRASS/AMB/ACCENT plus local sets (sun gold,
 * pale glass, forest leather, plum, wax, candy red, iron for the signpost's
 * nail heads only, earth, clover green, wine leather, gilt, ochre moth, quill
 * tan). No cool fill or grey hardware survives except those two nail heads.
 * Every "glow" stop is above cream in all three channels (the only one here
 * is the sun's disc crest).
 *
 * House doctrine (see _draw.mjs): contact shadow BEFORE withOutline, subject
 * inside it, sheen AFTER it. INK for contours, never #000. No Math.random or
 * Date.now: every coordinate is a literal, byte-reproducible. All coordinates
 * are in the 512x512 supersample (c = 256 is the centre); each file is
 * downsampled 2x to 256px.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  savePNG, down2, contactShadow, sheen, withOutline,
  INK, WOOD, PARCH, BRASS, AMB, ACCENT,
  C, ellipse, roundRect, poly, capsule, arcStroke, starPts,
} from '../shopIcons/_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui');
const SPOTS = path.join(OUT, 'spots');

/** 256px icons draw on a 512 supersample; c is the centre. */
const S = 512, c = 256, OW = 256;
/** Chrome contour (20-27dp delivery) and spot contour (96dp delivery). */
const CHROME = { width: 20 };
const SPOT = { width: 13 };
const fresh = () => C(S, S);
const save = (cv, file) => savePNG(file, OW, OW, down2(cv, OW, OW));

// --- local palettes ---------------------------------------------------------
const SUN = { lite: '#FFF3C0', hi: '#FFE07A', mid: '#FFB83A', lo: '#E5841A', deep: '#B85E0C' };
const GRASS = { lite: '#BEE092', hi: '#8DBE5E', base: '#6E9A4B', lo: '#3F6A2A' };
const EARTH = { hi: '#9A6C3E', base: '#6E4826', lo: '#432914' };
const GLASS = { hi: '#EAF3F8', base: '#BFD6E2', lo: '#7E9EB0' };
const SAND = { hi: '#FFD86E', base: '#F0B23A', lo: '#B57414' };
/** Forest-green leather for the Lexicon book pair. `lo` (0.08 lum) sits near
 *  ash only through the contour; `hi` (0.30) clears cream outright. */
const LEATHER = { hi: '#74A86A', base: '#4C7F47', lo: '#2E5630', deep: '#1E3A22' };
const STRAP = { hi: '#A8743F', base: '#8C5B33', lo: '#5E3A1C' };
const PAGE = { hi: '#FBF2DC', base: '#F1E2BE', lo: '#D8BE8E', line: '#B79E74', margin: '#C9736A' };
const PLUM = { hi: '#8E4E78', base: '#6E3660', lo: '#4B2242' };
const WAX = { hi: '#EE6B62', base: '#CC3B39', lo: '#8E2024', deep: '#5E1216' };
const RED = { lite: '#FFB0A6', hi: '#F26A5D', base: '#D9463F', lo: '#9C2A2A', deep: '#651818' };
const IRON = { hi: '#AEB1BB', base: '#6A6D77', lo: '#3B3D45' };
const CLOVER = { lite: '#B6E58E', hi: '#7CC763', base: '#4FA34A', lo: '#2C6E33', deep: '#1B4A24' };
const CREAM = { hi: '#FFF9EA', base: '#F6E8C6', lo: '#D6BC8A' };
const BR = { lite: '#F8E2A6', hi: BRASS.hi, mid: '#C48F3C', lo: BRASS.lo, deep: '#63401A' };
const PINK = { hi: '#FF9EC2', base: '#F25E8E', lo: '#B02A5B' };
const LEDGER = { hi: '#B0584F', base: '#8C3C36', lo: '#5C2320', deep: '#3B1513' };
/** Quill: cream (PAGE.hi at most, never #FFFFFF) down to tan, on a warm shaft. */
const QUILL = { hi: '#FBF2DC', lo: '#B39C72', shaft: '#7A5A3A' };
const GILT = { lite: '#FBE6A8', hi: '#E6BC62', base: '#C48F3C', lo: '#8E5E22', deep: '#5B3A12' };
/** A cream-to-ochre moth: its lit half clears cream, its body clears ash. */
const MOTH = { base: '#C89E4E', band: '#4E3618', body: '#4A3320' };
/** The ledger's inkpot: warm clay, never the cobalt glass of round 1. */
const CLAY = { hi: '#D9A468', base: '#B87C46', lo: '#7E4C22' };
/** The gallery's empty wall: a faded plaster two steps under cream, never grey. */
const PLASTER = { hi: '#DDC7A6', lo: '#B29571' };
/** Warm hanging twine, so the gallery's hardware survives ash paper. */
const TWINE = { hi: '#DCAB6C', base: '#B07E3C', lo: '#77501F' };

// --- local shape helpers (pure, table-driven) --------------------------------

/** A rotation about (cx, cy): returns a mapper from local (lx, ly) to canvas. */
const rot = (cx, cy, a) => {
  const ca = Math.cos(a), sa = Math.sin(a);
  return (lx, ly) => [cx + lx * ca - ly * sa, cy + lx * sa + ly * ca];
};

/** A polygon pushed outward from its own centroid by `g` (its own ink keyline). */
function grow(pts, g) {
  const n = pts.length;
  const cx = pts.reduce((s, p) => s + p[0], 0) / n, cy = pts.reduce((s, p) => s + p[1], 0) / n;
  return pts.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    return [x + ((x - cx) / d) * g, y + ((y - cy) / d) * g];
  });
}

/** Corner points of a thick bar from A to B (for poly + gradTo). */
function barPts(ax, ay, bx, by, th) {
  const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * (th / 2), ny = (dx / l) * (th / 2);
  return [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]];
}

/** A tapered wedge along direction `a` from radius r0 (half-width w0) to r1 (w1). */
function wedgePts(cx, cy, a, r0, r1, w0, w1) {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  return [
    [cx + ux * r0 - nx * w0, cy + uy * r0 - ny * w0], [cx + ux * r0 + nx * w0, cy + uy * r0 + ny * w0],
    [cx + ux * r1 + nx * w1, cy + uy * r1 + ny * w1], [cx + ux * r1 - nx * w1, cy + uy * r1 - ny * w1],
  ];
}

/** Upper half of an ellipse as a closed polygon, with a flat base at `baseY`. */
function domePts(cx, cy, rx, ry, baseY, n = 28) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  pts.push([cx + rx, baseY], [cx - rx, baseY]);
  return pts;
}

/**
 * A ribbon tail: a bar from (ax, ay) to (bx, by) of thickness th whose far end
 * is cut in a V (the dovetail every prize ribbon has).
 */
function tailPts(ax, ay, bx, by, th, notch) {
  const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
  const ux = dx / l, uy = dy / l, nx = (-uy) * (th / 2), ny = ux * (th / 2);
  return [
    [ax + nx, ay + ny], [bx + nx, by + ny], [bx - ux * notch, by - uy * notch],
    [bx - nx, by - ny], [ax - nx, ay - ny],
  ];
}

/**
 * ONE heart-shaped clover leaf, tip at the hub (hx, hy), pointing along `a`.
 * A heart is a triangle from the tip, a bridge rectangle, and two round lobes;
 * the lobes are circles (which need no rotation) placed through the mapper.
 */
function leaf(t, hx, hy, a, k, top, bottom) {
  const R = rot(hx, hy, a);
  const T = [R(0, 0), R(-84 * k, 84 * k), R(84 * k, 84 * k)];
  const B = [R(-84 * k, 84 * k), R(84 * k, 84 * k), R(84 * k, 112 * k), R(-84 * k, 112 * k)];
  poly(t, T, top, 1, bottom);
  poly(t, B, bottom, 1, bottom);
  for (const sgn of [-1, 1]) {
    const [lx, ly] = R(sgn * 42 * k, 96 * k);
    ellipse(t, lx, ly, 48 * k, 48 * k, sgn < 0 ? top : bottom, 1, 3);
  }
}

/**
 * ONE moth seen from above, head up, drawn for a 96dp spot: TWO big wing lobes
 * (not four small ones) running cream at the shoulder to ochre at the trailing
 * edge, one dark eye-spot in each, a fat dark body, a round head and two fat
 * antennae. Round 1's four-winged specimen with a band across each forewing
 * averaged to a dark squiggle and was read as a cobweb; a lobe is a shape that
 * survives the downscale. Every part lays its OWN grown ink keyline, so the
 * moth holds its outline over gilt frame, plaster mount, cream and ash alike.
 * `s` scales it: at s = 0.62 the wingspan is ~114px on the 512 supersample
 * (> 1/6 of the frame) and no antenna is thinner than 12px (> 1/48).
 */
function simpleMoth(t, mx, my, s) {
  const P = ([x, y]) => [mx + x * s, my + y * s];
  const side = (pts, sgn) => pts.map(([x, y]) => P([x * sgn, y]));
  const WING = [[6, -34], [-28, -62], [-74, -52], [-92, -8], [-70, 40], [-24, 48], [4, 26]];
  for (const sgn of [-1, 1]) {
    const w = side(WING, sgn);
    poly(t, grow(w, 10 * s), INK, 0.95);
    poly(t, w, CREAM.hi, 1, MOTH.base);
    const [dx, dy] = P([-50 * sgn, -4]);
    ellipse(t, dx, dy, 17 * s, 17 * s, INK, 0.9, 3);
    ellipse(t, dx, dy, 12 * s, 12 * s, MOTH.band, 1, 3);
  }
  for (const sgn of [-1, 1]) {                                   // antennae
    const a0 = P([6 * sgn, -54]), a1 = P([34 * sgn, -88]);
    capsule(t, a0[0], a0[1], a1[0], a1[1], 30 * s, INK, 0.95);
    capsule(t, a0[0], a0[1], a1[0], a1[1], 20 * s, MOTH.body);
  }
  const bT = P([0, -40]), bB = P([0, 46]);
  capsule(t, bT[0], bT[1], bB[0], bB[1], 44 * s, INK, 0.95);
  capsule(t, bT[0], bT[1], bB[0], bB[1], 32 * s, MOTH.body);
  const hd = P([0, -50]);
  ellipse(t, hd[0], hd[1], 22 * s, 22 * s, INK, 0.95, 3);
  ellipse(t, hd[0], hd[1], 16 * s, 16 * s, MOTH.body, 1, 3);
}

/**
 * The Lexicon book's OPEN pages: leather covers spread in a shallow V with the
 * spine dipped, cream pages inset on each side, a dark gutter down the middle.
 * Used by book_open.png (the green book); the ledger spot draws its own tilted
 * anatomy below. `lines` draws two fat rule strokes per page.
 */
function openBook(t, cx, cy, hw, hh, dip, inset, pal, page, opts = {}) {
  const cover = [
    [cx - hw, cy - hh], [cx - 8, cy - hh + dip], [cx + 8, cy - hh + dip], [cx + hw, cy - hh],
    [cx + hw, cy + hh], [cx + 8, cy + hh - dip * 0.55], [cx - 8, cy + hh - dip * 0.55], [cx - hw, cy + hh],
  ];
  poly(t, cover, pal.hi, 1, pal.lo);
  // a lit crest along the two top edges
  capsule(t, cx - hw + 12, cy - hh + 5, cx - 12, cy - hh + dip + 4, 9, pal.hi, 0.7);
  capsule(t, cx + 12, cy - hh + dip + 4, cx + hw - 12, cy - hh + 5, 9, pal.hi, 0.7);
  const k = dip / hw;
  const L = [[cx - hw + inset, cy - hh + inset * k + inset], [cx - 12, cy - hh + dip + inset * 0.6],
    [cx - 12, cy + hh - dip * 0.55 - inset * 0.6], [cx - hw + inset, cy + hh - inset]];
  const Rr = L.map(([x, y]) => [2 * cx - x, y]);
  poly(t, L, page.hi, 1, page.base);
  poly(t, Rr, page.hi, 1, page.base);
  // page-edge shade toward the gutter, then the gutter itself
  poly(t, [[cx - 12, L[1][1]], [cx - 44, L[1][1] + 10], [cx - 44, L[2][1] - 10], [cx - 12, L[2][1]]], page.lo, 0.55);
  poly(t, [[cx + 12, L[1][1]], [cx + 44, L[1][1] + 10], [cx + 44, L[2][1] - 10], [cx + 12, L[2][1]]], page.lo, 0.55);
  capsule(t, cx, cy - hh + dip + 4, cx, cy + hh - dip * 0.55 - 4, 16, pal.deep);
  if (opts.lines) {
    for (const sgn of [-1, 1]) {
      const x0 = cx + sgn * (hw - inset - 26), x1 = cx + sgn * 44;
      for (const [fy, len] of [[-0.22, 1], [0.12, 0.8]]) {
        const y0 = cy + fy * hh, y1 = y0 + (dip * 0.7) * (1 - Math.abs(0) );
        capsule(t, x0, y0 - (dip * 0.45), x0 + (x1 - x0) * len, y0 - (dip * 0.45) + (dip * 0.45) * len, 15, page.line, 0.9);
      }
    }
  }
}

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SPOTS, { recursive: true });

  { // === sun.png — a LOW RISING sun over a horizon line =====================
    // A half-disc seated on a thick grass band over an earth band; five fat
    // rays fan above it. The store's sun is a full spiky disc with a gem in it;
    // the horizon band is what tells this one apart at 24dp.
    const cv = fresh();
    const sx = c, sy = c + 56, R = 126;
    contactShadow(cv, c + 8, sy + 106, 176, 18, 0.3);
    withOutline(cv, t => {
      // five rays, fat enough (30px root, 18px tip on the 512 supersample) to
      // stay solid bars rather than hairs once the file is 24dp wide
      for (const deg of [-158, -124, -90, -56, -22]) {
        poly(t, wedgePts(sx, sy, (deg * Math.PI) / 180, 136, 210, 30, 18), SUN.hi, 1, SUN.lo);
      }
      poly(t, domePts(sx, sy, R, R, sy + 28), SUN.lite, 1, SUN.mid);
      // the disc's own bevel: a deeper band where it meets the horizon, and a
      // lit crest along the crown
      roundRect(t, sx, sy + 6, R - 8, 22, 12, SUN.lo, 0.42);
      arcStroke(t, sx, sy, R - 14, 14, -Math.PI + 0.5, -0.7, '#FFFBEA', 0.8);
      // horizon: grass band, then earth under it
      roundRect(t, c, sy + 36, 198, 26, 20, GRASS.hi, 1, GRASS.lo);
      capsule(t, c - 172, sy + 18, c + 172, sy + 18, 10, GRASS.lite, 0.8);
      roundRect(t, c, sy + 72, 180, 20, 14, EARTH.hi, 1, EARTH.lo);
    }, CHROME);
    sheen(cv, sx - 54, sy - 78, 28, 16, 0.5);
    save(cv, path.join(OUT, 'sun.png'));
  }

  { // === hourglass.png — wooden-framed hourglass, sand mid-fall ==============
    const cv = fresh();
    contactShadow(cv, c + 8, c + 208, 124, 18, 0.32);
    const glass = [[c - 96, c - 150], [c + 96, c - 150], [c + 12, c - 6], [c + 12, c + 6],
      [c + 96, c + 150], [c - 96, c + 150], [c - 12, c + 6], [c - 12, c - 6]];
    withOutline(cv, t => {
      for (const x of [c - 106, c + 106]) {                          // posts
        capsule(t, x, c - 166, x, c + 166, 30, WOOD.base);
        capsule(t, x - 7, c - 160, x - 7, c + 160, 9, WOOD.rim, 0.7);
        capsule(t, x + 9, c - 160, x + 9, c + 160, 7, WOOD.dark, 0.6);
      }
      poly(t, grow(glass, 7), INK, 0.92);                              // glass keyline
      poly(t, glass, GLASS.hi, 1, GLASS.base);
      poly(t, [[c - 92, c - 146], [c - 44, c - 146], [c - 10, c - 40], [c - 30, c - 40]], '#FFFFFF', 0.45);
      poly(t, [[c - 66, c + 146], [c - 90, c + 146], [c - 40, c + 60], [c - 26, c + 60]], '#FFFFFF', 0.3);
      // sand: a heap above, a stream, a heap below
      poly(t, [[c - 60, c - 56], [c - 30, c - 74], [c + 30, c - 74], [c + 60, c - 56], [c + 9, c - 8], [c - 9, c - 8]], SAND.hi, 1, SAND.lo);
      capsule(t, c, c - 4, c, c + 86, 11, SAND.base);
      poly(t, [[c - 90, c + 150], [c + 90, c + 150], [c + 48, c + 100], [c, c + 70], [c - 48, c + 100]], SAND.hi, 1, SAND.lo);
      for (const y of [c - 176, c + 176]) {                          // turned plates
        roundRect(t, c, y, 130, 20, 10, WOOD.rim, 1, WOOD.dark);
        capsule(t, c - 112, y - 9, c + 112, y - 9, 8, '#F7D8A8', 0.7);
      }
    }, CHROME);
    sheen(cv, c - 60, c - 112, 12, 26, 0.5);
    save(cv, path.join(OUT, 'hourglass.png'));
  }

  { // === book_closed.png — closed forest-green leather book with a clasp =====
    const cv = fresh();
    const bx = c - 6, by = c + 2, HW = 114, HH = 160;
    contactShadow(cv, bx + 14, by + HH + 16, 118, 20, 0.32);
    withOutline(cv, t => {
      // page block, peeking right and below the cover
      roundRect(t, bx + 18, by + 12, HW - 6, HH - 8, 6, PAGE.hi, 1, PAGE.lo);
      roundRect(t, bx + HW + 6, by + 12, 8, HH - 14, 3, PAGE.lo, 0.9);   // the fore-edge
      capsule(t, bx - HW + 30, by + HH + 2, bx + HW + 6, by + HH + 2, 8, PAGE.lo, 0.9);
      // cover
      roundRect(t, bx, by, HW, HH, 12, LEATHER.hi, 1, LEATHER.lo);
      // spine, with four raised bands
      roundRect(t, bx - HW + 18, by, 22, HH, 8, LEATHER.lo, 1, LEATHER.deep);
      for (const dy of [-104, -36, 36, 104]) capsule(t, bx - HW + 2, by + dy, bx - HW + 38, by + dy, 13, LEATHER.hi, 0.6);
      // a blind-embossed panel on the cover (a ring, no boss, no braces)
      roundRect(t, bx + 20, by - 4, 58, 96, 9, LEATHER.deep, 0.6);
      roundRect(t, bx + 20, by - 4, 44, 82, 6, LEATHER.base, 1, LEATHER.lo);
      // the clasp: a strap over the fore-edge with a brass buckle at its end
      // (sized so the buckle is still a visible brass block, not a nub, at 24dp)
      roundRect(t, bx + HW - 6, by + 8, 52, 26, 9, STRAP.hi, 1, STRAP.lo);
      roundRect(t, bx + HW + 38, by + 8, 27, 39, 8, BR.hi, 1, BR.lo);
      ellipse(t, bx + HW + 38, by + 8, 9, 13, STRAP.lo, 0.9, 2);
    }, CHROME);
    sheen(cv, bx - 40, by - 122, 34, 13, 0.45);
    save(cv, path.join(OUT, 'book_closed.png'));
  }

  { // === book_open.png — the SAME book, open, pages visible ==================
    const cv = fresh();
    const by = c + 6;
    contactShadow(cv, c + 10, by + 152, 190, 20, 0.32);
    withOutline(cv, t => {
      openBook(t, c, by, 198, 122, 22, 16, LEATHER, PAGE, { lines: true });
      // the clasp buckle hangs off the right cover's outer edge
      roundRect(t, c + 186, by + 30, 24, 22, 8, STRAP.hi, 1, STRAP.lo);
      roundRect(t, c + 208, by + 30, 22, 34, 8, BR.hi, 1, BR.lo);
      ellipse(t, c + 208, by + 30, 7, 11, STRAP.lo, 0.9, 2);
    }, CHROME);
    sheen(cv, c - 150, by - 96, 34, 12, 0.4);
    save(cv, path.join(OUT, 'book_open.png'));
  }

  { // === season_pass.png — ribboned pass card with a wax seal ================
    // The first draft hung two notched tails straight down from a lumpy,
    // star-stamped seal, which was the rosette of ribbon.png in miniature: at
    // 24dp rows 5 and 9 were twins. The ribbon is now a SASH laid diagonally
    // across the card's lower-right corner, both ends dovetailed just past the
    // card's edges, and the seal is a smooth wax disc with a plain pressed ring
    // sitting where the sash crosses the corner. Card + sash + seal is the
    // silhouette; nothing here has pleats or a star.
    const cv = fresh();
    const kx = c, ky = c - 10, HW = 190, HH = 122;
    contactShadow(cv, kx + 12, ky + HH + 30, 170, 22, 0.3);
    const wx = kx + 118, wy = ky + 58, wr = 54;                     // the seal
    const ux = 0.62, uy = -0.785;                                    // sash direction
    withOutline(cv, t => {
      // the card: plum border, parchment face
      roundRect(t, kx, ky, HW, HH, 18, PLUM.hi, 1, PLUM.lo);
      roundRect(t, kx, ky, HW - 18, HH - 18, 10, PARCH.hi, 1, PARCH.dim);
      capsule(t, kx - HW + 26, ky - HH + 10, kx + HW - 26, ky - HH + 10, 8, '#B4729F', 0.7);
      // two plum title bars on the left half
      roundRect(t, kx - 66, ky - 56, 92, 15, 7, PLUM.base, 1, PLUM.lo);
      roundRect(t, kx - 86, ky - 14, 72, 11, 5, PLUM.base, 0.85, PLUM.lo);
      roundRect(t, kx - 86, ky + 24, 72, 11, 5, PLUM.base, 0.85, PLUM.lo);
      // the sash: two dovetailed halves running out from the seal's centre so
      // each end past the card is a notched ribbon tail
      poly(t, tailPts(wx, wy, wx + ux * 150, wy + uy * 150, 46, 18), RED.hi, 1, RED.base);
      poly(t, tailPts(wx, wy, wx - ux * 156, wy - uy * 156, 46, 18), RED.base, 1, RED.lo);
      capsule(t, wx - ux * 120 - 6, wy - uy * 120 - 8, wx + ux * 120 - 6, wy + uy * 120 - 8, 8, RED.lite, 0.45);
      // the wax seal: a gently lumpy blob, a lit crescent, a plain pressed ring
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.4;
        ellipse(t, wx + Math.cos(a) * (wr - 8), wy + Math.sin(a) * (wr - 8), 13, 13, WAX.base, 1, 3);
      }
      ellipse(t, wx, wy, wr - 5, wr - 5, WAX.base, 1, 3);
      arcStroke(t, wx, wy, wr - 17, 12, 0.5, Math.PI - 0.5, WAX.lo, 0.65);
      arcStroke(t, wx, wy, wr - 17, 11, -Math.PI + 0.6, -0.6, WAX.hi, 0.7);
      arcStroke(t, wx, wy, 24, 12, -Math.PI, Math.PI, WAX.lo, 0.95);
      arcStroke(t, wx - 1, wy - 2, 24, 6, -Math.PI + 0.4, -0.4, WAX.hi, 0.6);
      ellipse(t, wx, wy, 9, 9, WAX.lo, 1, 3);
    }, CHROME);
    sheen(cv, kx - 140, ky - 86, 30, 12, 0.4);
    sheen(cv, wx - 20, wy - 22, 9, 6, 0.5);
    save(cv, path.join(OUT, 'season_pass.png'));
  }

  { // === rules.png — a wooden signpost with ONE arrow ========================
    const cv = fresh();
    const px = c - 30;
    contactShadow(cv, px + 10, c + 196, 96, 16, 0.32);
    withOutline(cv, t => {
      ellipse(t, px, c + 176, 74, 24, EARTH.hi, 1, 3);               // the mound it stands in
      ellipse(t, px, c + 184, 62, 14, EARTH.lo, 0.8, 3);
      capsule(t, px, c - 150, px, c + 172, 46, WOOD.base);            // post
      capsule(t, px - 11, c - 144, px - 11, c + 160, 12, WOOD.rim, 0.75);
      capsule(t, px + 14, c - 144, px + 14, c + 160, 10, WOOD.dark, 0.6);
      ellipse(t, px, c - 160, 30, 12, WOOD.light, 1, 3);              // post cap
      // the arrow board, pointing right, crossing the post
      const board = [[c - 130, c - 118], [c + 104, c - 118], [c + 178, c - 60], [c + 104, c - 2], [c - 130, c - 2]];
      poly(t, grow(board, 7), INK, 0.92);
      poly(t, board, WOOD.rim, 1, WOOD.dark);
      capsule(t, c - 112, c - 106, c + 104, c - 106, 11, '#F7D8A8', 0.75); // lit top edge
      capsule(t, c - 112, c - 14, c + 104, c - 14, 9, WOOD.seam, 0.45);   // bottom shade
      for (const x of [c - 106, c + 78]) {                            // two nail heads
        ellipse(t, x, c - 60, 13, 13, WOOD.seam, 1, 3);
        ellipse(t, x - 3, c - 63, 7, 7, IRON.hi, 0.9, 2);
      }
    }, CHROME);
    sheen(cv, c - 92, c - 96, 22, 8, 0.45);
    save(cv, path.join(OUT, 'rules.png'));
  }

  { // === shop_sign.png — hanging wooden shop sign with a paintbrush ===========
    // Two lessons from the first draft at 24dp. A short rod with two links
    // over a wide plank is the outline of a BRIEFCASE and its handle, so the
    // bracket rod now runs well past the plank on both sides with a ball
    // finial at each end (a rod, not a handle). And a thin tapering stick with
    // a pink tip is a PENCIL, so the brush is now a flat house-painter's brush:
    // a short wine handle, a brass ferrule, and a bristle head WIDER than the
    // handle with a square-cut end dipped in candy-pink paint, hanging off the
    // plank's lower-right corner.
    const cv = fresh();
    const py = c + 34;
    contactShadow(cv, c + 10, py + 132, 160, 18, 0.32);
    // the brush lies along d = (0.80, 0.60) from its butt at (x0, y0)
    const x0 = c - 152, y0 = py - 74, dx = 0.8, dy = 0.6, nx = -0.6, ny = 0.8;
    const P = (tt, s) => [x0 + dx * tt + nx * s, y0 + dy * tt + ny * s];
    withOutline(cv, t => {
      capsule(t, c - 196, c - 166, c + 196, c - 166, 20, IRON.base);     // bracket rod
      capsule(t, c - 190, c - 172, c + 190, c - 172, 6, IRON.hi, 0.7);
      for (const x of [c - 200, c + 200]) {                              // ball finials
        ellipse(t, x, c - 166, 17, 17, IRON.base, 1, 3);
        ellipse(t, x - 4, c - 171, 7, 6, IRON.hi, 0.8, 2);
      }
      for (const x of [c - 134, c + 134]) {                              // two links
        capsule(t, x, c - 160, x, py - 100, 16, IRON.lo);
        capsule(t, x - 4, c - 154, x - 4, py - 104, 5, IRON.hi, 0.6);
      }
      roundRect(t, c, py, 178, 112, 14, WOOD.light, 1, WOOD.dark);       // plank
      roundRect(t, c, py, 160, 94, 10, WOOD.seam, 0.5);                  // border groove
      roundRect(t, c, py, 150, 84, 8, WOOD.light, 1, WOOD.base);
      capsule(t, c - 156, py - 104, c + 156, py - 104, 9, '#F7D8A8', 0.7);
      // the brush: handle, ferrule, bristles, paint
      const hA = P(0, 0), hB = P(150, 0);
      capsule(t, hA[0], hA[1], hB[0], hB[1], 42, INK, 0.92);
      capsule(t, hA[0], hA[1], hB[0], hB[1], 36, RED.base);
      const cA = P(8, -9), cB = P(146, -9);
      capsule(t, cA[0], cA[1], cB[0], cB[1], 10, RED.lite, 0.6);
      const ferrule = [P(146, -30), P(198, -32), P(198, 32), P(146, 30)];
      poly(t, grow(ferrule, 6), INK, 0.92);
      poly(t, ferrule, BR.hi, 1, BR.lo);
      const rA = P(150, -18), rB = P(194, -19);
      capsule(t, rA[0], rA[1], rB[0], rB[1], 9, BR.lite, 0.8);
      const bristle = [P(196, -34), P(292, -38), P(300, -30), P(300, 30), P(292, 38), P(196, 34)];
      poly(t, grow(bristle, 6), INK, 0.92);
      poly(t, bristle, CREAM.hi, 1, CREAM.lo);
      const tip = [P(250, -37), P(292, -38), P(300, -30), P(300, 30), P(292, 38), P(250, 37)];
      poly(t, tip, PINK.hi, 1, PINK.lo);
      const dA = P(300, 12), dB = P(322, 14);                             // a paint drip
      capsule(t, dA[0], dA[1], dB[0], dB[1], 16, PINK.base);
    }, CHROME);
    sheen(cv, c - 132, py - 74, 30, 10, 0.45);
    save(cv, path.join(OUT, 'shop_sign.png'));
  }

  { // === clover.png — a four-leaf clover ======================================
    const cv = fresh();
    const hx = c - 6, hy = c - 14, k = 0.98;
    contactShadow(cv, c + 10, c + 196, 120, 18, 0.3);
    withOutline(cv, t => {
      // stem first, down-right, so the lower leaves sit over its root
      capsule(t, hx + 4, hy + 40, hx + 30, hy + 130, 30, INK, 0.92);
      capsule(t, hx + 30, hy + 130, hx + 44, hy + 188, 30, INK, 0.92);
      capsule(t, hx + 4, hy + 40, hx + 30, hy + 130, 22, CLOVER.lo);
      capsule(t, hx + 30, hy + 130, hx + 44, hy + 188, 22, CLOVER.lo);
      capsule(t, hx - 2, hy + 44, hx + 22, hy + 128, 7, CLOVER.base, 0.7);
      // four heart leaves on the diagonals: the tip of each is at the hub.
      // In `leaf` the heart points along +y local, so angle a rotates that.
      const Q = Math.PI / 4;
      leaf(t, hx, hy, Math.PI + Q, k, CLOVER.lite, CLOVER.hi);        // upper left, lit
      leaf(t, hx, hy, Math.PI - Q, k, CLOVER.hi, CLOVER.base);        // upper right
      leaf(t, hx, hy, Q, k, CLOVER.base, CLOVER.lo);                  // lower right, shaded
      leaf(t, hx, hy, -Q, k, CLOVER.hi, CLOVER.base);                 // lower left
      // seams between the leaves and a dark hub
      // (12px seams: at 24dp anything thinner averages away and the four
      // leaves fuse into one green blob)
      for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        capsule(t, hx, hy, hx + Math.cos(a) * 120, hy + Math.sin(a) * 120, 12, CLOVER.deep, 0.85);
      }
      ellipse(t, hx, hy, 20, 20, CLOVER.deep, 1, 3);
    }, CHROME);
    sheen(cv, hx - 96, hy - 92, 26, 16, 0.5);
    save(cv, path.join(OUT, 'clover.png'));
  }

  { // === ribbon.png — a prize rosette ribbon ==================================
    const cv = fresh();
    const rx = c, ry = c - 44, R = 116;
    contactShadow(cv, c + 10, c + 200, 90, 16, 0.3);
    withOutline(cv, t => {
      poly(t, tailPts(rx - 46, ry + 60, rx - 76, ry + 236, 54, 22), RED.base, 1, RED.lo);
      poly(t, tailPts(rx + 46, ry + 60, rx + 76, ry + 236, 54, 22), RED.hi, 1, RED.lo);
      for (let i = 0; i < 14; i++) {                                   // the pleats
        const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
        const lit = Math.sin(a) < -0.2 ? RED.hi : Math.sin(a) > 0.4 ? RED.lo : RED.base;
        ellipse(t, rx + Math.cos(a) * R, ry + Math.sin(a) * R, 34, 34, lit, 1, 3);
      }
      roundRect(t, rx, ry, R, R, R, RED.hi, 1, RED.lo);
      roundRect(t, rx, ry, 82, 82, 82, CREAM.hi, 1, CREAM.lo);         // cream ring
      roundRect(t, rx, ry, 56, 56, 56, BR.hi, 1, BR.lo);               // brass button
      arcStroke(t, rx, ry, 46, 10, -Math.PI + 0.5, -0.6, BR.lite, 0.8);
      poly(t, starPts(rx, ry + 2, 30, 13), BR.deep, 0.75);
      poly(t, starPts(rx - 2, ry - 1, 26, 11), BR.lite, 1);
    }, CHROME);
    sheen(cv, rx - 44, ry - 44, 12, 10, 0.5);
    sheen(cv, rx - 84, ry - 84, 16, 12, 0.4);
    save(cv, path.join(OUT, 'ribbon.png'));
  }

  { // === spots/empty_ledger.png — open blank ledger, quill, inkpot ============
    const cv = fresh();
    const by = c + 8;
    contactShadow(cv, c + 12, by + 150, 210, 20, 0.32);
    contactShadow(cv, c - 138, c + 176, 56, 12, 0.3);
    withOutline(cv, t => {
      openBook(t, c, by, 214, 124, 24, 16, LEDGER, PAGE, { rules: true });
      // the quill across the right page: shaft from nib (near the gutter) up
      // and right to the tip; the vane hangs off the upper-left side of it
      const nx0 = c + 34, ny0 = by + 92, tx1 = c + 200, ty1 = by - 160;
      const L = Math.hypot(tx1 - nx0, ty1 - ny0), ux = (tx1 - nx0) / L, uy = (ty1 - ny0) / L;
      const px = -uy, py = ux;                                          // left-hand normal
      const Q = (tt, s) => [nx0 + ux * tt + px * s, ny0 + uy * tt + py * s];
      const vane = [Q(58, 0), Q(90, -30), Q(150, -46), Q(215, -40), Q(L, -4), Q(L, 4), Q(228, 10), Q(150, 20), Q(100, 14), Q(70, 4)];
      poly(t, grow(vane, 7), INK, 0.92);
      poly(t, vane, FEATHER.hi, 1, FEATHER.lo);
      const s0 = Q(0, 0), s1 = Q(L - 8, 0);
      capsule(t, s0[0], s0[1], s1[0], s1[1], 9, FEATHER.shaft, 0.9);    // the rachis
      const nA = Q(-2, 0), nB = Q(46, 0);
      capsule(t, nA[0], nA[1], nB[0], nB[1], 20, INK, 0.92);
      capsule(t, nA[0], nA[1], nB[0], nB[1], 14, BR.hi);               // brass nib
      capsule(t, nA[0], nA[1], nA[0], nA[1], 15, INK, 0.95);
      capsule(t, nA[0], nA[1], nA[0], nA[1], 9, BR.deep);              // its tip
      // the inkpot in front of the lower-left corner
      const ix = c - 150, iy = c + 112;
      roundRect(t, ix, iy + 8, 46, 38, 16, INKP.hi, 1, INKP.lo);       // glass body
      roundRect(t, ix, iy - 34, 30, 12, 5, BR.hi, 1, BR.lo);           // brass collar
      roundRect(t, ix, iy - 50, 24, 10, 5, INKP.rim, 1, INKP.lo);      // cap
      roundRect(t, ix - 22, iy + 6, 8, 24, 4, INKP.gloss, 0.55);       // glass gloss
      capsule(t, ix - 34, iy + 34, ix + 34, iy + 34, 8, INKP.lo, 0.8);
    }, SPOT);
    sheen(cv, c - 172, by - 94, 36, 12, 0.4);
    sheen(cv, c - 162, c + 96, 8, 12, 0.5);
    save(cv, path.join(SPOTS, 'empty_ledger.png'));
  }

  { // === spots/empty_gallery.png — empty frame on a nail, one small moth ======
    const cv = fresh();
    const fy = c + 26, HW = 176, HH = 148;
    contactShadow(cv, c + 14, fy + HH + 18, 160, 18, 0.32);
    withOutline(cv, t => {
      // the nail and the picture wire
      ellipse(t, c, c - 196, 17, 13, IRON.hi, 1, 3);
      ellipse(t, c + 3, c - 193, 9, 6, IRON.lo, 0.8, 2);
      for (const sgn of [-1, 1]) {
        capsule(t, c + sgn * 140, fy - HH + 6, c, c - 192, 13, INK, 0.92);
        capsule(t, c + sgn * 140, fy - HH + 6, c, c - 192, 7, IRON.base);
      }
      // the frame: gilt outer, a carved inner step, the wall showing through
      roundRect(t, c, fy, HW, HH, 12, GILT.hi, 1, GILT.lo);
      capsule(t, c - HW + 18, fy - HH + 9, c + HW - 18, fy - HH + 9, 10, GILT.lite, 0.8);
      capsule(t, c - HW + 18, fy + HH - 9, c + HW - 18, fy + HH - 9, 10, GILT.deep, 0.6);
      roundRect(t, c, fy, HW - 22, HH - 22, 6, GILT.deep, 0.75);
      roundRect(t, c, fy, HW - 30, HH - 30, 4, GILT.base, 1, GILT.lo);
      roundRect(t, c, fy, HW - 44, HH - 44, 3, WALLP.hi, 1, WALLP.lo);
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {   // corner rosettes
        ellipse(t, c + sx * (HW - 20), fy + sy * (HH - 20), 17, 17, GILT.lite, 1, 3);
        ellipse(t, c + sx * (HW - 20) + 3, fy + sy * (HH - 20) + 3, 9, 9, GILT.lo, 0.8, 2);
      }
      // one small moth perched on the top rail, right of centre
      moth(t, c + 92, fy - HH + 2, -0.18, 0.72);
    }, SPOT);
    sheen(cv, c - 132, fy - 118, 30, 10, 0.4);
    save(cv, path.join(SPOTS, 'empty_gallery.png'));
  }
}

// Allow `node scripts/tools/gameIcons/chromeSpots.mjs` for a solo render.
if (process.argv[1] && process.argv[1].endsWith('chromeSpots.mjs')) draw();
