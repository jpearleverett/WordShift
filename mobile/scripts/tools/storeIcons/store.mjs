/**
 * storeIcons/store.mjs — item art for the REAL-MONEY store (13 icons).
 *
 * The Store (src/components/monetization/StoreModal.tsx, plus the two tiers in
 * PatronModal.tsx and the premium track in SeasonPassModal.tsx) sold everything
 * as a text row: a title, a sentence and a price pill. The Cosmetic Shop already
 * shows an OBJECT per purchasable; the store — the surface that asks for money —
 * showed nothing at all. These are its objects, drawn with the same kit and the
 * same doctrine as scripts/tools/shopIcons/, so the two lists read as one world.
 *
 * WHAT EACH ONE IS (verified against the source, not the brief):
 *   starter_pack       "Keeper's Welcome"   1,200 amber + 5 hints, one per player
 *   daily_amber        "Daily Amber"        FREE, +60 amber, twice a local day
 *   amber_small        "Pouch of Amber"       600 amber   } one crock, three
 *   amber_medium       "Jar of Amber"       2,000 amber   } sizes, 1/3/6 gems
 *   amber_large        "Hoard of Amber"     5,500 amber  (BEST VALUE)
 *   hints_small        "Handful of Hints"       5 hints
 *   hints_large        "Satchel of Hints"      20 hints  (BEST VALUE)
 *   supporter          "Supporter"          monthly: ad-free, 300 amber/month,
 *                                           the season premium track, a confetti
 *   cosmetic_bundle    "The Keeper's Collection"  Eclipse tile set + confetti
 *   patron_key         "Become a Patron"    +2 amber a puzzle, Patron tiles, quiet
 *   remove_ads         "Remove Ads"         the cheaper one-time quiet
 *   season_premium     the Season Pass premium track (amber or Supporter)
 *   (the unmapped-id fallback reuses the shop's parcel; see the note in draw())
 *
 * TWO RULES SPECIFIC TO THIS SET, ON TOP OF THE SHOP'S DOCTRINE.
 *
 * 1. THE LADDERS MUST READ AS LADDERS, WITH THE LABELS COVERED. Pouch -> Jar ->
 *    Hoard and Handful -> Satchel are value ladders, and a player scanning a
 *    56dp column has to order them without reading.
 *
 *    The first pass tried to do this by giving each rung its OWN object — a
 *    leather pouch, a cobalt-banded crock, an iron-strapped coffer — on the
 *    theory that changing structure and mass beats changing tint. A blind read
 *    at true 56dp, shuffled and unlabelled, could not order them. At that size
 *    the CONTAINER is what the eye grabs first, and three materials, three
 *    silhouettes and three accent colours were three loud signals drowning the
 *    one honest signal (how much amber is in it). The free daily faucet, drawn
 *    as a fourth vessel, made it worse: readers counted a FOUR-rung ladder and
 *    put the faucet third, because its dish was wider than the pouch and its one
 *    gem was the largest gem in the set.
 *
 *    So the rule is now the opposite of what it was. HOLD EVERYTHING CONSTANT
 *    EXCEPT THE TWO THINGS THAT ARE THE LADDER. One crock, one stoneware, one
 *    cobalt band, one collar, one shelf line, and — the part that matters most —
 *    ONE GEM SIZE, so a single gem can never out-mass a heap:
 *      pouch    the crock at collar 172px, ONE gem
 *      jar      the same crock at 236px,   THREE
 *      hoard    the same crock at 316px,   SIX, heaped in two rows
 *      handful  the satchel at 152px wide, TWO bulbs
 *      satchel  the same satchel at 312px, FIVE
 *
 *    That fixed the amber trio; the hint pair kept its own arrangement for one
 *    more pass and a later blind read caught it: "hints_large is a chest,
 *    hints_small is a bare strap with a buckle and no body, and the step is 4
 *    bulbs vs 3, a single unit. At 56dp they read as two different products, not
 *    one product at two sizes." Both halves are now the crock's rule exactly —
 *    ONE bag at two widths, ONE bulb size, and a count step of two against five,
 *    because two against five reads at a glance and three against four does not.
 *
 * 2. THESE COST MONEY, SO THE ART IS HONEST. Every icon draws what the player
 *    actually receives — amber is the game's own faceted gem (assets/ui/amber.png),
 *    hints are its bulb (assets/ui/hint.png), and the counts on screen escalate
 *    with the counts in gameBalance.ts. There is no closed chest with light
 *    leaking out of the seam, no burst, no mystery box, nothing implied that is
 *    not in the product. The crocks have no lids at all, precisely so they can
 *    never read as a thing you open and hope. daily_amber is FREE and so is not
 *    on the ladder at all, in any form: it left the vessel vocabulary entirely
 *    and is a sun with one small gem at its heart — the day coming round again
 *    with a little amber in it, and its gem is smaller than the pouch's by
 *    contract.
 *
 * 3. THREE PRODUCTS ARE NOT A PILE OF GOODS, so they are the objects a cottage
 *    would use for them. Getting these right took the longest, and two of the
 *    three were only settled by a blind read finding them pointing at each other:
 *
 *      supporter        A STRAW SKEP. It was the leaf wreath, and blind that
 *                       read as SEASONAL. A hive is the cottage object for a
 *                       thing that keeps giving for as long as you keep it, and
 *                       its dome is a silhouette neither set owns — a lantern
 *                       (shop/deepen_star_loft), a bell (shop/deepen_belfry), a
 *                       mug (shop/theme_bone) and a teapot (shop/upgrade_kitchen)
 *                       are all taken, which ruled out the obvious alternatives.
 *      season_premium   THE WREATH, which is where its reading already pointed;
 *                       it carries the pass's own teal seal at the knot, so the
 *                       track and confetti_season still match. It replaces a
 *                       star-stamped document that graded as a premium
 *                       credential, i.e. as Supporter.
 *      remove_ads       CLOSED, LATCHED SHUTTERS. Four drafts died first (a
 *                       shuttered window drawn as architecture, a bell on its
 *                       side that graded as a megaphone, a muffled bell that
 *                       graded as a cone on a cushion, and a mug of tea that was
 *                       nameable but duplicated shop/theme_bone outright). The
 *                       full account is at the icon.
 *
 *    Supporter, the season pass and the Patron key otherwise crowd one
 *    support-and-prestige space, so the three must stay separable at 56dp: a
 *    dome, a ring of leaves, a long diagonal of brass. None of them promises
 *    anything the store row beside it does not.
 *
 * 4. WHERE TWO PARTS COME CLOSE, A REAL MATERIAL GOES IN THE GAP — never the
 *    contour. `withOutline` cannot outline a notch narrower than twice its own
 *    stroke; it fills it. Five icons had visibly flooded gaps at one point, so
 *    every cluster in this file now goes down through `grouped` (see there for
 *    the mechanism and the review that found it).
 *
 * House doctrine, inherited from shopIcons/_draw.mjs and followed exactly:
 *   - contact shadow and any halo go on `cv` BEFORE withOutline, so light and
 *     shadow bleeding past the silhouette are never themselves contoured;
 *   - the subject is drawn inside withOutline, which lays the thick warm-dark
 *     contour that lets a light object survive an ash row and a dark object
 *     survive a parchment one;
 *   - the specular sheen goes on AFTER, so it sits over the contour;
 *   - one light source, upper-left, for every icon;
 *   - outlines are the warm INK, never #000;
 *   - a halo must LIGHTEN. Cream parchment is (243,226,191); a wash painted in
 *     the object's own warm mid-tone is below that in green and blue and shows
 *     as a grey smudge on a light row, so every halo stop here dominates cream
 *     in all three channels (#FFF3D2, #FFF6DC, #FFFBEC, #FBF0FF);
 *   - nothing at alpha <= 0.5 is asked to hold an edge (withOutline's seed test
 *     is alpha > 0.5, so a faint shape is composited but never contoured);
 *   - no hairlines, no scatters of small parts: two or three oversized instances
 *     instead. Every gem, bulb, leaf and blade here is huge on purpose;
 *   - >= 4px of clear alpha on all four sides at the delivered 192px, i.e.
 *     nothing outside [8, 375] in the 384 supersample, contour and halo included
 *     (an `ellipse` never draws past its own radii, so halos are bounded by
 *     theirs);
 *   - no Math.random: every coordinate is a literal, so the set is
 *     byte-reproducible.
 *
 * KIT GOTCHA worth repeating: `ellipse()` is (…, color, alpha, soft) and has NO
 * gradTo — passing a colour as the 7th argument yields a NaN alpha and silently
 * draws nothing. Only `roundRect` and `poly` take a gradient.
 *
 * All coordinates are in the 384x384 supersample space (c = 192 is the centre);
 * each file is downsampled 2x to a 192px PNG = 64dp at @3x.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  canvas, savePNG, down2, W, contactShadow, sheen, withOutline, INK,
  WOOD, ACCENT, BRASS,
  C, hex, blend, ellipse, roundRect, poly, capsule, tri, hexPts, starPts,
} from '../shopIcons/_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui/store');

// --- palettes ---------------------------------------------------------------
/** The amber gem's own material, matched to assets/ui/amber.png: a deep brown
 *  keyline, a gold body and a pale top-left facet. Five widely spaced steps, so
 *  a gem still has value structure once it is 12px across in a store row. */
