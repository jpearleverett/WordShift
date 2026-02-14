# WordShift Monetization Plan (Final)

## Executive Summary

WordShift is a word puzzle game with a 15-20 hour narrative arc that transitions from cheerful animal companions to cosmic horror cult revelation. The monetization strategy must preserve the narrative integrity — the slow descent into darkness is the product's core differentiator and cannot be disrupted by economic shortcuts.

**Recommended model**: Free-to-play with ethical hybrid monetization across five revenue streams, targeting **$3.50-$6.00 ARPU** for retained players and a **4-6% conversion rate** to any paid tier.

**Core monetization principle**: Players pay for *expression* and *convenience*, never for *narrative progression* or *competitive advantage*. The phase system, dialogue, and story beats are never gated behind payment.

---

## Revenue Stream 1: Ad Integration (Est. 35-40% of Revenue)

### 1A. Rewarded Video Ads

**Placement**: Optional ad watches at natural break points — never forced, never interrupting gameplay flow.

| Trigger Point | Reward | Daily Cap | Notes |
|---|---|---|---|
| Post-victory "Bonus Amber" button | +8 amber (flat, difficulty-independent) | 3/day | Shown on VictoryModal as optional button |
| Post-cooldown dialogue unlock | Skip 1 puzzle of cooldown | 2/day | Shown on cooldown toast when tapping animal |
| Weekly quest bonus | +25% quest reward on claim | 4/week | Shown on quest claim confirmation |
| Hint recovery | Restore 1 used hint (for star rating) | 1/puzzle | Only shown after puzzle completion if hints were used |

**Why flat +8 amber instead of +50%**: A percentage-based bonus compounds with star bonuses, streak multipliers, and challenge mode to create runaway amber inflation for high-performing players. At HARD/3-star/10-day streak/challenge mode, +50% would yield +42 amber per ad — nearly the cost of a room unlock from a single ad watch. A flat +8 keeps the reward meaningful for EASY players (+8 on a base of 5 is significant) while preventing HARD players from getting disproportionate gains. At 3 ads/day, the total daily bonus is +24 amber — substantial help but not progression-breaking.

**Implementation notes**:
- Rewarded ads are opt-in — the player taps a clearly labeled "Watch Ad" button.
- Never show pre-roll or mid-puzzle ads. The puzzle flow is sacred.
- Ad placements disappear for Premium ("Patron's Key") purchasers.
- Phase-aware ad copy uses tonal desaturation, not narrative voice (see Phase-Aware Monetization Tone below).

### 1B. Interstitial Ads

**Placement**: Between puzzle sessions only (after VictoryModal is dismissed, before returning to home screen).

| Rule | Detail |
|---|---|
| Frequency (Phase 0-2) | Every 3rd puzzle completion |
| Frequency (Phase 3+) | Every 5th puzzle completion |
| Skip timer | 3 seconds, then clearly dismissible |
| Exempt scenarios | First 10 puzzles (onboarding); during/immediately after PhaseTransitionOverlay; after daily challenge; when ritualEnergy ≥ 7 (high-ritual puzzles); within 5 puzzles of a phase transition; Premium users |

**Why reduced frequency at Phase 3+**: Players who reach Phase 3 are highly retained and emotionally invested — they are experiencing the horror descent. They are also the most likely Patron's Key buyers. Breaking their emotional continuity with ads at this point is counterproductive both narratively and economically. Reducing to every 5th puzzle preserves immersion while keeping ad revenue from this segment.

**Revenue estimate**: eCPM $10-20 rewarded (US), $6-12 (global blend); $4-8 interstitial (US), $2-5 (global blend). At 3-5 puzzles/day for active users, this yields ~$0.03-0.08/DAU/day depending on geographic mix.

---

## Revenue Stream 2: Premium Upgrade — "Patron's Key" (Est. 25% of Revenue)

A single one-time IAP that upgrades the experience permanently.

**Price**: $6.99 USD

**Tiered option**: Offer a "Patron's Key + Starter Collection" bundle at $9.99 that includes the key plus 3 tile themes (Ember Glow, Deep Ocean, Midnight Garden). Estimated 20-30% of Patron buyers will choose the bundle.

