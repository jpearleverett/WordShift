/**
 * gameIcons/spotsB.mjs — SCENE SPOTS, round 2 (5 icons, 256px, assets/ui/spots/).
 *
 * Five stand-alone illustrations that sit behind a moment rather than beside a
 * row: the house-completion crest, the loading overlay, the Phase-5 Tending
 * Shrine, the crash card and the in-game alert card. They render at 56-96dp,
 * which is roomier than any row icon in the game, but a spot is still read in
 * a glance under a line of text, so every one of them obeys the row doctrine:
 * ONE anchored object, a thick INK contour (withOutline), two or three big value
 * steps, top-left light, one sheen, a contact shadow laid down BEFORE the
 * contour so it is never outlined. All coordinates are literals in the 512x512
 * supersample (c = 256); each file is downsampled 2x to 256px.
 *
 *   house_whole.png  the FINISHED cottage. It is a house first: a steep red
 *                    chevron roof with a stone chimney rising out of the right
 *                    slope, a round attic window in the gable, two lit windows
 *                    flanking a plank door, all glowing the same warm gold. The
 *                    laurel garland is a single sage swag hung across the wall
 *                    face under the eaves, drawn as a thick rope of leaves so
 *                    it survives 56dp as a green band and never competes with
 *                    the roof for the silhouette. It is deliberately NOT the
 *                    shipped home.png drawing (a pink box with a purple door):
 *                    same concept, different building, and the two never meet.
 *   gathering.png    a copper kettle hanging from an iron J-hook by its bail,
 *                    over a small flame that licks its base. The bail arcing
 *                    OVER the lid is what keeps it from twinning with the shop's
 *                    copper pot (side loop handle, no fire). The spout has an
 *                    open mouth, the lesson the kitchen pot taught: a spout with
 *                    no opening reads as a second broken handle.
 *   shrine.png       the only serene piece: a mauve stone alcove with a lit
 *                    sill holding a footed terracotta bowl lamp, and beside it
 *                    a BIG brass ring hung from a stubby peg with a cream cord
 *                    looped once through it, falling as two legs to the sill.
 *                    Round 1 drew the ring at 27px and the thread at 3px, and at
 *                    56dp the whole tending/weave motif collapsed to a yellow
 *                    speck; the ring is now ~17% of the frame with its own INK
 *                    keyline and the cord is 16px on the supersample, contoured
 *                    like a real object. The lamp reads as a CLAY LAMP rather
 *                    than a candle in a dish because its rim carries a pinched
 *                    spout on the left and the ONE big flame stands at that
 *                    spout, with the bowl body a full value step darker than
 *                    its rim. The recess is lit from BELOW by the lamp (dark at
 *                    the crown, warm at the floor), so the niche reads as
 *                    holding light rather than as a hole punched in the wall.
 *   spilled_ink.png  ONE anchor: a squat round-shouldered glass inkpot, ~45%
 *                    of the frame, knocked onto its shoulder with the mouth
 *                    toward the lower right, a wide brass collar still on the
 *                    neck, its ink visible INSIDE the glass settled to a level
 *                    line (that level is what says "bottle", not "tile"), one
 *                    glossy tongue pouring from the mouth into a compact pool
 *                    under and right of it, and a candy letter tile at about
 *                    half the pot's size leaning on the pot's shoulder with its
 *                    foot sunk in the pool's edge, split corner to corner by
 *                    ONE bold crack and missing one corner. Round 1 had a
 *                    labelled block beside a same-sized tile on a cobalt slab
 *                    across the whole base and the reviewer saw two dice on a
 *                    cushion; the ink is now indigo-black, the pool is a pool,
 *                    and the pot is the thing the eye lands on. The pool keeps
 *                    a lit rim and one sheen streak so it survives ash paper,
 *                    which is nearly its own value.
 *   notice.png       a parchment sheet with a real crease across its middle,
 *                    the lower flap pivoted a few degrees so the silhouette
 *                    kinks and the fold is visible in outline alone, a curled
 *                    corner showing a darker underside, three FAT ink strokes
 *                    standing in for writing (no hatching, nothing under 1/12
 *                    of the frame), pinned by a brass dome tack whose shadow
 *                    falls on the paper. The sheet is deliberately one full
 *                    value step BELOW the cream parchment it is delivered on
 *                    (the alert card's own fill): round 1 painted it parchment
 *                    on parchment and it survived only as an outline. The one
 *                    light line is the crease highlight. It is also the family's
 *                    smallest silhouette, so it fills ~70% of the frame.
 *
 * Palette: warm cottage throughout (parchment wall, red roof, copper, brass,
 * candy pink) except the shrine, which is the game's Terrible-Peace mauve. Every
 * glow (window spill, kettle firelight, lamp light) is a warm WHITE above cream
 * in all three channels, so on a parchment ground it can only lighten.
 * No Math.random anywhere: byte-reproducible.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  savePNG, down2, contactShadow, sheen, withOutline,
  INK, WOOD, BRASS, STONE,
  C, ellipse, roundRect, poly, capsule, arcStroke, flameLobe,
} from '../shopIcons/_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui/spots');

/** 256px spots draw on a 512 supersample; c is the centre. */
const S = 512, c = 256, OW = 256;
/** Contour width: the 192px set uses 9 at 384, so 12 at 512 is the same weight. */
const CONTOUR = 12;
const fresh = () => C(S, S);
const save = (cv, name) => savePNG(path.join(OUT, name), OW, OW, down2(cv, OW, OW));

