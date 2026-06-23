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
> with ten animal friends — a fox who loves the fire, a pangolin who cooks, an
> owl buried in old books.
>
> 🧩 **Thousands of puzzles.** Four difficulties, Reverse and Double Shift
> modes, timed Speed runs, and a Daily Challenge shared by every player.
>
> 🔥 **Keep your streak.** Daily streaks with streak freezes to protect them,
> weekly quests, and 40 achievements.
>
> 🌙 **Stay a while.** The animals have so much to tell you. They find you
> fascinating. They're so glad you're here.
>
> They've been waiting a long time.
>
> ---
>
> No accounts required. Core puzzles play offline. Free to play, with optional
> ads and a couple of cosmetic/convenience purchases — including a one-time
> Remove Ads if you'd rather not see them. A slow-burn story for players 13+ —
> things in the cozy house are not quite what they seem.

## Keywords (iOS, ≤100 chars)

`word,puzzle,letters,anagram,cozy,daily,streak,brain,horror,story,animals,offline`

## Age rating guidance

- **ESRB:** Teen (fantasy themes, mild horror) — answer "infrequent/mild horror/fear themes" honestly in the questionnaire.
- **PEGI:** 12 (moderate horror themes, no violence, no profanity — dictionary is filtered).
- **Apple:** 12+ — "Infrequent/Mild Horror/Fear Themes."
- **Contains ads:** Yes (Google AdMob — interstitial + opt-in rewarded). Declare it in the Play "Ads" question.
- **Target audience:** 13+ (do not target children — ads + dark themes). Avoids the Families policy.

## Data safety / privacy (Play Data Safety + Apple Privacy)

Backend features are LIVE (Supabase + Sentry + AdMob + Google Play Billing), so you must declare data collection — do **not** mark "no data collected". Declare:

- **App activity / analytics** — anonymous events (install id, platform, app version, event type) → Supabase. Purpose: analytics. Not linked to identity, not shared for ads.
- **Crash logs / diagnostics** — device model, OS, app version, stack traces → Sentry. Purpose: app functionality / diagnostics.
- **Device or other IDs — Advertising ID** — collected by Google AdMob. Purpose: advertising/marketing. May be shared with Google.
- **Purchase history** — entitlement records via Google Play Billing / RevenueCat. Purpose: app functionality.
- **App info & performance / "Other" save data** — optional cloud backup (game save under a random install id) + daily leaderboard result (time/stars/hints) → Supabase, only if the player uses those features.

Privacy policy URL (required): `https://jpearleverett.github.io/WordShift/privacy-policy/` (enable GitHub Pages: repo → Settings → Pages → deploy from branch, `/docs`).

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
> • Ten animal friends, a house to build, a daily challenge to share
> • Streaks, quests, achievements — and a story that unfolds the longer you stay