const AMBER = { hi: '#FFF0BB', up: '#FFD264', mid: '#F5A81C', lo: '#C4760B', deep: '#7A4708' };
/** The hint bulb, matched to assets/ui/hint.png: warm yellow glass over a
 *  lavender collar. The collar is what keeps a bulb from reading as a gem. */
const BULB = { hi: '#FFF3B8', up: '#FFDF74', mid: '#F3C13C', lo: '#C89416' };
/** The bulb's collar. It was the shipped hint icon's lavender, which is a hue
 *  the reference set's metals (cream, grey, gold) do not contain, so the one
 *  cool plastic-looking part in the store sat beside 58 cottage objects. This is
 *  a pewter with just enough of that lavender left in it to still read as the
 *  same bulb: grey first, lavender second. */
const CAP = { hi: '#D8D2DC', base: '#ADA7B4', lo: '#6F6A78' };
/** Forged iron, for hinges, straps and latches. Grey, like the set's metals. */
const IRON = { hi: '#8F8A7F', base: '#6A655B', lo: '#3E3931' };
/** Sun-bleached straw, for the Supporter's skep. */
const STRAW = { hi: '#F2D693', up: '#E0B667', base: '#C2934A', mid: '#9C7233', lo: '#6E4E20' };
/** Tanned leather for the hint satchel and the strap that binds the handful. */
const LEATH = { hi: '#E0AC72', base: '#C08A4C', mid: '#96632F', lo: '#6B441F' };
/** Glazed kitchen stoneware, with a cobalt stripe: the material of the WHOLE
 *  amber ladder, and of the Remove Ads mug, so the store's crockery is one
 *  cottage's crockery. It was first drawn in the kit's STONE grey and graded
 *  cold — a concrete bucket in a set of warm cottage goods — hence the cream. */
const WARE = { hi: '#F4E9D2', base: '#E0D0AE', mid: '#BCA87F', lo: '#8A7855' };
const COBALT = { hi: '#6E8CB4', lo: '#3B5A82' };
const TWINE = { hi: '#F3E6C4', base: '#D8C296', lo: '#A98F5F' };
/** Rope, for a binding that has to hold its own against a LIGHT subject. The
 *  pale TWINE above is right on brown paper and wrong on a cream row: the
 *  hint bundle's first binding sampled within a step of the parchment behind it
 *  and read as a shelf the bulbs were standing on rather than a cord tying them
 *  together. Anything cinching, wrapping or hanging is drawn in this instead. */
const ROPE = { hi: '#E2C994', base: '#B79763', lo: '#795C33' };
const KRAFT = { hi: '#E0B57E', base: '#BE8B50', lo: '#7E5A2C', crease: '#5E3F1C' };
/** The season's teal, taken from confetti_season's palette in shopIcons so the
 *  premium track and its confetti reward are visibly the same season. */
const TEAL = { hi: '#57C3B6', base: '#37A99E', lo: '#0A6F66' };
/** Eclipse, taken verbatim from THEME_PAL.theme_eclipse / CONFETTI_PAL in
 *  shopIcons/themes.mjs — this bundle grants exactly those two cosmetics. */
const ECL = { face: '#5B4A8A', side: '#3E3260', deep: '#2A2144', rose: '#D75F6E', plum: '#B45096', iris: '#7A5CC8' };

// --- local helpers ----------------------------------------------------------

/** Multiply a hex colour toward black (f<1) or white (f>1). Deterministic. */
function shade(colorHex, f) {
  const n = parseInt(colorHex.slice(1), 16);
  const ch = i => Math.max(0, Math.min(255, Math.round(((n >> i) & 255) * f)));
  const v = (ch(16) << 16) | (ch(8) << 8) | ch(0);
  return '#' + (v | 0x1000000).toString(16).slice(1).toUpperCase();
}

/**
 * Chamfer 3-4 distance transform of a binary mask (0 inside, growing outward).
 * The same two-pass walk withOutline uses, pulled out so `grouped` below can
 * run it twice without duplicating it.
 */
function chamferDT(seed, w, h) {
  const BIG = 1e9, D1 = 1, D2 = 1.4142;
  const d = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = seed[i] ? 0 : BIG;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let v = d[i]; if (v === 0) continue;
    if (x > 0) v = Math.min(v, d[i - 1] + D1);
    if (y > 0) v = Math.min(v, d[i - w] + D1);
    if (x > 0 && y > 0) v = Math.min(v, d[i - w - 1] + D2);
    if (x < w - 1 && y > 0) v = Math.min(v, d[i - w + 1] + D2);
    d[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; let v = d[i]; if (v === 0) continue;
    if (x < w - 1) v = Math.min(v, d[i + 1] + D1);
    if (y < h - 1) v = Math.min(v, d[i + w] + D1);
    if (x < w - 1 && y < h - 1) v = Math.min(v, d[i + w + 1] + D2);
    if (x > 0 && y < h - 1) v = Math.min(v, d[i + w - 1] + D2);
    d[i] = v;
  }
  return d;
}

/**
 * DRAW A CLUSTER OF PARTS WITH A REAL MATERIAL IN THE GAPS BETWEEN THEM.
 *
 * This is the one systematic fix in the set, and it closes the single defect a
 * blind review said most separated this batch from the 58 shop icons it sits
 * beside: "wherever two shapes come close, the whole gap floods with contour
 * brown instead of holding a constant stroke width and letting background or a
 * real fill show." It was visible in five icons at once — a wedge two to three
 * strokes wide between two gems in the hoard, a whole black cavity in the
 * starter tray, a dark field between two confetti petals, a bar across the
 * satchel mouth, the bottom of the wreath.
 *
 * The cause is mechanical, not a matter of taste. `withOutline` lays a contour
 * of `width` px on every side of the union silhouette, so ANY notch narrower
 * than about 2x width is not outlined — it is filled, edge to edge, in outline
 * colour. Two gems resting against each other leave exactly that notch above
 * and below the contact point, and it grows with every part you add.
 *
 * So the fix is to leave no such notch. The cluster is drawn to a scratch
 * canvas, its alpha is morphologically CLOSED (dilate by `radius`, erode by
 * `radius`, each a chamfer pass), and the closed region is painted in a real
 * material — amber shadow between gems, dark leather inside a bag, plum between
 * petals — before the parts are composited back over it. Every gap narrower
 * than 2 * radius therefore shows MATERIAL; every gap wider than that is a
 * genuine opening the contour walks at its normal constant width on both sides.
 * Each part keeps its own keyline either way, so the reading is always
 * keyline / material / keyline rather than one pooled brown mass.
 *
 * `radius` must clear withOutline's `width` (10 everywhere here) or the fill
 * stops short of where flooding starts and the notch is bedded twice, in two
 * different browns. 15 is used throughout: it closes gaps up to 30px in the
 * 384 supersample, comfortably past the ~22px withOutline can flood.
 *
 * Closing is idempotent on a convex part, so passing a single gem or a single
 * bulb through this changes nothing — clusters and lone objects can go through
 * the same call site.
 */
