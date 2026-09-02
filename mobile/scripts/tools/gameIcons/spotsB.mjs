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
 *   shrine.png       the only serene piece: a mauve stone alcove holding
 *                    exactly TWO things, and the lamp is the anchor. The lit
 *                    clay OIL LAMP is a teardrop body 200px wide at the
 *                    supersample (~40% of the frame, 10px inside each recess
 *                    wall), centred on the sill, light terracotta at the rim
 *                    to wine-brown at the foot, its left tip pinched into a
 *                    spout; the one flame (136px tall, over a quarter of the
 *                    frame) stands on the spout with its base sunk 14px into
 *                    the clay so it can never float. Round 4 had a 144px
 *                    dish barely taller than the cord runs beside it, and the
 *                    reviewer saw a smear. The tending motif is ONE token
 *                    mounted flat on the back wall above and to the right of
 *                    the flame: a brass ring 112px outer with a 28px band,
 *                    INK-keylined on both edges (the hole shows the recess,
 *                    so withOutline cannot contour the inner edge), and a
 *                    single short closed cream loop (36px thick, a teardrop
 *                    hanging through the bottom band, its top standing in the
 *                    hole). No peg, no draping cord: round 4 hung two long
 *                    cord runs to the sill off a peg and they read as a
 *                    'gold hook / cane' at 48px. The recess is lifted off
 *                    the ash paper (a warm plum, deep at the crown, warming
 *                    to the floor) with a warm-white lamp glow behind the
 *                    lamp mass, so the hollow shows two big steps: dark plum
 *                    / lit lamp. The lilac arch band stays a full step
 *                    lighter than the recess; nothing else sits inside it.
 *   spilled_ink.png  the cracked TILE is the anchor and the pot and ink are
 *                    its supporting pieces, all on ONE baseline. Round 3 led
 *                    with a tipped pot that overlapped a 15-degree tile sunk
 *                    in a large indigo pool, and the blind reviewer saw a
 *                    "dark round jar, a pink wedge and a puddle": three
 *                    overlapping pieces with no anchor, the game's identity
 *                    object unrecognisable, cool blue/magenta dominant, and
 *                    a bbox only 53% of the frame tall. The tile is now drawn
 *                    exactly to theme_default.png's grammar (its own INK
 *                    keyline, a dark base plane and a mid side plane under a
 *                    top-lit candy-pink face, the lighter bevel plane over
 *                    the top half, gloss bar, specular dot, the cream W),
 *                    UPRIGHT at 5 degrees, 294px tall at the supersample
 *                    (~57% of the frame), centred a little right of c, and
 *                    nothing is ever drawn over it. Its crack is ONE bold
 *                    INK zig-zag, 10px wide, running from the top edge of the
 *                    face down through the side and base planes to the
 *                    bottom edge, with a thin cream highlight along its
 *                    right side, kept to the right of the W so the letter
 *                    stays whole. The INKPOT is a squat stoneware pot in a
 *                    warm wine glaze (light at the top of the belly, near
 *                    black at the foot, a lit flank and a shaded band) with
 *                    a BRASS collar, lying on its side to the LEFT of the
 *                    tile, tipped 26 degrees so its dark open mouth points
 *                    at the tile's foot; its long axis is ~34% of the frame.
 *                    The INK is one flat indigo puddle, the only cool colour
 *                    in the picture and smaller than the tile: it starts at
 *                    the mouth, runs under the tile's base and shows as a
 *                    band in front of it, with one thin cream sheen. The
 *                    three pieces touch, so a single withOutline pass
 *                    contours the group, and one contact shadow sits under
 *                    all of it. Painted bbox ~82% wide, ~69% tall. It stands
 *                    apart from the ledger's upright blue inkpot in
 *                    empty_ledger by being knocked over, glazed wine and
 *                    brass-collared.
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
 *                    smallest silhouette, so it fills ~70% of the frame. Its
 *                    shadow is the cast of a pinned sheet on the wall behind
 *                    it: an offset copy of the sheet's own shape pushed 26,30
 *                    (13,15 at native) so it clears the 12px contour, laid
 *                    down twice (a 5% enlarged copy at low alpha under the
 *                    true copy) so the edge is soft like the siblings'
 *                    contact ellipse. Round 4 offset it only 12,14 and the
 *                    contour swallowed all of it.
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
  C, hex, blend, ellipse, roundRect, poly, capsule, arcStroke, flameLobe,
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
/** The recess: a warm plum, deep at the crown and warming toward the sill. */
const RECESS = { top: '#3E2F52', bot: '#6B5480', corner: '#2C2038' };
const CLAY = { hi: '#EBB98D', base: '#C8865A', lo: '#7F4A2C' };
/** The lamp body: light terracotta at the rim, deep wine-brown at the foot. */
const LAMP = { hi: '#EDAE80', lo: '#7A3826', top: '#F2C9A2', well: '#4A2814' };
/** Lamp glow: above cream (#F3E2BF) in every channel, so it can only lighten. */
const GLOW = '#FFF4DC';
const PEACE_FIRE = { out: '#E8944A', mid: '#FFBE5E', in: '#FFE1A0', core: '#FFF9E8' };
const THREAD = { hi: '#FFF8EA', base: '#F0DDB0', lo: '#B89C6C' };
/** The inkpot: a warm wine stoneware glaze, near black at the foot. */
const STONEWARE = { hi: '#E08C78', base: '#A84A4E', lo: '#5A2228', foot: '#33121A', flank: '#EBA48F' };
/**
 * The spill: ONE indigo puddle, the only cool colour in the icon. Its upper
 * fill (#4A3F8A) sits at perceived luminance ~0.27 against the ash paper's
 * ~0.18, and a 12px INK contour always separates them, so it never vanishes
 * on the dark ground; on cream it is the darkest mass after the outline.
 */
