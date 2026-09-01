/**
 * shopIcons/finishes.mjs — Cosmetic Shop art for the 4 finish-led TILE THEMES
 * and the 6 MOVE SPARKS (10 icons, 192px = 64dp at @3x).
 *
 * These two families arrived after the first 48 icons and are sold on something
 * the older families never had to describe:
 *
 *   - A FINISH sells a MATERIAL, not a hue. `TILE_FINISHES` in
 *     src/theme/colors.ts repaints the bevel, gloss, specular, sweep, rim and
 *     speckle of every tile on the board, so what the player is buying is the
 *     way the tile's surface behaves in light. Each icon therefore shows a
 *     LETTER TILE — the product itself, echoing theme_default's fanned stack —
 *     rendered IN that material, and the four are told apart at 56dp by SURFACE
 *     BEHAVIOUR and INK COLOUR rather than by hue:
 *
 *       theme_beeswax    pressed wax   no gloss, no specular, soft big radius,
 *                                      matte honey planes, dark brown ink
 *       theme_glasswork  leaded glass  dark lead rim traced INSIDE the face and
 *                                      one narrow bright sweep that reads as
 *                                      light coming THROUGH, jewel hues, cream ink
 *       theme_mothwing   wing dust     near matte, pale dust palette, the only
 *                                      speckled finish, dark ink
 *       theme_obsidian   cut stone     near-black face, pale cut rim, a hard
 *                                      45-degree STAR GLINT instead of the round
 *                                      candy dot, lavender ink
 *
 *     SPECKLE SIZING IS DELIBERATELY WRONG-LOOKING AT FULL SIZE. A 192px icon is
 *     served at 56dp, a 0.29 scale: a speck under ~20px in the delivered PNG is
 *     gone. Moth-wing therefore carries SEVEN oversized specks rather than the
 *     three dozen fine ones the material would really have.
 *
 *   - A SPARK recolours the star burst that fires on every committed move, so
 *     the palette IS the product and all six icons are deliberately the same
 *     SUBJECT: one centred rosette of oversized star diamonds, the same
 *     halo-behind-core build `StarBurst` throws, held still. The confetti family
 *     learned the opposite lesson (nine palettes could not be nine copies of one
 *     object), but that was nine rows of *paper objects* where hue was the only
 *     difference; here the recoloured burst is literally the thing on sale, and
 *     six different objects would describe six different effects. They still get
 *     per-palette geometry — spin, diamond proportion, ring radius — so no two
 *     rosettes are the same picture.
 *
 * PALETTES ARE DUPLICATED BY HAND, ON PURPOSE, exactly as in themes.mjs: this is
 * a plain-Node generator and cannot import TypeScript. FINISH_PAL below is
 * copied from `CandyColors.tileColors` (the theme_beeswax / theme_glasswork /
 * theme_mothwing / theme_obsidian blocks) plus the `ink` of each TILE_FINISHES
 * entry, and SPARK_PAL from `SPARK_THEMES` plus `DEFAULT_SPARK_CORES` in
 * src/components/shop/ShopScreen.tsx. RETUNE A PALETTE IN colors.ts AND YOU MUST
 * RETUNE IT HERE, or the icon quietly stops describing the thing it sells.
 *
 * House doctrine (see _draw.mjs), three passes per subject: the contact shadow
 * and any soft bloom go down on `cv` BEFORE `withOutline` so light bleeding past
 * the silhouette is never contoured; the subject is drawn INSIDE `withOutline`
 * so it gets the thick warm-dark contour the whole set depends on; the white
 * sheen goes on `cv` afterwards so the specular sits over the contour. One
 * upper-left light. Outlines are INK, never #000. No Math.random anywhere —
 * every speck, facet and diamond comes from a literal table, so the PNGs are
 * byte-reproducible.
 *
 * TWO KIT GOTCHAS this file is built around:
 *   - `ellipse()` has NO gradTo. Its 7th argument is `soft`; a colour there
 *     yields a NaN alpha and draws nothing. Only `roundRect` and `poly` gradient.
 *   - Anything drawn at alpha <= 0.5 fails withOutline's seed test, so it is
 *     composited but never contoured. Every element here that must sit inside a
 *     subject is opaque AND geometrically inside it — the lead rim, the sweep,
 *     the specks and the glint are all inset well within the tile face, so none
 *     of them can hang outside the silhouette the contour draws.
 *
 * All coordinates are in the 384x384 supersample space (c = 192 is the centre);
 * each file is downsampled 2x to a 192px PNG.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  canvas, savePNG, down2, W, INK,
  roundRect, ellipse, poly, capsule,
  contactShadow, sheen, withOutline,
} from './_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui/shop');

// ---------------------------------------------------------------------------
// Palettes (duplicated from src/theme/colors.ts — see header note)
// ---------------------------------------------------------------------------

/**
 * The four finish-led themes. `face`/`edge` are entries of the theme's tile
 * palette (bg / border); `ink` is the finish's letter ink.
 */