// --- local palettes ---------------------------------------------------------
const ROOF = { hi: '#F0806E', base: '#D9463F', lo: '#8A2226', lit: '#FFB8A8' };
const WALL = { hi: '#FCF2DC', base: '#F1DDB6', lo: '#CBA774' };
const WIN = { hi: '#FFF4C6', base: '#FFD25A', lo: '#EE9526', bar: '#B0702A' };
const LAUREL = { hi: '#A3CD6E', base: '#6E9A4B', lo: '#3D6226' };
const COPPER = { hi: '#FBD09B', base: '#E08C42', mid: '#A85526', lo: '#6E2E0C' };
const IRON = { hi: '#A9ACB6', base: '#5F626C', lo: '#33353C' };
const FIRE = { out: '#D8531C', mid: '#FF8E2A', in: '#FFC64E', core: '#FFF2C4' };
const MAUVE = { hi: '#EEE3F2', up: '#CDBAD8', base: '#A48FB4', lo: '#6F5A80', deep: '#4B3858' };
const RECESS = { top: '#3A2B48', bot: '#6C5070', lit: '#8F6C86' };
const CLAY = { hi: '#EBB98D', base: '#C8865A', lo: '#7F4A2C' };
const PEACE_FIRE = { out: '#E8944A', mid: '#FFBE5E', in: '#FFE1A0', core: '#FFF9E8' };
const THREAD = { hi: '#FFF8EA', base: '#EFDFC0', lo: '#B89C6C' };
const GLASS = { hi: '#E6EFF6', base: '#A9BFCF', lo: '#5E7889' };
const INKP = { rim: '#5E56A0', hi: '#332C5E', base: '#2B2550', lo: '#1A1533', gloss: '#8C84C8' };
const TILE = { hi: '#FF9EC2', base: '#F25E8E', lo: '#B02A5B', ink: '#FFF4F8' };
const PAPER = { hi: '#E6CB92', base: '#D6B47A', flapHi: '#D2AE72', flapLo: '#C79C60', backHi: '#B08A52', backLo: '#96703C', crease: '#A07E48', light: '#F6E6C4', script: '#5A3A22' };

// --- local shape helpers (pure, table-driven) --------------------------------

/** A rotation about (cx, cy): returns a mapper from local (lx, ly) to canvas. */
const rot = (cx, cy, a) => {
  const ca = Math.cos(a), sa = Math.sin(a);
  return (lx, ly) => [cx + lx * ca - ly * sa, cy + lx * sa + ly * ca];
};

/** A chamfered rectangle in a rotated local frame, as points for `poly`. */
function rectPtsL(R, lcx, lcy, hw, hh, ch = 0) {
  return [
    [lcx - hw + ch, lcy - hh], [lcx + hw - ch, lcy - hh], [lcx + hw, lcy - hh + ch],
    [lcx + hw, lcy + hh - ch], [lcx + hw - ch, lcy + hh], [lcx - hw + ch, lcy + hh],
    [lcx - hw, lcy + hh - ch], [lcx - hw, lcy - hh + ch],
  ].map(([x, y]) => R(x, y));
}