**What it includes**:
| Feature | Description |
|---|---|
| Ad-free experience | All interstitial and rewarded ad placements removed |
| Exclusive tile theme | "Patron's Script" — elegant calligraphy-styled letter tiles |
| Amber drip | +2 passive amber per puzzle (small but persistent bonus, ~10-15% boost for average player) |
| Extended undo | 2 undos in Challenge mode (up from 1) |
| Whisper Gallery highlight | Gold border on gallery entries earned while Patron |
| Cloud save | Account-bound cloud backup/restore (see Cloud Save guardrails below) |
| Patron badge | Subtle icon on share result cards |

**What it does NOT include**:
- No phase acceleration
- No dialogue unlocks
- No narrative shortcuts
- No unlimited hints
- No amber bundles

**Cloud save guardrails**:
- Saves are bound to authenticated accounts (Firebase Auth / Apple Game Center / Google Play Games), not exportable files.
- No import-from-file or share-via-link functionality.
- `deviceId` consistency check on restore — warns if device has no history with this account.
- Whisper Gallery data is excluded from cloud sync (too spoiler-rich; rebuilds organically on new device).

**Design rationale**: The Patron's Key is a "tip jar with benefits." It rewards supporters with quality-of-life improvements and cosmetic distinction without breaking the progression curve. Priced at $6.99 based on the 15-20 hour narrative arc being genuinely premium content for the word puzzle genre. The +2 amber drip yields ~600 extra amber over 300 puzzles — meaningful but unable to skip unlock pacing.

**Conversion target**: 5-8% of retained Day-7 players.

---

## Revenue Stream 3: Cosmetic Shop — "The Collection" (Est. 20% of Revenue)

Purely visual customizations that don't affect gameplay, amber earning, or narrative pacing.

### 3A. Tile Theme Packs ($1.99-$2.99 each) — 12 at launch

Cosmetic reskins of the LetterTile component. Each pack changes tile colors, border styling, font treatment, and selected/drop animations. This is the highest-visibility cosmetic category (visible during every second of gameplay) and receives the deepest catalog.

| Pack Name | Visual Style | Price | Availability |
|---|---|---|---|
| Ember Glow | Warm orange/red gradient, flame particle trail | $1.99 | Always |
| Deep Ocean | Teal/navy, bubble particle on drop | $1.99 | Always |
| Midnight Garden | Dark green/purple, petal particles | $1.99 | Always |
| Foxfire | Amber-orange, inspired by Fox's fireplace | $1.99 | Always |
| Archimedes' Ink | Black/gold calligraphy style | $2.49 | Always |
| Coral Reef | Bioluminescent blue/green, Axel-inspired | $1.99 | Always |
| Gilded Script | Gold leaf texture, ink splash animation | $2.49 | Appears after Phase 1 |
| Frozen Rune | Ice blue, frost crack on select | $2.49 | Appears after Phase 2 |
| Obsidian | Near-black with faint edge glow | $2.99 | Appears after Phase 3 |
| Etched | Stone-carved tiles, subtle pulse on valid word | $2.99 | Appears after Phase 4 |
| Zen Bamboo | Natural wood/green, Red Panda-inspired | $1.99 | Always |
| Desert Glass | Sandy gold/amber, Fennick-inspired | $1.99 | Always |

**Progressive disclosure**: Phase-gated packs are completely hidden until the player reaches the required phase. No locked slots, no "coming soon" teases, no phase numbers displayed. A Phase 0 player sees 8 themes. A Phase 3 player sees 11. This matches the existing progressive disclosure pattern used for puzzle variants in `DifficultyMenu.tsx`.

**Phase-gated naming**: Pack names for later phases use tonally evocative but narratively non-specific names ("Obsidian," "Etched") rather than spoiler-laden names. Players at that phase will understand the resonance without the name doing explicit narrative work.

**Planned expansion**: 2-3 new themes per quarter. Add puzzle background themes ($1.99-$2.99) in Quarter 2 — full-screen backgrounds behind the puzzle grid (starfield, forest, underwater, etc.).

### 3B. Room Accent Packs ($0.99-$1.99 each)

Decorative overlays for room backgrounds in the home screen.