function grouped(t, drawParts, { fill, gradTo = null, radius = 15 }) {
  const { w, h } = t;
  const s = C(w, h);
  drawParts(s);
  const inside = new Uint8Array(w * h);
  let any = false;
  for (let i = 0; i < w * h; i++) if (s.px[i * 4 + 3] > 0.5) { inside[i] = 1; any = true; }
  if (!any) return;
  const dOut = chamferDT(inside, w, h);
  const notDilated = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) notDilated[i] = dOut[i] > radius ? 1 : 0;
  const dIn = chamferDT(notDilated, w, h);
  // The closed set is what survives eroding the dilated set back by `radius`.
  let minY = h, maxY = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (dIn[y * w + x] > radius) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (minY > maxY) return;
  const [r, g, b] = hex(fill);
  const gr = gradTo ? hex(gradTo) : null;
  const span = (maxY - minY) || 1;
  for (let y = minY; y <= maxY; y++) {
    const u = (y - minY) / span;
    const rr = gr ? r + (gr[0] - r) * u : r;
    const gg = gr ? g + (gr[1] - g) * u : g;
    const bb = gr ? b + (gr[2] - b) * u : b;
    for (let x = 0; x < w; x++) {
      const a = Math.max(0, Math.min(1, dIn[y * w + x] - radius));
      if (a > 0) blend(t, x, y, rr, gg, bb, a);
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    const sa = s.px[o + 3];
    if (sa <= 0) continue;
    blend(t, x, y, s.px[o] / (sa || 1), s.px[o + 1] / (sa || 1), s.px[o + 2] / (sa || 1), sa);
  }
}

/**
 * A closed ring stroke walked as short capsules.
 *
 * _draw.mjs has arcStroke, but it lays a round cap at each end, so closing it
 * into a full ring double-blends at the seam and beads a lump into any stroke
 * below full alpha. Walking the circle gives one clean pass — and, unlike a
 * filled disc, it leaves a real hole in the middle, which is what makes the
 * patron key's bow a bow and not a lollipop.
 */
function ringWalk(cv, cx, cy, r, th, color, alpha = 1, steps = 88) {
  let px = cx + r, py = cy;
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    capsule(cv, px, py, x, y, th, color, alpha);
    px = x; py = y;
  }
}

/** A ROTATED rounded rectangle as a point list, for `poly` (roundRect is
 *  axis-aligned only). Used by the eclipse tile, its confetti blades and the
 *  tilted season pass cards. */
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

/** A leaf outline: a quadratic spine from base to tip, widest at the middle. */
function leafPts(bx, by, tx, ty, width, bend, steps = 18) {
  const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const mx = (bx + tx) / 2 + nx * bend, my = (by + ty) / 2 + ny * bend;
  const up = [], dn = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    const sx = u * u * bx + 2 * u * t * mx + t * t * tx;
    const sy = u * u * by + 2 * u * t * my + t * t * ty;
    const w = (width / 2) * Math.pow(Math.sin(Math.PI * t), 0.7);
    up.push([sx + nx * w, sy + ny * w]);
    dn.push([sx - nx * w, sy - ny * w]);
  }
  return up.concat(dn.reverse());
}

/**
 * THE AMBER GEM — the store's unit of value, and the single most repeated form
 * in the set (it appears in seven of the thirteen icons). It is drawn to match
 * assets/ui/amber.png: a point-top hexagon, a heavy brown keyline, a gold body
 * and a hard-edged pale facet at the upper left. The keyline is not decoration —
 * in the jar and the hoard the gems overlap each other, and without a dark edge
 * per gem a heap collapses into one gold blob at 56dp, which would destroy the
 * count that carries the whole ladder.
 */
function amberGem(t, cx, cy, R, keyW = 7) {
  const P = hexPts(cx, cy, R);
  const inner = hexPts(cx, cy - R * 0.05, R * 0.76);
  poly(t, hexPts(cx, cy, R + keyW), INK, 0.95);              // keyline
  poly(t, P, AMBER.up, 1, AMBER.lo);                         // body, top-lit
  poly(t, inner, AMBER.hi, 1, AMBER.mid);                    // table facet
  // one hard pale facet upper-left and one deep facet lower-right: two big value
  // steps rather than an airbrushed sphere
  tri(t, [cx, cy - R * 0.06], inner[4], inner[5], AMBER.hi, 0.95);
  tri(t, [cx, cy - R * 0.06], inner[1], inner[2], AMBER.lo, 0.5);
  ellipse(t, cx - R * 0.3, cy - R * 0.38, R * 0.2, R * 0.13, '#FFFFFF', 0.8, 4);
}

/**
 * THE HINT BULB, matched to assets/ui/hint.png: a round yellow glass over a
 * lavender collar, with the filament's chevron inside. No radiating rays — at
 * 56dp a fan of thin rays averages to grey fuzz, and the halo already says lit.
 * `cy` is the centre of the glass; the collar hangs below it.
 *
 * The keyline behind the collar used to be R*0.44 x R*0.40 against a collar of
 * R*0.40 x R*0.34, which leaves R*0.04 of dark showing — one pixel at ship size,
 * i.e. a hairline, i.e. in practice no contour at all. It was the only part in
 * either set that broke the contour rule, and a review caught it. It is now
 * R*0.50 x R*0.52, so the collar carries a real keyline at every bulb size and
 * the lower band still sits inside it.
 */
function hintBulb(t, cx, cy, R) {
  const neckY = cy + R * 0.86;
  roundRect(t, cx, neckY + R * 0.32, R * 0.50, R * 0.52, 9, INK, 0.95);      // collar keyline
  ellipse(t, cx, cy, R + 6, R + 6, INK, 0.95, 3);                            // glass keyline
  roundRect(t, cx, cy, R, R, R, BULB.hi, 1, BULB.lo);                        // glass
  roundRect(t, cx, cy + R * 0.16, R * 0.74, R * 0.74, R * 0.74, BULB.up, 0.85, BULB.mid);
  // filament: one big chevron, the same read as the shipped bulb icon
  capsule(t, cx - R * 0.34, cy + R * 0.40, cx, cy + R * 0.06, R * 0.15, '#D2760F');
  capsule(t, cx, cy + R * 0.06, cx + R * 0.34, cy + R * 0.40, R * 0.15, '#D2760F');
  // collar: a lavender cap with two thick bands (thin ridges would be hairlines)
  roundRect(t, cx, neckY + R * 0.28, R * 0.40, R * 0.34, 7, CAP.base, 1, CAP.lo);
  roundRect(t, cx, neckY + R * 0.14, R * 0.40, R * 0.10, 4, CAP.hi, 0.9);
  roundRect(t, cx, neckY + R * 0.62, R * 0.26, R * 0.16, 6, CAP.lo, 1);
  ellipse(t, cx - R * 0.34, cy - R * 0.36, R * 0.22, R * 0.30, '#FFFFFF', 0.55, 8);
}

/** A twine cord: dark body, lit core, one shade line. Three passes so a cord is
 *  round rather than a painted stripe. `pal` picks the pale parcel twine or the
 *  darker ROPE that a binding needs when it crosses a light subject. */
function cord(t, x1, y1, x2, y2, th, pal = TWINE) {
  capsule(t, x1, y1, x2, y2, th, shade(pal.lo, 0.8), 0.95);
  capsule(t, x1, y1, x2, y2, th * 0.72, pal.hi, 1);
  capsule(t, x1, y1, x2, y2, th * 0.30, pal.base, 0.5);
}