/** A ROUND-cornered rectangle in a rotated local frame (chamfers read as a gem). */
function roundPtsL(R, lcx, lcy, hw, hh, rad, n = 7) {
  const pts = [];
  const corners = [[1, -1, -Math.PI / 2], [1, 1, 0], [-1, 1, Math.PI / 2], [-1, -1, Math.PI]];
  for (const [sx, sy, a0] of corners) {
    const cx = lcx + sx * (hw - rad), cy = lcy + sy * (hh - rad);
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push(R(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad));
    }
  }
  return pts;
}

/** A rotated oval as points (an axis-aligned `ellipse` cannot sit across a diagonal). */
function ovalPts(cx, cy, ra, rb, a, n = 28) {
  const ca = Math.cos(a), sa = Math.sin(a);
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2, u = Math.cos(t) * ra, v = Math.sin(t) * rb;
    return [cx + u * ca - v * sa, cy + u * sa + v * ca];
  });
}

/** Upper half of an ellipse as a closed polygon (a dome, a lid). */
function domePts(cx, cy, rx, ry, n = 26) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

/** A rectangle with a semicircular top of radius hw (an arch / a niche). */
function archPts(cx, top, hw, bottom, n = 30) {
  const cy = top + hw;
  const pts = [[cx - hw, bottom]];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    pts.push([cx + Math.cos(a) * hw, cy + Math.sin(a) * hw]);
  }
  pts.push([cx + hw, bottom]);
  return pts;
}

/** Keep the part of a polygon at or below the horizontal line y0 (a liquid level). */
function clipBelow(pts, y0) {
  const out = [];
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j], [bx, by] = pts[i];
    const aIn = ay >= y0, bIn = by >= y0;
    if (aIn !== bIn) out.push([ax + ((y0 - ay) / (by - ay)) * (bx - ax), y0]);
    if (bIn) out.push([bx, by]);
  }
  return out;
}

/** A chain of capsules through `pts`: the only way to draw a real stroke here. */
function polyline(cv, pts, th, color, alpha = 1) {
  for (let i = 1; i < pts.length; i++) capsule(cv, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], th, color, alpha);
}

/** A pointed oval leaf centred at (x,y), long axis along `ang`. */
function leafPts(x, y, len, wid, ang) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const local = [
    [-len, 0], [-len * 0.45, -wid * 0.78], [0, -wid], [len * 0.55, -wid * 0.66], [len, 0],
    [len * 0.55, wid * 0.66], [0, wid], [-len * 0.45, wid * 0.78],
  ];
  return local.map(([lx, ly]) => [x + lx * ca - ly * sa, y + lx * sa + ly * ca]);
}

/** Ink-keylined, top-lit leaf. */
function leaf(cv, x, y, len, wid, ang, pal) {
  poly(cv, leafPts(x, y, len + 6, wid + 6, ang), INK, 0.95);
  poly(cv, leafPts(x, y, len, wid, ang), pal.hi, 1, pal.lo);
}

/**
 * A four-step flame with its own INK lobe behind it, so it keeps a keyline
 * where it crosses another form (a kettle base, a lamp spout).
 */
function fire(cv, cx, top, bot, r, pal = FIRE) {
  const h = bot - top;
  flameLobe(cv, cx + 2, top - 7, bot + 4, r + 6, INK, 0.92);
  flameLobe(cv, cx + 2, top, bot, r, pal.out);
  flameLobe(cv, cx, top + h * 0.22, bot - 2, r * 0.72, pal.mid);
  flameLobe(cv, cx - 2, top + h * 0.45, bot - 4, r * 0.48, pal.in);
  flameLobe(cv, cx - 3, top + h * 0.66, bot - 6, r * 0.24, pal.core);
}

