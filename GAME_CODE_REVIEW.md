# WordShift Game Code Review

**Project:** WordShift — A word puzzle game with existential animal companions
**Stack:** React Native / Expo SDK 54 / TypeScript
**Codebase:** ~7,700 LOC across 20 source files + 87KB dialogue corpus
**Platform:** iOS & Android via Expo Go

---

## Overall Rating: B+

WordShift is a well-executed indie puzzle game with a genuinely original narrative hook. The core puzzle mechanic is clever, the generation system is sophisticated, and the existential dread progression gives the game an identity that virtually no other word puzzle has. The code is functional and demonstrates care in the areas that matter most to players — puzzle quality, visual polish, and pacing.

It is not production-ready. Several structural issues need addressing before a public release.

---

## What Works

### The Puzzle Engine Is the Real Product

`localGenerator.ts` is where the game's quality lives. The 5-dimension scoring system (word interest, move quality, semantic distance, journey, position variety) combined with anti-boring detection and history-aware freshness produces puzzles that feel hand-crafted. The multi-candidate approach (generate 3, pick the best) is the right strategy. The timeout protection with fallback puzzles means the game never hangs.

The word history system (`wordHistory.ts`) with its hard/soft cooldown is a subtle but important feature — it prevents the "same words again" fatigue that plagues procedural word games.

### The Narrative Design Is Distinctive

