# WordShift - Claude Code Context

A word puzzle game where players shift letters between words to form valid English words. What begins as a bright, candy-colored experience with adorable animal companions gradually descends into cosmic horror — the animals are revealed to be members of a cult, and every puzzle the player solves brings them closer to summoning a dark entity.

## Quick Commands

```bash
cd mobile
npx expo start           # Start dev server (scan QR with Expo Go)
npx expo start --clear   # Clear cache and start
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint 9 flat config (eslint-config-expo)
npm run generate:assets  # Regenerate icons/splash/notification icon/SFX (pure Node)
```

## Testing

- **Run all tests**: `cd mobile && npm test -- --no-coverage`
- **Run a single test file**: `cd mobile && npm test -- --no-coverage --testPathPattern=<filename>`
- **Run tests for changed files only**: `cd mobile && npm test -- --no-coverage --changedSince=main`
- Do NOT use `npx jest` directly — it does not find the local install and triggers a full remote download + deprecated dependency warnings every time. Always use `npm test` which routes through the locally installed jest.
- `npm install` IS allowed in this environment. Fresh containers may start without `node_modules`; run `cd mobile && npm install` (or `npm ci`) once at the start of a session before running tests/typecheck/lint. Prefer `npm ci` when `package-lock.json` is present and unchanged.
- The full suite has ~1,680 tests across 70 suites, expected green (counts drift as features land — don't treat the number as load-bearing). **Prefer running only the relevant test file(s)** rather than the full suite unless explicitly asked to run everything.

## Tech Stack

- **Framework**: React Native with Expo SDK 56
- **Language**: TypeScript (strict)
- **Navigation**: State-based (`currentScreen: 'home' | 'puzzle' | 'settings' | 'stats' | 'ledger' | 'gallery' | 'pit' | 'shop'`)
- **State**: React useState/useEffect (no external state library)
- **Persistence**: AsyncStorage with in-memory cache pattern
- **Haptics**: expo-haptics (settings-gated)
- **Audio**: expo-audio playing a bundled 14-sound WAV SFX pack (`assets/sounds/`, settings-gated, plays in iOS silent mode). Migrated off the deprecated expo-av, whose `VideoViewModule` failed to load on SDK 56 (`NoClassDefFoundError`) and crashed the app at launch
- **Analytics/crash**: local event log (`eventLogger.ts`) + global error handler installed at startup; remote analytics upload via `telemetry.ts`/Supabase and crash forwarding via Sentry are **configured** (`supabaseUrl`/`supabaseAnonKey`/`sentryDsn` set in `app.json` → `extra`)
- **Testing**: Jest with ts-jest preset
- **Target**: iOS and Android via Expo Go

## Narrative Vision

**The core conceit**: The player is unknowingly participating in a ritual. Every puzzle solved is an incantation. The animal "friends" aren't just getting philosophical — they're preparing for something. The house isn't just a home — it's a temple being constructed, room by room, to house something ancient.

**The tone shift must be gradual and earned.** The game should feel genuinely delightful for the first 25+ puzzles. Players should *like* these animals. The betrayal of that warmth is the entire point. When Fox says "The fire grows cold... but something else burns," it should land because the player remembers when Fox just wanted to tell them about cozy blankets.

**Everything reflects the transition:**
- **Puzzle words**: Shift from FUN/SPARK/TIGER → VOID/DOOM/ABYSS/RITUAL
- **Background visuals**: Bright candy purple → near-black with crimson accents
- **Floating particles**: Sparkles and stars → dim, dying embers
- **Victory text**: "PERFECT!" → "WHY DOES IT MATTER?" (plus ritual echo showing completed word chain)
- **Words offered counter**: Simple stat → "N words offered to the arrangement"
- **Move messages**: "Delicious!" → "The void accepts."
- **Confetti**: Vibrant rainbow → muted, dark colors
- **Hints**: "Move 'R' — think WARM!" → "If it matters, 'R' — see VOID."
- **Home screen**: Sunny day, happy clouds → storm sky, shadow figure looming
- **Animal sprites**: Cute idle poses → robed cult figures
- **Letter tiles**: Bouncy, fast wobble → heavy, ponderous movement with trailing glow
- **Shadow figure**: Invisible (Phase 0-2) → faint silhouette (Phase 3, opacity 0.18) → full looming presence with crimson eyes (Phase 4, 0.5) → settled (Phase 5, 0.35). `ShadowFigure` in HouseWorld.tsx renders `shadow_figure.png` behind the house with a slow breathing loop (native driver, reduced-motion aware)
- **Sound**: a 14-sound SFX pack (cheerful candy chimes + a low `phase_change` swell)

**Key narrative rules:**
1. Never break the fourth wall. The animals don't know they're in a game.
2. The darkness should feel *earned*, not sudden. Each phase is a gradual shift.
3. Phase 4 animals aren't "evil" — they're reverent, serene, certain. That's what makes it unsettling.
4. The player should feel complicit. "You solved the puzzle. You brought us closer."
5. Visual changes should slightly precede dialogue revelations — the player should *feel* something is off before they're told.
6. The shadow_figure.png entity is never named, never explained. It just *is*.
7. **Never reveal the phase system to the player.** No "Phase 2/5" labels, no progress bars toward phase transitions. The player should experience the shift organically through visuals, dialogue, and tone — never through a UI label telling them what stage they're in.

**Phase narrative arc:**
- **Phase 0 (Bright Days)**: Pure joy. Cute animals, candy colors, fun words. The trap is set.
- **Phase 1 (Curious Thoughts)**: Animals start wondering about the nature of things. Subtle philosophical undertones.
- **Phase 2 (Deeper Questions)**: Isolation creeps in. Animals question reality, impermanence. Words shift toward emptiness. The background noticeably darkens.
- **Phase 3 (Growing Shadows)**: Overt dread. Animals speak of endings, purpose, something approaching. The puzzle screen feels cold. Victory feels hollow.
- **Phase 4 (The Horizon)**: The cult is revealed. Animals speak of "the arrangement," "the pattern," "what comes through." Robed sprites. Storm sky. The shadow figure appears. Every puzzle solved is explicitly framed as part of the summoning.
- **Phase 5 (Post-Revelation)**: After the final puzzle + house completion. Terrible peace. Animals are serene, not dreadful. The shadow has settled. Victory text: "The pattern continues."

## Project Structure

```
mobile/
├── App.tsx                      # Bootstrap gate (cloud auto-restore → migrations → cosmetics/hints/entitlements; IAP/ads init fire-and-forget; error handler) wrapping MainApp (~2800 lines): screen routing, onboarding, post-victory intros, deep-link + notification-tap routing (incl. cold-start), Android back handling
├── assets/                      # Image assets (characters/, rooms/, house/, environment/)
├── src/
│   ├── types.ts                 # TypeScript interfaces (RowData, Letter, GameState, etc.)
│   ├── types/homeWorld.ts       # Home screen types, config constants, DialoguePhase = 0|1|2|3|4|5
│   ├── constants/               # Centralized constants (index.ts re-exports; import from '../constants')
│   │   ├── wordLists.ts         # Word lists by length (3-7 letters), COMMON_WORDS, fallback pools, CURATED_EARLY_PUZZLES
│   │   ├── gameBalance.ts       # Phase thresholds, amber rewards, streak config, daily unlock, puzzle gen timeouts
│   │   ├── links.ts             # Live legal/store URLs (PLAY_STORE_URL, WEB_LANDING_URL)
│   │   ├── tileLayout.ts        # Shared arc-layout geometry (single source of truth for Row/LetterTile/slotEstimation)
│   │   └── timing.ts            # Animation/interaction timing constants
│   ├── dictionary.ts            # 11,504-word dictionary (3-7 letters, profanity-filtered)
│   ├── data/                    # Pre-generated puzzle banks (12 banks, ~480 puzzles each after profanity purge; lazy-loaded)
│   │   ├── puzzleBankTypes.ts   # PreGeneratedPuzzle interface
│   │   ├── puzzleBankEasy.ts .. puzzleBankHard.ts           # Standard banks
│   │   ├── puzzleBankReverseEasy.ts .. puzzleBankReverseHard.ts  # Reverse banks
│   │   └── puzzleBankDoubleShiftEasy.ts .. puzzleBankDoubleShiftHard.ts  # Double-shift banks
│   ├── hooks/
│   │   ├── usePuzzleGame.ts     # All puzzle game state and actions
│   │   ├── useGamePersistence.ts # Persistence: amber, stats, phases, phase transitions
│   │   ├── useVictoryFlow.ts    # Victory animation choreography
│   │   ├── useVictoryOrchestration.ts # Post-victory cascade: glitch, micro-beats, whispers, interjections
│   │   ├── useSpeedTimer.ts     # Speed-variant countdown timer
│   │   ├── useDreadEffects.ts   # Dread pulse overlay + screen shake (phase-scaled)
│   │   ├── useOnboardingFlow.ts # Multi-screen onboarding state machine (11 steps)
│   │   ├── useAchievementQueue.ts # Achievement checking + toast queue
│   │   ├── useDialogueFlow.ts   # Dialogue session state, cooldowns, Phase 5 routing
│   │   ├── useUnlockFlow.ts     # Home unlock flow: room/animal purchases
│   │   ├── useAutosave.ts       # Debounced mid-session puzzle state autosave
│   │   └── useScreenInsets.ts   # Safe-area insets (SafeAreaProvider-backed) — replaces the old hardcoded status-bar padding
│   ├── components/
│   │   ├── Row.tsx              # Game row with PICK/DROP badges, arc layout (React.memo'd)
│   │   ├── LetterTile.tsx       # Animated letter tile with 3D candy styling, phase-aware springs/trails
│   │   ├── DraggableTile.tsx    # PanResponder drag wrapper for LetterTile
│   │   ├── AnimatedBackground.tsx  # Phase-aware floating particles + pulse
│   │   ├── PhaseTransitionOverlay.tsx # Cinematic multi-scene interstitial
│   │   ├── Confetti.tsx         # Phase-aware confetti + StarBurst
│   │   ├── FoxGuide.tsx         # Fox tutorial dialogue card (talk/idle sprite alternation like home dialogue)
│   │   ├── SettingsScreen.tsx   # Sound/Haptics/Reduced Motion/Daily Reminders toggles, Restore Purchases (PURCHASES section), Privacy Options row (ABOUT — visible only when UMP consent requires it), legal links (Privacy Policy / Terms of Service / Data Deletion — all live), support contact, Reset All (`performFullReset` — Promise.allSettled over every service clear, then **overwrites the cloud row with the cleared state** so the bootstrap's fresh-install auto-restore can't resurrect the old save; App's `onReset` rebuilds all in-memory state when in-place reload is unavailable)
│   │   ├── StatsScreen.tsx      # Stats overview + achievements
│   │   ├── AchievementToast.tsx # Slide-in achievement notification
│   │   ├── DailyChallengeCard.tsx # Compact daily challenge button (header)
│   │   ├── DailyLoginModal.tsx  # Daily app-open reward claim modal (7-day cycle, phase-aware)
│   │   ├── puzzle/              # Extracted puzzle UI components
│   │   │   ├── ActionButton.tsx, AnimatedLogo.tsx, LevelDisplay.tsx, Toast.tsx
│   │   │   ├── VictoryModal.tsx # Victory screen (stars, stats, amber breakdown)
│   │   │   ├── RulesModal.tsx   # Phase-aware "How to Play" rules
│   │   │   ├── DifficultyMenu.tsx # Setup menu: difficulty + variant selector
│   │   │   └── AnimalWhisper.tsx # Ghost-like post-puzzle whisper
│   │   ├── OfferingPitScreen.tsx # Offering Pit: tap-to-devour words, ward marks, phase transitions, Phase-5 Tending Shrine modal
│   │   ├── shop/ShopScreen.tsx  # Cosmetic Shop: buy/equip amber tile themes (expression-only)
│   │   ├── share/ShareCard.tsx  # Phase-aware, spoiler-free shareable result card (forwardRef for PNG capture)
│   │   ├── share/ShareResultModal.tsx # Victory share preview → shares image (or text fallback)
│   │   ├── WhisperGalleryScreen.tsx # Collectible whisper/dialogue archive
│   │   ├── WordLedger.tsx       # Ritual word history screen
│   │   └── home/
│   │       ├── HomeScreen.tsx   # Main home screen with animal house, unlocks, journal hub
│   │       ├── HouseWorld.tsx   # Pannable house view (vertical pan, saved position)
│   │       ├── RoomView.tsx     # Individual room rendering
│   │       ├── AnimalSprite.tsx # Animated animal characters
│   │       ├── JuicyButton.tsx, AmberSparkle.tsx, CelebrationConfetti.tsx
│   ├── theme/colors.ts          # CandyColors palette, tile colors, PhaseTheme system
│   ├── styles/appStyles.ts      # App.tsx StyleSheet, getScreenBackgroundColor()
│   └── services/
│       ├── localGenerator.ts    # Puzzle generation (DFS, adjacency indices, quality scoring, dread words)
│       ├── puzzleBank.ts        # Pre-generated puzzle bank selection + recycling
│       ├── wordHistory.ts       # Word cooldown tracking for diversity
│       ├── starRating.ts        # Star rating + cumulative stats
│       ├── amberCurrency.ts     # Amber economy, streak, phase progression, deferred transitions
│       ├── dialogue/            # Split dialogue system
│       │   ├── animalDialogueBase.ts, animalDialogueIntro.ts
│       │   ├── animalDialogueReactions.ts, animalDialogueNarrative.ts
│       │   ├── animalDialogueVariants.ts
│       │   ├── animalDialogueTending.ts  # ~50 Phase-5 Tending milestone lines (5/animal)
│       │   └── phase5Pool.ts    # Shared Phase-5 line pool (base + choice + tending) for hook + badge
│       ├── dialogueSession.ts   # Dialogue sessions with puzzle-based cooldowns
│       ├── homeWorldData.ts     # Room/animal definitions, unlock progression
│       ├── dailyChallenge.ts    # Daily puzzle with seeded PRNG
│       ├── dailyLoginReward.ts  # Daily app-open reward (7-day escalating cycle, local-day bucketed)
│       ├── phaseNarrative.ts    # ALL phase-aware text (victory, moves, hints, loading, etc.)
│       ├── phaseEvents.ts       # Phase transition cinematic events
│       ├── achievements.ts      # 40 achievements across 5 categories, each grants one-time amber
│       ├── weeklyQuests.ts      # Quest system (5 daily + 5 weekly rotating quests)
│       ├── puzzleVariety.ts     # Puzzle variant configs + unlock requirements
│       ├── whisperGallery.ts    # Collectible whisper archive
│       ├── dialogueChoices.ts   # Phase 3 player choice points
│       ├── sacrifice.ts         # Phase 4+ amber sacrifice mechanic
│       ├── tending.ts           # Phase 5 Tending Shrine: soft-infinite cosmetic amber sink + honest Phase-5 dialogue selection (caughtUp pointer, pure selectPhase5Dialogue)
│       ├── notifications.ts     # Push notification scheduling
│       ├── cloudSave.ts         # Cloud save (pluggable provider; live Supabase provider when supabaseUrl set in app.json — configured)
│       ├── entitlements.ts      # Monetization: owned purchases / Patron status (source of truth)
│       ├── iap.ts               # Monetization: BillingProvider seam (live RevenueCat adapter in providers/revenueCatBilling.ts)
│       ├── ads.ts               # Monetization: AdProvider seam + ad policy (live AdMob adapter in providers/googleAdMobAds.ts)
│       ├── providers/           # Live monetization adapters: revenueCatBilling.ts (IAP), googleAdMobAds.ts (ads)
│       ├── cosmetics.ts         # Cosmetic ownership/equip + amber shop (tile themes + confetti palettes; getEquippedSync, initCosmetics; pushes tile theme to colors.ts)
│       ├── wordHarvest.ts       # Offering Pit harvest batches (over-cap = merge oldest, never drop amber)
│       ├── slotEstimation.ts    # Drag-and-drop slot position estimation (`estimateSlotIndex`) + `findClosestValidSlot` (App routes drag drops through it with a ±1-slot bound for near-miss forgiveness; ties break toward the finger, never teleports across the row)
│       ├── puzzleSaveState.ts   # Mid-puzzle autosave/restore
│       ├── roomUpgrades.ts      # Room upgrade amber sink (Phase 2+)
│       ├── onboarding.ts        # Onboarding state machine + persistence
│       ├── dataMigration.ts     # Schema versioning + migrations (v3)
│       ├── configValidation.ts  # Configuration data validation
│       ├── telemetry.ts         # Remote event uploader → Supabase events table when supabaseUrl is set (configured)
│       ├── dateUtils.ts          # Local-day date helpers (streak/daily bucketing — NEVER UTC/toISOString)
│       ├── settings.ts, haptics.ts, audio.ts, eventLogger.ts
│       ├── deviceTier.ts, performanceMonitor.ts, errorReporting.ts
│       ├── homeScenePan.ts, shareResults.ts (emoji-grid text share + challenge links + Play Store CTA; daily shares are spoiler-free)
│       ├── shareImage.ts        # Pluggable result-image capture (react-native-view-shot + expo-sharing are real deps — PNG ShareCard ships in dev-client/EAS builds; text fallback in Expo Go)
│       └── animalDialogue.ts    # Re-export shim → dialogue/ submodules
├── src/__tests__/               # ~1,680 tests, 70 suites
├── scripts/                     # Puzzle bank generator scripts (12 generators)
├── scripts/tools/               # Pure-Node asset generators + profanity purge + image downscaler
├── eas.json                     # EAS build profiles; `appVersionSource: "local"` → app.json is the single version source. autoIncrement is OFF (it re-bumped to the same code on local source and collided on Play) — **bump `android.versionCode` manually for each release**. `submit.production.android` is wired (serviceAccountKeyPath `./secrets/play-service-account.json`, internal track); the service-account JSON must have Release permission and the FIRST upload of a new app must be done manually in Play Console. Production no longer disables Sentry source-map upload (the `@sentry/react-native` plugin in app.json carries `organization`/`project`; the `SENTRY_AUTH_TOKEN` EAS env secret provides auth; dev/preview still set `SENTRY_DISABLE_AUTO_UPLOAD`). `docs/LAUNCH_CHECKLIST.md` tracks the remaining human release tasks.
└── eslint.config.js             # ESLint 9 flat config. Overrides downgrade CommonJS/unused-var idioms in `scripts/**` (generators) and test files so real app-code warnings aren't drowned (baseline: 0 errors, ~690 warnings — dominated by `react-hooks/refs` notices in components, plus intentional guarded `require`s + hook-dep notes)
```

> **CI**: `.github/workflows/ci.yml` (repo root) runs `npm ci` → typecheck → lint → test on every PR and on push to `main`. Keep it green.

## Game Mechanics

### Core Puzzle Loop
1. Player sees a chain of words (3-5 rows depending on difficulty)
2. Pick a letter from current word — word shrinks by 1 letter
3. Drop letter into next word — word grows by 1 letter
4. Both resulting words must be valid English words
5. Progress through all rows to win

**Move feedback (game feel):** a valid move plays a catch bounce + star burst with escalated haptics (drag-drop `hapticHeavy()` vs tap `hapticMedium()`) and `soundValidMove()`; an **invalid drop** plays `hapticError()` + `soundInvalidMove()` + the target-row error shake (so rejection is felt at the hand, not just shown on the board — `App.tsx` `handleSlotPress` result-`null` path). **Intra-puzzle escalation:** consecutive clean moves on a board ramp the move message via `getComboMoveMessage(streak, phase)` (phase-aware, tiered at streak 2/3/4+); the streak (`cleanMoveStreakRef` in `usePuzzleGame`) resets on an invalid attempt, undo, reverse-midpoint, or new board. **Double-shift `drop1`** (half a move, no `formedWord`) gets a soft "click into place" (`hapticSelection` + `soundTap` + catch bounce), reserving the star-burst celebration for completed words. A drag released **off any row** (Y-bounds reject) now gives feedback — `hapticSelection()` + a phase-aware `getDragMissMessage(phase)` — instead of silently vanishing. **Tap-path arrival**: a tap-committed move plays an arrival settle on the moved tile (`arrivalMoveId`/`arrivalDirection` from `usePuzzleGame` → LetterTile scale/translate spring, phase-aware, reduced-motion aware); drag keeps its own collapse feedback, and autosave restore never replays an arrival.

### Word Preview Mechanic
When a letter is selected, ghost previews show what word would form at each slot position. Valid words green with a "✓ " prefix, invalid red/dimmed with "✗ " (validity is never conveyed by color alone). A slot shows ✓ only when **both** resulting words are valid — the preview ANDs source-word validity (removal must leave a valid source), so there are no false-positive ✓s. Computed via `useMemo` in `usePuzzleGame.ts`, passed to `Row.tsx` as `slotPreviews`.

### Difficulty Levels

| Difficulty | Word Length | Rows | Amber | Description |
|-----------|-------------|------|-------|-------------|
| EASY | 4 letters | 3 | 8 | Quick intro puzzles |
| MEDIUM | 4 letters | 4 | 10 | The standard experience |
| MEDIUM_PLUS | 5 letters | 4 | 15 | Bridge to HARD |
| HARD | 5 letters | 5 | 20 | Full challenge |

### Puzzle Variant Modes (`puzzleVariety.ts`)

Player-selected from the setup menu. Persisted as preferred variant.

- **Reverse Shift** (unlock: 8 puzzles): Play down then back up. Forward-pass letters stay locked (cumulative locking). All served from pre-generated banks with `reverseSolution` for hints. The descent→ascent **midpoint** returns `reverseMidpoint: true` so App fires a celebratory `hapticSuccess()` (the return leg reads as a second act). If on-device generation can't produce a reverse-solvable puzzle and silently downgrades to standard, `startNewGame` now surfaces a phase-aware notice instead of swapping styles unannounced.
- **Double Shift** (unlock: 25 puzzles): Move 2 letters per step. 4-phase input cycle: `pick1 → drop1 → pick2 → drop2`. All words are 5 letters (W=5). Difficulty by row count: EASY=3, MEDIUM=4, MEDIUM_PLUS=5, HARD=6. 1.65x amber multiplier. The first drop (`drop1`) returns a non-null result with **no `formedWord`**, so App gives positive drop feedback (catch bounce + haptic) while skipping dread tracking — it does not fall through to the "invalid drop" error path. The `drop1` slot previews use a **look-ahead** (`canCompleteDoubleShift`): a slot shows ✓ only when some second move from there yields two valid words, so the first drop is guided, not guesswork. Stuck detection runs after each completed step via `hasAnyValidDoubleShiftMove` (the two-letter analogue of `hasAnyValidMove`), surfacing the recovery panel if the row is trapped.
- **Speed Shift** (unlock: 35 puzzles): Timed run with difficulty-aware base timers (EASY 65s → HARD 48s). **Escalation ladder**: each consecutive speed win increments App-level `speedRound`, trimming the next clock by `SPEED_ESCALATION_STEP_SEC` (5s, floored at `SPEED_ESCALATION_MIN_SEC` = 30s) so a streak keeps tightening instead of letting skilled players idle. A "🔥 Round N" indicator appears under the timer once `speedRound > 0`. The ladder resets on any fresh run (Play, variant/difficulty/challenge switch, Home) and on the Time's-Up overlay exits (Try Again / Home) — **not** on time-up itself, since a rescue may continue the run; only **Next Level** continues it. The clock **pauses while the app is backgrounded** (AppState listener in `useSpeedTimer`) and resumes from the saved remaining seconds after a relaunch (`speedTimeRemainingSec` in autosave; legacy `speedTimerExpireAt` still restores as a fallback). Time-up sets `GameState.GAME_OVER` (warning haptic + sound) and shows a **"Time's Up" overlay** in App.tsx with the phase-aware `getSpeedTimeUpMessage(phase)`, a **once-per-board rewarded rescue** (`RewardedAdButton`, placement `speed_rescue`, +30s — `resumeSpeedAfterRescue` flips GAME_OVER→PLAYING and the timer effect restarts the clock; `speedRound` deliberately survives), and two CTAs: **Try Again** (new puzzle) and **Home**. `GAME_OVER` is set *only* on speed time-up.
### Pre-Generated Puzzle Banks

12 banks of ~480 puzzles each (~5,800 total) — generated at 500 each, then filtered by `scripts/tools/purgeProfanity.mjs`. Banks are **lazy-loaded** on first use via `require()` thunks in `puzzleBank.ts` (keeps ~5.7MB of data out of cold start). Standard, reverse, and double-shift variants at all 4 difficulties. Phase-aware selection scores by dread tier proximity. Word freshness cross-references with `wordHistory.ts`, plus a per-bank hub-word frequency penalty (the generator over-uses ~50 'hub' words like MATER/CATER — high-frequency words cost score so the vocabulary long tail surfaces). Top-10 random pick for variety. Recycling when exhausted. Graceful fallback to on-device generation.

### Curated Early Puzzles
5 hand-picked puzzles (`CURATED_EARLY_PUZZLES` in `constants/wordLists.ts`, each with pre-computed solution steps): index 0 is the onboarding tutorial board, the next 4 cover the first post-onboarding session. Served while `puzzlesSolved < CURATED_PUZZLE_COUNT` (5).

### Star Rating
- **3 stars**: 0 hints, 0-1 invalid attempts
- **2 stars**: 1 hint OR 2-3 invalid attempts
- **1 star**: 2+ hints OR 4+ invalid attempts

### Challenge Mode
Optional harder mode: difficulty-aware undo limit (EASY/MEDIUM=2, MEDIUM_PLUS/HARD=1), no hints. 1.5x amber. Challenge completions count 2x toward phase progression.

### Daily Challenge
Deterministic seeded generation. Always HARD: 6-letter words, 5 rows. Streak tracking with a yesterday-only **free** continuation, now backed by a **freeze mercy**: a banked daily-streak freeze (one granted every `DAILY_FREE_FREEZE_INTERVAL_DAYS`=14, capped at 1) auto-forgives a single missed day instead of nuking a long streak — `recordDailyCompletion` consumes it and returns `streakSavedByFreeze` (App surfaces a "🛡️ your daily streak held" message); `getDailyStatus` exposes `streakFreezes`. Unlocked at **8 puzzles** or Phase 1+ (`DAILY_CHALLENGE_UNLOCK_PUZZLES` in `constants/gameBalance.ts` — aligned with the close of the pit auto-collect window, so the always-HARD daily lands as a challenge, not a wall). A **one-time first-daily mercy** grants +`FIRST_DAILY_BONUS_HINTS` (2) free hints when the very first daily starts (`grantFirstDailyMercy` in dailyChallenge.ts, surfaced as a toast from `App.handleStartDaily`). One-time Fox intro.

**Entry point & wiring**: A `DailyChallengeCard` (📅) sits in the **HomeScreen header**, gated by `isDailyChallengeUnlocked()` and hidden during onboarding (shows a pulsing calendar when available, a check + stars + streak badge once done). Tapping it calls `App.handleStartDaily()` → `generateDailyPuzzle()` → `puzzleActions.startDailyGame()` (a hook action that builds a standard, hint-enabled board from the seeded words **without** disturbing the player's chosen difficulty preference). App-level `isPlayingDaily` state threads through `useAutosave` (tags the save with `isPlayingDaily`/`dailyDate`; a daily save is never restored as a normal puzzle), `recordVictory(..., isDaily=true)` (rewards always count as HARD), and the VictoryModal ("Daily Challenge Complete"). On completion App calls `recordDailyCompletion()` and `checkDailyStreakMilestone()` — milestone amber is credited via `awardBonusAmber('daily_streak_milestone')` with a deferred toast. Completions log a `daily_completed` event. `isPlayingDaily` resets on every non-daily start path (Play, variant/difficulty/challenge switch, Home, Next Level).

### Deep Links & Friend Challenges

`wordshift://` URLs (ignored mid-onboarding): `challenge/daily` starts the daily when unlocked (else routes home with an Alert); `challenge/p?w=WORD1-WORD2-…` → `decodeChallengeLink()` → `puzzleActions.startSharedChallengeGame(words)` (validated, standard hint-enabled board). **Friend challenges**: `ShareResultModal` adds a challenge-share button on standard non-daily boards (label via `getChallengeFriendLabel(phase)`; text via `buildChallengeShareText` — taunt + link; chains are 3-6 words, `MIN/MAX_CHALLENGE_WORDS` exported from shareResults and enforced by both the encoder and `startSharedChallengeGame`). The challenge share routes through `shareChallengeText()` so it records share count + the daily share bonus like every other share path. All share text ends with a Play Store CTA (`PLAY_STORE_URL`/`WEB_LANDING_URL` in `constants/links.ts`). The emoji grid is an **honest per-move record** via `moveOutcomes` threaded from `usePuzzleGame` (falls back to the legacy distribution grid when absent, e.g. after autosave restore).

## App Architecture

### Custom Hooks

**`usePuzzleGame()`** — All puzzle state: rows, selected letter, game state, hints, validation, variant handling. Key methods: `initGame()`, `startNewGame()` (guarded by a monotonic `generationIdRef` — every `initGame` commit aborts if a newer call superseded it, so rapid Play/Next-Level taps or a mid-generation variant switch can't clobber a started board), `startDailyGame()` (Daily Challenge bypass path — standard board from seeded words, leaves difficulty pref intact), `startSharedChallengeGame(words)` (friend-challenge link path, validated), `handleLetterPress()`, `handleSlotPress()`, `handleHint()`, `handleUndo()`, `clearBoard()`. Returns `slotPreviews` for word preview mechanic. `handleHint()` also raises `hintHighlight` — the hinted tile + target slot glow on the board, reusing the tutorial-glow rendering (cleared on move/undo/new board; never restored from autosave). Tracks per-move `moveOutcomes` for the honest share grid, and raises `speedRescueSignal` from `resumeSpeedAfterRescue`. After each committed move (non-double-shift), `hasAnyValidMove()` runs stuck detection and sets `isStuck` — a **silent internal signal by product decision**: nothing player-visible renders from it (no panel, no toast — discovering a dead-end and choosing Undo/Restart is part of the challenge; `appIntegration.test.ts` pins the absence). `getStuckPanelTitle()`/`getNoValidMovesMessage()` remain in phaseNarrative but are intentionally unused. `isStuck` resets on undo/restart/new board.

**`useGamePersistence()`** — Persistence: amber, stats, phases, streak. Key: `recordVictory()` returns VictoryData (includes `phaseTransitionPending`, `harvestedWords`, `pendingHarvest`, `firstCompletionBonus`). `refreshStats()` reloads from storage. Reports phase 5 when post-revelation.

**`useVictoryFlow()`** — Victory animation: star pop-in, modal reveal, phase flash, driven by a `VictoryStage` state machine (`idle → recording → choreographing → settled`) plus `victorySpinnerVisible` so no spinner flashes during choreography. `playVictorySequence(stars)`, `skipToEnd(stars)`, `resetVictory()`. `isProcessingVictory` lock prevents double-tap.

**`useVictoryOrchestration()`** — Post-victory cascade: glitch text, narrative micro-beats, animal whispers, interjections, home nudges. Generation-guarded async callbacks.

**`useDialogueFlow()`** — Animal dialogue sessions, cooldowns, trigger word reactions, sacrifice reactions, cross-animal references, coordinated events, narrative seed/callback + Phase-2 exhaustion-pool delivery, Phase 5 post-revelation routing (with a `hasMore` override so Phase-5 sessions never dead-end).

**`useUnlockFlow()`** — Home unlock flow: in-world room/animal prompts, purchases, intro dialogue for new characters.

**`useOnboardingFlow()`** — 11-step onboarding state machine. Fox guides player through home → puzzle → pit → home.

**`useDreadEffects()`** — Crimson pulse overlay + screen shake for dread words (Phase 2+, phase-scaled intensity).

**`useSpeedTimer()`** — Speed variant countdown with `onTimeUp` callback.

**`useAchievementQueue()`** — Achievement checking + toast queue processing.

**`useAutosave()`** — Debounced mid-session puzzle state autosave.

**`useScreenInsets()`** — Safe-area insets via `react-native-safe-area-context` (`SafeAreaProvider` wraps the app root); used by all screens in place of the old hardcoded status-bar padding.

### App Bootstrap & Reliability

- `installGlobalErrorHandler()` (errorReporting.ts) is called at App.tsx module load — global JS errors and unhandled promise rejections are captured into the event log. `ErrorBoundary.componentDidCatch` also forwards React render errors through `reportError()` (source `react_error_boundary`), so both async and render-time failures land in the same pipeline. **Render coverage:** `home` and `puzzle` carry their own inner boundaries; an outer catch-all boundary wraps `renderScreen()` so a render error on the secondary screens (settings/stats/ledger/gallery/pit) returns the player home instead of crashing the whole app. Crash capture is local-only (500-entry buffer).
- Frame-rate monitoring (`performanceMonitor.startFrameMonitoring`) is diagnostic-only — its samples are never read in production — so it is gated behind `__DEV__` (and stopped on unmount) and never runs a perpetual `requestAnimationFrame` loop on a player's device.
- The default export `App` is a bootstrap gate: it installs the cloud provider + auto-restores a fresh install, then awaits `runMigrations()` (dataMigration.ts), `initCosmetics()`, `initHints()` and `loadEntitlements()` **before** mounting `MainApp`, so service caches (including the Patron/ad-free/first-purchase sync cache) always read correct values on first render. `initIAP()`/`initAds()` are **fire-and-forget** — the first frame never waits on billing config or the ads consent → SDK init → preload chain. Renders a quiet dark view while booting; failures log and never block launch.
- Every scheduled notification carries `data.target` (`'daily' | 'home'`); App's `addNotificationResponseReceivedListener` routes taps accordingly, and a **cold-start tap** (notification launched the app — never delivered to the runtime listener) is routed once via `getLastNotificationResponseAsync`, deferred ~1.2s so persistence state hydrates first. Deep links use the same pattern: the Linking subscription mounts once (handler in a ref) and the launch URL is processed exactly once with the same deferral. An AppState listener re-runs the daily launch effects (login reward, streak-freeze check, notification reschedule, stats refresh) when the app foregrounds on a **new local day**.
- Android hardware back: sub-screens navigate home (puzzle screen also resets transient UI state); home lets the OS exit; back is swallowed during onboarding.
- `telemetry.ts`: anonymous-install-id event uploader, fired from the event logger's flush. **Active**: sends to the Supabase `events` table (`supabaseUrl`/`supabaseAnonKey` set in `app.json` → `extra`); falls back to a custom `telemetryEndpoint` if that's set instead. Only anonymous events (install id, platform, app version, event type) are sent.
- FTUE funnel events: `app_open`, `onboarding_step` / `onboarding_complete` (logged from `setOnboardingStep`), `puzzle_started/completed`, `daily_completed`, `notification_permission_result`, `pit_offer` — recorded to the local event log.
- Purchase funnel events (StoreModal + PatronModal): `store_opened` → `purchase_initiated` → `iap_purchase` (success) ↘ `purchase_cancelled` / `purchase_failed`. Each carries `data.productId` + `data.kind` (`amber`/`hints`/`cosmetic`/`patron`/`adfree`), and failures carry `data.reason`. `telemetry.ts` uploads the full `data` payload into the Supabase `events` table (one row per event, with `install_id`/`platform`/`app_version`), so conversion (opened→initiated→purchased) and drop-off are queryable per product. No PII — anonymous install id only.

### Screen Navigation

State-based routing in `App.tsx`. Screen transitions use an opaque overlay pattern: overlay fades IN (120ms), screen swaps while hidden, overlay fades OUT (180ms). Overlay/root `backgroundColor` dynamically matches destination via `getScreenBackgroundColor()`. Instant when `reducedMotion` enabled.

### Victory Flow

1. `isProcessingVictory` lock prevents double-tap; the mid-puzzle autosave is cleared at completion AND at every victory-exit (`startVictoryExitFlow`) so Play can never resume a finished puzzle
2. Record stars, award amber (deferred to harvest), check achievements
3. Choreographed sequence: stars pop in with 200ms stagger → modal scales in; the entrance choreography is **tap-to-skip** (tap anywhere → `skipToEnd`)
4. VictoryModal shows: ritual echo chain, named incantation (Phase 2+), words offered count, amber breakdown (itemized), action buttons
5. Phase transitions are **deferred** — `pendingPhaseTransition` set, VictoryModal shows pit hint, player must visit pit for ward ignition ceremony
6. Post-victory effects: AnimalWhisper (1.2s delay), interjection/home nudge (2.5s delay, 30% chance), ritual micro-event (Phase 2+, 60% trigger)

### Offering Pit Economy (Deferred Amber)

Puzzle completion queues amber in harvest batches instead of crediting directly. Player must offer batches in the Offering Pit to convert to spendable amber.

**Flow**: Puzzle complete → `enqueueHarvestBatch()` → VictoryModal shows "Collect Now" → pit screen → tap floating words to devour → `offerBatch()` credits amber.

**Auto-collect window**: through the first `AUTO_COLLECT_PUZZLE_LIMIT` (8, `gameBalance.ts`) puzzles, amber auto-credits without a pit visit; Fox's `pit_harvest` intro fires when the window closes and manual harvesting begins.

**Pit Features**: Flying mini candy-tile words, tap-to-devour spiral animation, multi-layered pit glow (4 concentric ovals), ward marks (7 circles showing phase progress), ward ignition ceremony for phase transitions, phase-aware background images.

### Phase Transition System

Phase transitions are deferred, not instant. When `phaseProgress` crosses a threshold, `pendingPhaseTransition` is set. Player visits pit → ward marks illuminate → tap to confirm → ignition ceremony → `PhaseTransitionOverlay` cinematic → phase advances.

Ward marks: 7 circles along upper pit arc. Phase-aware colors (turquoise → purple → crimson). Pulsing when transition ready.

## Home Screen & Animal House

### Currency (Amber)
- Base rewards: EASY=8, MEDIUM=10, MEDIUM_PLUS=15, HARD=20
- First-completion bonus (one-time per difficulty): +10/+20/+30/+50
- Star bonuses: 3-star +50%, 2-star +25%
- Challenge mode: 1.5x multiplier
- Streak multiplier: 10% per day (max 100%, requires 2+ day streak)
- Streak continuation: free only when the player played **yesterday** (local day); any longer gap consumes a streak freeze, else the streak resets to 1. Streak freeze: 50 amber, or a free one every 14 days — `checkFreeStreakFreeze()` runs once per session from App's launch effect (granted silently during onboarding; otherwise a one-time Alert tells the player their streak is protected)
- Streak milestones: 3/7/14/21/30 days → 15/30/50/65/100 amber
- Puzzle count milestones (`MILESTONE_BONUSES`, 10/15/25/50…). Includes a **mid-game valley faucet** (135/145/150/165) that keeps amber flowing through the ~130–170 gap where the house is already built but the Phase-4 climax hasn't landed, plus a modest repeating endgame tail (400/450/500/600/750/1000) so the Phase-5 faucet never fully dries up
- Achievement rewards: each of the 40 achievements grants one-time amber (10-150, `rewardAmber` in achievements.ts)
- Daily share bonus: +5 amber for the first completed share each day (`maybeAwardDailyShareBonus`/`recordShareSuccess` in shareResults.ts; hinted on the share-card preview). The VictoryModal Share button opens a `ShareResultModal` preview of a phase-aware `ShareCard`; `shareImage.shareResultImage()` captures a PNG via `react-native-view-shot` + `expo-sharing` (real deps — ships in dev-client/EAS builds) and falls back to the emoji-grid text share in Expo Go. **Daily shares are spoiler-free** (grid only — no word chain/incantation, since the daily is the same puzzle for everyone).
- Daily login reward: rewards *opening the app* (not just solving) — a 7-day escalating cycle (10/15/20/25/30/40/75, Day-7 jackpot) that wraps weekly and resets on a missed day. `claimDailyLoginReward()` in `dailyLoginReward.ts`, claimed once per session from App's launch effect (skipped during onboarding), source `'daily_login'`. A **lapsed-player win-back** adds a one-time `COMEBACK_BONUS_AMBER` (+50, source `'daily_login_comeback'`) when a returning player's gap since the last claim is ≥ `COMEBACK_GAP_DAYS` (3) — never on a first claim — surfaced as a "+welcome-back bonus" line in the modal (`grant.comebackBonus`). The grant is presented in a celebratory `DailyLoginModal` (7-day cycle, current day highlighted, Day-7 jackpot; phase-aware, reduced-motion aware); the first-ever claim shows first-time copy (`isFirstClaim` on `DailyLoginGrant`)

### House Building (Bottom-Up)

Rooms and animals unlock alternately. Starting: empty Cozy Den + free Fox invite. Then: build Kitchen (50 amber) → invite Pangolin (100) → build Study (75) → invite Owl (100) → etc. Costs escalate for rooms (50-400), flat 100 for animals.

Late room unlocks have puzzle-count gates (`minPuzzles` in `UNLOCK_PROGRESSION`, homeWorldData.ts). The animal after each gated room follows immediately (sequential, no separate gate). The gates are **spread across the Phase 1→3 window** so the house — the primary mid-game investment object — keeps growing instead of completing by ~puzzle 85 and leaving the long climb to the Phase 4 climax (~puzzle 155) with no new unlocks. The final room lands just before Phase 3 (threshold 135); after that, room upgrades + quests + the climax carry progression. Two guard tests in `homeWorldData.test.ts` pin this spread (strictly increasing gates; final gate ≥120 and < Phase 3 threshold) so it can't silently regress.
| Gated room (then animal) | Min Puzzles |
|--------|------------|
| Jungle (Sloane the Sloth) | 28 |
| Desert (Fennick the Fennec) | 42 |
| Office (Chill the Capybara) | 60 |
| Burrow (Warren the Wombat) | 82 |
| Garden (Thyme the Rabbit) | 105 |
| Bamboo Attic (Bamboo the Red Panda) | 130 |

**Reserve-ahead (pay now, build at the gate):** the gates are tuned for a baseline earner, so a fast/skilled player (HARD + achievements + quests) reaches a gated room's amber cost well before its level gate and would otherwise sit on idle amber behind a wall. When the next unlock is blocked *only* by its puzzle gate and the player can afford it, they can **Reserve** it — `reserveNextUnlock` spends the amber up front and stores `reservedUnlockId` (on home progress); `claimReservedUnlockIfReady` (called from `HomeScreen.loadAllData`) commits the room for free the moment `puzzlesSolved` crosses `minPuzzles`, firing a celebration. Only the **immediate next** unlock can be reserved (one at a time, `canReserveUnlock`), so a rich player can stay one step ahead but can't pre-buy the whole house. The shop + room-unlock modals show gate/reserved copy via `getReserveGateText`/`getReservedArrivalText` (homeWorldData) — both include the player's current level ("Unlocks at level 42. You're at 35.") so progress-to-arrival is always visible; exact strings pinned in `homeWorldData.test.ts`. Reservation rides in `wordshift_home_progress` (cloud-synced; cleared by Reset All's `clearProgress`). Covered by `homeWorldData.test.ts`.

### Animal Characters (10 total, in unlock order)

| Animal | Name | Surface | Cult Role | Awareness Tier |
|--------|------|---------|-----------|---------------|
| Fox | Ember | Introspective, cozy den | Oracle, reads flames | Vanguard (+1) |
| Pangolin | Panko | Chef, rustic kitchen | Prepares ritual offerings | Middle (=) |
| Owl | Archimedes | Scholar, book-filled study | Lorekeeper, found the text | Vanguard (+1) |
| Axolotl | Axel | Dreamy, aquarium room | Medium, sees it in the water | Middle (=) |
| Capybara | Chill | Calm, office | Administrator, coordinating everything | Middle (=) |
| Fennec Fox | Fennick | Alert listener, desert camp | Sentinel, hears it approaching | Middle (=) |
| Sloth | Sloane | Slow observer, jungle | Has always known | Lagging (-1) |
| Wombat | Warren | Grounded digger, burrow | Built the foundation | Lagging (-1) |
| Rabbit | Thyme | Anxious, garden patio | Anxious because they understand | Lagging (-1) |
| Red Panda | Bamboo | Zen, bamboo attic | Spiritual leader, at peace | Lagging (-1) |

**Awareness tiers**: Vanguard animals are +1 phase ahead, Lagging are -1 behind. `getAnimalPhase(globalPhase, animalType)` applies offset — and **clamps to 5 for ALL animals at global phase 5** (tiers stagger the descent, never the arrival). Narratively the lagging tier lags *publicly, not privately* — Sloane and Bamboo have always known; they simply speak late.

**Canon pronouns** (established by in-dialogue references — keep consistent): Ember she/her, Panko she/her, Archimedes he/him, Axel he/him, Chill he/him, Fennick he/him, Sloane she/her, Warren he/him, Thyme she/her, Bamboo they/them.

### Dialogue System

**670 base dialogues** (67 per animal) + **100 post-revelation** (10 per animal) + **50 Phase-2 exhaustion-pool lines** (`PHASE2_EXTRA_DIALOGUES`, 5 per animal):
- Phase 0: 12, Phase 1: 14, Phase 2: 11 (incl. question-web hook), Phases 3-4: 15 each, Phase 5: 10 each
- Counts are enforced by `configValidation.ts` (`EXPECTED_DIALOGUE_COUNTS_BY_PHASE`, `EXPECTED_PHASE2_EXTRA_PER_ANIMAL`=5) — update it when adding lines

**Session mechanics**: Max dialogues per session phase-aware (3-6). Cooldown: 2-5 puzzles between sessions. Grace period for newly unlocked animals.

**Rich interaction layers**:
- **Cross-animal references**: Phase-scaled frequency (20% → 60%). Vanguard animals get guaranteed first ref at each new phase. Dynamic refs filter by `unlockedAnimals` (multi-name lines must set `mentions` to the *latest-unlocking* animal named — sequential unlocks guarantee the rest); static base lines that name another animal carry `requiresAnimals` tags and are skipped by `resolveDialogueIndex()` until that animal is unlocked; coordinated event lines are name-scanned against `unlockedAnimals` at delivery time (`getCoordinatedEventLine`). All of these invariants are enforced by `dialogueGating.test.ts` — no animal is ever mentioned before the player has met them.
- **Question web** (Phase 2): each animal has one `*_2_w1` hook line pointing the player at another animal's mystery ("Ask Warren what he found"), gated on that animal being unlocked.
- **Trigger word reactions**: Puzzle words (FLAME, VOID, etc.) queue per-animal, consumed on visit.
- **Sacrifice reactions** (Phase 4+): Animals comment on amber offerings.
- **Coordinated events**: At progress milestones (80, 100, 120, 160, 200, 230, 240, 250), all animals share thematically linked dialogue. Thresholds key on **weighted `phaseProgress`** (the same scale phase transitions use; raw `puzzlesSolved` fallback for legacy saves) so the 230/240/250 pre-finale crescendo fires before the finale for accelerated players.
- **Phase-2 exhaustion pool**: once an animal's Phase-2 base block is read out, `PHASE2_EXTRA_DIALOGUES` serve one line per session (`getPhase2PoolLine`/`advancePhase2PoolCursor`, cursors persisted under `wordshift_narrative_delivery`); the home `hasNewDialogue` badge stays honest via `getPhase2PoolCursors` in both homeWorldData and useDialogueFlow.
- **Word threshold dialogues**: Reactions at 100/250/500/750 total words.
- **Catch-up dialogue**: Late-unlocked animals (Phase 2+) get compressed intro arcs, AND their catch-up arc opens with how their recruiter (the previous animal in unlock order) called them to the house, and their `lastDialogueRead` index fast-forwards to the start of their previous phase's block (`fastForwardLateUnlockDialogue` in homeWorldData.ts + `getPhaseStartIndex` in animalDialogueBase.ts) — they arrive with a little personal history to share but never replay bright-days small talk under a dark sky.
- **Tutorial callback**: Fox at Phase 4 recontextualizes innocent tutorial lines as cult recruitment.
- **Narrative seeds**: Phase 0 seed lines → Phase 4 callbacks for all 10 animals — now actually delivered: seed 0 on an animal's 2nd session, seed 1 on its 5th (`getAndMarkNarrativeSeedPage`); Phase 4 delivers one recontextualizing callback per visit, each exactly once and only for seeds the player heard (`getAndMarkNarrativeCallbackPage`). Delivery state lives under `wordshift_narrative_delivery` (cloud-synced; cleared by Reset All).
- **Player choice points** (Phase 3): Each animal offers one binary choice. Both paths converge. Phase 4 delivers a one-time pre-dialogue callback recontextualizing the choice (`getAndMarkPhase4CallbackPage`), and Phase 5 weaves a serene choice callback into each animal's post-revelation cycle (`getPhase5ChoiceCallback`).

### Home Header
**Single-row header + bottom PLAY dock** (second redesign after playtest feedback). Left cluster: amber pill (tap → Store, `numberOfLines={1}`, the only shrinkable item) + streak badge. Right cluster (fixed sizes, hidden during onboarding): Daily Challenge card (📅, gated by `isDailyChallengeUnlocked`) → quest pill (🎯 via `getQuestPillLabel` — count only while quests are in progress, bare icon when everything's claimed; `!` badge keys on claimable amber; opens the quest modal directly) → Journal Hub (📚) → ☰ utility menu (**visible in post-tutorial light mode too** — Settings must always be reachable from home). Fits at 360dp with no wrap. **PLAY is NOT in the header**: it's a bottom-center docked primary button (56dp, safe-area aware, zIndex under header/toasts). **There is NO pit button in the header** — the tappable pit entrance below the house is the only route to the pit (product decision): it gets a warm pulsing `PitAttentionGlow` via HouseWorld's `pitNeedsAttention` prop (pending harvest batches or a pending phase transition; reduced-motion aware), HouseWorld adds in-flow bottom clearance (`PIT_DOCK_CLEARANCE`) so the entrance always clears the dock at rest, and Fox's closing onboarding beat tells the player where the pit lives.

### Journal Hub Modal
📚 icon in header groups Word Ledger, Whisper Gallery, and Weekly Quests. Gated until puzzle 6. Fox introduces with 5-line walkthrough.

## Incantation System (Puzzle-Narrative Connection)

The core system making puzzles feel like rituals:

- **Ritual Word Memory**: Every word formed is recorded (capped at 500). `recordRitualWords()` in `amberCurrency.ts`.
- **Ritual Echo**: VictoryModal shows completed word chain. Styling evolves: bright candy → muted → dark/vertical arrows. Header: "Your Word Journey:" → "The Offering:".
- **Named Incantations** (Phase 2+): Deterministic chain names. Phase 2: "The HEAT Dance". Phase 4: "Offering: VOID to DOOM".
- **Ritual Energy**: Dread word presence scored 0-10. Each point adds 0.1 to `phaseProgress`. High-energy puzzles (7+) trigger micro-events.
- **Word Ledger**: Scrollable screen of all formed words. Dread words highlighted at Phase 2+.
- **Animal Whispers**: 250+ lines (5 per animal per phase). Prefers animals matching puzzle trigger words.
- **Dread Word Visual Feedback** (Phase 2+): Crimson pulse overlay on dread word formation. Phase-scaled opacity (0.10 → 0.25).
- **Arrangement Pattern** (Phase 2+): Visual sigil lines connecting rooms on house exterior.
- **Room Word Echoes** (Phase 2+): Faint puzzle words scattered across room backgrounds.

## Phase-Aware Visual Theming

### PhaseTheme System (`getPhaseTheme(phase)`)
- **Phase 0**: Bright candy purple (#667EEA), white/pink particles, vibrant confetti
- **Phase 1**: Muted lavender (#5B6DB0), amber-toned particles
- **Phase 2**: Cool blue-purple (#4A5580), desaturated particles
- **Phase 3**: Dark indigo (#2E3355), dim muted particles
- **Phase 4**: Near-black (#1A1A2E), crimson/purple accents, dying embers
- **Phase 5**: Muted purple (#252040), ghostly mauve particles, serene resignation

### Letter Tile Animation Evolution
- **Spring params**: Phase 0 bouncy (friction:3/tension:200) → Phase 4 heavy (friction:9/tension:80)
- **Wobble speed**: Phase 0 fast (150/300ms) → Phase 4 ponderous (400/800ms)
- **Trail glow** (Phase 3+): Purple → crimson shadow pulses
- **Resonance glow** (Phase 1+): Dread-tier words show inner glow (gold shimmer → crimson breathing)

### Home Background Colors
Backdrop colors are **sampled from the top pixel row of each sky asset** (seamless "sky extends forever" — re-sample via the scratch `sampleSkyTops` approach if skies regenerate): Phase 0 `#439cf2` (sky_day), 1 `#1583f9` (sky_afternoon), 2 `#684381` (sky_dusk), 3 `#000212` (sky_storm), 4/5 `#050816` (sky_shadow). Kept in sync across THREE places: `PHASE_BG_COLORS` in HouseWorld.tsx, the HomeScreen duplicate map, and `getScreenBackgroundColor('home')` in appStyles.ts.

**Sky geometry (house-below-the-river contract):** all five skies are **941×1972** — the bottom 300 rows are a mirrored meadow extension added so the house can seat below the river (the river never reaches below image row ~1335 in any variant). The sky Image is **bottom-anchored** (`bottom: 0`, height `SKY_BOX_HEIGHT = max(SCREEN_HEIGHT, ceil(SCREEN_WIDTH × 1972/941)+2, 760)`, `resizeMode="cover"`): the box height always beats width-driven cover scaling, so the art's bottom row sits exactly on the container bottom on every device — no fill band can show, and a feature at image row Y sits at a device-independent `(1972−Y)×scale` dp above the container bottom. The foundation top lands at image rows ~1360–1470 (below every river); `skyGeometry.test.ts` pins the asset dims, the anchoring, the margins, and the seat math. `PHASE_GROUND_COLORS` (bottom-row samples, now just 1px seam insurance) must be re-sampled if skies regenerate.

### Phase-Aware Text (`phaseNarrative.ts`)
ALL player-facing text shifts with phase. Key functions:
- `getVictoryTitle()`, `getVictoryFeedback()`, `getMoveMessage()`, `getComboMoveMessage()` (intra-puzzle clean-streak escalation), `getDragMissMessage()` (drag released off-row), `getHintMessage()`
- `getLoadingMessage()`, `getStartMessage()`, `getRulesText()`, `getPhaseChangeNarrative()`
- `getRitualEchoHeader/Footer()`, `getIncantationName()`, `getWordsOfferedText()`
- `getAnimalWhisper()`, `getAnimalInterjection()`, `getRitualMicroEvent()`
- `getInvalidWordMessage()`, `getLockedLetterMessage()`, `getHintFallback()`; `getNoValidMovesMessage()`/`getStuckPanelTitle()` exist but are intentionally unused (stuck detection is silent by product decision)
- `getNotificationPromptText()` — phase-aware copy for the one-time in-app notification pre-permission prompt; `getWinBackMessage(phase, rung)` — lapsed-player win-back ladder copy
- Pit functions: `getPitScreenTitle/Subtitle()`, `getPitButtonLabel()`, `getPitOfferAllLabel()`, etc.
- Ward functions: `getPitWardHint()`, `getPitTransitionReadyText/CeremonyText()`, `getWardMarkColors()`

## Early Darkness Seeds (Phase 0)

Phase 0 contains subtle foreshadowing:
- **Victory Glitch**: ~8% chance of flash text ("WE SEE YOU", "CLOSER"). First victory always glitches.
- **Seed Move Messages**: ~5% chance of "wrong" messages at Phase 0 ("The letters remember.").
- **Onboarding Seeds**: Fox's lines have ominous undertones: "We've been waiting for someone like you.\n...A long time."

## Narrative Micro-Beats

One-time events at specific puzzle counts (`MICRO_BEATS` in `phaseNarrative.ts`, keyed by exact count, each fires once). Early/mid beats (5–130) break the Phase 1-2 retention valley; **mid-game valley beats (140/155/170/185)** keep the narrative pulse alive through the ~130–185 gap (house complete ~130, Phase-4 reveal ~155) — escalating dread that bridges "the house is whole" into the cult reveal and one slog-breaker beyond it. `glitch_title` type briefly shows wrong victory text. `ambient_whisper` type shows atmospheric messages.

## Endgame

**House Completion**: All 10 rooms + animals → ceremony modal + cinematic event.
**Final Puzzle**: After house completion + Phase 4, next puzzle triggers `FINAL_PUZZLE_EVENT`.
**Post-Revelation (Phase 5)**: Next puzzle after final triggers `POST_REVELATION_EVENT` + `markPostRevelation()`, which **pins `currentPhase = 5`** (`updatePhase` respects the pin — `calculatePhase` caps at 4 and must never win; legacy post-revelation saves self-heal to 5 on load). Special victory text, 10 new dialogues per animal.

### The Tending Shrine (Phase 5 endgame loop)

The Phase-5 dead-end (no repeatable amber sink + verbatim-looping dialogue) is **resolved** by the Tending Shrine — a serene, soft-infinite, **cosmetic-only** amber sink (`src/services/tending.ts`).

- **Loop:** at global phase 5 (post-revelation), a ✴ button in the Offering Pit header opens the Tending modal. The player spends amber to "deepen the pattern," advancing a **Tending Level** on an escalating cost curve (`getTendingCost`, `TENDING_*` in `gameBalance.ts`, capped 5,000) with a once-per-local-day discount (`getNextTendingInfo`, via `dateUtils`). The service does **not** spend — the pit calls `spendAmber(cost, 'tending')` then `applyTend(cost)` (mirrors `sacrifice`/`roomUpgrades`). Milestones (5/10/25/50/100) fire a serene ceremony.
- **Honest, refreshing dialogue:** the Phase-5 branch of `useDialogueFlow` (and the home badge in `getAnimalsWithStatus`) now build a shared pool via `dialogue/phase5Pool.ts` (10 base post-rev lines + Phase-3 choice callback + unlocked Tending milestone lines). New lines deliver in order; once caught up, re-reads come in a **deterministic shuffled** order that **reshuffles each cycle** (`selectPhase5Dialogue` — no verbatim loop, no single repeating sequence). A per-animal `caughtUp` pointer (persisted in tending state) makes `hasNewDialogue` **honest**: lit only while undelivered lines remain, re-lit when a Tending milestone unlocks one. The Phase-5 session also never dead-ends at the last regular line (`hasMore` override in `useDialogueFlow`). ~50 milestone lines live in `dialogue/animalDialogueTending.ts` (5/animal), recorded to the Whisper Gallery.
- **Cadence:** a Phase-5-gated `tend_amber` quest type (deliberately net-negative — a sink disguised as a quest) + an extended `MILESTONE_BONUSES` tail past 350.
- **Hygiene:** `wordshift_tending` is in `cloudSave.SYNC_KEYS`; `clearTendingState` is in Settings → Reset All; covered by `tending.test.ts`.
- **Visual deepening:** the world scales with Tending Level via `getTendingIntensity(level)` (sqrt curve, saturates ~level 50). The home Arrangement sigils (`ArrangementConnector` in HouseWorld) brighten/thicken/glow and the Offering Pit raises more rim embers + a warmer inner/core glow as the player tends (reduced-motion/device-tier gated, no new art). `HomeScreen` loads `tendingLevel` and threads it → `HouseWorld`; the pit reads its own `tendingLevel` state.
- **Cosmetic Shop (amber path):** the `theme_ember`/`theme_tide`/`theme_bone` tile themes (Cosmetic Shop) double as the Tending motifs — see the Monetization section.

## Onboarding (11-Step Guided Intro)

Fox guides new players through real screens:
1. `home_empty` → `fox_invited`: See empty den, invite Fox, Fox intro (4 lines)
2. `going_to_puzzle` → `puzzle_tutorial` → `puzzle_complete`: Real EASY puzzle with guided highlights. The FoxGuide bubble gives a **proactive first-action prompt** on load (`Tap the glowing "X" tile to pick it up.`, `App.tsx` ~L2157) — the player is never left guessing what to do first; it then advances to drop guidance, a between-moves reinforcement beat, and tile/slot glow highlights driven by `tutorialGuidance`. While a move is required, the bubble switches to the small `compact` card and **dodges the active board zone** (`tutorialFoxAnchor` in App.tsx: lower-half target rows flip it to the top of the screen; upper-row moves keep it bottom-anchored above UNDO/HINT) so it never covers the row being played
3. `going_to_pit` → `pit_intro` → `pit_offering`: Fox explains the pit, then a standing FoxGuide prompt (`pit_offering_prompt`, no continue button until offered) tells the player to **tap each floating word** to offer it — the step only advances once every word is devoured (no auto-offer; a fallback only arms if the step is reached with nothing offerable). A **stalled-pending safety net** (`PIT_ONBOARDING_STALL_RESCUE_MS` = 30s, reset on every successful devour) auto-offers the remainder and completes the step so a confused player can never soft-lock onboarding
4. `returning_home` → `unlock_explained` → `complete`: Fox explains the cycle

During onboarding: simplified UI (no difficulty selector, stats, NEW button). Backward compatible with legacy tutorial flag. Persisted via `wordshift_onboarding_step`. **Resume resilience:** transient/puzzle steps (`going_to_puzzle`/`puzzle_tutorial`/`puzzle_complete`/`going_to_pit`/`returning_home`) only exist for a `setTimeout` window and have no owning screen on relaunch; `useOnboardingFlow.normalizeResumeStep` snaps them forward to a stable target on resume, and `App.tsx`'s resume effect routes the puzzle step back to a freshly-initialized guided tutorial board — so a kill mid-onboarding can never strand a new player on a dead home screen. The puzzle-screen FoxGuide also exposes a skip button (`handleSkipOnboarding`) — **skip is a clean exit**: it cancels pending step timers, persists `complete` (which atomically collapses every guidance surface — FoxGuide, `tutorialGuidance`, dashed row overlays), abandons the guided board (`clearBoard` + `clearPuzzleState`), and lands on the full home screen. FoxGuide renders nothing when it has no text (no empty-card state), and its cards are the light lavender style at every anchor (no dark variant).

## Fox Post-Victory Intros

One-time Fox sequences triggered after victories in App.tsx:
- `variant_unlock`: New variant unlocked
- `home_tools`: Home screen features
- `setup_selector`: Puzzle setup selector
- `pit_harvest`: Pit harvest system (fires at puzzle 8, when the auto-collect window closes)
- `challenge_intro`: Challenge Mode (after 15 puzzles)
- `journal_intro`: Journal hub (from HomeScreen after puzzle 6)
- `daily_challenge_intro`: Daily Challenge on unlock

## Key Services Detail

### Puzzle Generation (`localGenerator.ts`)

Two-track generator with pre-computed indices:

- **Adjacency index**: `getInsertionIndex(wordLength)` — O(1) lookup for letter insertion candidates. Cached per word length.
- **Removal index**: `getRemovalIndex(wordLength)` — inverse mapping for reverse chain generation.
- **Standard**: Forward DFS, 2.5s timeout, 3 candidates, score ≥ 45. Anti-boring detection (penalizes S→plural, ED→past tense, etc.).
- **Reverse**: `generateReverseChain()` — random sampling + `isReverseSolvable()` validation. 25s timeout. `relaxBoring` flag widens pool.
- **Double shift**: `generateDoubleShiftPuzzle()` — 2-letter moves, `getDoubleInsertionIndex()` for pair lookups. Position-based locking via `receivedPositions`.
- **Phase-tiered dread words**: 615 words in 4 tiers. Scoring: `phase² × 2.5 × proximity_multiplier`.
- **Quality scoring**: Position preference (middle > edge), semantic journey bonus, word freshness, dread tier proximity.

### Amber Currency (`amberCurrency.ts`)

Core economy manager. Key functions:
- `awardPuzzleAmber()` — Returns balance/phase/streak + `phaseTransitionPending`. Deferred: sets `pendingPhaseTransition` instead of bumping phase.
- `confirmPhaseTransition()` — Bumps phase from pending, clears fraction. Called from pit ceremony.
- `applyVariantAmberBonus()` — Variant bonus with anti-farm decay (consecutive + weekly).
- `awardBonusAmber()` — General-purpose credit (streak milestones, etc.).
- `recordRitualWords()` — Record words, queue triggers, accumulate ritual energy.
- `consumeTriggerWords(animalType)` — Per-animal trigger word filtering.
- Phase tracking: `getFullProgress()`, `getPendingPhaseTransition()`, `getPhaseProgressFraction()`.
- Many one-time flags: `hasSeenChallengeIntro`, `hasSeenDailyChallengeIntro`, `hasSeenJournalIntro`, etc.

### Weekly Quests (`weeklyQuests.ts`)

Two rotating quest tiers (seeded deterministic, local-day bucketing): **5 daily** quests + **5 weekly** quests (`loadWeeklyQuests` returns a `CombinedQuestState`). Types: solve_count, solve_difficulty, earn_stars, daily_complete, no_hints, challenge_mode, earn_amber, visit_animals, streak_days, sacrifice_amber (Phase 4+ only), daily_streak, tend_amber (Phase 5+ only). Rewards: 30-140 amber base, phase-scaled (1.0x → 2.0x). The sink quests (`sacrifice_amber`/`tend_amber`) are strictly **net-negative at every phase** they can appear (reward < required spend even after phase scaling) — pinned by an economy guard test in `weeklyQuests.test.ts`.

### Whisper Gallery (`whisperGallery.ts`)
Collectible archive of all whispers, dialogue snippets, and narrative moments. Cap: 500 entries. Phase-aware titles. Entries are labeled with **poetic era names** (`getPhaseEraName` delegates to the canonical `PHASE_DESCRIPTIONS` titles in `types/homeWorld.ts`: Bright Days / Curious Thoughts / Deeper Questions / Growing Shadows / The Horizon / Terrible Peace) — never "Phase N" (narrative rule 7).

### Sacrifice Mechanic (`sacrifice.ts`)
Phase 4+: voluntary amber destruction. No gameplay benefit. Phase-aware responses. Milestone messages at 1/5/10/25/50/100.

### Room Upgrades (`roomUpgrades.ts`)
Phase 2+: one cosmetic enhancement per room (tier 1, 10 total, 75-150 amber). Phase-aware descriptions. **Tier-2 "deepenings"** (`ROOM_DEEPENINGS`, 10 total, 175-300 amber) open at **Phase 2** — the same gate as the tier-1 decorations they build on — and require the room's tier-1 decoration first (`purchaseRoomDeepening` / `areDeepeningsAvailable` / `getDeepenedRooms`, stored in a separate `deepened` map under the same `wordshift_room_upgrades` key). Opening both tiers in one phase turns two unlock cliffs into one continuous sink (decorate, then deepen) across the **mid-game spend valley (~puzzle 65–135)**, where the house has finished unlocking and amber piles up; deepenings never disappear, so slower players still find them later. HomeScreen "The House Deepens" section. Dread-leaning copy (the rooms turn unsettling, not cozy). Cleared in Reset All; covered by `roomUpgrades.test.ts`.

### Notifications (`notifications.ts`)
Local push: daily reminders (phase-aware morning messages, scheduled as a ladder of non-repeating dated one-shots `DAILY_REMINDER_LOOKAHEAD_DAYS` (7) ahead, skipping today once the player has played — so a daily player never gets a redundant "puzzle is ready" ping), streak-at-risk reminders (7pm the next missed day when streak ≥ 2, copy via `getStreakRiskMessage(phase, streak)`), an **escalating win-back ladder** for lapsed players (6pm one-shots at +1/+3/+7 days, `WIN_BACK_RUNG_OFFSETS`; rung 1 shifts to the day after the streak-risk ping for streak holders; copy escalates via `getWinBackMessage(phase, rung)` in phaseNarrative), and a **weekly-quest-expiry** reminder (Sunday 6pm before the local-Monday quest reset, `getQuestExpiryMessage(phase)`, only when the player has weekly-quest progress in flight or unclaimed reward). Every notification carries `data.target` (`'daily' | 'home'`) so App can route the tap. Each app session reschedules everything; the streak/win-back/quest pings only fire on genuinely missed/relevant days. Phase 5 has distinct serene tone.

**Permission flow**: `scheduleAllNotifications()` never prompts — it only schedules when permission is already granted. The OS dialog is triggered solely by `requestNotificationPermission()`, reached two ways: the one-time contextual prompt after the player's 3rd+ victory (App.tsx `maybePromptForNotifications`, copy from `getNotificationPromptText()`), or the Daily Reminders toggle in Settings. The prompt result is logged as a `notification_permission_result` event.

### Cloud Save (`cloudSave.ts`)
Client-side sync layer with a pluggable `CloudProvider` interface. A live Supabase provider activates when `supabaseUrl`/`supabaseAnonKey` are set in `app.json` → `extra` (**now configured**); it also powers the daily leaderboard + aggregate social proof. Falls back to `NoOpProvider` (no network I/O) when unconfigured. `collectLocalSaveData()` / `restoreFromCloudData()`. `SYNC_KEYS` lists the **actual** AsyncStorage keys each service writes (e.g. `wordshift_home_progress`, not `wordshift_progress`; includes `wordshift_daily_login`, `wordshift_cosmetics`, `wordshift_narrative_delivery`) — keep it in sync when adding a persisted key; device-specific keys (`wordshift_device_id`/`install_id`/`wordshift_ad_pacing`), the local analytics buffer (`wordshift_event_log`), store-authoritative entitlements (`wordshift_entitlements`), and the sync-status meta key are intentionally excluded.

**Backend security is RPC-only with RLS** (capability model: knowing a row's unguessable owner/install id *is* the capability). The anon key has zero direct table access — grants revoked, RLS deny-by-default; saves, leaderboard, and social proof all go through SECURITY DEFINER RPCs (`sbRpc` in `supabaseClient.ts`, which exposes **no** select helper). Single exception: the telemetry `events` table is INSERT-only for anon. `docs/supabase/security_setup.sql` must be run in the Supabase SQL editor to apply this.

## Asset System

### Current State
- **Store assets are real**: 1024×1024 icon.png, adaptive-icon.png, splash.png, and the Android notification-icon.png are generated by `scripts/tools/generateAppIcons.mjs` / `generateNotificationIcon.mjs` (`npm run generate:assets`)
- **SFX pack**: 14 WAV chimes in `assets/sounds/`, generated by `scripts/tools/generateSounds.mjs`
- **All 10 character sprites** wired up: idle.png, talk.png, robed.png per animal. **Intentional design — not a defect:** `axolotl/talk.png` is byte-identical to `axolotl/idle.png` *on purpose* — Axel (the axolotl) wears a scuba mask, so he can't visibly talk; his mouth never moves, hence no distinct talk frame. Do NOT "fix" this by generating a separate talk sprite. The reduced-motion-safe talk transform on the dialogue portrait (HomeScreen `dialogueSpriteTalking`) still gives Axel subtle motion while speaking, consistent with every other animal.
- **All 10 room backgrounds** wired up in RoomView.tsx
- **Environment**: sky_day/afternoon/dusk/storm/shadow.png (phase-aware: 0=day, 1=afternoon, 2=dusk, 3=storm, 4+=shadow — see `HouseWorld.tsx`), pitt_day/dusk/night.png (pit backgrounds). Oversized backgrounds were downscaled for mobile via `scripts/tools/downscaleImages.mjs`; skies are 941×1972 (bottom 300 rows = mirrored meadow extension for the house-below-the-river seat — see Home Background Colors)
- **World art (wired into HouseWorld)**: `roof.png` (792×283, chimney + attic window baked in; smoke puffs animate above the chimney at ~25% from the left), `foundation.png` (792×118, stone courses + timber sill), `wall.png` (seamless 128×128 timber tile repeated behind the rooms — replaced the flat wall color that read as a sticker), and the tappable `pit_entrance.png` (480×421, grassy mound + stone-rimmed glowing mouth + path that tucks under the foundation via `PIT_MARGIN_TOP`) are **AI-generated detailed pixel art matching the room interiors** — sources live in `assets/raw/` and are processed (background key → crop → downscale) by `scripts/tools/processRawWorldArt.mjs`; their aspect constants live in HouseWorld.tsx and the seat math in `skyGeometry.test.ts` (update both if raws change). A static 3-pill contact shadow under the foundation seats the house on the meadow (phase-softened). `cloud_1/2.png` remain procedural (`scripts/tools/generatePixelWorld.mjs`, now clouds/tree/ground only). `ground.png`/`tree.png` exist but are intentionally NOT rendered: the sky backgrounds are full landscapes with their own grass and trees. The soft `shadow_figure.png` (the entity) is deliberately NOT pixel art — it should read as otherworldly against the pixel world (`generateWorldArt.mjs`)
- **UI sprites**: `assets/ui/` star_filled/star_empty/amber/flame/journal/pit.png + hint/undo/restart.png replace the ⭐ 💎 🔥 📚 ⭕ emoji in VictoryModal, the home header, stats, and unlock prompts (`scripts/tools/generateUiIcons.mjs`); `ActionButton` maps its 💡/↩/🔄 glyphs to the generated sprites. `<AmberInline />` embeds the amber gem inside Text runs. Icon art is tuned bright/high-contrast for the translucent dark header pills. Remaining emoji (🏆 📋 ✨) are intentional accents with accessibility labels
- **Store kit**: `docs/feature-graphic.png` (1024×500) + `docs/STORE_LISTING.md` (descriptions, keywords, age rating, screenshot shot list)

### Asset Directories
```
mobile/assets/
├── characters/{fox,pangolin,owl,axolotl,capybara,sloth,fennec_fox,wombat,rabbit,red_panda}/
│   └── idle.png, talk.png, robed.png
├── rooms/{cozy_den,kitchen,study,aquarium,jungle,desert,office,burrow,garden,bamboo}.png
├── world art (roof/foundation/clouds/pit_entrance/shadow_figure) rendered in HouseWorld
└── environment/     # sky_day/afternoon/dusk/storm/shadow.png, pitt_day/dusk/night.png
```

### Phase 4 Visual Changes
- Use `robed.png` for all animals
- Sky: `sky_shadow.png`
- Puzzle background: near-black (#1A1A2E) with crimson embers
- Confetti: dark muted colors
- All text: nihilistic/ritual tone

## Coding Conventions

- TypeScript with explicit types for props and state
- React Native StyleSheet (not inline styles)
- Functional components with hooks
- Import colors from `CandyColors` in `theme/colors.ts`; use `getPhaseTheme(phase)` for phase-aware
- **All player-facing text through `phaseNarrative.ts`** — never hardcode strings
- **Animation cleanup**: Store animation return values, `.stop()` in useEffect cleanup
- **Native driver preferred**: `useNativeDriver: true`; use opacity overlays instead of JS-bridge backgroundColor. As of the ship-readiness pass there are **zero `useNativeDriver: false` animations** in src/components — glows are pre-styled overlay Views with native-driven opacity
- **Device tier gating**: `shouldSimplifyAnimations()` to skip decorative animations on low-end
- **React.memo** on expensive pure components (e.g., Row)
- **MoveDelta pattern**: Undo uses lightweight deltas, not deep clones
- **Schema versioning**: `dataMigration.ts` for storage format changes
- **Concurrent spend guard**: `spendInProgress` flag in amberCurrency
- AsyncStorage with in-memory cache pattern (load → cache → return cached)
- TS strict: module-level nullable caches need local variable assignment
- `reducedMotion`: All animations must check and skip/set-instantly
- **Narrative consistency**: Any new feature must respect current phase. Cheerful-only-at-Phase-0.
- **No over-engineering**: Only make directly requested changes. Don't add features, refactoring, or docstrings beyond what's asked.
- Accessibility: `accessibilityLabel` and `accessibilityRole` on interactive elements; never convey information by color alone (see the ✓/✗ slot-preview prefixes); dark-phase text colors must hold ≥4.5:1 contrast against their backgrounds
- **No em dashes (—/–) in player-facing text** — dialogue, UI strings, alerts, accessibility labels. Use `...` for dramatic pauses, commas for asides, or split sentences (`noEmDashes.test.ts` guards this at runtime over the real content pools)
- Store/legal: privacy policy, terms, and data-deletion pages are **live and publicly accessible** via GitHub Pages (served from `docs/`). All three URLs are wired into `src/constants/links.ts` and surfaced in Settings → About (Privacy Policy / Terms of Service / Data Deletion rows); store-listing metadata in `docs/STORE_LISTING.md` points at the same live URLs

## Testing Patterns

- Shared AsyncStorage mock: `createMockAsyncStorage()` from `helpers/mockAsyncStorage.ts`
- `beforeEach`: call both `AsyncStorage.clear()` AND service-specific clear functions
- Puzzle generator tests mock `amberCurrency.getCurrentPhase` + all `wordHistory` functions
- Hook tests use manual React mock with stateStore Map + index rewind
- `DialoguePhase` is `0|1|2|3|4|5` literal — mock return values need `as number` cast
- Component tests use `jest.mock('react-native', ...)` stubs (Node env, no renderer)
- Performance monitor tests mock `requestAnimationFrame`, `cancelAnimationFrame`, `performance.now`
- Date-sensitive tests must build dates from local components (`new Date(2026, 1, 9)`), never ISO strings (`new Date('2026-02-09')` parses as UTC midnight → previous local day in timezones behind UTC)
- **Day-bucketing must use `services/dateUtils.ts`** (`getLocalDateString`, `getLocalDateStringDaysAgo`, `parseLocalDate`, `daysAgoLocal`) — these derive the calendar day from LOCAL components. Never reintroduce `toISOString().split('T')[0]` for streaks, daily challenge, or "played today" logic (it buckets by UTC and corrupts streaks for sub-UTC timezones). `amberCurrency.ts`, `dailyChallenge.ts`, and `HomeScreen` streak-at-risk all route through this helper.
- Tests whose code path calls `logEvent` should `jest.mock('../services/eventLogger')` so the 5s debounced flush timer can't fire after teardown
- Phase-threshold tests must use `PHASE_THRESHOLDS` values from `constants/gameBalance.ts` ([0, 20, 65, 150, 235]) — don't hardcode stale balance numbers

## Common Tasks

### Adding new word categories
Edit `SEMANTIC_CLUSTERS` in `localGenerator.ts`

### Adjusting puzzle difficulty
Modify scoring weights in `scorePuzzleChain()` or `MIN_ACCEPTABLE_SCORE`

### Adjusting word diversity/cooldowns
Edit constants in `wordHistory.ts`: `HARD_COOLDOWN` (25), `SOFT_COOLDOWN` (60), `MAX_HISTORY_SIZE` (150). Bank selection also applies a hub-word penalty (`getBankWordFrequency` in `puzzleBank.ts`) against the generator's over-used words, and picks randomly from the top 10 scored candidates.

### Adjusting star ratings
Edit `calculateStars()` in `starRating.ts`

### UI adjustments
- Tile sizes: `LetterTile.tsx` (standard 52x64, compact 42x52 when wordLength ≥ 6)
- Row layout/arc: constants in `Row.tsx` (ARC_ROTATION, ARC_LIFT, SLOT_WIDTH, SLOT_HEIGHT)
- Colors: `theme/colors.ts`
- Room dimensions: `ROOM_WIDTH` (250), `ROOM_HEIGHT` (~123) in `HouseWorld.tsx`
- Safe-area padding: `useScreenInsets()` (`src/hooks/useScreenInsets.ts`, SafeAreaProvider-backed) — never reintroduce the old hardcoded `StatusBar.currentHeight` pattern (one pre-inset estimate survives only for the pit's module-level FLOAT_ZONE spawn math)

### Adding achievements
1. Add to `ACHIEVEMENTS` array in `achievements.ts` with `id`, `title`, `description`, `icon`, `category`, `rewardAmber`, `check`
2. `check` receives `AchievementCheckState`; `rewardAmber` is credited once via `awardBonusAmber` when the achievement unlocks (shown in AchievementToast)
3. Add test in `achievements.test.ts`

### Adding animals
1. Add type to `AnimalType` in `types/homeWorld.ts`
2. Add dialogues in `animalDialogue.ts` (all 5 phases)
3. Add animal/room in `homeWorldData.ts`
4. Add to `UNLOCK_PROGRESSION`

### Adjusting amber rewards
Edit `AMBER_REWARDS` in `types/homeWorld.ts`

### Adjusting dialogue phases
Edit `PHASE_THRESHOLDS` in `constants/gameBalance.ts`. `MIN_PUZZLES_FOR_PHASE` sets minimum real puzzles per phase.

### Adjusting dialogue sessions
Edit `DIALOGUE_SESSION_CONFIG` in `types/homeWorld.ts`:
- `getDialoguesPerSession(phase)` — Phase 0-1=3, Phase 2-3=5, Phase 4=6, Phase 5=4
- `getPuzzlesBetweenSessions(phase)` — Phase 0=2, Phase 1=3, Phase 2=4, Phase 3-4=5

### Adding sound effects
1. Add file to `assets/sounds/` (or regenerate the synth pack: `node scripts/tools/generateSounds.mjs`)
2. Register in `SOUND_SOURCES` in `audio.ts` (add to `PRELOAD_SOUND_NAMES` if hot-path)
3. Call from relevant component (auto-checks `settings.soundEnabled`)

### Regenerating puzzle banks
1. `npm run generate:puzzles` (long-running jest generators in `scripts/`)
2. **Always** run `node scripts/tools/purgeProfanity.mjs` afterwards — the generator does not filter offensive words; the purge script removes them from both dictionaries and drops affected bank puzzles
3. The blocklist lives in `scripts/tools/purgeProfanity.mjs` (`BLOCKED_WORDS`)

## Narrative Acceleration

Engaged players can reach Phase 4 in ~120-150 puzzles instead of 250:
- High three-star rate: 1.5x phase progress
- Long streaks (7+ days): 1.25x
- Hard difficulty: 1.5x
- Challenge mode: 2.0x

## Known Constraints

- `app.json` → `android.blockedPermissions` strips `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` (expo-audio injects them; the game plays foreground SFX only, and shipping the typed FGS permission triggers Play's Android-14 foreground-service declaration for a capability the app doesn't have). Do NOT remove the block unless background audio actually ships
- Standard/reverse/double_shift at ALL difficulties from pre-generated banks (lazy-loaded); speed generates on-device
- On-device timeout: 2.5s standard, 25s reverse, 5s double-shift. Wrapper: 4s/30s
- Fallback pool: 15 pre-validated puzzles across 3 tiers
- Dictionary: common English only (no proper nouns), 3-7 letters
- Arc layout uses `overflow: visible`
- Dialogue sessions persist across restarts
- House view: `react-native-gesture-handler` (vertical pan only)
- TouchableOpacity in home components from `react-native-gesture-handler`; HomeScreen modals use react-native's
- Daily challenge uses Math.random override (concurrency-guarded)
- Victory flow: `isProcessingVictory` lock
- AnimatedBackground: opacity overlay (native driver compatible)
- Device tier detection is heuristic (PixelRatio + screen size)

## Monetization

**Core principle:** players pay for *expression* and *convenience*, never for *narrative progression*. The "never" list below is a hard design constraint.

**Cosmetic Shop (amber):** `components/shop/ShopScreen.tsx` (`currentScreen: 'shop'`, reached from the **home utility menu** ☰) buys & equips **tile themes** and **confetti palettes** with amber, in two sections. Tile themes live in `theme/colors.ts` `TILE_THEMES` (six amber-priced sets, 300-1,000: Ember-warm/Deep-tide/Bone-quiet — these double as the Phase-5 Tending motifs — plus `theme_verdant`/`theme_static`/`theme_sovereign` at 650/800/1000, + a Patron-entitlement gold set); the equipped one is pushed into `colors.ts` via `setEquippedTileTheme()` (registration pattern → no import cycle) and resolved synchronously inside `getTileColor()`, so it stays phase-aware (phase overlays/glow apply on top). Confetti palettes live in `CONFETTI_THEMES` (five amber-priced, 250-550, incl. `confetti_verdant`/`confetti_sovereign`); an equipped one overrides the phase-default confetti in `Confetti.tsx` (via `getEquippedSync('confetti')`), with the phase-aware default when none is equipped. The amber catalog totals ~5,600. Amber purchase routes through `spendAmber(cost, 'cosmetic_<id>')` → `recordAmberCosmeticPurchase` (auto-equips); a "Need more amber?" row opens the Store (`onOpenStore`).

**Services (providers WIRED — live when configured, NoOp fallback):** As of the launch-prep pass, real provider adapters are registered in `App.tsx` and keys live in `app.json` → `expo.extra`, so the app ships with live IAP + ads when those keys are present; the NoOp providers remain the automatic fallback in Expo Go / when a key or SDK is absent.
- `services/entitlements.ts` — source of truth for owned items / Patron status (`isPatron()`/`isPatronSync()`, `grantEntitlements`, `setEntitlements`, `clearEntitlements`). AsyncStorage-backed, native-free.
- `services/iap.ts` — `BillingProvider` seam; holds `PRODUCT_IDS`/`purchaseProduct`/`restorePurchases`/`entitlementsForProduct` as pure code. **`services/providers/revenueCatBilling.ts`** (`createRevenueCatBillingProvider`) is the live RevenueCat adapter, registered via `setBillingProvider()` before `initIAP()`. Reads `revenueCatIosKey`/`revenueCatAndroidKey` from `extra`; products map to the `patron`/`adfree` entitlements.
- `services/ads.ts` — `AdProvider` seam + ad policy as pure/testable code (`interstitialFrequency`, `shouldShowInterstitial`, rewarded daily cap, Patron suppression). **`services/providers/googleAdMobAds.ts`** (`createAdMobAdProvider`) is the live AdMob adapter, registered via `setAdProvider()` before `initAds()`; reads `admobInterstitialId*`/`admobRewardedId*` from `extra`. **GDPR/UMP consent is resolved strictly BEFORE SDK init and any preload** (single-flight gate; `initialize()` resolves immediately while the consent → init → preload chain runs in the background, so cold start never blocks on a consent form). `ads.ts` exposes `privacyOptionsRequired()`/`showPrivacyOptions()` — Settings → ABOUT shows a "Privacy Options" row only when required. AdMob app id is in the `react-native-google-mobile-ads` config plugin in `app.json`. **Interstitials are wired:** `App.tsx` calls `maybeShowVictoryInterstitial()` on the normal victory exits — next-level, home, AND the pit route (`handleNextLevel`/`handleReturnHome`/`handleGoToPit`) — exempting onboarding, the daily, pending phase transitions, queued final/post-revelation cinematics, and Phase 5 — so ads never interrupt a ceremony (incl. ward ignition) or the serene endgame. `VictoryData.puzzlesSolved` feeds the cadence.
- **Restore Purchases** lives in **Settings → PURCHASES** (`restorePurchases()` from `iap.ts`) in addition to the Patron modal, satisfying store-policy's accessible-restore requirement. `app.json` adds `NSUserTrackingUsageDescription` for iOS ATT. **iOS monetization keys are still empty** (`revenueCatIosKey`/`admobInterstitialIdIos`/`admobRewardedIdIos` in `extra`, no iOS AdMob app id) — iOS falls back to NoOp until those are filled; Android ships fully monetized.
- `services/cosmetics.ts` — owned/equipped cosmetic state (amber-bought local + entitlement-granted). `ownsCosmetic`, `recordAmberCosmeticPurchase`, `equipCosmetic`/`unequipCosmetic`, `getEquipped`/`getEquippedSync`, `initCosmetics` (App bootstrap).
- Both adapters load their native module via a guarded dynamic `require` and degrade to NoOp when absent, so the app still runs in Expo Go and all logic is unit-tested (`__tests__/monetization.test.ts`, `__tests__/providerAdapters.test.ts`). Native modules required for a real build: `react-native-purchases`, `react-native-google-mobile-ads`, `expo-tracking-transparency`.

**Patron amber bonus:** `amberCurrency.awardPuzzleAmber()` adds `PATRON_AMBER_BONUS` (+2, returned as `patronBonus`) when the Patron entitlement is set — additive to the REWARD only, **never** phase progress. `wordshift_cosmetics` is in `cloudSave.SYNC_KEYS`; `wordshift_entitlements` (store-authoritative) and `wordshift_ad_pacing` (device-specific) are excluded; cosmetic/entitlement keys are cleared in Settings → Reset All.

**The Store (consumable packs + hint economy + starter pack + cosmetic bundle):** `components/monetization/StoreModal.tsx`, opened from the **home utility menu** (🛒 Store), the **home header amber pill**, and the cosmetic shop's "Need more amber?" row (`onOpenStore` props). Sells four things:
- **Amber packs** (consumable IAP — `AMBER_SMALL/MEDIUM/LARGE`, amounts in `gameBalance.AMBER_PACK_GRANTS`): credit the **REWARD** balance via `awardBonusAmber(amount, 'iap_<sku>')`. The FIRST amber pack a player ever buys grants `FIRST_PURCHASE_AMBER_MULTIPLIER` (2x) its amount — one-time, consumed on first success, tracked alongside entitlements. Like every amber source they **never** feed phase progress, so pacing is identical for paying and free players — amber buys convenience for the cosmetic shop + amber sinks, not the story.
- **Keeper's Welcome** starter pack (one-time bundle — `STARTER_PACK` = `com.wordshift.starter`, `purchaseStarterPack()` in iap.ts): `STARTER_PACK_GRANTS` = 400 amber + 5 hints. Gated by the `starter_pack` entitlement, so it can be bought exactly once (repurchase is refused before hitting the store).
- **Hint packs** (consumable IAP — `HINTS_SMALL/LARGE`, `gameBalance.HINT_PACK_GRANTS`). Hints are now a **consumable resource** (`services/hints.ts`, key `wordshift_hints`): a player is seeded `STARTING_FREE_HINTS` once, earns more from the opt-in `hint_recovery` rewarded ad (`REWARDED_HINT_GRANT`), or buys packs. `usePuzzleGame.handleHint` checks `hasHintSync()` and spends one via `consumeHintSync()` only when help is actually delivered; an empty balance raises `outOfHintsSignal` → App offers a rewarded clip / the store (`handleOutOfHints`). Spending a hint **still costs stars** (star penalty unchanged), so hints are convenience, never progression. The HINT button shows the live count (`HINT · N`). `wordshift_hints` is in `cloudSave.SYNC_KEYS` (purchasable → must follow the player); cleared in Settings → Reset All.
- **The Keeper's Collection** (non-consumable cosmetic bundle — `COSMETIC_BUNDLE` → `ENTITLEMENTS.COSMETIC_BUNDLE`): grants the exclusive `theme_eclipse` tile set + `confetti_eclipse` (both `kind:'entitlement'` in `cosmetics.ts`, palettes in `colors.ts`). Disjoint from the amber catalog (cash never buys an amber-priced cosmetic).
- `services/iap.ts` adds `CONSUMABLE_PRODUCTS`/`consumableReward()`/`purchaseConsumable()` — the consumable path grants **no** entitlement (repeatable) and returns the reward for the caller to apply (StoreModal), mirroring the codebase's "caller orchestrates the grant" convention. `iap_purchase` events are logged.

**Monetization soft prompts (`services/monetizationPrompts.ts`, key `wordshift_monet_prompts`):** two one-time, frequency-capped nudges, both suppressed for owners. A **Patron nudge** (`consumePatronNudge`, after `PATRON_NUDGE_MIN_PUZZLES`) fires on a victory exit (`maybeShowPatronNudge` in `handleNextLevel`/`handleReturnHome`) and opens `PatronModal`. A **Remove-Ads nudge** (`consumeRemoveAdsNudge`, after `REMOVE_ADS_NUDGE_AFTER_INTERSTITIALS` interstitials actually seen — counted via `recordInterstitialSeen` once an interstitial shows) offers a gentle Alert → `PatronModal`. Decisions are pure/exported (`shouldShowPatronNudge`/`shouldShowRemoveAdsNudge`); state is device-local UX pacing (excluded from cloud sync, like ad pacing) and cleared in Reset All. Covered by `__tests__/{hints,monetizationStore,monetizationPrompts}.test.ts`.

**Never:** energy/lives, loot boxes, pay-to-skip-phases, forced ads, paywalled animals. (Amber/hint packs **are** sold as of the revenue pass, but stay convenience-only: amber never feeds phase progress and hints never bypass the star cost — the *progression* line is the hard constraint, not the currency sale.)
