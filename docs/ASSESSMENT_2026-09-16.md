# WordShift — end-to-end assessment (2026-09-16)

Audit of `main`-derived branch `claude/nifty-faraday-hd4rnj` at `5314450`, covering the whole
app: ~180k lines across 82 components, 117 services, 22 hooks, plus App.tsx.

## Method

22 independent finders swept one subsystem or performance dimension each (puzzle engine, banks
and vocabulary, persistence, cloud save, economy, IAP, ads, victory chain, dialogue delivery,
ceremonies, bootstrap/lifecycle, house unlocks, daily/social, time handling, async races, render
perf, animation perf, startup/memory, algorithmic hot paths, a11y/platform, doc-vs-code drift,
test integrity). Every finding was then handed to independent adversarial verifiers instructed to
*refute* it — three lenses for critical/high, scaled down below that — and only findings that
survived refutation were kept. Six completeness critics then probed what the first wave missed,
and 16 second-wave probes ran through the same verification.

280 agents. **119 candidate findings, 37 refuted, 82 confirmed**, merged into 41 distinct entries.

## Baseline health

The gates are all green, so nothing here is caught by existing tooling:

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `eslint . --max-warnings 0` | clean |
| `npm test -- --ci --runInBand` | **212 suites / 5023 tests passed, exit 0** |

The documented in-band import-after-teardown exit-code hazard is currently closed. (CLAUDE.md's
"~1,175 warnings" lint baseline is stale — it is zero-warning now.)

## Headline

**One critical defect, and it fires on every playthrough.**

`B1` soft-locks the Offering Pit after *every* phase transition. The ward-ignition ceremony sets
`ceremonyBusyRef` and clears it in exactly one place — the failure branch. On success the flag
stays set forever on that mount, and it is the pit's master interaction fence: home chip, utility
menu, Store, Tending, word chips, Offer All and Android Back all consult it. The pit is never
unmounted (the cinematic renders above it at App root), and the render-level disabled state
deliberately excludes that ref, so every control draws fully enabled and does nothing. Ward
ignition is the only route to a phase advance, so this is unavoidable and unskippable, five times
per playthrough plus every New Cycle. Progress is safe — the transition commits durably — but the
session ends in a force-quit. The fix is one line in a `finally`.

Three more reach real players:

- **`B2` — the entire notification subsystem is dead.** All four scheduling sites pass the legacy
  `trigger: { date }` shape. expo-notifications 57 requires a `type` or `channelId` key and throws
  a `TypeError` before any native call; every call site swallows it. Worse, `scheduleAllNotifications`
  calls `cancelAllScheduledNotificationsAsync()` *first*, so each session empties the queue and then
  fails to refill it. Daily reminders, streak-at-risk, the five-rung win-back ladder and quest-expiry
  have all been silently dead since SDK 52. The test mock accepts any trigger, so CI is green against
  a call that throws in production.
- **`B3` — a boot deadlock with the escape hatch inside the locked room.** If the ceremony-queue read
  fails, `saveWithPlayerRetry` shows a retry alert and awaits the press — but `GameAlertModal` is
  mounted *below* the `BootHold` early return, so `alertPending` can never become true, the hold never
  lifts, and the retry button never renders. The `!alertPending` clause shows the author anticipated
  exactly this; the host is just on the wrong side of the return.
- **`B4` — a transient read error becomes permanent, cloud-replicated save loss.** `loadProgress()`
  catches a read/parse failure, substitutes `getDefaultProgress()`, and caches it. The next write
  persists the empty save over the real one, and since `wordshift_home_progress` is in `SYNC_KEYS`,
  the wipe uploads. House, amber, phase, conversation read-IDs and durable choices, gone — through a
  `console.warn`, in a codebase that built `saveWithPlayerRetry` precisely to avoid this.

## Independently re-verified

Beyond the adversarial verification pass, the following were re-checked by hand against the real
source and the installed dependencies before this report was written:

- **B1** — traced every `ceremonyBusyRef` write (decl 1081, read 1084, guard 1813, set 1814, clear 1904
  only), confirmed `ceremonyStatus` returns to `'idle'` only on the failure arm, confirmed the nine
  `navigate()` call sites and App's `pitNavigationGuardRef` back-handler, and confirmed the cinematic's
  `onComplete` performs no navigation, so the pit is never unmounted.
- **B2** — runtime-proved against the installed `expo-notifications@57.0.17`:
  `hasValidTriggerObject({ date })` returns `false`, `hasValidTriggerObject({ type: 'date', date })`
  returns `true`, and `scheduleNotificationAsync` throws at that gate. All four app sites pass the
  bare `{ date }`; `rg` finds no `SchedulableTriggerInputTypes` anywhere in `src/`.
- **B3** — confirmed `GameAlertModal` is mounted at App.tsx:6295, below the BootHold early return at
  App.tsx:4876, and that `ceremonyPlayback.refresh` routes its read through `saveWithPlayerRetry`,
  which awaits a `showGameAlert` press that can never be rendered.
- **B4** — confirmed the `catch` -> `progressCache = getDefaultProgress()` fallthrough in
  `loadProgress()` and that `saveProgress()` then persists that cache unconditionally.
- **B21** — **measured, and it is worse than reported.** The seed is an order-independent character-code
  sum, so across 336 dates in 2026 there are only **18 distinct seeds**, not one per day. Dates whose
  digits permute collide outright (`2026-01-01`, `2026-01-10`, `2026-10-01`, `2026-10-10` all share
  seed 486), and the first draw repeats exactly every 9 days (`2026-09-01` and `2026-09-10` both give
  0.8490). Read the entry's stated set counts as approximate; the seed collapse itself is measured.
- **P1** — confirmed `collectLocalSaveData` serially awaits `getItem` per key over `SYNC_KEYS` (50
  entries) plus prefix matches, with `isSyncedKey` doing an O(n) `includes` per key.
- **P2** — confirmed `HouseWorld` is exported as a plain `React.FC` at HouseWorld.tsx:1789 while two of
  its own children are `React.memo`, and that the typewriter cadence constants give 45.5/s and 66.7/s.

## Suggested order of work

1. **B1** (one line) — ship this before anything else.
2. **B2** (four object literals) — recovers the whole retention subsystem.
3. **B3, B4** — both small, both convert a rare transient failure into an unrecoverable one.
4. **B5, B6** — the 360dp board-scale clipping, and the split-write house-unlock ladder.
5. **P1, P2, P3** — the three cheap performance wins with the widest blast radius.

Everything below is ordered by impact within its part. Each entry carries the code that proves it
and a specific fix.

---

## Part 1 — Correctness findings (32)

### Systemic patterns

Two systemic patterns account for roughly half the list. First, **state is released on one exit path but not the others**: a busy flag cleared only in the failure arm (pit ceremony), a once-ever flag burned at resolve time instead of at display time (victory receipts, cosmetic receipts), a cache invalidated without the re-warm its own docblock mandates (hints, cosmetics, settings), a reset list that enumerates six keys and misses the in-progress board. Second, **two durable writes where one transaction belongs**: the house-unlock ladder, achievements, daily login, first-daily mercy, the share bonus and the sacrifice altar all commit a debit or credit and then commit its receipt separately, on raw AsyncStorage, usually with the second write's error swallowed — in a codebase that already solved this correctly for every other sink via runStorageTransaction. A third pattern runs through the boot, pit and speed defects: **a gate whose predicate is a hand-listed set that drifts** — the speed clock's pause list names two surfaces out of six, the house-ceremony guard names the intro surfaces but not the modals, the boot hold's escape clause depends on a host rendered below its own early return. Fourth, several defects are **scale-mismatch bugs where two systems measure the same quantity differently**: lifetime versus cycle-relative solve counts in NG+, device clock versus store clock in the purchase reconciler, modelled versus rendered tile geometry in the board scale, and an uninitialised module mirror read before it is written. Finally, the test suite actively conceals three of the most severe items: the board-scale guard asserts the implementation against its own model, the notification tests mock away the library call that throws, and the rewarded-retry contract is pinned in isolation from the one call site that opts out of it — so green CI is not evidence for any of these.

---

### B1 — Pit ward-ignition ceremony never clears ceremonyBusyRef on success, dead-locking the Offering Pit on every phase transition

**Severity:** CRITICAL &middot; **Effort:** small

**Where:** `src/components/OfferingPitScreen.tsx:1814, src/components/OfferingPitScreen.tsx:1887-1896, src/components/OfferingPitScreen.tsx:1904, src/components/OfferingPitScreen.tsx:1084, App.tsx:4459`

**What breaks**

ceremonyBusyRef.current = true is set when the ward ceremony starts (1814) and reset in exactly ONE place: line 1904, inside the `else if` RECOVERY branch that runs only when confirmPhaseTransition resolves null. The SUCCESS branch (1887-1896) fades the overlay, calls setCeremonyStatus('complete') and onPhaseTransitionConfirmed, and never resets the flag. That ref is the pit's master interaction fence: navigationBlocked() (1084) ORs it, navigate() (1086) silently returns when blocked, and every exit routes through it (home chip 3008, utility menu 2999, Store pill 2964, Tending 2989, all UtilityMenu rows 3027-3031). devourWord (2231) and handleHarvestAll (2316) also early-return on it, and App consumes Android Back through pitNavigationGuardRef (App.tsx:4459). The pit is NOT unmounted by the cinematic — App renders renderScreen() and PhaseTransitionOverlay as siblings and nothing navigates away — and the render-level gate navigationBusy (2585) deliberately omits ceremonyBusyRef while blockingOverlayActive (2584) is false at status 'complete', so every control renders fully ENABLED while its handler is dead. ceremonyStatus is also terminal: it only returns to 'idle' at 1905, so no later ceremony can start on that mount either.

**Failure scenario**

Player crosses a phase threshold (e.g. weighted progress 16 -> phase 1), walks to the Offering Pit and offers the waiting batch. Ignition -> eruption -> ceremony lines -> confirmPhaseTransition commits -> setCeremonyStatus('complete'), ceremonyBusyRef stays true. App plays the phase cinematic over the still-mounted pit; when it ends the player is back on a live pit where the home icon does nothing, the menu icon does nothing, word chips ignore taps, Offer All plays its tap sound and does nothing, and Android Back is swallowed by App.tsx:4459. The only escape is force-quitting the app. Fires on EVERY phase transition (5 per playthrough, plus each New Cycle); ward ignition in the pit is the ONLY route to a phase advance, so it is unavoidable and unskippable. Progress itself is safe (the transition committed durably), but the session is over.

**Evidence**

Verified in source. Lines 1887-1906:
  if (result) {
    if (mountedRef.current) { ...fade...; setCeremonyStatus('complete'); }   // <- no ceremonyBusyRef reset
    onPhaseTransitionConfirmed?.(result.newPhase);
  } else if (mountedRef.current) {
    ...fade...
    ceremonyBusyRef.current = false;    // line 1904 — ONLY reset, failure path only
    setCeremonyStatus('idle');
  }
`grep -n ceremonyBusy` returns exactly 1081 (decl), 1084 (navigationBlocked read), 1813 (guard), 1814 (=true), 1904 (=false), 2231, 2316. There is no other write.

**Fix**

Release the flag on every exit of runComplete, not just the failure arm: wrap the confirm in try/finally and set `ceremonyBusyRef.current = false;` in the finally (or at minimum add it next to `setCeremonyStatus('complete')` at line 1894 — pendingPhaseRef and the App-level PhaseTransitionOverlay already fence the pit while the cinematic plays). Also add ceremonyBusyRef to the render-level `navigationBusy` (2585) so the visual disabled state and the handler gate can never disagree again, and add a regression guard in pitInterruptionSafety.test.tsx: after a successful confirm, navigationBlocked() must be false.

---

### B2 — Every local notification fails to schedule: date trigger is missing its required `type`, and all four call sites swallow the throw

**Severity:** HIGH &middot; **Effort:** small

**Where:** `src/services/notifications.ts:590, src/services/notifications.ts:640, src/services/notifications.ts:796, src/services/notifications.ts:842, src/services/notifications.ts:207`

**What breaks**

All four scheduling sites pass the legacy shape `trigger: { date: triggerDate }`. In the installed expo-notifications 57.0.17, scheduleNotificationAsync begins with hasValidTriggerObject, which is `trigger === null || (typeof trigger === 'object' && ('type' in trigger || 'channelId' in trigger))`. A bare `{date}` has neither key, so parseTrigger throws `TypeError: The 'trigger' object you provided is invalid...` before any native call. Every call site swallows it (scheduleDailyReminder's try wraps the WHOLE loop, so one throw kills every remaining morning rung; scheduleWinBackLadder's try is inside the loop, so all five rungs throw independently; quest-expiry and streak-risk are single calls). getNotificationsModule() is typed `Promise<any>` so typecheck cannot catch it, and notifications.test.ts mocks scheduleNotificationAsync as a permissive jest.fn that accepts any trigger, so the suite is green against a call that throws in production. Worse, scheduleAllNotifications still calls cancelAllScheduledNotificationsAsync() first, so every session actively empties the queue and then fails to refill it — including notifications armed by any pre-SDK-52 build. This has been dead since expo-notifications 0.29 (SDK 52), not just the latest bump.

**Failure scenario**

Player accepts the in-app notification prompt after their 3rd victory; handleNotificationPromptAccept calls scheduleAllNotifications(phase). Permission is granted, the queue is cancelled, then the first mod.scheduleNotificationAsync throws a TypeError that the enclosing `catch {}` discards. Result: zero scheduled notifications, on every device, forever. The player never receives the morning daily reminder, the 19:00 streak-at-risk ping, any win-back rung (+1/+3/+7/+14/+30), or the Sunday 17:30 quest-expiry nudge. The entire documented re-engagement subsystem is silently dead, with no crash, no log and no user-visible symptom.

**Evidence**

Confirmed by reading node_modules: expo-notifications@57.0.17, build/hasValidTriggerObject.js = `return (trigger === null || (typeof trigger === 'object' && ('type' in trigger || 'channelId' in trigger)));`, and build/scheduleNotificationAsync.js `if (!hasValidTriggerObject(userFacingTrigger)) { throw new TypeError(...) }`. grep over notifications.ts shows `trigger: {` at 590/640/796/842 each followed only by `date: triggerDate,`. `grep -rn "SchedulableTriggerInputTypes|type: 'date'|channelId" src/` returns zero hits — there is no correct trigger construction anywhere in the app, and no patch-package override restoring the old permissive shape.

**Fix**

Pass the discriminant at all four sites: `trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate }` (or the literal `'date'`). Then (a) type getNotificationsModule() as `typeof import('expo-notifications')` instead of `any` so the next SDK bump fails typecheck; (b) stop swallowing — at minimum reportError() the throw so a scheduling failure is observable; (c) replace the permissive test mock with one that runs the real parseTrigger (or asserts `trigger.type === 'date'`) so the shape is pinned.

---

### B3 — Boot hangs forever when the ceremony-queue read fails: the retry alert host is rendered below the boot-hold early return

**Severity:** HIGH &middot; **Effort:** small

**Where:** `App.tsx:4876, App.tsx:1246, App.tsx:6295, src/services/saveRetry.ts:17, App.tsx:4458`

**What breaks**

MainApp holds the branded BootHold until ceremonyReady: `if (!onboardingFlow.onboardingReady || bootRouting || (!ceremonyReady && !alertPending)) return <BootHold .../>`. ceremonyReady is set only after the mount effect's ceremonyPlayback.refresh() resolves (App.tsx:1246). Inside refresh, the queue read is wrapped in saveWithPlayerRetry, which on failure awaits `new Promise(resolve => showGameAlert(..., [{text:'Retry save', onPress: resolve}]))` — a promise that resolves ONLY when the player taps the alert button. But GameAlertModal, the only host that renders those requests and the only thing that can set alertPending, is mounted at App.tsx:6295, i.e. inside the branch the boot hold short-circuits. gameAlert.ts just pushes onto its `pending` array because no listener is registered, so alertPending can never flip true, the `!alertPending` escape clause is unreachable, refresh() never resolves, and the hold never lifts. The same effect's back handler (App.tsx:4458) returns true while `!ceremonyReady`, so hardware Back is swallowed too. BootHold's `failed` prop is driven by initialRoute.status, which is unrelated to the ceremony read, so no Try-again card is ever offered on this path.

**Failure scenario**

A player whose wordshift_home_progress record is unreadable (truncated/shape-invalid) on an otherwise healthy device launches the app. getPendingCeremonies() rejects -> saveWithPlayerRetry queues a 'Your next scene is waiting' alert -> no GameAlertModal is mounted -> alertPending stays false -> setCeremonyReady(true) never runs. The app sits on the parchment BootHold spinner with no Retry button, hardware Back does nothing, and every relaunch repeats it. Only clearing app data (losing the entire save) recovers. Note the three other triggers the reporter cited are already handled upstream — a raw AsyncStorage read failure fails recoverPendingStorageTransaction first and DOES get the retryable boot card, and an invalid pendingCeremonies entry is unreachable for app-written data — so the surviving trigger is device-level corruption of the progress row alone, which makes this rare but totally unrecoverable in-app.

**Evidence**

Verified by grep: `ceremonyReady` appears at App.tsx:716 (state), 1495, 4458, 4519, 4876 (the boot gate). `GameAlertModal` appears at App.tsx:99 (import) and App.tsx:6295 (sole mount) — below the 4876 early return. saveRetry.ts:17 `await new Promise<void>(resolve => { showGameAlert(copy.title, copy.message, [{ text: 'Retry save', onPress: resolve }]); });`

**Fix**

Render the alert host outside the short-circuit: either return `<><BootHold .../><GameAlertModal onPendingChange={setAlertPending} /></>` from the boot branch, or restructure so BootHold is a sibling overlay of the always-mounted alert host rather than an early `return`. Belt and braces: give the mount effect its own failure state — catch the rejection, set ceremonyReady true with a stored error, and drive the retry through BootHold's existing `failed`/`onRetry` card instead of saveWithPlayerRetry.

---

### B4 — loadProgress() silently substitutes a brand-new empty save when the progress record is unreadable, then persists it and uploads it over the cloud row

**Severity:** HIGH &middot; **Effort:** small

**Where:** `src/services/amberCurrency.ts:313-333, src/services/amberCurrency.ts:344-352, src/services/amberCurrency.ts:275-282, src/services/persistenceStorage.ts:108-111`

**What breaks**

loadProgress() wraps the read AND JSON.parse in one try, and on ANY failure falls through to `progressCache = getDefaultProgress()` (amber 0, puzzlesSolved 0, currentPhase 0, unlockedRooms ['cozy_den'], no conversationReadIds) and returns it as the player's save. progressCache is the object every mutator writes back through saveProgress(), so the next progress write makes the wipe durable and App's uploadToCloud() then pushes it over the intact cloud row. Every other service that owns a synced key does the opposite (hints.ts:53, seasonPass.ts:157, weeklyQuests.ts:553, iap.ts:449 all rethrow), and conversationProgress.ts:89 deliberately bypasses loadProgress with a comment saying its 'legacy recovery fallback must not turn an unreadable save into a new, empty conversation ledger' — the most valuable record in the app is the one place the convention is missing. The journal does not protect it: stagedReadFailure only fires when NativeStorage.getItem THROWS; a successful read of corrupt bytes throws inside JSON.parse, which loadProgress swallows itself. maybeAutoRestoreOnFreshInstall also uses wordshift_home_progress as its fresh-install sentinel, so a corrupt non-empty string reads as 'local progress exists' and no automatic cloud restore is attempted, and validateCloudSaveData cannot stop the upload because the wiped defaults are a perfectly valid progress shape.

**Failure scenario**

A player with ~120 solves, 4,000 amber and a fully built house has wordshift_home_progress become unparseable (truncated write during an OS kill, SQLite/manifest damage). Next launch: boot succeeds (nothing validates progress), home renders an empty Cozy Den. Within seconds — before the player solves anything — App.tsx:1632's once-per-local-day checkFreeStreakFreeze() sees `lastFreeStreakFreezeDate` undefined, takes the `if (!lastFree)` branch and calls saveProgress() OUTSIDE any transaction, writing the empty save to disk. House, amber, phase, every conversation receipt and every one-time narrative flag are gone irreversibly, and the next victory's uploadToCloud() replaces the good cloud row with the wiped one.

**Evidence**

