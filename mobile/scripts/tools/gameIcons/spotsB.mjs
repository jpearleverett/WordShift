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
/** Warm dark iron: the family carries no cool note, so the crane, hook and bail
 *  are wrought iron seen by firelight rather than the steel blue-grey of round 3. */
const IRONW = { hi: '#A08464', base: '#5C4230', lo: '#33231A' };
const FIRE = { out: '#D8531C', mid: '#FF8E2A', in: '#FFC64E', core: '#FFF2C4' };
const MAUVE = { hi: '#EEE3F2', up: '#CDBAD8', base: '#A48FB4', lo: '#6F5A80', deep: '#4B3858' };
/** The recess: a warm plum, deep at the crown and warming toward the sill. */
const RECESS = { top: '#3A2B47', bot: '#6A5060', corner: '#241A2E' };
const CLAY = { hi: '#EBB98D', base: '#C8865A', lo: '#7F4A2C' };
/** The lamp body: light terracotta at the rim, deep wine-brown at the foot. */
const LAMP = { hi: '#EDAE80', lo: '#7A3826', top: '#F2C9A2', well: '#4A2814' };
/** Lamp glow: above cream (#F3E2BF) in every channel, so it can only lighten. */
const GLOW = '#FFF4DC';
const PEACE_FIRE = { out: '#E8944A', mid: '#FFBE5E', in: '#FFE1A0', core: '#FFF9E8' };
const THREAD = { hi: '#FFF8EA', base: '#F0DDB0', lo: '#B89C6C' };
/**
 * The spill: one flat pool of DEEP WARM ink, ringed by a bright warm-brown
 * rim so it separates from the phase-4 ash paper (which the round-3 navy sat
 * within 0.04 luminance of) as well as from cream.
 */
const POOL = { rim: '#C08C58', rimLo: '#8A5C34', fill: '#5A3340', deep: '#20121A', sheen: '#F6E7CE' };
/** The inkpot: a warm oxblood stoneware glaze, near black at the foot. */
const POTC = { hi: '#F0C39C', base: '#C4785C', lo: '#8A4636', foot: '#4A2018', flank: '#FBDCC0' };
/** theme_default.png's own tile colours (TILE_PAL.theme_default[0]) and their shades. */
const TILEC = { faceHi: '#FFA05E', faceLo: '#FF8C4D', bevel: '#FFC08A', side: '#CC6633', base: '#6E381B', glyph: '#FFF6E2', glyphShade: '#8A4620' };
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

/** A copy of `pts` scaled about (cx, cy): the only way to keyline a free polygon. */
function scalePts(pts, cx, cy, s) {
  return pts.map(([x, y]) => [cx + (x - cx) * s, cy + (y - cy) * s]);
}

/**
 * A rounded rectangle in a rotated local frame with a WEDGE BITTEN OUT of its
 * top-right corner: the letter tile's 'cracked' state has to live in the
 * silhouette, because a hairline fracture averages to nothing at 56dp. The
 * chip is a clean concave triangle so nothing thinner than 1/12 of the frame
 * is ever left behind.
 */
