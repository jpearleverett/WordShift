# WordShift — Complete Game Assessment

**Codebase**: ~11,900 lines of TypeScript | 28 source files | React Native / Expo SDK 54
**Review scope**: Complete source code read of all components, services, types, tests, and configuration

---

## THE GAME IN ONE SENTENCE

WordShift is a word puzzle game with a deceptively deep meta-game where cute animal characters in a buildable house slowly descend into existential dread the more you play.

---

## WHAT MAKES THIS GAME SPECIAL

### 1. The Core Puzzle Is Genuinely Novel

The pick-a-letter-from-one-word, drop-it-into-another mechanic is not a reskin of Wordle, Boggle, or Scrabble. It creates a unique decision space: every move simultaneously destroys and creates, and the chain structure means early moves constrain late ones. The difficulty scaling through chain length (3/4/5 rows) rather than just word length is the right design choice — it changes the nature of the challenge, not just its size.

### 2. The Puzzle Generator Is Production-Grade

`localGenerator.ts` is the best piece of engineering in this codebase. The DFS path-finding through valid word chains, the anti-boring heuristics (penalizing trivial S/ED/ING transforms), the semantic clustering bonus, the multi-candidate evaluation (generate 3, pick best), the quality threshold (reject below 45/100), and the word history integration for freshness — this is not a throwaway random generator. This is the kind of system that makes the difference between "plays great for 10 puzzles" and "plays great for 500 puzzles." The 2.5s timeout with fallback shows engineering pragmatism.

### 3. The Narrative Arc Is a Genuine Content Moat

520 hand-written dialogues across 10 characters with 5 phases of tonal evolution — from sunny ("What a gorgeous morning!") to full existential crisis ("The words are watching us, aren't they?") — is a remarkable creative investment. Each animal has a distinct voice that stays consistent through the descent: the owl becomes an intellectual nihilist, the sloth has slow-motion dread, the axolotl questions the nature of regeneration. This is the kind of content that creates word-of-mouth. Players will screenshot Phase 4 dialogue and share it. The integration with gameplay — puzzle words gradually shifting to VOID, FADE, DOOM, ABYSS — bridges the two halves of the game in a way most meta-games never achieve.

### 4. The Animation Polish Is Exceptional

For a React Native indie game, the animation density and quality is outstanding:
- **Puzzle screen**: 3D candy-styled tiles, arc/fan layout for drop slots with smooth glide animations, spring-based press feedback, confetti celebration, error-shake toasts
- **Home screen**: Pinch-to-zoom house with animated clouds, flying birds, smoke puffs, shooting stars (Phase 2+), swaying trees, sun/moon with pulse, phase-dependent weather changes (clear sky → storm → shadow figure)
- **Animal sprites**: Breathing, walking with animal-specific speed/bounce (rabbit fast, sloth slow), emotion bubble popups, tap squish reaction, sleeping Z's during cooldown, direction-aware facing

Every interactive element has tactile feedback. The visual language is consistent throughout.

### 5. The Economy Is Honest

No IAPs in the codebase. Amber is earned purely through gameplay. Rewards scale with difficulty and performance. The progression alternates between room-building and animal-inviting, creating two interleaved unlock tracks that maintain the anticipation-reward cycle. The session/cooldown system (6 dialogues, then 5-puzzle wait) gates content at exactly the right pace — frequent enough to feel rewarding, infrequent enough to make each session feel special.

---

## WHAT NEEDS WORK

### Priority 1: Ship-Blocking

**Remove the DEV button** (`HomeScreen.tsx`). The red button that adds 5000 amber and clears cooldowns must be removed or hidden behind a proper dev flag before any user-facing build. The CLAUDE.md already notes this — just do it.

### Priority 2: Architectural Debt

**App.tsx (1,348 lines) and HomeScreen.tsx (1,449 lines) are god components.** They each manage state, persistence, UI, animations, and business logic. The service layer underneath is well-decomposed (`wordHistory`, `starRating`, `amberCurrency`, `dialogueSession`, `localGenerator`, `homeWorldData`), which proves the team knows how to separate concerns. These two files just haven't gotten the same treatment.