const FINISH_PAL = {
  theme_beeswax: {
    face: '#E8C27A', edge: '#B99A5C',
    alt: '#D9AE63', altEdge: '#AB8749',
    hi: '#F2DCA6', ink: '#3E2C12',
  },
  theme_glasswork: {
    face: '#2F5FA8', edge: '#16305C',
    alt: '#8B2942', altEdge: '#4E1524',
    lead: '#120E1A', ink: '#FFF6E0',
  },
  theme_mothwing: {
    face: '#C9C4CE', edge: '#979298',
    alt: '#C4BCAE', altEdge: '#948D82',
    dust: '#443D38', bloom: '#F2EEE6', ink: '#2E2A26',
  },
  theme_obsidian: {
    face: '#221E2E', edge: '#12101A',
    alt: '#33284A', altEdge: '#1C1530',
    rim: '#A9B2DC', glint: '#EBF0FF', ink: '#DCD6EE',
  },
};

/** { bg, accent, halo } per spark, plus the free phase-aware default. */
const SPARK_PAL = {
  spark_default: { bg: '#FFD700', accent: '#FFFFFF', halo: '#C79A12' },
  spark_hearth: { bg: '#FFB347', accent: '#FFF0C8', halo: '#D4802A' },
  spark_pollen: { bg: '#D9E08A', accent: '#FFFDE0', halo: '#A8B054' },
  spark_saltgrain: { bg: '#DCEAF2', accent: '#FFFFFF', halo: '#8FA9B8' },
  spark_thread: { bg: '#E0C46A', accent: '#C0A8D8', halo: '#9E863C' },
  spark_ash: { bg: '#8C8790', accent: '#D9563F', halo: '#5A555E' },
};

// ---------------------------------------------------------------------------
// Local helpers (built only from the _draw.mjs primitives)
// ---------------------------------------------------------------------------

const RAD = d => (d * Math.PI) / 180;

/** Multiply a hex colour toward black (f<1) or toward white (f>1). */
function shade(colorHex, f) {
  const n = parseInt(colorHex.slice(1), 16);
  const ch = i => Math.max(0, Math.min(255, Math.round(((n >> i) & 255) * f)));
  const v = (ch(16) << 16) | (ch(8) << 8) | ch(0);
  return '#' + (v | 0x1000000).toString(16).slice(1).toUpperCase();
}

/** A ROTATED rounded rectangle as a point list for `poly` (which gradients). */
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

/** A four-point star diamond: half-length `long` along `angDeg`, `short` across. */
function diamondPts(cx, cy, long, short, angDeg) {
  const a = RAD(angDeg), ca = Math.cos(a), sa = Math.sin(a);
  const P = (u, v) => [cx + u * ca - v * sa, cy + u * sa + v * ca];
  return [P(-long, 0), P(0, -short), P(long, 0), P(0, short)];
}

// ---------------------------------------------------------------------------
// THE FINISH FAMILY — one letter tile, four materials
// ---------------------------------------------------------------------------

/**
 * One letter tile of a finish stack, wearing the game's own tile anatomy: a
 * dark keyline so tiles stay separate inside the stack's single contour, two
 * offset copies of the face below it for a real extruded thickness, then the
 * face — and then whatever the MATERIAL does to that face, handed in as
 * `surface(t, P, RR, hw, hh)`.
 *
 * `P(lx, ly)` maps tile-local coordinates to the canvas; `RR(lx, ly, w, h, rad)`
 * returns a rotated rounded-rect point list at a tile-local offset. Every
 * material paints through those two, so a speck, a rim or a glint can only ever
 * land inside the face it belongs to.
 */
function finishTile(t, cx, cy, hw, hh, angDeg, face, edge, rad, surface) {
  const ang = RAD(angDeg), ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (lx, ly) => [cx + lx * ca - ly * sa, cy + lx * sa + ly * ca];
  const RR = (lx, ly, w, h, r) => roundRectPts(...P(lx, ly), w, h, r, ang);

  poly(t, RR(0, 18, hw + 9, hh + 26, rad + 8), INK);            // keyline
  poly(t, RR(0, 36, hw, hh, rad), shade(edge, 0.54));           // base plane
  poly(t, RR(0, 18, hw, hh, rad), edge);                        // side plane
  poly(t, RR(0, 0, hw, hh, rad), face);                         // face
  if (surface) surface(t, P, RR, hw, hh);
}

