/**
 * gameIcons/ceremony.mjs — the three PHASE-TRANSITION EMBLEMS (512px).
 *
 * PhaseTransitionOverlay plays a cinematic when the pit's wards ignite and the
 * game steps from one era to the next. The phase-4 and phase-5 ceremonies have
 * real in-engine art (the shadow figure, the roof the player raised), but the
 * three earlier transitions — Curious Thoughts, Deeper Questions, Growing
 * Shadows — had nothing behind their text. These three emblems fill that gap.
 * They are rendered at ~60% of the screen width, at ~0.55 opacity, over a
 * near-black ground (#2D2B55 / #1A1832 / #0D0B1A), so unlike every row icon in
 * the game they are LUMINOUS: each carries a soft bloom that is meant to be
 * seen, and the light in the picture IS the picture.
 *
 * What does NOT change from the row icons is the house voice. Each emblem is
 * still ONE anchored silhouette wrapped in `withOutline` (the warm INK contour,
 * scaled up to the 1024 supersample), top-lit from the upper-left with the
 * `gradTo` argument, with a contact shadow under it and one sheen on it. The
 * blooms are drawn on the real canvas BEFORE the contour pass (a glow must
 * never be outlined) and every bloom colour sits ABOVE cream parchment in all
 * three channels — the review sheet grades these on cream and on ash, and a
 * warm-white glow lightens both, where an amber one would lay a grey smudge on
 * the light ground.
 *
 * The three darken as a set, which is the family's ladder:
 *
 *   ceremony_curious.png  a standing brass lantern, LIT, two pale moths
 *                         CIRCLING it — one upper-right, heading in past the
 *                         cap's corner, one lower-left, climbing toward the
 *                         glass with a wingtip on the left rail — inside one
 *                         wide warm halo with an amber ring outside the glass.
 *                         Warm brass and amber glass, the widest bloom of the
 *                         three. "Lean in, as if listening."
 *   ceremony_deeper.png   a four-pane cottage window at night, its interior a
 *                         deep indigo, ONE candle stub on the sill with its flame
 *                         BENT to the right as if in a draught. Weathered wood
 *                         frame, a tighter bloom. Emptier, quieter, waiting.
 *                         The family's reference for composition: one outlined
 *                         object, glow kept close, no framing device.
 *   ceremony_shadows.png  a bare forked tree standing forward-left on a low
 *                         wide ellipse of mauve dusk ground, ONE hard INK
 *                         shadow wedge fanning from its foot across the
 *                         ground to the foundation of a SMALL indigo house
 *                         set two-thirds of the way back, one lit window;
 *                         a thin crimson horizon LINE along the ground's back
 *                         rim that ends behind the house, a rose afterglow
 *                         above it. Tree, ground, shadow and house are ONE
 *                         outlined silhouette; the shadow is a tone on the
 *                         ground inside it, never contoured. Mauve and wine,
 *                         the faintest bloom.
 *
 * EIGHTH PASS, after the arbiter's review of the seventh (row 2 passed again
 * and is untouched to the byte; rows 1 and 3 failed on COMPOSITION and PALETTE,
 * not on craft — the arbiter's note was "the correct move is subtraction"):
 *   - Row 1's two moths were five smooth rounded lobes strung along a single
 *     connecting axis THROUGH the lantern, so the blind reviewer named the pair
 *     a leafy twig crossing the glass, and the cluster sat over the brightest
 *     pane. Everything that made them a branch is deleted: there is no longer
 *     any element between the two moths, and both are moved fully clear of the
 *     lantern into the air — one upper-right past the cap's corner, one
 *     lower-left — so the vessel's silhouette is unbroken and the flame is
 *     unoccluded. The moth itself is redrawn on the SAME anatomy as the shipped
 *     `spots/empty_gallery.png` moth (chromeSpots.mjs `pinnedMoth`): head up,
 *     forewings swept up and out with one dark BAND across each, rounded
 *     hindwings below, a fat dark body, a round head and two short antennae.
 *     Borrowing the family's own moth was the fix — four fresh silhouettes were
 *     tried first (rounded lobes, a delta, a butterfly, a long-abdomen insect)
 *     and every one averaged into a blossom or a bow at 48px. It is scaled to
 *     ~1/4 of the frame and repalletted from the gallery's ochre into pale
 *     cream-to-ochre wings, clearly LIGHTER than the brass frame, as asked.
 *     Crucially the moths take their OWN thinner contour pass (MOTH_RING_W 13,
 *     not the emblem's 22): the family ring is ~2.3% of the frame, which is
 *     right for a 700px vessel and nearly a tenth of a 260px moth, and at full
 *     weight it swallowed the wings. Lantern, glass, flame, bars, foot and all
 *     five halos are untouched to the pixel.
 *   - Row 3 is REBUILT, not patched. It had three competing subjects and no
 *     anchor: a tree, a solid contoured crimson slab that read as a bench, and
 *     a house that collapsed to a speck at 32dp and duplicated the shipped
 *     red-roof home mark. Both the house and the crimson slab are DELETED. What
 *     is left is two elements and one anchor: a large bare TREE (~66% of the
 *     frame tall, a long tapered trunk with six limbs leaving it at six
 *     different heights — all six radiating from one fork was what made the
 *     previous crown read as a splayed hand) standing on a low wide ellipse of
 *     WARM dusk ground (the cool lavender/plum is gone; the ground is warm
 *     brown grading to wine, the WOOD range the rest of the family lives in),
 *     and ONE long cast SHADOW leaving the trunk's foot toward the lower right.
 *     The shadow's lower edge is the ground's own front rim and its upper edge
 *     is one straight diagonal, so it narrows as the ground recedes and takes
 *     the whole lower-right of the mound instead of a stripe that vanished at
 *     48px; three nested lengths give it a density falloff as well (~0.68
 *     cumulative at the trunk, 0.44 at the tip). It is laid on the already
 *     opaque ground inside the contour pass, so it is a tone ON the ground and
 *     is never outlined. The crimson horizon survives only as LIGHT: a low rose
 *     glow behind the trunk, drawn outside the contour in stops above cream, so
 *     the dread note lands without a second nameable object.
 *
 * SEVENTH PASS, after the arbiter's review of the sixth (row 2 passed again
 * and is untouched to the byte; rows 1 and 3 failed on SUBJECT legibility):
 *   - Row 1's dust-brown leaf-oval moths were read as a sprig of dead leaves
 *     on a stem: both lay on one diagonal through the lantern, their bodies
 *     and antennae lining up into the stem, and the upper one covered the
 *     flame. The moth is redrawn as a moth seen from above: per side a broad
 *     rounded-triangle forewing with a scalloped trailing edge over a small
 *     hindwing lobe (Catmull-Rom rounded, no points), a FAT fuzzy body clearly
 *     visible between the wings (dark warm brown, lighter belly), a round head
 *     and two thin CURVED antennae (9px core on a 21px ink underlay) sweeping
 *     away from the body. Wingspan ~1/5 of the frame. The wings are pale again
 *     — light parchment at the top edge grading to tan at the bottom — with
 *     the wing nearest the lantern a shade warmer and more amber, as if lit by
 *     it; the INK contour and the tan lower halves hold them on cream, the
 *     pale tops hold them on ash and against the brass. Placement: the upper
 *     moth sits OUTSIDE the lantern to the upper-right, heading left so its
 *     head touches only the cap's corner; the lower moth sits outside the
 *     glass to the lower-left, heading up-right with one wingtip on the left
 *     rail. Their body axes differ by ~90 degrees and neither crosses the
 *     glass, so the flame is fully unoccluded in a clean amber panel and no
 *     line runs moth-to-moth through the lantern. A fifth halo — an amber-
 *     white ring (#FFEEC6, above cream in every channel) at 0.34 just outside
 *     the glass — keeps the lantern reading LIT at 0.55 on the near-black.
 *     Lantern, glass, flame, bars, foot and the four wide halos untouched.
 *   - Row 3's shadow, the point of the emblem, was invisible at delivery size
 *     (a translucent purple on purple that averaged into the mound) and its
 *     thick crimson slab made the flat-topped mound read as a plinth with a
 *     near-tree-scale house on its edge. Rebuilt: the ground is a plain low
 *     wide ELLIPSE (840 x 352, ~0.8 x 0.34 of the frame) in a lighter mauve
 *     (#A088B4 top-lit to #6E5686); the crimson slab is gone, replaced by a
 *     26px crimson LINE (1/40 of the frame) along the back rim from the left
 *     shoulder to just behind the house, with a rose-white afterglow above it
 *     outside the contour; the trunk stands forward on the mauve with a small
 *     INK contact ellipse at its foot; and the cast shadow is ONE hard-edged
 *     INK wedge at 0.7 (>= 0.2 luminance under the ground on both grounds and
 *     under the 0.55 overlay), starting at the trunk's foot at trunk width and
 *     fanning across ~410px (0.4 of the frame, ~0.52 of it from the trunk's
 *     far edge) to ~258px tall (1/4 of the frame) where its far edge meets the
 *     house's foundation. The house shrinks to ~1/6 of the frame (160px to the
 *     peak, 108px walls), indigo walls under a darker roof whose horizon-side
 *     slope is caught in crimson, one 44px amber window with a warm glow
 *     outside the contour, its foot two-thirds of the way back toward the
 *     horizon. Tree drawing unchanged apart from a 26px downward shift.
 *
 * SIXTH PASS, after the arbiter's review of the fifth (row 2 passed again and
 * is untouched to the byte; rows 1 and 3 failed on VALUE, not on subject):
 *   - Row 1's halo was already right (lighter than cream in every channel;
 *     measured) and is untouched. The moths were the defect: a parchment wing
 *     (~#D5BA94, ~0.74 luminance) sat inside the 0.13 band of cream, so at
 *     48px on the light ground only the contour held them and they read as
 *     outlined cream blobs; and the lower moth hung off the left post as a
 *     detached particle. The wing is now a two-step dust-brown, top-lit
 *     (~#B48E62 at the lifted tip, ~0.55, grading to ~#8E6A44 at the root,
 *     ~0.42): every wing pixel sits >= 0.13 under cream and well over ash,
 *     and a step under the brass cap and the amber glass it lies on. Both
 *     moths are scaled up ~15% (a wing lobe is ~180px, > 1/6 of the frame),
 *     and the lower moth is moved up and right so its BODY sits on the left
 *     cage post and its near wing lies on the lit glass: the contour pass now
 *     fuses it into the lantern and the emblem is one silhouette at 48px. The
 *     lantern, glass, flame, bars, foot and halo are untouched to the pixel.
 *   - Row 3's trunk, cast shadow and house averaged into one dark clump at
 *     48px on both grounds: the shadow was a SOLID ink wedge fused to the
 *     trunk base, the house was a dark-indigo wall (0.20-0.28, inside the
 *     0.13 band of ash) tucked against the trunk, so 'distant' and 'long'
 *     were both lost. Three changes, all inside the shipped no-disc
 *     composition: (1) the cast shadow is a SEPARATE soft ground tone — deep
 *     indigo-black (#22162C) feathered in three layers to ~0.58, starting a
 *     clear ~15px (native) right of the roots and tapering to a point that
 *     just touches the house's foot, ~345px long (> 1/3 of the frame). It is
 *     laid on the opaque mound before the tree and house are painted, so the
 *     contour pass never sees it as an edge (a shadow is never outlined) and
 *     the house sits over its tip. The trunk gets its own small contact
 *     ellipse, clear of the shadow, so it grounds without merging. (2) The
 *     house is moved right and up onto the horizon band, its foot on the
 *     crimson, and shrunk to ~1/8 of the frame (124px across the gable) so it
 *     reads as far away; its walls are a lit mauve-grey (~#8C7A9A to
 *     ~#6B5A78, >= 0.40) under a darker roof, a full step over ash while the
 *     INK contour still holds it on cream; the one amber window is 44px
 *     (22px native), the spot of warm light that must survive 48px. (3) The
 *     ground is a flat-topped superellipse (n = 2.8) instead of an ellipse,
 *     so the crimson crest is a wide horizon band with room for a house on
 *     it, and the tree is shifted 30px left with its low-left limb trimmed
 *     (the crown no longer splits into a second mass at 48px), which is what
 *     gives the shadow its length. Bark, contour weight, afterglow, contact
 *     shadow and palette otherwise stay as the fifth pass left them.
 *
 * FIFTH PASS, after the arbiter's review of the fourth (rows 1 and 2 passed
 * and are untouched to the byte; row 3 failed on composition, not style):
 *   - Row 3 was three things on a rail: a tree, a hairline crimson stroke and
 *     a speck of a house at the right rim, the whole painted bbox shifted to
 *     x=52..459 so it read as clipped at 48px, and its cast shadow was a
 *     purple-on-purple tint nobody saw. It is rebuilt as ONE centred object.
 *     The mound is 744px wide (140..884) so the painted bbox is symmetric
 *     about the centre with a ~118px margin all round; the tree stands on its
 *     left half, the house INSIDE its right half. The crimson horizon is the
 *     mound's upper third (88px, 1/11.6 of the frame), a graded crimson-to-
 *     wine band that is part of the outlined silhouette, not a stroke. The
 *     cast shadow is now the subject's second form: a stylised tree-shadow
 *     (a fat trunk bar from behind the roots, three fingers fanning right to
 *     the horizon band, the house wall and the front rim; every stick >= 44px)
 *     drawn INSIDE the contour pass in INK at 0.85, a full step darker than
 *     the mauve mound on cream, on ash and under the 0.55 cinematic overlay.
 *     A true projection of the tree was tried first and rejected: squashed
 *     into 230px of ground it collapsed to a black lump at 48px. The house is
 *     222px wide (~1/5 of the frame) with the family's ink contour, a lit
 *     left roof slope and one 54px amber window. The tree has fewer, fatter
 *     sticks: three forked limbs and two low bending limbs, every tip >= 40px
 *     (>= 2px at 48px), tip gaps >= 100px, the trunk 144px at the base.
 *
 * FOURTH PASS, after the arbiter's review of the third (rows 1 and 3 failed,
 * row 2 passed and is untouched to the byte):
 *   - THE DARK AURA WAS NOT A COLOUR. Row 1's halo was already a warm white
 *     above cream in every channel, yet on the native file every soft-alpha
 *     pixel outside the body decoded darker than cream (measured: 87,285 of
 *     87,285, RGB ~ alpha x colour). The kit's canvas composites in
 *     PREMULTIPLIED colour and `savePNG` writes those values straight into a
 *     PNG, which is a STRAIGHT-alpha format, so a halo pixel at alpha 0.1 is
 *     stored as (26,24,21) and every viewer — the review sheet, RN's Image —
 *     composites a near-black smudge. Rows 1 and 3 now go through a local
 *     `down2Straight` that averages the 2x2 supersample the way `down2` does
 *     and then divides colour by alpha, so a glow decodes as the colour it was
 *     drawn in. Row 2 keeps the kit's `down2` (its bloom never leaves the
 *     opaque frame, so it has no soft pixel to correct) and stays byte-identical.
 *   - Row 1's halo is now four stacked flat discs, warm white to cream-white,
 *     widest and faintest at ~460px, densest at the flame (~0.5 cumulative).
 *     On ash it reads as the lantern's light; on cream it reads as nothing,
 *     which is correct. The moths were two pale ovals with a hairline body and
 *     collapsed at 48px into detached nuts, the upper one hovering a hair off
 *     the ring. They are rebuilt bigger (each wingspan ~1/3 of the frame),
 *     drawn as two swept forewing lobes on a FAT ink body with a lit flank,
 *     a round head and stub antennae; the wings are a dusty buff graded to
 *     tan (not cream, which vanished against the brass cap and the pale upper
 *     glass), each part on a grown INK underlay; and each moth's BODY now sits
 *     ON a cage bar over the glass edge — the upper one on the right bar just
 *     under the cap, the lower one on the left bar beside the candle — with its
 *     head turned to the flame, one wing lying on the lit glass and one spread
 *     out into the halo. Nothing detached, one contour. The flame is bigger and
 *     the wax stub smaller so the candle reads as one orange spear at 48px.
 *     The lantern's brass, glass, bars and foot are untouched to the pixel.
 *   - Row 3 was a scene in a medallion: a sky dome on a mound with a pollard of
 *     five fat capsules (a brown club at 48px), a shadow that stopped at the
 *     trunk, a 3% house. The dome is gone. The silhouette is now the TREE on a
 *     low ground mound (~76% of the frame wide) with the house on the mound's
 *     rim, all one `withOutline` pass: a tapered trunk 1/8 of the frame at the
 *     base, five main limbs (~1/16 of the frame at the root) that each FORK
 *     once into two thinner twigs, gaps between tips >= 100px so the crown
 *     stays open at 48px. The cast shadow is a feathered INK wedge laid on the
 *     real canvas after the contour, ~170px wide at the roots, ~45% of the
 *     frame long, tapering to the house's left foot, ~0.5 cumulative alpha —
 *     the subject's second half. The house is ~1/8 of the frame wide (dark
 *     indigo wall, lighter roof, chimney, one warm window 40px square) and
 *     stands where the shadow points; its roof breaks the mound's crest so it
 *     is anchored to the silhouette. The crimson horizon is the mound's own
 *     top 36px with a brighter core line, behind the trunk; the sky glow is
 *     three stacked pale ellipses (lavender-white to rose-white, all above
 *     cream in every channel) behind the crown, outside the contour.
 *
 * Values are pitched for both review grounds. Anything large is kept a full
 * step off ash (#352A31): the window frame is mid wood, not dark wood; the
 * tree's bark grades from a lit tan at the crown down to dark at the roots,
 * and the ground under the tree is a mauve-grey so the tree's own cast shadow
 * has something to be darker than. Only the INK contour (and a bloom lighter
 * than cream) ever touches the ground the emblem is delivered on.
 *
 * Every coordinate is a literal in the 1024x1024 supersample (c = 512); each
 * file is downsampled 2x to 512px. No Math.random: byte-reproducible.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  C, savePNG, down2, withOutline, INK, WOOD, BRASS,
  ellipse, roundRect, poly, capsule, arcStroke, flameLobe, hex, blend,
} from '../shopIcons/_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui/spots');
const S = 1024;
const c = 512;
/** Contour width for the 1024 supersample: the same ~2.3% of frame the 192px
 *  set uses (9 in a 384 space), so the three read with the kit's line weight. */