/**
 * THE AMBER VESSEL — ONE crock, drawn three sizes, and NOTHING else changes.
 *
 * The first pass gave each rung its own vessel: a leather pouch, a cream crock
 * with a cobalt band, a wooden coffer with an iron strap. A blind review at true
 * 56dp, shuffled and unlabelled, could not order them — the CONTAINER is what
 * the eye grabs first at that size, and three materials, three shapes and three
 * accent colours were three signals all shouting over the one honest signal
 * (how much amber is in it). The free daily faucet, drawn as a fourth vessel,
 * made it worse: readers counted a four-rung ladder and put the faucet THIRD.
 *
 * So the ladder now holds everything constant except the two things that ARE
 * the ladder: the vessel's width and the number of gems. Same stoneware, same
 * cobalt band, same collar, same lip, same shelf line — and, deliberately, the
 * SAME GEM SIZE on all three, so a single gem can never out-mass a heap.
 *
 *      pouch of amber   collar 172px   ONE gem
 *      jar of amber     collar 236px   THREE
 *      hoard of amber   heap   316px   SIX
 *
 * The cobalt band sits LOW on the belly on every rung for a second reason: it
 * keeps the one soft highlight (which is painted after the contour, and so is
 * clipped to nothing) entirely inside the cream, instead of smearing across a
 * material boundary the way the first pass's did on all three rungs.
 */
const GEM_R = 40;             // identical on every rung, by contract
const CROCK_BASE = 344;       // one shelf line, so the trio stands together

function amberCrock(t, { bellyHw, bellyHh, collarHw, collarHh, lipHh, gems }) {
  const bellyCy = CROCK_BASE - bellyHh;
  const collarCy = bellyCy - bellyHh - 8;
  const mouthCy = collarCy - collarHh * 0.22;
  roundRect(t, 192, CROCK_BASE + 2, bellyHw * 0.72, 10, 5, WARE.mid, 1, WARE.lo);      // foot
  roundRect(t, 192, bellyCy, bellyHw, bellyHh, bellyHw * 0.46, WARE.hi, 1, WARE.mid);  // belly
  roundRect(t, 192, bellyCy + bellyHh * 0.46, bellyHw * 0.94, bellyHh * 0.44, bellyHw * 0.34, WARE.base, 1, WARE.lo);
  roundRect(t, 192, bellyCy + bellyHh * 0.30, bellyHw * 0.99, bellyHh * 0.17, 9, COBALT.hi, 1, COBALT.lo);
  roundRect(t, 192, collarCy, collarHw, collarHh, 11, WARE.hi, 1, WARE.mid);           // collar
  ellipse(t, 192, mouthCy, collarHw - 16, collarHh * 0.55, '#3A2E22', 1, 3);           // the mouth, dark,
  ellipse(t, 192, mouthCy - 2, collarHw - 30, collarHh * 0.36, '#241B12', 1, 3);       // so gems sit IN it
  // The heap goes down as ONE cluster bedded in amber shadow, never as loose
  // gems: see `grouped` for why. Before this, the V notch where two gems rest
  // against each other was narrower than twice withOutline's stroke, so the
  // whole notch filled with contour brown — a wedge two to three strokes wide in
  // the hoard, and in the jar a stray sliver of the collar's cream was left
  // marooned inside that brown, which read as a loose highlight with no shape.
  grouped(t, g => { for (const [gx, gy] of gems) amberGem(g, gx, gy, GEM_R); },
    { fill: AMBER.deep, gradTo: shade(AMBER.deep, 0.62) });
  roundRect(t, 192, collarCy + collarHh * 0.55, collarHw, lipHh, 7, WARE.base, 1, WARE.lo);  // front lip
}


/**
 * THE HINT VESSEL — ONE satchel, drawn two widths, and NOTHING else changes.
 *
 * The amber ladder was fixed by holding everything constant except the two
 * things that ARE the ladder, and a blind review then found the hint pair had
 * never had the same treatment done to it: "hints_large is a chest, hints_small
 * is a bare strap with a buckle and no body, and the step is 4 bulbs vs 3, a
 * single unit. At 56dp they read as two different products, not one product at
 * two sizes." Both halves of that are fixed here by copying the crock exactly:
 *
 *      handful of hints   bag 152px wide   TWO bulbs
 *      satchel of hints   bag 312px wide   FIVE
 *
 * One bag, one leather, one flap, one strap, one brass buckle, one shelf line,
 * and ONE BULB SIZE on both rungs. Two against five is a step the eye can take
 * at a glance; three against four is not (the amber ladder learned the same
 * lesson, which is why it steps 1 / 3 / 6).
 *
 * The bulbs go down through `grouped`, so the notches where one bulb rests
 * against the next carry the bag's own dark leather rather than pooled contour,
 * and the bag's inside is that same leather a shade darker — a MATERIAL, drawn
 * as a material. The first pass painted it #3A2412, which is INK to within a
 * point in every channel, and a review read it exactly as what it was: "a solid
 * dark bar spans the whole chest mouth behind the bulbs".
 */
const HINT_BULB_R = 32;                 // identical on both rungs, by contract
const SATCHEL_BASE = 348;               // one shelf line, so the pair stands together

