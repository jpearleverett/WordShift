# Reading surfaces and animation ownership

`AppText` is the shared public React Native Text primitive for reading surfaces. `TEXT_ROLE` supplies body (16/25), reading (18/29), caption (14/21), label (16/24) and title (24/32) roles. It explicitly selects the existing Epunda Slab/Figtree faces. Body, reading and caption text permit the full OS font scale; labels and titles allow 2×. Letter-tile glyph sizes remain governed by the tile geometry tokens.

The story scene, ceremony, journal/archive, home dialogue body and choices, Rules, practice instructions, support comparison and game alerts now use the primitive. Existing font wrappers remain a compatibility layer for unmigrated chrome. This pass does not claim every decorative counter has become a reading surface.

`CandyButton` and home bevel actions grow from a minimum height. Labels wrap and retain their full accessibility name. Story and Rules panels scroll within the current safe-area viewport. Ceremony portrait, reading and actions share a scrollable region; enlarged text also shortens the art stage and stacks playback controls. Temporary save overlays suspend the ceremony on its current page and scroll position without replaying cues. Home resident/arrival dialogue scrolls too; below 380 logical pixels or above 1.2× OS text scale, its portrait moves above the text and uses a smaller frame. `GameAlertModal` and home resident/intro dialogue place the dismiss scrim beside the reading panel, so their actions are not descendants of another accessible button.

Stable Animated.Value objects and arrays are created with lazy React state, once per mounted component. Native drivers mutate those opaque animation objects; React does not poll a ref during render to find them. Event callbacks that require current props are updated after commit with a layout effect. True event/timer/native-node refs remain refs.

A stopped native animation must not advance an unrelated next item. Achievement toast dismissal checks `finished`; flying-word entrances and sleeping Z loops check both `finished` and their effect's active flag before scheduling another cycle. Bird, shooting-star and lightning callbacks also require successful completion before scheduling their next appearance. Cleanup owns every driver that it starts.

An effect may still bridge the lifetime of a native animation, delayed unmount or asynchronous storage read into render state. Any lint exception for such a bridge is local and states that ownership explicitly. It does not suppress component-wide dependency checks. Derived page, error, portrait and inspection state instead follows the current passage/context directly or starts fresh in a keyed child.

Verify in a signed native build with enlarged text and TalkBack/VoiceOver. Browser font enlargement verifies scrollability but does not reproduce every native font-metric or screen-reader behavior.