/** The W the front tile carries, in the finish's own ink. Tile-local. */
function letterW(t, P, s, ink) {
  const seg = [[-38, -42, -21, 37], [-21, 37, 0, -12], [0, -12, 21, 37], [21, 37, 38, -42]];
  for (const [x0, y0, x1, y1] of seg) {                          // ink's own shadow
    const a = P(x0 * s, (y0 + 9) * s), b = P(x1 * s, (y1 + 9) * s);
    capsule(t, a[0], a[1], b[0], b[1], 18 * s, shade(ink, 0.55), 0.5);
  }
  for (const [x0, y0, x1, y1] of seg) {
    const a = P(x0 * s, y0 * s), b = P(x1 * s, y1 * s);
    capsule(t, a[0], a[1], b[0], b[1], 16 * s, ink);
  }
}

/** Shared closer for the finish family: bloom, subject in its contour, sheen. */
function finishIcon(name, bloom, draw, gleam) {
  const { cv, c } = canvas();
  if (bloom) ellipse(cv, c + bloom[0], c + bloom[1], bloom[2], bloom[3], bloom[4], bloom[5], 70);
  contactShadow(cv, c + 14, c + 158, 124, 21, 0.3);
  withOutline(cv, t => draw(t, c), { width: 9 });
  if (gleam) sheen(cv, c + gleam[0], c + gleam[1], gleam[2], gleam[3], gleam[4]);
  savePNG(path.join(OUT, `${name}.png`), W, W, down2(cv, W, W));
}

// --- beeswax: pressed wax, matte, soft-edged -------------------------------
// The gloss bar and the specular dot are simply ABSENT (that is the finish), so
// the tile has to carry itself on two broad matte planes and a very generous
// corner radius. The one highlight is a wide low-contrast crown over the top
// third, opaque, hard-edged where it meets the face — wax takes a soft edge and
// a hard step, never a shine.
function drawBeeswax(t, c) {
  const p = FINISH_PAL.theme_beeswax;
  finishTile(t, c + 78, c + 18, 66, 80, 15, p.alt, p.altEdge, 34, (tt, P, RR, hw, hh) => {
    poly(tt, RR(0, -hh * 0.42, hw - 8, hh * 0.5, 28), shade(p.alt, 1.05));
  });
  finishTile(t, c - 32, c - 24, 88, 104, -6, p.face, p.edge, 38, (tt, P, RR, hw, hh) => {
    poly(tt, RR(0, -hh * 0.44, hw - 10, hh * 0.48, 30), p.hi);     // matte crown
    poly(tt, RR(0, hh * 0.52, hw - 14, hh * 0.24, 22), shade(p.face, 0.86), 0.9);
    letterW(tt, P, 1.06, p.ink);
  });
}

// --- glasswork: jewel panes in dark leading --------------------------------
// The lead is traced INSIDE the face — face, then an opaque dark ring inset 8,
// then the face again inset 20 — so the came reads as part of the pane instead
// of thickening the silhouette. The sweep is one narrow opaque bar tilted off
// the tile's own angle, short enough to sit wholly within the inner pane: light
// crossing the glass, not sliding along its front.
function drawGlasswork(t, c) {
  const p = FINISH_PAL.theme_glasswork;
  const pane = (deep, shallow) => (tt, P, RR, hw, hh) => {
    poly(tt, RR(0, 0, hw - 8, hh - 8, 20), p.lead);                // lead came
    poly(tt, RR(0, 0, hw - 19, hh - 19, 14), deep, 1, shallow);    // the pane itself
  };
  finishTile(t, c + 78, c + 18, 66, 80, 15, p.alt, p.altEdge, 22,
    (tt, P, RR, hw, hh) => {
      pane(shade(p.alt, 1.18), shade(p.alt, 0.72))(tt, P, RR, hw, hh);
      poly(tt, roundRectPts(...P(-6, 0), 11, hh * 0.5, 10, RAD(15 + 24)), '#FFE9C8', 0.95);
    });
  finishTile(t, c - 32, c - 24, 88, 104, -6, p.face, p.edge, 24,
    (tt, P, RR, hw, hh) => {
      pane(shade(p.face, 1.2), shade(p.face, 0.66))(tt, P, RR, hw, hh);
      // ONE narrow, very bright sweep: the finish's whole tell.
      poly(tt, roundRectPts(...P(-16, 0), 23, hh * 0.62, 20, RAD(-6 + 22)), '#CFE4FF', 0.5);
      poly(tt, roundRectPts(...P(-16, 0), 11, hh * 0.58, 10, RAD(-6 + 22)), '#FBFDFF', 0.92);
      letterW(tt, P, 1.02, p.ink);
    });
}

