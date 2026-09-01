/**
 * shopIcons/themes.mjs — Cosmetic Shop art for the 9 tile themes + 9 confetti
 * palettes (18 icons, 192px = 64dp at @3x).
 *
 * Each tile-theme icon is drawn IN ITS OWN PALETTE, so the picture doubles as a
 * read of exactly what the player is buying: the Ember coals really are the
 * ember tile colours, the Between-signals set really is the static greys with
 * that one cold blue.
 *
 * PALETTES ARE DUPLICATED BY HAND, ON PURPOSE. TILE_PAL below is copied from
 * `TILE_THEMES` and `CandyColors.tileColors` in src/theme/colors.ts, and
 * CONFETTI_PAL from `CONFETTI_THEMES` in the same file plus `DEFAULT_CONFETTI`
 * in src/components/shop/ShopScreen.tsx. This is a plain-Node generator and
 * cannot import TypeScript, so THE TWO MUST BE UPDATED TOGETHER: retune a
 * palette in colors.ts without retuning it here and the shop icon quietly stops
 * describing the thing it is selling.
 *
 * ---------------------------------------------------------------------------
 * SECOND PASS, after a blind review graded the first one against the shipped
 * assets/ui set. The verdict was that this family was coherent with itself but
 * was not the same set as the shipped art, and that a third of it collapsed at
 * 56dp — the size a shop row actually renders. Five rules now govern every
 * icon here, and they are the reason the code looks the way it does:
 *
 *   1. ONE centred silhouette per tile. No satellite elements orbiting a
 *      subject; nothing that reads as debris when the tile shrinks.
 *   2. Every subject is wrapped in `withOutline` for a thick warm-dark contour.
 *      That contour is what lets a pale subject survive an ash row and a dark
 *      subject survive a cream one — the first pass had gradients but no
 *      silhouette, and gradients are the first thing to go at 56dp.
 *   3. Two or three BIG value steps. No smooth-only modelling.
 *   4. No repeated micro-texture. Where the first pass had a lattice, a grate,
 *      a tick strip or a bead ring, there are now two or three OVERSIZED
 *      instances of the same idea.
 *   5. Mass fills ~70-80% of the box, composed vertically. Nothing in the
 *      shipped set is a wide rail with things hanging off it.
 *
 * THIRD PASS, after three directors graded the second one — two at true 56dp
 * delivery size, one on craft at full size against the shipped set. Four tiles
 * were named and only those four were touched:
 *
 *   - the NINE CONFETTI ICONS, which the second pass had collapsed into one
 *     shared striped cone worn in nine palettes. That fixed the silhouette and
 *     created a worse fault: nine of the shop's forty-eight tiles were the same
 *     object, and the two violet-and-gold palettes could not be told apart at
 *     56dp at all. Each palette now has its OWN subject — see THE CONFETTI
 *     FAMILY below — and the family coheres through drawing language instead.
 *   - theme_static, a steel-and-cyan machine panel among hearth props. It is
 *     now a valve radio in a wooden cabinet: warm object, cold signal.
 *   - theme_patron, whose gem was airbrushed rather than cut and floated in a
 *     notch. Six flat facet planes now, seated on its plinth.
 *   - theme_default, three flat cards in the coolest palette on the sheet. The
 *     tiles are extruded objects now, drawn from the palette's warm members.
 * ---------------------------------------------------------------------------
 *
 * House doctrine, three passes per subject: contact shadow (drawn BEFORE the
 * outline so it is not contoured), the top-lit body inside `withOutline`, then
 * a white sheen at the UPPER-LEFT drawn after, so the specular sits on top of
 * the contour. One light source for the whole set. Outlines are INK, never
 * #000. No Math.random anywhere — every blade, pleat, coal and fringe strand
 * comes from a literal table, so the PNGs are byte-reproducible.
 *
 * KIT GOTCHA worth remembering: `ellipse()` takes (…, color, alpha, soft) and
 * has NO gradTo argument. Passing a colour as its 7th parameter yields a NaN
 * alpha and silently draws nothing. Only `roundRect` and `poly` gradient. A
 * gradient-filled circle is therefore `roundRect(..., r, r, r, a, 1, b)`.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  canvas, savePNG, down2, W, INK, WOOD, BRASS,
  roundRect, ellipse, poly, capsule, arcStroke, tri, flameLobe,
  contactShadow, sheen, withOutline,
} from './_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui/shop');

// ---------------------------------------------------------------------------
// Palettes (duplicated from src/theme/colors.ts — see header note)
// ---------------------------------------------------------------------------

/** [bg, border] pairs, entries 0..5 of each TilePalette. */
const TILE_PAL = {
  theme_default: [['#FF6B9D', '#D44D7A'], ['#C44DFF', '#9933CC'], ['#4DAFFF', '#2E8BC0'],
    ['#4DE8C2', '#2EAF8E'], ['#FFD84D', '#CCB030'], ['#FF8C4D', '#CC6633']],
  theme_ember: [['#FF8A5B', '#CC6B43'], ['#FF6B4A', '#CC5238'], ['#E8543A', '#B5402C'],
    ['#FFB259', '#CC8C43'], ['#D94F3D', '#A93C2E'], ['#FFA24D', '#CC803B']],
  theme_tide: [['#3FB6C9', '#2E8895'], ['#4D8FE8', '#3A6FB5'], ['#45999B', '#327173'],
    ['#6A7FD8', '#5263A8'], ['#4FB0E0', '#3B86A9'], ['#3FC2B0', '#2E9486']],
  theme_bone: [['#C9BFB0', '#978F82'], ['#B8A99A', '#8A7D70'], ['#A9B0A6', '#7F857C'],
    ['#C2B2A0', '#918578'], ['#B0A6B2', '#847C86'], ['#C4B8AE', '#938A82']],
  theme_verdant: [['#4FB86B', '#3B8A50'], ['#6BC46A', '#509450'], ['#3FA07D', '#2E785E'],
    ['#8CBF57', '#6A9142'], ['#5FBF9A', '#479174'], ['#3E8E63', '#2E6B4A']],
  theme_static: [['#8E9296', '#6A6E72'], ['#7B8288', '#5C6166'], ['#9AA0A8', '#73787E'],
    ['#6E747C', '#52575D'], ['#5A9FB5', '#437788'], ['#9BA6AE', '#747D83']],
  theme_sovereign: [['#5A3E8E', '#412D68'], ['#6E4AA5', '#503678'], ['#C9A227', '#98791D'],
    ['#4A3575', '#352655'], ['#7D5BB8', '#5C4388'], ['#B08A2E', '#856822']],
  theme_patron: [['#FFD479', '#CCA85B'], ['#F5C04D', '#C4993D'], ['#FFCB6B', '#CCA255'],
    ['#E8B44A', '#B58F3A'], ['#FFD98A', '#CCAE6E'], ['#E0A840', '#B38633']],
  theme_eclipse: [['#5B4A8A', '#3E3260'], ['#7A3F6B', '#552B4A'], ['#46407A', '#2F2B55'],
    ['#8A3F4F', '#602B37'], ['#5246A0', '#372F70'], ['#9C4A56', '#6E343D']],
};

