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
 *   store_placeholder  the unmapped-id fallback
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
 *      handful  THREE bulbs strapped at the neck              280px
 *      satchel  a flapped bag with FOUR of the same bulbs     345px
 *    The hint pair follows the same discipline: same bulb size on both rungs
 *    (the first pass had the SMALLER pack carrying the BIGGER bulbs), and the
 *    satchel's own strap and buckle bind the handful, so the two read as family.
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
 * The two subscription-shaped products cannot be a literal pile of goods, so
 * they are the objects a cottage would use for them: Supporter is a bound wreath
 * with one amber gem at its knot (a thing that comes round again, and the amber
 * it brings), the season premium track is a sealed pass. Remove Ads is a mug of
 * tea, still steaming: what that product buys is the quieter table the store row
 * promises. None of them promises anything the store row beside it does not.
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
  WOOD, PARCH, ACCENT, BRASS,
  ellipse, roundRect, poly, capsule, tri, hexPts, starPts,
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
const CAP = { hi: '#C9BFE4', base: '#A79BC8', lo: '#786C9E' };
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
function amberGem(t, cx, cy, R) {
  const P = hexPts(cx, cy, R);
  const inner = hexPts(cx, cy - R * 0.05, R * 0.76);
  poly(t, hexPts(cx, cy, R + 7), INK, 0.95);                 // keyline
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
 */
function hintBulb(t, cx, cy, R) {
  const neckY = cy + R * 0.86;
  roundRect(t, cx, neckY + R * 0.30, R * 0.44, R * 0.40, 6, INK, 0.95);      // neck keyline
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
  for (const [gx, gy] of gems) amberGem(t, gx, gy, GEM_R);
  roundRect(t, 192, collarCy + collarHh * 0.55, collarHw, lipHh, 7, WARE.base, 1, WARE.lo);  // front lip
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
      // back wall + the shadowed inside, so the goods sit DOWN IN the tray
      roundRect(t, 192, 258, 150, 84, 16, WOOD.base, 1, WOOD.dark);
      roundRect(t, 192, 238, 134, 46, 12, '#43290F', 1);
      // the goods
      amberGem(t, 134, 172, 80);
      hintBulb(t, 260, 176, 58);
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
    const { cv } = canvas();
    const SX = 192, SY = 188;
    const ray = (t, len, wide, colr, alpha, grad) => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        poly(t, [
          [SX + Math.cos(a) * len, SY + Math.sin(a) * len],
          [SX + Math.cos(a - wide) * 84, SY + Math.sin(a - wide) * 84],
          [SX + Math.cos(a + wide) * 84, SY + Math.sin(a + wide) * 84],
        ], colr, alpha, grad);
      }
    };
    contactShadow(cv, 196, 348, 92, 16, 0.28);
    ellipse(cv, 192, 188, 170, 170, '#FFF3D2', 0.30, 36);
    ellipse(cv, 192, 188, 104, 104, '#FFFBEC', 0.30, 26);
    withOutline(cv, t => {
      ray(t, 142, 0.36, INK, 0.95, null);             // each ray keeps its own
      ray(t, 130, 0.285, '#F6D485', 1, '#D89B2C');    // edge, never a soft fan
      roundRect(t, SX, SY, 92, 92, 92, '#FFEBAE', 1, '#EAB85E');   // the disc
      roundRect(t, SX, SY, 76, 76, 76, '#FFF6D8', 1, '#F6D68E');
      amberGem(t, SX, SY, 32);                        // smaller than the pouch's
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
    // LADDER STEP 1 of the hint pair: exactly what "a handful" is — three bulbs
    // strapped at the neck. No container, so the satchel above it can never be
    // mistaken for the smaller one, and the strap and buckle are the SATCHEL's
    // own, so the two rungs read as one family.
    //
    // Three review fixes. The bulbs are the SAME SIZE as the satchel's, and the
    // same size as each other: the first pass mixed R48 and R60 here and R44-50
    // there, so the SMALLER pack carried the BIGGER bulbs — the amber ladder's
    // own mistake, in the other list. They sit on one line, because a raised
    // middle one put its collar 40px above its neighbours' and no single binding
    // could credibly cross all three. And the binding took three tries: rope
    // with two hanging cut ends read as crossed sticks attached to nothing (the
    // review's finding), rope without them read as a bone-coloured bar, and a
    // sage ribbon read as a hedge the bulbs were planted in. What a horizontal
    // band needs is a PART in the middle of it, so the eye reads a strap rather
    // than a bar; a buckle is that part.
    const { cv } = canvas();
    contactShadow(cv, 196, 300, 106, 16, 0.3);
    ellipse(cv, 192, 196, 158, 158, '#FFF6DC', 0.26, 34);
    withOutline(cv, t => {
      for (const bx of [100, 192, 284]) hintBulb(t, bx, 192, 42);
      roundRect(t, 192, 262, 110, 20, 6, LEATH.base, 1, LEATH.lo);     // the strap
      roundRect(t, 192, 255, 110, 6, 3, LEATH.hi, 0.65);
      roundRect(t, 226, 262, 46, 15, 5, LEATH.mid, 1, LEATH.lo);       // its loose end
      roundRect(t, 192, 262, 31, 31, 9, INK, 0.95);                    // and the buckle
      roundRect(t, 192, 262, 26, 26, 7, BRASS.hi, 1, BRASS.lo);
      roundRect(t, 192, 262, 10, 10, 3, LEATH.lo, 1);
    }, { width: 10 });
    sheen(cv, 146, 260, 20, 5, 0.3);
    savePNG(path.join(OUT, 'hints_small.png'), W, W, down2(cv, W, W));
  }
  { // === hints_large.png — "Satchel of Hints", 20 (BEST VALUE) ===============
    // LADDER STEP 2: a flapped leather satchel (the widest thing in the pair)
    // with FOUR bulbs coming out of the top, against the bundle's three.
    //
    // Two review fixes, both about the repeated object actually repeating. The
    // first pass fanned four bulbs at four heights and two sizes; where a low
    // bulb met a high one the two keylines and the contour pooled in the deep
    // notch between them and punched what read as a HOLE in the cluster, and the
    // outer two sat low enough that the bag ate their lavender collars while the
    // inner two kept theirs. Four identical bulbs on ONE line fix both at once:
    // the notches between neighbours are shallow and symmetric (a bulb resting
    // against a bulb), and all four collars clear the bag by the same amount.
    const { cv } = canvas();
    contactShadow(cv, 196, 350, 140, 16, 0.33);
    ellipse(cv, 192, 200, 170, 170, '#FFF6DC', 0.24, 36);
    withOutline(cv, t => {
      // the bag's dark inside, BEHIND the bulbs. Four circles standing in a row
      // leave a V of bare canvas between each pair, and against the pale halo
      // those Vs read as light wedges punched through the cluster; against the
      // inside of the bag they read as what they are, the gaps between bulbs.
      roundRect(t, 192, 202, 132, 48, 18, '#3A2412', 1);
      for (const bx of [74, 152, 230, 308]) hintBulb(t, bx, 150, 42);
      roundRect(t, 192, 272, 140, 62, 20, LEATH.base, 1, LEATH.lo);    // bag body
      roundRect(t, 192, 262, 148, 50, 24, LEATH.hi, 1, LEATH.base);    // the flap
      roundRect(t, 192, 296, 148, 12, 5, LEATH.mid, 0.8);              // its edge
      roundRect(t, 192, 318, 146, 30, 12, LEATH.hi, 1, LEATH.mid);     // front
      roundRect(t, 192, 306, 30, 50, 9, LEATH.lo, 1);                  // strap
      roundRect(t, 192, 310, 34, 22, 8, BRASS.hi, 1, BRASS.lo);        // buckle
      roundRect(t, 192, 310, 14, 11, 4, LEATH.lo, 1);                  // its tongue
    }, { width: 10 });
    sheen(cv, 128, 244, 30, 10, 0.28);
    sheen(cv, 184, 304, 7, 4, 0.4);
    savePNG(path.join(OUT, 'hints_large.png'), W, W, down2(cv, W, W));
  }
  { // === supporter.png — the monthly subscription ============================
    // A subscription is a relationship, not an object, so this is the object a
    // cottage keeps for one: a bound wreath — the thing that comes round again —
    // with a single amber gem at its knot for the 300 amber it brings each month.
    // Seven OVERSIZED leaves on a twine ring, never a scatter of small ones.
    const { cv } = canvas();
    contactShadow(cv, 196, 338, 112, 18, 0.3);
    ellipse(cv, 192, 184, 168, 168, '#FFF3D2', 0.22, 36);
    const RC = { x: 192, y: 182, r: 102 };
    withOutline(cv, t => {
      ringWalk(t, RC.x, RC.y, RC.r, 32, shade(ROPE.lo, 0.8), 1);
      ringWalk(t, RC.x, RC.y, RC.r, 23, ROPE.hi, 1);
      ringWalk(t, RC.x, RC.y, RC.r, 9, ROPE.base, 0.5);
      const LEAVES = [-96, -45, 6, 57, 114, 165, 216];                 // degrees
      for (const deg of LEAVES) {
        const a = (deg * Math.PI) / 180;
        const ca = Math.cos(a), sa = Math.sin(a);
        const bx = RC.x + ca * 62, by = RC.y + sa * 62;
        const tx = RC.x + ca * 148, ty = RC.y + sa * 148;
        poly(t, leafPts(bx, by, tx, ty, 56, 20), INK, 0.95);
        poly(t, leafPts(bx, by, tx, ty, 46, 18), ACCENT.main, 1, ACCENT.lo);
        capsule(t, bx, by, tx, ty, 7, shade(ACCENT.lo, 0.8), 0.5);     // one big midrib
      }
      cord(t, 152, 288, 232, 288, 32, ROPE);                            // the knot
      amberGem(t, 192, 300, 48);
    }, { width: 10 });
    sheen(cv, 128, 118, 26, 17, 0.35);
    sheen(cv, 170, 278, 15, 10, 0.5);
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
      const BX = 274, BY = 146;
      const LOBES = [[-90, ECL.rose], [-30, ECL.iris], [30, ECL.plum], [90, ECL.rose], [150, ECL.iris], [210, ECL.plum]];
      for (const [deg, colr] of LOBES) {
        const a = (deg * Math.PI) / 180;
        const cx = BX + Math.cos(a) * 46, cy = BY + Math.sin(a) * 46;
        poly(t, roundRectPts(cx, cy, 46, 28, 25, a), INK, 0.95);
        poly(t, roundRectPts(cx, cy, 40, 22, 21, a), colr, 1, shade(colr, 0.6));
      }
      ellipse(t, BX, BY, 30, 30, INK, 0.95, 3);
      ellipse(t, BX, BY, 24, 24, '#E8DCF5', 1, 3);
      ellipse(t, BX - 7, BY - 8, 10, 8, '#FFFFFF', 0.8, 4);
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
      capsule(t, 186, 182, 288, 286, 46, G.mid);
      capsule(t, 192, 190, 282, 280, 20, G.up, 0.9);
      // THE BIT. Two SQUARE teeth as thick as the shaft, set along its last
      // third — the widest part of the silhouette is the bit, which is what
      // makes a key a key rather than the magnifying glass an earlier pass read
      // as (a ring on a stick with nothing heavy at the far end).
      capsule(t, 236, 234, 190, 280, 46, G.mid);
      capsule(t, 230, 228, 186, 272, 18, G.up, 0.8);
      capsule(t, 282, 280, 226, 336, 46, G.mid);
      capsule(t, 276, 274, 222, 328, 18, G.up, 0.8);
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
      amberGem(t, 191, 185, 30);
    }, { width: 10 });
    sheen(cv, 77, 73, 15, 9, 0.42);
    sheen(cv, 183, 177, 8, 6, 0.45);
    savePNG(path.join(OUT, 'patron_key.png'), W, W, down2(cv, W, W));
  }
  { // === remove_ads.png — the cheaper one-time quiet =========================
    // The first pass drew a shuttered window: sage-green leaves (a hue outside
    // the set's palette) with a crescent cut across the mullion. Three blind
    // reviewers could not name it as a product at all, the crescent's lower horn
    // forked into two ragged spikes, and it straddled the seam with no shadow,
    // so it graded as a scratch on the glass. It was also the only full-bleed
    // architectural PANEL in either set, where every other icon is a discrete
    // object floating on its own contact shadow.
    //
    // Redrawn from the concept up. What this product actually buys is the thing
    // the store row calls it: a quieter table. So it is the object a cottage
    // keeps for that — a glazed mug, still steaming, nobody interrupting.
    // Two bell drafts died on the way here and are worth recording, because both
    // failures were failures of READING rather than of craft: a bell laid on its
    // side is seen mouth-on, and a bell seen mouth-on is a horn, so the tile
    // graded as a MEGAPHONE, the symbol of the very thing this product removes;
    // and a bell muffled under a cloth loses the flare that makes it a bell, so
    // it graded as a cone on a cushion. The mug is cobalt because that is
    // already the crockery glaze on the amber crocks — one cottage's ware — and
    // because a big blue mass is the one shape in this set that cannot be
    // confused with a gold one.
    const { cv } = canvas();
    const MX = 158;
    contactShadow(cv, 186, 352, 116, 16, 0.32);
    ellipse(cv, 192, 196, 168, 168, '#FFF3D2', 0.20, 36);
    withOutline(cv, t => {
      ringWalk(t, 266, 246, 48, 30, COBALT.lo, 1);                       // the handle,
      ringWalk(t, 266, 246, 48, 20, COBALT.hi, 1);                       // a real hole
      roundRect(t, MX, 254, 92, 84, 26, COBALT.hi, 1, COBALT.lo);        // body
      roundRect(t, MX, 300, 88, 38, 22, COBALT.lo, 1, shade(COBALT.lo, 0.72));
      roundRect(t, MX, 332, 76, 13, 6, shade(COBALT.lo, 0.8), 1);        // foot
      // two curls of steam, bases tucked behind the rim so they rise OUT of the
      // cup, and drawn as TAPERING curls rather than leaves: a leaf is widest at
      // its middle, and two of them standing over a mug read unmistakably as a
      // pair of rabbit ears. Oversized on purpose either way — a thin wisp
      // averages to grey fuzz at 56dp. Both bases sit ON the rim's centre line,
      // where the rim ellipse is at its widest and swallows them; started lower
      // they poked out under it as two dark stubs.
      const curl = (x0, y0, amp, h, th, colr, alpha) => {
        let px = x0, py = y0;
        for (let i = 1; i <= 20; i++) {
          const u = i / 20;
          const x = x0 + Math.sin(u * Math.PI * 1.5) * amp, y = y0 - u * h;
          capsule(t, px, py, x, y, th * (1 - u * 0.68), colr, alpha);
          px = x; py = y;
        }
      };
      curl(MX - 34, 178, 20, 128, 32, INK, 0.95);
      curl(MX - 34, 178, 20, 128, 21, PARCH.hi, 1);
      curl(MX + 42, 176, 17, 100, 28, INK, 0.95);
      curl(MX + 42, 176, 17, 100, 18, PARCH.hi, 1);
      ellipse(t, MX, 172, 94, 24, INK, 0.95, 3);                         // the rim,
      ellipse(t, MX, 172, 87, 18, WARE.hi, 1, 3);                        // cream glaze
      ellipse(t, MX, 175, 70, 12, '#6E3A16', 1, 3);                      // and the tea
      ellipse(t, MX, 173, 58, 8, '#95511F', 1, 3);
    }, { width: 10 });
    sheen(cv, 110, 224, 19, 28, 0.3);
    savePNG(path.join(OUT, 'remove_ads.png'), W, W, down2(cv, W, W));
  }
  { // === season_premium.png — the Season Pass premium track ==================
    // Bought with amber or carried by a Supporter, and what it opens is a track
    // of rewards, so the object is the pass itself: a parchment card with a heavy
    // teal wax seal stamped with an amber star. Teal is confetti_season's own
    // colour in shopIcons, so the pass and the confetti it ends on match.
    const { cv } = canvas();
    contactShadow(cv, 198, 336, 124, 20, 0.3);
    ellipse(cv, 192, 184, 164, 164, '#FFF3D2', 0.2, 36);
    withOutline(cv, t => {
      const A2 = (9 * Math.PI) / 180, A1 = (-7 * Math.PI) / 180;
      // the card behind: the track continues past this season
      poly(t, roundRectPts(216, 188, 94, 120, 16, A2), PARCH.dim, 1, PARCH.shadow);
      poly(t, roundRectPts(216, 188, 94, 120, 16, A2), INK, 0.14);
      // the pass itself
      poly(t, roundRectPts(178, 184, 100, 126, 16, A1), PARCH.hi, 1, PARCH.dim);
      const L = (lx, ly) => [178 + lx * Math.cos(A1) - ly * Math.sin(A1), 184 + lx * Math.sin(A1) + ly * Math.cos(A1)];
      poly(t, roundRectPts(...L(0, -92), 100, 34, 14, A1), TEAL.base, 1, TEAL.lo);   // header band
      poly(t, roundRectPts(...L(0, -100), 88, 9, 6, A1), TEAL.hi, 0.8);
      poly(t, roundRectPts(...L(-6, -18), 68, 13, 7, A1), PARCH.shadow, 0.85);       // one thick line
      poly(t, roundRectPts(...L(-22, 22), 52, 13, 7, A1), PARCH.shadow, 0.6);
      // the seal, over the card's lower edge
      ellipse(t, 246, 264, 60, 60, INK, 0.95, 3);
      ellipse(t, 246, 264, 53, 53, TEAL.base, 1, 3);
      ellipse(t, 246, 258, 42, 42, TEAL.hi, 1, 5);
      poly(t, starPts(246, 262, 34, 15), INK, 0.9);
      poly(t, starPts(246, 260, 28, 12), AMBER.up, 1, AMBER.mid);
    }, { width: 10 });
    sheen(cv, 128, 118, 30, 20, 0.4);
    sheen(cv, 224, 240, 16, 11, 0.45);
    savePNG(path.join(OUT, 'season_premium.png'), W, W, down2(cv, W, W));
  }

  { // === store_placeholder.png — the unmapped-id fallback ====================
    // Brown paper, twine, no bow. Drawn so a SKU added later can never render a
    // hole in the store list, and deliberately the dullest object in the set: it
    // should read as "something, unopened", and never as a mystery worth buying.
    const { cv } = canvas();
    const bx = 192, by = 200, hw = 126, hh = 132;
    contactShadow(cv, bx + 6, by + hh + 16, 118, 22, 0.33);
    withOutline(cv, t => {
      roundRect(t, bx, by, hw, hh, 18, KRAFT.hi, 1, KRAFT.lo);
      const CREASES = [
        [-96, -92, -30, -104], [30, -84, 98, -96], [-88, 66, -26, 80],
        [38, 78, 100, 62], [-56, -14, -14, -28], [52, 18, 100, 30],
      ];
      for (const [x1, y1, x2, y2] of CREASES) {
        capsule(t, bx + x1, by + y1, bx + x2, by + y2, 5, KRAFT.crease, 0.17);
      }
      roundRect(t, bx + hw - 38, by - hh + 34, 38, 34, 9, KRAFT.base, 0.8, KRAFT.lo);
      cord(t, bx - 14, by - hh - 4, bx - 14, by + hh + 4, 26);
      cord(t, bx - hw - 4, by - 30, bx + hw + 4, by - 30, 26);
      roundRect(t, bx - 14, by - 30, 33, 29, 12, INK, 0.9);
      roundRect(t, bx - 14, by - 33, 26, 22, 9, TWINE.hi, 1, TWINE.lo);
      capsule(t, bx - 28, by - 46, bx - 28, by - 14, 5, TWINE.lo, 0.5);
      capsule(t, bx, by - 46, bx, by - 14, 5, TWINE.lo, 0.5);
    }, { width: 10 });
    sheen(cv, bx - 78, by - 82, 44, 20, 0.3);
    savePNG(path.join(OUT, 'store_placeholder.png'), W, W, down2(cv, W, W));
  }
}