const RING_W = 22;
/** The moths' own, thinner contour. See the note in ceremony_curious. */
const MOTH_RING_W = 13;

// --- local palettes ---------------------------------------------------------
/** Warm-white blooms. Every stop sits above cream (#F3E2BF) in all three
 *  channels, so on the parchment review ground they can only lighten. */
const BLOOM = { wide: '#FFF3D2', core: '#FFFBEC', dusk: '#FFEFE6' };
/** The lantern's halo, outermost to innermost. Same rule: above cream. */
const HALO = ['#FFF4DC', '#FFF7E4', '#FFFAEC', '#FFFDF4'];
/** The dusk afterglow behind the tree: lavender-white out to rose-white at the
 *  horizon. Above cream in every channel, so on parchment it is nothing and on
 *  the near-black in-engine ground it is a pale evening sky. */
const AFTERGLOW = { high: '#F6EEFF', mid: '#FFF0EA', low: '#FFEDE4' };
const GLASS = { hi: '#FFE9A9', lo: '#EE8E24', heart: '#FFF3C8' };
const FIRE = { out: '#FF8A1E', mid: '#FFD25A', core: '#FFF8E0' };
const WAX = { hi: '#FCF2DC', lo: '#D8C199', drip: '#FFF8E8', shade: '#C9B08A' };
const NIGHT = { hi: '#2B2752', lo: '#0F0D1C', warm: '#E88A2A', warmer: '#FFC060' };
/** Moth wings: a pale warm cream at the top edge grading to ochre at the
 *  bottom, with a darker ochre hindwing under each forewing and one dark BAND
 *  laid across each forewing — the band is the structure that stops a pale wing
 *  averaging into a petal at delivery size. Every stop sits in the AMB/PARCH
 *  range and clearly ABOVE the brass frame in value, so the moths are never
 *  mistaken for part of the lantern, and the ochre lower halves are a full step
 *  under cream. The wing nearest the lantern takes the warm pair, a shade more
 *  amber, as if lit by it. The body is a dark warm brown, never black. */