const INKP = { hi: '#4F4392', lo: '#2E2A5A', mouth: '#1A1533', depth: '#0E0B1E', sheen: '#EFE6FF' };
/** theme_default.png's own tile colours (TILE_PAL.theme_default[0]) and their shades. */
const TILEC = { faceHi: '#FF7FAB', faceLo: '#EE4F86', bevel: '#FFA0C4', side: '#D44D7A', base: '#722A42', glyph: '#FFF6E2', glyphShade: '#83304B', crackLight: '#FFF3E6' };
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

/**
 * A flat ring (annulus) as ONE even-odd polygon so `poly` can gradient it:
 * the outer circle, then the inner circle, joined by two coincident radial
 * bridge edges at the top that cancel under the even-odd rule. The bridge
 * leaves a half-alpha seam one pixel wide at 12 o'clock, so callers cover
 * that spot (here the peg stem sits on it).
 */
function ringPts(cx, cy, ro, ri, n = 48) {
  const outer = [], inner = [];
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    outer.push([cx + Math.cos(a) * ro, cy + Math.sin(a) * ro]);
    inner.push([cx + Math.cos(-a) * ri, cy + Math.sin(-a) * ri]);
  }
  return [...outer, ...inner];
}

/**
 * A soft ellipse CLIPPED to the shrine's recess (the inner arch: half-width
 * 110 about c, crown circle centred at y 218, floor at 404), so the lamp glow
 * lights the back wall and never bleeds onto the stone band around it. Same
 * falloff as the kit's `ellipse`.
 */