amberCurrency.ts:313-333:
    const stored = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
    if (stored) { progressCache = JSON.parse(stored); ... return progressCache!; }
  } catch (error) { console.warn('Failed to load home progress:', error); }
  progressCache = getDefaultProgress();   // <-- unconditional fallback
  return progressCache;
and persistenceStorage.ts:108-111, which records stagedReadFailure only for a THROWN native read.

**Fix**

Distinguish 'key absent' from 'key unreadable'. Return defaults only when `stored === null`; on a read throw or a JSON.parse failure, invalidate the cache and rethrow (mirroring hints.ts:53 / seasonPass.ts:157) so the boot coordinator's recoverStorage/warmLocalState stage fails closed with the Try-again card instead of opening on an empty save. Add a shape check like cloudSave's validProgress on the parsed object so a value that parses but is not a progress record is also rejected. (Note: a shape check alone would NOT catch this wipe, since the defaults are a valid shape — the null-vs-unreadable distinction is the load-bearing half.)

---

### B5 — Board scale mis-measures the 5-letter drop fan; the outer insertion slots render off the screen edge on 360dp phones

**Severity:** HIGH &middot; **Effort:** medium

**Where:** `src/services/slotEstimation.ts:66, src/services/slotEstimation.ts:45, src/components/Row.tsx:652, src/__tests__/dragDrop.test.ts:111-123`

**What breaks**

computeBoardScale models the widest rendered row as `baseWordLength + 1` letters, and naturalContentWidth picks tile/slot sizing from that inflated count via `const compact = letterCount >= COMPACT_THRESHOLD` (threshold 6). For base word length 5 this flips the MEASUREMENT to COMPACT geometry, but the row that actually renders the interleaved fan is the TARGET row while it still holds 5 letters, and Row.tsx:652 decides `compactTiles = wordLength >= 6` from the LIVE per-row letter count. Recomputed with the real constants: naturalContentWidth(6) = 7*16 + 6*38 = 340dp, while the rendered 5-letter fan is 6*20 + 5*52 = 380dp. At 360dp, rowInnerW = 344, so 340 <= 344 returns scale exactly 1 and 380dp of content is centred on the screen — ~10dp off each edge, clipped for touch at the ScrollView bounds. Covers MEDIUM_PLUS, HARD, the Tue-Sat daily, every Lexicon 5-letter board and every double-shift board (W is always 5). The guard test cannot catch it because dragDrop.test.ts reconstructs the expected footprint from the SAME `widest = base + 1` model, asserting the implementation against its own assumption. This is a regression from commit 5d2af7b (accessibility-devices-1): before it, naturalContentWidth(6) coincidentally equalled the real 380dp fan.

**Failure scenario**