const MOTH = {
  hi: '#FCF1D8', lo: '#D3AC70', warmHi: '#FFEDC4', warmLo: '#DFA85E',
  hindHi: '#E9D0A2', hindLo: '#A98450', band: '#6E4E24', body: '#4A3320', belly: '#8A6238',
};
/** The amber ring of the halo, just outside the glass: an amber-white that
 *  sits above cream (#F3E2BF) in every channel, so on the near-black ceremony
 *  ground it is the lantern's light and on parchment it is nothing. */
const AMBER_HALO = '#FFEEC6';
/** The crimson horizon survives only as LIGHT: a low rose afterglow behind the
 *  trunk. Both stops sit above cream (#F3E2BF) in every channel, so on the
 *  parchment review ground they can only lighten and on the near-black
 *  cinematic ground they are a red dusk sky. No slab, no contoured bar. */
const DUSK = { glow: '#FFE4DE', warm: '#FFEEDF' };
/** The dusk ground: WARM brown grading to wine (the WOOD/ACCENT range the rest
 *  of the family lives in, never the cool lavender that broke the set). The top
 *  is ~0.59 luminance and the foot ~0.39, both a clear step over ash (~0.18),
 *  and light enough that a stacked INK shadow reads as a shadow on it. */
const GROUND = { hi: '#C48E5E', lo: '#8C5A46' };
/** The bare tree: a lit tan at the crown falling to a near-ink at the roots, so
 *  the trunk is a full step off the ground it stands on (there is no contour
 *  between them) and the crown is a full step off ash. */
