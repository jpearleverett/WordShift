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
 *   shrine.png       the only serene piece: a mauve stone alcove holding a lit
 *                    clay OIL LAMP: a teardrop body (light terracotta at the
 *                    rim to wine-brown at the foot, 144px wide at the
 *                    supersample, over half the recess) whose left tip pinches
 *                    into a spout, and the one flame stands DIRECTLY on that
 *                    spout tip, its base overlapping the clay by several px so
 *                    there is never a gap for it to float in (104px tall at
 *                    the supersample, over a sixth of the frame). Round 3 had
 *                    a dish with the flame off to one side on a hairline
 *                    spout and the reviewer saw 'a candle on a dish'. The
 *                    tending motif is now LEGIBLE at 48px instead of a key
 *                    squiggle: a brass ring 80px outer (over a seventh of the
 *                    frame) with an 18px band and its own INK keyline, hooked
 *                    on a wooden peg that sticks up out of the recess's right
 *                    wall, and ONE thick cream cord (22px, 11 at native) fed
 *                    through the ring and folded over its bottom band, both
 *                    ends draping straight down to rest on the sill; the near
 *                    end passes behind the lamp's shoulder. The recess itself
 *                    is lifted off the ash paper: a warm plum gradient (deep
 *                    at the crown, warming to the floor) with a lamp glow
 *                    around the flame, so on the dark ground it reads as a
 *                    lit hollow and never as an open archway, while the lilac
 *                    arch band stays a full step lighter than it.
 *   spilled_ink.png  ONE anchor, the inkpot: a squat round-bellied inkwell
 *                    wider than tall (156 x 128 at the supersample) in a wine
 *                    glaze, top-lit in canvas space with a dark foot band, a
 *                    real NECK (a short wine collar into a flared brass lip)
 *                    so the silhouette says inkpot and not mug, tipped so the
 *                    mouth faces lower right with indigo-black ink at the lip,
 *                    and its cork lying loose below the belly. Beside it, ONE
 *                    beveled candy letter tile drawn in theme_default.png's
 *                    grammar (rounded square, a darker rim band that is
 *                    thickest at the bottom, a top-lit pink face, a big cream
 *                    W), 144px square at the supersample (72 at native, over
 *                    a quarter of the frame), standing upright and leaning
 *                    its top corner behind the pot's lip, with one bold INK
 *                    crack (14px) zig-zagging from a chipped upper-right
 *                    corner down across the W. No fragments: round 3 split
 *                    the tile into slabs and the reviewer saw 'three pink
 *                    blocks'. The ink is a single low indigo pool spreading
 *                    from the mouth, under a third of the frame wide, darker
 *                    than the pot's lit body, with a light rim along its
 *                    upper contour and one gloss so it holds on the ash
 *                    paper; the tile stands in its near edge. The whole group
 *                    is recentred (painted bbox inside 48px margins on every
 *                    side at the supersample) after round 3 ran 6px from the
 *                    right edge. It stands apart from the ledger's upright
 *                    blue inkpot in empty_ledger by being knocked over,
 *                    glazed wine and corked.
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
const PEG = { hi: '#D9A870', base: '#B07A44', lo: '#6E4520' };
/** Lamp glow: above cream (#F3E2BF) in every channel, so it can only lighten. */
const GLOW = '#FFF4DC';
const PEACE_FIRE = { out: '#E8944A', mid: '#FFBE5E', in: '#FFE1A0', core: '#FFF9E8' };
const THREAD = { hi: '#FFF8EA', base: '#F0DDB0', lo: '#B89C6C' };
const POT = { hi: '#D99C90', base: '#96474D', lo: '#4E2026', band: '#3E1A20' };
const LIP = { hi: '#F2CE7A', lo: '#9A6A2E' };
const CORK = { hi: '#E2C08C', base: '#C69A5E', lo: '#8C6432' };
/**
 * The spill: a top-lit violet-indigo pool whose DARKEST fill (#6B5FB4) still
 * sits at linear luminance ~0.145, a tenth above the ash paper (0.026), so the
 * INK keyline around it always has something lighter to sit against. The two
 * near-black inks are reserved for the pot's mouth and a thin inner lip.
 */
