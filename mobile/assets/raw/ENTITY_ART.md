# The entity that holds the house

`entity_raw.png` is the source of the Phase 3+ presence behind the house. It
was generated with Seedream 4 (edit endpoint, RunPod) from two images:

1. `entity_guide.png`: the layout guide. The real roof's silhouette and the
   house body's walls, drawn at 2 px per dp in flat green (#00FF00) on white.
   The canvas spans x -256..256 dp and y -300..500 dp from the roof's top.
2. The owner's style reference: a colossal smoke monster over a night forest,
   with a jagged horned crown, burning red eyes, a fanged grin and red cracks,
   its body dissolving into crimson mist.

Prompt:

> Image 1 is a layout guide: the flat bright green shape is a small house
> (roof at the top, tall walls going down off the bottom edge). Image 2 shows
> the exact look wanted for the creature: a colossal shadow monster made of
> dark smoke with a jagged horned crown, burning red glowing eyes, a wide grin
> of long pale fangs, glowing red cracks across its face and dark tentacle
> wisps, its body dissolving downward into crimson and violet mist. Paint that
> same creature, in the same detailed pixel-art style, rising BEHIND the green
> house and towering over it, its head high above the roof. Its body is
> ill-defined smoke that fades into mist at every edge. Two long shadowy smoke
> arms reach down on both sides of the house and long dark clawed fingers
> made of shadow curl menacingly around the left and right corners of the
> green walls just below the roof. Keep the green shape exactly as it is, flat
> pure green. Background: plain flat white everywhere. No trees, no river, no
> moon, no stars, no landscape, only the creature, the green shape and white.

`node scripts/tools/processEntityArt.mjs` turns it into the shipped layers. The
green stand-in says exactly what lies in front of the house: the fingers over
the walls go to `entity_front.png`, and everything else goes to
`entity_back.png`. The smoke is unmixed from the white backdrop, so it stays
translucent, and every layer is pixelated to the roof's 1.5dp pixel. The script prints the measurements that HouseWorld's
`ENTITY_*` constants carry.

To redraw it, keep the guide. Any new picture must keep the green shape flat
and the house body's width, which is what the script scales by.