On a 360dp-wide Android phone (the dominant width, also reachable on wider phones via Android's Display-size setting) start a HARD or MEDIUM_PLUS board and tap a letter in the source row. The drop fan renders at 380dp inside a 344dp row box. Slot 0's rendered slot spans screen x [-9, 9]; touch dispatch stops at the ScrollView's [8, 352] bounds, so with hitSlop the usable tap strip for the first insertion slot is roughly 7dp (mirror image at the right edge). The prefix and suffix insertion positions — the two most-used — are visibly cut off and nearly untappable. At 320dp, slot 0 is lost entirely. Drag still resolves correctly (estimateSlotIndex centres the same content), so the board stays solvable; the loss is the tap path plus visible clipping. Devices at 390dp+ are largely unaffected.

**Evidence**

Recomputed from src/constants/tileLayout.ts: compact path = ARC_SLOT_CELL_W_COMPACT 16, letterCell 42+2-6=38 -> 340. Standard path = ARC_SLOT_CELL_W 20, letterCell 52+6-6=52 -> 6*20+5*52=380. slotEstimation.ts:66 `const widestLetters = Math.max(1, baseWordLength) + 1;` + :45 `const compact = letterCount >= COMPACT_THRESHOLD;` vs Row.tsx:652 `const compactTiles = wordLength >= 6;` with App.tsx:5639 `wordLength={row.words.length}`.

**Fix**

Measure the actual widest RENDERED state instead of `baseWordLength + 1`: take max of (a) the arc fan at `baseWordLength` letters using the compact flag for baseWordLength (plus baseWordLength+1 for double-shift, whose target legitimately fans at W+1), and (b) the plain standard run at baseWordLength+1 (or +2 for double shift) using its own compact flag. Also subtract gameArea's 8dp horizontal padding from availableWidth so the scale targets the real row box. Rewrite dragDrop.test.ts's footprint check to derive from the per-row compact rule rather than from `widest = base + 1`.

---

### B6 — Every house-unlock path debits amber and writes ownership in two separate unjournaled commits, and the four UI handlers drop the rejection with no error shown

**Severity:** HIGH &middot; **Effort:** medium

**Where:** `src/services/amberCurrency.ts:868-880 (unlockAnimal), src/services/amberCurrency.ts:885-897 (unlockRoom), src/services/amberCurrency.ts:910-923 (reserveUnlock), src/services/homeWorldData.ts:1371-1376 (skipReservedUnlock), src/hooks/useUnlockFlow.ts:281/296/320/345, src/components/home/HomeScreen.tsx:3213/3554/3585`

**What breaks**

unlockRoom/unlockAnimal/reserveUnlock each call spendAmber(cost) — which mutates progress.amber and does its OWN committed saveProgress() — and only then perform a second, independent loadProgress + mutate + saveProgress to record the room/animal/reservation. There is no runStorageTransaction anywhere on this path (`grep -n runStorageTransaction src/services/homeWorldData.ts` returns nothing), no journal entry, and no pending-unlock ledger to recover from. Between the two durable writes sits recordTransaction's full read/parse/append/write of the 100-entry amber ledger, widening the window. This is the exact pattern CLAUDE.md forbids ('Do not reintroduce a separate debit followed by an unrelated ownership write'), and every sibling sink already does it correctly inside one transaction: purchaseHouseUpgrade (roomUpgrades.ts:712), purchaseAmberCosmetic (cosmetics.ts:392), commitTendPurchase (tending.ts:319), purchaseSeasonPremiumWithAmber (seasonPass.ts:353). It is also the LARGEST amber sink: rooms 50-550, animals 100, and getUnlockSkipCost at UNLOCK_SKIP_PREMIUM 1.5 makes a Sky Garden skip 1,375 amber. Compounding it, saveProgress rethrows after nulling progressCache, and useUnlockFlow's handlePurchase/handleSkip/handleReserve/handleSpeedUpReserved have no try/catch while HomeScreen invokes them as bare floating promises — so a storage failure is an unhandled rejection: no setPurchaseError, no hapticError, no retry, no message at all.

**Failure scenario**

Deterministic variant (no race needed): player taps 'Skip the wait' on the Sky Garden (550 build -> 1,375 premium). spendAmber persists the debit. The second saveProgress() then fails (device storage error); it nulls progressCache and rethrows, the rejection escapes an uncaught onPress arrow, and the player sees absolutely nothing happen. 1,375 amber is gone, the room is still locked, canSkipUnlockGate still returns true, and a retry charges the full amount again (for reserveUnlock the retry is instead REFUSED with the misleading message 'Not enough amber'). Race variant: the same loss from a process kill in the window between the two writes. For reserveUnlock the torn state is worst of all — the debit lands but reservedUnlockId does not, which is precisely the field claimReservedUnlockIfReady needs, so the purchase leaves no in-game trace whatsoever.

**Evidence**

Verified in source. amberCurrency.ts:885-897: `const result = await spendAmber(cost, 'room_'+roomId); if (!result.success) return false; const progress = await loadProgress(); if (!progress.unlockedRooms.includes(roomId)) { progress.unlockedRooms.push(roomId); progressCache = progress; await saveProgress(); }` — two independent setItems. reserveUnlock at 910-923 has the identical shape for reservedUnlockId. saveProgress at 344-352: `catch (error) { console.warn(...); progressCache = null; throw error; }`. Contrast roomUpgrades.ts:712 `return await runStorageTransaction('house_upgrade_purchase', async () => {...})`.

**Fix**

Add an `unlockInTransaction(targetId, type, cost)` in amberCurrency that runs the affordability check, the debit and the unlockedRooms/unlockedAnimals (or reservedUnlockId) mutation against ONE progress object inside a single runStorageTransaction('unlock_purchase'), invalidating progressCache in a finally — the same shape purchaseHouseUpgrade uses. Route purchaseUnlock, skipUnlockGate, reserveNextUnlock and skipReservedUnlock through it. Separately, wrap all four useUnlockFlow handlers in try/catch that call hapticError() + setPurchaseError() (handling StorageRecoveryRequiredError via saveWithPlayerRetry), and stop collapsing spendAmber's 'Transaction in progress' refusal into the 'Not enough amber' message.

---

### B7 — Consumable IAP is credited twice when the device clock runs more than 5 minutes ahead of the store clock

**Severity:** MEDIUM &middot; **Effort:** medium

**Where:** `src/services/providers/revenueCatBilling.ts:200-203, src/services/iap.ts:501-505, src/services/iap.ts:843-857, src/services/iap.ts:513`

**What breaks**

On Google Play the checkout result's transactionId is the Play ORDER id while customerInfo.nonSubscriptionTransactions lists the same purchase under RevenueCat's own id; the two are tied together only by linkedTransactionIds. BOTH mechanisms that produce that tie compare the DEVICE clock to the STORE clock. (a) linkedReceiptIds accepts a receipt only when `entry.purchasedAt >= checkoutStartedAt - CHECKOUT_RECEIPT_SKEW_MS` (5 min), where checkoutStartedAt is Date.now() and purchasedAt is Date.parse(store purchaseDate) — a device >5 min FAST makes every fresh receipt look 6+ minutes old, so linkedReceiptIds returns [] and the grant is persisted with no linkedIds. (b) The declared fallback receiptCoveredByGrant compares `Math.abs(grant.purchasedAt - transaction.purchasedAt) <= 60_000`, again device time vs store time, so any skew over 60s defeats it too. With both defeated, reconcileStorePurchaseHistory finds no pending grant under the rc id, finds receiptCoveredByGrant false, and falls through to persistRecoveredStorePurchase, creating a SECOND grant for the same purchase and settling it. A slow clock is harmless (the >= test passes more easily); only a fast clock breaks both at once.

**Failure scenario**

Android player whose device clock is 6 minutes ahead buys the 'Hoard of Amber' pack. linkedReceiptIds returns [], so the grant is stored as {grantId:'GPA.order-1', linkedIds: undefined}. StoreModal settles it: +amber, applied={'GPA.order-1'}. Seconds later the RevenueCat customer-info listener fires with the same purchase under 'rc-receipt-1'; reconcile finds it un-baselined, un-applied, matched by no pending grant, and |grantTime - storeTime| = 6min > 60s so receiptCoveredByGrant is false -> persistRecoveredStorePurchase creates grant 'rc-receipt-1' and settles it, crediting the pack a second time. One payment, two grants, repeating for every consumable that player buys. (On the FIRST amber pack the duplicate is base-rate, not doubled again, because markAmberPurchaseMade already ran — so 3x base, then 2x base thereafter.) A narrower correct-clock variant exists: a kill after purchaseConsumable resolves but before settle AND with no linked id captured lets the next boot's initIAP reconcile re-credit the same receipt.

**Evidence**

revenueCatBilling.ts:139 `const CHECKOUT_RECEIPT_SKEW_MS = 5 * 60_000;` and :202 `Number.isFinite(entry.purchasedAt) && entry.purchasedAt >= checkoutStartedAt - CHECKOUT_RECEIPT_SKEW_MS`. iap.ts:489 `export const RECEIPT_MATCH_WINDOW_MS = 60_000;` and :502-503 `grant.productId === transaction.productId && Math.abs(grant.purchasedAt - transaction.purchasedAt) <= RECEIPT_MATCH_WINDOW_MS` where grant.purchasedAt is `Date.now()` (iap.ts:513). iap.ts:855 `await saveWithPlayerRetry(() => persistRecoveredStorePurchase(transaction), PAID_SAVE_COPY);`

**Fix**

Stop deriving purchase identity from cross-clock comparisons. (1) Drop the `>= checkoutStartedAt - skew` date filter in linkedReceiptIds and keep only the id diff `!before.has(entry.transactionId)` — the before-snapshot already establishes 'new since the sheet opened'. (2) Record the store-reported purchaseDate on the pending grant and make receiptCoveredByGrant compare store-time to store-time instead of Date.now(). (3) Persist sessionCheckoutReceipts alongside the applied-ids ledger and write receipt aliases at grant-persist time, not only when a reconcile happens to observe them, so the cover survives a restart.

---

### B8 — New Cycle arms the finale on a lifetime solve count while story gates are cycle-relative, permanently stranding four to six authored scenes in every NG+ run

**Severity:** MEDIUM &middot; **Effort:** medium

**Where:** `src/services/amberCurrency.ts:1848-1850 (canArmFinale), src/services/amberCurrency.ts:977 (applyPuzzleExposureGuard), src/services/amberCurrency.ts:1964-2003 (startNewCycle), src/services/storySpine.ts:102-106 + :206-215 + :224, src/services/phaseNarrative.ts:3286-3307`

**What breaks**

startNewCycle resets the per-cycle descent state (phaseProgress, phase4Dwell, finaleArmed, finalPuzzleCompleted, postRevelation) and anchors cycleStartPuzzles = puzzlesSolved, but deliberately KEEPS lifetime puzzlesSolved and houseCompleted. The two endgame floors read that kept lifetime counter: canArmFinale tests `completedTotal >= FINALE_ARM_MIN_PUZZLES` (115), and applyPuzzleExposureGuard tests `puzzlesSolved < MIN_PUZZLES_FOR_PHASE[guarded]` (max 90). Anyone who finished cycle 1 has >= 117 lifetime solves, so from cycle 2 on both are satisfied on win one and isHouseCompleted() is already true — the only surviving gate is the eight-win dwell. Meanwhile storySpine measures its gates cycle-relative (`count = puzzlesSolved - cycleStartPuzzles`, GATES record:80 seeds:90 promise:96 returned:103 council:115), and line 207 returns 'council' early as soon as finaleArmed, bypassing the ORDER loop. Once the final board is won, lines 206 and 212-215 route permanently to 'after'/'reply' only, so those scenes can never be delivered. CYCLE_MICRO_BEATS is likewise cycle-relative with no phase gate. cycleStartPuzzles already exists for exactly this conversion and is used by resolveVictoryMicroBeat and storySpine — the endgame floors just never adopted it.

**Failure scenario**

Player finishes cycle 1 at 130 lifetime solves and starts New Cycle. In cycle 2 an engaged HARD+Challenge player accrues ~2.9 weighted progress per win (base 2.25 x getCycleAcceleration(1)=1.3), crossing PHASE_THRESHOLDS[4]=124 around cycle-relative win 43; the 90/115 floors never bind and houseCompleted is already true, so eight dwell wins arm the finale around win 51. council preempts, the final board is served, and record (gate 80), seeds (90), promise (96) and returned (103) never get a memory created — four of fourteen authored conversations silently deleted from the replay, with the Arrival ceremony permanently stripped of its keptPromise/keptRecord/standBeside variations and carriedRecord unearnable. A blind HARD player hits the 3.0 acceleration cap, arms around win 41, and also loses plan and shelter (gate 55) — six scenes. Micro-beats then fire out of order: beat 112 ('The house is quiet. It is not yet ready') lands sixty wins AFTER the arrival, and beat 115 fires in Phase 5. Even the slowest 1.0x NG+ player loses 106/112/115 to post-arrival.

**Evidence**

amberCurrency.ts:1848-1850 `export function canArmFinale(dwellCount, completedTotal) { return dwellCount >= FINALE_DWELL_PUZZLES && completedTotal >= FINALE_ARM_MIN_PUZZLES; }` fed from amberResult.puzzlesSolved (lifetime); :1977 `progress.cycleStartPuzzles = progress.puzzlesSolved;` with puzzlesSolved untouched. storySpine.ts:224 `const count = context.puzzlesSolved - (context.cycleStartPuzzles ?? 0);` vs :207 `if (context.finaleArmed && context.phase < 5 && !state.memories.council?.completed) return 'council';` above the ORDER loop at :232. phaseNarrative.ts:3290 has no phase/postRevelation suppression.

**Fix**

Convert both endgame floors to the cycle scale the story gates already use: pass `puzzlesSolved - (cycleStartPuzzles ?? 0)` into canArmFinale and applyPuzzleExposureGuard (keeping lifetime puzzlesSolved for milestones, unlock gates and the collection). Also reconsider the `houseComplete ||` shortcut at victoryPersistence.ts:293, which alone satisfies the outer endgame gate on win one of every later cycle. Optionally suppress CYCLE_MICRO_BEATS once postRevelation is set so a pre-arrival beat can never fire after the arrival.

---

### B9 — Home dialogue badges are computed from an uninitialised puzzle-count mirror on the first landing of every app launch

**Severity:** MEDIUM &middot; **Effort:** small

**Where:** `src/components/home/HomeScreen.tsx:991-1020, src/services/dialogueSession.ts:20, src/services/dialogueSession.ts:104-108, src/services/homeWorldData.ts:1509`

**What breaks**

dialogueSession.ts keeps the player's solve count in a module variable `let currentPuzzleCount = 0;` that it cannot read itself. Its only writers are recordVictory and updatePuzzleCount(progressData.puzzlesSolved) — which runs at HomeScreen.tsx:1020, AFTER getAnimalsWithStatus() has already been awaited in the Promise.all at line 991. getAnimalsWithStatus calls isOnCooldown -> getCooldownRemaining, which computes `getPuzzlesBetweenSessions(phase) - (currentPuzzleCount - session.puzzlesAtSessionEnd)`. On a cold start currentPuzzleCount is still 0 while puzzlesAtSessionEnd holds a real historical count, so the subtraction is negative and remaining is large: every resident past the grace period reads as on cooldown and hasNewDialogue is forced false. AnimalSprite gates the `!` badge on exactly `hasNewDialogue && !isOnCooldown`, so no badge renders. loadAllData's useCallback deps are stable and its effect runs once per mount, so nothing repairs it during that visit. (The sibling mirror updateSessionPhase was explicitly fixed for this same staleness class, which is strong evidence this is an oversight.) The failure is one-directional and deterministic from global phase >= 1, where getAnimalsWithStatus's own storage awaits guarantee the sessions cache has loaded first.

**Failure scenario**

An established player at phase 2 with 87 solves has talked to Ember and Panko previously, so their sessions carry puzzlesAtSessionEnd: 85. They cold-start the app; HomeScreen mounts and runs loadAllData. getAnimalsWithStatus resolves before updatePuzzleCount(87), so getCooldownRemaining returns 4 - (0 - 85) = 89 > 0 and isOnCooldown('fox') is true. Ember has three unread regular lines, but hasNewDialogue is false and no `!` badge is drawn on any resident. The player sees a house where nobody has anything to say and skips the story content that session. It self-heals on the next HomeScreen mount (any navigation away and back) or after any solve, and tapping an animal directly still opens normally — so the harm is discoverability, not lost content.

**Evidence**

Verified in source. HomeScreen.tsx:991 `const [progressData, roomsData, animalsData] = await Promise.all([getFullProgress(), getRoomsWithStatus(), getAnimalsWithStatus()]);` then :1019-1020 `// Update puzzle count for dialogue session system` / `updatePuzzleCount(progressData.puzzlesSolved);`. dialogueSession.ts:20 `let currentPuzzleCount = 0;` and :106 `const puzzlesSinceEnd = currentPuzzleCount - session.puzzlesAtSessionEnd;`

**Fix**

Hoist the mirror writes above the badge computation: `const progressData = await getFullProgress(); updatePuzzleCount(progressData.puzzlesSolved); updateSessionPhase(progressData.currentPhase); const [roomsData, animalsData] = await Promise.all([getRoomsWithStatus(), getAnimalsWithStatus()]);` and await loadDialogueSessions() before that too, so isOnCooldown never reads a cold mirror or an empty cache.

---

### B10 — House-completion Temple cinematic can play and self-acknowledge beneath an open home Modal, permanently consuming the game's biggest payoff

**Severity:** MEDIUM &middot; **Effort:** medium

**Where:** `src/components/home/HomeScreen.tsx:1225, src/components/home/HomeScreen.tsx:770, src/components/home/HomeScreen.tsx:1241, App.tsx:6209, src/services/amberCurrency.ts:1113`

**What breaks**

The deferred house-completion trigger gates only on the INTRO surfaces (`showIntroDialogue || introOverrideLines || introOpening || pendingAnimalIntroCount > 0 || activeHouseGift || giftOpening`) plus introSurfaceBusyRef, which adds only storyOverlayActive/showStoryInspection/quietLanding. None of HomeScreen's other surfaces are checked: the animal Dialogue Modal, Journal Hub, Shop, Quest modal, Room Unlock modal and Invite Prompt are all RN <Modal>s that render in their own native window above the root view tree, while PhaseTransitionOverlay is a plain root-level <View> at zIndex 1000. It is not suspended either, since HomeScreen's modals are not overlay requests in useGlobalOverlays, so overlayOwner resolves to 'ceremony'. HOUSE_COMPLETION_EVENT is not readAtOwnPace, so it auto-advances all five scenes (~22s) and calls onComplete -> ceremonyPlayback.complete() -> acknowledgeCeremony, which sets progress.houseCompletionCelebrated = true permanently. The animal-tap path is worse than a race: handleAnimalPress synchronously sets giftOpening (a dep), cancelling the pending timer, then the no-gift branch clears introSurfaceBusyRef and awaits handleRegularAnimalTap while setGiftOpening(false) runs in the finally AFTER the dialogue is already open — arming a FRESH 650ms timer with the Modal up, so the ceremony fires beneath it deterministically. The Journal/Quest/Shop modals flip state that appears in neither the deps nor the ref, so they do not even cancel the running timer.

**Failure scenario**

A player whose house is whole lands on home at Phase 4 with the Temple ceremony owed. loadAllData sets pendingHouseCompletion; within the ~650ms window (or while loadAllData is still resolving, when the paint-ahead snapshot already makes animals tappable) the player taps a resident with a lit `!` badge or opens the Journal Hub. The Modal opens above the root view; the timer fires, its guard never looks at dialogueFlow.showDialogue, and HOUSE_COMPLETION_EVENT plays entirely underneath. The player hears the swell and feels the haptics but sees only the dialogue card; ~22s later the cinematic self-completes and acknowledgeCeremony('0:house:4') sets houseCompletionCelebrated = true. The payoff for the whole ~4,615-amber house arc is gone forever and cannot be replayed.

**Evidence**

HomeScreen.tsx:1225 `if (showIntroDialogue || introOverrideLines || introOpening || pendingAnimalIntroCount > 0 || activeHouseGift || giftOpening) return;` and :770 `introSurfaceBusyRef.current = giftSurfaceRef.current || showIntroDialogue || !!introOverrideLines || introOpening || pendingAnimalIntroCount > 0 || storyOverlayActive || showStoryInspection || quietLanding;` (no dialogueFlow.showDialogue, no showJournalModal, no showQuestModal, no unlockFlow.*). HomeScreen.tsx:4032's own comment — 'Modal so it renders above the journal hub Modal' — confirms the layering. amberCurrency.ts:1113 `if (completed.kind === 'house') progress.houseCompletionCelebrated = true;`

**Fix**

Gate the fire-time check on the value HomeScreen already computes for App — `localOverlayActive` (HomeScreen.tsx:2217) via a ref — instead of the intro-only introSurfaceBusyRef, and add it (or dialogueFlow.showDialogue plus the modal flags) to the effect's dependency list so opening a modal re-arms rather than races. Belt and braces: have App suppress showHouseCeremony()/showPendingCeremony() while homeOverlayActive is true and re-fire when it clears.

---

### B11 — One-time victory receipts burn their durable flag at resolve time, then die unshown in the cleared toast queue

**Severity:** MEDIUM &middot; **Effort:** medium

**Where:** `App.tsx:3096-3102, App.tsx:3145, src/services/phaseNarrative.ts:2996-3001, src/services/cosmeticReceipts.ts:87-88, App.tsx:553-560, App.tsx:1981`

**What breaks**

consumeFirstImperfectStarsReceipt writes FIRST_IMPERFECT_STARS_SEEN_KEY = 'true' BEFORE returning the line, and consumeCosmeticFirstShowing calls markReceipted(id) before returning the name. Both then hand the line to the sequential victory toast queue, which shows its first entry only after VICTORY_TOAST_INITIAL_DELAY_MS (600ms) and holds each for VICTORY_TOAST_DURATION_MS (1900ms). Every victory-exit path calls clearVictoryToastQueue(), which empties the array, kills the timer and nulls the receipt with no attempt to re-arm or un-consume anything. This is the exact class the codebase already fixed elsewhere — the preview-graduation card was re-keyed to _v2 for it, and post-victory Fox intros deliberately mark seen on DISMISSAL — but these producers mark at decision time. (Note the milestone hint grant is NOT lost, only its toast: grantBonusHint credits durably. consumeVariantNudge is day-scoped and self-heals. The permanent losses are the two once-ever flags.)

**Failure scenario**

Player wins puzzle #50 with 2 stars — their first sub-3-star win ever — while a freshly bought confetti palette is equipped. Three receipt toasts queue (first-imperfect-stars, hint grant, cosmetic first-showing) and would show at ~600ms / ~2500ms / ~4400ms. Because the cosmetic `.then` chain is the last rank-0 enqueuer, its line is scheduled at ~2500ms or later whenever any other receipt shares the win. An ordinary NEXT LEVEL tap at ~2s runs startVictoryExitFlow -> clearVictoryToastQueue and drops the remaining toasts, yet wordshift_first_imperfect_stars_seen and wordshift_cosmetic_receipt_<paletteId> are already 'true'. Neither beat can ever fire again on that device: the player is never told what cost them the star (the ftue-7 receipt), and never gets the one-time naming of the palette they paid amber for. With Reduced Motion on, the entrance is instant and NEXT LEVEL is live from frame one, so even a single queued receipt is lost to a ~400ms tap.

**Evidence**

phaseNarrative.ts:2996-3001 verified: `if ((await AsyncStorage.getItem(FIRST_IMPERFECT_STARS_SEEN_KEY)) === 'true') return null; await AsyncStorage.setItem(FIRST_IMPERFECT_STARS_SEEN_KEY, 'true'); ... return getFirstImperfectStarsMessage(...)`. cosmeticReceipts.ts:87-88 `await markReceipted(id); return item.name;`. App.tsx:553-560 clearVictoryToastQueue empties the queue unconditionally; App.tsx:1981 calls it inside startVictoryExitFlow.

**Fix**

Make the consumers two-phase like the post-victory intros: have the helpers PEEK (resolve the line without writing the flag) and expose a separate markX() that showNextVictoryToast calls at the moment the line is assigned to setVictoryReceipt. Equivalently, give queue entries an optional onShown commit callback and have clearVictoryToastQueue discard un-shown entries without running it. Note markReceipted also writes its in-memory seenCache before the storage write, so that cache write must move into the commit half too or the receipt stays suppressed for the session.

---

### B12 — New Cycle never clears the in-progress puzzle save, and restorePuzzleState pins the snapshot's phase as the live narrative phase

**Severity:** MEDIUM &middot; **Effort:** small

**Where:** `src/services/resetStorage.ts:36-41, src/hooks/usePuzzleGame.ts:3321, App.tsx:462-464, App.tsx:2066, App.tsx:1366, App.tsx:2135`

**What breaks**

(a) commitNewCycle wipes only NEW_CYCLE_NARRATIVE_KEYS — acquaintance, dialogue_sessions, narrative_delivery, dialogue_choices, micro_beats_seen, cycle_beats_seen, offering_requests. wordshift_in_progress_puzzle is NOT in it, even though it is a cloud-synced key that commitFullLocalReset DOES clear. startNewCycle never reaches it either, rebuildSessionFromStorage only calls the in-memory clearBoard(), useAutosave only ever writes, and handleGoHome clears the save on disk only for the unbrokenWeaveMode branch. So the first PLAY of the bright re-descent restores the abandoned dread board. (b) restorePuzzleState then does `setCurrentPhase(saved.currentPhase)`, and App's one-way sync effect depends on [persistence.currentPhase, setPuzzlePhase] — neither of which changes because a board was restored — so the hook's narrative phase stays pinned to the save's value. Because App.tsx:1366 threads the stale hook phase into every subsequent autosave, even a relaunch re-applies it. The hook's currentPhase drives nearly all board copy (start/loading/move/combo/invalid/hint/locked/incantation) plus two behavioural gates: the echo-puzzle gate `currentPhase >= 3` and isUnbrokenWeaveAvailable.

**Failure scenario**

Path A (NG+): a phase-5 board is abandoned via Home; New Cycle resets persistence to phase 0; PLAY restores that board and re-pins the hook to 5. The 'bright days' re-descent opens on the abandoned VOID/DOOM board mid-move with phase-5 copy, and for the whole session every 5th standard board is served as an echo board seeded from the player's dread ritual words. Path B (first playthrough, no NG+ needed): the player wins into pendingPhaseTransition=3, leaves the pit without offering, plays and abandons another board at phase 2, then returns and confirms phase 3 at the ward. PLAY restores that board and sets the hook phase back to 2 — Growing Shadows boards speak in Phase-2 voice and echo boards never fire, until the board is finished or the next real phase advance.

**Evidence**

resetStorage.ts:36-41 verified: NEW_CYCLE_NARRATIVE_KEYS contains no 'wordshift_in_progress_puzzle'. usePuzzleGame.ts:3321 `setCurrentPhase(saved.currentPhase);` inside restorePuzzleState. App.tsx:462-464 `useEffect(() => { setPuzzlePhase(persistence.currentPhase); }, [persistence.currentPhase, setPuzzlePhase]);`. App.tsx:2135 `puzzleActions.clearBoard();` in rebuildSessionFromStorage with no clearPuzzleState().

**Fix**

(a) Add 'wordshift_in_progress_puzzle' to NEW_CYCLE_NARRATIVE_KEYS (or await clearPuzzleState() inside the new_cycle transaction) so the abandoned board dies with the cycle. (b) Do not let a save snapshot author the live narrative phase: drop `setCurrentPhase(saved.currentPhase)` (App's sync effect already supplies the world phase), or have App re-assert setPuzzlePhase(persistence.currentPhase) immediately after every restorePuzzleState call site. (c) Gate restoreUnbrokenWeave on the LIVE phase/postRevelation rather than `saved.currentPhase === 5`, so a killed weave board cannot re-arm the apex mode at phase 0.

---

### B13 — Five reward services credit amber/hints and write their receipt in two separate unjournaled commits, with the receipt write swallowed

**Severity:** MEDIUM &middot; **Effort:** large

**Where:** `src/services/achievements.ts:768-787, src/services/dailyLoginReward.ts:157-162 + :75-83, src/services/dailyChallenge.ts:492-499, src/services/shareResults.ts:416-426, src/components/ui/SacrificeModal.tsx:120-126 + src/services/sacrifice.ts:406-411`

**What breaks**

Five reward paths split the credit and its receipt across two independent durable writes with no shared transaction, and swallow at least one of the two failures. (1) achievements.ts writes unlockedIds via raw AsyncStorage, THEN calls awardBonusAmber, and catches BOTH — since the loop skips any id already in unlockedIds, a lost credit (10-150 amber, batched, so several hundred at once) is never retried; conversely if the ids write fails while the credit succeeds, the next cold start re-unlocks and re-credits. (2) dailyLoginReward credits first, then writes lastClaimedDate with a raw setItem whose failure is swallowed AND whose cache is set before the write — a lost receipt re-grants 10-75 amber (plus the +50 comeback bonus once the gap grows) on every launch until a write succeeds. (3) dailyChallenge.grantFirstDailyMercy calls addHints (its own committed transaction) then writes firstDailyMercyGranted separately and swallows — duplicated free hints, which are a real-money purchasable good. (4) shareResults writes the wordshift_share_bonus_date marker BEFORE awarding and catches all failures — the inverse of the crash-safe ordering used everywhere else, so the day is burned with no amber and no retry. (5) SacrificeModal spends amber then calls performSacrifice, and saveSacrificeState sets its cache first and swallows the write — the altar announces a monument total and tier-up that may never have been saved.

**Failure scenario**

Representative worst case (achievements): the player finishes the board that unlocks max_stack ('The Full Arrangement', 150 amber). The unlockedIds write succeeds; the app is killed inside the window before awardBonusAmber's journal key lands. On relaunch Statistics shows the crest unlocked, `progress.unlockedIds.includes('max_stack')` makes the loop `continue`, and the 150 amber is never credited and never retried — with no unclaimed-reward ledger for achievements, unlike quests and the season pass. A storage-error failure (not a timing accident) produces the same permanent forfeit deterministically, because the awardBonusAmber rethrow is dropped at the call site.

**Evidence**

achievements.ts:768-787 `progressCache = progress; try { await AsyncStorage.setItem(STORAGE_KEY, ...) } catch (err) { console.warn(...) } ... try { await awardBonusAmber(totalReward, 'achievement'); } catch (err) { console.warn(...) }` with :756 `if (progress.unlockedIds.includes(achievement.id)) continue;` as the only gate. dailyLoginReward.ts:75-83 `async function save(state) { cache = state; try { await AsyncStorage.setItem(...) } catch { /* Non-critical */ } }`. shareResults.ts:2 imports raw AsyncStorage; :418 setItem before :422 awardBonusAmber. sacrifice.ts:406-411 same cache-before-write-and-swallow shape.

**Fix**

Move each module onto ./persistenceStorage and put the credit and its receipt in ONE runStorageTransaction, mirroring the sibling implementations that already do it (dailyAmberReward.ts:144, supporterStipend.ts:111, seasonPass.claimSeasonTierInTransaction, iap.ts:546). Concretely: achievements -> runStorageTransaction('achievement_unlock') writing unlockedIds plus awardBonusAmberInTransaction; dailyLoginReward -> runStorageTransaction('daily_login_claim'); grantFirstDailyMercy -> runStorageTransaction('first_daily_mercy') using addHintsInTransaction; shareResults -> runStorageTransaction('daily_share_bonus') (do NOT simply reorder award-then-marker, which would allow repeat claims); sacrifice -> a commitSacrifice() service function. In every case stop setting the cache before the commit succeeds and let the error propagate so callers can route it through saveWithPlayerRetry.

---

### B14 — Echo boards skip the vocabulary-fairness gate and the speed-mode guard that every other delivery path applies

**Severity:** MEDIUM &middot; **Effort:** small

**Where:** `src/hooks/usePuzzleGame.ts:1476-1485, src/hooks/usePuzzleGame.ts:1600-1603, src/services/puzzleBank.ts:275-281, src/services/puzzleBank.ts:691, src/hooks/usePuzzleGame.ts:1589`

**What breaks**

The echo-puzzle branch applies extendStandardPuzzle with two guards missing that every sibling path has. (a) Vocabulary: extendStandardPuzzle picks the appended row from the FULL 22,749-word dictionary and validates only with COMMON_WORDS, so it accepts the 1,658 OBSCURE and 977 ADVANCED words that isFairPuzzleWord forbids from ever being FEATURED. The bank path wraps the call in `extended.words.length === base.words.length + 1 && isPuzzleVocabularyFair(extended, advanced)`; the echo path checks only that the row count grew. Replaying the real extendStandardPuzzle over the shipped banks, 13-26% of successful extensions require a banned word (MIDS, GRIDES, NOTHER, COMBE, HAVER, LIKER, INKER, UNDOER, PEOPLER, FOAMILY, MATTERY); on EXPERT the banned word is the ONLY valid completion in 7 of 8 cases. (b) Speed: puzzleBank.ts:691 (`// Never lengthen a board played against a clock`) and usePuzzleGame.ts:1589 both refuse extension while speedMode is armed; the echo branch has no such term. Speed is a modifier, not a variant, so a speed board reaches the echo branch as variant 'standard', and getSpeedTimeLimit derives the clock purely from difficulty and style with no awareness of row count. (Lexicon boards are protected — both call sites are gated by !requestedLexicon — and the on-device fallback at 1600 is near-dead now that all 30 families are bank-served, so essentially all exposure is the echo path.)

**Failure scenario**

Vocabulary: player at Phase 3+ past 70 solves hits an echo board (every 5th standard board). extendStandardPuzzle appends a row whose canonical final move forms an ADVANCED/OBSCURE word — e.g. HARD board PLIES/HAVES/SOLES/REIGN/RAGED extends to a step forming GRIDES, a board the bank path discards outright. On EXPERT the appended rows require FOAMILY, PEOPLER, MATTERY with no fair alternative, costing invalid attempts and stars while the hint highlights the drop slot for the banned formation. Speed: the same player with Speed armed gets a 6-row HARD board on the 48s five-row clock (trimmed 5s per consecutive win down to the 30s floor), losing the run and the speedRound escalation.

**Evidence**

usePuzzleGame.ts:1476-1484 `const extendedEcho = puzzlesSolved >= PUZZLE_EXTENSION_UNLOCK_PUZZLES ? extendStandardPuzzle(echoPuzzle) : echoPuzzle; ... if (puzzlesSolved < PUZZLE_EXTENSION_UNLOCK_PUZZLES || extendedEcho.words.length === echoPuzzle.words.length + 1) { commitNewBoard(...) }` — no fairness check, no speed term. Contrast puzzleBank.ts:278-281 `const result = extended.words.length === base.words.length + 1 && isPuzzleVocabularyFair(extended, ...) ? extended : null;` and usePuzzleGame.ts:1586-1589 `puzzlesSolved >= PUZZLE_EXTENSION_UNLOCK_PUZZLES && /* Never lengthen a board that is being played against a clock */ !speedModeRef.current &&`.

**Fix**

Add both guards at usePuzzleGame.ts:1476 (and mirror at :1600): skip extension entirely when `speedModeRef.current`, and require `isPuzzleVocabularyFair(extendedEcho, requestedDifficulty === 'EXPERT' || requestedLexicon)` alongside the length check before committing — falling through to the bank pool when it fails, exactly as the length check already does. Keep the grew-by-one requirement scoped to the non-speed case so a speed echo board is not rejected for failing to grow.

---

### B15 — Quest 'watch to double it' reward is fire-and-forget: a failed grant is silently lost with the built-in retry machinery bypassed

**Severity:** MEDIUM &middot; **Effort:** small

**Where:** `src/components/home/HomeScreen.tsx:3339, src/components/home/HomeScreen.tsx:2162-2172, src/components/monetization/RewardedAdButton.tsx:194-222, src/services/amberCurrency.ts:2375-2379`

**What breaks**

RewardedAdButton has a full retention contract for a reward the player already paid for with their time: it awaits earnedReward.current() and, on a throw, keeps the grant and flips the button into a 'Retry reward' state that re-saves WITHOUT another ad. Every other placement honours it — StoreModal passes `onReward={handleClaimDailyAmber}` plus completeAfterUnmount, the rewarded hint goes through saveWithPlayerRetry, the victory double holds a durable receipt. The quest double is the ONLY call site that wraps onReward in a void arrow with `.catch(() => {})`, so the await resolves in the same tick, the button always sees success, and the retry path can never engage. It also passes no onRewardError, canStart, onBusyChange or completeAfterUnmount. Worse, handleDoubleQuestReward calls setDoubleQuestOffer(null) BEFORE awaiting awardBonusAmber, so the button is already unmounted by the time the write is attempted — even returning the promise would not restore the retry state. awardBonusAmber genuinely rethrows on failure, and the swallow suppresses reportError too, so the loss is invisible to both the player and telemetry.

**Failure scenario**

Player claims a completed weekly quest (+140 amber), taps 'Watch to double it +140' and sits through the full rewarded ad. The grant's storage transaction fails before its journal key lands (a stagedReadFailure inside the transaction, or the commit setItem failing on a full device). The rejection is eaten by `.catch(() => {})`: no amber credited, no error, no RewardReveal animation, and the button is already gone so the 'Retry reward' affordance can never appear. The ad slot was already counted against the shared rewarded daily cap. The player watched a full ad for nothing with no way to recover it. (If the failure lands after the journal write, boot recovery does eventually credit it — silently, with a stale balance until then.)

**Evidence**

HomeScreen.tsx:3339 verified: `onReward={() => { handleDoubleQuestReward().catch(() => {}); }}` — the only onReward in the file. HomeScreen.tsx:2162-2172 verified: `setDoubleQuestOffer(null); const newBalance = await awardBonusAmber(amber, 'quest_bonus');`. RewardedAdButton.tsx:206-222 `if (earnedReward.current) { await earnedReward.current(); ... } catch (error) { setRetryReward(earnedReward.current !== null); setErrorLabel(...); onRewardError?.(error); }`. rewardedAdCompletion.test.tsx:136 pins the retry contract in isolation, so it does not cover the one call site that opts out of it.

**Fix**

Pass the async handler through (`onReward={handleDoubleQuestReward}`), add `completeAfterUnmount` and `onRewardError`, wrap the credit in saveWithPlayerRetry with the daily-amber copy ('You do not need to watch another clip'), and move setDoubleQuestOffer(null) to AFTER the credit commits so the button and its Retry state survive a failed write.

---

### B16 — Whisper gallery's 500-entry chronological cap evicts the one-time dialogue-choice answers and early whispers

**Severity:** MEDIUM &middot; **Effort:** medium

**Where:** `src/services/whisperGallery.ts:157-160, src/hooks/useVictoryOrchestration.ts:247, src/services/phaseNarrative.ts:2038 + :2104, src/hooks/useDialogueFlow.ts:1725`

**What breaks**

recordWhisper keeps only the newest 500 entries (`state.entries = state.entries.slice(-500)`), evicting the OLDEST first, and nothing prunes by kind. The authored corpus alone exceeds that: 364 animal whispers + 130 Phase-2 exhaustion lines + 260 post-revelation lines + ~65 Tending milestone lines + 13 choice callbacks + 13 choice answers + offering milestones is roughly 850 recordable entries. The endgame then adds unbounded unique entries: getWhisperChance returns 1 for phase >= 5, so EVERY post-revelation win fires a whisper, and getPersonalizedPhase5Whisper interpolates a random ritual word into the text 65% of the time — and generateEntryId hashes animalType:type:text, so each is a fresh id. The entries at the eviction front are the irreplaceable ones: the 13 dialogue-choice answers (recorded once at answer time; getChoiceForAnimal/recordChoice guarantee a choice is offered and answered exactly once per cycle, and startNewCycle does not clear wordshift_dialogue_choices, so the response text can never be re-recorded) and every phase 0-4 whisper. The gallery is the only surface holding them: storyArchive walks only phases 0-4 of ALL_DIALOGUES and cannot show pool lines. ('passage' entries self-heal, since a shuffled re-read re-records them.)

**Failure scenario**

A completionist reaches post-revelation around solve ~120 with ~60-90 entries including all 13 phase 3-4 choice answers, then keeps playing the Tending loop (the documented soft-infinite endgame; MILESTONE_BONUSES runs a repeating tail to 930 solves). Each win adds ~0.6-0.8 net-new entries, so the cap is crossed somewhere between ~250 and ~500 post-revelation solves and eviction begins from the front. The phase 3-4 choice answers and every early whisper are sliced off and overwritten by procedurally reworded Phase-5 whispers. Opening the Whisper Gallery shows only recent phase-5 chatter; the choice answers are unrecoverable, and a New Cycle cannot re-earn them because the choice record survives the cycle.

**Evidence**

whisperGallery.ts:157-160 `if (state.entries.length > 500) { state.entries = state.entries.slice(-500); state.seenIds = state.entries.map(e => e.id); }`. useVictoryOrchestration.ts:247 `if (phase >= 5) return 1;`. phaseNarrative.ts:2038 `const word = ritualWords[Math.floor(Math.random() * ritualWords.length)].toUpperCase();` and :2104 `if (Math.random() < 0.65) { ... }`.

**Fix**

Make the cap kind-aware instead of purely chronological: protect the finite, one-time kinds ('choice', 'keepsake', and pre-phase-5 'whisper') from eviction and cap only the unbounded producer — e.g. evict the oldest phase-5 'whisper' entry before touching anything else. Additionally, stop minting a fresh id per personalized whisper by hashing the TEMPLATE rather than the word-substituted text, which caps that producer at its authored size.

---

### B17 — The resident dialogue bubble's accessibilityLabel suppresses the spoken dialogue text on both platforms

**Severity:** MEDIUM &middot; **Effort:** medium

**Where:** `src/components/home/HomeScreen.tsx:2858-2873, src/components/home/HomeScreen.tsx:1312`

**What breaks**

The dialogue body is wrapped in a TouchableOpacity carrying `accessibilityRole="button"` and `accessibilityLabel="Show full line"`, with DialogueBody as its only text child. TouchableOpacity renders accessible={true} by default. On iOS, RCTViewComponentView.accessibilityLabel returns the explicit label when set and only falls through to RCTRecursiveAccessibilityLabel when absent, so the label REPLACES the child text. On Android, setAccessibilityLabel sets the ViewGroup's contentDescription, which TalkBack reads instead of descending into children. `disabled={!revealInProgress}` does not remove the element, it only adds accessibilityState.disabled. The three OTHER DialogueBody surfaces — the intro/override card, the journal spotlight and FoxGuide — wrap it in a plain <View> and read fine; only the main resident card is affected, and that is the surface the entire regular conversation corpus is delivered through. Nothing announces the line either: HomeScreen's only announceForA11y call is for cooldownMessage.

**Failure scenario**

A VoiceOver or TalkBack player taps Ember in the Cozy Den. The nameplate announces 'Ember', then focus moves to the bubble and the reader says 'Show full line, button'. The actual dialogue — the 1,742-line base corpus, the 260 post-revelation lines, the Phase-2 exhaustion pool and the ~65 Tending lines — is never spoken on either platform. Swiping past the bubble goes straight to the Next/Close bevel. The player can advance the story but can never hear it. (Introductions, the journal spotlight and FoxGuide copy are unaffected.)

**Evidence**

HomeScreen.tsx:2858-2873 `<TouchableOpacity style={styles.dialogueBubble} activeOpacity={0.85} disabled={!dialogueFlow.revealInProgress} onPress={dialogueFlow.completeReveal} accessibilityRole="button" accessibilityLabel="Show full line"> ... <DialogueBody text={dialogueFlow.revealedText} .../> </TouchableOpacity>`. RN iOS: `- (NSString *)accessibilityLabel { NSString *label = super.accessibilityLabel; if (label) { return label; } ... }`

**Fix**

Take the accessible name off the text container: leave the wrapper label-less (so the recursive child label survives) and expose tap-to-skip via accessibilityActions, matching the pattern StorySceneModal and DialogueChoicePage already use, plus announceForA11y(page text) when a reveal completes. NOTE: five Playwright specs select this bubble with getByRole('button', { name: 'Show full line', exact: true }) — e2e/sequential-conversations.spec.ts:50/97/157 and e2e/conversation-shortcut.spec.ts:66/79 — and must be updated in the same change.

---

### B18 — Interstitial can present over a live puzzle board: showInterstitial awaits a fresh 12s preload after the exit already served the next game

**Severity:** MEDIUM &middot; **Effort:** small &middot; **verifiers split**

**Where:** `src/services/providers/googleAdMobAds.ts:417-425, src/services/providers/googleAdMobAds.ts:37, src/services/providers/googleAdMobAds.ts:165, App.tsx:4351, App.tsx:4354-4357`

**What breaks**

maybeShowVictoryInterstitial is deliberately fire-and-forget ('the ad overlays the transition') — the promise is never awaited before startVictoryExitFlow synchronously runs puzzleActions.handleNextLevel() and serves the next board. But the provider's showInterstitial is not bounded to that transition window: when no interstitial is cached it does `await preload('interstitial')`, and preload resolves only on LOADED, ERROR, or a setTimeout(finish, OP_TIMEOUT_MS) with OP_TIMEOUT_MS = 12000. It then calls present(ad) unconditionally, with no check that the player is still mid-transition, on which screen, or whether a new board is in play, and nothing in ads.ts or App.tsx re-validates the gate after the promise resolves. Because preload is never retried after a failure, ANY earlier no-fill leaves the slot empty — a perfectly normal 1-3s inline fill already misses the window, so this does not need a pathological network.

**Failure scenario**

Player on a weak connection at phase 1 finishes win 18 (cadence gap met). The boot preload had errored with no-fill, so slots.interstitial.loaded is null. Next Level is tapped: the exit flow immediately clears the board and serves puzzle 19. Meanwhile showInterstitial sits in `await preload('interstitial')` for several seconds, the ad finally loads, and ad.show() fires a fullscreen interstitial on top of a board the player has already picked up a letter on. The board survives behind the ad (no state loss), but the placement is disruptive and carries AdMob policy exposure for interrupting gameplay.

**Evidence**

googleAdMobAds.ts:417-425 `async showInterstitial() { if (!ready || !mod) return false; if (!slots.interstitial.loaded) { await preload('interstitial'); if (!ready || !slots.interstitial.loaded) return false; } const ad = slots.interstitial.loaded; slots.interstitial.loaded = null; const result = await present(ad, 'interstitial'); ... }` with :37 `const OP_TIMEOUT_MS = 12000;` and :165 `const timer = setTimeout(finish, OP_TIMEOUT_MS);`. App.tsx:4351 `const adShown = storyWillPresent ? false : maybeShowVictoryInterstitial();` followed at 4354-4357 by startVictoryExitFlow(() => { ...; puzzleActions.handleNextLevel(); }).

**Fix**

Only present an ALREADY-cached interstitial on the exit path: when slots.interstitial.loaded is null, return false immediately and just kick `void preload('interstitial')` for next time. If an inline fill is wanted, give showInterstitial a short presentation deadline (~1.5s) separate from the 12s load budget so an ad that misses the transition window is dropped rather than shown over gameplay.

---

### B19 — Speed clock keeps draining under blocking in-app surfaces the game itself opens (Practice lesson, out-of-hints alert, Store)

**Severity:** MEDIUM &middot; **Effort:** small

**Where:** `App.tsx:1101, App.tsx:5758, App.tsx:4015-4031, App.tsx:4024, App.tsx:6281, App.tsx:6292, App.tsx:1089`

**What breaks**

The speed clock's in-app hold is `useSpeedTimer(onSpeedTimeUp, puzzle.showDifficultyMenu || puzzle.showRules)` — the pause set is the setup menu and the How-to-Play sheet ONLY. Three other blocking full-screen surfaces raised over a LIVE board are missing. (a) The RulesModal practice CTA is `onPractice={lesson => { puzzleActions.setShowRules(false); setPracticeLesson(lesson); }}`: it CLOSES Rules (flipping paused false, so useSpeedTimer's effect calls resumeTicking and restarts the interval from the banked budget) and opens PracticeModal, a blocking Modal that appears nowhere in the pause predicate. (b) handleOutOfHints fires from an ordinary HINT press with an empty balance and shows a blocking GameAlertModal, and (c) its 'Get hints' button opens StoreModal — neither alertPending nor showStoryModal is in the predicate. Worse, onSpeedTimeUp calls clearPuzzleState(), so the board's autosave is destroyed while the tutorial or store is still up, and the Time's Up overlay is suppressed behind the higher-priority practice overlay.

**Failure scenario**

Player at 55+ solves with Speed on starts a HARD board (48s). Mid-board with ~30s left they tap '?' -> Rules opens and the clock correctly suspends. They tap 'Practice Double Shift' -> Rules unmounts, paused goes false, resumeTicking restarts the 30s countdown, and PracticeModal covers the screen. They work the two-step lesson for ~45s. At 0s onSpeedTimeUp fires behind the card (they only hear soundInvalidMove plus a warning haptic), gameState flips to GAME_OVER and clearPuzzleState() erases the autosave. Closing practice reveals 'Time's Up' with a rewarded-ad rescue, Try Again, or Home — the run is lost to the game's own help surface, recoverable only by watching an ad. The same drain happens while reading the out-of-hints alert and browsing the Store it opens.

**Evidence**

App.tsx:1101 `puzzle.showDifficultyMenu || puzzle.showRules,` is the complete pause set. App.tsx:5758 `onPractice={lesson => { puzzleActions.setShowRules(false); setPracticeLesson(lesson); }}`. App.tsx:4842 `practice: practiceLesson !== null,` and 4837 `alert: alertPending,` prove both are blocking overlay owners; App.tsx:6281/6292 are their mount sites. App.tsx:1089 `clearPuzzleState().catch(() => {});` inside onSpeedTimeUp.

**Fix**

Derive the hold from the overlay scheduler rather than a hand-listed pair: `useSpeedTimer(onSpeedTimeUp, puzzle.showDifficultyMenu || puzzle.showRules || overlayOwner !== null)`. That covers practice, alert, store, patron, saving and ceremony in one predicate and cannot drift as new overlays are added. The hook already banks and restores the remaining seconds, so nothing else changes. Note appIntegration.test.ts:897 source-pins the current predicate and must be updated.

---

### B20 — Daily-streak milestone amber re-pays every time a decayed streak re-crosses a threshold it already collected

**Severity:** MEDIUM &middot; **Effort:** small

**Where:** `src/services/dailyChallenge.ts:698-701, src/services/dailyChallenge.ts:568-574, src/services/victoryPersistence.ts:329-330`

**What breaks**

checkDailyStreakMilestone decides a payout purely from the crossing test `currentStreak >= milestone.days && previousStreak < milestone.days`, with no record of which milestones have already been paid. Its sibling, the puzzle-count milestone, does the opposite: checkMilestone filters on `m.puzzles > claimed` against a persisted lastClaimedMilestone. DailyChallengeProgress has no equivalent field. The decay branch uses a strictly-less-than checkpoint — `DAILY_STREAK_MILESTONES.map(m => m.days).filter(d => d < priorStreak).pop() ?? 0` — so a lapse at a streak of EXACTLY a milestone value (3, 7, 14, 21, 30) drops the player a full rung below an already-paid threshold (7 -> 3, 14 -> 7, 21 -> 14, 30 -> 21), and the re-climb re-pays it. (A lapse strictly between milestones parks exactly ON the last one, where the strict `<` test correctly refuses — which is why this has gone unnoticed.) victoryPersistence credits whatever it returns, unconditionally.

**Failure scenario**

Daily streak reaches 7 on 2026-06-10, paying the +30 milestone. The player skips 2026-06-11 with no banked freeze. On 06-12 the decay branch runs: priorStreak 7, checkpoint 3, currentStreak = 3. Dailies on 06-13/14/15 climb to 4/5/6 with no payout. On 06-16 the streak reaches 7 with beforeStreak 6, checkDailyStreakMilestone(7, 6) returns milestone 7 again, and awardBonusAmberInTransaction credits a second +30. Repeating skip-then-four-dailies pays 30 amber per 5 calendar days (minus roughly one absorbed cycle per 14 days when the free freeze regrants), against a ladder a never-lapsing player collects exactly once (270 total). The dominant real-world case is incidental rather than exploitative: an ordinary player who misses a day right after a milestone silently collects a duplicate. Amber is reward-only, so pacing and story are unaffected — this is economy leakage plus an incentive inversion where skipping pays more than an unbroken streak.

**Evidence**

dailyChallenge.ts:698-701 `for (const milestone of DAILY_STREAK_MILESTONES) { if (currentStreak >= milestone.days && previousStreak < milestone.days) { return { amber: milestone.amber, ... } } }` — no claimed-milestone parameter. dailyChallenge.ts:568-574 `const checkpoint = DAILY_STREAK_MILESTONES.map(m => m.days).filter(d => d < priorStreak).pop() ?? 0; progress.currentStreak = Math.max(1, checkpoint);`

**Fix**

Persist a never-lowered high-water mark on DailyChallengeProgress (`lastClaimedStreakMilestone: number`, or a claimedStreakMilestones array) and pass it into checkDailyStreakMilestone so a milestone pays at most once, mirroring checkMilestone(puzzleCount, lastClaimedMilestone). Record the claim inside the same runStorageTransaction('victory') that credits the amber. Separately fix the off-by-one in the decay checkpoint (use `<=` so a streak of exactly 21 parks at 21, not 14).

---

### B21 — Quest seed is an order-independent character sum, so only 19 daily and 13 weekly quest sets exist per year on a 9-day cycle

**Severity:** MEDIUM &middot; **Effort:** small

**Where:** `src/services/weeklyQuests.ts:354-360, src/services/dailyChallenge.ts:166-171`

**What breaks**

makeSeededRandom derives its LCG seed with `seedStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)` — an order-independent SUM. The only varying part of the period id is the numeric tail, so any two dates (or ISO weeks) whose digits sum equally produce an identical seed, an identical deterministic Fisher-Yates shuffle of the filtered template pool, and the identical 5 selected quests. Because the digit sum increments by exactly 1 per day and resets at every 09 -> 10 rollover, the daily set repeats on a clean 9-DAY cycle within a month; the weekly tier likewise cycles every 9 weeks. Across 2026 that is 19 distinct daily sets for 365 days and 13 distinct weekly sets for 52 weeks. This is NOT the hash the daily board uses — dailyChallenge.seededRandom uses an order-dependent `((hash << 5) - hash) + char` and is healthy (365 distinct rolls in 2026); only the quest seeder has the collision.

**Failure scenario**

Replaying the shipped generator in Node: 2026-09-01, 2026-09-10 and 2026-09-19 all seed identically and produce the same five dailies ('Step Up | Hard Day | Backward Steps | Amber Seeker | Five-Fold'); 2026-09-06 / 09-15 / 09-24 / 08-16 are another group; weeks 2026-W05/W14/W23/W32/W41/W50 share one weekly board. A player sees the same weekly challenge set five to six times a year and the same daily quest board roughly every nine days, in a system documented as '5 daily + 5 weekly rotating quests'. Nothing is corrupted (quest ids embed the period id, so period rollover still regenerates correctly and rewards are unaffected) — the loss is content variety and the retention value of rotation. Back-to-back days never collide, which is why it has survived unnoticed.

**Evidence**

weeklyQuests.ts:354-360 `function makeSeededRandom(seedStr: string): () => number { let seed = seedStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0); ... }` called as makeSeededRandom(periodId + tier). Contrast dailyChallenge.ts:166-171, which uses the order-dependent `hash = ((hash << 5) - hash) + char`.

**Fix**

Seed makeSeededRandom with the same order-dependent string hash the daily board already uses (`hash = ((hash << 5) - hash) + char; hash |= 0;`), or mix position into the reduce (`acc * 31 + c.charCodeAt(0) | 0`). Land it on a period boundary, since it changes which quests a given period draws; the same-period determinism the existing tests pin is preserved.

---

### B22 — Settings 'Restore Purchases' discards the store error and reports either 'no purchases found' or a false success

**Severity:** MEDIUM &middot; **Effort:** small

**Where:** `src/components/SettingsScreen.tsx:449-458, src/services/iap.ts:706-720, src/components/monetization/PatronModal.tsx:318-322`

**What breaks**

iap.restorePurchases() never throws for a store-side failure; it returns `{ entitlements, error }` with error set to 'purchase_in_progress', 'billing_unavailable' (provider.isReady() false — reachable on any tap during the fire-and-forget initIAP window before Purchases.configure completes) or 'restore_failed' (offline/backend error). SettingsScreen discards the return value entirely and branches purely on the LOCAL entitlement cache. Because iap.ts:714 returns the local entitlement set alongside the error, the same discarded-error bug produces BOTH failure modes: on a reinstall (empty cache) a paying Patron is told 'No previous purchases were found for this store account', and on a device whose cache still holds the entitlement a FAILED store call reports 'Purchases Restored — Welcome back. Your Patron benefits are active again.' PatronModal's own handler does check restored.error and shows RESTORE_FAILED, so the two restore surfaces disagree — and the Settings one is the store-policy-required path a reinstalling customer reaches.

**Failure scenario**

A Patron reinstalls WordShift on a new phone with no network, or simply opens Settings within a second or two of launch before initIAP has finished configuring. They tap Settings -> PURCHASES -> Restore Purchases. restorePurchases() returns {entitlements: [], error: 'billing_unavailable'}; SettingsScreen ignores error, isPatronSync() and isAdFreeSync() are both false because the reinstall wiped local entitlements, and the alert reads 'No previous purchases were found for this store account.' — telling a paying customer their purchase does not exist instead of asking them to retry. No entitlement is destroyed (the adapter silently re-grants via getCustomerInfo, and a later retry works), but the store-policy restore surface actively misinforms.

**Evidence**

SettingsScreen.tsx:449 `await restorePurchases();` — the resolved `{ entitlements, error }` is never bound; 450-458 then branch on isPatronSync()/isAdFreeSync() alone. iap.ts:711 `if (!provider.isReady()) { return { entitlements: await getGrantedEntitlements(), error: 'billing_unavailable' }; }` and :714 `if (error) return { entitlements: await getGrantedEntitlements(), error };`. PatronModal.tsx:319 `if (restored.error) { setStatusMessage(RESTORE_FAILED); ... return; }`

**Fix**

Bind the result and branch on it first, mirroring PatronModal: `const restored = await restorePurchases(); if (restored.error) { showGameAlert('Restore Purchases', "We couldn't reach the store. Please try again in a moment."); return; }` before falling through to the patron / ad-free / no-purchases messages. This fixes both the false-negative and the false-success manifestations.

---

### B23 — invalidateRestoredServiceCaches clears render-path mirrors that nothing re-warms, stripping hints, cosmetics and reduced-motion mid-session

**Severity:** MEDIUM &middot; **Effort:** small

**Where:** `src/services/cloudSave.ts:472-480, src/services/resetStorage.ts:48 + :63, src/services/victoryPersistence.ts:429, src/services/hints.ts:73-76, src/services/cosmetics.ts:320-324, src/services/settings.ts:133-135, src/services/cloudSave.ts:671-672, App.tsx:2124-2209`

**What breaks**

Three of the invalidators this function calls clear RENDER-PATH MIRRORS, not just caches: hints sets `cache = null; syncBalance = 0;`, cosmetics sets `cache = null; syncEquipped = {}; setEquippedTileTheme(null);`, and settings sets `settingsCache = null` with no notifySettings(). Both hints.ts:67-71 and cosmetics.ts:312-319 document in-source that the clear is only half the fix and the caller MUST re-warm, citing the exact symptoms ('the HINT button read 0 for the rest of the session and the app offered to sell the player hints they had just restored'). That second half exists at exactly ONE of the four call sites — restoreFromCloudData's success path (`await Promise.all([initHints(), initCosmetics()])`) — and even there settings was left out. The other three have no re-warm: commitNewCycle (before the transaction AND in the finally, i.e. on the ordinary SUCCESS path of every New Cycle), restoreFromCloudData's catch, and persistVictory's catch (any failed victory transaction, even one the player's Retry then succeeds). rebuildSessionFromStorage only calls refreshHintBalance(), which re-reads the mirror it just zeroed.