/** Flat 6-colour confetti palettes. */
const CONFETTI_PAL = {
  confetti_default: ['#FF6B9D', '#C44DFF', '#4DAFFF', '#FFD84D', '#4DE8C2', '#FF8C4D'],
  confetti_gold: ['#FFD479', '#F5C04D', '#FFE6A8', '#E8B44A', '#FFCB6B', '#FFFFFF'],
  confetti_dusk: ['#9B7FCF', '#6B5B8A', '#C3A6E0', '#7E6BA8', '#B49AD8', '#E8DCF5'],
  confetti_ember: ['#FF8A5B', '#E8543A', '#FFB259', '#D94F3D', '#FF7E79', '#FFD0A0'],
  confetti_verdant: ['#6BC46A', '#3FA07D', '#8CBF57', '#4C9E52', '#B9E4A8', '#E8F5DC'],
  confetti_sovereign: ['#7D5BB8', '#5A3E8E', '#C9A227', '#63449A', '#B08A2E', '#E8DCF5'],
  confetti_eclipse: ['#7A5CC8', '#B45096', '#D75F6E', '#5F58B9', '#A055B9', '#E8DCF5'],
  confetti_supporter: ['#F2B24E', '#C9902A', '#8E6BC4', '#E8A33D', '#B07EDB', '#FBE7C6'],
  confetti_season: ['#37A99E', '#0A8F82', '#E8A33D', '#C79A2E', '#D96A7E', '#EFE7D0'],
};

// ---------------------------------------------------------------------------
// Local shape helpers (built only from the _draw.mjs primitives)
// ---------------------------------------------------------------------------

/** Multiply a hex colour toward black (f<1) or white-ish (f>1). Deterministic. */
function shade(colorHex, f) {
  const n = parseInt(colorHex.slice(1), 16);
  const ch = i => Math.max(0, Math.min(255, Math.round(((n >> i) & 255) * f)));
  const v = (ch(16) << 16) | (ch(8) << 8) | ch(0);
  return '#' + (v | 0x1000000).toString(16).slice(1).toUpperCase();
}

/** An elliptical ring stroke, walked as short capsules (arcStroke is circular only). */
function ellipseRing(cv, cx, cy, rx, ry, th, color, alpha = 1, steps = 96) {
  let px = cx + rx, py = cy;
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    capsule(cv, px, py, x, y, th, color, alpha);
    px = x; py = y;
  }
}

/**
 * A ROTATED rounded rectangle as a point list, for `poly` (which gradients;
 * `roundRect` does, but only axis-aligned). Needed for the fanned candy tiles:
 * three tiles at three angles is what stops the theme_default stack from
 * reading as a certain word-processor's logo.
 */
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

/** A leaf outline: quadratic spine from base to tip, widest at mid. */
function leafPts(bx, by, tx, ty, width, bend, steps = 20) {
  const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const cx = (bx + tx) / 2 + nx * bend, cy = (by + ty) / 2 + ny * bend;
  const up = [], dn = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    const sx = u * u * bx + 2 * u * t * cx + t * t * tx;
    const sy = u * u * by + 2 * u * t * cy + t * t * ty;
    const w = (width / 2) * Math.pow(Math.sin(Math.PI * t), 0.7);
    up.push([sx + nx * w, sy + ny * w]);
    dn.push([sx - nx * w, sy - ny * w]);
  }
  return up.concat(dn.reverse());
}

/** A tapered vessel body (top wider or narrower than base). */
const taperPts = (cx, topY, botY, topHW, botHW) => [
  [cx - topHW, topY], [cx + topHW, topY], [cx + botHW, botY], [cx - botHW, botY],
];

/** The filled part of a circle below a flat waterline. */
function waterPts(cx, cy, r, waterY, steps = 44) {
  const dyv = Math.max(-r + 1, Math.min(r - 1, waterY - cy));
  const hw = Math.sqrt(Math.max(1, r * r - dyv * dyv));
  const a0 = Math.atan2(dyv, hw), a1 = Math.PI - a0;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/**
 * One candy letter tile of the theme_default stack, wearing the game's OWN tile
 * chrome: the darker edge slab below (LetterTile's `tileEdge`), a bevel plane
 * over the top half (`bevelTop`), the glossy shine bar (`glossyShine`) and the
 * upper-right specular dot (`specularDot`). Rotated, because a fanned stack
 * cannot be mistaken for three flat overlapping rounded squares.
 *
 * THIRD PASS: the tile is now EXTRUDED, not printed. The second draft drew a
 * face with a 20px lip under it and a single gloss sweep, and read as three
 * flat cards rather than three objects. The face is now stacked on two offset
 * copies of itself — a mid side plane and a dark base plane — so the tile has a
 * visible thickness, and the bevel is an opaque lighter PLANE instead of a
 * translucent white wash, so the face carries hard value steps rather than a
 * smooth gradient.
 */
function candyTile(t, cx, cy, hw, hh, angDeg, pal, glyph = false) {
  const ang = (angDeg * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (lx, ly) => [cx + lx * ca - ly * sa, cy + lx * sa + ly * ca];
  const RR = (lx, ly, w, h, rad) => roundRectPts(...P(lx, ly), w, h, rad, ang);

  // Its own dark keyline, so tiles stay separate inside the stack's one contour.
  poly(t, RR(0, 18, hw + 9, hh + 25, 26), INK);
  poly(t, RR(0, 34, hw, hh, 22), shade(pal[1], 0.54));                        // base plane
  poly(t, RR(0, 17, hw, hh, 22), pal[1]);                                     // side plane
  poly(t, RR(0, 0, hw, hh, 22), pal[0]);                                      // face, flat
  poly(t, RR(0, -hh * 0.46, hw - 6, hh * 0.54, 20), shade(pal[0], 1.16));     // bevel plane
  poly(t, RR(0, -hh * 0.62, hw * 0.76, hh * 0.13, 13), '#FFFFFF', 0.4);       // gloss bar
  const [sx, sy] = P(hw * 0.56, -hh * 0.54);
  ellipse(t, sx, sy, 11, 11, '#FFFFFF', 0.75, 4);                             // specular dot
  if (glyph) {
    const seg = [[-31, -34, -17, 30], [-17, 30, 0, -10], [0, -10, 17, 30], [17, 30, 31, -34]];
    for (const [x0, y0, x1, y1] of seg) {
      const a = P(x0, y0 + 8), b = P(x1, y1 + 8);
      capsule(t, a[0], a[1], b[0], b[1], 15, shade(pal[1], 0.62), 0.55);
    }
    for (const [x0, y0, x1, y1] of seg) {
      const a = P(x0, y0 + 2), b = P(x1, y1 + 2);
      capsule(t, a[0], a[1], b[0], b[1], 13, '#FFF6E2');
    }
  }
}

// ---------------------------------------------------------------------------
// THE CONFETTI FAMILY — NINE DIFFERENT OBJECTS, one per palette.
//
// THIRD PASS. The second pass solved silhouette by giving all nine confetti
// icons ONE shared object (a striped popper cone) in nine palettes. Graded
// against the shipped set that traded one fault for a worse one: nine of the
// shop's forty-eight tiles were the same object in different hues — a
// repetition the shipped art never makes once — and at 56dp the two icons whose
// palettes overlap (sovereign and supporter, both violet-and-gold) were not
// tellable apart at all, because the only thing distinguishing them was hue.
//
// So each palette now gets its OWN subject, and the family coheres the way the
// rest of the shop does: through drawing language, not through being the same
// picture. Every one of the nine is a paper-or-ribbon celebration object, one
// centred mass, the same 9px contour, the same upper-left light, the same
// contact shadow — and every one has a silhouette no other tile in the shop
// owns:
//
//   default    pinwheel   notched whirl on a stick — six blades, six hues
//   gold       ribbon bow two loops, a knot, two notched tails
//   dusk       paper fan  a pleated wedge on a wooden rivet
//   ember      tassel     cord loop, bead cap, flared fringe
//   verdant    kite       diamond with a waving ribbon tail
//   sovereign  coin pouch cinched neck, three coins spilling at the mouth
//   eclipse    firework   a lobed bloom around a hot core
//   supporter  spool      wound ribbon between two flanges, tail spilling
//   season     banner     a swallow-tail flag on a crossbar, three bands
//
// The loose pieces are absorbed: the pouch's coins overlap its mouth, the
// kite's tail leaves its spine, the spool's tail runs out from behind a flange.
// Nothing orbits. Every part is 25px+ in the delivered 192px PNG (~8px at
// 56dp), so nothing degrades into the grit the first pass produced.
// ---------------------------------------------------------------------------

/** A teardrop lobe: base at (bx,by), tip `len` away along `ang`, max width `wid`. */
function petalPts(bx, by, ang, len, wid, steps = 18) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (u, v) => [bx + u * ca - v * sa, by + u * sa + v * ca];
  const up = [], dn = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const w = (wid / 2) * Math.sin(Math.PI * Math.pow(t, 0.78));
    up.push(P(len * t, w)); dn.push(P(len * t, -w));
  }
  return up.concat(dn.reverse());
}

