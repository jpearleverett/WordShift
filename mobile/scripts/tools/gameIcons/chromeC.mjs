/**
 * gameIcons/chromeC.mjs — ROUND 3, the sprite-misuse audit: four CHROME MARKS
 * (256px, saved FLAT in assets/ui beside their shipped siblings, rendered
 * 20-27dp) + one EMPTY-STATE SPOT (256px, assets/ui/spots/, rendered 96dp).
 *
 * Each of these replaces a sprite a row was BORROWING from somewhere else, so
 * every subject here was drawn AGAINST the sprite it displaces:
 *
 *   cycle_loop.png    the "The Pattern Continues" door row wore the crimson-rimmed
 *                     VOID DISC (assets/ui/void.png: a near-black filled disc with
 *                     a thin red rim and a dark hollow). This is the opposite
 *                     object in every way that survives 24dp: an OPEN RING, not a
 *                     disc (the hole is bare ground, nothing fills it); a FAT tube
 *                     (66 of 512, over 1/8 frame, ~3px at 24dp) instead of a
 *                     hairline rim; and a light SERENE MAUVE body lit from the
 *                     upper-left, so it reads pale on ash and mid-toned on cream
 *                     where the void reads black on both. The ring is CLOSED
 *                     (round 4): one constant-thickness tube all the way round,
 *                     with the tail running straight INTO the mouth so the
 *                     silhouette is an unbroken ring with a head bump (round 3
 *                     tapered the tail to a point that stopped short of the jaw,
 *                     and at 20px the dark gap made it an open C with a knob, the
 *                     opposite of a cycle). The serpent is told by SILHOUETTE: a
 *                     HEAD at 1 o'clock a quarter of the frame wide that breaks
 *                     the ring's outer edge (a knob a value step lighter than the
 *                     tube, its own ink keyline), a short ink WEDGE notched into
 *                     the head's outer edge for the mouth (never a break in the
 *                     ring), and ONE solid dark eye dot 46px across (the ringed
 *                     iris of round 3 was sub-1/12 detail and mushed into the
 *                     knob). No scales, no bands: a scale pattern is sub-pixel
 *                     texture.
 *   ledger_quill.png  the Word Ledger row. spots/empty_ledger.png already shows a
 *                     white quill with a brass nib and a squat INDIGO inkpot with
 *                     a brass collar, so the ledger keeps ONE mark: that same pot
 *                     (same glass, same collar) with that same quill STANDING in
 *                     it, shaft rising up and to the right, the vane hung off the
 *                     upper-left side. The pot is wide and low so the silhouette
 *                     is a plume on a jar, not a lollipop.
 *   word_echo.png     a puzzle word that made an animal react. The game's own
 *                     identity object — the beveled candy letter tile, drawn the
 *                     way assets/ui/shop/theme_default.png draws its front tile
 *                     (candy pink, extruded side and base planes, a bevel plane,
 *                     a gloss bar, a specular dot, a cream W) AT theme_default's
 *                     proportions (a face wider than tall, a fat extruded base,
 *                     a lean of 4 degrees) — with a SOUND RIPPLE radiating from
 *                     its upper-right corner (round 4): TWO concentric brass arcs
 *                     centred just outside the corner, opening to the upper
 *                     right, each a 50px tube (1/10 frame) with round caps and its
 *                     own full ink contour, the inner at radius 76 and the outer
 *                     at 150 with a 24px ink gap between them, so at 20px they
 *                     read as two bright stripes fanning off the corner. Round 3's
 *                     single fat crescent ended in a rounded bulb and a stranger
 *                     read it as an orange ARROW (a "shift the letter" gesture, the
 *                     wrong meaning) and at 20px as a banana hooked on the tile;
 *                     round 2 stood one arc off the corner on a dot that vanished;
 *                     round 1 read as a phone with a wifi badge. No bulb, no
 *                     arrowhead, no hook: arcs only, never over the tile face. The
 *                     tile is shifted down-left to make room and stays the anchor.
 *                     The shipped speech.png is a bubble; this is the game's own
 *                     tile, ringing.
 *   paper_plane.png   the Challenge-a-friend share button (the row wore the
 *                     generic share mark). A folded paper DART in flight, nose to
 *                     the upper-right, drawn as the planes a real one shows from
 *                     the side: a tan-cream upper wing (a MID value, so it clears
 *                     the cream parchment by value rather than contour alone), a
 *                     keel two steps darker below the fold, and an ink under-fold
 *                     plane along the crease. It is one chunky triangle with a
 *                     notch, 69% of the frame with a wide nose so the contour
 *                     holds round the tip (round 1 was longer, thinner and paler
 *                     and went flat at 20px on cream), and it is NOT the crest
 *                     shared_first.png's plane: no motion trail, no sky, a
 *                     different tilt.
 *   spots/empty_house.png  the empty-house placeholder before the first room is
 *                     built. ONE anchored object (round 4): a horizontal rolled
 *                     PARCHMENT scroll spanning ~70% of the frame, tan-cream and
 *                     top-lit, whose right end shows its rolled cross-section as
 *                     a lit disc 92px wide carrying a bold SPIRAL (the spiral is
 *                     what says "scroll"), tied with ONE ochre twine band near
 *                     the centre under a simple knot with two short stubs. A
 *                     short flat flap of the sheet peels open at the left end and
 *                     carries ONE bold blue-ink roofline chevron, the only
 *                     blueprint cue. A fat CARPENTER'S PENCIL lies ON THE GROUND
 *                     in front, angled slightly, its warm-wood body 54px thick
 *                     with a flat cream sharpened tip and a dark graphite point,
 *                     overlapping the roll's lower-left so the two share one
 *                     contour and one contact shadow. Round 3 painted the roll
 *                     steel BLUE (a cyanotype), drew a house glyph on it, tied it
 *                     twice under a double-loop bow and leaned a red pencil up
 *                     its far end: a stranger saw a blue drum with white curls
 *                     and a stick, and at 20px a blue-and-brown speck cluster.
 *                     The parchment material and the spiral end are the fix. It
 *                     is not the shipped scroll.png (an unrolled page with curled
 *                     ends) nor the quest letter (a seal and a ribbon): a closed
 *                     rolled tube with a spiral end, tied once, a tool in front.
 *
 * Palettes: the kit's PARCH/WOOD/BRASS for paper, twine, collar and the
 * ripple; the empty_ledger spot's INDIGO glass, WHITE feather and brass;
 * theme_default's candy pink for the tile (copied from TILE_THEMES in
 * src/theme/colors.ts — retune both together); a local SERENE MAUVE ladder for
 * the ouroboros (five steps, warmed a touch toward rose/wine in round 4 so it
 * sits beside the shrine's serene mauve rather than cool violet; `mid` at
 * ~0.45 linear luminance so the tube sits a full step above ash and the head,
 * in `lite`/`hi`, a step above the tube on both grounds); a local SCROLL
 * ladder (four tan-creams, the crown at cream and the seat two steps below,
 * so the roll clears the cream ground by contour and the ash ground by value);
 * one cool BLUEPRINT ink for the roofline. No glows anywhere in this family.
 *
 * House doctrine (see _draw.mjs): contact shadow BEFORE withOutline, subject
 * inside it, sheen AFTER it. Chrome contour width 20 on the 512 supersample
 * (~1px at 24dp), the spot's 13. INK for contours, never #000. No Math.random
 * or Date.now: every coordinate is a literal, byte-reproducible. All
 * coordinates are in the 512x512 supersample (c = 256 is the centre); each
 * file is downsampled 2x to 256px.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  savePNG, down2, contactShadow, sheen, withOutline,
  INK, PARCH, WOOD, BRASS,
  C, hex, blend, ellipse, roundRect, poly, capsule, arcStroke,
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
/** Serene mauve, the Phase-5 material, warmed toward rose/wine. Five steps so
 *  a ring 66px thick still has a lit crest and a shaded seat once it is 3px thick. */