**Failure scenario**

Player with 9 purchased hints taps 'The Pattern Continues' and confirms New Cycle. commitNewCycle succeeds; its finally zeroes the hint mirror. rebuildSessionFromStorage only calls refreshHintBalance(), so from that moment the HINT button reads 0, hasHintSync() is false, and every tap raises outOfHintsSignal and the 'Watch a clip (+1) / Store' upsell — for 9 hints still sitting on disk. It persists until the app is relaunched or some grant path happens to call load(). The cosmetics half largely self-heals via ownsCosmetic -> load() on the next HomeScreen mount (a Settings-launched cycle remounts home immediately; the home-launched door leaves the first board of the new cycle rendering the default candy palette, finish, confetti and sparks). Settings' reducedMotion is dropped without notifySettings after a mid-session cloud restore, so already-mounted Confetti and PhaseTransitionOverlay keep the pre-restore value for the session. Nothing on disk is lost.

**Evidence**

resetStorage.ts:62-64 `} finally { invalidateRestoredServiceCaches(); }`. hints.ts:73-76 and cosmetics.ts:320-324 verified. settings.ts:133-135 `export function invalidateSettingsCache(): void { settingsCache = null; }` (compare settings.ts:110-111 `settingsCache = updated; notifySettings();`). grep shows initHints/initCosmetics called only at appBootstrap.ts:28 and cloudSave.ts:672.