function hintSatchel(t, { bodyHw, bulbs }) {
  const INSIDE = shade(LEATH.lo, 0.66);
  // The bag's inside, kept narrower than the bulb cluster so it can never poke
  // out beside the outermost bulb, and set high enough that the flap meets the
  // collars. All that shows of it is the shadow between and just under the
  // bulbs, in leather, at a couple of dp: never the black bar across the mouth
  // a review found in the first pass.
  roundRect(t, 192, 194, bodyHw - 16, 30, 12, INSIDE, 1, shade(LEATH.lo, 0.5));
  // radius 22 rather than the default 15: bulbs are round, so the V between two
  // of them stays narrow for longer than it does between two flat-sided gems,
  // and at 15 the last few pixels at the top of each V were left for the two
  // contours to close on their own — a black spike between every pair.
  grouped(t, g => { for (const bx of bulbs) hintBulb(g, bx, 150, HINT_BULB_R); },
    { fill: INSIDE, gradTo: shade(LEATH.lo, 0.5), radius: 22 });
  roundRect(t, 192, SATCHEL_BASE - 60, bodyHw, 60, 20, LEATH.base, 1, LEATH.lo);  // body
  roundRect(t, 192, 248, bodyHw + 6, 52, 24, LEATH.hi, 1, LEATH.base);            // the flap
  roundRect(t, 192, 288, bodyHw + 6, 12, 5, LEATH.mid, 0.8);                      // its edge
  roundRect(t, 192, 326, bodyHw + 4, 22, 10, LEATH.hi, 1, LEATH.mid);             // front
  roundRect(t, 192, 292, 28, 56, 9, LEATH.lo, 1);                                 // strap
  roundRect(t, 192, 296, 32, 21, 8, BRASS.hi, 1, BRASS.lo);                       // buckle
  roundRect(t, 192, 296, 13, 10, 4, LEATH.lo, 1);                                 // its tongue
}

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });

  { // === starter_pack.png — "Keeper's Welcome" ===============================
    // The store's hero card, and the only product that grants BOTH currencies,
    // so the icon is the only one that shows both: a wooden tray set out on the
    // shelf with one big amber gem and one bulb in it, tied with a sage ribbon.
    // Honest by construction — the tray is open and its whole contents are the
    // two things the SKU grants (1,200 amber + 5 hints).
    const { cv } = canvas();
    contactShadow(cv, 198, 344, 140, 22, 0.32);
    ellipse(cv, 192, 196, 172, 172, '#FFF3D2', 0.24, 38);
    withOutline(cv, t => {
      // back wall + the shadowed inside, so the goods sit DOWN IN the tray. That
      // inside was #43290F, which is INK to within a few points, so the whole
      // cavity graded as "a black void" rather than as the inside of a wooden
      // tray. It is now the tray's own timber in shadow, with a lit back edge,
      // and the two goods go down through `grouped` so the notch where the gem
      // meets the bulb carries that same timber instead of pooled contour.
      roundRect(t, 192, 258, 150, 84, 16, WOOD.base, 1, WOOD.dark);
      roundRect(t, 192, 238, 134, 46, 12, WOOD.mid, 1, WOOD.dark);
      roundRect(t, 192, 198, 134, 10, 4, WOOD.base, 0.9);
      // the goods
      grouped(t, g => {
        amberGem(g, 134, 172, 80, 14);
        hintBulb(g, 260, 176, 58);
      }, { fill: WOOD.dark, gradTo: WOOD.seam });
      // front wall over their bases
      roundRect(t, 192, 292, 150, 48, 14, WOOD.light, 1, WOOD.mid);
      roundRect(t, 192, 270, 150, 12, 5, WOOD.rim, 0.9);              // lip
      // the ribbon: one vertical strap, one band across, a square knot. Big and
      // flat — a bow would be lace at this size.
      roundRect(t, 176, 292, 17, 48, 5, ACCENT.lo, 1);
      roundRect(t, 192, 296, 150, 19, 7, ACCENT.main, 1, ACCENT.lo);
      roundRect(t, 176, 296, 27, 26, 8, INK, 0.9);
      roundRect(t, 176, 294, 22, 21, 7, ACCENT.main, 1, ACCENT.lo);
    }, { width: 10 });
    sheen(cv, 106, 128, 26, 16, 0.45);
    sheen(cv, 236, 146, 15, 22, 0.4);
    sheen(cv, 120, 282, 34, 8, 0.28);
    savePNG(path.join(OUT, 'starter_pack.png'), W, W, down2(cv, W, W));
  }

  { // === daily_amber.png — the FREE daily faucet =============================
    // +60 amber, twice a local day, for a short clip. The first pass drew it as
    // ONE gem set out in a shallow dish, and a blind read at true size put it
    // THIRD on the amber ladder: a dish is a vessel, that dish was wider than
    // the pouch, and its single gem was the LARGEST gem in the whole set, so the
    // size cue pointed the wrong way at the bottom of the ladder.
    //
    // This one leaves the vessel vocabulary entirely. It is not a quantity of
    // amber for sale, it is the DAY coming round again with a little amber in
    // it: a flat cottage sun, eight oversized rays, one small gem at its heart.
    // No container and no count, and the gem is smaller than the pouch's by
    // contract, so it can never read as the bottom rung of something you buy.
    // The disc is big and the rays are short bumps on purpose — a small centre
    // with long points is a STAR, and the season pass already owns a star.
    //
    // Two review fixes on the rays. They were drawn twice, an INK ray to len 142
    // under a gold ray to len 130, so the last 12px of every point was outline
    // colour with no gold in it at all, and where a wide base met its neighbour
    // the contour closed the gap between them: "ray tips are uneven, some choked
    // shut with contour and no gold reaching the point". The INK pass is gone —
    // the rays are part of the disc's own silhouette, so withOutline contours
    // them at its one constant width and the gold now reaches every point — and
    // the bases are narrow enough that the notch between two rays stays wider
    // than that contour can bridge. The gem also carries a heavier keyline
    // (`keyW`): every other gem in the set sits against a dark vessel mouth that
    // reinforces its edge, and this one sits alone on a pale disc, where the
    // shared 7px read at about half the weight of its siblings.
    const { cv } = canvas();
    const SX = 192, SY = 188;
    contactShadow(cv, 196, 348, 92, 16, 0.28);
    ellipse(cv, 192, 188, 170, 170, '#FFF3D2', 0.30, 36);
    ellipse(cv, 192, 188, 104, 104, '#FFFBEC', 0.30, 26);
    withOutline(cv, t => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        poly(t, [
          [SX + Math.cos(a) * 136, SY + Math.sin(a) * 136],
          [SX + Math.cos(a - 0.225) * 78, SY + Math.sin(a - 0.225) * 78],
          [SX + Math.cos(a + 0.225) * 78, SY + Math.sin(a + 0.225) * 78],
        ], '#F6D485', 1, '#D89B2C');
      }
      roundRect(t, SX, SY, 92, 92, 92, '#FFEBAE', 1, '#EAB85E');   // the disc
      roundRect(t, SX, SY, 76, 76, 76, '#FFF6D8', 1, '#F6D68E');
      amberGem(t, SX, SY, 32, 12);                    // smaller than the pouch's
    }, { width: 10 });
    sheen(cv, 160, 152, 16, 12, 0.4);
    savePNG(path.join(OUT, 'daily_amber.png'), W, W, down2(cv, W, W));
  }
  { // === amber_small.png — "Pouch of Amber", 600 =============================
    // LADDER STEP 1: the narrowest crock, ONE gem. See amberCrock above for why
    // all three rungs are now the same vessel in the same material with the same
    // gem size. The single sheen sits high on the belly, entirely inside the
    // cream and clear of the cobalt band, so it can never smear across a
    // material boundary the way the first pass's leather seam did.
    const { cv } = canvas();
    contactShadow(cv, 196, 356, 92, 13, 0.32);
    ellipse(cv, 192, 218, 150, 150, '#FFF3D2', 0.18, 34);
    withOutline(cv, t => {
      amberCrock(t, {
        bellyHw: 76, bellyHh: 60, collarHw: 86, collarHh: 26, lipHh: 12,
        gems: [[192, 178]],
      });
    }, { width: 10 });
    sheen(cv, 150, 258, 16, 18, 0.32);
    sheen(cv, 178, 164, 10, 8, 0.45);
    savePNG(path.join(OUT, 'amber_small.png'), W, W, down2(cv, W, W));
  }
  { // === amber_medium.png — "Jar of Amber", 2,000 ============================
    // LADDER STEP 2: the same crock, half again as wide, THREE gems in the same
    // size as the pouch's one. Nothing else moves — same stoneware, same cobalt
    // band, same collar, same shelf line.
    const { cv } = canvas();
    contactShadow(cv, 196, 356, 116, 14, 0.32);
    ellipse(cv, 192, 202, 166, 166, '#FFF3D2', 0.22, 36);
    withOutline(cv, t => {
      amberCrock(t, {
        bellyHw: 106, bellyHh: 72, collarHw: 118, collarHh: 28, lipHh: 14,
        gems: [[144, 156], [240, 156], [192, 110]],
      });
    }, { width: 10 });
    sheen(cv, 136, 240, 20, 22, 0.32);
    sheen(cv, 178, 96, 10, 8, 0.45);
    savePNG(path.join(OUT, 'amber_medium.png'), W, W, down2(cv, W, W));
  }
  { // === amber_large.png — "Hoard of Amber", 5,500 (BEST VALUE) ==============
    // LADDER STEP 3: the widest crock, SIX gems heaped over the rim in two rows,
    // still the same gem size as the pouch's one. The heap is what makes this
    // the hoard; it is not a different object, and it has no lid — a closed
    // chest with light coming out of the seam is loot-box framing, and the
    // hoard's whole job is to show plainly that this is the same amber, more.
    const { cv } = canvas();
    contactShadow(cv, 196, 354, 146, 15, 0.34);
    ellipse(cv, 192, 196, 174, 174, '#FFF3D2', 0.26, 38);
    withOutline(cv, t => {
      amberCrock(t, {
        bellyHw: 138, bellyHh: 80, collarHw: 152, collarHh: 30, lipHh: 16,
        gems: [[80, 142], [155, 142], [229, 142], [304, 142], [155, 98], [229, 98]],
      });
    }, { width: 10 });
    sheen(cv, 122, 228, 22, 24, 0.32);
    sheen(cv, 141, 84, 10, 8, 0.45);
    savePNG(path.join(OUT, 'amber_large.png'), W, W, down2(cv, W, W));
  }
  { // === hints_small.png — "Handful of Hints", 5 =============================
    // LADDER STEP 1 of the hint pair: the narrow satchel, TWO bulbs. See
    // hintSatchel above for why both rungs are now the same bag in the same
    // leather with the same bulb size, and why the step is two against five.
    //
    // The three drafts this replaces are worth keeping: three bulbs bound by a
    // rope with two hanging cut ends read as crossed sticks attached to nothing,
    // the same rope without them read as a bone-coloured bar, and a leather
    // strap with a brass buckle finally read as a strap — but a strap with no
    // bag under it is not a smaller version of a bag, which is the whole job of
    // a bottom rung. The dark nicks a review found on the top edge of that strap
    // (where the bulbs' outlines merged into it) go with it.
    const { cv } = canvas();
    contactShadow(cv, 196, 356, 92, 14, 0.32);
    ellipse(cv, 192, 214, 152, 152, '#FFF6DC', 0.22, 34);
    withOutline(cv, t => {
      hintSatchel(t, { bodyHw: 76, bulbs: [161, 223] });
    }, { width: 10 });
    sheen(cv, 142, 276, 18, 12, 0.3);
    sheen(cv, 148, 132, 10, 8, 0.4);
    savePNG(path.join(OUT, 'hints_small.png'), W, W, down2(cv, W, W));
  }
  { // === hints_large.png — "Satchel of Hints", 20 (BEST VALUE) ===============
    // LADDER STEP 2: the same satchel, twice as wide, FIVE of the same bulbs.
    // Nothing else moves — same leather, same flap, same strap, same brass
    // buckle, same shelf line, same bulb size.
    const { cv } = canvas();
    contactShadow(cv, 196, 356, 152, 15, 0.34);
    ellipse(cv, 192, 202, 174, 174, '#FFF6DC', 0.24, 36);
    withOutline(cv, t => {
      hintSatchel(t, { bodyHw: 156, bulbs: [68, 130, 192, 254, 316] });
    }, { width: 10 });
    sheen(cv, 92, 272, 22, 12, 0.3);
    sheen(cv, 56, 132, 10, 8, 0.4);
    savePNG(path.join(OUT, 'hints_large.png'), W, W, down2(cv, W, W));
  }

  { // === supporter.png — the monthly subscription =========================
    // A straw skep on its board.
    //
    // This icon used to be the leaf wreath, and blind it read as SEASONAL — the
    // season pass's job, which was meanwhile drawn as a star-stamped document
    // and read as a premium credential. The two were pointing at each other, so
    // the wreath went to the season and Supporter needed an object of its own.
    // The brief for it is narrow: an ongoing relationship rather than a stock of
    // goods, and distinguishable at 56dp from a key and from a certificate,
    // because Supporter, Patron and the season pass otherwise crowd one
    // support-and-prestige space.
    //
    // A hive is the cottage object for a thing that keeps giving, month after
    // month, for as long as you keep it. The dome is the one silhouette neither
    // set already owns — a lantern (deepen_star_loft), a bell (deepen_belfry), a
    // mug (theme_bone) and a teapot (upgrade_kitchen) are all taken, which is
    // what ruled out the obvious alternatives — and it cannot be mistaken for a
    // long diagonal metal thing or for a flat card at any size.
    //
    // Six coils, each oversized, each top-lit with its own shadow under it, and
    // one big arched entrance at the foot: the entrance is the tell that makes a
    // skep a skep instead of a haystack, so it is drawn large and dark with a
    // lit landing board under it. Nothing is promised that the store row does
    // not: no honey, no swarm, no goods spilling out.
    const { cv } = canvas();
    contactShadow(cv, 196, 350, 148, 14, 0.32);
    ellipse(cv, 192, 196, 172, 172, '#FFF3D2', 0.22, 36);
    withOutline(cv, t => {
      // the board it stands on
      roundRect(t, 192, 336, 152, 11, 5, WOOD.light, 1, WOOD.mid);
      // The coils. Their widths follow a DOME, not a taper: 1.00, .98, .93, .84,
      // .71, .54, .32 of the base. An even taper drew a ziggurat, which is the
      // shape of a stacked cake and not of a skep, and the whole naming of this
      // icon rests on the profile. Each course is a full capsule (corner radius
      // = its own half-height) with a shaded underside, so the coils read as
      // rope of straw laid up in rounds rather than as flat discs with hairline
      // grooves between them, and each overlaps the one below by ~5px so no
      // notch can open between two courses.
      const COILS = [
        [308, 142, 22], [272, 139, 21], [236, 132, 20], [202, 119, 19],
        [170, 101, 18], [140, 76, 17], [112, 46, 16],
      ];
      for (const [cy, hw, hh] of COILS) {
        roundRect(t, 192, cy, hw, hh, hh, STRAW.hi, 1, STRAW.base);
        roundRect(t, 192, cy + hh * 0.56, hw * 0.96, hh * 0.36, hh * 0.36, STRAW.mid, 0.75);
      }
      roundRect(t, 192, 84, 17, 13, 9, STRAW.up, 1, STRAW.mid);        // the crown knot
      // the entrance: an arch cut down to the board, dark enough to be a way in
      roundRect(t, 192, 302, 27, 24, 22, '#4A2D10', 1, '#261606');
      roundRect(t, 192, 316, 27, 12, 3, '#2C1A08', 1);
      roundRect(t, 192, 328, 40, 9, 4, STRAW.hi, 1, STRAW.mid);        // landing board
    }, { width: 10 });
    sheen(cv, 168, 104, 16, 10, 0.42);
    sheen(cv, 106, 234, 15, 24, 0.28);
    savePNG(path.join(OUT, 'supporter.png'), W, W, down2(cv, W, W));
  }

  { // === cosmetic_bundle.png — "The Keeper's Collection" =====================
    // Grants exactly two things — the Eclipse tile set and Eclipse confetti — so
    // the icon is exactly two things, SIDE BY SIDE: an Eclipse letter tile in the
    // game's own tile chrome (edge slab, bevel plane, gloss bar, specular dot)
    // and one Eclipse confetti bloom behind its shoulder, echoing the bloom the
    // Cosmetic Shop already uses for that palette. Both palettes are lifted
    // verbatim from shopIcons/themes.mjs, so the picture IS the product.
    //
    // The first pass fanned blades all the way around the tile instead. At 56dp
    // only their stubs cleared it and they read as tabs — a purple luggage tag
    // with coloured ears. A 192px box cannot hold a full radial fan around a
    // 170px tile; two masses beside each other can say the same thing and be read.
    const { cv } = canvas();
    contactShadow(cv, 190, 334, 128, 20, 0.32);
    ellipse(cv, 192, 186, 168, 168, '#FBF0FF', 0.26, 36);
    withOutline(cv, t => {
      // the confetti bloom: six OVERSIZED lobes around a pale core
      // The bloom goes down as one bedded cluster: six petals radiating from a
      // hub leave a narrow V between every neighbouring pair, and a review found
      // the pair at the top reading as "a broad dark field between two petals" —
      // withOutline filling that V edge to edge in contour brown. Bedded in the
      // palette's own deep plum, the same gap reads as the shadow under the
      // bloom, and each petal keeps its own keyline at constant width.
      const BX = 274, BY = 146;
      const LOBES = [[-90, ECL.rose], [-30, ECL.iris], [30, ECL.plum], [90, ECL.rose], [150, ECL.iris], [210, ECL.plum]];
      grouped(t, g => {
        for (const [deg, colr] of LOBES) {
          const a = (deg * Math.PI) / 180;
          const cx = BX + Math.cos(a) * 46, cy = BY + Math.sin(a) * 46;
          poly(g, roundRectPts(cx, cy, 46, 28, 25, a), INK, 0.95);
          poly(g, roundRectPts(cx, cy, 40, 22, 21, a), colr, 1, shade(colr, 0.6));
        }
        ellipse(g, BX, BY, 30, 30, INK, 0.95, 3);
        ellipse(g, BX, BY, 24, 24, '#E8DCF5', 1, 3);
        ellipse(g, BX - 7, BY - 8, 10, 8, '#FFFFFF', 0.8, 4);
      }, { fill: ECL.deep, gradTo: shade(ECL.deep, 0.7) });
      // the tile, extruded: base plane, side plane, face, bevel, gloss, specular
      const ang = (-8 * Math.PI) / 180;
      const TC = { x: 150, y: 208, hw: 88, hh: 92 };
      const RR = (dy, hw, hh, rad) => roundRectPts(TC.x - Math.sin(ang) * dy, TC.y + Math.cos(ang) * dy, hw, hh, rad, ang);
      poly(t, RR(16, TC.hw + 9, TC.hh + 23, 28), INK, 1);
      poly(t, RR(32, TC.hw, TC.hh, 24), shade(ECL.side, 0.55));
      poly(t, RR(16, TC.hw, TC.hh, 24), ECL.side);
      poly(t, RR(0, TC.hw, TC.hh, 24), ECL.face);
      poly(t, RR(-TC.hh * 0.46, TC.hw - 6, TC.hh * 0.54, 21), shade(ECL.face, 1.2));
      poly(t, RR(-TC.hh * 0.64, TC.hw * 0.74, TC.hh * 0.12, 12), '#FFFFFF', 0.38);
      // its W, drawn as four thick strokes (the shipped tile art's own glyph)
      const P = (lx, ly) => [TC.x + lx * Math.cos(ang) - ly * Math.sin(ang), TC.y + lx * Math.sin(ang) + ly * Math.cos(ang)];
      const SEG = [[-32, -34, -18, 32], [-18, 32, 0, -10], [0, -10, 18, 32], [18, 32, 32, -34]];
      for (const [x0, y0, x1, y1] of SEG) {
        const a = P(x0, y0 + 9), b = P(x1, y1 + 9);
        capsule(t, a[0], a[1], b[0], b[1], 16, ECL.deep, 0.6);
      }
      for (const [x0, y0, x1, y1] of SEG) {
        const a = P(x0, y0 + 2), b = P(x1, y1 + 2);
        capsule(t, a[0], a[1], b[0], b[1], 14, '#F3E7FF');
      }
      const [sx, sy] = P(TC.hw * 0.58, -TC.hh * 0.56);
      ellipse(t, sx, sy, 11, 11, '#FFFFFF', 0.75, 4);
    }, { width: 10 });
    sheen(cv, 130, 132, 30, 14, 0.35);
    savePNG(path.join(OUT, 'cosmetic_bundle.png'), W, W, down2(cv, W, W));
  }

  { // === patron_key.png — the top one-time tier ==============================
    // The product is literally a key (com.wordshift.patron_key), and what it
    // unlocks is warmth: +2 amber a puzzle, the Patron tile set, a quieter table.
    // So: one heavy brass key laid across the tile, with an amber gem set in its
    // collar. Diagonal, because a diagonal key fills a square box the way an
    // upright one cannot, and the bow is a real ring (walked, not filled) so the
    // head reads as a handle.
    const { cv } = canvas();
    contactShadow(cv, 206, 336, 112, 20, 0.3);
    ellipse(cv, 182, 178, 160, 160, '#FFF3D2', 0.24, 34);
    withOutline(cv, t => {
      const G = { hi: '#FFDE96', up: '#EFC15F', mid: '#C99326', lo: '#8A6015' };
      // THE SHAFT STARTS OUTSIDE THE BOW. The first pass began it at (150,148),
      // whose round cap reached to within 21px of the bow's centre and left a
      // gold lump sitting in the middle of the hole with half its outline
      // missing. A key's bow has to stay a hole; the shaft now meets the ring's
      // outer band and stops there.
      capsule(t, 186, 182, 274, 270, 46, G.mid);
      capsule(t, 192, 190, 268, 264, 20, G.up, 0.9);
      // THE BIT, as ONE polygon.
      //
      // It was four capsules laid across the shaft, and a review took it apart
      // at pixel level: "a contour-coloured bar starts and stops INSIDE the gold
      // fill with a squared-off end on no silhouette edge; a detached lighter-
      // gold rounded square belongs to no shape; and where the two teeth merge
      // the union leaves an asymmetric lump with a concave notch. At 56dp the
      // bit is a formless blob, so the key is not readable as a key below full
      // size." All three are the same fault: a bit built by unioning round-capped
      // strokes has caps and seams that belong to no edge of the thing.
      //
      // So it is now a single comb, computed in the shaft's own frame (u along
      // the shaft, v across it) and filled once: a web hanging off the shaft's
      // lower flank with two square teeth at its ends and one square notch
      // between them. One outline, one fill, no seams, and the widest part of
      // the silhouette is the bit — which is what makes a key a key rather than
      // the magnifying glass an earlier pass read as.
      const KA = Math.PI / 4, KC = Math.cos(KA), KSn = Math.sin(KA);
      const KP = (u, v) => [120 + u * KC - v * KSn, 116 + u * KSn + v * KC];
      const comb = (uA, uB, uC, uD, vTop, vWeb, vTip) => [
        KP(uA, vTop), KP(uB, vTop), KP(uB, vTip), KP(uD, vTip),
        KP(uD, vWeb), KP(uC, vWeb), KP(uC, vTip), KP(uA, vTip),
      ];
      poly(t, comb(146, 238, 176, 208, 12, 66, 100), G.lo, 1);
      poly(t, comb(153, 231, 169, 215, 19, 57, 91), G.hi, 1, G.mid);
      // the bow, left open so the contour runs round the hole as well
      ringWalk(t, 120, 116, 62, 40, G.lo, 1);
      ringWalk(t, 120, 116, 62, 29, G.hi, 1);
      ringWalk(t, 120, 116, 62, 10, G.mid, 0.55);
      // THE COLLAR IS A BAR, not a capsule. A capsule's two round caps stuck out
      // either side of the gem as flat pale discs with no outline of their own
      // and graded as stray blobs; a rotated bar with its own keyline is a part
      // of the key.
      const CA = -Math.PI / 4;
      poly(t, roundRectPts(191, 185, 56, 38, 14, CA), INK, 0.95);
      poly(t, roundRectPts(191, 185, 49, 31, 11, CA), G.hi, 1, G.mid);
      amberGem(t, 191, 185, 30, 9);
    }, { width: 10 });
    sheen(cv, 77, 73, 15, 9, 0.42);
    sheen(cv, 183, 177, 8, 6, 0.45);
    savePNG(path.join(OUT, 'patron_key.png'), W, W, down2(cv, W, W));
  }
  { // === remove_ads.png — the cheaper one-time quiet =========================
    // A pair of cottage shutters, closed and latched.
    //
    // FOUR drafts died before this one, and they are worth recording because
    // three of the four failed at READING rather than at craft.
    //   1. A shuttered window drawn as architecture: sage leaves with a crescent
    //      cut across the mullion. Three blind readers could not name it as a
    //      product, and it was the only full-bleed PANEL in either set where
    //      every other icon is a discrete object on its own contact shadow.
    //   2. A bell laid on its side. A bell seen mouth-on is a horn, so the tile
    //      graded as a MEGAPHONE: the symbol of the very thing this removes.
    //   3. A bell muffled under a cloth. Muffling it costs the flare that makes
    //      a bell a bell, so it graded as a cone on a cushion. (Bells were then
    //      ruled out outright: assets/ui/bell.png and shop/deepen_belfry are
    //      both already bells.)
    //   4. A steaming mug. Nameable, which the first three were not — but three
    //      readers still could not get from it to the product, and worse, it
    //      DUPLICATED shop/theme_bone, which is a mug at the same three-quarter
    //      angle with the same silhouette in a different colour. Two mugs
    //      meaning unrelated things in a 71-icon set is an identification
    //      failure whatever the craft.
    //
    // So: an object, not a panel; a silhouette no other icon in either set owns;
    // and a thing that says "not now" by what it is doing rather than by
    // symbolism. Shutters pulled to and latched are that. The louvres give a
    // texture nothing else here has, the central seam and the iron hasp across
    // it are what say CLOSED rather than merely wooden, and the two hinges on
    // the outer edges are what say shutters rather than a crate lid.
    //
    // The slats are deliberately fat with fat gaps (15px on 46px of pitch in the
    // supersample, so ~2dp of shadow between courses at ship size) because a
    // louvre drawn at true scale is a stack of hairlines that averages to grey
    // fuzz. The gaps are the recess showing through, which is a real material —
    // they are interior to the leaf, so no contour is involved anywhere in them.
    const { cv } = canvas();
    contactShadow(cv, 196, 352, 112, 15, 0.32);
    ellipse(cv, 192, 192, 168, 168, '#FFF3D2', 0.20, 36);
    withOutline(cv, t => {
      // the two hinges, behind the leaves so they read as straps pinned on
      for (const hx of [80, 304]) {
        for (const hy of [110, 274]) {
          roundRect(t, hx, hy, 24, 16, 5, IRON.hi, 1, IRON.lo);
          ellipse(t, hx - 9, hy, 5, 5, IRON.lo, 1, 2);
        }
      }
      // the leaves, overlapping by a pixel at the centre so no notch can open
      // along the seam for the contour to flood
      for (const lx of [141, 243]) {
        roundRect(t, lx, 192, 52, 150, 9, WOOD.base, 1, WOOD.mid);        // stile frame
        roundRect(t, lx, 192, 38, 128, 6, shade(WOOD.seam, 0.8), 1, shade(WOOD.seam, 0.6));
        // The louvres are TILTED, which is the point: a stack of level bars in a
        // wooden frame is a crate, and slats set at an angle in the same frame
        // can only be a louvre. Each casts a shadow up into the recess behind it.
        for (const dy of [-105, -63, -21, 21, 63, 105]) {
          poly(t, roundRectPts(lx, 192 + dy - 7, 36, 5, 5, -0.15), shade(WOOD.seam, 0.55), 0.85);
          poly(t, roundRectPts(lx, 192 + dy, 36, 9, 8, -0.15), WOOD.light, 1, WOOD.mid);
        }
        roundRect(t, lx, 60, 48, 8, 4, WOOD.rim, 0.85);                    // lit top rail
        roundRect(t, lx, 326, 48, 8, 4, WOOD.mid, 0.7);                    // shaded bottom rail
      }
      roundRect(t, 192, 192, 5, 148, 2, shade(WOOD.seam, 0.7), 0.95);     // the meeting seam
      // The hasp: an iron bar thrown across that seam, with its boss and its
      // staple. This is the whole reading of the icon — shutters that are merely
      // shut are a cupboard, shutters that are FASTENED are the product — so it
      // is the heaviest, darkest part and it carries its own keyline.
      roundRect(t, 192, 192, 70, 22, 9, INK, 0.95);
      roundRect(t, 192, 192, 64, 16, 7, IRON.hi, 1, IRON.base);
      roundRect(t, 158, 192, 9, 20, 4, IRON.lo, 1);                       // the staple it drops over
      ellipse(t, 192, 192, 22, 22, INK, 0.95, 3);
      ellipse(t, 192, 192, 16, 16, IRON.base, 1, 3);
      ellipse(t, 192, 192, 7, 7, IRON.lo, 1, 2);
      ellipse(t, 187, 186, 5, 4, IRON.hi, 0.9, 3);
    }, { width: 10 });
    sheen(cv, 108, 84, 20, 11, 0.3);
    sheen(cv, 172, 180, 7, 5, 0.45);
    savePNG(path.join(OUT, 'remove_ads.png'), W, W, down2(cv, W, W));
  }

  { // === season_premium.png — the Season Pass premium track ==================
    // THE WREATH LIVES HERE NOW.
    //
    // Blind, this icon and Supporter pointed at each other: the leaf wreath
    // (drawn for Supporter) read as SEASONAL, and the star-badge document
    // (drawn for the season pass) read as a premium credential. The wreath is
    // the stronger drawing of the two, so it goes to the product it was already
    // naming — a season is a thing that comes round, a wreath is the object for
    // that — and Supporter takes a new one. The pass's own teal seal comes with
    // it as the medallion at the knot, so the track and the confetti it ends on
    // are still visibly the same season, and the amber star is still the pass's
    // mark.
    //
    // The card this replaces had two pixel defects a review named, and both go
    // with it: a sliver of the back card punching through the top contour of the
    // teal header (the outline bulging to take it), and a tan crescent of card
    // fill trapped fully inside outline colour under the badge.
    //
    // The whole assembly goes down through `grouped`. A leaf crossing a rope
    // ring, and a medallion meeting that ring, both make long shallow wedges,
    // and every one of them was filling with contour brown — the review found it
    // as "the bottom third of the wreath interior". Bedded in the leaves' own
    // deep green they read as shadow under the binding instead. That also
    // settles the two point defects flagged on the wreath itself: the amber gem
    // with no dark contour of its own, which read as a hole punched through and
    // filled with amber, and the two cream slivers of the band marooned in
    // outline colour beside it. The gem is now a keylined medallion big enough
    // to close the bottom of the ring on its own.
    const { cv } = canvas();
    contactShadow(cv, 196, 344, 116, 17, 0.3);
    ellipse(cv, 192, 182, 164, 164, '#FFF3D2', 0.22, 36);
    const RC = { x: 192, y: 176, r: 102 };
    withOutline(cv, t => {
      grouped(t, g => {
        ringWalk(g, RC.x, RC.y, RC.r, 32, shade(ROPE.lo, 0.8), 1);
        ringWalk(g, RC.x, RC.y, RC.r, 23, ROPE.hi, 1);
        ringWalk(g, RC.x, RC.y, RC.r, 9, ROPE.base, 0.5);
        const LEAVES = [-96, -45, 6, 57, 114, 165, 216];                 // degrees
        for (const deg of LEAVES) {
          const a = (deg * Math.PI) / 180;
          const ca = Math.cos(a), sa = Math.sin(a);
          const bx = RC.x + ca * 62, by = RC.y + sa * 62;
          const tx = RC.x + ca * 146, ty = RC.y + sa * 146;
          poly(g, leafPts(bx, by, tx, ty, 56, 20), INK, 0.95);
          poly(g, leafPts(bx, by, tx, ty, 46, 18), ACCENT.main, 1, ACCENT.lo);
          capsule(g, bx, by, tx, ty, 7, shade(ACCENT.lo, 0.8), 0.5);     // one big midrib
        }
        cord(g, 152, 286, 232, 286, 30, ROPE);                           // the knot
        // the season's seal, hung at the knot: teal, keylined, amber star
        ellipse(g, 192, 296, 58, 58, INK, 0.95, 3);
        ellipse(g, 192, 296, 51, 51, TEAL.base, 1, 3);
        ellipse(g, 192, 290, 40, 40, TEAL.hi, 1, 5);
        poly(g, starPts(192, 294, 33, 15), INK, 0.9);
        poly(g, starPts(192, 292, 27, 12), AMBER.up, 1, AMBER.mid);
      }, { fill: shade(ACCENT.lo, 0.5), gradTo: shade(ACCENT.lo, 0.34) });
    }, { width: 10 });
    sheen(cv, 128, 112, 26, 17, 0.35);
    sheen(cv, 170, 274, 14, 10, 0.5);
    savePNG(path.join(OUT, 'season_premium.png'), W, W, down2(cv, W, W));
  }

  // NOTE: there is deliberately no store_placeholder.png. The unmapped-id
  // fallback reuses the Cosmetic Shop's parcel (assets/ui/shop/shop_placeholder.png)
  // via storeArt.ts. Three blind reviewers found a store-local parcel
  // indistinguishable from the shop's at 56dp; since both mean exactly the same
  // thing and never share a screen, one asset is the fix and a second unrelated
  // object drawn only to avoid the collision would be the wrong one.
}