const MAUVE = { lite: '#F6E6EF', hi: '#E5CAE0', mid: '#CBA5CD', lo: '#805684', deep: '#553559' };
const EYE = { pupil: '#2A1B30' };
/** The ledger spot's glass and feather, verbatim, so the two ledger marks are one pot. */
const INKP = { rim: '#5E56A0', lit: '#6A61B4', hi: '#3A3268', base: '#2B2550', lo: '#1A1533', gloss: '#9E96D6' };
const FEATHER = { hi: '#FFFFFF', base: '#F1E7D2', lo: '#BFAF90', shaft: '#7A5A3A' };
const BR = { lite: '#F8E2A6', hi: BRASS.hi, mid: '#C48F3C', lo: BRASS.lo, deep: '#63401A' };
/** theme_default's candy pink [bg, border] (TILE_THEMES in colors.ts). */
const PINK = { face: '#FF6B9D', side: '#D44D7A', base: '#722A42', bevel: '#FF8BB3' };
/** Paper for the dart: a tan-cream MID wing (~0.55 lum, below cream), a keel two steps darker. */
const DART = { wingHi: '#E4CC98', wingLo: '#CFAE74', keelHi: '#C29A62', keelLo: '#A47A47', crease: '#7A5A36' };
/** The rolled parchment: crown at cream, paper a step below, seat two below, the spiral's ink. */
const SCROLL = { crown: PARCH.hi, hi: '#F1DDB6', lo: '#CDAE7E', seat: '#B8965F', coil: WOOD.mid };
/** Warm-wood carpenter's pencil, its lit top face, its cut end, and its graphite. */
const PENCIL = { hi: WOOD.light, lo: WOOD.base, top: '#F3CC95', end: WOOD.dark, lead: '#4A4046' };
/** One blue draftsman's ink for the roofline on the flap. */
const BLUEPRINT = '#3F63A8';

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