// --- mothwing: pale dust, the only speckled finish -------------------------
// Seven specks, all of them absurdly large for the material and none of them
// smaller than ~20px in the delivered PNG, because anything finer is a uniform
// grey wash at 56dp. Two are pale bloom rather than dust, which is what stops
// the scatter reading as damage.
function drawMothwing(t, c) {
  const p = FINISH_PAL.theme_mothwing;
  const SPECKS = [
    [-58, -74, 22, 0], [44, -62, 13, 1], [-62, -6, 16, 0],
    [60, 4, 20, 0], [-44, 66, 11, 1], [10, 80, 18, 0], [64, 58, 9, 0],
  ];
  finishTile(t, c + 78, c + 18, 66, 80, 15, p.alt, p.altEdge, 24, (tt, P, RR, hw, hh) => {
    poly(tt, RR(0, -hh * 0.44, hw - 8, hh * 0.46, 20), shade(p.alt, 1.08));
    for (const [lx, ly, r] of [[-14, -30, 18], [24, 26, 12], [-30, 44, 9]]) {
      const [sx, sy] = P(lx, ly);
      ellipse(tt, sx, sy, r, r, p.dust, 0.85, 3);
    }
  });
  finishTile(t, c - 32, c - 24, 88, 104, -6, p.face, p.edge, 26, (tt, P, RR, hw, hh) => {
    poly(tt, RR(0, -hh * 0.45, hw - 10, hh * 0.46, 22), shade(p.face, 1.07));
    letterW(tt, P, 1.02, p.ink);
    for (const [lx, ly, r, pale] of SPECKS) {
      const [sx, sy] = P(lx, ly);
      ellipse(tt, sx, sy, r, r, pale ? p.bloom : p.dust, pale ? 0.95 : 0.8, 3);
    }
  });
}

// --- obsidian: cut stone with a hard star glint ----------------------------
// No round candy dot anywhere: the specular is a four-armed 45-degree glint,
// two crossed diamonds and a hot core, which is the one specular shape in the
// whole shop that is not an ellipse. The pale cut rim is an opaque line inset
// inside the face, and one flat cold facet plane crosses the upper-left corner
// so the near-black body still has a value structure at 56dp.
function drawObsidian(t, c) {
  const p = FINISH_PAL.theme_obsidian;
  const cutRim = (tt, RR, hw, hh) => {
    poly(tt, RR(0, 0, hw - 9, hh - 9, 20), p.rim, 0.7);
    poly(tt, RR(0, 0, hw - 15, hh - 15, 16), p.face, 1, shade(p.face, 0.7));
  };
  finishTile(t, c + 78, c + 18, 66, 80, 15, p.alt, p.altEdge, 22, (tt, P, RR, hw, hh) => {
    cutRim(tt, RR, hw, hh);
    poly(tt, [P(-hw + 20, -hh + 22), P(6, -hh + 22), P(-hw + 20, 4)], '#3D3660', 0.9);
  });
  finishTile(t, c - 32, c - 24, 88, 104, -6, p.face, p.edge, 24, (tt, P, RR, hw, hh) => {
    cutRim(tt, RR, hw, hh);
    poly(tt, [P(-hw + 22, -hh + 26), P(14, -hh + 26), P(-hw + 22, 12)], '#463E70');  // cold facet
    poly(tt, [P(hw - 24, hh - 30), P(hw - 24, -6), P(-4, hh - 30)], '#171425');      // dark facet
    letterW(tt, P, 1.02, p.ink);
    // The glint is inset well inside the face: a 45-degree diamond of half-length
    // L reaches 0.707*L in BOTH axes, so these numbers are chosen to keep every
    // arm inside the cut rim rather than hanging out over the contour.
    const [gx, gy] = P(-34, -50);                                   // the star glint
    poly(tt, diamondPts(gx, gy, 54, 12, 45), p.glint, 0.5);
    poly(tt, diamondPts(gx, gy, 54, 12, -45), p.glint, 0.5);
    poly(tt, diamondPts(gx, gy, 38, 9, 45), p.glint);
    poly(tt, diamondPts(gx, gy, 38, 9, -45), p.glint);
    ellipse(tt, gx, gy, 14, 14, '#FFFFFF', 0.95, 4);
  });
}

