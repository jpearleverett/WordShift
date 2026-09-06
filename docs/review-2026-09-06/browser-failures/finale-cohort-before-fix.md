# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: game.spec.ts >> playing the final CLOSED choice persists its boundary through relaunch
- Location: e2e/game.spec.ts:274:7

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: locator.click: Test timeout of 180000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Play puzzle', exact: true })
    - locator resolved to <button role="button" type="button" aria-label="Play puzzle" class="css-view-g5y9jx r-transitionProperty-1i6wzkk r-userSelect-lrvibr r-cursor-1loqt21 r-touchAction-1otgn73 r-alignItems-1awozwy r-borderBottomWidth-r7j6xl r-borderRadius-a1yn9n r-borderWidth-1rf8fdq r-height-1mwlp6a r-justifyContent-1777fci r-paddingInline-3o4zer">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="css-view-g5y9jx r-alignItems-1awozwy r-flexDirection-18u37iz r-justifyContent-17s6mgv">…</div> from <div>…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="css-view-g5y9jx r-alignItems-1awozwy r-flexDirection-18u37iz r-justifyContent-17s6mgv">…</div> from <div>…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    257 × waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
        - scrolling into view if needed
        - done scrolling
        - <div class="css-view-g5y9jx r-alignItems-1awozwy r-flexDirection-18u37iz r-justifyContent-17s6mgv">…</div> from <div>…</div> subtree intercepts pointer events
      - retrying click action
        - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=f2e1]:
  - generic [ref=f2e8]:
    - generic [ref=f2e10]:
      - button "120 amber. Opens the store." [ref=f2e12] [cursor=pointer]:
        - generic [ref=f2e13]: "120"
      - generic [ref=f2e18]:
        - button "Start daily challenge" [ref=f2e20] [cursor=pointer]
        - button "Open quests. All quests complete. Daily quests reset in 4 hours." [ref=f2e24] [cursor=pointer]
        - button "Open journal, 10 season rewards ready" [ref=f2e27] [cursor=pointer]
        - button "Open utility menu" [ref=f2e32] [cursor=pointer]
    - generic [ref=f2e35]:
      - generic [ref=f2e41]:
        - generic [ref=f2e49]:
          - button "Build Rustic Kitchen for 50 amber" [ref=f2e51] [cursor=pointer]:
            - generic [ref=f2e52]:
              - generic [ref=f2e55]: Rustic Kitchen
              - generic [ref=f2e56]:
                - generic [ref=f2e57]: Build
                - generic [ref=f2e60]: "50"
              - generic [ref=f2e61]: Tap to build
          - generic [ref=f2e69]:
            - generic [ref=f2e74]: COZY DEN
            - generic: EMBER
            - button "Ember the fox" [ref=f2e78] [cursor=pointer]
        - button "Enter the Offering Pit" [ref=f2e92] [cursor=pointer]
      - button "Next unlock. 120 of 50 amber" [ref=f2e97] [cursor=pointer]:
        - generic [ref=f2e98]:
          - generic [ref=f2e99]: Next Unlock
          - generic [ref=f2e102]: 120 / 50 amber
    - button "Play puzzle" [ref=f2e105] [cursor=pointer]:
      - generic [ref=f2e106]: PLAY
  - dialog [ref=f2e108]:
    - generic [ref=f2e110]:
      - button "Close intro dialogue" [active] [ref=f2e111] [cursor=pointer]
      - generic [ref=f2e114]:
        - generic [ref=f2e115]:
          - img "Ember portrait" [ref=f2e116]
          - generic [ref=f2e121]: Ember
        - generic [ref=f2e123]:
          - generic [ref=f2e125]:
            - generic [ref=f2e126]: There is a hollow at the heart of the house.
            - generic [ref=f2e127]: A little amber disappears into it when I let go.
          - button "Continue intro" [ref=f2e129] [cursor=pointer]:
            - generic [ref=f2e130]: Next
