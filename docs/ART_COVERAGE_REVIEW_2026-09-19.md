# Story art and remaining image opportunities

Reviewed September 19, 2026. All **185 story illustrations** have been visually reviewed against their authored lines and reconciled to the current asset SHA-256 values. The durable per-image results are in [`mobile/scripts/story/visual-review.json`](../mobile/scripts/story/visual-review.json).

> **Superseded in part on September 21, 2026.** The September 19 pass did not catch a class of defect that a player found immediately: human hands, arms and figures performing actions in an animal cottage, and pets (cats, a dog, a songbird) that live nowhere in this house. A re-audit of all 189 illustrations (the 185 pages plus the four ceremony heroes), with two independent reviews per image and a tie-break pass over every disagreement, found 26 images to correct. See [the September 21 retouch section](#september-21-2026-retouch-pass) below. Treat "no open corrections" as a claim about the reviews actually run, never about the art.

## Decision scenes

The illustrated sequences now have a distinct image for each authored beat, including choice responses, alternate branches, and legacy recollections. The first fox conversation still features cups because that conversation is about choosing a drink and a cup. Its images now show separate actions: preparing tea/cocoa, comparing cups, examining the painted flower, pouring, moving a cup, holding it, and putting cocoa away. Later stories use their own subjects: PLUM's aquarium, the offering pit, dated records, supper, house plans, latches, lamps, seed tins, the road, and breakfast.

Related pages deliberately share a setting. Close-ups, object placement, lighting, and wider room views provide variation. Quiet final conversations retain chairs and the hearth because distance, listening, and silence are the subjects. The pivotal confession received two more distinct compositions: a closed record beside Ember's paw and an open doorway into the dark.

The review checked for unrelated repeated scenery, incorrect animal species, human character intrusions, dialogue rendered as image text, and props that contradicted the narrative. Corrections included the fox/pangolin identities, PLUM imagery, the intact returned cup, the unfinished word arrangement, an unobstructed gate marker, and the deliberately unmoved cup in the aftermath. All replacements were reviewed again. Minor decorative differences between separately illustrated views are not represented as exact model-sheet continuity.

| Inventory group | Images reviewed | Main visual subjects |
| --- | ---: | --- |
| `cup` | 8 | Drink choice, chip, flower, cup placement |
| `echo` | 7 | Pit rim, notebook, marks, lingering reflection |
| `witness` | 8 | Dated account, sharing, folded private record |
| `plum` | 9 | Goldfish and aquarium; alternate cup/pit sequence |
| `plum_recruited` | 1 | Recollection for the later PLUM introduction |
| `supper` | 14 | Soup, empty place, serving, account at the table |
| `plan` | 9 | House drawings, foundation, watch, annotations |
| `record` | 15 | Ledger, changed ink, preserved original, pens |
| `shelter` | 11 | Lamp and road, latch and private door |
| `seeds` | 15 | Seed tin, gate, small marker, permission |
| `promise` | 14 | Withheld truth, invitation, boundaries, chair distance |
| `returned` | 11 | Repeating fish, remembered fish, restored cup |
| `council` | 18 | Word arrangement, private room, road, chosen boundaries |
| `after` | 26 | Breakfast, hinge, returned footsteps, boundaries holding |
| `reply` | 10 | Listening, space between chairs, shared table |
| `old_mark` | 9 | Surviving door, marker, record, and remembered choices |
| **Total** | **185** | **All current hashes approved** |

These counts cover unique inventory assets, including mutually exclusive branches; they are not the number of pages in one playthrough. The two PLUM introduction timings share the same authored beats where appropriate.

## Best next uses of artwork

These are optional presentation improvements found in the current source, not missing-asset bugs. Both can reuse art already shipped by this work.

| Priority and screen | Current source evidence | Recommended change |
| --- | --- | --- |
| 1. Story Journal | [`StoryJournalModal.tsx`](../mobile/src/components/StoryJournalModal.tsx) shows one `STORY_ART.tableHeader`; memory cards and selected transcripts are text-only. `getVisibleStoryMemoryLines` already limits the transcript to reached pages. | Give each memory a small cover using its first already-seen page illustration. Optionally show the corresponding illustration while rereading reached pages. Preserve existing visibility limits so covers and transcripts never reveal unread branches or future scenes. Existing animal portraits could also distinguish the archive chapter rows. |
| 2. House upgrade gift | [`HouseUpgradeGiftModal.tsx`](../mobile/src/components/home/HouseUpgradeGiftModal.tsx) shows the animal portrait and gift name, but no picture of the gift being handed over. [`shopArt.ts`](../mobile/src/components/shop/shopArt.ts) already supplies every room decoration/deepening and `attune_1`–`attune_3`. | Show the actual purchased object alongside the resident: use `getRoomUpgradeArt(gift.roomId, gift.tier)` for tiers 1–2 and the existing attunement art for tier 3. Keep the resident visible throughout the reaction. This would connect the shop purchase, handover, and room change. |

Rules already have step illustrations; the Whisper Gallery has animal portraits and an empty-state illustration; Shop/Store items have dedicated art; sharing uses the wordmark, Ember, stars, and phase treatment; the offering pit already has a full illustrated environment. Additional generic decoration on those screens has lower value than the two specific reuse opportunities above. Victory and puzzle controls benefit from the requested reduction in clutter.

## September 21, 2026 retouch pass

A player reading the `witness` conversation saw a fox paw on one page, a human hand on the next, a curled sleeping fox on the next and two human hands on the last, and asked what the pictures were doing. The re-audit confirmed the pattern across the set.

**What was wrong.** Twelve images contained a human hand, arm or partial figure; fourteen more contained an animal that was either a non-resident species (a sleeping cat on a window seat, a collie on the hearth rug, a songbird, a hedgehog, a pangolin-scaled hedgehog) or a resident drawn so poorly it read as no species at all (a digit-less furred stump pouring tea, a fox tail used as a forearm, a "fox" paw the size of a bear's). The original generation prompts forbade characters outright and asked for object-only still lifes, so these were generator slips that the first review did not weigh as breaking the world.

**How they were fixed.** Each image was retouched in place, never regenerated: `scripts/story/editStoryArt.mjs` cuts a square window around the defect, sends only that window to a hosted instruction-following image-edit model, and composites the result back onto the untouched original through a feathered mask, so the authored composition and the rest of the frame survive byte-for-byte outside the paste. The rule applied per image follows the line, not the picture: where a **resident** performs the action the hand became that resident's paw (Ember's fox forepaw, Thyme's rabbit forepaw, Warren's wombat forepaw); where the **player** acts, or the actor was unclear, the limb was removed entirely and the surface continued, which is what the object-only direction asked for; non-resident creatures were removed and the cushion, rug or sill continued behind them.

**How they were judged.** Every result was reviewed by an independent critic against the authored line and then by hand at the size the reader actually renders (`getStorySceneLayout` caps the illustration at 136dp tall, so a 960x540 asset is displayed around 240x136). Judging at full resolution alone is misleading in both directions: a crude paw that looks flat at 1:1 reads correctly at delivery size, while `echo-03`'s owl-foot conversion still read as an alien claw there and was redone as a removal. `scripts/story/generation/<id>.json` keeps each retouch's model, prompt, window, cost and previous hash.

**Deliberately left alone.** `witness-05` draws eight residents around the table; every species is accurate and recognizable, so it stays. Small ambiguous ornaments (carved foxes, squirrels and rabbits on mantels and shelves) are decor, and at delivery size they are four or five pixels. The dark upright mark on the road heroes that one reviewer read as a distant walker is, at 10x, a plant stem at the path verge among other verge vegetation.

## September 21, 2026 location pass

A second player note asked whether the backgrounds match the rooms the residents actually live in. Two places in this game have art the player sees constantly, and the story pages contradicted both.

**The Aquarium Room is the inside of a planted tank.** Axel the axolotl lives underwater; his sprite wears a diving mask and trails bubbles. Every page of his two conversations had been drawn from the other side of the glass, as a small tank standing on a sideboard in a dry parlour, which is the opposite of where he is. The ten pages are now inside the water, and his hand on the glass, which was a human hand with a thumb, is a pale axolotl hand with four slender fingers.

**The Offering Pit is outdoors.** It is a sunken ring of rock around a deep dark opening with a cool glow at its edge, in a mossy forest clearing under a dusk-to-night sky. Eight pages set at the rim had drawn an indoor stone cellar with a water-filled masonry well, a bucket on a rope and a ladder. They now show the pit the player offers words into.

**Chill's office is modern, and that is intentional.** His room has a glass desk, a monitor, ring binders and a city window. The five pages where he speaks about his own ledger were rustic cottage desks with oil lanterns and quills; they are now his office, keeping the paper ledger, ink and pen that the dialogue names. Pages of the same scene that also serve the variant where Chill was never invited stay ordinary house interiors, since they must read correctly both ways.

**What the rule is not.** A resident in another resident's room is fine: Axel sits at the supper table in Panko's kitchen, and sleeps on a cushion in Ember's parlour, because an amphibian can leave the water. The rule binds only a scene set in a resident's own space, and the places the player can walk to.

An independent audit then checked all 189 illustrations against these locations and flagged eight, six of them genuine: a trapdoor onto a cellar well in a parlour floor, a fish tank on a kitchen sideboard, a goldfish bowl on a porch table, and three underwater pages that kept enough of a tank rim to still read as a view from outside the glass. All six were corrected.

## Verification scope

This review used the authored story inventory, source code, exported artwork, and per-scene contact sheets. Current image hashes are recorded in the review manifest; content-preserving alpha flattening retained the original semantic approvals. Persistent decision-scene portraits are implemented separately from the page illustration. This report does not claim a native Android visual walkthrough, touch-interaction validation, or pixel-exact correspondence between independent illustrations.