const BARK = { crownHi: '#C09A78', hi: '#AE8663', lo: '#43291E', rim: '#D6B08C' };
/** The cast shadow: three nested INK polys, longest and faintest first, so the
 *  shape thins in DENSITY as well as in width (~0.55 cumulative at the trunk's
 *  foot falling to 0.30 at the tip). Laid on the already-opaque ground inside
 *  the contour pass, so it is a tone on the ground and is never outlined. */
const SHADOW_LAYERS = 0.44;

// --- local helpers ----------------------------------------------------------
/** Contact shadow, scaled for the 1024 space. */
function shadow(cv, cx, cy, rx, ry, alpha = 0.3) {
  ellipse(cv, cx, cy, rx, ry, INK, alpha, 36);
}
/** Upper-left specular, scaled for the 1024 space. */
function sheen(cv, cx, cy, rx, ry, alpha = 0.5) {
  ellipse(cv, cx, cy, rx, ry, '#FFFFFF', alpha, 26);
}
/** A soft bloom: the kit's ellipse feathers INSIDE its radius (alpha is
 *  (1 - d) * rx / soft), so `soft` near rx gives a near-linear falloff from
 *  the centre to a clean zero at the rim — nothing lands past rx. */
function bloom(cv, cx, cy, rx, ry, color, alpha) {
  ellipse(cv, cx, cy, rx, ry, color, alpha, Math.round(rx * 0.85));
}
/** A flatter bloom: full strength out to 40% of the radius, then a linear
 *  fall to zero at the rim, so it reads as one soft disc of light rather than
 *  a hot spot. Stacked, these are the lantern's halo. */