Recommended refactor:
- Extract puzzle game state into a `usePuzzleGame()` custom hook
- Extract persistence orchestration into a `useGamePersistence()` hook
- Extract the modal states in HomeScreen into a `useHomeModals()` hook or dedicated modal components
- This would bring both files under 500 lines without changing behavior

### Priority 3: Test Coverage

24 tests covering 2 of 8 service modules is a start, and the tests that exist are well-written (good boundary testing on `starRating` and `wordHistory`). But the puzzle generator — the most complex and critical module — has zero tests. If a refactor introduces a regression in scoring heuristics or anti-boring detection, you won't know until players report dull puzzles. The unlock progression validation (`isUnlockAvailable`, `purchaseUnlock`) also needs tests since bugs there directly impact the economy.

### Priority 4: Observability

No analytics, no crash reporting, no event logging. Once this ships to real users, you need to know:
- Puzzle generation failure rate by difficulty
- Average stars earned (difficulty balance indicator)
- Dialogue progression rates (are players reaching Phase 4?)
- Where players churn (which puzzle count, which unlock wall)
- Crash rates on lower-end devices

### Priority 5: Minor Items

- **AsyncStorage error handling**: Service-layer persistence calls should have try/catch wrappers to prevent silent data loss
- **Dictionary loading**: 65KB TypeScript module always in memory; consider lazy-loading for future dictionary expansion
- **Accessibility**: Good baseline (labels, roles, states on key elements) but would benefit from VoiceOver/TalkBack testing pass

---

## WHAT NOT TO CHANGE

- **Don't add a timer.** The no-pressure design is a feature, not a gap. It defines the game's identity.
- **Don't add IAPs yet.** The pure skill-rewarded economy is a differentiator. If monetization is needed, a one-time premium price or cosmetic additions are more aligned than gem packs.
- **Don't add multiplayer.** The existential dread arc is a solo experience by design.
- **Don't over-abstract the codebase.** Pure useState/useEffect works at this scale. Don't add Redux for the sake of it.
- **Don't reduce the animation budget.** The polish is a core value proposition. Optimize individual animations if needed; don't remove them.

---

## FINAL SCORES

| Category | Score | Notes |
|---|---|---|
| **Game Design** | **9.0/10** | Novel mechanic, dread integration, honest economy, no-pressure philosophy |
| **Code Architecture** | **7.0/10** | Strong service layer, clean types, but two oversized components |
| **Animation & Polish** | **9.0/10** | Exceptional for the platform; consistent, tactile, phase-responsive |
| **Content Depth** | **9.0/10** | 520 dialogues with coherent narrative arc across 10 unique voices |
| **Technical Robustness** | **6.0/10** | Limited tests, no observability, fragile persistence layer |
| **Performance** | **7.0/10** | Good native-driver discipline, but heavy animation load is untested on low-end |
| **Ship Readiness** | **6.5/10** | One hard blocker (DEV button), then observability and testing gaps |

### **Overall: 7.6 / 10**

---

## BOTTOM LINE

WordShift is a well-designed game with a genuinely original creative vision. The puzzle mechanic is novel, the generator is sophisticated, the animation polish is top-tier for a React Native indie, and the existential dread narrative arc is the kind of distinctive creative choice that makes a game memorable. The codebase is well-organized at the service and type level, with two components (App.tsx, HomeScreen.tsx) that need decomposition.

The main gaps are in engineering discipline around the code, not in the game itself: testing, observability, and error handling are the areas that separate "impressive prototype" from "production-ready product." The game design and content are ahead of the infrastructure supporting them.

This is a game with clear creative vision, strong execution on the things that matter most to players (feel, polish, content), and a technical foundation that is sound but needs hardening. With the recommended improvements, this is a shippable product with genuine market differentiation.