| Pack | Contents | Price | Availability |
|---|---|---|---|
| Cozy Additions | Fairy lights, cushions, warm rug | $0.99 | Always |
| Scholar's Touch | Extra books, globe, quill set | $0.99 | Always |
| Seasonal (rotating) | Holiday/seasonal room decorations | $1.49 | Rotating quarterly |
| Low Light | Candles, deep shadows, dim ambiance | $1.99 | Appears after Phase 3 |

### 3C. Confetti & Victory Effects ($0.99 each)

Custom confetti/particle effects for the victory celebration and StarBurst animation.

- Sakura Petals, Snowflakes, Autumn Leaves, Pixel Burst, Dark Embers, Cosmic Dust

### 3D. Animal Accessories ($0.99-$1.49 each)

Small wearable items rendered on animal sprites (hats, scarves, glasses).

- Available per-animal or as bundles ($3.99 for 5-pack)
- **Phase 4 behavior**: At Phase 4+, accessories are suppressed on robed sprites. A one-time narrative prompt appears: *"The robes cover everything now."* This reinforces the narrative shift — the animals have moved beyond the player's decorations. Accessories return in Phase 5 (post-revelation terrible peace), where a scarf on a serene post-cult animal IS effectively unsettling.

**Total cosmetic catalog target**: 35-45 items at launch, expanding quarterly.

---

## Revenue Stream 4: Content Pass — "The Chronicle" (Est. 12% of Revenue)

A two-tier content pass system providing regular new content without overcommitting production resources.

### 4A. Monthly Mini-Pass ($1.99/month)

Lightweight, sustainable content drops every month.

| Content | Description |
|---|---|
| 5 curated puzzles | Hand-crafted thematic puzzle chains with flavor text |
| 1 cosmetic item | Rotating between tile themes, confetti effects, and accessories |
| 2 bonus weekly quests | Extra amber-earning objectives |

### 4B. Quarterly Major Season ($4.99/quarter, or $16.99/year for all four)

Substantial content expansion every 12 weeks.

| Content | Description |
|---|---|
| Seasonal narrative echoes | Found objects and journal fragments scattered across rooms — collectible narrative artifacts that add lore depth. Phase 0: charming fairy tale fragments. Phase 3+: darker subtext revealed. Persist in Whisper Gallery permanently after season ends. |
| 2 puzzle variants | Season-exclusive variant modes (e.g., "Mirror Shift," "Cascade") |
| 15 curated puzzles | Hand-crafted thematic puzzle chains with narrative flavor text |
| Exclusive tile theme | Season-limited cosmetic tile set |
| Amber bonus | +2 amber per puzzle for the season duration (additive to base, applied before multipliers) |
| Season quests | 8 additional weekly quests (2 per week for 4 weeks) with bonus amber |

**Why narrative echoes instead of guest animals**: The cult's power as a horror device comes from its closed, intimate nature — 10 animals the player trusts, all revealed to be cultists. An 11th animal creates an irreconcilable narrative problem: if it is in the cult, the cult becomes an organization rather than a family (less frightening); if it is not in the cult, it introduces an outsider perspective that undermines the claustrophobic horror. Narrative echoes (found objects, journal fragments, lore pieces) add depth without introducing characters who must be placed inside or outside the cult hierarchy.

**Amber bonus specification**: The +2 amber per puzzle is a flat additive amount applied to the base reward before star, streak, and challenge multipliers. This means the effective boost is: EASY 5→7, MEDIUM 10→12, HARD 20→22. It does not compound with the Patron's Key +2 drip (which is applied after all multipliers as a flat addition). A player with both gets +2 (season, pre-multiplier) + +2 (Patron, post-multiplier) per puzzle — meaningful but bounded.

---

## Revenue Stream 5: Amber Sink & Mid-Game Economy (Replaces Amber Bundles)

**Why no amber bundles**: The game's organic amber economy already generates ~2.5-3x the amber needed for full unlock over 300+ puzzles. Selling amber for cash would (a) trivialize the unlock progression for purchasers, (b) create a scenario where the house is fully built by puzzle 42 while phases require 225+ puzzles, leaving a 180-puzzle engagement gap, and (c) generate minimal revenue (estimated 2-3% of total) for significant engineering effort (IAP receipts, weekly cap logic, edge cases). The development time is better spent on cosmetics.

**Instead, introduce an in-game amber sink at Phase 2+** to maintain earn/spend tension through the mid-game:

| Feature | Phase | Cost | Effect |
|---|---|---|---|
| Animal gifts | Phase 1+ | 15-30 amber | Small cosmetic gifts for animals; triggers a unique one-time dialogue line. 3 gifts per animal, 30 total. |
| Room upgrades | Phase 2+ | 50-100 amber | Cosmetic room enhancements (extra furniture, lighting changes). Earnable, not purchasable with real money. |
| Amber altar | Phase 3+ | Accumulative | Visual structure on the home screen that transforms as amber is poured into it. Ties into the ritual narrative. Purely visual — the altar's appearance reflects total amber invested. |

These sinks consume amber that would otherwise accumulate uselessly between the "house fully built" milestone (~puzzle 130-150) and the sacrifice mechanic activation (Phase 4, ~puzzle 250). They provide something to spend amber on during the critical mid-game retention period.

**Puzzle-count gates on late unlocks**: To prevent any amber surplus (from ads, Patron drip, or seasonal bonus) from outrunning progression too far, the final 6 unlocks require minimum puzzle counts:

| Unlock | Amber Cost | Minimum Puzzles |
|---|---|---|
| Jungle (Sloth's room) | 275 | 55 puzzles |
| Desert (Fennec's room) | 225 | 75 puzzles |
| Office (Capybara's room) | 200 | 95 puzzles |
| Burrow (Wombat's room) | 250 | 115 puzzles |
| Garden (Rabbit's room) | 300 | 140 puzzles |
| Bamboo Attic (Red Panda's room) | 475 | 170 puzzles |

This ensures that even a player watching every rewarded ad cannot fully build the house before experiencing a substantial portion of the narrative arc.

---

## What We Will NOT Do

These practices are explicitly excluded from the monetization plan:

| Practice | Why It's Excluded |
|---|---|
| Energy/lives system | Puzzles should be playable whenever the player wants. Limiting play sessions damages the narrative flow. |
| Loot boxes / gacha | Random rewards exploit psychological vulnerabilities. All purchases are deterministic. |
| Pay-to-skip phases | The narrative IS the product. Skipping it destroys value. |
| Pay-to-win hints | Hints are educational. Monetizing them creates frustration-then-payment loops. |
| Forced ads | No unskippable, pre-roll, or mid-puzzle ads. Ever. |
| Subscription-only content | No recurring payment required to access the base game or narrative. |
| FOMO countdown timers | No "limited time only!" pressure on core purchases. (Seasonal pass is time-bounded by nature, but the base game is permanent.) |
| Paywalled animals/dialogue | All 10 animals and 610+ dialogue lines are earnable through play. |
| Difficulty manipulation | Puzzles are never made harder to encourage purchases. |
| Dark patterns in UI | No disguised ads, no "X" buttons that are hard to tap, no opt-out-by-default purchases. |
| Amber bundles for cash | Selling currency directly undermines the earn/spend loop and creates a 180-puzzle engagement gap. |
| Guest/temporary animals | Breaks the closed cult narrative and creates FOMO inconsistent with the game's pacing philosophy. |

---

## Phase-Aware Monetization Tone

Monetization UI shifts tone with narrative phase through **visual desaturation and emotional flatness** — not by speaking in the voice of the cult or the void. The monetization system should feel *tired* at later phases, not *ritualistic*. The shop can feel darker (muted colors, less cheerful copy), but it must never break the diegetic/non-diegetic boundary.

| Element | Phase 0-1 | Phase 2 | Phase 3-4 |
|---|---|---|---|
| Shop button label | "The Collection" | "The Collection" | "Offerings" |
| Purchase confirmation | "Thank you!" | "Thanks." | "Accepted." |
| Rewarded ad prompt | "Watch for bonus amber!" | "Watch for amber." | "More amber." |
| Patron's Key description | "Support WordShift!" | "Support WordShift." | "Remove ads. Keep going." |
| Shop background | Bright, candy-colored | Muted, desaturated | Dark, minimal |

**Key principle**: The shop's text stays transactional and functional. The narrative mood is carried by visual treatment (darker backgrounds, slower animations, muted palette), not by making purchase prompts sound like cult recruitment. The void does not sell ads.

---

## Additional Revenue Opportunities

### A. Gifting ($5,000-10,000/year)

Allow players to purchase a Patron's Key as a gift via share link. The word puzzle demographic (adults 25-55) frequently gift apps to partners, parents, and friends. 5-10% of premium purchases in comparable puzzle games come through gifting. Near-zero acquisition cost for the recipient.

### B. Creator's Commentary ($2.99, one-time, $8,000-15,000/year)

After reaching Phase 4 or completing the game, offer a "behind the curtain" mode showing developer commentary: which early Fox lines were foreshadowing, how word lists shifted, when visual changes first appeared. This is a "DVD extras" package. The narrative-invested audience will buy this. Costs almost nothing to produce (write commentary, surface as overlays on existing content). Only available to players who have reached Phase 4+ — no spoiler risk.

### C. Challenge a Friend (Free, UA tool)

Custom puzzle sharing where players send a specific puzzle to a friend with a personal message. Free to send; recipient gets a "Join WordShift" prompt. Not direct monetization, but the highest-converting UA channel in the puzzle genre (personal referral).

### D. Wildlife Partnership (Brand Value)

Partner with a wildlife charity. Offer a $2.99 "Wildlife Pack" cosmetic bundle where 50% goes to pangolin/axolotl conservation. Generates positive press (free UA), improves App Store featuring chances, and creates a purchase motivation beyond personal benefit.

---

## Revenue Projections

### Assumptions (Revised)
- **Organic installs**: 30,000-50,000 in first 6 months (realistic without paid UA)
- **With $30-40K UA budget** (Apple Search Ads): 55,000-75,000 installs in first 6 months
- 25% Day-7 retention
- 10% Day-30 retention
- 3-5 puzzles/day for active users
- Average session: 8-12 minutes
- Geographic mix: ~50% US/UK/CA/AU, ~50% rest of world

### Revenue Model (Monthly, at Steady State ~Month 6, ~2,500 DAU)

| Stream | Conversion/Engagement | Est. Monthly Revenue | % of Total |
|---|---|---|---|
| Rewarded + Interstitial Ads | 55% of DAU sees ads | $5,500-9,000 | 38% |
| Patron's Key ($6.99) / Bundle ($9.99) | 5-8% of retained users | $4,000-6,500 | 27% |
| Cosmetic Shop | 3-5% of retained users, $2.50 avg | $2,500-4,500 | 18% |
| Content Pass (monthly + quarterly) | 5-7% of retained users | $2,000-3,500 | 14% |
| Additional (gifting, commentary) | 1-2% of retained users | $500-1,000 | 3% |
| **Total** | | **$14,500-24,500** | **100%** |

### Year-1 Projection
- **Organic only (no UA spend)**: $85,000-$130,000
- **With $35K UA budget**: $120,000-$185,000 (net of UA: $85,000-$150,000)
- **Optimistic (viral moment / App Store featuring)**: $250,000+

### Year-2+ Considerations
Word puzzle games have long revenue tails if retention is strong. The narrative arc is a moat — no competitor has a comparable 15-20 hour horror story. If Phase 2+ retention exceeds 35% of D30 users, word-of-mouth from "this cute word game that turns into a cult horror story" becomes the primary growth engine. The viral coefficient for this narrative hook, if it catches social media (TikTok Phase 0 vs Phase 4 contrast videos), could exceed 0.5.

---

## Implementation Priority

### Launch (Pre-Launch / MVP Monetization)
1. Interstitial ads (between puzzles, every 3rd/5th completion based on phase)
2. Rewarded video ads (post-victory flat +8 amber)
3. Patron's Key IAP ($6.99 ad removal + perks)
4. Patron's Key + Starter Collection bundle ($9.99)

### Month 1-2 Post-Launch
5. First 8 always-available tile theme packs
6. Cloud save activation for Patron users (account-bound)
7. Confetti & victory effect packs
8. Animal gifts amber sink (Phase 1+)

### Month 3-4 Post-Launch
9. Room accent packs
10. Animal accessories
11. Room upgrades amber sink (Phase 2+)
12. Monthly mini-pass ($1.99)
13. Gifting for Patron's Key

### Month 4+ Post-Launch
14. First quarterly major season ($4.99)
15. Seasonal tile themes and narrative echoes
16. Creator's Commentary unlock ($2.99)
17. Puzzle background themes
18. Amber altar visual sink (Phase 3+)

---

## Key Metrics to Track

| Metric | Target | Alert Threshold |
|---|---|---|
| Day-7 Retention | ≥25% | <20% |
| Day-30 Retention | ≥10% | <7% |
| Patron's Key Conversion | 5-8% of D7 users | <3% |
| Ad Revenue per DAU | $0.03-0.08 | <$0.02 |
| Rewarded Ad Opt-in Rate | 40-60% | <25% |
| Average Puzzles per Session | 3-5 | <2 |
| Phase 2 Reach Rate | 50% of D30 users | <35% |
| Phase 4 Reach Rate | 15% of D30 users | <8% |
| Cosmetic Purchase Rate | 3-5% of retained | <2% |
| Player Sentiment (reviews) | ≥4.5 stars | <4.0 stars |
| Mid-game amber surplus | <1,500 at puzzle 150 | >2,500 (sink not working) |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Ad fatigue reduces retention | Medium | Phase-scaled frequency (3rd→5th puzzle at Phase 3+); Patron's Key removes all ads; exempt high-ritual moments |
| Cosmetics feel thin for the price | Medium | 35-45 items at launch; deep tile theme catalog (12+); quarterly expansion; themed bundles |
| Narrative players reject monetization | Medium | Tonal desaturation (not ritual language); no fourth-wall breaks; monetization is ambient, not aggressive |
| Horror theme limits audience | Medium | App store listing leads with "word puzzle"; the reveal is the hook, not the marketing; TikTok contrast content |
| Cloud save enables spoiler sharing | Low | Account-bound saves; no file export; Whisper Gallery excluded from sync |
| Mid-game amber surplus kills engagement | Medium | Animal gifts, room upgrades, and amber altar provide Phase 1-3+ sinks; puzzle-count gates on late unlocks |
| Seasonal content cadence slips | Medium | Monthly mini-pass provides baseline; major seasons framed as "special events" not a subscription cadence |
| Accessories undermine Phase 4 tone | Low | Suppressed on robed sprites with narrative prompt; return in Phase 5 |
| Organic install target missed | High | Budget $30-40K for Apple Search Ads UA; invest in TikTok content strategy; ASO optimization for "word puzzle" keywords |

---

## Summary

WordShift's monetization is designed around one principle: **the narrative is the product, and the product must never be compromised for revenue.**

Players who never spend a cent experience the full 610-line dialogue arc, all 10 animals, all 5 phases, and the complete cosmic horror revelation. Paying players get convenience (fewer ads), expression (cosmetic customization), and depth (seasonal narrative echoes and curated puzzles). Nobody gets a shortcut through the story.

**Key decisions in this plan and the reasoning behind them:**

1. **Flat +8 amber per rewarded ad** instead of +50% — prevents multiplier stacking from breaking the economy for HARD/challenge/streak players.
2. **No amber bundles for cash** — the organic economy is already generous; selling amber trivializes the house-building loop and creates a 180-puzzle engagement gap.
3. **No guest animals** — the closed 10-animal cult is the narrative's core horror device; an 11th animal, in or out of the cult, breaks this.
4. **Monetization text stays transactional** — the void does not sell ads; phase tone is carried by visual treatment, not cult vocabulary in purchase prompts.
5. **Accessories suppressed at Phase 4** — a party hat on a robed cultist is comedic, not horrifying; the narrative earns the right to override cosmetics.
6. **Puzzle-count gates on late unlocks** — prevents any amber surplus from outrunning the narrative; the house cannot be fully built before the player has experienced the story.
7. **Account-bound cloud saves** — no exportable save files; Whisper Gallery excluded from sync to prevent spoiler distribution.
8. **Reduced ad frequency at Phase 3+** — the most invested players deserve the most unbroken experience; they are also the most likely premium purchasers.
9. **Mid-game amber sinks** — animal gifts, room upgrades, and the amber altar give players something to spend on between "house complete" and "sacrifice available."
10. **Creator's Commentary as post-game IAP** — monetizes the most engaged segment with near-zero production cost while adding genuine replay value.

Revenue is diversified across ads (~38%), premium upgrade (~27%), cosmetics (~18%), content passes (~14%), and supplementary streams (~3%). The ethical guardrails protect long-term retention, app store ratings, and the narrative integrity that is WordShift's only true competitive moat.