const INKP = { rim: '#9C92E0', hi: '#5A4DAE', lo: '#3D3390', gloss: '#EDE9FF', mouth: '#1A1533', depth: '#0E0B1E', lipShine: '#7A6ED0' };
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
      // (above cream in every channel) tight around the flame, both clipped
      // to the recess so they never bleed onto the stone band
      glowInArch(t, 206, 318, 170, 150, '#8A6E9E', 0.5, 70);
      glowInArch(t, 186, 300, 112, 112, GLOW, 0.36, 60);
      glowInArch(t, 256, 372, 150, 70, GLOW, 0.16, 50);
      // the sill
      roundRect(t, c, 420, 172, 22, 5, MAUVE.up, 1, MAUVE.deep);
      capsule(t, c - 160, 402, c + 160, 402, 6, MAUVE.hi, 0.7);
      // THE PEG: a wooden dowel angled up out of the right wall, keylined
      // because the recess behind it is opaque and would give it no contour
      capsule(t, 328, 204, 346, 170, 32, INK, 0.95);
      capsule(t, 328, 204, 346, 170, 20, PEG.base);
      capsule(t, 326, 200, 341, 174, 7, PEG.hi, 0.6);
      ellipse(t, 346, 170, 10, 10, PEG.lo);
      ellipse(t, 344, 168, 6, 6, PEG.hi, 0.7);
      // THE CORD, part one: the two runs visible INSIDE the ring's hole,
      // drawn before the ring so the band covers them where they pass behind it
      const rx = 318, ry = 226, RO = 40, RB = 18;
      const cord = (run, th = 22) => { polyline(t, run, th + 12, INK, 0.95); polyline(t, run, th, THREAD.base); };
      cord([[302, 232], [312, 262]], 20);
      cord([[334, 232], [326, 262]], 20);
      // THE RING: 80 outer, an 18 band, keylined on BOTH edges (the hole
      // shows the recess, so withOutline cannot contour the inner edge)
      arcStroke(t, rx, ry, RO - RB / 2, RB + 22, 0, Math.PI * 2, INK, 0.95);
      arcStroke(t, rx, ry, RO - RB / 2, RB, 0, Math.PI * 2, BRASS.lo);
      arcStroke(t, rx, ry, RO - RB / 2, RB, Math.PI * 0.95, Math.PI * 2.05, '#C99A44');
      arcStroke(t, rx, ry, RO - RB / 2, RB - 6, Math.PI * 1.08, Math.PI * 1.5, BRASS.hi);
      // THE CORD, part two: folded over the bottom band and draping straight
      // down to rest on the sill. The near end runs behind the lamp's
      // shoulder (the lamp is drawn after it); the far end rests in the open
      cord([[312, 250], [318, 268], [322, 330], [320, 398]]);
      cord([[326, 250], [340, 270], [346, 330], [346, 398]]);
      capsule(t, 342, 290, 344, 340, 6, THREAD.hi, 0.6);
      capsule(t, 320, 290, 321, 330, 6, THREAD.hi, 0.6);
      // THE LAMP, the anchor: a teardrop clay body on the sill, 144 wide,
      // its left tip pinched into a spout. Foot first, then the body top-lit
      // light terracotta to wine-brown, a lighter top face, the filler well.
      const lx = 244;
      roundRect(t, lx + 4, 400, 44, 8, 3, CLAY.base, 1, CLAY.lo);                // the foot
      const body = [
        [164, 352], [178, 342], [200, 336], [232, 332], [268, 333], [296, 340],
        [312, 352], [318, 368], [312, 386], [292, 398], [258, 404], [220, 404],
        [190, 398], [172, 384], [162, 366],
      ];
      poly(t, body, LAMP.hi, 1, LAMP.lo);
      capsule(t, lx - 60, 386, lx + 56, 386, 14, LAMP.lo, 0.5);                // the shaded belly
      poly(t, [[168, 352], [182, 344], [206, 339], [238, 336], [270, 337], [296, 344], [308, 354], [298, 360], [266, 356], [232, 355], [200, 357], [180, 358]], LAMP.top);
      ellipse(t, lx + 6, 347, 20, 7, LAMP.well);                                // the filler well
      ellipse(t, lx + 2, 346, 12, 3, '#8A5430', 0.8);
      // the wick opening at the spout tip, and the ONE flame rising straight
      // out of it: its base overlaps the clay by several px, no gap
      ellipse(t, 176, 352, 9, 5, LAMP.well);
      fire(t, 178, 258, 362, 26, PEACE_FIRE);
    }, { width: CONTOUR });
    sheen(cv, 170, 128, 20, 28, 0.5);                                         // the arch band's upper-left
    sheen(cv, 214, 352, 14, 8, 0.5);                                          // the lamp's shoulder
    save(cv, 'shrine.png');
  }

  { // === spilled_ink.png — a tipped inkpot, its cork, ONE cracked tile ======
    const cv = fresh();
    const ang = 0.55, px = 148, py = 222;                               // the pot's centre; local +x runs base -> mouth
    const R = rot(px, py, ang);
    const [mx, my] = R(112, 0);                                         // the mouth's centre
    const T = rot(px + 224, py + 36, -0.1);                             // the tile, standing in the pool's near edge
    const TH = 72;                                                      // tile half-size: 144 (72 at native)
    // one shadow for the whole group, down-right
    contactShadow(cv, px + 130, py + 146, 210, 22, 0.32);
    withOutline(cv, t => {
      // THE CORK, loose on the ground below the belly: a tapered tan stopper
      poly(t, [[px - 70, py + 78], [px - 26, py + 86], [px - 26, py + 116], [px - 70, py + 108]], CORK.hi, 1, CORK.lo);
      ellipse(t, px - 70, py + 93, 9, 16, CORK.lo);
      capsule(t, px - 62, py + 84, px - 32, py + 90, 6, '#F6E2BC', 0.6);
      // THE POT: a squat round-bellied inkwell, wider than tall, top-lit in
      // canvas space (whichever flank faces up is the lit one), a foot plate
      // at the base, a dark band on the underside, and a real NECK: a short
      // wine collar, then a flared brass lip, then the dark open mouth with
      // ink glistening at its lower edge
      poly(t, rectPtsL(R, -62, 0, 9, 48, 3), POT.base, 1, POT.band);      // the foot plate
      poly(t, ovalPts(px, py, 62, 82, ang), POT.hi, 1, POT.lo);           // the belly
      capsule(t, ...R(-30, -64), ...R(40, -64), 18, POT.hi, 0.6);         // the lit upper flank
      capsule(t, ...R(-36, 62), ...R(44, 62), 22, POT.band, 0.5);         // the shaded underside
      capsule(t, ...R(58, -50), ...R(58, 50), 10, POT.hi, 0.35);          // the shoulder ridge
      poly(t, rectPtsL(R, 78, 0, 18, 32, 3), POT.base, 1, POT.lo);        // the neck: local 60..96
      capsule(t, ...R(66, -30), ...R(92, -30), 8, POT.hi, 0.5);
      poly(t, [R(90, -36), R(112, -54), R(112, 54), R(90, 36)], LIP.hi, 1, LIP.lo); // the flared brass lip, its end resting on the tile
      capsule(t, ...R(96, -40), ...R(110, -46), 7, '#FFF4D0', 0.7);
      poly(t, ovalPts(mx, my, 15, 52, ang), INKP.mouth);                  // the open mouth
      poly(t, ovalPts(mx - 3, my - 3, 9, 37, ang), INKP.depth, 0.85);
      capsule(t, ...R(115, 8), ...R(115, 40), 9, INKP.lipShine, 0.8);     // ink glistening at the lip
      // THE SPILL: one tongue out of the mouth into one low pool. A closed
      // INK keyline first (it separates the ink from the pot's dark
      // underside), then the indigo fill, a light rim along the upper
      // contour, one gloss
      const cx0 = px + 150, cy0 = py + 108, rxp = 84, ryp = 30;
      const bump = [1, 0.96, 1.04, 0.95, 1.03, 0.98, 1.05, 0.94, 1, 0.97, 1.04, 0.93, 1.02, 0.96, 1.05, 0.95, 1.01, 0.94, 1.03, 0.97, 1, 0.95, 1.02, 0.98, 1.03];
      const pool = [];
      for (let i = 0; i <= 24; i++) {
        const a = 4.3 + (i / 24) * (9.9 - 4.3);                            // from the upper-right round the bottom to the upper-left
        pool.push([cx0 + Math.cos(a) * rxp * bump[i], cy0 + Math.sin(a) * ryp * bump[i]]);
      }
      const tongue = [[mx - 26, my + 32], [mx - 16, my + 46], [mx - 2, my + 58], [mx + 20, my + 64]];
      const spill = [...pool, ...tongue];
      polyline(t, [...spill, spill[0]], 14, INK, 0.95);
      poly(t, spill, INKP.hi, 1, INKP.lo);
      polyline(t, [[cx0 - 70, cy0 - 8], [cx0 - 46, cy0 - 22], [cx0 - 12, cy0 - 28]], 9, INKP.rim, 0.9);
      polyline(t, [[cx0 + 20, cy0 - 28], [cx0 + 50, cy0 - 22], [cx0 + 74, cy0 - 8]], 9, INKP.rim, 0.9);
      capsule(t, mx - 14, my + 38, mx - 6, my + 54, 7, INKP.rim, 0.8);
      capsule(t, cx0 - 44, cy0 + 4, cx0 - 14, cy0 + 8, 8, INKP.gloss, 0.5);
      // THE TILE last, standing in the pool's near edge. The shop's grammar:
      // a rounded square rim band (base to dark), a top-lit face set 4px
      // high so the bottom band is the thickest bevel, a big cream W. The
      // upper-right corner is CHIPPED (the notch is in both polygons, so the
      // band follows it), and ONE bold INK crack zig-zags from the chip down
      // across the W, with a lit edge beside it
      const notched = (M, h, rad, n1, n2, n3) => {
        const pts = [M(h - n1, -h), M(h - n2, -h + n3), M(h, -h + n1)];       // the chip
        for (const [sx, sy, a0] of [[1, 1, 0], [-1, 1, Math.PI / 2], [-1, -1, Math.PI]]) {
          const cx = sx * (h - rad), cy = sy * (h - rad);
          for (let i = 0; i <= 7; i++) { const a = a0 + (i / 7) * (Math.PI / 2); pts.push(M(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)); }
        }
        return pts;
      };
      poly(t, notched(T, TH, 16, 40, 20, 26), TILE.base, 1, TILE.lo);
      const F = rot(...T(0, -4), -0.1);
      poly(t, notched(F, TH - 14, 10, 28, 10, 18), TILE.hi, 1, TILE.base);
      polyline(t, [T(-34, -26), T(-18, 30), T(0, -8), T(18, 30), T(34, -26)], 15, TILE.ink);
      const crack = [T(TH - 22, -TH + 26), T(28, -36), T(4, -4), T(20, 36), T(-2, TH + 2)];
      polyline(t, crack.map(([x, y]) => [x + 6, y + 2]), 5, '#FFC9DC', 0.7);
      polyline(t, crack, 14, INK, 0.95);
    }, { width: CONTOUR });
    sheen(cv, ...R(-34, -34), 14, 24, 0.5);                             // the pot's upper-left shoulder
    sheen(cv, ...T(-40, -44), 12, 8, 0.5);                              // the tile's face
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