**Fix**

Make the re-warm part of the invalidation contract instead of a caller obligation: have invalidateRestoredServiceCaches return a promise that awaits `Promise.all([initHints(), initCosmetics(), getSettings()])` after clearing, and have invalidateSettingsCache call notifySettings(). Cheapest targeted alternative: add that await to commitNewCycle's finally and to rebuildSessionFromStorage (which covers both New Cycle and the cloud-restore conflict path), and drop cosmetics/hints/settings from the set invalidated by persistVictory's catch, since none of them participate in the victory transaction.

---

### B24 — Pressing Home mid-Speed-streak restarts the live board's clock at the full limit and persists the inflated value

**Severity:** MEDIUM &middot; **Effort:** small

**Where:** `App.tsx:2099-2105, App.tsx:754-757, App.tsx:1150-1174, src/hooks/useAutosave.ts:127-131 + :181, App.tsx:2064-2069`

**What breaks**

handleGoHome calls resetSpeedRun() synchronously, BEFORE transitionTo('home', ...). speedRound is a dependency of the speed-start effect, whose only bail-out is `!puzzle.speedMode || gameState !== PLAYING || isProcessingVictory`. At the moment Home is tapped all three still say 'a live speed board', because setGameState(IDLE) is inside the transitionTo callback, which runs only after the rAF plus the 120ms cover fade. So the effect re-runs and calls startSpeedTimer(restoredSpeedTimeRef.current ?? escalatedLimit) with the ref null and speedRound now 0 — i.e. the FULL un-escalated SPEED_TIME_LIMITS[difficulty], discarding the clock the player had spent. That value lands in speedTimeRemaining, a dependency of useAutosave's effect, which re-arms and 120ms later writes speedTimeRemainingSec: <full limit>; its fire-time guard still reads PLAYING/'puzzle' at ~120ms, ahead of the ~150-170ms screen swap, and savePuzzleState sets the module-level saveCache synchronously so the inflated clock is handed back on the next PLAY regardless of the async write. This effect already needed a symptom-specific patch for the same class on the victory path (isProcessingVictory was added for exactly this); no equivalent guard covers Home, contradicting the documented invariant that on a hold 'the remaining seconds are banked, not restarted'.

**Failure scenario**

Player at 55+ solves with Speed on wins a HARD Speed board, so speedRound becomes 1 and the next board is served at 48 - 5 = 43s. They play it down to 6s remaining and tap the header Home button. setSpeedRound(0) re-runs the speed effect while the board is still PLAYING, startSpeedTimer(48) fires, and the autosave persists speedTimeRemainingSec: 48. They tap PLAY: the same half-solved board returns with 48 seconds instead of 6 — a repeatable free clock refill (one per Speed win, since startPuzzleFromHome itself resets the ladder) that makes the 1.34x speed amber near-unlosable. Under reducedMotion the path is safe, because transitionTo is synchronous and the effect correctly calls stopSpeedTimer().

**Evidence**

App.tsx:2099-2105 handleGoHome calls resetSpeedRun() before transitionTo. App.tsx:754-757 `const resetSpeedRun = useCallback(() => { setSpeedRound(0); setSpeedRescueUsed(false); }, []);`. App.tsx:1150-1166 the effect's predicate and `const initialRemaining = restoredSpeedTimeRef.current ?? escalatedLimit; restoredSpeedTimeRef.current = null; startSpeedTimer(initialRemaining);` with speedRound in the dep array at :1171. useAutosave.ts:127-131 writes speedTimeRemainingSec with deps.speedTimeRemaining in the dep array at :181.

**Fix**

Cheapest local fix: move resetSpeedRun() inside the transitionTo('home', ...) callback alongside setGameState(IDLE), so the effect sees a non-PLAYING board when speedRound drops. Structural fix: make the speed-start effect idempotent for a live board — gate startSpeedTimer on there being no active run for the current board (e.g. speedTimer.speedTimeRemaining == null or a board-generation id), letting speedRound affect only the NEXT board's limit. The same synchronous-reset-before-deferred-transition shape also exists in startDailyBoard (App.tsx:2327) and startSharedChallengeBoard (App.tsx:2435).

---

### B25 — Android hardware Back is a dead no-op for the whole of every ceremony; the overlay's skip-confirm handler is unreachable

**Severity:** LOW &middot; **Effort:** small

**Where:** `App.tsx:4455-4459, src/components/PhaseTransitionOverlay.tsx:627-636`

**What breaks**

PhaseTransitionOverlay registers a back handler that opens the Skip confirmation (or cancels it if open), subscribing while `event && !suspended`. MainApp registers its own handler whose first clause returns true when `phaseTransitionEvent !== null || ceremonyWaiting || !ceremonyReady`. React Native invokes back subscriptions in REVERSE registration order and stops at the first handler returning true. In the commit where the ceremony becomes presentable, BOTH effects re-run (ceremonyWaiting and phaseTransitionEvent are both MainApp deps) and React flushes child effects before parent effects — so the overlay subscribes first, MainApp last, and MainApp's handler always runs first and swallows the press. The documented contract ('During a ceremony, Back opens its Skip confirmation, or cancels an already open confirmation') does not hold, and once the Skip confirmation is open Back cannot dismiss it either. Existing tests mock BackHandler.addEventListener, so ordering is never exercised. (A narrow exception: if a save-hold suspends the ceremony and then releases in a commit where no MainApp dep changed, the overlay lands last and wins.)

**Failure scenario**

On Android, a player mid-way through The Arrival (a ~35s read-at-own-pace cinematic) presses hardware Back expecting the skip prompt. MainApp's handler fires first, sees phaseTransitionEvent !== null, returns true, and nothing happens at all — Back appears broken for the entire ceremony, which reads as the app being frozen during the story's biggest moments. The on-screen Skip chip, Continue and 'Keep reading' all still work, so no progress is lost.

**Evidence**

App.tsx:4457-4459 `if (isStorageTransactionActive() || sessionTransitionRef.current || navigationBusy || phaseTransitionEvent !== null || ceremonyWaiting || !ceremonyReady || (...)) return true;`. PhaseTransitionOverlay.tsx:627-636 `useEffect(() => { if (!event || suspended) return; const subscription = BackHandler.addEventListener('hardwareBackPress', () => { if (skipConfirmationRef.current) cancelSkipRef.current(); else requestSkipRef.current(); return true; }); ... }, [event, suspended]);`. RN BackHandler.android.js iterates `for (let i = _backPressSubscriptions.length - 1; i >= 0; i--)`.

**Fix**

Drop `phaseTransitionEvent !== null` from MainApp's swallow clause (keep ceremonyWaiting/!ceremonyReady, which cover the save window when the overlay is suspended and cannot handle Back itself), so the overlay's own handler — which always returns true — owns Back while a scene is presented. Alternatively lift the skip-confirm/cancel call into MainApp's handler and delete the overlay's subscription.

---

### B26 — Home PLAY silently does nothing when story prep fails; its error message is written to an unmounted screen

**Severity:** LOW &middot; **Effort:** small

**Where:** `App.tsx:2087-2096, App.tsx:5542-5544, src/services/storySpine.ts:185`

**What breaks**

handlePlayPuzzle is the home screen's bottom PLAY dock handler. It awaits prepareStory() and only then calls runStory(() => startPuzzleFromHome(difficulty)). If prepareStory() rejects, the catch writes puzzleActions.setMessage('The conversation could not be opened. Try Play again.') — but puzzle.message is only rendered by the Toast inside the puzzle-screen branch, which is not mounted while currentScreen === 'home'. So the player sees nothing at all: no board, no message, no alert. prepareStory -> openStoryScene -> mutate performs an AsyncStorage setItem on the story key, so a storage I/O rejection in either the read or the write reaches this catch. Because storyExitPreparing.current is reset in the finally, the player just taps PLAY repeatedly with no feedback. Every other durable-write surface in this codebase offers an explicit retry affordance; this one drops it on an unmounted screen.

**Failure scenario**

On a device with a failing or full data partition, the player taps PLAY on the home screen. getStoryContext succeeds, selectStoryScene picks the next scene, and openStoryScene's mutate() setItem rejects. The promise propagates out of prepare() and handlePlayPuzzle's catch writes to the puzzle screen's Toast, which is not mounted. The home screen does not change, no board opens, and no error is shown. Repeated taps reproduce it identically — the game's primary action appears dead with no explanation.

**Evidence**

App.tsx:2087-2096 `const handlePlayPuzzle = ... try { await prepareStory(); runStory(() => startPuzzleFromHome(difficulty)); } catch { puzzleActions.setMessage('The conversation could not be opened. Try Play again.'); } finally { storyExitPreparing.current = false; }` vs App.tsx:5542-5544 where the Toast consuming puzzle.message lives inside the puzzle-screen render. (Note the storySpine 'Story state changed while saving' throw is effectively unreachable here — generation only increments in clearStoryState and invalidateStoryCache — so the realistic trigger is storage I/O.)

**Fix**

Surface the failure on the screen the player is actually on: route this catch through showGameAlert (the cottage alert host is mounted at the App root and visible from home) with a retry button, or fall through to startPuzzleFromHome(difficulty) so a story-storage failure cannot block the core Play action.

---

### B27 — Starting the Daily Challenge overwrites the single autosave slot, discarding an in-progress normal board

**Severity:** LOW &middot; **Effort:** medium &middot; **verifiers split**

**Where:** `App.tsx:2336-2346, src/hooks/useAutosave.ts:72-128, App.tsx:2103-2112, App.tsx:2789`

**What breaks**

There is exactly one autosave slot (puzzleSaveState writes a single PUZZLE_SAVE_KEY). handleGoHome deliberately does NOT clear the save for a normal board — it only sets GameState.IDLE — so a half-finished board stays resumable via PLAY. startDailyBoard reads the save but honours it only when saved?.isPlayingDaily is true; for a normal saved board it falls straight through to generateDailyPuzzle() + startDailyGame() with no branch to preserve or warn about the existing save. startDailyGame puts the board in PLAYING on the puzzle screen, and useAutosave fires 120ms later, writing the daily over the normal board. The daily's victory path then calls clearPuzzleState(), emptying the slot entirely.

**Failure scenario**

Player is 3 rows into a 5-row HARD board, presses Home to check the pit, sees the pulsing Daily Challenge card in the header and taps it. Within ~120ms of the daily rendering, the autosave overwrites the HARD board. When the daily finishes, clearPuzzleState() empties the slot. Tapping PLAY now starts a brand new board — the HARD board is gone with no notice at any point. Durable loss is limited to any consumable hints already spent on it (whose saved hintDisclosures die with the slot); the star-rating state is moot once the board is discarded, and there is no soft-lock.

**Evidence**

App.tsx:2336-2346 `if (saved?.isPlayingDaily && saved.gameState === 'PLAYING' && saved.dailyDate && [0,1].includes(daysAgoLocal(saved.dailyDate))) { ...restore...; return; } const daily = await generateDailyPuzzle(); ... puzzleActions.startDailyGame(...)` — no branch for a saved NON-daily board. useAutosave.ts:72-128 writes the whole state under one key whenever gameState === PLAYING && currentScreen === 'puzzle'. App.tsx:2103-2112 clears the save only for unbrokenWeaveMode.

**Fix**

Give the daily its own save key (e.g. wordshift_in_progress_daily) so the two boards do not share a slot. If that is too invasive, confirm with the player before starting the daily when loadPuzzleState() returns a PLAYING non-daily board, using the same shape as the existing skip/abandon confirms.

---

### B28 — A failed background hint write zeroes the whole hint mirror, upselling hints the player already owns

**Severity:** LOW &middot; **Effort:** small

**Where:** `src/services/hints.ts:132-137, src/services/hints.ts:78-86, src/services/hints.ts:73-76, src/hooks/usePuzzleGame.ts:1881, src/hooks/usePuzzleGame.ts:2054-2058`

**What breaks**

consumeHintSync decrements cache.balance and syncBalance and then fires the persist as `save().catch(() => {})`. save()'s catch calls invalidateHintsCache() — which sets `cache = null` AND `syncBalance = 0` — before rethrowing into the swallowing catch. So a transient write failure on a hint SPEND does not merely fail to persist the spend; it destroys the in-memory record of the entire balance. The invalidation is correct for a GRANT (don't show hints you didn't save) but wrong for a SPEND: it throws away N-1 owned hints to avoid mis-reporting one. Because setItem is async, usePuzzleGame.ts:2058's setHintBalance(getHintBalanceSync()) still renders the correct decremented count, while hasHintSync() is already false — so the visible state is 'the chip says 8 but HINT says you are out'. The correct value is never lost on disk (the write failed), so a relaunch restores it.

**Failure scenario**

Player owns 9 hints (bought a HINTS_LARGE pack). Device storage is momentarily full — the exact condition the app's own retry copy anticipates. They tap HINT on a HARD board: the hint is delivered and charged against their stars, save() throws, and syncBalance becomes 0. Every further HINT tap routes to outOfHintsSignal and the 'Watch a clip (+1) / Store' alert, offering to sell or ad-gate hints the player already paid for. Recovery is perverse: accepting the upsell is what fixes it, because addHints -> load() re-reads the untouched disk value and credits on top of it. It otherwise persists until the app is relaunched or a milestone grant fires.

**Evidence**

hints.ts:132-137 `const next = current - 1; if (cache) cache.balance = next; syncBalance = next; save().catch(() => {});` and hints.ts:78-86 `async function save() { ... } catch (error) { invalidateHintsCache(); throw error; }` with hints.ts:73-76 `invalidateHintsCache() { cache = null; syncBalance = 0; }`.

**Fix**

On a failed SPEND, roll the cache/mirror back to the pre-decrement value instead of zeroing it: `const current = syncBalance; ... save().catch(() => { if (cache) cache.balance = current; syncBalance = current; })`, reserving invalidateHintsCache() for grant/restore paths. Alternatively make getHintBalanceSync/hasHintSync trigger a lazy load() re-warm when cache === null.

---

### B29 — No monotonicity guard on the local day/month: a backwards clock burns a play-streak freeze and destroys the 2,500-amber season-pass premium unlock

**Severity:** LOW &middot; **Effort:** small

**Where:** `src/services/amberCurrency.ts:164-178, src/services/seasonPass.ts:171-176, src/services/seasonPass.ts:102-108, src/services/supporterStipend.ts:97, src/services/dailyChallenge.ts:534`

**What breaks**

Two period comparisons treat any mismatch as 'time moved forward' with no rewind guard. (a) updateStreak compares lastPlayDate only against today and previousDay; any other value — including a stored date in the FUTURE relative to the current local day — falls into the else branch labelled 'Missed at least one full day', consuming a banked streak freeze or resetting currentStreak to 1. The parallel daily-challenge path HAS exactly this guard (`lastCompletedDate > today` -> refuse), so the play-streak path is the one that was left unprotected. (b) seasonPass.loadState rolls the season over whenever the stored seasonId differs from getCurrentSeasonId() in EITHER direction, and getDefault returns premiumUnlockedByAmber: false with empty claimedFree/claimedPremium and a re-anchored startPuzzles, persisted immediately. Every read path (including getSeasonClaimableCount, called from HomeScreen on every home landing) goes through loadState, so one render under a rolled-back month commits the wipe. supporterStipend.ts:97 has the same shape and grants a second monthly stipend on a backwards month.

**Failure scenario**

(a) A player on a 21-day streak (2.0x amber multiplier) has their device clock corrected backwards across a day boundary, or restores a cloud save written on a device in a far-ahead timezone (wordshift_home_progress is a synced key). The else branch fires: their banked freeze is silently consumed with the 'your streak was protected' message for a day they never missed, or currentStreak drops 21 -> 1 and the amber multiplier collapses to 1.0 for the ~11 days it takes to re-cap. (b) A player spends 2,500 amber on October 1 to unlock the season premium track. The local date moves back to September 30; HomeScreen's season-badge effect calls loadState, sees '2026-10' !== '2026-09', and persists getDefault('2026-09'). The premium unlock, every claimed-tier record and the in-season anchor are gone, with no message and no refund — and rolling forward again does not restore it. The re-anchored startPuzzles plus cleared claim lists also let already-claimed tier rewards be re-claimed inside the rewound window.

**Evidence**

amberCurrency.ts:164-178 `} else { // Missed at least one full day ... progress.streakFreezes = freezesAvailable - 1; ... } else { progress.currentStreak = 1; }` with no `lastPlayDate <= today` check; contrast dailyChallenge.ts:534 `progress.lastCompletedDate != null && progress.lastCompletedDate > today`. seasonPass.ts:171-176 `if (cache.seasonId !== seasonId) { cache = getDefault(seasonId, puzzlesSolved); await persist(cache); }` with :102-104 `getCurrentSeasonId() { return getLocalDateString().slice(0, 7); }` and :106-108 getDefault returning premiumUnlockedByAmber: false.

**Fix**