/** A rotated rounded rectangle as points, for poly (which takes gradTo). */
function roundRectPts(cx, cy, hw, hh, rad, ang, per = 6) {
  const P = rot(cx, cy, ang);
  const r = Math.min(rad, hw, hh);
  const corners = [
    [hw - r, hh - r, 0], [-(hw - r), hh - r, Math.PI / 2],
    [-(hw - r), -(hh - r), Math.PI], [hw - r, -(hh - r), -Math.PI / 2],
  ];
  const pts = [];
  for (const [kx, ky, a0] of corners) {
    for (let i = 0; i <= per; i++) {
      const a = a0 + (i / per) * (Math.PI / 2);
      pts.push(P(kx + Math.cos(a) * r, ky + Math.sin(a) * r));
    }
  }
  return pts;
}

/** A rotated ellipse as points, for poly. */
function ellipsePts(cx, cy, rx, ry, ang, n = 40) {
  const P = rot(cx, cy, ang);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return P(Math.cos(a) * rx, Math.sin(a) * ry);
  });
}

/** Anti-aliased closed ring stroke (arcStroke's caps bead at a full-circle seam). */
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

/**
 * A flat spiral walked as short capsules, the rolled sheet's cross-section:
 * radius grows from r0 to r1 over `turns`, squashed by `sx` along x so it sits
 * inside a foreshortened end-cap ellipse. Drawn opaque so the overlapping
 * segment caps leave no seams.
 */
function spiral(cv, cx, cy, sx, r0, r1, turns, th, color, steps = 72) {
  let prev = null;
  for (let i = 0; i <= steps; i++) {
    const tt = i / steps, a = tt * turns * Math.PI * 2, r = r0 + (r1 - r0) * tt;
    const p = [cx + Math.cos(a) * r * sx, cy + Math.sin(a) * r];
    if (prev) capsule(cv, prev[0], prev[1], p[0], p[1], th, color);
    prev = p;
  }
}

/**
 * The game's beveled candy letter tile, in 512 space: its own dark keyline,
 * a base plane, a side plane, the flat face, a lighter bevel plane across the
 * top, a gloss bar, a specular dot and (optionally) a cream W. This is
 * themes.mjs's candyTile scaled 4/3 so the echo tile IS the shop's tile;
 * `gs` scales the W alone so it can fill a wider face.
 */