// ---------------------------------------------------------------------------
// THE SPARK FAMILY — one rosette of star diamonds, six palettes
//
// Six or seven diamonds at 24-40px in the delivered PNG, overlapped into a
// single fused mass: a dozen small ones is grit at 56dp. Each diamond is built
// the way StarBurst builds one — an opaque halo rim under a brighter core —
// and alternates core/accent around the ring exactly as the shop's own preview
// strip does from combo tier 2 up.
// ---------------------------------------------------------------------------

/** Per-palette geometry so no two rosettes are the same picture. */
const SPARK_SHAPE = {
  spark_default: { spin: 0, long: 64, short: 40, R: 102, mid: 66 },
  spark_hearth: { spin: 14, long: 68, short: 46, R: 98, mid: 70 },
  spark_pollen: { spin: 30, long: 60, short: 43, R: 100, mid: 64 },
  spark_saltgrain: { spin: 8, long: 55, short: 47, R: 96, mid: 62 },
  spark_thread: { spin: 22, long: 72, short: 36, R: 104, mid: 60 },
  spark_ash: { spin: 38, long: 63, short: 41, R: 99, mid: 68 },
};

/** One star diamond: ink keyline, halo rim, bright core, one lit chip. */
function sparkDiamond(t, x, y, long, short, ang, core, halo) {
  poly(t, diamondPts(x, y, long + 5, short + 5, ang), INK);
  poly(t, diamondPts(x, y, long, short, ang), halo, 1, shade(halo, 0.66));
  poly(t, diamondPts(x, y, long * 0.66, short * 0.62, ang), core, 1, shade(core, 0.78));
  poly(t, diamondPts(x - short * 0.1, y - short * 0.22, long * 0.32, short * 0.26, ang),
    shade(core, 1.22), 0.85);
}

function drawRosette(t, c, pal, sh) {
  const ring = [0, 1, 2, 3, 4, 5].map(i => sh.spin - 90 + i * 60);
  for (let i = 0; i < 6; i++) {                                   // the six outer points
    const a = ring[i], rr = RAD(a);
    const scale = i % 3 === 1 ? 0.88 : 1;
    sparkDiamond(t, c + Math.cos(rr) * sh.R, c + Math.sin(rr) * sh.R,
      sh.long * scale, sh.short * scale, a,
      i % 2 === 1 ? pal.accent : pal.bg, pal.halo);
  }
  // The centre diamond is drawn LAST and carries the accent, so the mass reads
  // as one body with a hot middle rather than six petals meeting at a seam.
  sparkDiamond(t, c, c, sh.mid, sh.mid * 0.74, sh.spin - 90, pal.accent, pal.halo);
  poly(t, diamondPts(c - 5, c - 7, sh.mid * 0.3, sh.mid * 0.24, sh.spin - 90),
    '#FFFFFF', 0.8);
}

function sparkIcon(name) {
  const pal = SPARK_PAL[name], sh = SPARK_SHAPE[name];
  const { cv, c } = canvas();
  ellipse(cv, c, c - 4, 156, 156, pal.halo, 0.22, 76);            // the burst's own bloom
  contactShadow(cv, c + 6, c + 168, 92, 15, 0.26);
  withOutline(cv, t => drawRosette(t, c, pal, sh), { width: 9 });
  sheen(cv, c - 58, c - 60, 24, 15, 0.42);
  savePNG(path.join(OUT, `${name}.png`), W, W, down2(cv, W, W));
}

// ---------------------------------------------------------------------------

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });

  // ==== TILE FINISHES =======================================================
  finishIcon('theme_beeswax', null, drawBeeswax, [-72, -68, 26, 14, 0.3]);
  finishIcon('theme_glasswork', [-14, -12, 168, 168, '#7FA8E8', 0.2], drawGlasswork,
    [-74, -70, 24, 13, 0.4]);
  finishIcon('theme_mothwing', null, drawMothwing, [-74, -70, 26, 14, 0.34]);
  finishIcon('theme_obsidian', [-16, -14, 158, 158, '#6E76B8', 0.18], drawObsidian,
    [-78, -76, 20, 11, 0.3]);

  // ==== MOVE SPARKS =========================================================
  for (const name of ['spark_default', 'spark_hearth', 'spark_pollen',
    'spark_saltgrain', 'spark_thread', 'spark_ash']) sparkIcon(name);
}