function glowInArch(cv, cx, cy, rx, ry, color, alpha, soft) {
  const [r, g, b] = hex(color);
  const inside = (x, y) => y <= 404 && Math.abs(x - c) <= 110 && (y >= 218 || Math.hypot(x - c, y - 218) <= 110);
  for (let y = ~~(cy - ry - 1); y <= ~~(cy + ry + 1); y++)
    for (let x = ~~(cx - rx - 1); x <= ~~(cx + rx + 1); x++) {
      if (!inside(x + 0.5, y + 0.5)) continue;
      const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      const a = Math.max(0, Math.min(1, (1 - d) * (rx / soft)));
      if (a > 0) blend(cv, x, y, r, g, b, a * alpha);
    }
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

  { // === shrine.png — a mauve stone niche holding ONE lit clay oil lamp =====
    const cv = fresh();
    contactShadow(cv, c + 8, 462, 178, 18, 0.3);
    withOutline(cv, t => {
      // the arch: outer stone, a stepped inner band, then the recess, a warm
      // plum that is deep at the crown and warms toward the floor, so the
      // hollow sits well above the ash paper while the band stays lighter
      poly(t, archPts(c, 56, 156, 440), MAUVE.hi, 1, MAUVE.lo);
      poly(t, archPts(c, 78, 134, 440), MAUVE.up, 1, MAUVE.base);
      poly(t, archPts(c, 108, 110, 404), RECESS.top, 1, RECESS.bot);
      glowInArch(t, 168, 150, 70, 70, RECESS.corner, 0.55, 40);               // the two dark crown corners
      glowInArch(t, 344, 150, 70, 70, RECESS.corner, 0.55, 40);
      // lamp light on the back wall: a warm plum bloom, then a warm white
      // (above cream in every channel) behind the lamp mass and tight around
      // the flame, all clipped to the recess so they never bleed onto the band
      glowInArch(t, 200, 306, 180, 160, '#8A6E9E', 0.5, 72);
      glowInArch(t, 184, 292, 118, 118, GLOW, 0.38, 62);
      glowInArch(t, 256, 372, 160, 70, GLOW, 0.18, 52);
      // the sill
      roundRect(t, c, 420, 172, 22, 5, MAUVE.up, 1, MAUVE.deep);
      capsule(t, c - 160, 402, c + 160, 402, 6, MAUVE.hi, 0.7);
      // THE TOKEN: a brass ring mounted flat on the back wall above and to
      // the right of the flame, one closed cream loop hanging through its
      // bottom band. The loop goes down first (the ring's band covers it
      // where it passes behind), its top standing in the hole so the hole
      // shows cream, not recess. Both are keylined by hand: the recess
      // behind them is opaque, so withOutline would give them no contour.
      const rx = 294, ry = 200, RO = 56, RB = 28;
      const loop = [[294, 182], [306, 192], [311, 222], [313, 254], [311, 282], [305, 300], [294, 308], [283, 300], [277, 282], [275, 254], [277, 222], [282, 192]];
      // only the HANGING part is keylined: inside the hole the cream cord sits
      // straight on the plum recess, so the hole reads as cord, not as INK
      const loopK = [[323, 236], [323, 254], [321, 286], [313, 308], [294, 319], [275, 308], [267, 286], [265, 254], [265, 236]];
      poly(t, loopK, INK, 0.95);
      poly(t, loop, THREAD.hi, 1, THREAD.lo);
      capsule(t, 286, 262, 289, 292, 7, '#FFFFFF', 0.45);                     // the loop's lit left strand
      // the ring: 112 outer, a 28 band, INK on BOTH edges (10px outside, 6px
      // inside so the hole stays open), brass lit from the upper-left
      arcStroke(t, rx, ry, RO - RB / 2 + 2, RB + 16, 0, Math.PI * 2, INK, 0.95);
      arcStroke(t, rx, ry, RO - RB / 2, RB, 0, Math.PI * 2, BRASS.lo);
      arcStroke(t, rx, ry, RO - RB / 2, RB, Math.PI * 0.95, Math.PI * 2.05, '#C99A44');
      arcStroke(t, rx, ry, RO - RB / 2, RB - 8, Math.PI * 1.08, Math.PI * 1.5, BRASS.hi);
      // THE LAMP, the anchor: a teardrop clay body 200 wide centred on the
      // sill, its left tip pinched into a spout. Foot first, then the body
      // top-lit light terracotta to wine-brown, a lighter top face, the
      // filler well, the shaded belly.
      roundRect(t, 262, 402, 48, 8, 3, CLAY.base, 1, CLAY.lo);                  // the foot
      const body = [
        [156, 348], [166, 338], [186, 328], [214, 320], [250, 316], [286, 318],
        [316, 326], [340, 340], [354, 358], [356, 376], [348, 390], [326, 400],
        [292, 405], [250, 406], [210, 403], [184, 396], [168, 382], [158, 364],
      ];
      poly(t, body, LAMP.hi, 1, LAMP.lo);
      capsule(t, 196, 390, 330, 390, 16, LAMP.lo, 0.5);                       // the shaded belly
      poly(t, [[160, 348], [170, 340], [190, 331], [216, 324], [250, 320], [286, 322], [314, 330], [336, 342], [346, 354], [334, 360], [300, 354], [254, 350], [214, 352], [190, 356], [172, 356]], LAMP.top);
      ellipse(t, 270, 334, 24, 8, LAMP.well);                                  // the filler well
      ellipse(t, 266, 333, 14, 4, '#8A5430', 0.8);
      // the wick opening on the spout, and the ONE flame rising straight
      // out of it: 136 tall, its base sunk 14px into the clay, no gap
      ellipse(t, 178, 340, 11, 6, LAMP.well);
      fire(t, 180, 214, 350, 28, PEACE_FIRE);
    }, { width: CONTOUR });
    sheen(cv, 170, 128, 20, 28, 0.5);                                         // the arch band's upper-left
    sheen(cv, 206, 330, 16, 8, 0.5);                                          // the lamp's shoulder
    save(cv, 'shrine.png');
  }

  { // === spilled_ink.png — a tipped inkpot beside ONE cracked letter tile ==
    const cv = fresh();
    // THE TILE'S frame: upright at 5 degrees, a little right of centre. Its
    // size is theme_default's front tile scaled to the 512 supersample
    // (hw 98, hh 114: the keyline stands 294 tall, ~57% of the frame).
    const hw = 98, hh = 114, tilt = -0.087;
    const T = rot(336, 244, tilt);
    const RR = (lx, ly, w, h, rad) => roundPtsL(T, lx, ly, w, h, rad);
    // THE POT'S frame: lying on its side to the left, tipped 26 degrees so
    // local +x (foot -> mouth) runs down-right at the tile's foot
    const ang = 0.45, px = 130, py = 347;
    const R = rot(px, py, ang);
    const [mx, my] = R(98, 0);                                          // the mouth's centre (218, 390)
    // one contact shadow under the whole group, down-right, never contoured
    contactShadow(cv, c + 6, 452, 196, 22, 0.32);
    withOutline(cv, t => {
      // THE INK: one flat puddle from the mouth, under the tile's base, showing
      // as a band in front of it and a small lobe at its right. Drawn first so
      // the pot's mouth and the tile both sit ON it.
      const puddle = [
        [mx - 14, my - 12], [mx + 8, my - 6], [300, 386], [380, 388], [436, 392],
        [454, 410], [460, 436], [450, 456], [412, 464], [356, 460], [304, 465],
        [250, 460], [206, 462], [176, 451], [164, 430], [170, 410], [186, 398],
      ];
      poly(t, puddle, INKP.lo, 1, INKP.hi);                                // dark at the far edge, lit toward the viewer
      capsule(t, 240, 440, 292, 438, 5, INKP.sheen, 0.6);                  // the one thin sheen
      // THE POT: its own INK keyline first (it lies on the puddle), then the
      // foot plate, the belly (light at the top, wine below, near black at
      // the foot band), a lit upper flank, a shaded lower band, the neck,
      // the brass collar and the dark open mouth with ink at its lower lip
      poly(t, ovalPts(px, py, 68, 54, ang), INK, 0.95);
      poly(t, rectPtsL(R, 74, 0, 16, 28, 3), INK, 0.95);                          // the pinched neck's keyline
      poly(t, rectPtsL(R, 96, 0, 14, 42, 3), INK, 0.95);                          // the flared lip's keyline
      poly(t, rectPtsL(R, -72, 0, 8, 34, 2), STONEWARE.lo, 1, STONEWARE.foot);   // the foot plate
      poly(t, ovalPts(px, py, 62, 48, ang), STONEWARE.hi, 1, STONEWARE.lo);      // the belly
      capsule(t, ...R(-30, -34), ...R(28, -34), 16, STONEWARE.flank, 0.75);        // the lit upper flank
      capsule(t, ...R(-36, 32), ...R(40, 32), 18, STONEWARE.foot, 0.5);           // the shaded underside
      poly(t, rectPtsL(R, 74, 0, 12, 22, 3), STONEWARE.base, 1, STONEWARE.lo);   // the pinched neck
      poly(t, rectPtsL(R, 94, 0, 10, 36, 2), BRASS.hi, 1, BRASS.lo);             // the flared brass lip
      capsule(t, ...R(90, -30), ...R(96, -32), 6, '#FFF0C4', 0.75);
      poly(t, ovalPts(mx + 4, my, 13, 33, ang), INKP.mouth);                      // the open mouth
      poly(t, ovalPts(mx + 1, my - 2, 8, 24, ang), INKP.depth, 0.85);
      capsule(t, ...R(104, 12), ...R(104, 28), 7, INKP.hi, 0.9);                 // ink at the lower lip
      // THE TILE, theme_default's grammar: its own INK keyline, a dark base
      // plane and a mid side plane under a top-lit candy-pink face, a lighter
      // bevel plane over the top half, the gloss bar, the specular dot, the
      // cream W with its shade. Nothing is drawn over it.
      poly(t, RR(0, 24, hw + 12, hh + 33, 36), INK);
      poly(t, RR(0, 45, hw, hh, 30), TILEC.base);                                // base plane, dark bottom rim
      poly(t, RR(0, 23, hw, hh, 30), TILEC.side);                                // side plane
      poly(t, RR(0, 0, hw, hh, 30), TILEC.faceHi, 1, TILEC.faceLo);              // the face, top-lit
      poly(t, RR(0, -hh * 0.46, hw - 8, hh * 0.54, 26), TILEC.bevel);            // bevel plane
      poly(t, RR(0, -hh * 0.62, hw * 0.76, hh * 0.13, 17), '#FFFFFF', 0.4);      // gloss bar
      ellipse(t, ...T(hw * 0.56, -hh * 0.54), 15, 15, '#FFFFFF', 0.75, 4);      // specular dot
      const seg = [[-41, -45, -22, 40], [-22, 40, 0, -13], [0, -13, 22, 40], [22, 40, 41, -45]];
      for (const [x0, y0, x1, y1] of seg) capsule(t, ...T(x0, y0 + 10), ...T(x1, y1 + 10), 20, TILEC.glyphShade, 0.55);
      for (const [x0, y0, x1, y1] of seg) capsule(t, ...T(x0, y0 + 3), ...T(x1, y1 + 3), 17, TILEC.glyph);
      // THE CRACK: one bold INK zig-zag from the face's top edge down through
      // the side and base planes to the bottom edge, 10px wide, kept right of
      // the W, with a thin cream highlight along its right side
      const crack = [[52, -116], [78, -62], [50, -6], [76, 52], [58, 116], [63, 140], [60, 161]];
      polyline(t, crack.map(([x, y]) => T(x, y)), 10, INK);
      polyline(t, crack.map(([x, y]) => T(x + 6, y)), 4, TILEC.crackLight, 0.85);
    }, { width: CONTOUR });
    sheen(cv, ...T(-58, -82), 22, 11, 0.45);                            // the tile's upper-left
    sheen(cv, ...R(-22, -28), 14, 9, 0.5);                              // the pot's belly
    save(cv, 'spilled_ink.png');
  }

  { // === notice.png — a creased parchment note pinned by a brass tack =========
    const cv = fresh();
    const ang = -0.1, hw = 158, hh = 172;
    const P = rot(c, 256, ang);                                         // the sheet's frame
    const [kx, ky] = P(0, 0);
    const B = rot(kx, ky, ang + 0.09);                                  // the lower flap, pivoted at the crease
    const sheet = [P(-hw, -hh), P(hw, -hh), P(hw, 0), B(hw, hh), B(-hw, hh), P(-hw, 0)];
    // a pinned sheet casts onto the wall behind it: an offset copy of its own
    // shape, pushed far enough (26,30) to clear the 12px contour, with a 5%
    // enlarged copy at low alpha beneath it so the edge falls off softly
    const cast = (dx, dy, s, a) => poly(cv, sheet.map(([x, y]) => [kx + dx + (x - kx) * s, ky + dy + (y - ky) * s]), INK, a);
    cast(26, 30, 1.05, 0.12);
    cast(26, 30, 1, 0.2);
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