function chipTilePts(R, lcx, lcy, hw, hh, rad, n = 7) {
  const pts = [];
  const arc = (cx, cy, a0) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push(R(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad));
    }
  };
  pts.push(R(lcx - hw + rad, lcy - hh));
  pts.push(R(lcx + hw * 0.40, lcy - hh));
  pts.push(R(lcx + hw * 0.56, lcy - hh * 0.62));
  pts.push(R(lcx + hw, lcy - hh * 0.46));
  arc(lcx + hw - rad, lcy + hh - rad, 0);
  arc(lcx - hw + rad, lcy + hh - rad, Math.PI / 2);
  arc(lcx - hw + rad, lcy - hh + rad, Math.PI);
  return pts;
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

  { // === gathering.png — a copper kettle hung on a crane over a small fire ===
    const cv = fresh();
    contactShadow(cv, c + 6, 440, 120, 12, 0.28);
    ellipse(cv, c, 398, 120, 54, '#FFF3D2', 0.28, 40);                // firelight, uncontoured
    withOutline(cv, t => {
      // THE CRANE ARM: a warm-iron beam across the top with a knob at each end.
      // Round 3 hung the hook from nothing 10px below the frame edge, so the
      // kettle read as sitting IN the fire with a floating handle above it. The
      // beam gives the hook something to grip and fills the dead air the old
      // off-centre composition left on the right.
      roundRect(t, c, 85, 164, 13, 6, IRONW.hi, 1, IRONW.base);
      capsule(t, c - 148, 79, c + 148, 79, 5, IRONW.hi, 0.5);
      for (const x of [92, 420]) {
        ellipse(t, x, 85, 17, 17, IRONW.base);
        ellipse(t, x - 4, 81, 8, 7, IRONW.hi, 0.6);
      }
      // the hook: a short shaft off the beam ending in a closed ring the bail
      // passes through, so nothing terminates in air
      capsule(t, c, 90, c, 134, 16, IRONW.base);
      capsule(t, c - 4, 96, c - 4, 130, 6, IRONW.hi, 0.5);
      arcStroke(t, c, 152, 22, 11, 0, Math.PI * 2, IRONW.base);
      arcStroke(t, c, 152, 22, 11, Math.PI * 1.05, Math.PI * 1.55, IRONW.hi, 0.6);
      // body: top-lit copper, a belly band, a dark foot
      roundRect(t, c, 322, 116, 78, 52, COPPER.hi, 1, COPPER.mid);
      capsule(t, c - 102, 344, c + 102, 344, 24, COPPER.mid, 0.3);
      capsule(t, c - 92, 382, c + 92, 382, 14, COPPER.lo, 0.35);
      // spout, low on the left: two tapering segments ending in an OPEN mouth
      capsule(t, 162, 340, 134, 310, 44, COPPER.base);
      capsule(t, 136, 312, 112, 284, 28, COPPER.base);
      capsule(t, 142, 306, 118, 280, 12, COPPER.hi, 0.6);
      const sa = Math.atan2(284 - 312, 112 - 136);
      poly(t, ovalPts(106, 280, 13, 23, sa), COPPER.hi, 1, COPPER.mid);
      poly(t, ovalPts(105, 279, 7, 16, sa), COPPER.lo);
      // lid: rim plate, dome, knob
      roundRect(t, c, 250, 100, 9, 5, COPPER.hi, 1, COPPER.mid);
      poly(t, domePts(c, 244, 86, 40), COPPER.hi, 1, COPPER.mid);
      arcStroke(t, c, 244, 60, 12, Math.PI * 1.16, Math.PI * 1.6, '#FFE6C4', 0.55);
      capsule(t, c, 190, c, 214, 22, COPPER.mid);
      ellipse(t, c, 184, 22, 18, COPPER.hi);
      ellipse(t, c + 6, 190, 12, 9, COPPER.mid, 0.6);
      // the bail: a TALL arc (rx 104, ry 110) from shoulder lug to shoulder lug
      // and up through the hook's ring. A circular arc could not reach the ring
      // without throwing its lugs off the body, so it is drawn as a polyline.
      const bail = [];
      for (let i = 0; i <= 24; i++) {
        const a = Math.PI + (i / 24) * Math.PI;
        bail.push([c + Math.cos(a) * 104, 262 + Math.sin(a) * 110]);
      }
      polyline(t, bail, 15, IRONW.base);
      polyline(t, bail.slice(2, 13).map(([x, y]) => [x - 3, y - 2]), 6, IRONW.hi, 0.6);
      for (const x of [c - 104, c + 104]) {
        ellipse(t, x, 262, 15, 15, IRONW.lo);
        ellipse(t, x - 3, 259, 7, 6, IRONW.hi, 0.6);
      }
      // the fire: a WIDE bed of coals and three lobes, so the silhouette reads
      // kettle-over-a-fire and never twins with the shop's copper teapot
      ellipse(t, c, 428, 84, 12, '#5E1E05');
      ellipse(t, c, 425, 64, 9, '#9C4A04');
      fire(t, c - 98, 372, 436, 28);
      fire(t, c + 98, 378, 436, 26);
      fire(t, c, 330, 438, 52);
    }, { width: CONTOUR });
    sheen(cv, 202, 286, 22, 34, 0.5);
    sheen(cv, c - 36, 220, 18, 9, 0.45);
    save(cv, 'gathering.png');
  }

  { // === shrine.png — a mauve stone niche holding ONE lit clay oil lamp =====
    const cv = fresh();
    contactShadow(cv, c + 8, 462, 178, 18, 0.3);
    withOutline(cv, t => {
      // the arch: outer stone, a stepped inner band, then the recess. The stone
      // is the ONLY mauve in the piece; everything inside it is warm-lit.
      poly(t, archPts(c, 56, 156, 440), MAUVE.hi, 1, MAUVE.lo);
      poly(t, archPts(c, 78, 134, 440), MAUVE.up, 1, MAUVE.base);
      poly(t, archPts(c, 108, 110, 404), RECESS.top, 1, RECESS.bot);
      // the wall drops two steps darker behind the lamp, then a warm bloom
      // round the flame and a lit pool on the floor under it, so the lamp's
      // dark contour reads against a lit floor instead of a purple void
      glowInArch(t, 256, 206, 132, 132, RECESS.corner, 0.44, 76);
      glowInArch(t, 320, 300, 118, 142, GLOW, 0.30, 62);
      glowInArch(t, 272, 390, 156, 44, GLOW, 0.52, 44);
      // the sill
      roundRect(t, c, 420, 172, 22, 5, MAUVE.up, 1, MAUVE.deep);
      capsule(t, c - 160, 402, c + 160, 402, 6, MAUVE.hi, 0.7);
      // THE LAMP, the only thing in the hollow: a flat squat clay oil lamp with
      // a raised handle loop at the left and a pinched spout at the right, the
      // ONE flame standing on the spout tip so lamp and flame are one form.
      // Round 3 hung a floating amber pendant beside a bun-shaped dish whose
      // flame stood apart from it: three masses, no anchor. Everything below
      // is hand-keylined, because withOutline can only contour the arch.
      const body = [
        [174, 366], [180, 348], [196, 334], [220, 326], [248, 322], [278, 325],
        [302, 334], [316, 347], [321, 362], [317, 379], [302, 392], [276, 400],
        [246, 403], [214, 401], [190, 394], [177, 381],
      ];
      arcStroke(t, 198, 352, 32, 32, Math.PI * 0.42, Math.PI * 1.58, INK, 0.95);
      capsule(t, 304, 348, 320, 337, 54, INK, 0.95);
      capsule(t, 316, 340, 330, 330, 40, INK, 0.95);
      roundRect(t, 246, 402, 62, 13, 5, INK, 0.95);
      poly(t, scalePts(body, 248, 362, 1.075), INK, 0.95);
      // the handle loop, then the body top-lit terracotta to wine-brown
      arcStroke(t, 198, 352, 32, 16, Math.PI * 0.42, Math.PI * 1.58, CLAY.base);
      arcStroke(t, 196, 350, 32, 6, Math.PI * 1.02, Math.PI * 1.42, CLAY.hi, 0.75);
      roundRect(t, 246, 400, 58, 9, 4, CLAY.base, 1, CLAY.lo);                 // the foot
      poly(t, body, LAMP.hi, 1, '#A85A3A');
      capsule(t, 200, 388, 300, 388, 18, LAMP.lo, 0.5);                        // the shaded belly
      poly(t, [[180, 350], [198, 336], [222, 328], [250, 324], [278, 327], [302, 336],
        [314, 348], [300, 354], [268, 348], [232, 346], [204, 350], [188, 356]], LAMP.top);
      ellipse(t, 254, 336, 26, 9, LAMP.well);                                  // the filler well
      ellipse(t, 250, 335, 15, 4, '#8A5430', 0.8);
      // the spout, and the ONE flame rising out of its wick hole
      capsule(t, 304, 348, 320, 337, 38, CLAY.base);
      capsule(t, 316, 340, 330, 330, 24, CLAY.hi, 1);
      capsule(t, 308, 344, 322, 334, 10, CLAY.hi, 0.75);
      ellipse(t, 330, 331, 11, 5, LAMP.well);
      fire(t, 330, 206, 336, 26, PEACE_FIRE);
    }, { width: CONTOUR });
    sheen(cv, 170, 128, 20, 28, 0.5);                                         // the arch band's upper-left
    sheen(cv, 214, 340, 18, 9, 0.5);                                          // the lamp's shoulder
    save(cv, 'shrine.png');
  }

  { // === spilled_ink.png — a tipped inkpot pouring past ONE cracked tile =====
    const cv = fresh();
    // THE POT lies at the upper LEFT with its mouth pointing down-left, so the
    // pour is never hidden; its closed foot end tucks behind the tile, which
    // welds the two masses into one silhouette with no gap between them.
    const ang = 2.55, px = 186, py = 268;
    const R = rot(px, py, ang);
    const [mx, my] = R(94, 0);                                          // the mouth (108, 280)
    // THE TILE is the anchor: upright at 7 degrees, lower right, its foot in
    // the pool, a wedge bitten out of its top-right corner so 'cracked' is in
    // the SILHOUETTE and not just in a hairline.
    const hw = 88, hh = 110, tilt = 0.12;
    const T = rot(334, 244, tilt);
    const CT = (lx, ly, w, h, rad) => chipTilePts(T, lx, ly, w, h, rad);
    contactShadow(cv, c + 6, 414, 176, 12, 0.28);
    withOutline(cv, t => {
      // THE POOL: one flat LOW puddle of deep warm ink running from the mouth
      // under the tile's foot. Round 3 painted it navy, which measured within
      // 0.04 luminance of the phase-4 ash ground; it is now warm and carries a
      // bright warm-brown rim so it holds on ash as well as on cream.
      const pool = [
        [92, 326], [124, 332], [162, 348], [206, 358], [252, 362], [300, 364],
        [348, 366], [392, 372], [414, 384], [416, 400], [398, 410], [356, 413],
        [300, 409], [244, 413], [192, 409], [146, 403], [112, 392], [90, 374],
        [82, 350],
      ];
      poly(t, pool, POOL.rim, 1, POOL.rimLo);                              // the lit rim of the spill
      poly(t, pool.map(([x, y]) => [250 + (x - 250) * 0.91, 372 + (y - 372) * 0.74]), POOL.fill, 1, POOL.deep);
      capsule(t, 176, 366, 236, 372, 7, POOL.sheen, 0.45);
      // THE POT: a squat stoneware bottle on its side — flat shoulder, short
      // neck, brass lip, dark open mouth. Round 3 gave it a tapered handle and
      // a loose brass cube and the blind reviewer read a mallet; both are gone.
      poly(t, rectPtsL(R, -74, 0, 12, 54, 4), INK, 0.95);
      poly(t, roundPtsL(R, 0, 0, 61, 59, 22), INK, 0.95);
      poly(t, [[46, -59], [80, -40], [80, 40], [46, 59]].map(([x, y]) => R(x, y)), INK, 0.95);
      poly(t, rectPtsL(R, 80, 0, 15, 32, 4), INK, 0.95);
      poly(t, rectPtsL(R, 92, 0, 16, 40, 4), INK, 0.95);
      poly(t, rectPtsL(R, -72, 0, 7, 46, 3), POTC.lo, 1, POTC.foot);            // the foot plate
      poly(t, roundPtsL(R, 0, 0, 52, 50, 18), POTC.hi, 1, POTC.lo);             // the belly
      capsule(t, ...R(-32, -30), ...R(28, -30), 16, POTC.flank, 0.55);          // the lit flank
      capsule(t, ...R(-36, 32), ...R(34, 32), 18, POTC.foot, 0.4);              // the shaded side
      poly(t, [[48, -50], [72, -32], [72, 32], [48, 50]].map(([x, y]) => R(x, y)), POTC.base, 1, POTC.lo);
      poly(t, rectPtsL(R, 80, 0, 8, 24, 3), POTC.base, 1, POTC.lo);             // the neck
      poly(t, rectPtsL(R, 93, 0, 10, 37, 3), BRASS.hi, 1, BRASS.lo);            // the brass lip
      capsule(t, ...R(88, -26), ...R(95, -28), 6, '#FFF0C4', 0.75);
      poly(t, ovalPts(mx, my, 12, 33, ang), POOL.deep);                          // the open mouth
      capsule(t, ...R(96, 14), ...R(92, 30), 12, POOL.fill, 0.95);              // ink at the lower lip
      // THE TILE, drawn last and over nothing: theme_default's own grammar —
      // an INK keyline, a dark base plane and a mid side plane under a top-lit
      // candy face, a lighter bevel plane, gloss bar, specular dot, cream W.
      poly(t, CT(0, 14, hw + 10, hh + 22, 30), INK);
      poly(t, CT(0, 30, hw, hh, 26), TILEC.base);
      poly(t, CT(0, 15, hw, hh, 26), TILEC.side);
      poly(t, CT(0, 0, hw, hh, 26), TILEC.faceHi, 1, TILEC.faceLo);
      poly(t, roundPtsL(T, -14, -55, 56, 48, 20), TILEC.bevel);
      poly(t, roundPtsL(T, -12, -74, 42, 11, 11), '#FFFFFF', 0.4);
      ellipse(t, ...T(-44, -60), 14, 14, '#FFFFFF', 0.7, 4);
      const seg = [[-38, -44, -21, 38], [-21, 38, 0, -12], [0, -12, 21, 38], [21, 38, 38, -44]];
      for (const [x0, y0, x1, y1] of seg) capsule(t, ...T(x0, y0 + 9), ...T(x1, y1 + 9), 20, TILEC.glyphShade, 0.55);
      for (const [x0, y0, x1, y1] of seg) capsule(t, ...T(x0, y0 + 3), ...T(x1, y1 + 3), 17, TILEC.glyph);
      // THE CRACK: one bold INK zig-zag out of the bitten corner, down the face
      // and over the rim. No hairlines, no white streaks: both blurred away.
      const crack = [[49, -68], [70, -30], [44, 10], [66, 52], [46, 90], [52, 126]];
      polyline(t, crack.map(([x, y]) => T(x, y)), 18, INK);
    }, { width: CONTOUR });
    sheen(cv, ...T(-46, -66), 20, 10, 0.45);                            // the tile's upper-left
    sheen(cv, 156, 292, 16, 10, 0.5);                                   // the pot's belly
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