function candyTile(t, cx, cy, hw, hh, angDeg, pal, glyph = false, gs = 1) {
  const ang = (angDeg * Math.PI) / 180;
  const P = rot(cx, cy, ang);
  const RR = (lx, ly, w, h, rad) => roundRectPts(...P(lx, ly), w, h, rad, ang);
  poly(t, RR(0, 24, hw + 12, hh + 33, 34), INK);
  poly(t, RR(0, 45, hw, hh, 29), pal.base);                                 // base plane
  poly(t, RR(0, 23, hw, hh, 29), pal.side);                                 // side plane
  poly(t, RR(0, 0, hw, hh, 29), pal.face);                                  // face, flat
  poly(t, RR(0, -hh * 0.46, hw - 8, hh * 0.54, 26), pal.bevel);             // bevel plane
  poly(t, RR(0, -hh * 0.62, hw * 0.76, hh * 0.13, 17), '#FFFFFF', 0.4);     // gloss bar
  const [sx, sy] = P(hw * 0.56, -hh * 0.54);
  ellipse(t, sx, sy, 14, 14, '#FFFFFF', 0.75, 4);                           // specular dot
  if (glyph) {
    const seg = [[-41, -45, -23, 40], [-23, 40, 0, -13], [0, -13, 23, 40], [23, 40, 41, -45]]
      .map(q => q.map(v => v * gs));
    for (const [x0, y0, x1, y1] of seg) {
      const a = P(x0, y0 + 10), b = P(x1, y1 + 10);
      capsule(t, a[0], a[1], b[0], b[1], 20 * gs, pal.base, 0.55);
    }
    for (const [x0, y0, x1, y1] of seg) {
      const a = P(x0, y0 + 3), b = P(x1, y1 + 3);
      capsule(t, a[0], a[1], b[0], b[1], 17 * gs, '#FFF6E2');
    }
  }
}

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SPOTS, { recursive: true });

  { // === cycle_loop.png — ouroboros ring, serene mauve ========================
    // ROUND 4. The ring is CLOSED: one 66px tube at constant thickness all the
    // way round (ringStroke, no caps, no taper), so the tail runs straight
    // into the mouth and the silhouette at 20px is an unbroken ring with a
    // head bump. Round 3 tapered the tail to a point that stopped a gap short
    // of the jaw, and on the 20px cell that gap turned the mark into an open C
    // with a knob, the opposite of "the pattern continues". The head is a
    // teardrop 132px along the ring (a quarter of the frame) that breaks the
    // OUTER edge by 34px, filled a value step lighter than the tube with its
    // own 6px keyline (which is what says "a head lying on the body"); the
    // mouth is a short ink WEDGE notched into the head's outer edge at the
    // nose, never a break in the ring; and the eye is ONE solid dark dot 46px
    // across, over 1/12 frame (the ringed iris of round 3 mushed into the
    // knob). Lit crest upper-left, deep seat lower-right, one sheen.
    const cv = fresh();
    const cx = c, cy = c + 12, R = 138, TH = 66;
    const aH = -Math.PI / 3;                   // the head, 1 o'clock
    contactShadow(cv, cx + 10, cy + R + 48, R - 4, 22, 0.3);
    withOutline(cv, t => {
      // the closed tube: mid mauve, a lit crest upper-left, a deep seat along
      // the inner lower edge and a shaded outer edge lower-right
      ringStroke(t, cx, cy, R, TH, MAUVE.mid);
      arcStroke(t, cx, cy, R + 8, 26, 2.95, 4.65, MAUVE.hi);
      arcStroke(t, cx, cy, R + 14, 12, 3.30, 4.30, MAUVE.lite, 0.85);
      arcStroke(t, cx, cy, R - 12, 24, 0.15, 2.85, MAUVE.deep, 0.7);
      arcStroke(t, cx, cy, R + 12, 22, -0.30, 1.50, MAUVE.lo, 0.55);
      // the head: local u runs clockwise along the ring (the nose), v is
      // radially OUTWARD, so the teardrop's crown stands off the ring while its
      // inner edge stays inside the tube (the keyline never opens the ring)
      const P = rot(cx + Math.cos(aH) * R, cy + Math.sin(aH) * R, aH + Math.PI / 2);
      const H = (u, v) => P(u, -v);
      const head = [H(-66, 0), H(-60, 30), H(-40, 54), H(-10, 67), H(26, 65), H(52, 50),
        H(68, 24), H(72, 4), H(66, -16), H(48, -28), H(0, -30), H(-46, -27), H(-62, -14)];
      poly(t, grow(head, 6), INK, 0.9);
      poly(t, head, MAUVE.lite, 1, MAUVE.hi);
      // the mouth: a short ink wedge notched into the outer edge at the nose
      poly(t, [H(36, 22), H(44, 64), H(78, 22)], INK, 0.95);
      // one solid dark eye, high on the crown
      const [ex, ey] = H(-16, 26);
      ellipse(t, ex, ey, 23, 23, EYE.pupil, 1, 2);
    }, CHROME);
    sheen(cv, cx - 100, cy - 100, 30, 16, 0.5);
    save(cv, path.join(OUT, 'cycle_loop.png'));
  }

  { // === ledger_quill.png — quill standing in an inkpot ======================
    const cv = fresh();
    const px = c - 12, py = c + 122;                         // the pot's centre
    contactShadow(cv, px + 14, py + 92, 126, 24, 0.32);
    withOutline(cv, t => {
      // the quill: shaft from inside the pot's mouth up and to the right
      const nx0 = px + 6, ny0 = py - 44, tx1 = c + 184, ty1 = 44;
      const L = Math.hypot(tx1 - nx0, ty1 - ny0), ux = (tx1 - nx0) / L, uy = (ty1 - ny0) / L;
      const qx = -uy, qy = ux;                                          // left-hand normal
      const Q = (tt, s) => [nx0 + ux * tt + qx * s, ny0 + uy * tt + qy * s];
      const vane = [Q(84, 0), Q(112, -54), Q(180, -88), Q(268, -78), Q(L, -6), Q(L, 6), Q(290, 16), Q(200, 36), Q(136, 28), Q(96, 8)];
      poly(t, grow(vane, 8), INK, 0.92);
      poly(t, vane, FEATHER.hi, 1, FEATHER.lo);
      const s0 = Q(0, 0), s1 = Q(L - 10, 0);
      capsule(t, s0[0], s0[1], s1[0], s1[1], 20, INK, 0.92);
      capsule(t, s0[0], s0[1], s1[0], s1[1], 13, FEATHER.shaft, 0.95);  // the rachis
      // the pot: wide indigo glass, brass collar, a narrow neck
      roundRect(t, px, py + 8, 112, 76, 34, INKP.lit, 1, INKP.lo);      // glass body, lit at the shoulder
      roundRect(t, px, py - 60, 74, 22, 9, BR.hi, 1, BR.lo);            // brass collar
      capsule(t, px - 60, py - 68, px + 60, py - 68, 9, BR.lite, 0.8);
      roundRect(t, px, py - 40, 58, 14, 6, INKP.rim, 1, INKP.lo);       // neck
      ellipse(t, px, py - 72, 46, 9, INKP.lo, 1, 2);                    // the ink in the mouth
      roundRect(t, px - 72, py + 6, 14, 44, 7, INKP.gloss, 0.6);        // glass gloss
      capsule(t, px - 78, py + 66, px + 78, py + 66, 12, INKP.lo, 0.85);
    }, CHROME);
    sheen(cv, px - 62, py - 22, 14, 20, 0.5);
    sheen(cv, c + 26, c - 92, 22, 44, 0.3);
    save(cv, path.join(OUT, 'ledger_quill.png'));
  }

  { // === word_echo.png — a candy tile with a sound ripple at its corner ======
    // ROUND 4. The tile is exactly round 3's (theme_default voice, W face,
    // bevel, sheen upper-left, contact shadow), shifted down-left to make
    // room. The corner mark is now a SOUND RIPPLE: two concentric brass arcs
    // centred 14px outside the tile's upper-right corner, opening to the
    // upper right, each a 50px round-capped tube (1/10 frame), the inner at
    // radius 76 (~1/6 frame) and the outer at 150 (~1/3), with a 24px gap
    // between that the two contours fill with ink, so at 20px they read as two
    // bright stripes fanning off the corner. Each arc carries the shade below
    // (a mid-brass arc offset down-right) and a lit strip along its upper
    // reach, so the ripple has the family's value steps. Round 3's single fat
    // crescent ended in a rounded bulb and read as an orange ARROW (a "shift
    // the letter" move) at 48px and a banana hooked on the tile at 20px. No
    // bulb, no arrowhead, no stem: arcs only, never over the tile face; the
    // inner arc's near edge stands 40px off the tile keyline, which the two
    // contours bridge, so the mark and the tile are one silhouette.
    const cv = fresh();
    const hw = 90, hh = 80, lean = -4;
    const tx = c - 72, ty = c + 56;
    const L = (lean * Math.PI) / 180;
    const P = rot(tx, ty, L);
    contactShadow(cv, tx + 26, ty + hh + 70, 122, 24, 0.32);
    withOutline(cv, t => {
      const [kx, ky] = P(hw + 10, -hh - 10);           // the ripple's origin
      const aD = -0.72, a0 = aD - 0.63, a1 = aD + 0.63; // ~72 degrees, opening upper-right
      for (const r of [76, 150]) {
        arcStroke(t, kx + 6, ky + 7, r, 50, a0, a1, BR.mid);                    // the shade, down-right
        arcStroke(t, kx, ky, r, 50, a0, a1, BR.hi);                             // the arc
        arcStroke(t, kx - 3, ky - 4, r + 9, 14, a0 + 0.06, a1 - 0.50, BR.lite, 0.9); // the lit upper reach
      }
      candyTile(t, tx, ty, hw, hh, lean, PINK, true, 1.1);
    }, CHROME);
    sheen(cv, tx - 52, ty - 60, 22, 9, 0.45);
    save(cv, path.join(OUT, 'word_echo.png'));
  }

  { // === paper_plane.png — a folded paper dart in flight =====================
    // ROUND 2. Named correctly but flat at 20px on cream: the upper wing was
    // lighter than the parchment it sat on and the long thin wing and tail
    // starved the contour. The wing is now a tan-cream MID value (it clears
    // cream by value, not by contour), the keel two steps darker, and an ink
    // under-fold plane lies along the crease so the dart has three value steps
    // like its siblings. The dart is shorter (69% of the frame) with a wider
    // nose angle and a deep wing root, so its outline is the same 20px band as
    // the rest of the set all the way round the tip. Same tilt, no trail.
    const cv = fresh();
    const P = rot(c + 14, c - 34, -0.45);
    // local: nose to the right; T is the wing's back tip, M the fold, K the keel
    const N = P(180, 0), T = P(-150, -124), M = P(-96, 4), K = P(-130, 104);
    contactShadow(cv, c + 30, c + 152, 122, 18, 0.3);
    withOutline(cv, t => {
      poly(t, [N, M, K], DART.keelHi, 1, DART.keelLo);                   // the keel
      poly(t, [N, T, M], DART.wingHi, 1, DART.wingLo);                   // the upper wing
      const U = P(-96, 32);
      poly(t, [N, M, U], INK, 0.35);                                     // the under-fold plane
      capsule(t, N[0], N[1], M[0], M[1], 9, DART.crease, 0.75);          // the fold
      capsule(t, M[0], M[1], K[0], K[1], 8, DART.crease, 0.5);           // the keel's rear edge
      const Wm = P(-40, -40);
      capsule(t, N[0], N[1], Wm[0], Wm[1], 6, DART.crease, 0.25);        // a light wing crease
    }, CHROME);
    const sh = P(72, -26);
    sheen(cv, sh[0], sh[1], 30, 11, 0.5);
    save(cv, path.join(OUT, 'paper_plane.png'));
  }

  { // === spots/empty_house.png — rolled parchment scroll, twine, a pencil ====
    // ROUND 4. ONE anchored object in the parchment palette. The roll is a
    // horizontal tan-cream tube 280px long (the group spans ~73% of the frame
    // with the flap and the end cap), top-lit with a cream crown and a two-step
    // darker seat; its RIGHT end shows the rolled sheet's cross-section as a
    // lit disc 92px wide carrying a bold 11px wood-brown SPIRAL of 1.6 turns
    // round a dark hollow: the spiral is what says "scroll". ONE ochre twine
    // band near the centre under a simple knot with two short stubs (no bow,
    // no second band). At the LEFT end a short flat flap of the sheet peels
    // open on the ground under the roll and carries ONE bold blue-ink roofline
    // chevron 66px wide, the only blueprint cue (round 3's house glyph on a
    // steel-blue roll made a drum with a sticker). The carpenter's pencil lies
    // ON THE GROUND in front of the roll, rising slightly to the right, a
    // 54px warm-wood body with a lit top face, a dark cut end at the left, a
    // flat cream sharpened tip and a graphite point at the right, its point
    // overlapping the roll's lower-left; the flap, roll and pencil all touch
    // under one contour and share one contact shadow.
    const cv = fresh();
    const rx = c, ry = c - 22, RL = 140, RR = 78;
    contactShadow(cv, c + 4, 392, 196, 24, 0.32);
    withOutline(cv, t => {
      // the flap: a flat piece of the sheet peeled open at the left, lying
      // under the roll's left end, with the blue roofline on it
      const fl = rx - RL;
      poly(t, [[fl + 30, ry - 30], [fl - 84, ry - 30], [fl - 84, ry + 70], [fl + 30, ry + 70]], PARCH.hi, 1, PARCH.dim);
      capsule(t, fl - 75, ry + 44, fl - 42, ry - 6, 14, BLUEPRINT);
      capsule(t, fl - 42, ry - 6, fl - 9, ry + 44, 14, BLUEPRINT);
      // the roll: a horizontal tube, top-lit, a cream crown, a shaded seat
      poly(t, roundRectPts(rx, ry, RL, RR, 20, 0), SCROLL.hi, 1, SCROLL.lo);
      roundRect(t, rx, ry + RR - 12, RL - 6, 10, 5, SCROLL.seat, 0.7);
      roundRect(t, rx, ry - RR + 16, RL - 10, 9, 4, SCROLL.crown, 0.9);
      ellipse(t, rx - RL + 6, ry, 28, RR - 2, SCROLL.lo, 1, 2);                // the shaded far end
      // the near end: the rolled sheet's cross-section, a lit disc with a spiral
      const ex = rx + RL, ey = ry;
      ellipse(t, ex, ey, 46, RR + 2, INK, 0.9, 2);
      ellipse(t, ex, ey, 42, RR - 2, SCROLL.crown, 1, 2);
      spiral(t, ex, ey, 42 / 76, 7, 62, 1.6, 11, SCROLL.coil);
      ellipse(t, ex, ey, 7, 12, INK, 0.9, 2);                                    // the hollow
      // one twine band round the tube, a simple knot with two short stubs
      const bx = rx + 24;
      roundRect(t, bx, ry, 20, RR + 8, 8, INK, 0.9);
      roundRect(t, bx, ry, 14, RR + 5, 6, WOOD.light, 1, WOOD.dark);
      const ky = ry - RR - 8;
      for (const [dx, dy] of [[-40, -34], [38, -38]]) {
        capsule(t, bx, ky, bx + dx, ky + dy, 28, INK, 0.9);
        capsule(t, bx, ky, bx + dx, ky + dy, 18, WOOD.light);
      }
      roundRect(t, bx, ky, 26, 20, 9, INK, 0.9);
      roundRect(t, bx, ky - 2, 20, 15, 7, WOOD.light, 1, WOOD.base);
      // the pencil on the ground in front: a fat flat body rising to the
      // right, a lit top face, a dark cut end, a cream tip and a graphite point
      const pa = -0.16, PX = rot(c - 80, ry + 96, pa);
      const body = roundRectPts(...PX(0, 0), 100, 27, 6, pa);
      poly(t, grow(body, 6), INK, 0.92);
      poly(t, body, PENCIL.hi, 1, PENCIL.lo);
      poly(t, roundRectPts(...PX(0, -14), 96, 7, 3, pa), PENCIL.top, 0.85);    // the lit top face
      poly(t, [PX(-100, -27), PX(-100, 27), PX(-92, 27), PX(-92, -27)], PENCIL.end);   // the cut end
      const tip = [PX(98, -27), PX(98, 27), PX(142, 9), PX(142, -9)];
      poly(t, grow(tip, 5), INK, 0.92);
      poly(t, tip, PARCH.hi, 1, PARCH.shadow);
      const lead = [PX(140, -9), PX(140, 9), PX(164, 0)];
      poly(t, grow(lead, 5), INK, 0.92);
      poly(t, lead, PENCIL.lead);
    }, SPOT);
    sheen(cv, rx - 80, ry - 52, 46, 11, 0.45);
    save(cv, path.join(SPOTS, 'empty_house.png'));
  }
}

// Allow `node scripts/tools/gameIcons/chromeC.mjs` for a solo render.
if (process.argv[1] && process.argv[1].endsWith('chromeC.mjs')) draw();