function halo(cv, cx, cy, rx, ry, color, alpha) {
  ellipse(cv, cx, cy, rx, ry, color, alpha, Math.round(rx * 0.6));
}
/**
 * The kit's `down2`, then un-premultiplied. The canvas composites in
 * premultiplied colour (blend() keeps colour * alpha) and a PNG stores STRAIGHT
 * alpha, so handing the averaged values to savePNG as-is turns every soft
 * pixel dark: a warm-white halo at alpha 0.1 is written as (26,24,21). This
 * averages the 2x2 block in premultiplied space (the correct way to downsample)
 * and divides the colour back out by the alpha before quantising.
 */
function down2Straight(cv, ow, oh) {
  const out = Buffer.alloc(ow * oh * 4);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const i = ((y * 2 + sy) * cv.w + x * 2 + sx) * 4;
      r += cv.px[i]; g += cv.px[i + 1]; b += cv.px[i + 2]; a += cv.px[i + 3];
    }
    const o = (y * ow + x) * 4;
    if (a > 0) {
      const q = v => Math.max(0, Math.min(255, Math.round((v / a) * 255)));
      out[o] = q(r); out[o + 1] = q(g); out[o + 2] = q(b);
    }
    out[o + 3] = Math.round(a * 63.75);
  }
  return out;
}
/** Full closed ring stroke (arcStroke double-caps a seam; see misc.mjs). */
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
/** Push every vertex of a polygon out from its centroid by `g` px, for an ink
 *  underlay that follows the shape (the moth technique from upgrades.mjs). */
function grow(pts, g) {
  const n = pts.length;
  const cx = pts.reduce((s, p) => s + p[0], 0) / n, cy = pts.reduce((s, p) => s + p[1], 0) / n;
  return pts.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    return [x + ((x - cx) / d) * g, y + ((y - cy) / d) * g];
  });
}
/** A tapered stick as a quad: a branch, a twig. */
function stick(x1, y1, x2, y2, w1, w2) {
  const L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
  return [
    [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x2 + nx * w2 / 2, y2 + ny * w2 / 2],
    [x2 - nx * w2 / 2, y2 - ny * w2 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2],
  ];
}
/** Half-width of an axis-aligned SUPERELLIPSE at scanline y (0 outside it).
 *  n = 2 is the plain ellipse; n = 2.8 keeps the same extents but flattens the
 *  crest, so the mound's top is a wide shelf a house can stand on. */
const superHW = (cx, cy, rx, ry, n) => y => {
  const t = Math.abs((y - cy) / ry);
  return t >= 1 ? 0 : rx * Math.pow(1 - Math.pow(t, n), 1 / n);
};
/** A polygon between two scanlines whose sides follow a half-width function
 *  about the canvas centre. The mound and its crimson crest are two of these
 *  over ONE ellipse function, so the band can never poke past the mound. */
function bandPoly(y0, y1, hw, n = 44) {
  const right = [], left = [];
  for (let i = 0; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / n;
    const w = Math.max(0, hw(y));
    right.push([c + w, y]);
    left.push([c - w, y]);
  }
  return right.concat(left.reverse());
}
/**
 * A flame BENT by a draught. The spine is a quadratic bezier from the wick
 * (bx, by) that rises straight up and then curves over to the tip (tx, ty);
 * each layer runs from the wick to a fraction `f` of the spine with the kit's
 * flameLobe profile (rounded base, widest a third of the way up, a point at
 * the end), so the three tongues share one curve instead of three.
 */
function bentFlame(cv, bx, by, tx, ty, layers, n = 22) {
  const px = bx, py = by - (by - ty) * 0.62;                // control: straight up
  const at = u => [
    (1 - u) * (1 - u) * bx + 2 * (1 - u) * u * px + u * u * tx,
    (1 - u) * (1 - u) * by + 2 * (1 - u) * u * py + u * u * ty,
  ];
  for (const [f, w, color] of layers) {
    const L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * f;
      const [x, y] = at(u);
      const [xa, ya] = at(Math.max(0, u - 0.01)), [xb, yb] = at(Math.min(1, u + 0.01));
      const dx = xb - xa, dy = yb - ya, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const hw = w * Math.sin(Math.min(1, (1 - i / n) * 1.15) * Math.PI * 0.62);
      L.push([x + nx * hw, y + ny * hw]);
      R.push([x - nx * hw, y - ny * hw]);
    }
    poly(cv, L.concat(R.reverse()), color, 1);
  }
}
/**
 * ONE moth, drawn on the SAME anatomy as the shipped `spots/empty_gallery.png`
 * moth (chromeSpots.mjs `pinnedMoth`) so the two are one hand and this emblem
 * borrows a silhouette that has already survived a blind review: head up, wings
 * spread symmetrical like a specimen — two forewings swept up and out with one
 * dark BAND across each, two rounded hindwings below, a fat dark body, a round
 * head and two short antennae. Every part lays its own grown INK keyline (a
 * moth built from bare fills loses its wing contours), which is also the "thin
 * contour" the arbiter asked for on each wing. `s` scales it: at s = 1.6 the
 * wingspan is ~237px on the 1024 supersample, about 1/4.3 of the frame. `ang`
 * is a SMALL tilt only — a hard rotation is the first thing an 8x downscale
 * destroys. `warmSide` (+1 or -1) names the wing nearest the lantern, which
 * takes the amber pair; `mothPoint` exposes the transform for the sheen.
 */