/** A lit cottage window: INK frame, gold glass top-lit, a cross of muntins. */
function litWindow(cv, x, y, hw, hh, rad) {
  roundRect(cv, x, y, hw + 7, hh + 7, rad + 4, INK, 0.95);
  roundRect(cv, x, y, hw, hh, rad, WIN.hi, 1, WIN.lo);
  capsule(cv, x, y - hh + 3, x, y + hh - 3, 7, WIN.bar, 0.85);
  capsule(cv, x - hw + 3, y, x + hw - 3, y, 7, WIN.bar, 0.85);
}

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });

  { // === house_whole.png — the finished cottage, every window lit ============
    const cv = fresh();
    contactShadow(cv, c + 8, 458, 196, 22, 0.32);
    // window light spilling onto the ground: warm white, above cream in every
    // channel, drawn on the real canvas so it is never contoured
    ellipse(cv, c, 350, 214, 126, '#FFF8E4', 0.24, 70);
    withOutline(cv, t => {
      // chimney first: the roof slope will clip its foot, which seats it
      roundRect(t, 356, 134, 24, 62, 4, STONE.hi, 1, STONE.lo);
      capsule(t, 343, 92, 343, 176, 9, '#E2DCCC', 0.55);           // lit left face
      roundRect(t, 356, 78, 33, 11, 4, STONE.base, 1, STONE.lo);    // cap
      // gable + wall (one warm parchment mass)
      poly(t, [[c, 84], [438, 246], [74, 246]], WALL.hi, 1, WALL.base);
      roundRect(t, c, 344, 168, 104, 8, WALL.hi, 1, WALL.lo);       // 240..448
      roundRect(t, c, 252, 164, 12, 4, WALL.lo, 0.5);               // eave shade
      // the roof: a thick red chevron, apex light, eaves dark
      poly(t, [[c, 48], [470, 254], [470, 276], [448, 276], [c, 88], [64, 276], [42, 276], [42, 254]], ROOF.hi, 1, ROOF.lo);
      capsule(t, 238, 74, 72, 232, 12, ROOF.lit, 0.55);            // lit left slope
      capsule(t, 276, 78, 444, 240, 12, ROOF.lo, 0.45);            // shaded right slope
      capsule(t, c, 52, c, 66, 18, ROOF.hi);                        // ridge cap
      // round attic window in the gable
      ellipse(t, c, 178, 35, 35, INK, 0.95, 3);
      roundRect(t, c, 178, 28, 28, 28, WIN.hi, 1, WIN.lo);
      capsule(t, c, 154, c, 202, 6, WIN.bar, 0.85);
      capsule(t, c - 24, 178, c + 24, 178, 6, WIN.bar, 0.85);
      // two lower windows with sills
      for (const x of [152, 360]) {
        litWindow(t, x, 348, 40, 44, 6);
        roundRect(t, x, 399, 52, 6, 3, WALL.lo, 1, '#A88650');
      }
      // plank door with a brass knob
      roundRect(t, c, 396, 42, 56, 20, INK, 0.95);
      roundRect(t, c, 396, 36, 52, 16, WOOD.light, 1, WOOD.dark);
      for (const dx of [-12, 12]) capsule(t, c + dx, 356, c + dx, 442, 5, WOOD.seam, 0.5);
      ellipse(t, c + 22, 402, 10, 10, INK, 0.9, 2);
      ellipse(t, c + 22, 402, 7, 7, BRASS.hi);
      // the laurel garland: one swag of leaves on a rope, hung under the eaves
      const swagY = x => 266 + 42 * (1 - ((x - c) / 160) ** 2);
      const rope = [];
      for (let i = 0; i <= 12; i++) { const x = 96 + (i * 320) / 12; rope.push([x, swagY(x)]); }
      polyline(t, rope, 17, LAUREL.lo);
      for (let i = 0; i <= 11; i++) {
        const x = 104 + (i * 304) / 11, y = swagY(x);
        const tan = Math.atan2(swagY(x + 4) - swagY(x - 4), 8);
        const side = i % 2 ? 1 : -1;
        leaf(t, x, y + side * 6, 22, 11, tan + side * 0.55, LAUREL);
      }
      for (const x of [96, 416]) { ellipse(t, x, swagY(x), 11, 11, INK, 0.9, 2); ellipse(t, x, swagY(x), 8, 8, ROOF.base); }
    }, { width: CONTOUR });
    sheen(cv, 168, 152, 24, 12, 0.42);
    sheen(cv, c - 10, 168, 8, 6, 0.55);
    save(cv, 'house_whole.png');
  }

  { // === gathering.png — a copper kettle on a hook over a small flame ========
    const cv = fresh();
    contactShadow(cv, c + 8, 468, 118, 16, 0.3);
    ellipse(cv, c, 408, 134, 92, '#FFF3D2', 0.3, 56);                 // firelight, uncontoured
    withOutline(cv, t => {
      // the iron J-hook it hangs from
      capsule(t, c, 40, c, 74, 16, IRON.base);
      capsule(t, c - 4, 44, c - 4, 72, 6, IRON.hi, 0.55);
      arcStroke(t, c, 84, 24, 16, -Math.PI / 2, Math.PI * 1.02, IRON.base);
      arcStroke(t, c, 84, 24, 6, -Math.PI * 0.4, Math.PI * 0.4, IRON.hi, 0.55);
      // body: top-lit copper, a belly band, a dark foot
      roundRect(t, c, 262, 118, 86, 58, COPPER.hi, 1, COPPER.lo);
      capsule(t, c - 104, 284, c + 104, 284, 26, COPPER.mid, 0.4);
      capsule(t, c - 94, 330, c + 94, 330, 14, COPPER.lo, 0.35);
      // spout, left: two tapering segments ending in an OPEN mouth
      capsule(t, c - 96, 250, c - 146, 202, 44, COPPER.base);
      capsule(t, c - 144, 204, c - 172, 166, 30, COPPER.base);
      capsule(t, c - 150, 194, c - 172, 164, 12, COPPER.hi, 0.6);
      const sa = Math.atan2(166 - 204, -172 + 144);
      poly(t, ovalPts(c - 177, 160, 13, 24, sa), COPPER.hi, 1, COPPER.mid);
      poly(t, ovalPts(c - 178, 159, 7, 17, sa), COPPER.lo);
      // lid: rim plate, dome, knob
      roundRect(t, c, 180, 100, 9, 5, COPPER.hi, 1, COPPER.mid);
      poly(t, domePts(c, 174, 86, 40), COPPER.hi, 1, COPPER.mid);
      arcStroke(t, c, 174, 60, 12, Math.PI * 1.16, Math.PI * 1.6, '#FFE6C4', 0.55);
      capsule(t, c, 120, c, 142, 22, COPPER.mid);
      ellipse(t, c, 114, 22, 18, COPPER.hi);
      ellipse(t, c + 6, 120, 12, 9, COPPER.mid, 0.6);
      // the bail, arcing OVER the lid from lug to lug, up to the hook
      arcStroke(t, c, 224, 118, 16, Math.PI, Math.PI * 2, IRON.base);
      arcStroke(t, c - 3, 222, 118, 6, Math.PI * 1.08, Math.PI * 1.55, IRON.hi, 0.55);
      for (const x of [c - 112, c + 112]) { ellipse(t, x, 226, 14, 14, IRON.lo); ellipse(t, x - 3, 223, 7, 6, IRON.hi, 0.6); }
      // the small fire licking the base
      ellipse(t, c, 452, 62, 12, '#5E1E05');
      ellipse(t, c, 450, 50, 9, '#9C4A04');
      fire(t, c, 352, 452, 46);
    }, { width: CONTOUR });
    sheen(cv, c - 58, 228, 22, 36, 0.5);
    sheen(cv, c - 36, 150, 18, 9, 0.45);
    save(cv, 'gathering.png');
  }

  { // === shrine.png — a mauve stone niche, a lit clay lamp, a ring and cord ==
    const cv = fresh();
    contactShadow(cv, c + 8, 462, 178, 18, 0.3);
    ellipse(cv, 196, 336, 124, 104, '#FFF6E6', 0.3, 60);              // lamp light, uncontoured
    withOutline(cv, t => {
      // the arch: outer stone, a stepped inner band, then the recess
      poly(t, archPts(c, 56, 156, 440), MAUVE.hi, 1, MAUVE.lo);
      poly(t, archPts(c, 78, 134, 440), MAUVE.up, 1, MAUVE.base);
      poly(t, archPts(c, 108, 110, 404), RECESS.top, 1, RECESS.bot);
      ellipse(t, 214, 366, 104, 46, RECESS.lit, 0.7, 24);             // lamp light on the back wall
      // the sill
      roundRect(t, c, 420, 172, 22, 5, MAUVE.up, 1, MAUVE.deep);
      capsule(t, c - 160, 402, c + 160, 402, 6, MAUVE.hi, 0.7);
      // a stubby peg, and the BIG brass ring hung from it. Round 1's ring was a
      // 27px hoop on a 4px thread and it was a yellow speck at 56dp; the ring
      // is now ~17% of the frame with its own INK keyline on both edges.
      const rx = 334, ry = 298, RO = 42, RT = 16;
      capsule(t, rx, 232, rx, 262, 24, INK, 0.95);
      capsule(t, rx, 234, rx, 260, 16, MAUVE.deep);
      capsule(t, rx - 3, 236, rx - 3, 258, 6, MAUVE.up, 0.6);
      arcStroke(t, rx, ry, RO - RT / 2, RT + 8, 0, Math.PI * 2, INK, 0.95);
      arcStroke(t, rx, ry, RO - RT / 2, RT, 0, Math.PI * 2, BRASS.lo);
      arcStroke(t, rx, ry, RO - RT / 2, RT - 6, Math.PI * 1.05, Math.PI * 1.75, BRASS.hi, 0.9);
      // the cream cord: looped once through the hole, over the ring's bottom
      // bar, then two legs that bow OUTWARD and come back together in a fat
      // knot resting on the sill. Straight legs splayed from a hub read as a
      // drafting compass at 48px; a bowed loop closing in a knot reads as
      // cord. 16px wide with an INK keyline so it stays a cord where it
      // crosses the ring and the recess.
      const loop = [[322, 304], [323, 290], [330, 283], [340, 283], [347, 290], [348, 304]];
      const legL = [[322, 304], [312, 330], [306, 356], [312, 380], [328, 398]];
      const legR = [[348, 304], [360, 330], [366, 356], [358, 380], [342, 398]];
      for (const run of [loop, legL, legR]) polyline(t, run, 24, INK, 0.95);
      for (const run of [loop, legL, legR]) polyline(t, run, 16, THREAD.base);
      for (const run of [loop, legL, legR]) polyline(t, run.map(([x, y]) => [x - 2, y - 2]), 6, THREAD.hi, 0.7);
      ellipse(t, 335, 400, 17, 13, INK, 0.95, 3);                       // the knot on the sill
      ellipse(t, 335, 400, 13, 10, THREAD.lo);
      ellipse(t, 332, 397, 8, 5, THREAD.base);
      // the clay lamp: a footed bowl whose BODY is a full step darker than its
      // rim, a pinched SPOUT nosing out of the rim to the left, a dark well of
      // oil, and ONE big flame standing at the spout's tip. The spout is what
      // separates a clay lamp from a candle in a dish at 56dp, and the flame
      // must stand ON it, not beside the bowl.
      const lx = 246;
      roundRect(t, lx, 396, 40, 10, 4, CLAY.base, 1, CLAY.lo);          // foot
      const bowl = [];
      for (let i = 0; i <= 26; i++) { const a = (i / 26) * Math.PI; bowl.push([lx + Math.cos(a) * 58, 350 + Math.sin(a) * 44]); }
      poly(t, bowl, CLAY.base, 1, CLAY.lo);                             // the body, darker
      // the spout: a heavy nose with an INK keyline where it leaves the rim,
      // its lit top face a step lighter than its underside; the flame stands
      // ON its top surface so lamp and flame are one connected mass
      poly(t, [[lx - 30, 334], [lx - 84, 336], [lx - 104, 350], [lx - 84, 368], [lx - 30, 372]], INK, 0.95);
      poly(t, [[lx - 34, 340], [lx - 82, 342], [lx - 96, 351], [lx - 82, 362], [lx - 34, 366]], CLAY.base, 1, CLAY.lo);
      poly(t, [[lx - 34, 340], [lx - 82, 342], [lx - 96, 351], [lx - 60, 352], [lx - 34, 350]], CLAY.hi);
      ellipse(t, lx, 350, 58, 16, CLAY.hi);                             // the rim's top face
      ellipse(t, lx, 350, 48, 10, '#4A2814');                           // the well of oil
      ellipse(t, lx - 14, 348, 16, 4, '#7C4A2A', 0.8);
      fire(t, lx - 78, 222, 346, 30, PEACE_FIRE);
    }, { width: CONTOUR });
    sheen(cv, 172, 148, 22, 30, 0.42);
    sheen(cv, 214, 368, 12, 16, 0.45);
    sheen(cv, 318, 274, 7, 6, 0.6);
    save(cv, 'shrine.png');
  }

  { // === spilled_ink.png — a tipped inkpot pouring, a cracked tile at the pool =
    const cv = fresh();
    const ang = 0.7, bx = 190, by = 228;                                // the pot's centre, tilt
    const R = rot(bx, by, ang);                                         // local +x runs base -> mouth
    const T = rot(386, 316, -0.22);                                     // the tile, leaning on the pot
    // one shadow for pot and pool together
    contactShadow(cv, 290, 442, 184, 20, 0.3);
    withOutline(cv, t => {
      // THE TILE first, so the pot's shoulder and the pool overlap it: candy
      // bevel, lighter face, a bold cream A, one corner chipped away, and ONE
      // jagged INK crack corner to corner (12px on the supersample)
      const hw = 62, ch = 14;
      const tileOuter = [
        [-hw + ch, -hw], [hw - 32, -hw], [hw - 20, -hw + 12], [hw, -hw + 30],  // chipped top-right corner
        [hw, hw - ch], [hw - ch, hw], [-hw + ch, hw], [-hw, hw - ch], [-hw, -hw + ch],
      ].map(p => T(...p));
      poly(t, tileOuter, TILE.base, 1, TILE.lo);
      const fw = 50, fr = 10;
      const tileFace = [
        [-fw + fr, -fw - 4], [fw - 30, -fw - 4], [fw - 18, -fw + 8], [fw, -fw + 22],
        [fw, fw - 4 - fr], [fw - fr, fw - 4], [-fw + fr, fw - 4], [-fw, fw - 4 - fr], [-fw, -fw - 4 + fr],
      ].map(p => T(...p));
      poly(t, tileFace, TILE.hi, 1, TILE.base);
      const A = [[[-30, 32], [-8, -30]], [[14, 32], [-8, -30]], [[-20, 8], [4, 8]]];
      for (const [[x1, y1], [x2, y2]] of A) capsule(t, ...T(x1 + 2, y1 + 3), ...T(x2 + 2, y2 + 3), 15, TILE.lo, 0.5);
      for (const [[x1, y1], [x2, y2]] of A) capsule(t, ...T(x1, y1), ...T(x2, y2), 15, TILE.ink);
      const crack = [[-hw, -hw + 8], [-30, -24], [-6, -30], [2, 4], [28, 14], [30, 44], [hw - 6, hw]].map(p => T(...p));
      polyline(t, crack, 12, INK, 0.95);
      polyline(t, crack.map(([x, y]) => [x + 4, y]), 3, '#FFFFFF', 0.3);
      // THE POT: squat round-shouldered glass, dark under its belly (the poly
      // gradient runs in canvas space, so the lit side is whichever faces up)
      const body = roundPtsL(R, 0, 0, 80, 98, 44);
      poly(t, body, GLASS.hi, 1, GLASS.lo);
      // the ink INSIDE the glass, settled to a level line: this is what makes
      // it a bottle of ink and not a blue block
      const inner = roundPtsL(R, 0, 0, 68, 86, 36);
      const level = by + 2;
      const ink = clipBelow(inner, level);
      poly(t, ink, INKP.base, 1, INKP.lo);
      const surf = ink.filter(([, y]) => y === level);
      if (surf.length >= 2) {
        const xs = surf.map(p => p[0]);
        capsule(t, Math.min(...xs) + 2, level, Math.max(...xs) - 2, level, 7, INKP.rim, 0.9);
      }
      capsule(t, ...R(-60, -82), ...R(34, -88), 9, '#FFFFFF', 0.4);     // glass reflection along the top edge
      // neck (glass, with ink in it), a wide brass collar, the open mouth
      poly(t, rectPtsL(R, 92, 0, 16, 46, 4), GLASS.base, 1, GLASS.lo);
      poly(t, rectPtsL(R, 92, 0, 16, 34, 3), INKP.base, 1, INKP.lo);
      poly(t, rectPtsL(R, 116, 0, 14, 52, 6), BRASS.hi, 1, BRASS.lo);
      capsule(t, ...R(110, -48), ...R(110, 48), 5, '#FFF0C4', 0.5);
      poly(t, ovalPts(...R(130, 0), 8, 44, ang), INKP.lo);
      // the pour: one glossy tongue from the mouth into the pool
      const [mx, my] = R(128, 0);
      capsule(t, mx, my, mx + 22, my + 56, 30, INKP.base);
      capsule(t, mx - 4, my + 2, mx + 14, my + 44, 8, INKP.gloss, 0.45);
      // the pool: compact, under and right of the mouth only, with a lit rim
      // so it still has an edge on ash paper
      const pool = [], bump = [1, 0.94, 1.04, 0.92, 1.05, 0.96, 1.02, 0.9, 1, 0.94, 1.05, 0.92, 1.03, 0.97, 0.93, 1];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        pool.push([mx + 44 + Math.cos(a) * 102 * bump[i], my + 78 + Math.sin(a) * 27 * bump[i]]);
      }
      poly(t, pool, INKP.hi, 1, INKP.lo);
      capsule(t, mx - 42, my + 62, mx + 36, my + 55, 8, INKP.rim, 0.8);
      capsule(t, mx - 26, my + 66, mx + 6, my + 64, 7, INKP.gloss, 0.5);
    }, { width: CONTOUR });
    sheen(cv, ...R(-58, -24), 16, 26, 0.5);                             // the pot's upper-left shoulder
    sheen(cv, ...T(-30, -36), 12, 8, 0.5);
    sheen(cv, R(128, 0)[0] - 22, R(128, 0)[1] + 65, 12, 4, 0.5);
    save(cv, 'spilled_ink.png');
  }

  { // === notice.png — a creased parchment note pinned by a brass tack =========
    const cv = fresh();
    const ang = -0.1, hw = 158, hh = 172;
    const P = rot(c, 256, ang);                                         // the sheet's frame
    const [kx, ky] = P(0, 0);
    const B = rot(kx, ky, ang + 0.09);                                  // the lower flap, pivoted at the crease
    const sheet = [P(-hw, -hh), P(hw, -hh), P(hw, 0), B(hw, hh), B(-hw, hh), P(-hw, 0)];
    // a pinned sheet casts onto the wall behind it: an offset copy of its own shape
    poly(cv, sheet.map(([x, y]) => [x + 12, y + 14]), INK, 0.28);
    withOutline(cv, t => {
      // the sheet sits a full value step BELOW the cream ground it lands on
      poly(t, [P(-hw, -hh), P(hw, -hh), P(hw, 0), P(-hw, 0)], PAPER.hi, 1, PAPER.base);
      poly(t, [P(-hw, 0), P(hw, 0), B(hw, hh), B(-hw, hh)], PAPER.flapHi, 1, PAPER.flapLo);
      // the crease: a shade line with the ONE light line above it
      capsule(t, ...P(-hw + 4, 0), ...P(hw - 4, 0), 7, PAPER.crease, 0.7);
      capsule(t, ...P(-hw + 6, -6), ...P(hw - 6, -6), 7, PAPER.light);
      // the curled bottom-right corner shows the paper's DARKER underside
      poly(t, [B(hw - 52, hh), B(hw, hh), B(hw, hh - 52)], PAPER.backHi, 1, PAPER.backLo);
      capsule(t, ...B(hw - 52, hh), ...B(hw, hh - 52), 5, '#7E5A32', 0.7);
      // three fat strokes of writing, ink-dark so they survive 56dp
      polyline(t, [P(-104, -100), P(-46, -104), P(22, -98), P(72, -102)], 15, PAPER.script);
      polyline(t, [P(-104, -54), P(-34, -58), P(42, -52)], 15, PAPER.script);
      polyline(t, [B(-104, 62), B(-28, 58), B(60, 64)], 15, PAPER.script);
      // the brass tack: its shadow on the paper, an INK keyline, a domed head
      const [tx, ty] = P(0, -126);
      ellipse(t, tx + 9, ty + 11, 36, 30, INK, 0.3, 8);
      ellipse(t, tx, ty, 37, 37, INK, 0.95, 3);
      roundRect(t, tx, ty, 32, 32, 32, BRASS.hi, 1, BRASS.lo);
      arcStroke(t, tx, ty, 21, 7, Math.PI * 0.12, Math.PI * 0.88, BRASS.lo, 0.5);
      ellipse(t, tx - 5, ty - 6, 13, 11, '#FFF0C4', 0.85);
    }, { width: CONTOUR });
    sheen(cv, P(0, -126)[0] - 11, P(0, -126)[1] - 11, 8, 6, 0.6);
    sheen(cv, ...P(-100, -150), 36, 9, 0.28);
    save(cv, 'notice.png');
  }
}