520 dialogue lines across 10 animals with 5 phases of tonal progression is a significant content investment. Each animal has a distinct personality (the owl becomes an intellectual crisis, the sloth has slow-motion dread, the capybara's calm facade cracks). The puzzle-based cooldown system (5 puzzles between sessions, 6 dialogues per session) paces this content so players encounter it gradually over weeks of play rather than blitzing through it.

The vague cooldown messaging is a good design choice — telling players "Ember needs some quiet time" rather than "Complete 3 more puzzles" preserves the fiction.

### The Economy Creates Forward Momentum

The amber system has good bones. The escalating unlock curve (free -> 30 -> 25 -> 50 -> ... -> 475) creates a sense of growing investment. The room-then-animal alternation means every unlock either gives you a new visual space or a new character to talk to — both feel rewarding.

Star bonuses (+50%/+25%) and streak multipliers reward consistent, skilled play without punishing casual players. The milestone system adds surprise moments ("First 10 puzzles!" bonus).

**Economy Math Check:** At MEDIUM difficulty (10 amber base), with 3-star performance (+50% = 15 amber), the Kitchen (2nd unlock at 30 amber) takes ~2 perfect puzzles. Late-game unlocks at 400-475 amber require 27-32 puzzles each. Whether this curve is correct depends on retention goals, but the acceleration feels intentional.

### Offline-First Is the Right Call

Zero network dependency. No API calls, no server costs, no loading spinners waiting for remote data. The game works in airplane mode, in subway tunnels, anywhere. For a casual puzzle game, this is the correct architecture. AsyncStorage handles all persistence.

### Visual Consistency

The `CandyColors` theme system is applied consistently across the entire app. The 3D bevel effects, shine overlays, spring animations on buttons, and the arc layout on DROP rows all contribute to a cohesive "candy" feel. The AnimalSprite animations (breathing, walking, bouncing, emotion bubbles, sleeping Z's) give the characters life.

---

## What Needs Work

### Priority 1: Ship-Blocking Issues

**Remove the DEV button.** `HomeScreen.tsx:793-798` renders a red "DEV" button that grants 5000 amber and clears all cooldowns. This is rendered unconditionally with no environment check. This must be behind `__DEV__` flag or removed before any public build.

**Fix the TouchableOpacity import inconsistency.** `RoomView.tsx` and `HouseWorld.tsx` import from `react-native-gesture-handler`, while `App.tsx` and `HomeScreen.tsx` import from `react-native`. Within a `GestureHandlerRootView` tree, mixing these causes unreliable touch handling on Android. Pick one import source consistently — `react-native-gesture-handler` inside the home screen tree, `react-native` in the puzzle screen, or switch entirely to RNGH.

**Fix the race condition in win handling.** At `App.tsx:567-611`, the game state is set to `WON` and confetti is triggered *before* `Promise.all` resolves for recording stats and awarding amber. If persistence fails silently, the player sees a victory screen with incorrect amber/star data. Move `setGameState(GameState.WON)` inside the `.then()` block, or at minimum, don't display amber/stats until the promise resolves.

### Priority 2: Pre-Launch Polish

**Phase transitions need ceremony.** The shift from Phase 0 to Phase 1 (puzzle 25) is the moment players first notice something is off about the animals. Currently it's a small italic line on the victory modal. This deserves a dedicated transition — a brief visual change to the house, a different sky color, a special dialogue. This is the game's core differentiator; underselling it wastes the best content.

**The per-puzzle streak counter serves no purpose.** The `streak` state in `App.tsx` tracks consecutive valid moves within a single puzzle and displays them in the UI, but this number doesn't affect scoring, stars, amber, or anything else. Either wire it into the star calculation (e.g., a streak bonus for solving without any invalid attempts) or remove it to reduce UI noise.

**The unnecessary 300ms delay before puzzle generation** (`App.tsx:429`) should be removed. It exists presumably to let a loading animation appear, but the loading overlay is already shown by the `LOADING` game state. This delay is pure wasted time that players feel on every new puzzle.

### Priority 3: Structural Improvements

**Decompose App.tsx (1,759 lines).** The actionable split:
- Extract `ActionButton`, `AnimatedLogo`, `StreakCounter`, `Toast` into `src/components/puzzle/`
- Extract game logic (handleSlotPress, handleLetterPress, handleUndo, handleHint, validation) into a `useGameLogic` custom hook
- Keep rendering and screen navigation in App.tsx

**Decompose HomeScreen.tsx (1,724 lines).** Extract:
- `JuicyButton`, `CelebrationConfetti`, `AmberSparkle` into separate component files
- The 6 modals (dialogue, shop, room unlock, invite, intro dialogue, build prompt) into individual modal components
- Shop/purchase logic into a custom hook

**Stabilize callback references.** `HomeScreen.tsx` recreates `handleAnimalPress`, `handleRoomPress`, etc. on every render. `useCallback` is imported but never used. Wrapping these handlers in `useCallback` prevents unnecessary re-renders of the HouseWorld tree, which contains 10 animated AnimalSprite components.

**Add tests for core logic.** Priority test targets:
- `calculateStars()` — 6 test cases cover the full matrix
- `calculateFreshnessPenalty()` — boundary conditions at 0, 14, 15, 39, 40 puzzles ago
- `scorePuzzleChain()` — regression tests with known-good puzzle chains
- Unlock validation — prerequisite checking, cost verification

### Priority 4: Future Considerations

**Sound design.** The game would benefit from tactile audio feedback — a soft click on letter selection, a satisfying "snap" on valid word formation, a gentle chime for star ratings. The `expo-av` package handles this. This is meaningful engineering work but high-impact for game feel.

**Basic accessibility.** Add `accessibilityLabel` props to all interactive elements. The PLAY button, amber display, animal sprites, and letter tiles should all have descriptive labels. Full screen reader support for the spatial puzzle mechanic would require a redesigned interaction model, but labeling interactive elements is low effort.

**Error boundaries.** A React error boundary wrapping the home screen and puzzle screen independently would prevent a crash in one from taking down the other. Currently, any runtime error in any component kills the entire app.

**Consider `react-native-reanimated` for AnimalSprite.** The current approach uses `setInterval` to trigger `Animated.timing` sequences, which runs on the JS thread. Reanimated 2/3 worklets run on the UI thread, eliminating JS bridge overhead. With 10 sprites each running 3-4 animation loops, the cumulative JS thread cost is non-trivial.

---

## Detailed Code Observations

### Puzzle Generation (localGenerator.ts — 962 lines)

This is the strongest file in the codebase. Key design decisions:

- **Anti-boring penalties:** S-pluralization (-70), -ED past tense (-50), -ER comparative (-40), -ING suffix (-45/50), -LY suffix (-40/45), prefix removal (-25), edge insertions (-35)
- **Word scoring:** boring words (-35), fun words (+30), dread words (phase^2 * 2.5 bonus), letter composition, variety, rarity
- **Semantic clusters:** animals, food, nature, body, colors, home, action, existential
- **Chain scoring weights:** word scores (25%), move quality (35%), semantic distance (20%), journey (10%), position variety (10%)
- **Generation strategy:** 3 candidates, best above score 45, history-aware filtering, 2.5s timeout with fallback

The one concern is whether the `MIN_ACCEPTABLE_SCORE` of 45/100 is empirically validated. If most puzzles score well above 45, the threshold is meaningless. If many fall below, players frequently get fallback puzzles.

### AnimalSprite (AnimalSprite.tsx — 663 lines)

Good animation variety but implementation concerns:

- `setInterval` inside React components for random movement is not idiomatic. Should use `Animated.loop` with randomized parameters or reanimated worklets.
- Each sprite runs 3-4 independent `Animated.loop` animations continuously. With 10 animals rendered, that's 30-40 perpetual animation loops.
- Per-animal `MOVEMENT_SPEED` and `BOUNCE_HEIGHT` tuning is a nice touch.
- Phase-based emotion bubbles and sleeping Z's on cooldown add personality.
- 5 of 10 animals have image sprites (fox, pangolin, owl, axolotl, capybara); others fall back to emoji.

### State Management

- App.tsx: ~22 `useState` hooks, many UI-local (showRules, showDifficultyMenu, showConfetti)
- HomeScreen.tsx: ~15 `useState` hooks plus 4 `useRef` for animations
- No context providers, no reducers, no global state
- Prop drilling: App -> HomeScreen -> HouseWorld -> RoomView -> AnimalSprite
- 5 separate AsyncStorage caches with no central data layer or migration strategy

This works at current scope but will become painful as features are added.

### Dictionary & Word Lists

- `dictionary.ts`: ~64KB, 8,000+ words loaded synchronously on import. On lower-end Android, this adds noticeable cold start time.
- `constants.ts`: Separate word lists (WORDS_3 through WORDS_6) for generation vs. validation set in dictionary.ts. Potential for inconsistencies between what the generator produces and what the validator accepts.

### ID Generation (App.tsx)

```typescript
let idCounter = 0;
const generateId = () => `id_${Date.now()}_${idCounter++}`;
```

Module-level mutable state. Not currently a bug, but fragile under hot-reloading.

### Deep Cloning for Undo (App.tsx:549)

```typescript
setHistory(prev => [...prev, { rows: JSON.parse(JSON.stringify(rows)), activeRowIndex }]);
```

Works but is slow. A structural sharing approach (Immer or manual) would be more efficient.

---

## Architecture Summary

| Layer | Quality | Notes |
|-------|---------|-------|
| Puzzle generation | Excellent | Sophisticated scoring, history-aware, timeout-protected |
| Visual/animation | Good | Consistent theme, lively sprites, polished UI |
| Economy/progression | Good | Well-curved unlock costs, meaningful star bonuses |
| Narrative content | Excellent | 520 unique dialogues, distinctive tonal progression |
| Code structure | Adequate | Works but monolithic; needs decomposition for maintainability |
| Data persistence | Adequate | AsyncStorage with in-memory caches; no migration strategy |
| Testing | Absent | Zero automated tests |
| Accessibility | Absent | No screen reader support |
| Audio | Absent | Silent game with visual-only feedback |

---

## The Bottom Line

WordShift has two things that most indie puzzle games lack: a puzzle generator that produces consistently interesting challenges, and a narrative identity that gives players a reason to keep coming back beyond the puzzle loop itself. The existential dread progression is genuinely memorable game design.

The code is the work of a capable developer who prioritized the right things — puzzle quality, visual feel, and content — over engineering formalism. The structural debt is real but not dangerous at the current scope. The priorities above are ordered by impact: fix the ship-blocking issues, add ceremony to phase transitions, then chip away at decomposition and testing.

The game is close to shippable. Fix the DEV button, the touch import inconsistency, and the win-state race condition, and you have a functional product. Add sound and phase transition ceremony, and you have a good one.