Add a rewind guard to both, mirroring dailyChallenge.ts:534. updateStreak: if `progress.lastPlayDate > today` (lexicographic on YYYY-MM-DD), treat it like the already-played-today case and leave currentStreak/lastPlayDate untouched. seasonPass.loadState: roll over only FORWARD (`seasonId > cache.seasonId`); treat `seasonId < cache.seasonId` as a clock rewind and keep the existing state without persisting a default. Apply the same forward-only rule at supporterStipend.ts:97. Consider recording premiumUnlockedByAmber in a non-season-scoped record so a month boundary can never destroy a paid unlock.

---

### B30 — accessibilityLabel on non-accessible Views is dropped on iOS, silencing the streak state, the leaderboard trend and achievement lock state

**Severity:** LOW &middot; **Effort:** medium

**Where:** `src/components/home/HomeScreen.tsx:2372-2390, src/components/social/DailyLeaderboardCard.tsx:94-98 + :137, src/components/StatsScreen.tsx:369-371 + :410`

**What breaks**

Three surfaces put an accessibilityLabel on a bare <View> (or an unlabelled <Image>) with no `accessible` prop. In RN Fabric, AccessibilityProps.h declares `bool accessible{false}` and RCTViewComponentView sets isAccessibilityElement solely from that prop, so on iOS the View is not an accessibility element and its label is never read; Android is unaffected because setAccessibilityLabel writes contentDescription regardless. (1) The header streak badge's composed label ('N day streak, at risk') is dropped; below 340dp the count Text is also suppressed by streakIconOnly, leaving only an unlabelled flame image, so the badge announces nothing at all. The at-risk state exists in text nowhere but that dropped label — it is otherwise a background/border/tint colour, violating the repo's own no-colour-alone rule. (2) DailyLeaderboardCard composes rank/beatText/history/'Placement trend: ...' into a container label that is likewise dropped, while relying on it by hiding the duplicate trend <Text> with accessibilityElementsHidden — which IS honoured on iOS during subview traversal, so the trend is unreachable there (on Android the prop does not exist, so it reads normally). (3) StatsScreen's unlocked check <Image> carries accessibilityLabel="unlocked" with no alt/accessible, so unlocked state is silent on iOS; the locked lock <Image> has no label at all, so for the ~22 one-shot achievements with no progress track, locked state is unannounced on BOTH platforms.

**Failure scenario**

A VoiceOver user on iOS: (1) has a 6-day streak about to lapse and hears only the bare number '6' with no unit and no at-risk signal (or, on a sub-340dp device, complete silence for the badge); (2) finishes the Daily Challenge on an improved day and hears rank, beat text and history but never the placement trend, because its Text is hidden and the container label that contained it is never announced; (3) opens Statistics and cannot tell which of the one-shot achievements (first_puzzle, phase_*, share, max_stack, all_variants...) are earned, since neither the check nor the lock announces. Nothing is lost or corrupted — this is informational loss on secondary surfaces — and Android is largely unaffected.

**Evidence**

HomeScreen.tsx:2372 `<View style={[styles.streakBadge, isStreakAtRisk && styles.streakAtRiskBadge]} accessibilityLabel={...}>` with `{!streakIconOnly && (<Text ...>)}`. DailyLeaderboardCard.tsx:94-98 `<View style={[styles.card, ...]} accessibilityLabel={a11yParts.join(' ')} accessibilityRole="text">` and :137 `<Text ... accessibilityElementsHidden>{trendLabel}</Text>`. StatsScreen.tsx:410 `<Image source={CHROME_ICONS.check} ... accessibilityLabel="unlocked" />` and :369-371 the lock Image with no label. RN: `AccessibilityProps.h bool accessible{false};`, Image.ios.js:169-171 `const accessible = ariaHidden !== true && (props.alt !== undefined ? true : props.accessible);`

**Fix**

Add `accessible` to each labelled container (streak badge View, both DailyLeaderboardCard Views) so iOS treats it as one element, and make the at-risk wording part of the streak label at every width. For StatsScreen, move state onto the ROW rather than a decorative sprite: make the achievement row `accessible` with a composed label ('<title>. <description>. Unlocked|Locked. Reward N amber.') and mark both icons accessible={false}. Pair the iOS-only accessibilityElementsHidden on the leaderboard trophy/trend with importantForAccessibility="no-hide-descendants" so Android does not double-read them. Sweep the class repo-wide: any View/Image whose accessibilityLabel is the sole carrier of state needs `accessible` (or alt on Image).

---

### B31 — VictoryModal compact strip claims 'Reward doubled!' over an un-doubled amount, and the in-modal Swift toggle can morph the open result screen

**Severity:** LOW &middot; **Effort:** small

**Where:** `src/components/puzzle/VictoryModal.tsx:498, src/components/puzzle/VictoryModal.tsx:555-564, src/components/puzzle/VictoryModal.tsx:585-588, src/components/puzzle/VictoryModal.tsx:286-292, src/components/puzzle/VictoryModal.tsx:311-327, src/components/puzzle/VictoryModal.tsx:399-433`

**What breaks**

Two defects in the compact Swift-Victories path, both from compactMode reading live state the surrounding code treats as a snapshot. (a) The full modal reflects a claimed rewarded 2x via `rewardedDoubleTarget = victoryTotalAmber + (rewardedDoubleClaimed ? victoryTotalAmber : 0)` plus an explicit 'Doubled +N' breakdown row. The compact strip renders the same 2x affordance but its only amber figure is `const compactTotal = victoryData?.amberEarned ?? 0`, printed raw and repeated in the accessibility label; it never consults rewardedDoubleClaimed. So the button is replaced by 'Reward doubled!' directly above a number that did not move. (b) compactMode reads `getSettingsSync().swiftVictories` on every render while the footer toggle reads a per-open snapshot seeded when `visible` flips; handleToggleSwift computes next from the snapshot, re-renders synchronously, and fires the async updateSetting, so the two reads disagree by exactly one toggle for a microtask. compactMode is also a dependency of the entrance effect, whose body begins `if (!hushedBeat) hapticSuccess();`, so any mid-victory flip re-fires the victory haptic and — on a flip back — resets contentOpacity1..4 to 0 and replays the whole staggered entrance with the tap-to-skip layer re-mounted over the result screen.

**Failure scenario**

(a) Swift Victories on, routine win at puzzle 30. The strip shows the 2x button; the player watches a full rewarded ad; claimVictoryDouble credits the amber. The strip swaps the button for 'Reward doubled!' but the amber row still reads '+18' — exactly what it read before the ad — and a screen reader still announces '18 amber gathered for the pit'. The player has no on-screen confirmation that the ad paid anything, the exact 'I watched an ad and got nothing' perception the full-modal test exists to prevent. (b) Full modal open with Swift off; the player taps 'Quicker celebrations' then immediately taps again to undo it. The second render reads the cache written by tap 1, compactMode becomes true, and the full result screen the player was reading collapses into the compact strip while hapticSuccess fires a second time; a moment later the cache settles and the next ambient re-render snaps the full modal back, replaying its entrance.

**Evidence**

VictoryModal.tsx:498 verified `const compactTotal = victoryData?.amberEarned ?? 0;` vs :477-478 `const rewardedDoubleTarget = victoryTotalAmber + (rewardedDoubleClaimed ? victoryTotalAmber : 0);`, with :585-588 rendering getRewardedDoubleConfirm(phase) in the compact branch. :286-292 `const compactMode = getSettingsSync().swiftVictories === true && ...` vs :311-316 the per-open swiftState snapshot and :323-327 handleToggleSwift; :433 lists compactMode in the entrance effect's deps.

**Fix**

(a) Do NOT simply double compactTotal — the base amberEarned is enqueued for the harvest while the double is credited straight to the balance, so the strip's 'gathered for the pit' framing would then overstate what is queued. Add a separate bonus line (or a distinct total label) mirroring how the full modal separates the 'Doubled +N' row from the Total row, and derive the accessibility label from the same values. (b) Drive compactMode from the same per-open snapshot the affordance uses (swiftState.on) instead of getSettingsSync(), so an OPEN result screen's presentation mode is decided once at open time — which is what the footer copy already promises — and compactMode stops being a live dependency of the entrance effect.

---

### B32 — Tending 'Deepen' is gated on the optimistic display balance, so it enables, refuses, and then reads as a phantom charge

**Severity:** LOW &middot; **Effort:** small

**Where:** `src/components/OfferingPitScreen.tsx:2016-2019, src/components/OfferingPitScreen.tsx:3092-3094, src/components/OfferingPitScreen.tsx:2210, src/components/OfferingPitScreen.tsx:2029, src/services/tending.ts:338`

**What breaks**

displayBalance is deliberately inflated ahead of the real balance while a batch is being devoured — handleWordDevoured bumps it per word and the amber is credited only when the batch finalizes through offerBatch + settleBatchCredit. Both the Tending affordance check and the Deepen button's disabled state read that inflated number instead of the real amberBalance prop. commitTendPurchase correctly validates against the true balance (spendAmber -> error 'insufficient'), but the pit reports it with the generic 'The pattern could not accept that offering right now.' rather than the honest not-enough-amber copy, and then calls setDisplayBalance(result.newBalance), snapping the displayed amber DOWN by the optimistic amount. Because pendingAmberOffset is not rolled back on this path, the amount is momentarily missing from both the pending badge and the total.

**Failure scenario**

Phase 5. Player has 630 real amber, a pending harvest batch worth 20, and the next Tending level costs 640. They tap 3 of the batch's 4 words (display climbs to ~645, batch not yet finalized), then open the shrine. The Deepen button renders ENABLED and the 'Earn more amber' hint is hidden. They press it; the write refuses; they see 'The pattern could not accept that offering right now.'; and the header amber drops from 645 to 630 — which reads as having been charged 15 amber for a failed purchase. No amber is actually lost (settleBatchCredit sets an absolute balance when the last word is devoured, and re-entering the pit re-mounts from the amberBalance prop), but the affordance lied and the display looks like a charge.

**Evidence**

OfferingPitScreen.tsx:2016-2019 `if (displayBalance < cost) { showResultToast('Not enough amber to deepen the pattern yet.'); return; }`; :3094 `disabled={tendingBusy || displayBalance < tendingNext.cost}`; :2210 `setDisplayBalance(prev => prev + increment);` inside handleWordDevoured; :2029 `setDisplayBalance(result.newBalance);` on the failure path; tending.ts:338 returns error 'insufficient'.

**Fix**

Gate the Tending affordance and the button's disabled state on the real balance (the amberBalance prop / amberBalanceRef.current) rather than displayBalance, and map `result.error === 'insufficient'` to the 'Not enough amber to deepen the pattern yet.' copy so a refused spend never reads as a charge. Roll back pendingAmberOffset on the failure path too.


## Part 2 — Performance findings (9)

### Systemic patterns

Four systemic patterns run through these findings. First, the codebase repeatedly discovers the right fix, applies it locally, and does not generalize: AmbientParticles was extracted into a memoized child so a 0.5Hz setState would not re-render HouseWorld, AmberCountUpText documents the same leaf pattern for the amber count-up, and the branching analysis loop in puzzleBank was explicitly chunked for audit F136 — yet a 45-67Hz typewriter drives HouseWorld from one level up, five particle families setState on the pit root, and the extension pre-filter runs unchunked in the same function a hundred lines above the chunked loop. Second, memoization is present but structurally defeated: Row, LetterTile, RoomView and the pit's particle views are all React.memo, but hook return objects (usePuzzleGame's state and actions, useDreadEffects' state, and the five sibling action literals) are fresh every render, so the comparators can never bail — memo boundaries were added without auditing the props crossing them. Third, storage is treated as free and synchronous-safe: the cloud snapshot reads ~60-85 keys one at a time inside a lock that blocks all player input, and useAutosave serializes ~3.6-5.4KB of board state with no comparison against what is already on disk. Fourth, expensive work is eagerly bound to module scope or to the first user action rather than to first need — two full dictionary vocabulary builds run before the first frame for a generation path most sessions never reach, and both the insertion index and the extension cache pay their entire cold-start cost synchronously inside a path the player is actively waiting on. The cheapest high-value fixes are all one-liners of the same shape: memoize the object that crosses a boundary (AnimatedBackground, spentLetters, the hook action objects), batch or skip the storage call, and yield or defer the cold build.

---

### P1 — Every victory rebuilds the cloud snapshot with ~55-85 serialized AsyncStorage reads inside the exclusive storage lock, blocking input and flashing a save spinner over the result

**Severity:** MEDIUM &middot; **Effort:** small

**Where:** `src/services/cloudSave.ts:557, src/services/cloudSave.ts:727, App.tsx:3295, App.tsx:1513, src/services/persistenceStorage.ts:76, App.tsx:377, App.tsx:6039, App.tsx:6121`

**What breaks**

`uploadToCloud()` is fired unconditionally on every puzzle completion (App.tsx:3295) and on MainApp mount (App.tsx:1513). It takes its snapshot inside `runStorageTransaction('cloud_snapshot', ...)` (cloudSave.ts:727), and `collectLocalSaveData` reads the union of the 51 always-included `SYNC_KEYS` plus every existing prefix-synced key (`wordshift_played_*`, `wordshift_guaranteed_crossref_phase_*`) ONE AT A TIME in a sequential `for ... await AsyncStorage.getItem(key)` loop. Nothing batches: `getItem` in async-storage 2.2.0 calls `RCTAsyncStorage.multiGet([key])` directly and never enters the `_getRequests` coalescing queue, and `persistenceStorage.multiGet` is itself `Promise.all(keys.map(getItem))`, so it would not batch either. There is also no dirty check: `markPendingChanges()` exists beside it but `uploadToCloud` never consults `getSyncStatus().pendingChanges`, so the whole snapshot is rebuilt even when nothing changed. Because `runStorageTransaction` sets the module-wide `busy` flag for the duration, and `busy` is surfaced to the UI, the cost lands directly on player input.

**Failure scenario**

A late-game player on a low-tier Android (the `deviceTier` 'low' bucket the app explicitly detects) finishes a puzzle. `uploadToCloud` opens the transaction and issues ~60-85 sequential bridge round trips to SQLite, reading the whole whisper gallery (cap 500), the played-id lists, word history and board state. For that whole window `storageBusy` is true, so App.tsx:6039 sets the rendered screen behind the modal to `pointerEvents='none'` and App.tsx:4457 swallows the Android hardware back button. If the sweep exceeds 180ms, App.tsx:377 flips `showStorageHold`, which requests the `saving` overlay — priority 0 in globalOverlays.ts:12, ABOVE `victory` at priority 7 — so the victory layer at App.tsx:6121 drops to `pointerEvents='none'` and accessibility-hidden and a full-screen blocking BrandedLoader modal opens over the result screen. The player's NEXT LEVEL / Collect Now tap is swallowed and a save spinner flashes over their win. On the mount-time upload the same flag deadens the entire home screen.

**Evidence**

cloudSave.ts:552-562 `const keys = new Set([...SYNC_KEYS, ...(await AsyncStorage.getAllKeys()).filter(isSyncedKey)]); ... for (const key of keys) { const value = await AsyncStorage.getItem(key); if (value !== null) data[key] = value; }` — the comment above it only requires that a read error propagate rather than produce a partial snapshot, which `Promise.all` preserves. cloudSave.ts:727 `const snapshot = await runStorageTransaction('cloud_snapshot', async () => ({ ... data: await collectLocalSaveData() }));`. persistenceStorage.ts:78-99 `setBusy(true); try { ... await work(); } finally { staged = null; setBusy(false); }`. App.tsx:362 `const storageBusy = useSyncExternalStore(subscribeStorageTransaction, isStorageTransactionActive, () => false);`. App.tsx:377 `const timer = setTimeout(() => setShowStorageHold(true), 180);`. globalOverlays.ts:11-18 `case 'saving': return 0;` vs `case 'victory': case 'timeUp': return 7;`.

**Fix**

Two independent changes. (1) Replace the sequential loop with one batched native call — `NativeStorage.multiGet([...keys])` — which is a single round trip and still rejects on the first read error, preserving the 'never upload a partial snapshot' guarantee. (`Promise.all(keys.map(getItem))` is a cheaper stopgap that removes the N serialized JS<->native latencies but still issues N native calls.) (2) Have `uploadToCloud` early-out when `getSyncStatus().pendingChanges` is false, so an unchanged save is never re-snapshotted. Optionally take the snapshot outside `runStorageTransaction` entirely — it stages no writes, it only needs a consistent read, and that is what puts it on the input-blocking `busy` flag in the first place.

---

### P2 — Dialogue typewriter re-renders HomeScreen and the un-memoized HouseWorld 45-67 times a second for the whole of every conversation

**Severity:** MEDIUM &middot; **Effort:** medium &middot; **verifiers split**

**Where:** `src/hooks/useDialogueFlow.ts:932, src/hooks/useDialogueFlow.ts:899, src/hooks/useDialogueFlow.ts:873, src/components/home/HouseWorld.tsx:1789, src/components/home/HomeScreen.tsx:2472, src/components/home/HomeScreen.tsx:2475, src/components/home/HomeScreen.tsx:2502, src/components/home/HomeScreen.tsx:916`

**What breaks**

The per-character reveal is React state inside `useDialogueFlow`, and `useDialogueFlow` is called from HomeScreen (HomeScreen.tsx:916). The interval at useDialogueFlow.ts:932 calls `setReveal(...)` every `getDialogueRevealCharMs(phase)` ms — 15ms through Phase 1, 22ms from Phase 2 — so HomeScreen's whole JSX tree re-renders 45-67 times a second while a line types out. HomeScreen renders `<HouseWorld>` unconditionally at line 2472 (the house stays mounted behind the speech card), and HouseWorld is a bare `React.FC` at HouseWorld.tsx:1789 with no `React.memo` — unlike its own children (`RoomView` is `React.memo` at RoomView.tsx:700) and unlike `ScreenTransitionOverlay`, whose memoization App.tsx explicitly calls out. Two of its props are inline arrows recreated every render (`onInspectStory={() => setShowStoryInspection(true)}` at 2475, the `onPitPress` arrow at 2502), so memoizing it alone would not help. Each tick also re-runs two unmemoized derivations in the hook — `const visibleDialogueText = getDialogueText();` (899) and `hasMoreToShow: computeHasMore()` (873/1916) — which call `getFullDialogueText()` -> `getRegularConversation()` -> `getNextAnimalConversation()`, filtering the 1,742-entry `ALL_DIALOGUES` array and rebuilding a read-id Set 2-3 times per render. The file's own history shows the authors know the pattern: `AmbientParticles` was extracted into a memoized child (HouseWorld.tsx:233) specifically so its ~2-second spawn setState would not re-render HouseWorld; a 45-67 Hz ticker one component up drives exactly the render they moved a 0.5 Hz ticker out to avoid.

**Failure scenario**

A player taps an animal on the home screen. A 200-character page (`DIALOGUE_PAGE_CHAR_BUDGET` = 200) reveals at 15ms/char, so for ~3 continuous seconds HomeScreen re-renders ~200 times, and each render re-executes HouseWorld's ~376-line return block plus ~10-12 un-memoized leaf children, 2-3 full corpus filters, and two `splitDialogueIntoPages` passes. A session is 3-6 lines of ~2 pages each. On a low-tier Android this saturates the JS thread for the entire reading loop: the 15ms interval gets starved so the typewriter runs slower and unevenly than its designed cadence, and tap-to-complete / Next / backdrop-close respond late. (The ambient motion itself does NOT stutter — HouseWorld has 38 `useNativeDriver: true` animations and zero `useNativeDriver: false`, so the clouds, smoke and sprites run on the UI thread. The 13 RoomView subtrees also memo-bail, because `onAnimalPress` is a useCallback at HomeScreen.tsx:1111 and the room/animal objects keep their identity.) One adjacent cost in the same render: HomeScreen.tsx:2315 calls `dialogueFlow.getNextAnimalWithNews(animals)` on every render once `!hasMoreToShow`, so on the final line of a session that availability scan also runs on all ~200 ticks.

**Evidence**

useDialogueFlow.ts:931-941 `revealTimerRef.current = setInterval(() => { setReveal(prev => { const next = prev.source === revealSource ? prev.count + 1 : 1; ... }); }, revealCharMs);` with `DIALOGUE_REVEAL_CHAR_MS_BRIGHT = 15` / `DIALOGUE_REVEAL_CHAR_MS = 22`. useDialogueFlow.ts:899 `const visibleDialogueText = getDialogueText();` (a plain call in the render path) and :873 `const computeHasMore = (): boolean => { const fullText = getFullDialogueText(); ... if (getRegularConversation(selectedAnimal)) return true; ... }`. animalDialogueBase.ts:1883 `return ALL_DIALOGUES.filter(d => d.animalType === animalType && d.phase <= maxPhase);` (uncached, 1,742 entries). HouseWorld.tsx:1789 `export const HouseWorld: React.FC<HouseWorldProps> = ({` — no memo wrapper. HomeScreen.tsx:2472-2507 `<HouseWorld ... onInspectStory={() => setShowStoryInspection(true)} ... onPitPress={... ? () => { hapticLight(); playUiSound('tap'); onOpenPit(); } : undefined} />`.