```

# Test source

```ts
  186 |     await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  187 |     await page.reload({ waitUntil: 'domcontentloaded' });
  188 |     await expect(object).toBeVisible();
  189 |     expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_story_spine')!).worldInspected)).toBe(true);
  190 |   });
  191 | }
  192 |
  193 | test('journal rewards and support benefits are discoverable', async ({ page }) => {
  194 |   await openReturningBoard(page);
  195 |   await page.getByRole('button', { name: 'Go home', exact: true }).click();
  196 |   await page.getByRole('button', { name: /^Open journal/ }).click();
  197 |   await expect(page.getByRole('heading', { name: 'STORIES AND DISCOVERIES', exact: true })).toBeVisible();
  198 |   await page.getByRole('button', { name: /^Open quests(?:,|$)/ }).click();
  199 |   await expect(page.getByRole('button', { name: /^Open season pass/ })).toBeVisible();
  200 |   await capture(page, 'updated-tasks-rewards');
  201 |   await page.getByRole('button', { name: 'Close quests', exact: true }).last().click();
  202 |   await page.getByRole('button', { name: /amber\. Opens the store\.$/ }).click();
  203 |   await page.getByRole('button', { name: 'Compare Remove Ads, Patron and Supporter', exact: true }).click();
  204 |   await expect(page.getByText('Supporter · monthly subscription', { exact: true })).toBeVisible();
  205 |   await capture(page, 'updated-support-comparison');
  206 |   await page.getByRole('button', { name: 'Close store', exact: true }).click();
  207 |   await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  208 | });
  209 |
  210 | test('resident dialogue keeps its reading and controls reachable at 320px with enlarged text', async ({ page }) => {
  211 |   await openReturningBoard(page);
  212 |   await page.getByRole('button', { name: 'Go home', exact: true }).click();
  213 |   await page.setViewportSize({ width: 320, height: 568 });
  214 |   const ember = page.getByRole('button', { name: 'Ember the fox', exact: true });
  215 |   await ember.scrollIntoViewIfNeeded();
  216 |   await ember.click();
  217 |   const next = page.getByRole('button', { name: 'Continue dialogue', exact: true });
  218 |   await expect(next).toBeVisible();
  219 |   await enlargeBrowserText(page);
  220 |   await next.scrollIntoViewIfNeeded();
  221 |   await expect(next).toBeInViewport();
  222 |   const bounds = await next.boundingBox();
  223 |   expect(bounds).not.toBeNull();
  224 |   expect(bounds!.x).toBeGreaterThanOrEqual(0);
  225 |   expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
  226 |   await capture(page, 'updated-resident-small-large-text');
  227 |   await page.getByRole('button', { name: 'Close dialogue', exact: true }).click({ position: { x: 4, y: 4 } });
  228 |   await expect(ember).toBeVisible();
  229 | });
  230 |
  231 | test('a real house ceremony remains readable and can finish at 320px with enlarged text', async ({ page }) => {
  232 |   await openReturningBoard(page);
  233 |   await page.evaluate(() => {
  234 |     const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
  235 |     const residents = ['fox', 'pangolin', 'owl', 'axolotl', 'sloth', 'fennec_fox', 'capybara', 'wombat', 'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo'];
  236 |     Object.assign(progress, {
  237 |       currentPhase: 4, phaseProgress: 100, puzzlesSolved: 100,
  238 |       houseCompleted: true, houseCompletionCelebrated: false,
  239 |       finaleArmed: false, finalPuzzleCompleted: false, postRevelation: false,
  240 |       unlockedAnimals: residents, introsSeen: residents,
  241 |       unlockedRooms: ['cozy_den', 'kitchen', 'study', 'aquarium', 'jungle_room', 'desert_room', 'office', 'burrow', 'garden', 'bamboo_attic', 'star_loft', 'belfry', 'sky_garden'],
  242 |     });
  243 |     localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
  244 |     localStorage.setItem('wordshift_sacrifices', JSON.stringify({
  245 |       totalAmberSacrificed: 0, sacrificeCount: 0, sacrificeHistory: [],
  246 |       lastSacrificeTimestamp: 0, introSeen: true,
  247 |     }));
  248 |   });
  249 |   await page.setViewportSize({ width: 320, height: 568 });
  250 |   await page.reload({ waitUntil: 'domcontentloaded' });
  251 |   const pause = page.getByRole('button', { name: 'Pause and read at my pace', exact: true });
  252 |   await expect(pause).toBeVisible({ timeout: 30_000 });
  253 |   await pause.click();
  254 |   for (let scene = 0; scene < 5; scene++) {
  255 |     const advance = page.getByRole('button', { name: scene === 4 ? 'Return to the house' : 'Continue the scene', exact: true });
  256 |     await expect(advance).toBeVisible();
  257 |     await enlargeBrowserText(page);
  258 |     await advance.scrollIntoViewIfNeeded();
  259 |     await expect(advance).toBeInViewport();
  260 |     const bounds = await advance.boundingBox();
  261 |     expect(bounds).not.toBeNull();
  262 |     expect(bounds!.x).toBeGreaterThanOrEqual(0);
  263 |     expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
  264 |     await expect(page.getByRole('button', { name: 'Skip transition', exact: true })).toBeInViewport();
  265 |     if (scene === 3) await capture(page, 'updated-ceremony-small-large-text');
  266 |     await advance.click();
  267 |   }
  268 |   await expect(page.getByRole('button', { name: 'Skip transition', exact: true })).toHaveCount(0);
  269 |   await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  270 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).houseCompletionCelebrated)).toBe(true);
  271 | });
  272 |
  273 | for (const [letter, finalWord, boundary] of [['D', 'CLOSED', 'remember'], ['R', 'CLOSER', 'release']] as const) {
  274 |   test(`playing the final ${finalWord} choice persists its boundary through relaunch`, async ({ page }) => {
  275 |     test.setTimeout(180_000);
  276 |     await openReturningBoard(page);
  277 |     await page.evaluate(() => {
  278 |       const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
  279 |       Object.assign(progress, { currentPhase: 4, phaseProgress: 160, puzzlesSolved: 160,
  280 |         finaleArmed: true, finalPuzzleCompleted: false, postRevelation: false });
  281 |       localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
  282 |       localStorage.removeItem('wordshift_in_progress_puzzle');
  283 |       localStorage.removeItem('wordshift_story_spine');
  284 |     });
  285 |     await page.reload({ waitUntil: 'domcontentloaded' });
> 286 |     await page.getByRole('button', { name: 'Play puzzle', exact: true }).click();
      |                                                                          ^ Error: locator.click: Test timeout of 180000ms exceeded.
  287 |     const later = page.getByText('Come back to this', { exact: true });
  288 |     await expect(later).toBeVisible();
  289 |     await later.click();
  290 |     await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || '{}').isFinalBoard)).toBe(true);
  291 |     const moves = [
  292 |       { letter: 'S', formed: 'SCARED' }, { letter: 'D', formed: 'SCARED' },
  293 |       { letter: 'S', formed: 'SHARES' }, { letter: 'S', formed: 'CARVES' },
  294 |       { letter: 'V', formed: 'CARVED' }, { letter, formed: finalWord },
  295 |     ];
  296 |     for (const [index, move] of moves.entries()) {
  297 |       const source = page.getByTestId(`puzzle-row-${index}`);
  298 |       await source.getByRole('button', { name: `Letter ${move.letter}`, exact: true }).first().click();
  299 |       // Late-game boards show neutral word previews without a validity verdict.
  300 |       const slot = page.getByTestId(`puzzle-row-${index + 1}`).getByRole('button', { name: new RegExp(`(?:forms ${move.formed}, valid word|would form ${move.formed})$`) });
  301 |       await slot.scrollIntoViewIfNeeded();
  302 |       await slot.click();
  303 |     }
  304 |     await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_story_spine') || '{}').boundary), { timeout: 30_000 }).toBe(boundary);
  305 |     await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).finalPuzzleCompleted)).toBe(true);
  306 |     const solved = await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).puzzlesSolved);
  307 |     await page.reload({ waitUntil: 'domcontentloaded' });
  308 |     await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_story_spine') || '{}').boundary)).toBe(boundary);
  309 |     expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).puzzlesSolved)).toBe(solved);
  310 |   });
  311 | }
  312 |
  313 | test('an interrupted story resumes its saved page and commits the chosen memory once', async ({ page }) => {
  314 |   await openReturningBoard(page);
  315 |   await page.reload({ waitUntil: 'domcontentloaded' });
  316 |   await page.getByRole('button', { name: 'Play puzzle', exact: true }).click();
  317 |   await expect(page.getByRole('heading', { name: 'A place at the table', exact: true })).toBeVisible();
  318 |   await page.setViewportSize({ width: 320, height: 568 });
  319 |   await enlargeBrowserText(page);
  320 |   const continueStory = page.getByRole('button', { name: 'Continue', exact: true });
  321 |   await continueStory.scrollIntoViewIfNeeded();
  322 |   await expect(continueStory).toBeInViewport();
  323 |   await capture(page, 'updated-story-small-large-text');
  324 |   await continueStory.click();
  325 |   await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_story_spine')!).memories.cup.page)).toBe(1);
  326 |   await page.reload({ waitUntil: 'domcontentloaded' });
  327 |   await page.getByRole('button', { name: 'Play puzzle', exact: true }).click();
  328 |   await expect(page.getByText('One cup has a chip in the handle. The other has a crooked flower painted on it.', { exact: true })).toBeVisible();
  329 |   await page.getByRole('button', { name: 'Continue', exact: true }).click();
  330 |   await page.getByRole('button', { name: 'The flower cup. Cocoa, please.', exact: true }).click();
  331 |   await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_story_spine')!).memories.cup.choice)).toBe('flower');
  332 |   await page.getByRole('button', { name: 'Continue', exact: true }).click();
  333 |   await page.getByRole('button', { name: 'Keep this memory', exact: true }).click();
  334 |   await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible();
  335 |   await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_story_spine')!).memories.cup.completed)).toBe(true);
  336 |   await page.reload({ waitUntil: 'domcontentloaded' });
  337 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_story_spine')!).memories.cup.choice)).toBe('flower');
  338 |   await page.getByRole('button', { name: /^Open journal/ }).click();
  339 |   await page.getByRole('button', { name: 'Things We Kept', exact: true }).click();
  340 |   await expect(page.getByRole('heading', { name: 'Things We Kept', exact: true })).toBeVisible();
  341 |   await page.getByRole('button', { name: /^A place at the table/ }).click();
  342 |   await enlargeBrowserText(page);
  343 |   const closeJournal = page.getByRole('button', { name: 'Close', exact: true });
  344 |   await closeJournal.scrollIntoViewIfNeeded();
  345 |   await expect(closeJournal).toBeInViewport();
  346 |   await capture(page, 'updated-story-journal-small-large-text');
  347 |   await closeJournal.click();
  348 |   await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  349 | });
  350 |
  351 | test('reset through Settings rebuilds a fresh playable session', async ({ page }) => {
  352 |   await openReturningBoard(page);
  353 |   await page.getByRole('button', { name: 'Go home', exact: true }).click();
  354 |   await page.getByRole('button', { name: /settings/i }).click();
  355 |   const reset = page.getByRole('button', { name: 'Reset All Progress', exact: true });
  356 |   await reset.scrollIntoViewIfNeeded();
  357 |   await reset.click();
  358 |   await page.setViewportSize({ width: 320, height: 568 });
  359 |   await enlargeBrowserText(page);
  360 |   const confirm = page.getByRole('button', { name: 'Reset Everything', exact: true });
  361 |   await confirm.scrollIntoViewIfNeeded();
  362 |   await expect(confirm).toBeInViewport();
  363 |   await capture(page, 'updated-reset-small-large-text');
  364 |   await confirm.click();
  365 |   await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible({ timeout: 30_000 });
  366 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).puzzlesSolved)).toBe(0);
  367 |   await page.getByRole('button', { name: 'How to play', exact: true }).click();
  368 |   await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
  369 | });
  370 |
  371 | test('a daily resumed after midnight retains its original board identity and clock', async ({ page }) => {
  372 |   await page.clock.setFixedTime(new Date(2026, 8, 6, 23, 55));
  373 |   await openReturningBoard(page);
  374 |   await page.evaluate(() => {
  375 |     const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
  376 |     // The daily card unlocks after eight solved boards.
  377 |     Object.assign(progress, { puzzlesSolved: 8, phaseProgress: 8 });
  378 |     localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
  379 |   });
  380 |   await page.reload({ waitUntil: 'domcontentloaded' });
  381 |   await page.getByRole('button', { name: /^Start daily challenge/ }).click();
  382 |   await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || '{}').isPlayingDaily)).toBe(true);
  383 |   const before = await page.evaluate(() => {
  384 |     const save = JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle')!);
  385 |     return { date: save.dailyDate, version: save.dailyBoardVersion, eased: save.dailyEased, started: save.dailyStartedAt,
  386 |       words: save.rows.map((row: { originalWord: string }) => row.originalWord) };
```