const FORE = [[4, -12], [22, -40], [56, -50], [74, -34], [66, -6], [30, 4]];
const HIND = [[6, 2], [32, 4], [60, 20], [52, 46], [24, 52], [6, 36]];
const BAND = [[8, -18], [58, -46], [66, -32], [18, -4]];
function mothPoint(mx, my, ang, s, [lx, ly]) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  return [mx + (lx * ca - ly * sa) * s, my + (lx * sa + ly * ca) * s];
}
function moth(t, mx, my, ang, s, warmSide) {
  const P = p => mothPoint(mx, my, ang, s, p);
  const side = (pts, sgn) => pts.map(([x, y]) => P([x * sgn, y]));
  const G = 8 * s;
  for (const sgn of [-1, 1]) {                       // hindwings first
    const w = side(HIND, sgn);
    poly(t, grow(w, G), INK, 0.95);
    poly(t, w, MOTH.hindHi, 1, MOTH.hindLo);
  }
  for (const sgn of [-1, 1]) {                       // forewings, each with its band
    const warm = sgn === warmSide;
    const w = side(FORE, sgn);
    poly(t, grow(w, G), INK, 0.95);
    poly(t, w, warm ? MOTH.warmHi : MOTH.hi, 1, warm ? MOTH.warmLo : MOTH.lo);
    poly(t, side(BAND, sgn), MOTH.band, 0.85);
  }
  for (const sgn of [-1, 1]) {                       // two short antennae
    const a0 = P([4 * sgn, -38]), a1 = P([24 * sgn, -68]);
    capsule(t, a0[0], a0[1], a1[0], a1[1], 15 * s, INK, 0.95);
    capsule(t, a0[0], a0[1], a1[0], a1[1], 8 * s, MOTH.body);
  }
  const bT = P([0, -28]), bB = P([0, 42]);           // the fat dark body
  capsule(t, bT[0], bT[1], bB[0], bB[1], 32 * s, INK, 0.95);
  capsule(t, bT[0], bT[1], bB[0], bB[1], 22 * s, MOTH.body);
  const sT = P([-4, -20]), sB = P([-4, 30]);
  capsule(t, sT[0], sT[1], sB[0], sB[1], 7 * s, MOTH.belly, 0.8);
  const hd = P([0, -38]);
  ellipse(t, hd[0], hd[1], 18 * s, 18 * s, INK, 0.95, 2);
  ellipse(t, hd[0], hd[1], 13 * s, 13 * s, MOTH.body, 1, 2);
}

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });

  { // === ceremony_curious.png — the lit lantern and its two moths ===========
    // A standing hand lantern: ring, finial, peaked brass cap, amber glass with
    // a candle flame, two dark corner bars, a brass foot. The lantern is the
    // anchor and nothing is drawn across it. Two moths circle it in the AIR —
    // one upper-right, one lower-left, each a detached shape floating in the
    // halo, drawn on the shipped gallery moth's anatomy and repalletted pale
    // cream-to-ochre so they separate from the brass. The halo is four stacked
    // flat discs of warm white plus an amber-white ring just outside the glass,
    // the lantern's light they have come to.
    const cv = C(S, S);
    halo(cv, c, 545, 460, 460, HALO[0], 0.12);
    halo(cv, c, 548, 360, 360, HALO[1], 0.14);
    halo(cv, c, 552, 260, 260, HALO[2], 0.18);
    halo(cv, c, 548, 318, 352, AMBER_HALO, 0.34);
    bloom(cv, c, 560, 170, 200, HALO[3], 0.24);
    shadow(cv, c + 22, 890, 250, 34, 0.32);
    withOutline(cv, t => {
      // ring handle + finial
      ringStroke(t, c, 150, 46, 22, BRASS.lo);
      arcStroke(t, c, 150, 46, 12, -Math.PI + 0.3, -0.4, BRASS.hi, 0.9);
      capsule(t, c, 196, c, 232, 26, BRASS.lo);
      ellipse(t, c, 198, 17, 14, BRASS.hi, 1, 2);
      // peaked cap, top-lit
      poly(t, [[c - 84, 232], [c + 84, 232], [c + 186, 312], [c - 186, 312]], BRASS.hi, 1, BRASS.lo);
      capsule(t, c - 178, 306, c + 178, 306, 12, '#6E4A1E', 0.7);
      roundRect(t, c, 322, 178, 14, 6, BRASS.lo, 1, '#6E4A1E');
      // the glass, lit from within
      roundRect(t, c, 545, 156, 218, 12, GLASS.hi, 1, GLASS.lo);
      ellipse(t, c, 520, 112, 152, GLASS.heart, 0.55, 100);
      // a short wax stub and one tall flame: three tongues on one spear
      roundRect(t, c, 712, 24, 40, 8, WAX.hi, 1, WAX.lo);
      capsule(t, c, 668, c, 652, 8, INK, 0.9);
      flameLobe(t, c, 372, 672, 70, FIRE.out);
      flameLobe(t, c, 446, 670, 46, FIRE.mid);
      flameLobe(t, c, 530, 668, 22, FIRE.core);
      // corner bars, with a brass edge catching the light
      for (const dx of [-150, 150]) {
        capsule(t, c + dx, 316, c + dx, 770, 26, INK, 0.95);
        capsule(t, c + dx - 6, 322, c + dx - 6, 764, 7, BRASS.hi, 0.6);
      }
      // rail, foot, base plate
      roundRect(t, c, 776, 176, 16, 6, BRASS.hi, 1, BRASS.lo);
      roundRect(t, c, 812, 120, 22, 8, BRASS.lo, 1, '#6E4A1E');
      roundRect(t, c, 848, 170, 20, 8, BRASS.hi, 1, BRASS.lo);
    }, { width: RING_W });
    // The two moths CIRCLING the light, both in the AIR and both fully clear of
    // the lantern: one upper-right past the cap's corner, one lower-left. They
    // take their OWN contour pass at MOTH_RING_W rather than riding the
    // lantern's: the emblem's 22px ring is ~2.3% of the frame, which is right
    // for a 700px vessel and nearly a tenth of a 260px moth — at the family
    // weight the ring plus each wing's keyline swallowed the pale wings and the
    // pair averaged into two lumps. A thinner ring on a bigger moth is what
    // lets the wing shape, the dark band and the antennae survive 48px. Each
    // moth also stands more than both contour widths clear of the lantern, so
    // nothing bridges a moth to the vessel and nothing crosses the bright pane.
    withOutline(cv, t => {
      moth(t, 840, 220, -0.30, 1.75, -1);
      moth(t, 162, 706, 0.26, 1.75, 1);
    }, { width: MOTH_RING_W });
    sheen(cv, c - 100, 268, 40, 12, 0.4);
    sheen(cv, c - 92, 380, 22, 60, 0.45);
    { // one sheen on the canvas-upper wing of each moth
      const [ax, ay] = mothPoint(840, 220, -0.30, 1.75, [-40, -36]);
      sheen(cv, ax, ay, 24, 13, 0.4);
      const [bx, by] = mothPoint(162, 706, 0.26, 1.75, [-40, -36]);
      sheen(cv, bx, by, 24, 13, 0.4);
    }
    savePNG(path.join(OUT, 'ceremony_curious.png'), 512, 512, down2Straight(cv, 512, 512));
  }

  { // === ceremony_deeper.png — one candle guttering in a dark window ========
    // A four-pane cottage window seen square on: mid-wood frame and mullions
    // (never dark wood — the ash ground would swallow it), a deep indigo
    // interior, and on the sill a fat wax stub in a brass dish whose flame is
    // bent hard to the right by a draught. The interior is lit ONLY where the
    // flame reaches, so the value structure inside the frame is a warm pool
    // in a dark room, which is what survives 48px.
    const cv = C(S, S);
    bloom(cv, c + 28, 520, 300, 330, BLOOM.wide, 0.2);
    shadow(cv, c + 16, 928, 330, 24, 0.3);
    withOutline(cv, t => {
      roundRect(t, c, 500, 300, 360, 14, WOOD.light, 1, WOOD.dark);       // frame
      capsule(t, c - 292, 152, c + 292, 152, 14, WOOD.rim, 0.55);           // lit top edge
      roundRect(t, c, 500, 262, 322, 8, INK, 0.9);                          // rebate
      roundRect(t, c, 502, 254, 314, 6, NIGHT.hi, 1, NIGHT.lo);             // the dark room
      ellipse(t, c + 44, 540, 190, 210, NIGHT.warm, 0.55, 150);             // candle-light pool
      ellipse(t, c + 44, 520, 110, 130, NIGHT.warmer, 0.55, 90);
      // mullions: a lit edge on the upper-left, a shade on the lower-right
      capsule(t, c, 190, c, 812, 34, WOOD.base);
      capsule(t, c - 8, 190, c - 8, 812, 9, WOOD.rim, 0.7);
      capsule(t, c + 10, 190, c + 10, 812, 8, WOOD.dark, 0.6);
      capsule(t, c - 254, 480, c + 254, 480, 34, WOOD.base);
      capsule(t, c - 254, 471, c + 254, 471, 9, WOOD.rim, 0.7);
      capsule(t, c - 254, 490, c + 254, 490, 8, WOOD.dark, 0.6);
      // sill and its lip
      roundRect(t, c, 858, 336, 28, 8, WOOD.rim, 1, WOOD.mid);
      roundRect(t, c, 894, 318, 14, 6, WOOD.dark, 1, '#5A3418');
      // brass dish with a ring handle
      ringStroke(t, c + 118, 796, 24, 13, BRASS.lo);
      arcStroke(t, c + 118, 796, 24, 7, -Math.PI + 0.3, -0.5, BRASS.hi, 0.9);
      roundRect(t, c, 816, 88, 16, 8, BRASS.hi, 1, BRASS.lo);
      capsule(t, c - 82, 804, c + 82, 804, 10, BRASS.hi);
      // the wax stub, drips, shade
      roundRect(t, c, 700, 46, 108, 10, WAX.hi, 1, WAX.lo);
      capsule(t, c - 34, 640, c - 38, 700, 14, WAX.drip);
      capsule(t, c + 34, 630, c + 38, 668, 12, WAX.drip);
      capsule(t, c + 36, 600, c + 36, 796, 12, WAX.shade, 0.6);
      capsule(t, c, 594, c + 6, 572, 9, INK, 0.9);                          // wick
      bentFlame(t, c + 2, 600, c + 128, 420, [
        [1, 34, FIRE.out], [0.78, 22, FIRE.mid], [0.52, 11, FIRE.core],
      ]);
    }, { width: RING_W });
    sheen(cv, c - 250, 176, 40, 14, 0.4);
    sheen(cv, c - 26, 640, 10, 40, 0.45);
    savePNG(path.join(OUT, 'ceremony_deeper.png'), 512, 512, down2(cv, 512, 512));
  }

  { // === ceremony_shadows.png — a bare tree throwing one long shadow =======
    // TWO elements, ONE anchor. The anchor is a large centred bare TREE, ~66%
    // of the frame tall, five chunky forks and one low limb, standing on a low
    // wide ellipse of WARM dusk ground (brown grading to wine — the family's
    // wood range, never the cool plum that broke the set). The second element
    // is its cast SHADOW: one long tapered shape leaving the trunk's foot
    // toward the lower-right and thinning in width and density as it goes, so
    // it reaches toward something outside the frame. There is no house and no
    // crimson bar; the dread note is carried purely as LIGHT, a low rose
    // afterglow behind the trunk drawn outside the contour in stops above
    // cream. The shadow is laid on the already-opaque ground inside the
    // contour pass, so it is a tone on the ground and is never outlined.
    const cv = C(S, S);
    const GX = 512, GY = 792, GRX = 450, GRY = 128;
    const groundHH = x => Math.max(0, GRY * Math.sqrt(Math.max(0, 1 - ((x - GX) / GRX) ** 2)));
    const GROUND_HW = superHW(GX, GY, GRX, GRY, 2);       // a plain low ellipse
    /** The tree: a LONG tapered trunk with six limbs leaving it at six
     *  DIFFERENT heights and six different angles (all six radiating from one
     *  fork made a splayed hand, which is what the previous pass drew), the
     *  lowest pair long and drooping, the top pair a fork at the crown. Every
     *  stick is >= 32px at its tip (>= 1.5px at the 48px review size) and no
     *  two tips are closer than ~130px, so the crown stays open at delivery. */
    const LIMBS = [
      [350, 608, 182, 448, 70, 40],
      [430, 548, 604, 424, 66, 38],
      [364, 438, 222, 296, 58, 36],
      [424, 392, 570, 262, 56, 34],
      [390, 322, 292, 152, 50, 32],
      [408, 322, 478, 142, 50, 32],
    ];
    halo(cv, 430, 430, 400, 340, AFTERGLOW.high, 0.13);   // the pale evening sky
    halo(cv, 470, 560, 330, 250, AFTERGLOW.mid, 0.13);
    halo(cv, 512, 700, 470, 165, DUSK.glow, 0.30);        // the low crimson horizon, as light
    bloom(cv, 512, 730, 330, 110, DUSK.warm, 0.20);
    shadow(cv, c + 20, 906, 400, 26, 0.28);
    withOutline(cv, t => {
      // -- the ground: one low wide ellipse, warm brown to wine, top-lit --
      poly(t, bandPoly(GY - GRY, GY + GRY, GROUND_HW, 60), GROUND.hi, 1, GROUND.lo);
      // -- the cast shadow: ONE long tapered plane leaving the trunk's foot
      //    toward the lower right. Its lower edge IS the ground's front rim and
      //    its upper edge is one straight diagonal, so the shape narrows as the
      //    ground recedes — the way a long shadow actually lies — and it takes
      //    the whole lower-right of the mound rather than a stripe nobody sees
      //    at 48px. Three nested lengths give it a density falloff too (~0.68
      //    cumulative at the trunk, 0.44 at the tip). Laid on the already
      //    opaque ground, so the contour pass never sees it as an edge. --
      const SX0 = 398, SX1 = 944;
      const shadowTop = x => 730 + ((x - SX0) / (SX1 - SX0)) * (800 - 730);
      const wedge = (x1, alpha) => {
        const top = [], bot = [];
        for (let i = 0; i <= 26; i++) {
          const x = SX0 + ((x1 - SX0) * i) / 26;
          const hh = Math.max(0, groundHH(x) - 5);
          top.push([x, Math.max(GY - hh, shadowTop(x))]);
          bot.push([x, GY + hh]);
        }
        poly(t, top.concat(bot.reverse()), INK, alpha);
      };
      wedge(944, SHADOW_LAYERS);
      wedge(736, 0.26);
      wedge(584, 0.22);
      // -- the trunk's own contact ellipse, so it grounds without merging --
      ellipse(t, 396, 796, 100, 18, INK, 0.4, 30);
      // -- the bare tree --
      const limb = (x1, y1, x2, y2, w1, w2, hi) => {
        capsule(t, x2, y2, x2, y2, w2, hi, 1);                             // rounded tip
        capsule(t, x1, y1, x1, y1, w1, BARK.lo, 1);                        // rounded root
        poly(t, stick(x1, y1, x2, y2, w1, w2), hi, 1, BARK.lo);
      };
      for (const [x1, y1, x2, y2, w1, w2] of LIMBS) limb(x1, y1, x2, y2, w1, w2, BARK.crownHi);
      const TRUNK = [[318, 808], [346, 650], [362, 470], [380, 300], [418, 298], [424, 470], [440, 650], [478, 808]];
      const ROOT_L = [[288, 810], [344, 726], [364, 810]];
      const ROOT_R = [[418, 810], [446, 726], [492, 810]];
      poly(t, TRUNK, BARK.hi, 1, BARK.lo);
      poly(t, ROOT_L, BARK.lo, 1);
      poly(t, ROOT_R, BARK.lo, 1);
      // the top-left lit face and the shaded right flank, so the trunk is a
      // cylinder lit from the upper left rather than a flat plank
      poly(t, [[328, 800], [352, 650], [368, 472], [386, 302], [404, 302], [390, 474], [376, 654], [358, 800]], BARK.rim, 0.6);
      capsule(t, 414, 316, 462, 792, 20, INK, 0.38);
    }, { width: RING_W });
    sheen(cv, 350, 560, 12, 56, 0.4);
    savePNG(path.join(OUT, 'ceremony_shadows.png'), 512, 512, down2Straight(cv, 512, 512));
  }
}

// Allow `node scripts/tools/gameIcons/ceremony.mjs` for a solo render.
if (process.argv[1] && process.argv[1].endsWith('ceremony.mjs')) draw();