**Fix**

The load-bearing fix is to move the reveal state out of `useDialogueFlow`'s HomeScreen-level return into a memoized leaf that owns its own ticking (the pattern `components/home/AmberCountUpText.tsx` and `AmbientParticles` already use), so each character re-renders one `<DialogueBody>` instead of HomeScreen + HouseWorld. Note the leaf must still report reveal start/end upward: `revealInProgress` feeds the bubble's tap-to-complete `disabled` prop (HomeScreen.tsx:2861), the flap interval's lifetime (useDialogueFlow.ts:980) and the one-time skip-hint retirement (:968) — 2 renders per line instead of ~200. Secondary: wrap `HouseWorld` in `React.memo` and stabilise its two arrow props with `useCallback` (keeping in mind HouseWorld reads mutable module singletons — `isOnCooldown`/`getSessionStatus`/`getSettingsSync`/`getActiveEvent` — during render, so the existing refresh paths that change `animals` identity must stay intact), and wrap `visibleDialogueText`/`hasMoreToShow` in `useMemo` keyed on the line identity so the corpus is scanned once per line rather than 2-3 times per frame.

---

### P3 — Row's React.memo never bails: puzzleActions and five sibling action/state objects are fresh literals every render

**Severity:** MEDIUM &middot; **Effort:** large

**Where:** `src/hooks/usePuzzleGame.ts:3502, src/hooks/usePuzzleGame.ts:3445, src/hooks/useGamePersistence.ts:325, src/hooks/useVictoryFlow.ts:396, src/hooks/useVictoryOrchestration.ts:696, src/hooks/useDreadEffects.ts:138, App.tsx:3422, App.tsx:3492, App.tsx:5634, src/components/Row.tsx:613, src/components/Row.tsx:1046`

**What breaks**

`usePuzzleGame` builds `const actions: PuzzleGameActions = { ... }` as a plain object literal on every render (usePuzzleGame.ts:3502), never memoized, so `puzzleActions` (App.tsx:391) has a new identity on every MainApp render. It is a dependency of both row callbacks — `handleLetterPress` deps at App.tsx:3492 and `handleSlotPress` deps at App.tsx:3422-3446, which additionally depend on `persistenceActions`, `victoryActions`, `achievementActions`, `orchestrationActions`, `dreadActions` and the `dreadEffects` STATE object, each likewise a fresh literal in its own hook. Those callbacks are passed to `<Row onLetterPress={handleLetterPress} onSlotPress={handleSlotPress}>` (App.tsx:5634). `Row` is `memo(...)` with the default shallow comparator and no custom equality (Row.tsx:613), so the compare fails on every render and every row re-renders. Inside Row, non-source tiles get `onPress={canDrag ? undefined : () => onLetterPress(letter, rowIndex)}` (Row.tsx:1046) — a fresh arrow per tile per render — so `LetterTile`'s own `React.memo` is defeated for every completed/future/target-row tile too. The memoization the codebase deliberately added for this exact purpose (CLAUDE.md: 'React.memo on expensive pure components (e.g., Row)'; Row.tsx's own header comment) is therefore dead.

**Failure scenario**

Any App state change unrelated to the board re-renders the whole board. Concretely: during a drag, `handleLetterDragMove` (App.tsx:3628-3659) ref-compares and calls `setHoverSlot` on each genuine slot crossing (~5-8 per drag), and each of those re-renders all 5 Rows and ~20 LetterTiles — but only the TARGET row legitimately needed to change, so 4 rows and ~16 tiles are pure waste mid-gesture. The Speed Shift countdown re-renders the entire board once per second for the whole run (App.tsx:5566), and each ~1.9s victory-toast rotation re-renders the board while it is completely hidden behind the victory modal — 100% invisible waste. On a low-tier Android this shows as a late hover swell and general input latency; the dragged tile's own transform is native-driven, so the drag itself does not break.

**Evidence**

usePuzzleGame.ts:3445 `const state: PuzzleGameState = {` and :3502 `const actions: PuzzleGameActions = {` — plain literals, `return [state, actions];` at 3540, no `useMemo`. App.tsx:3492 `}, [puzzleActions, onboardingFlow.onboardingStep, puzzle.gameState, puzzle.selectedLetter, tutorialGuidance]);`. Row.tsx:613 `export const Row: React.FC<RowProps> = memo(({` with the closing `});` at 1346 and no comparator. Row.tsx:1046 `onPress={canDrag ? undefined : () => onLetterPress(letter, rowIndex)}`.

**Fix**

Memoize BOTH the `state` and `actions` objects of all six hooks (`usePuzzleGame`, `useGamePersistence`, `useVictoryFlow`, `useVictoryOrchestration`, `useDreadEffects`, `useAchievementQueue`) with `useMemo` over their already-stable `useCallback` members, hoisting the inline `setGameMode`/`setUndoLimited` wrappers into their own `useCallback`s and memoizing `spentLetters` (see the autosave finding, which shares that cause). Note that fixing `puzzleActions` alone is NOT sufficient — `handleSlotPress` still depends on `dreadEffects`, the state object built fresh at useDreadEffects.ts:138 — so this must be done across all six hooks in one change. Separately, hoist Row's per-tile `onPress`/`onLockedPress` arrows (pass `letter`+`rowIndex` back through one stable handler, or memoize per letter id) so `LetterTile`'s memo holds on non-source rows. Even then, Row will still legitimately re-render on letter select and committed moves; the win is the unrelated-state subset.

---

### P4 — Cold-cache +1-row extension pre-filter scans the whole bank synchronously, unchunked, in the board-serve path — right above the loop that was chunked for exactly this reason

**Severity:** MEDIUM &middot; **Effort:** small

**Where:** `src/services/puzzleBank.ts:696, src/services/puzzleBank.ts:265, src/services/puzzleExtension.ts:160, src/services/puzzleBank.ts:807`

**What breaks**

Once `puzzlesSolved >= PUZZLE_EXTENSION_UNLOCK_PUZZLES` (70), every standard, non-lexicon, non-speed, non-weave board serve runs `bank.filter(puzzle => getCachedStandardExtension(bankKey, puzzle) !== null)` in one synchronous expression. `standardExtensionCache` is empty at process start, so the first such serve per bank key executes `extendStandardPuzzle()` for every board in the qualified pool with no yields. The cost concentrates in the (board, removal-position) pairs whose remainder is a valid word — those walk the full same-length candidate array (WORDS_5 = 4,636, WORDS_6 = 7,032) with an `insertAt` sub-loop, and the `MAX_PREFERRED_APPEND_ATTEMPTS` (40) bound only increments on VALID appends, so a position with few valid appends scans the whole list. What makes this a defect rather than a cost of doing business is the code 100 lines below it: the branching pass at puzzleBank.ts:807 was explicitly restructured into a chunked awaitable loop with `await new Promise(resolve => setTimeout(resolve, 0))` every 24 analyses because 'up to BRANCHING_CONTEXT_CANDIDATES heavy traversals would otherwise run in ONE synchronous burst on the JS thread and jank the board serve (audit F136)' — and independent measurement puts that mitigated pass at ~8-10ms against 19-62ms for the unyielded filter above it. The F136 mitigation is partly undone by the line preceding it.

**Failure scenario**

A player with 70+ solves cold-starts the app and taps PLAY on an EXPERT or EASY standard board. `selectPreGeneratedPuzzle` runs the whole sweep synchronously before it scores a single candidate. Measured against the real shipped banks and dictionary on desktop Node with JIT, over the fresh-qualified pools that `getBank` actually returns (EASY 323 / MEDIUM 202 / MEDIUM_PLUS 161 / HARD 100 / EXPERT 100): EXPERT ~57-62ms (highest per-board cost, because WORDS_6 is the largest candidate array), EASY ~47-55ms, MEDIUM_PLUS ~33ms, MEDIUM/HARD ~19ms. Hermes has no JIT, so device figures are a multiple. Because App.tsx:421-425 gates the board loading card behind a 250ms grace timer — and that timer cannot fire during a synchronous block — a serve that finishes inside the grace window stalls with NO loading indicator at all and the tap reads as dead; a slower one pushes the serve past the grace and flashes the card on a pick that would otherwise have been instant. It repeats once per bank key per process, so switching EASY -> MEDIUM -> MEDIUM_PLUS -> HARD in one session costs four separate hitches, and all of them again after the next cold start.

**Evidence**

puzzleBank.ts:693-697 `const selectableBank = options.unbrokenWeaveOnly ? bank.filter(puzzle => isUnbrokenWeaveEligible(puzzle.solution)) : extensionRequired ? bank.filter(puzzle => getCachedStandardExtension(bankKey, puzzle) !== null) : bank;` — no chunking, no await, inside an async function. puzzleBank.ts:265-275 `if (standardExtensionCache.has(cacheKey)) return ...; const base = toPuzzleConfig(puzzle); const extended = extendStandardPuzzle(base, {` — a plain memo with no warm-up. Contrast puzzleBank.ts:807-810 `if (i > 0 && i % BRANCHING_ANALYSIS_CHUNK === 0) { await new Promise<void>((resolve) => setTimeout(resolve, 0)); }`.

**Fix**

Give this filter the same treatment as the branching loop directly below it: walk `bank` with an index and `await new Promise(r => setTimeout(r, 0))` every N puzzles while the extension cache is cold (the function is already `async`, and the result is deterministic and order-independent, so yielding cannot change which boards qualify). Alternatively, warm `standardExtensionCache` for the player's current difficulty from an idle callback after first paint (the pattern `audio.scheduleDeferredPreload` already uses) so the first serve past solve 70 only pays cache lookups. A deeper win: hoist the per-removal candidate walk in `extendStandardPuzzle` off the full word list onto the same adjacency index the generator already builds.

---

### P5 — AnimatedBackground rebuilds 125 provably-static wash Views plus 15 particles on every App re-render of the puzzle screen

**Severity:** LOW &middot; **Effort:** small

**Where:** `src/components/AnimatedBackground.tsx:396, src/components/AnimatedBackground.tsx:117, src/components/AnimatedBackground.tsx:160, src/components/AnimatedBackground.tsx:400, App.tsx:5140`

**What breaks**

`AnimatedBackground` is rendered directly inside App's puzzle branch (App.tsx:5140) and is a plain function component (line 396) — not memoized, despite taking exactly one prop (`phase`). Neither are its two heaviest children: `SoftWash` (117) and `Particle` (160). `SoftWash` renders `1 + WASH_FALLOFF_STEPS` Views with `WASH_FALLOFF_STEPS = 24` (line 115), i.e. 25 Views per instance, and it is instantiated five times (lines 494-496, 535-536) = 125 Views. By the file's own comment at lines 112-113, 'Every band is a plain static View: no animation, no JS work after mount' — provably static for a whole board, yet every App re-render re-allocates all 125 elements with fresh inline style arrays and diffs them. On top of that 15 un-memoized `Particle` components (high tier, `getMaxParticleCount()` = 15) re-render, each re-running `useWindowDimensions()` and its hook chain, plus `PuzzleAtmosphere`'s ~20 Views.

**Failure scenario**

App re-renders on the puzzle screen are frequent: every letter tap, every committed move, every toast-queue transition, every Speed Shift second tick, and each hover-slot crossing during a drag. Dragging a tile across a HARD row produces ~5-8 `setHoverSlot` re-renders inside one ~400ms gesture, and each one re-allocates and diffs 125 static wash Views, 15 Particles and PuzzleAtmosphere's ~20 Views on top of the board itself — at the exact moment the drag needs frame budget. Nothing about the wash can have changed, since its inputs are the phase palette.

**Evidence**

AnimatedBackground.tsx:115 `const WASH_FALLOFF_STEPS = 24;`; :138 `{Array.from({ length: WASH_FALLOFF_STEPS }, (_, i) => (<View ... />))}`; five `<SoftWash .../>` instances at 494-496 and 535-536; :117 `const SoftWash: React.FC<{...}> = ({ ... }) => {` and :160 `const Particle: React.FC<{...}> = ({ ... }) => {` (neither memoized); :396 `export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ phase = 0 }) => {`; App.tsx:5140 `<AnimatedBackground phase={persistence.currentPhase} />`.

**Fix**

`React.memo(AnimatedBackground)` is sufficient on its own and is a one-line change: `phase` is its only prop, so the entire 125-View + 15-Particle + PuzzleAtmosphere subtree leaves App's render path except on a genuine phase change. If the inner components are memoized instead, note that `React.memo(Particle)` alone will never bail — `motion` is a fresh object literal from `getParticleMotion(phase)` called unmemoized at line 400 and passed to every Particle, so it needs a `useMemo` first. `SoftWash`'s props are all primitives, so its memo is free.

---

### P6 — Autosave never bails and has no dirty check: a fresh spentLetters array plus the speed clock force full-board writes on renders and ticks that changed no board state

**Severity:** LOW &middot; **Effort:** small &middot; **verifiers split**

**Where:** `src/hooks/usePuzzleGame.ts:3471, src/hooks/useAutosave.ts:174, src/hooks/useAutosave.ts:181, src/hooks/useAutosave.ts:88, src/services/puzzleSaveState.ts:100, src/hooks/useSpeedTimer.ts:67, App.tsx:1369`

**What breaks**

Two compounding causes of the same waste. (a) `usePuzzleGame` builds its returned `state` as a plain literal with no `useMemo` (usePuzzleGame.ts:3445) and line 3471 is `spentLetters: [...spentLetterSet],` — a brand-new array every evaluation. `deps.spentLetters` is entry 174 of useAutosave's dependency array, and React compares deps with `Object.is`, so that entry can never compare equal: the effect tears down and re-arms on EVERY App render while playing, making the other 37 carefully enumerated value deps dead. (b) `deps.speedTimeRemaining` (entry 181) changes once per second for the whole of a timed run, re-arming the effect independently. The write body (useAutosave.ts:88-133) has NO comparison against what was last persisted, and `savePuzzleState` is a bare `AsyncStorage.setItem(PUZZLE_SAVE_KEY, JSON.stringify(state))` with no throttle or dedupe (puzzleSaveState.ts:100-107), so every re-arm that survives the 120ms debounce serializes and writes the entire board — `rows` with every Letter object, `history`, `solution`, `reverseSolution`, `hint`, `hintDisclosures`, `spentLetters`, `message` — measured at ~3.6 KB for a standard HARD board and ~5.4 KB for a 6-letter reverse EXPERT board. The code's own comment at App.tsx:1086 ('useAutosave fires on every speedTimeRemaining tick') was written to explain a hazard, not a design goal.

**Failure scenario**

(a) A player mid-board taps the '?' How-to-Play button and closes it without touching the board. That is two `showRules` state changes, two renders, two effect re-arms, and because the 260ms tileFlight clear and 750ms starBurst clear also fall outside the 120ms debounce window, a realistic board issues roughly 8-12 redundant full-board writes on top of the ~4-6 the real moves need. (b) A player past the 55-solve Speed gate plays an EXPERT Reverse speed board: `SPEED_TIME_LIMITS.EXPERT` (44) x `SPEED_STYLE_TIME_MULTIPLIER.reverse` (1.9) = ~83 seconds. Even if they never touch the board, the clock ticks the displayed integer 83 times and each tick re-arms the effect and writes ~5.4 KB. An EASY Reverse speed board (123s) issues ~123 writes. Across a ten-board speed streak that is several hundred JSON.stringify + AsyncStorage.setItem round trips. Note the (b) writes are not literally redundant — `speedTimeRemainingSec`/`speedTimerExpireAt`/`savedAt` do change, and App.tsx:2068-2071 restores the clock from `saved.speedTimeRemainingSec` with no elapsed adjustment, so the per-tick write is currently the only thing keeping the speed clock accurate across a hard kill. The defect is that the WHOLE board is re-serialized to carry one changed integer.

**Evidence**

usePuzzleGame.ts:3471 `spentLetters: [...spentLetterSet],` inside a non-memoized `const state: PuzzleGameState = {` at :3445. App.tsx:391 `const [puzzle, puzzleActions] = usePuzzleGame();` — inside MainApp. useAutosave.ts:174 `deps.spentLetters,` and :181 `deps.speedTimeRemaining,` inside the dep array spanning 143-184. useAutosave.ts:88-133 builds the full snapshot and calls `savePuzzleState(saveData as SavedPuzzleState).catch(() => {});` with no comparison. puzzleSaveState.ts:100-107 `export async function savePuzzleState(state) { saveCache = state; try { await AsyncStorage.setItem(PUZZLE_SAVE_KEY, JSON.stringify(state)); }`. useSpeedTimer.ts:67-70 recomputes and `setSpeedTimeRemaining(remaining)` every `SPEED_TIMER_INTERVAL_MS` (250ms, timing.ts:75); React bails on 3 of every 4 ticks because the value is an integer second.

**Fix**

Both halves are needed. (1) Memoize the exported array — `const spentLetters = useMemo(() => [...spentLetterSet], [spentLetterSet])` — so the dep array's value entries become meaningful again (this also feeds the Row-memo finding). (2) Gate the write on a content signature: keep the last written payload's cheap signature (row ids + letter chars, history.length, activeRowIndex, selectedLetter id, the mode flags) in a ref and skip `savePuzzleState` entirely when it matches, so a clock-only or render-only change writes nothing. If the speed clock still needs per-tick durability, persist only that field, or accept the signature check plus a write on AppState 'background' — but note no AppState listener in App.tsx currently persists puzzle state, so that path would have to be added and would still not cover a foreground force-kill.

---

### P7 — Both generator vocabularies are built at module import, on the pre-first-paint cold-start path, for a code path most sessions never reach

**Severity:** LOW &middot; **Effort:** small

**Where:** `src/services/generatorVocabulary.ts:13, src/services/generatorVocabulary.ts:14, src/services/puzzleVocabulary.ts:7, src/services/localGenerator.ts:2, App.tsx:189`

**What breaks**

`generatorVocabulary.ts` executes `buildWordSets(false)` and `buildWordSets(true)` at module scope. Each call walks all 22,749 `DICTIONARY_WORDS` and calls `isFairPuzzleWord(word, advanced)`, which does up to five Set lookups per word — ~45,500 iterations before anything renders. This lands on the cold-start critical path because App.tsx:189 statically imports `localGenerator`, which statically imports `generatorVocabulary` at line 2, and Metro evaluates a module body the moment it is required: before MainApp mounts, before the boot gate, before the first frame. Most of it is unnecessary — per the project's own documentation every (variant x difficulty x lexicon) combination now resolves to a pre-generated bank, so on-device generation only runs for echo puzzles, and `advancedWordSets` specifically is only reachable via `withGenerationVocabulary(true, ...)` (localGenerator.ts:3219/3230), i.e. EXPERT/Lexicon on-device generation, which in practice never happens.

**Failure scenario**

A player cold-starts on a budget Android. Measured by replaying the real code paths against the real data files on Node with JIT, the module-scope dictionary chain costs 37.7ms total: dictionary array parse 3.7ms, the four `puzzleVocabulary` policy Set builds 6.9ms, `new Set(DICTIONARY_WORDS)` 1.8ms, the five `wordLists` filters 6.6ms, `buildWordSets` x2 14.5ms, `WORD_INDEX` 2.9ms. The two `buildWordSets` calls are ~40% of that, and roughly half of THAT (the advanced family) is for a path the player may never reach in that session or at all. Hermes has no JIT, so the on-device figure is a multiple. The rest of the chain is genuinely required by boot-path code (`new Set(DICTIONARY_WORDS)` backs `validateWord`; `WORD_INDEX` backs `getFeaturedRank`/`getWordPhaseTier`, which Row renders with), so these two calls are the avoidable slice.

**Evidence**

