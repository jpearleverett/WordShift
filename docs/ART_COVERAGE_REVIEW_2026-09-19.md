# Story art and remaining image opportunities

Reviewed September 19, 2026. All **185 story illustrations** have been visually reviewed against their authored lines and reconciled to the current asset SHA-256 values. **No open semantic corrections remain.** The durable per-image results are in [`mobile/scripts/story/visual-review.json`](../mobile/scripts/story/visual-review.json).

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

## Verification scope

This review used the authored story inventory, source code, exported artwork, and per-scene contact sheets. Current image hashes are recorded in the review manifest; content-preserving alpha flattening retained the original semantic approvals. Persistent decision-scene portraits are implemented separately from the page illustration. This report does not claim a native Android visual walkthrough, touch-interaction validation, or pixel-exact correspondence between independent illustrations.
