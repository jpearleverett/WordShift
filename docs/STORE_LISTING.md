# WordShift — Store Listing Kit

Working copy for the App Store / Google Play listings. The hook of the game is
the tonal bait-and-switch — the listing must *hint* at the darkness without
spoiling the reveal, while the age rating must declare it honestly.

## Identity

- **App name:** WordShift
- **iOS subtitle (≤30 chars):** `Cozy word game. Mostly.`
- **Android short description (≤80 chars):**
  `Shift letters, build words, befriend animals. They've been waiting for you.`

## Full description

> **Shift one letter. Change everything.**
>
> WordShift is a cozy word puzzle with a simple, satisfying rule: pick a letter
> from one word and drop it into the next — both words must stay real words.
> Easy to learn, endlessly chewy to master.
>
> 🦊 **Build a home.** Earn amber with every puzzle and fill a charming house
> with thirteen animal friends — a fox who loves the fire, a pangolin who
> cooks, an owl buried in old books.
>
> 🧩 **Thousands of puzzles.** Four difficulties, Reverse and Double Shift
> modes, timed Speed runs, and a Daily Challenge shared by every player.
>
> 🔥 **Keep your streak.** Daily streaks with streak freezes to protect them,
> weekly quests, and 51 achievements.
>
> 🌙 **Stay a while.** The animals have so much to tell you. They find you
> fascinating. They're so glad you're here.
>
> They've been waiting a long time.
>
> ---
>
> No accounts required. Core puzzles play offline. Free to play, supported by
> occasional ads and optional in-app purchases (amber and hint packs, cosmetic
> themes, a one-time starter bundle) — including a one-time Remove Ads if
> you'd rather not see the ads at all. Purchases are convenience and cosmetics
> only: the story unfolds at the same pace for everyone. A slow-burn story for
> players 13+ — things in the cozy house are not quite what they seem.

## Keywords (iOS, ≤100 chars)

`word,puzzle,letters,anagram,cozy,daily,streak,brain,horror,story,animals,offline`

## Age rating guidance

- **ESRB:** Teen (fantasy themes, mild horror) — answer "infrequent/mild horror/fear themes" honestly in the questionnaire.
- **PEGI:** 12 (moderate horror themes, no violence, no profanity — dictionary is filtered).
- **Apple:** 12+ — "Infrequent/Mild Horror/Fear Themes."
- **Contains ads:** Yes (Google AdMob — interstitial + opt-in rewarded). Declare it in the Play "Ads" question. `app-ads.txt` is live at the domain root (`https://jpearleverett.github.io/app-ads.txt`, pub-6575205005908086).
- **Contains in-app purchases:** Yes — 9 products (amber packs, hint packs, one-time starter bundle, Remove Ads, Patron's Key, cosmetic bundle; all created + activated in Play Console 2026-07-02). Play derives the displayed price range from the active products automatically.
- **Target audience:** 13+ (do not target children — ads + dark themes). Avoids the Families policy.

## Data safety / privacy (Play Data Safety + Apple Privacy)

Backend features are LIVE (Supabase + Sentry + AdMob + Google Play Billing), so you must declare data collection — do **not** mark "no data collected". The Play data-safety form was submitted with this inventory (2026-07-02); keep the list, the privacy policy, and the form in sync. Declare:

- **App interactions / analytics** — anonymous events (install id, platform, app version, event type + non-identifying event details) → Supabase. Purpose: analytics. Not linked to identity, not shared for ads.
- **Crash logs & Diagnostics** — device model, OS, app version, stack traces → Sentry. Purpose: app functionality / diagnostics.
- **Device or other IDs — Advertising ID** — collected by Google AdMob. Purpose: advertising/marketing. May be shared with Google.
- **Approximate location** — coarse, IP-derived, collected by Google AdMob for ad serving. Purpose: advertising/marketing.
- **Purchase history** — entitlement/purchase records via Google Play Billing / RevenueCat. Purpose: app functionality.
- **App info & performance / "Other" save data** — cloud backup of the game save (stored under a random install id, synced automatically when online) + daily leaderboard result (time/stars/hints, only if the player plays the daily) → Supabase.

Legal pages are **LIVE and publicly accessible** via GitHub Pages (deployed from branch, `/docs`). Use these URLs in the store consoles and in-app Settings (all three are also wired into `mobile/src/constants/links.ts`):

- Privacy policy URL (required, both stores): `https://jpearleverett.github.io/WordShift/privacy-policy/`
- Terms of Service URL: `https://jpearleverett.github.io/WordShift/terms/`
- Data deletion URL (Play Data Safety — account/data deletion): `https://jpearleverett.github.io/WordShift/data-deletion/`

## Asset checklist

- [x] App icon 1024×1024 — `mobile/assets/icon.png`
- [x] Feature graphic 1024×500 (Play) — `docs/feature-graphic.png`
- [ ] iPhone 6.7" screenshots ×5 (needs device/simulator)
- [ ] iPad 12.9" screenshots ×3 (supportsTablet is true)
- [ ] Android phone screenshots ×4

### Screenshot shot list (in narrative-safe order)

1. Puzzle mid-move at Phase 0 — selected tile + green ✓ previews ("One rule. Real words only.")
2. Home screen, sunny, 3-4 animals + clouds ("Build a home for your friends.")
3. Victory modal, 3 stars + amber breakdown ("Earn amber. Three-star everything.")
4. Daily challenge card + streak flame ("One shared puzzle, every day.")
5. (Optional tease, last slot) Phase 2 dusk home screen — slightly darker, no spoilers ("Stay a while.")

Never show Phase 3+ content, the robed sprites, or the shadow figure in store
assets — the reveal is the product.

## Release notes template (1.0)

> The house is ready. The animals are waiting.
> • Thousands of letter-shifting puzzles across four difficulties
> • Thirteen animal friends, a house to build, a daily challenge to share
> • Streaks, quests, achievements — and a story that unfolds the longer you stay