generatorVocabulary.ts:4-14 `function buildWordSets(advanced: boolean) { ... for (const word of DICTIONARY_WORDS) { if (sets[word.length] && isFairPuzzleWord(word, advanced)) sets[word.length].add(word); } return sets; }` followed immediately by `const commonWordSets = buildWordSets(false); const advancedWordSets = buildWordSets(true);` at module scope. puzzleVocabulary.ts:7-13 `isFairPuzzleWord` does `word.toUpperCase()` then `DICTIONARY.has && AUDITED_PUZZLE_WORDS.has && !EXCLUDED_PUZZLE_WORDS.has && !OBSCURE_PUZZLE_WORDS.has && !ADVANCED_PUZZLE_WORDS.has`. App.tsx:189 statically imports localGenerator; localGenerator.ts:2 imports this module.

**Fix**

Make both families lazy behind the accessor that already funnels every read — `getGenerationWordSets()` — building each family on first use and caching it, the same lazy pattern `getInsertionIndex` (localGenerator.ts:107) already uses. At minimum defer `advancedWordSets`, which only EXPERT/Lexicon on-device generation can reach. The `word.toUpperCase()` in `isFairPuzzleWord` is also dead work on this path since `DICTIONARY_WORDS` is already uppercase (a small win — V8 returns the receiver unchanged for already-uppercase one-byte strings, but Hermes may not).

---

### P8 — getInsertionIndex brute-forces 26 letters per position (1.17M probes) where the removal-side build its own sibling already uses is 25x faster for identical output

**Severity:** LOW &middot; **Effort:** small

**Where:** `src/services/localGenerator.ts:118, src/services/localGenerator.ts:2630, src/services/localGenerator.ts:2452`

**What breaks**

The adjacency index is built by iterating every base word, every insertion position, and all 26 letters, concatenating a candidate string and probing the (W+1) set. For wordLength 6 under the advanced vocabulary that is 6,454 base words x 7 positions x 26 letters = ~1.17M string allocations and Set probes to produce ~4,100 index entries. The identical index can be built from the REMOVAL side (iterate the (W+1) set, drop each position, keep it when the remainder is in the base set): ~7,807 x 7 = ~55k probes. Running both against the real dictionary and the real fair-vocabulary filter and diffing the full sorted triple lists gives byte-identical output at 95ms vs 3.8ms (length 6), 50.7ms vs 5.8ms (length 5), 24.7ms vs 3.9ms (length 4) on desktop Node with JIT. The codebase already knows the technique: the sibling `getDoubleInsertionIndex` at localGenerator.ts:2630 builds its index exactly that way (`for (const resultWord of maxSet)` + position removal). The build is fully synchronous with no `await`, and it is called from inside `findPath` (line 2452), which otherwise deliberately yields to the event loop every 15ms.

**Failure scenario**

An EXPERT player past Phase 3 (reachable from solve 62; echo boards fire on every 5th standard board, usePuzzleGame.ts:1451) taps Play on the first echo board of an app session. `generateLocalPuzzle` -> `findPath` -> `getInsertionIndex(6)` runs ~1.17M string concatenations + Set probes in one synchronous block with no yield: 101ms measured on desktop V8, several times that under Hermes. The block happens behind the LOADING game state (usePuzzleGame.ts:1317) so the player is already waiting, but it is also deducted from the generator's own 2.5s search budget — `state.startTime` (line 1450) predates the `findPath` call that builds the index — so on a slow Hermes device it makes the first forced-start echo chain of a session measurably likelier to fall through to the below-floor relaxation path at line 1502 or time out to a bank fallback. MEDIUM_PLUS/HARD players pay the length-5 version (50.7ms desktop) on their first echo board. Cached per (vocabulary key, word length) per process, so it is once per length per launch, not per board.

**Evidence**

localGenerator.ts:118-133 `for (const word of baseSet) { for (let j = 0; j <= word.length; j++) { for (let c = 65; c <= 90; c++) { const letter = String.fromCharCode(c); const combined = word.slice(0, j) + letter + word.slice(j); if (maxSet.has(combined)) { ... targets.push({ baseWord: word, result: combined, position: j }); } } } }` — vs the cheap direction at localGenerator.ts:2630 `for (const resultWord of maxSet) { ... if (baseSet.has(remainder)) ...`. The file's own comment at line 104 already estimates '~50-100ms per word length'.

**Fix**

Invert the loop the way `getDoubleInsertionIndex` already does: `for (const result of maxSet) { for (let j = 0; j < result.length; j++) { const baseWord = result.slice(0, j) + result.slice(j + 1); if (baseSet.has(baseWord)) push({ baseWord, result, position: j }) under key result[j]; } }`. The produced (letter, baseWord, result, position) multiset was verified identical to the current build for lengths 4, 5 and 6 against the real vocabulary sets. One caveat: the inversion changes the ORDER of entries within each letter bucket, so the randomized/scored search will emit different boards than before; nothing depends on that order for correctness, and the daily is unaffected since it is bank-served (dailyChallenge.ts never imports localGenerator).

---

### P9 — Offer All cascade drives ~100-160 root re-renders of the pit screen in ~1.5s, rebuilding four native glow interpolation graphs each time

**Severity:** LOW &middot; **Effort:** medium

**Where:** `src/components/OfferingPitScreen.tsx:996, src/components/OfferingPitScreen.tsx:1736, src/components/OfferingPitScreen.tsx:1772, src/components/OfferingPitScreen.tsx:1806, src/components/OfferingPitScreen.tsx:1979, src/components/OfferingPitScreen.tsx:1426, src/components/OfferingPitScreen.tsx:1330`

**What breaks**

All five particle families are `useState` arrays owned by the OfferingPitScreen ROOT component (lines 996-1000) and rendered inline in its own JSX. Every individual particle's animation completion calls a root `setState` filter: 1736 (trail), 1772 (impact), 1806 (shockwave), 1979 (amber), 1426 (rim). During `handleHarvestAll`'s cascade these fire in bulk. Each of those renders re-executes the whole component body, which rebuilds the four glow-layer interpolation graphs from scratch — `breathOpacityOuter/Middle/Inner/Core` are `Animated.multiply(pitBreathProgress.interpolate(...), glowIntensity)` created inline at lines 1330-1363 — plus `breathScale`, and (while a phase transition is pending) `wardPulseOpacity`/`wardPulseScale`. The codebase documents the correct pattern in the same feature area: HouseWorld.tsx:233 extracts `AmbientParticles` into a memoized child precisely 'so its ~2s spawn setState never re-renders the parent HouseWorld'; the pit does the opposite for five families at a far higher rate. The rim spawner's 1000ms interval plus its completions (1426) also keeps the pit re-rendering at ~2-4/s even while idle.

**Failure scenario**

A player opens the pit with 30-50 words pending and taps 'Offer All'. `getBulkOfferTiming` spreads the cascade over ~1.5-1.6s (`MAX_BULK_CASCADE_MS_LARGE` = 1600 past the 20-word `BULK_STRETCH_THRESHOLD`). Trail spawns on every 3rd word, impact bursts on every 4th, plus shockwaves, amber particles and the per-word `setFlyingWords`/`setDisplayBalance`/`setPendingAmberOffset` triple (React 19 batches those three into one render, and an 8-particle burst's identical durations complete in one native batch), giving roughly 100-160 root renders in ~1.5s. Because every animation here is `useNativeDriver: true`, the spiral and glow visuals do NOT drop frames and recreating a stateless interpolation over a persisting native value does not reset it — the real symptom is JS-thread saturation: the `setTimeout` stagger that starts each word drifts, so the cascade rhythm goes uneven and the amber count-up jitters, on the game's marquee harvest moment. Even a LOW-tier device (15-word cap, shockwave off, particle counts halved) still takes ~40 renders in ~1.1s with the same four glow-node rebuilds.

**Evidence**

Lines 996-1000 `const [trailParticles, setTrailParticles] = useState<TrailParticle[]>([]); const [impactParticles, ...]; const [amberParticles, ...]; const [rimParticles, ...]; const [shockwaveRings, ...];` — all on the root screen. Line 1736 `]).start(() => { if (mountedRef.current) setTrailParticles(prev => prev.filter(tp => tp.id !== p.id)); });` — one root setState per particle. Lines 1330-1363 `const breathOpacityOuter = Animated.multiply(pitBreathProgress.interpolate({...}), glowIntensity);` x4, recreated every render. pitOfferTiming.ts:7/13 `MAX_BULK_CASCADE_MS = 1000` / `MAX_BULK_CASCADE_MS_LARGE = 1600`. Contrast HouseWorld.tsx:233.

**Fix**

Two parts, and the glow half carries more weight than the particle half (even with every family extracted, `setDisplayBalance` alone still forces ~30-50 root renders during the cascade). (1) Hoist the glow interpolation chain — `breathOpacityOuter/Middle/Inner/Core`, `breathScale`, `wardPulseOpacity`/`wardPulseScale` — into a `useMemo` keyed on `[phase, tendingLevel, glowIntensity]` so a re-render does not tear down and rebuild those native animated nodes. (2) Move each particle family into its own `React.memo` child that owns its array state (the `AmbientParticles` pattern), exposing an imperative `spawn()` via ref, so a particle's completion filter re-renders only that layer. Note the per-particle views (TrailParticleView:587, ImpactParticleView:605, AmberParticleView:623, RimParticleView:641, ShockwaveRingView:687) and FloatingWordChip:491 are ALREADY `React.memo` with stable props and do bail out — the waste is the root body and element creation, not deep child reconciliation.


---

## Appendix — merge and drop notes

### Correctness

MERGES PERFORMED (67 input findings -> 32 entries):
- #1 (pit soft-lock) = inputs 45 + 57, identical defect.
- #2 (notifications) = inputs 27 + 34, identical defect. Corrected one shared imprecision: only scheduleDailyReminder's try wraps its whole loop (so one throw kills the remaining rungs); scheduleWinBackLadder's try is inside the loop, so all five rungs throw independently. Net result identical (zero scheduled). Also corrected: the secondary claim that a bare {date} would "fall through to the Android channel branch and fire immediately" is unreachable — parseTrigger throws at the hasValidTriggerObject gate first.
- #6 (unlock split-write) = inputs 6 + 10 + 29 + 37 + 52. All four functions (unlockRoom/unlockAnimal/reserveUnlock/skipReservedUnlock) plus the four uncaught useUnlockFlow handlers are one defect with one fix.
- #8 (NG+ endgame floors) = inputs 60 + 63, same root scale mismatch.
- #12 (stale autosave + phase pin) = inputs 55 + 56; 55 causes 56's path A and 56 is independently reachable via path B.
- #13 (non-atomic reward writes) = inputs 7 + 11 + 12 + 53 + 54. Five different services, same pattern and same remedy; kept per-site failure modes in the evidence.
- #14 (echo board) = inputs 3 + 4, same call site, two missing guards.
- #15 (quest double) = inputs 15 + 32 + 38.
- #19 (speed clock under overlays) = inputs 47 + 48, same missing pause predicate.
- #23 (mirror invalidation) = inputs 8 + 44 + 65, all downstream of invalidateRestoredServiceCaches.
- #28 (hint mirror) = inputs 64 + 66.
- #29 (backwards clock) = inputs 35 + 36 (+ the supporterStipend sibling noted in 36's verification).
- #30 (iOS a11y labels) = inputs 40 + 41 + 42, same RN mechanism.
- #31 (VictoryModal compact) = inputs 20 + 21, both compactMode reading live state.

DROPPED AS NOT MEETING THE BAR:
- Input 50 (New Cycle does not clear wordshift_guaranteed_crossref_phase_*): verification established that the forced and rolled branches call the identical stateless getCrossAnimalReference, so NO content is lost — only a per-phase guarantee. With a 0.20-0.60 roll per visit across dozens of visits per phase in a full 13-resident NG+ house, the probability of a phase passing with zero cross-references is negligible. A real reset-list inconsistency, but with no demonstrated player-visible consequence.

REAL BUT BELOW THE 32-ENTRY CUT (recorded so they are not lost; all verified, all low):
- Input 2: Unbroken Weave toggle calls the PERSISTING setSelectedVariant('standard'), permanently overwriting the player's stored preferred variant (usePuzzleGame.ts:1308); handleToggleUnbrokenWeave passes 'standard' on both the on and off transitions, and disableUnbrokenWeave never restores it either. Fix: use setSelectedVariantState in the weave branch.
- Input 16: handleOutOfHints (App.tsx:4019-4023) offers 'Watch a clip (+1)' gated on isRewardedCapReached alone, with no isAdsReady() check, so an offline or pre-consent-settled player taps a permanently dead button. Fix: add isAdsReady() to the condition and make the alert body conditional.
- Input 18: requestATTIfNeeded (googleAdMobAds.ts:342) lacks the `if (!mod) return;` guard its sibling requestConsentIfNeeded has, so an iOS build with no configured ad units still fires the ATT system prompt (reachable from the first Store open via retryAdConsentIfUnready(true)). Latent until iOS ships; App Review risk.
- Input 23: useDialogueFlow.ts:1774 uses `nextCaughtUp < pool.length` for the Phase-5 badge instead of the hasNewPhase5Line + buildPhase5Eligibility predicate the other two badge sites use; reachable only for Sloane/Fennick with specific tending bands and an unbuilt later room, and self-heals on the next home mount.
- Input 28: the hardware-back sub-screen branch (App.tsx:4500-4503) re-implements a partial handleGoHome and omits `puzzlesSinceHomeVisit.current = 0`, so returning home via Android back does not count as a home visit and can spend the once-per-session home nudge on a false premise. Fix: call handleGoHome().
- Input 30: getReservedSpeedUpState returns 'none' as soon as the level gate opens, ignoring the descent-trio weighted-phase hold, so a reserved Star Loft can show 'Arrives at level 84 (you're at 90)' plus a bare 'Reserved' chip. Fix: return 'not_yet' while isUnlockGateBlocked is still true.
- Input 43: entitlement-backed cosmetics keep rendering after the entitlement is revoked (syncEquippedFrom copies state.equipped with no ownership check; nothing bridges revocation to unequip), and ShopScreen tests isEquipped before isOwned so the row reads 'Equipped' instead of 'Patron only'. Publisher-side leak, player-favourable.
- Input 49: PracticeModal both renders state.message in a Text with accessibilityLiveRegion="polite" AND calls announceForA11y with the same string, so Android TalkBack speaks every lesson instruction twice on each step change. Fix: the `if (Platform.OS !== 'ios') return;` guard Toast.tsx already uses.
- Input 51: wordshift_tending is absent from NEW_CYCLE_NARRATIVE_KEYS while wordshift_dialogue_choices is present, so the retained per-resident caughtUp pointer plus a newly-answered choice shifts the Phase-5 pool's coordinate space and delivers an already-read Tending line flagged isNew while burying the genuinely new callback.
- Input 58: getCurrentPos (OfferingPitScreen.tsx:2221) reads __getValue() on natively-driven infinite loop values, which never sync back to JS, so the devour spiral and its trail always start from the t=0 position — a visible jump of up to ~64dp on every tap-to-devour and every Offer All chip (medium/high tier with motion enabled only). Fix: attach a value listener or compute t from wall-clock time.
- Input 61: StoryJournalModal renders 'A conversation is waiting' for any incomplete memory, with no state for scenes canResumeStoryScene will permanently refuse (phase >= 5 / postRevelation), so a deferred scene advertises a visit no code path can serve for the rest of the cycle.
- Input 62 is INCLUDED at rank 26.

IMPACT CORRECTIONS APPLIED DURING SYNTHESIS (from verifier notes, folded into the entries above):
- Rank 5: drag still resolves correctly (estimateSlotIndex centres the same content); the loss is the tap path plus visible clipping, and 390dp+ devices are largely unaffected.
- Rank 8: the retained houseCompleted is deliberate, so only canArmFinale and applyPuzzleExposureGuard are on the wrong scale; the worst harm is skipped story scenes, not the mistimed micro-beats the reporters led with.
- Rank 11: grantBonusHint's hint is durably credited (only its toast is lost) and consumeVariantNudge is day-scoped; only the two once-ever flags are permanent losses.
- Rank 14: Lexicon boards are protected by the !requestedLexicon gate, and the on-device fallback site is near-dead; nearly all exposure is the echo path.
- Rank 16: 'passage' entries self-heal via shuffled re-reads, so the permanent losses are the 13 choice answers and the phase 0-4 whispers.
- Rank 23: the cosmetics half largely self-heals on the next HomeScreen mount (ownsCosmetic -> load() -> syncEquippedFrom); the durable half is the hint mirror.
- Rank 7: on the FIRST amber pack the duplicate is base-rate, not doubled again (markAmberPurchaseMade already ran), so 3x base then 2x base thereafter.

### Performance

Nothing was dropped as a non-defect; all 15 survived my own spot-check against the real code. Six merges reduced 15 reports to 9 entries.

MERGES. (1) #1 + #2 -> rank 1: identical defect (per-key serialized reads in collectLocalSaveData inside the exclusive cloud_snapshot transaction). I kept #1's dirty-check observation and #2's UI-gating chain, and verified both myself: cloudSave.ts:557 is the sequential loop, persistenceStorage.ts:78/99 sets/clears `busy`, App.tsx:362 exposes it, App.tsx:377 is the 180ms hold and globalOverlays.ts:11-18 confirms `saving`=0 outranks `victory`=7. (2) #3 + #4 + #6 + #9 -> rank 2: four angles on one defect (reveal state in useDialogueFlow re-rendering HomeScreen + un-memoized HouseWorld, plus the unmemoized per-render corpus derivations). (3) #8 + #12 -> rank 4: identical (unchunked extension pre-filter at puzzleBank.ts:696). I took #12's corrected mechanism (the `isValidWord(remainder)` early-out means cost concentrates in a minority of positions, not a full scan per board), #8's correct identification of EXPERT as worst, and both reporters' converged pool-size correction. (4) #14 + #15 -> rank 6: two causes of one defect — useAutosave re-arms on every render (unstable `spentLetters`) AND every speed second, and the write body has no dirty check. #14's own reporter noted removing `speedTimeRemaining` alone would not fix it, which confirms they are one entry.

CORRECTIONS FOLDED IN (claims I removed because verification disproved them). Cluster 2: RoomView IS React.memo'd with stable props, so the 13 room subtrees bail — I removed "the whole 13-room tree re-renders"; HouseWorld has 38 useNativeDriver:true and zero false, so "stuttering clouds/smoke/star twinkle" is impossible and the honest symptom is typewriter cadence drift plus touch latency; the 45-67Hz tick and the full phase-3/4 scene never co-occur (15ms only at phases 0-1, where most of the enumerated children render nothing); the "~1M predicate evaluations" figures are correct as iteration counts but the corpus scans measure ~0.02-0.06ms/render, so the wide re-render dominates and the fix ordering was inverted accordingly. Rank 1: the victory modal is a SIBLING of the pointerEvents-gated wrapper (App.tsx:6121 vs 6039), so its controls die only once the 180ms hold takes the overlay, not for the whole window; `persistenceStorage.multiGet` does not batch either. Rank 3: memoizing puzzleActions alone is insufficient (handleSlotPress also depends on the `dreadEffects` state object), and even a perfect fix still misses on genuine board changes — I rewrote the fix and scenario accordingly and raised effort to large. Rank 5: `React.memo(Particle)` alone cannot bail because `motion` is a fresh literal; only the one-line memo on AnimatedBackground itself is sufficient. Rank 6: the speed-tick writes are NOT byte-identical and are currently the only thing preserving clock accuracy across a hard kill (App.tsx:2068 restores from speedTimeRemainingSec with no elapsed adjustment, and no AppState listener persists puzzle state), so I reframed it as "the whole board re-serialized to carry one integer" and flagged the fix caveat. Rank 9: magnitude halved (1600ms cascade, React batching, identical-duration bursts completing together), the particle/chip views are already memoized so they bail, native drivers mean no dropped frames, and the glow-node rebuild is the higher-leverage half of the fix.

RANKING NOTE: none of these 15 touches correctness, currency, progress or save integrity — they are all performance. So the ranking is by player-visible impact x frequency, then effort. Rank 1 leads because it is the only one that gates player INPUT on a per-victory path and can put a blocking spinner over the result screen; rank 2 is a sustained 45-67Hz cost on the core narrative surface; rank 3 kills memoization the codebase deliberately added; rank 4 partly undoes an explicit prior mitigation (F136) one function below it. Two entries are flagged disputed: the dialogue cluster (verifiers split high/medium/low, converging on medium once the native-driver and RoomView-memo facts landed) and the autosave cluster (its verifier disputed the "redundant write" framing, which I corrected in place).