/** A ribbon of varying thickness following a sampled path. */
function ribbonPts(pts, wAt) {
  const up = [], dn = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L, w = wAt(i / (pts.length - 1)) / 2;
    up.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    dn.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return up.concat(dn.reverse());
}

/** A straight ribbon tail from (x0,y0) along `ang`, ending in a swallow notch. */
function tailPts(x0, y0, ang, len, w0, w1) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (u, v) => [x0 + u * ca - v * sa, y0 + u * sa + v * ca];
  return [P(0, -w0 / 2), P(len * 0.5, -w1 * 0.62), P(len, -w1 / 2),
    P(len - w1 * 0.62, 0), P(len, w1 / 2), P(len * 0.5, w1 * 0.62), P(0, w0 / 2)];
}

/** One pinwheel blade: straight leading edge out to the rim, curved trailing edge home. */
function bladePts(cx, cy, a0, sweep, R, rHub, steps = 14) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {          // rim arc, leading edge first
    const a = a0 + (sweep * i) / steps;
    pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
  }
  for (let i = 1; i <= steps; i++) {          // curl back into the hub
    const t = i / steps;
    const a = a0 + sweep - sweep * 0.9 * t;
    const r = R - (R - rHub) * Math.pow(t, 0.62);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** A circular sector (pivot + rim arc), for fan pleats. */
function sectorPts(cx, cy, r0, r1, a0, a1, steps = 16) {
  const pts = [];
  for (let i = 0; i <= steps; i++) pts.push([cx + Math.cos(a0 + ((a1 - a0) * i) / steps) * r1,
    cy + Math.sin(a0 + ((a1 - a0) * i) / steps) * r1]);
  for (let i = steps; i >= 0; i--) pts.push([cx + Math.cos(a0 + ((a1 - a0) * i) / steps) * r0,
    cy + Math.sin(a0 + ((a1 - a0) * i) / steps) * r0]);
  return pts;
}

const RAD = d => (d * Math.PI) / 180;

/** Shared closer: contact shadow, subject inside its contour, upper-left sheen. */
function confettiIcon(name, draw, shadow, gleam) {
  const { cv, c } = canvas();
  contactShadow(cv, c + shadow[0], c + shadow[1], shadow[2], shadow[3], 0.3);
  withOutline(cv, t => draw(t, c), { width: 9 });
  sheen(cv, c + gleam[0], c + gleam[1], gleam[2], gleam[3], gleam[4] ?? 0.45);
  savePNG(path.join(OUT, `${name}.png`), W, W, down2(cv, W, W));
}

// --- default: a pinwheel, one blade per palette colour --------------------
function drawPinwheel(t, c, p) {
  const hx = c, hy = c - 34, R = 138, rHub = 30;
  capsule(t, hx + 8, hy, hx + 14, c + 150, 30, WOOD.base);        // stick, behind
  capsule(t, hx + 6, hy, hx + 10, c + 60, 16, WOOD.rim, 0.55);
  for (let i = 0; i < 6; i++) {
    const a0 = RAD(-96 + i * 60), cc = p[i];
    poly(t, bladePts(hx, hy, a0, RAD(58), R, rHub), cc, 1, shade(cc, 0.66));
    poly(t, bladePts(hx, hy, a0 + RAD(6), RAD(24), R - 16, rHub + 14),
      shade(cc, 1.24), 0.75);                                     // one lit plane per blade
  }
  ellipse(t, hx, hy, 40, 40, shade(p[3], 0.55));                  // hub
  ellipse(t, hx, hy - 3, 30, 30, shade(p[3], 1.18));
  ellipse(t, hx - 10, hy - 11, 12, 10, '#FFFFFF', 0.7, 5);
}

// --- gold: a ribbon bow ----------------------------------------------------
function drawBow(t, c, p) {
  const kx = c, ky = c - 16;
  for (const [dx, ang, cc] of [[-26, RAD(104), p[3]], [26, RAD(76), p[1]]])
    poly(t, tailPts(kx + dx, ky + 20, ang, 190, 46, 66), cc, 1, shade(cc, 0.55));
  for (const [ang, cc] of [[RAD(-146), p[1], p[3]], [RAD(-34), p[0], p[3]]]) {
    poly(t, petalPts(kx, ky, ang, 156, 138), shade(cc, 0.72));    // the loop's shaded under-plane
    poly(t, petalPts(kx, ky - 13, ang, 148, 120), cc);            // its lit face, one hard step up
    poly(t, petalPts(kx, ky - 24, ang, 94, 58), shade(cc, 1.22), 0.9);
  }
  poly(t, [[kx - 42, ky - 46], [kx + 42, ky - 46], [kx + 32, ky + 52], [kx - 32, ky + 52]],
    shade(p[3], 0.82), 1, shade(p[3], 0.5));                      // knot, darkest plane
  poly(t, [[kx - 38, ky - 40], [kx - 8, ky - 40], [kx - 12, ky + 46], [kx - 30, ky + 46]],
    shade(p[1], 1.1), 0.9);
}

// --- dusk: a pleated paper fan --------------------------------------------
function drawFan(t, c, p) {
  const px = c, py = c + 158, R = 262, r0 = 58;
  const A0 = RAD(-126), A1 = RAD(-54), n = 5;
  poly(t, sectorPts(px, py, r0 - 10, R + 10, A0, A1), shade(p[1], 0.62));  // leaf backing
  for (let i = 0; i < n; i++) {
    const a0 = A0 + ((A1 - A0) * i) / n, a1 = A0 + ((A1 - A0) * (i + 1)) / n;
    const cc = [p[0], p[2], p[4], p[3], p[0]][i];
    poly(t, sectorPts(px, py, r0, R, a0 + RAD(0.6), a1 - RAD(0.6)), cc, 1, shade(cc, 0.7));
    poly(t, sectorPts(px, py, R - 76, R - 6, a0 + RAD(2), a0 + RAD(6.4)),
      shade(cc, 1.3), 0.7);                                       // a lit pleat edge
  }
  poly(t, sectorPts(px, py, R - 34, R, A0, A1), shade(p[5], 0.9), 0.9);    // rim band
  poly(t, sectorPts(px, py, r0 - 12, r0 + 30, A0, A1), shade(p[1], 0.5));  // gathered throat
  ellipse(t, px, py - 18, 34, 34, WOOD.base);                     // rivet
  ellipse(t, px - 4, py - 24, 20, 16, WOOD.rim, 0.9, 6);
}

// --- ember: a fringed tassel ----------------------------------------------
function drawTassel(t, c, p) {
  arcStroke(t, c, c - 100, 38, 20, RAD(178), RAD(362), p[2]);     // hanging cord
  arcStroke(t, c, c - 105, 38, 8, RAD(190), RAD(300), shade(p[2], 1.3), 0.85);
  roundRect(t, c, c - 64, 30, 30, 13, p[3], 1, shade(p[3], 0.58));// bead cap
  const skirt = [[-112, 44], [-58, 40], [0, 38], [58, 40], [112, 44]];
  skirt.forEach(([dx, w], i) => {
    const cc = [p[1], p[0], p[2], p[3], p[1]][i];
    capsule(t, c + dx * 0.3, c + 6, c + dx, c + 144, w, shade(cc, 0.74));
    capsule(t, c + dx * 0.3 - 5, c + 6, c + dx - 5, c + 120, w * 0.62, cc);
    capsule(t, c + dx * 0.3 - 8, c + 16, c + dx - 8, c + 96, w * 0.24,
      shade(cc, 1.28), 0.7);
  });
  roundRect(t, c, c - 22, 78, 44, 26, p[0], 1, shade(p[1], 0.7)); // head
  roundRect(t, c, c + 18, 96, 22, 11, p[5], 1, shade(p[1], 0.82));// binding band
  ellipse(t, c - 30, c - 34, 24, 12, '#FFFFFF', 0.45, 7);
}

// --- verdant: a kite with a waving tail -----------------------------------
function drawKite(t, c, p) {
  const kx = c - 24, ky = c - 38, up = 118, dn = 114, side = 112;
  const tail = [], TL = s => [kx + 16 * Math.sin(s * 4.0) + s * 100, ky + dn + s * 92];
  for (let i = 0; i <= 24; i++) tail.push(TL(i / 24));
  poly(t, ribbonPts(tail, () => 21), shade(p[1], 0.78));          // the tail string
  for (const [s, ang] of [[0.26, RAD(-26)], [0.6, RAD(16)], [0.95, RAD(-18)]]) {
    const [bx, by] = TL(s);                                       // three fat bows, fused on
    poly(t, roundRectPts(bx, by, 52, 17, 15, ang), p[1], 1, shade(p[1], 0.64));
    poly(t, roundRectPts(bx - 4, by - 6, 32, 6, 6, ang), shade(p[1], 1.32), 0.75);
  }
  const T = [kx, ky - up], B = [kx, ky + dn], L = [kx - side, ky], R2 = [kx + side, ky];
  poly(t, [T, R2, B, L], p[0], 1, shade(p[0], 0.72));             // the sail
  poly(t, [T, [kx, ky], L], shade(p[1], 1.1));                    // four hard-stepped panels
  poly(t, [T, R2, [kx, ky]], shade(p[2], 0.94));
  poly(t, [L, [kx, ky], B], shade(p[4], 0.8));
  poly(t, [[kx, ky], R2, B], shade(p[2], 0.66));
  capsule(t, kx, ky - up + 16, kx, ky + dn - 16, 14, shade(p[2], 0.6), 0.8);
  capsule(t, kx - side + 14, ky, kx + side - 14, ky, 14, shade(p[2], 0.6), 0.8);
  ellipse(t, kx - 50, ky - 52, 32, 24, '#FFFFFF', 0.3, 12);
}

// --- sovereign: a cinched pouch spilling coins ----------------------------
function drawPouch(t, c, p) {
  const coins = [[-72, -112, 40, p[4]], [2, -134, 44, p[2]], [76, -108, 38, p[2]]];
  for (const [dx, dy, r, cc] of coins) {
    ellipse(t, c + dx, c + dy, r, r * 0.94, shade(cc, 0.6));      // coins at the mouth
    ellipse(t, c + dx, c + dy - 4, r * 0.82, r * 0.78, cc);
    ellipse(t, c + dx - r * 0.3, c + dy - r * 0.34, r * 0.34, r * 0.24, shade(cc, 1.3), 0.85, 7);
  }
  poly(t, [[c - 68, c - 152], [c + 68, c - 152], [c + 52, c - 62], [c - 52, c - 62]],
    p[0], 1, shade(p[1], 0.72));                                  // gathered mouth
  roundRect(t, c, c + 44, 138, 116, 96, p[0], 1, shade(p[1], 0.62)); // body
  roundRect(t, c - 46, c + 26, 56, 78, 48, shade(p[0], 1.2), 0.6);  // one big lit plane
  roundRect(t, c, c - 58, 88, 32, 16, p[4], 1, shade(p[4], 0.58)); // cord band
  capsule(t, c + 74, c - 58, c + 116, c - 20, 24, p[4]);           // cord end, absorbed
  capsule(t, c + 74, c - 63, c + 108, c - 30, 10, shade(p[4], 1.32), 0.8);
  ellipse(t, c - 40, c - 54, 22, 9, '#FFFFFF', 0.45, 6);
}

// --- eclipse: a firework bloom --------------------------------------------
function drawBloom(t, c, p) {
  const bx = c, by = c - 2;
  for (let i = 0; i < 12; i++) {
    const a = RAD(-90 + i * 30), long = i % 2 === 0;
    const R = long ? 142 : 98, th = long ? 50 : 40;
    const cc = long ? p[i % 4] : p[(i + 2) % 4];
    capsule(t, bx, by, bx + Math.cos(a) * R, by + Math.sin(a) * R, th, shade(cc, 0.66));
    capsule(t, bx, by, bx + Math.cos(a) * (R - 14), by + Math.sin(a) * (R - 14), th * 0.66, cc);
    capsule(t, bx + Math.cos(a) * 30, by + Math.sin(a) * 30,
      bx + Math.cos(a) * (R - 34), by + Math.sin(a) * (R - 34), th * 0.26,
      shade(cc, 1.35), 0.75);
  }
  ellipse(t, bx, by, 62, 62, shade(p[1], 0.7));                   // hot core
  ellipse(t, bx, by, 46, 46, p[5]);
  ellipse(t, bx - 12, by - 14, 20, 16, '#FFFFFF', 0.8, 6);
}

// --- supporter: a spool of ribbon ------------------------------------------
function drawSpool(t, c, p) {
  const spill = [];
  for (let i = 0; i <= 22; i++) {
    const s = i / 22;
    spill.push([c + 40 + s * 104, c + 44 + 52 * Math.sin(s * 2.7) + s * 92]);
  }
  roundRect(t, c, c, 78, 104, 16, shade(p[0], 1.12), 1, shade(p[1], 0.82)); // wound gold
  for (const [dy, cc] of [[-52, shade(p[3], 1.12)], [4, p[1]], [58, shade(p[0], 1.1)]])
    roundRect(t, c, c + dy, 74, 22, 11, cc, 1, shade(cc, 0.72));    // three fat windings
  roundRect(t, c - 44, c, 18, 92, 9, shade(p[5], 1.0), 0.45);       // lit left edge
  // Flanges are DISCS seen slightly from above, not the flat bars of the second
  // draft: those made the object a rolled scroll, which the star-chart upgrade
  // icon already owns.
  ellipse(t, c, c + 116, 128, 40, WOOD.seam);
  ellipse(t, c, c + 108, 128, 40, WOOD.mid);
  ellipse(t, c, c - 100, 128, 42, WOOD.dark);
  ellipse(t, c, c - 108, 128, 42, WOOD.mid);
  ellipse(t, c, c - 110, 62, 20, WOOD.dark);                        // the spindle hole
  ellipse(t, c, c - 112, 46, 14, WOOD.seam);
  // The tail spills IN FRONT of the lower flange, which is what stops the two
  // discs reading as the rollers of a scroll.
  poly(t, ribbonPts(spill, () => 54), p[2], 1, shade(p[2], 0.6));
  poly(t, ribbonPts(spill.map(([x, y]) => [x - 6, y - 12]), () => 18),
    shade(p[4], 1.16), 0.7);
  ellipse(t, c - 62, c - 118, 34, 11, '#FFFFFF', 0.4, 7);
}

// --- season: a banner on a crossbar ----------------------------------------
function drawBanner(t, c, p) {
  const bx = c, top = c - 112, halfW = 100, botY = c + 134, notch = 64;
  const bands = [[p[0], top, top + 84], [p[1], top + 84, top + 162], [p[2], top + 162, botY]];
  bands.forEach(([cc, y0, y1], i) => {
    const pts = i === 2
      ? [[bx - halfW, y0], [bx + halfW, y0], [bx + halfW, y1], [bx, y1 - notch], [bx - halfW, y1]]
      : [[bx - halfW, y0], [bx + halfW, y0], [bx + halfW, y1], [bx - halfW, y1]];
    poly(t, pts, cc, 1, shade(cc, 0.74));
  });
  poly(t, [[bx - halfW, top], [bx - halfW + 42, top], [bx - halfW + 42, botY - 20],
    [bx - halfW, botY - 8]], '#FFFFFF', 0.18);                     // one broad lit fold
  poly(t, [[bx + halfW - 34, top], [bx + halfW, top], [bx + halfW, botY],
    [bx + halfW - 34, botY - 12]], INK, 0.2);
  roundRect(t, bx, top - 6, halfW + 4, 18, 9, shade(p[4], 1.05), 0.85);
  roundRect(t, bx, c - 140, 132, 21, 10, WOOD.light, 1, WOOD.dark); // crossbar
  for (const dx of [-132, 132]) ellipse(t, bx + dx, c - 140, 22, 22, WOOD.base);
  roundRect(t, bx, c - 146, 114, 7, 4, WOOD.rim, 0.75);
}

// ---------------------------------------------------------------------------

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });

  // ==== TILE THEMES =========================================================

  { // === theme_default.png — three fanned candy letter tiles ===
    const { cv, c } = canvas();
    const pal = TILE_PAL.theme_default;
    contactShadow(cv, c + 6, c + 152, 128, 22, 0.3);
    // The trio is drawn from the palette's WARM members. The second draft led
    // with blue and mint, which made this the coolest, most saturated tile on a
    // sheet of hearth props and read as branding rather than as an object;
    // amber, gold and candy pink are the same TILE_THEMES colours, chosen so
    // the stack sits in the shop's warm family.
    withOutline(cv, t => {
      candyTile(t, c - 70, c + 30, 70, 79, -15, pal[5]);           // amber, back-left
      candyTile(t, c + 70, c + 23, 70, 79, 15, pal[4]);            // gold, back-right
      candyTile(t, c, c - 22, 74, 83, 0, pal[0], true);            // pink, front, bears the W
    }, { width: 9 });
    sheen(cv, c - 42, c - 70, 24, 11, 0.45);
    savePNG(path.join(OUT, 'theme_default.png'), W, W, down2(cv, W, W));
  }

  { // === theme_ember.png — an iron bowl of THREE oversized coals ===
    const { cv, c } = canvas();
    const pal = TILE_PAL.theme_ember;
    ellipse(cv, c, c - 34, 160, 172, pal[0][0], 0.3, 78);           // heat bloom
    contactShadow(cv, c + 4, c + 158, 140, 24, 0.32);
    withOutline(cv, t => {
      // Bowl first, coals over its rim, so the two read as one heap.
      poly(t, taperPts(c, c + 44, c + 146, 146, 92), '#5C5268', 1, '#251F2D');
      ellipse(t, c, c + 146, 92, 22, '#1D1826');
      roundRect(t, c, c + 40, 150, 26, 13, '#9C90A8', 1, '#3A3242');  // bright rim
      ellipse(t, c, c + 40, 136, 17, '#191420');                      // cavity mouth
      const coals = [[-78, 8, 56, 2], [4, -22, 66, 0], [80, 6, 52, 5]];
      for (const [dx, dy, r, pi] of coals) {
        ellipse(t, c + dx, c + dy, r, r * 0.92, pal[pi][1]);
        ellipse(t, c + dx, c + dy - 3, r * 0.86, r * 0.78, pal[pi][0]);
        ellipse(t, c + dx - r * 0.22, c + dy - r * 0.28, r * 0.44, r * 0.3,
          shade(pal[pi][0], 1.25), 0.9, 8);
      }
      // Three flames, so the bowl of orange spheres cannot be read as fruit.
      flameLobe(t, c - 68, c - 76, c + 6, 30, pal[2][0], 0.92);
      flameLobe(t, c + 76, c - 64, c + 8, 27, pal[0][0], 0.92);
      flameLobe(t, c + 2, c - 148, c - 12, 50, pal[1][0]);
      flameLobe(t, c, c - 122, c - 18, 33, pal[3][0]);
      flameLobe(t, c - 2, c - 96, c - 22, 18, '#FFF0C0');
      ellipse(t, c + 4, c - 34, 30, 20, '#FFF3D2', 0.9, 8);           // hot core
      capsule(t, c - 138, c + 62, c - 138, c + 60, 22, '#A296AE', 0.85);
    }, { width: 9 });
    sheen(cv, c - 92, c + 40, 30, 11, 0.4);
    savePNG(path.join(OUT, 'theme_ember.png'), W, W, down2(cv, W, W));
  }

  { // === theme_tide.png — a stoppered glass float, half full, lit swell ===
    const { cv, c } = canvas();
    const pal = TILE_PAL.theme_tide;
    const cy = c + 34, R = 126, waterY = cy - 22;
    contactShadow(cv, c + 4, c + 176, 104, 20, 0.32);
    withOutline(cv, t => {
      roundRect(t, c, cy - R - 44, 44, 30, 12, WOOD.light, 1, WOOD.mid);   // cork
      capsule(t, c, cy - R - 22, c, cy - R + 8, 40, '#CFE6EE');            // neck
      roundRect(t, c, cy, R, R, R, '#E2F1F6', 1, '#9DBECB');              // glass
      poly(t, waterPts(c, cy, R - 4, waterY), pal[4][0], 1, pal[0][1]);
      ellipse(t, c - 32, cy + 30, 68, 36, pal[5][0], 0.9, 10);            // lit swell
      ellipse(t, c - 36, cy + 20, 42, 19, shade(pal[5][0], 1.28), 0.85, 8);
      const surfHW = Math.sqrt(Math.max(1, (R - 4) * (R - 4) - (waterY - cy) * (waterY - cy)));
      capsule(t, c - surfHW + 8, waterY, c + surfHW - 8, waterY, 13, '#BCEFF6', 0.95);
      ellipseRing(t, c, cy, R - 8, R - 8, 10, '#F2FBFD', 0.5, 120);       // glass rim light
      capsule(t, c - 26, cy - R - 44, c - 26, cy - R - 30, 8, shade(WOOD.rim, 1.02), 0.5);
    }, { width: 9 });
    sheen(cv, c - 62, cy - 66, 30, 20, 0.65);
    savePNG(path.join(OUT, 'theme_tide.png'), W, W, down2(cv, W, W));
  }

  { // === theme_bone.png — one pale ceramic cup, banded, filling the frame ===
    const { cv, c } = canvas();
    const pal = TILE_PAL.theme_bone;
    contactShadow(cv, c + 4, c + 156, 116, 22, 0.32);
    withOutline(cv, t => {
      arcStroke(t, c + 104, c - 4, 62, 40, -Math.PI * 0.46, Math.PI * 0.46, pal[1][1]);
      arcStroke(t, c + 102, c - 8, 62, 20, -Math.PI * 0.44, Math.PI * 0.1,
        shade(pal[0][0], 1.1), 0.9);                                  // handle
      poly(t, taperPts(c - 14, c - 72, c + 140, 104, 78), pal[0][0], 1, pal[0][1]);
      // Two oversized bands, not a texture: the palette's other two families,
      // shown at a size that survives 56dp.
      poly(t, taperPts(c - 14, c + 4, c + 40, 96, 89), pal[4][1], 1, shade(pal[4][1], 0.78));
      poly(t, taperPts(c - 14, c + 52, c + 74, 88, 84), pal[2][1], 1, shade(pal[2][1], 0.78));
      ellipse(t, c - 14, c + 140, 76, 18, pal[1][1]);                 // foot
      ellipse(t, c - 14, c - 72, 104, 30, '#F4EDE1');                 // rim
      ellipse(t, c - 14, c - 68, 84, 21, pal[1][1]);                  // interior
      ellipse(t, c - 14, c - 72, 84, 20, shade(pal[1][1], 0.5));
    }, { width: 9 });
    sheen(cv, c - 74, c - 16, 20, 46, 0.42);
    savePNG(path.join(OUT, 'theme_bone.png'), W, W, down2(cv, W, W));
  }

  { // === theme_verdant.png — a terracotta pot, three broad leaves ===
    const { cv, c } = canvas();
    const pal = TILE_PAL.theme_verdant;
    contactShadow(cv, c + 4, c + 164, 122, 22, 0.32);
    withOutline(cv, t => {
      const leaves = [
        [c - 16, c + 30, c - 126, c - 76, 74, -22, 1],
        [c - 2, c + 26, c + 6, c - 148, 78, 14, 0],
        [c + 18, c + 30, c + 124, c - 54, 70, 26, 3],
      ];
      for (const [bx, by, tx, ty, w, bend, pi] of leaves) {
        poly(t, leafPts(bx, by, tx, ty, w, bend), pal[pi][1]);
        poly(t, leafPts(bx - 5, by - 6, tx - 5, ty - 6, w * 0.78, bend),
          pal[pi][0], 1, shade(pal[pi][0], 0.8));
        poly(t, leafPts(bx - 9, by - 11, tx - 9, ty - 11, w * 0.3, bend),
          shade(pal[pi][0], 1.5), 0.8);
      }
      poly(t, taperPts(c, c + 40, c + 150, 94, 68), '#C87345', 1, '#7C3B1B');
      roundRect(t, c, c + 34, 110, 26, 11, '#DA8A54', 1, '#A05428');   // rim
      ellipse(t, c, c + 30, 92, 14, '#3E2C1C', 0.92);                  // soil
      capsule(t, c - 92, c + 44, c + 60, c + 42, 16, '#F5BC8E', 0.75);
    }, { width: 9 });
    sheen(cv, c - 62, c + 70, 24, 16, 0.35);
    savePNG(path.join(OUT, 'theme_verdant.png'), W, W, down2(cv, W, W));
  }

  { // === theme_static.png — a valve radio in a wooden cabinet ===
    // RE-CONCEIVED. Two review rounds landed on the same verdict: a brushed
    // steel panel with a cyan meter is a hard-tech object on a sheet of hearth
    // props, and read as a settings glyph borrowed from another game. The theme
    // is "Between-signals", not "machine", so the subject is now a cottage
    // valve set: a WOODEN cabinet, a brass-framed tuning window, a brass knob.
    // The palette still describes itself honestly — the grey cloth of the
    // speaker is the tile greys, and the tile set's one cold blue is the light
    // in the dial, cooling toward the end of the band where the station is not
    // quite arriving. Warm object, cold signal.
    const { cv, c } = canvas();
    const pal = TILE_PAL.theme_static;
    ellipse(cv, c + 2, c - 52, 122, 62, pal[4][0], 0.24, 52);        // the dial's glow
    contactShadow(cv, c + 4, c + 164, 132, 20, 0.32);
    withOutline(cv, t => {
      roundRect(t, c, c + 10, 138, 148, 30, WOOD.base, 1, WOOD.dark); // cabinet
      ellipse(t, c, c - 118, 132, 52, WOOD.base);                     // arched shoulder
      ellipse(t, c, c - 126, 118, 40, WOOD.light, 0.75, 8);           // its lit crown
      roundRect(t, c, c + 152, 148, 22, 10, WOOD.mid, 1, WOOD.seam);  // plinth
      roundRect(t, c - 112, c + 16, 22, 118, 11, WOOD.rim, 0.42);     // lit left stile
      // The tuning window: brass frame, warm at the near end, cold at the far.
      roundRect(t, c, c - 74, 110, 44, 15, BRASS.hi, 1, BRASS.lo);
      roundRect(t, c, c - 74, 96, 31, 10, shade(pal[3][1], 0.45));
      // roundRect gradients run TOP-to-BOTTOM, so the warm-to-cold run along the
      // band is built as two flat blocks, not as a gradient.
      roundRect(t, c - 24, c - 76, 70, 27, 8, '#FFE3AE', 1, '#E0AC63');
      roundRect(t, c + 52, c - 76, 42, 27, 8, pal[4][0], 1, pal[4][1]);  // the cold far end
      capsule(t, c + 16, c - 94, c + 16, c - 56, 12, '#FFFDF4', 0.95);   // the needle
      capsule(t, c - 54, c - 62, c - 54, c - 50, 12, shade(BRASS.lo, 1.15), 0.85);
      capsule(t, c - 14, c - 62, c - 14, c - 50, 12, shade(BRASS.lo, 1.15), 0.85);
      // The speaker: grey cloth behind a brass ring. The tile greys live here.
      ellipse(t, c - 22, c + 66, 94, 76, BRASS.lo);
      ellipse(t, c - 22, c + 60, 90, 70, BRASS.hi);
      ellipse(t, c - 22, c + 64, 76, 58, shade(pal[3][1], 0.62));
      ellipse(t, c - 22, c + 60, 70, 52, pal[1][0]);
      ellipse(t, c - 44, c + 42, 38, 20, pal[2][0], 0.95, 12);
      ellipse(t, c - 12, c + 86, 50, 20, shade(pal[3][1], 0.8), 0.6, 14);
      // One brass knob, low right, well clear of the speaker.
      ellipse(t, c + 96, c + 118, 34, 34, shade(BRASS.lo, 0.85));
      ellipse(t, c + 96, c + 114, 27, 27, BRASS.hi);
      capsule(t, c + 96, c + 114, c + 84, c + 98, 12, shade(BRASS.lo, 0.8));
    }, { width: 9 });
    sheen(cv, c - 96, c - 96, 28, 12, 0.4);
    savePNG(path.join(OUT, 'theme_static.png'), W, W, down2(cv, W, W));
  }

  { // === theme_sovereign.png — a gold circlet bedded into a violet cushion ===
    const { cv, c } = canvas();
    const pal = TILE_PAL.theme_sovereign;
    contactShadow(cv, c + 4, c + 170, 148, 22, 0.32);
    withOutline(cv, t => {
      roundRect(t, c, c + 122, 152, 50, 30, pal[4][0], 1, pal[3][0]);   // cushion
      for (const dx of [-140, 140]) ellipse(t, c + dx, c + 146, 18, 18, pal[3][1]);
      ellipse(t, c - 76, c + 100, 40, 12, shade(pal[4][0], 1.22), 0.6, 8);
      ellipse(t, c, c + 96, 112, 20, shade(pal[3][0], 0.62), 0.85, 10); // crown's own shadow
      const cy = c + 18;
      for (const [dx, ty, hw] of [[-74, -74, 36], [0, -116, 42], [74, -74, 36]]) {
        tri(t, [c + dx, cy + ty], [c + dx - hw, cy + 30], [c + dx + hw, cy + 30],
          shade(pal[2][0], 1.16));
        tri(t, [c + dx + 5, cy + ty + 16], [c + dx + hw - 5, cy + 30], [c + dx - 3, cy + 30],
          pal[5][1], 0.65);
        ellipse(t, c + dx, cy + ty + 10, 17, 15, pal[4][0]);            // point jewel
        ellipse(t, c + dx - 5, cy + ty + 6, 6, 5, '#FFFFFF', 0.55, 4);
      }
      ellipseRing(t, c, cy, 112, 38, 40, pal[2][0], 1, 120);            // band
      ellipseRing(t, c, cy - 8, 112, 38, 13, shade(pal[2][0], 1.3), 0.9, 120);
      ellipseRing(t, c, cy + 13, 112, 38, 11, pal[5][1], 0.8, 120);
      for (const dx of [-62, 0, 62]) {
        ellipse(t, c + dx, cy - 32, 19, 15, pal[0][0]);
        ellipse(t, c + dx - 5, cy - 35, 6, 5, '#FFFFFF', 0.5, 4);
      }
    }, { width: 9 });
    sheen(cv, c - 84, c - 30, 24, 11, 0.5);
    savePNG(path.join(OUT, 'theme_sovereign.png'), W, W, down2(cv, W, W));
  }

  { // === theme_patron.png — an amber gem seated on one turned pedestal ===
    // THIRD PASS. The gem was a gradient-filled hexagon with four soft wedges
    // over it — airbrushed rather than cut — and it floated in a notch between
    // three mushy rounded slabs. It is now a real brilliant: SIX flat planes,
    // no gradient anywhere inside the stone, so every facet is a hard step
    // against its neighbour and the light reads as cut rather than blurred.
    // And it is SEATED: the culet runs down past the brass collar, the collar
    // closes around it, and the pedestal's top slab covers the tip, so the
    // stone rests IN the setting instead of hovering over a gap.
    const { cv, c } = canvas();
    const pal = TILE_PAL.theme_patron;
    ellipse(cv, c, c - 58, 150, 138, pal[0][0], 0.24, 74);           // gem glow
    contactShadow(cv, c + 4, c + 186, 104, 14, 0.3);
    withOutline(cv, t => {
      // The stone. A=left girdle, D=right girdle, B/C the crown corners,
      // M1/M2 the table's own corners, E the culet.
      const gy = c - 74, E = [c, c + 96];
      const A = [c - 136, gy], D = [c + 136, gy];
      const B = [c - 80, gy - 76], C = [c + 80, gy - 76];
      const M1 = [c - 48, gy], M2 = [c + 48, gy];
      poly(t, [B, C, M2, M1], shade(pal[4][0], 1.14));               // table, lightest
      poly(t, [A, B, M1], pal[0][0]);                                // crown left
      poly(t, [C, D, M2], shade(pal[3][0], 0.9));                    // crown right
      poly(t, [A, M1, E], shade(pal[2][0], 0.88));                   // pavilion left
      poly(t, [M1, M2, E], shade(pal[5][0], 0.74));                  // pavilion centre
      poly(t, [M2, D, E], shade(pal[5][1], 0.6));                    // pavilion right, darkest
      capsule(t, A[0] + 6, gy, D[0] - 6, gy, 9, shade(pal[3][1], 0.8), 0.7);  // girdle
      poly(t, [[B[0] + 10, B[1] + 10], [C[0] - 46, C[1] + 10], [M1[0] + 16, M1[1] - 12]],
        '#FFF6DC', 0.5);                                             // one clean specular plane
      // The setting closes ON the stone: collar first, then the slab over the tip.
      // A solid brass CUP, not a ring: a ring left a dark hollow under the
      // stone and read as an empty setting. The cup's mouth crosses the
      // pavilion, so the stone visibly goes INTO its seat.
      // The setting neither cuts the stone across nor lifts it: the pavilion
      // runs UNBROKEN down to the slab it stands on, and a single brass ferrule
      // wraps its narrow point. A cup and a collar ring were both tried and both
      // read as a hole with the gem hovering over it.
      roundRect(t, c, c + 62, 40, 15, 7, BRASS.hi, 1, shade(BRASS.lo, 0.9));
      roundRect(t, c, c + 57, 32, 5, 3, shade(BRASS.hi, 1.2), 0.85);
      roundRect(t, c, c + 98, 64, 14, 6, shade(BRASS.lo, 0.95), 1, '#4A3110');
      // ONE turned pedestal, cut in hard steps: slab, column, foot.
      roundRect(t, c, c + 118, 94, 15, 7, WOOD.light);
      roundRect(t, c, c + 131, 94, 7, 3, WOOD.mid);
      poly(t, [[c - 38, c + 134], [c + 38, c + 134], [c + 56, c + 158], [c - 56, c + 158]],
        WOOD.base);
      poly(t, [[c + 10, c + 134], [c + 38, c + 134], [c + 56, c + 158], [c + 22, c + 158]],
        WOOD.dark, 0.55);                                            // its shaded plane
      roundRect(t, c, c + 166, 106, 16, 7, WOOD.mid);
      roundRect(t, c, c + 179, 106, 6, 3, WOOD.dark);
    }, { width: 9 });
    sheen(cv, c - 54, c - 104, 30, 17, 0.7);
    savePNG(path.join(OUT, 'theme_patron.png'), W, W, down2(cv, W, W));
  }

  { // === theme_eclipse.png — a black disc inside a BRIGHT corona ===
    const { cv, c } = canvas();
    const pal = TILE_PAL.theme_eclipse;
    const rose = shade(pal[5][0], 1.55), hot = '#FFD9C2';
    ellipse(cv, c, c, 184, 184, rose, 0.26, 82);                      // corona bloom
    contactShadow(cv, c + 4, c + 172, 92, 16, 0.24);
    withOutline(cv, t => {
      // ONE thick corona, no spokes. The first pass hung six stubby rays off
      // the rim; they were sub-pixel at delivery and read as damage, and the
      // four fat flares that replaced them read as ears. The bright ring alone
      // is what the shipped void orb does, and it is what carries the tile.
      roundRect(t, c, c - 4, 164, 164, 164, hot, 1, pal[5][0]);        // corona disc
      roundRect(t, c, c - 4, 128, 128, 128, shade(pal[3][1], 0.7));    // inner ink ring
      roundRect(t, c, c - 4, 118, 118, 118, pal[2][0], 1, '#13112A');  // eclipsing disc
      ellipse(t, c - 52, c - 58, 34, 24, '#8E86C8', 0.35, 16);         // faint sphere turn
      // The bright lip that holds the silhouette on a dark row.
      ellipseRing(t, c, c - 4, 146, 146, 20, '#FFF0DE', 0.92, 150);
      ellipseRing(t, c, c + 10, 148, 148, 13, pal[3][0], 0.75, 150);
    }, { width: 9 });
    sheen(cv, c - 96, c - 88, 26, 16, 0.5);
    savePNG(path.join(OUT, 'theme_eclipse.png'), W, W, down2(cv, W, W));
  }

  // ==== CONFETTI PALETTES ===================================================
  // NINE DIFFERENT OBJECTS — see THE CONFETTI FAMILY above. Each palette keeps
  // its identity through hue, but no two rows in this section are the same
  // picture, and the two violet-and-gold palettes (sovereign, supporter) are
  // now told apart by silhouette rather than by hue alone.
  // Args: name, draw, contactShadow [dx, dy, rx, ry], sheen [dx, dy, rx, ry, a].

  const CP = CONFETTI_PAL;
  confettiIcon('confetti_default', (t, c) => drawPinwheel(t, c, CP.confetti_default),
    [10, 158, 46, 13], [-64, -84, 26, 15, 0.5]);
  confettiIcon('confetti_gold', (t, c) => drawBow(t, c, CP.confetti_gold),
    [4, 158, 92, 16], [-96, -34, 26, 17, 0.5]);
  confettiIcon('confetti_dusk', (t, c) => drawFan(t, c, CP.confetti_dusk),
    [4, 168, 78, 15], [-84, -54, 22, 34, 0.42]);
  confettiIcon('confetti_ember', (t, c) => drawTassel(t, c, CP.confetti_ember),
    [4, 160, 78, 15], [-38, -22, 20, 15, 0.4]);
  confettiIcon('confetti_verdant', (t, c) => drawKite(t, c, CP.confetti_verdant),
    [16, 170, 76, 14], [-62, -94, 24, 18, 0.45]);
  confettiIcon('confetti_sovereign', (t, c) => drawPouch(t, c, CP.confetti_sovereign),
    [4, 164, 116, 18], [-74, -6, 26, 30, 0.35]);
  confettiIcon('confetti_eclipse', (t, c) => drawBloom(t, c, CP.confetti_eclipse),
    [4, 168, 84, 14], [-64, -76, 22, 15, 0.45]);
  confettiIcon('confetti_supporter', (t, c) => drawSpool(t, c, CP.confetti_supporter),
    [8, 156, 96, 16], [-70, -110, 24, 12, 0.45]);
  confettiIcon('confetti_season', (t, c) => drawBanner(t, c, CP.confetti_season),
    [4, 162, 84, 14], [-74, -108, 22, 14, 0.45]);
}
