# WordShift Play Store Listing and Screenshot Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an accurate Google Play listing, eight authentic 1080x1920 phone screenshots, and one opaque 1024x500 feature graphic using a reproducible web-capture and composition pipeline.

**Architecture:** Expo platform-specific web adapters keep native SDKs out of Metro's web graph. A development-only web capture module seeds isolated AsyncStorage scenarios before normal bootstrap, while Playwright drives the production UI and captures real app states. Playwright also renders the approved storybook frames; `pngjs` re-encodes and validates every upload file as opaque 24-bit PNG.

**Tech Stack:** React Native 0.85, Expo SDK 56, TypeScript, Jest, AsyncStorage, Playwright, Node.js scripts, `pngjs`, Google Play 9:16 asset requirements.

---

## File Map

### Create

- `mobile/src/services/providers/googleAdMobAds.web.ts` — inert AdMob provider for web.
- `mobile/src/services/providers/revenueCatBilling.web.ts` — inert RevenueCat provider for web.
- `mobile/src/services/shareImage.web.ts` — web-safe text-sharing implementation without native view-shot imports.
- `mobile/src/dev/playStoreCapture.ts` — native/production no-op capture API.
- `mobile/src/dev/playStoreCapture.web.ts` — development web query parsing and AsyncStorage scenario seeding.
- `mobile/src/dev/playStoreScenarios.ts` — pure scenario registry and valid storage fixtures.
- `mobile/src/__tests__/playStoreScenario.test.ts` — scenario and safety tests.
- `docs/play-store/campaign.json` — ordered campaign copy, filenames, alt text, and color themes.
- `mobile/scripts/tools/capturePlayStoreScreenshots.mjs` — Expo/Playwright capture orchestrator.
- `mobile/scripts/tools/composePlayStoreScreenshots.mjs` — storybook-frame renderer.
- `mobile/scripts/tools/composePlayStoreFeatureGraphic.mjs` — exact wordmark/background composition.
- `mobile/scripts/tools/playStorePng.mjs` — shared opaque PNG read/write and IHDR validation helpers.
- `mobile/scripts/tools/validatePlayStoreAssets.mjs` — upload-asset validator.
- `mobile/scripts/tools/playStoreAssets.test.mjs` — Node tests for PNG validation and campaign integrity.
- `docs/play-store/source/*.png` — eight authentic raw app captures and feature-art source.
- `docs/play-store/final/*.png` — eight upload screenshots and feature graphic.

### Modify

- `mobile/App.tsx` — seed capture state before cloud restore and suppress Sentry/cloud initialization during capture.
- `mobile/package.json` and `mobile/package-lock.json` — latest Playwright dev dependency and store-asset scripts.
- `docs/STORE_LISTING.md` — final Google Play copy, eight-shot manifest, and alt text.
- `docs/LAUNCH_CHECKLIST.md` — distinguish generated assets from the remaining Play Console upload.
- `docs/index.md` — correct stale companion and achievement counts.
- `.gitignore` — ignore Playwright profile/cache and `.superpowers/`.

### Do Not Modify

- `mobile/src/data/puzzleBank*.ts`
- Native AdMob and RevenueCat behavior in the existing `.ts` adapters.
- Gameplay balance, narrative phases, or monetization policy.

---

## Task 1: Make Native Providers Web-Safe

**Files:**
- Create: `mobile/src/services/providers/googleAdMobAds.web.ts`
- Create: `mobile/src/services/providers/revenueCatBilling.web.ts`
- Create: `mobile/src/services/shareImage.web.ts`
- Modify: `mobile/src/__tests__/providerAdapters.test.ts`

- [ ] **Step 1: Add failing web-adapter contract tests**

Append explicit web-file imports and tests to `providerAdapters.test.ts`:

```typescript
import { createAdMobAdProvider as createWebAdProvider } from '../services/providers/googleAdMobAds.web';
import { createRevenueCatBillingProvider as createWebBillingProvider } from '../services/providers/revenueCatBilling.web';

describe('web provider adapters', () => {
  test('AdMob web provider is inert and never grants rewards', async () => {
    const provider = createWebAdProvider();
    await provider.initialize();
    expect(provider.getName()).toBe('Google AdMob (Web NoOp)');
    expect(provider.isReady()).toBe(false);
    expect(await provider.showInterstitial()).toBe(false);
    expect(await provider.showRewarded('daily_amber')).toEqual({
      completed: false,
      reason: 'no_provider',
    });
  });

  test('RevenueCat web provider fails purchases cleanly', async () => {
    const provider = createWebBillingProvider();
    await provider.initialize();
    expect(provider.getName()).toBe('RevenueCat (Web NoOp)');
    expect(provider.isReady()).toBe(false);
    expect(await provider.getProducts(['com.wordshift.amber_small'])).toEqual([]);
    expect(await provider.purchase('com.wordshift.amber_small')).toEqual({
      success: false,
      productId: 'com.wordshift.amber_small',
      error: 'billing_unavailable',
    });
    expect(await provider.restorePurchases()).toEqual({ entitlements: [] });
  });
});
```

- [ ] **Step 2: Run the test and confirm the platform files are missing**

Run:

```bash
cd mobile && npm test -- --no-coverage --testPathPattern=providerAdapters
```

Expected: FAIL because `googleAdMobAds.web.ts` and `revenueCatBilling.web.ts` do not exist.

- [ ] **Step 3: Implement the AdMob web provider**

Create `googleAdMobAds.web.ts` with the same public config type and provider contract as the native adapter:

```typescript
import { AdProvider, RewardedResult } from '../ads';

export interface AdMobConfig {
  interstitialId?: string;
  rewardedId?: string;
}

export function createAdMobAdProvider(_config: AdMobConfig = {}): AdProvider {
  return {
    async initialize(): Promise<void> {},
    async loadRewarded(): Promise<void> {},
    async showRewarded(): Promise<RewardedResult> {
      return { completed: false, reason: 'no_provider' };
    },
    async showInterstitial(): Promise<boolean> {
      return false;
    },
    async requestATTIfNeeded(): Promise<void> {},
    async requestConsentIfNeeded(): Promise<void> {},
    async privacyOptionsRequired(): Promise<boolean> {
      return false;
    },
    async showPrivacyOptions(): Promise<void> {},
    isReady(): boolean {
      return false;
    },
    getName(): string {
      return 'Google AdMob (Web NoOp)';
    },
  };
}
```

- [ ] **Step 4: Implement the RevenueCat web provider**

Create `revenueCatBilling.web.ts`:

```typescript
import { BillingProvider, IapProduct, ProductId, PurchaseResult } from '../iap';

export interface RevenueCatConfig {
  iosKey?: string;
  androidKey?: string;
}

export function createRevenueCatBillingProvider(
  _config: RevenueCatConfig = {}
): BillingProvider {
  return {
    async initialize(): Promise<void> {},
    async getProducts(_productIds: ProductId[]): Promise<IapProduct[]> {
      return [];
    },
    async purchase(productId: ProductId): Promise<PurchaseResult> {
      return { success: false, productId, error: 'billing_unavailable' };
    },
    async restorePurchases(): Promise<{ entitlements: string[] }> {
      return { entitlements: [] };
    },
    isReady(): boolean {
      return false;
    },
    getName(): string {
      return 'RevenueCat (Web NoOp)';
    },
  };
}
```

- [ ] **Step 5: Add the web-safe share-image implementation**

Create `shareImage.web.ts` with the same exports used by `App.tsx` and share UI:

```typescript
import { Share } from 'react-native';
import {
  ShareableResult,
  generateShareText,
  recordShareSuccess,
} from './shareResults';

export interface ShareImageProvider {
  capture: (viewRef: unknown) => Promise<string>;
  shareFile: (uri: string, message: string) => Promise<boolean>;
}

export function setShareImageProvider(_provider: ShareImageProvider | null): void {}

export function isImageShareAvailable(): boolean {
  return false;
}

export function initShareImage(): void {}

export async function shareResultImage(
  _viewRef: unknown,
  result: ShareableResult
): Promise<boolean> {
  const shared = await Share.share({ message: generateShareText(result) });
  if (shared.action !== Share.sharedAction) return false;
  await recordShareSuccess();
  return true;
}
```

`recordShareSuccess` currently accepts no arguments; preserve that signature.

- [ ] **Step 6: Verify adapter tests and web export**

Run:

```bash
cd mobile && npm test -- --no-coverage --testPathPattern=providerAdapters
cd mobile && npx expo export --platform web --output-dir /tmp/wordshift-web-export
```

Expected: provider tests PASS and Metro no longer traverses AdMob, RevenueCat, or view-shot native internals. If export exposes another native-only top-level import, use the systematic-debugging skill and add the narrowest `.web.ts` platform adapter for that module before continuing.

- [ ] **Step 7: Commit and push**

```bash
git add mobile/src/services/providers/googleAdMobAds.web.ts \
  mobile/src/services/providers/revenueCatBilling.web.ts \
  mobile/src/services/shareImage.web.ts \
  mobile/src/__tests__/providerAdapters.test.ts
git commit -m "fix: make native providers web-safe"
git push -u origin cursor/play-store-listing-assets-a2df
```

---

## Task 2: Define Deterministic Play Store Scenarios

**Files:**
- Create: `mobile/src/dev/playStoreScenarios.ts`
- Create: `mobile/src/__tests__/playStoreScenario.test.ts`

- [ ] **Step 1: Write failing scenario-registry tests**

Create `playStoreScenario.test.ts`:

```typescript
import {
  PLAY_STORE_SCENARIO_NAMES,
  buildPlayStoreScenario,
  parsePlayStoreScenario,
} from '../dev/playStoreScenarios';

describe('Play Store screenshot scenarios', () => {
  test('exposes the eight approved scenarios in campaign order', () => {
    expect(PLAY_STORE_SCENARIO_NAMES).toEqual([
      'puzzle-preview',
      'puzzle-chain',
      'home-sunny',
      'animal-dialogue',
      'variant-menu',
      'daily',
      'flawless-victory',
      'home-dusk',
    ]);
  });

  test('parses only known scenarios in development web builds', () => {
    expect(parsePlayStoreScenario('?playStoreScenario=home-sunny', true, 'web'))
      .toBe('home-sunny');
    expect(parsePlayStoreScenario('?playStoreScenario=unknown', true, 'web'))
      .toBeNull();
    expect(parsePlayStoreScenario('?playStoreScenario=home-sunny', false, 'web'))
      .toBeNull();
    expect(parsePlayStoreScenario('?playStoreScenario=home-sunny', true, 'android'))
      .toBeNull();
  });

  test('preview seed restores the selected L on the tutorial board', () => {
    const scenario = buildPlayStoreScenario('puzzle-preview', '2026-07-11');
    const save = JSON.parse(scenario.storage.wordshift_in_progress_puzzle);
    expect(save.rows.map((row: { originalWord: string }) => row.originalWord))
      .toEqual(['PLAY', 'PANT', 'HEAR']);
    expect(save.selectedLetter).toMatchObject({ char: 'L' });
    expect(save.activeRowIndex).toBe(0);
  });

  test('variant seed unlocks every advertised mode', () => {
    const scenario = buildPlayStoreScenario('variant-menu', '2026-07-11');
    const stats = JSON.parse(scenario.storage.wordshift_star_stats);
    expect(stats.totalPuzzlesCompleted).toBeGreaterThanOrEqual(35);
  });

  test('dusk seed is Phase 2 without post-revelation state', () => {
    const scenario = buildPlayStoreScenario('home-dusk', '2026-07-11');
    const progress = JSON.parse(scenario.storage.wordshift_home_progress);
    expect(progress.currentPhase).toBe(2);
    expect(progress.puzzlesSolved).toBeGreaterThanOrEqual(55);
    expect(progress.postRevelation).not.toBe(true);
    expect(progress.pendingPhaseTransition).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
cd mobile && npm test -- --no-coverage --testPathPattern=playStoreScenario
```

Expected: FAIL because the registry is not implemented.

- [ ] **Step 3: Implement scenario names, parsing, and shared baselines**

Create `playStoreScenarios.ts` with:

```typescript
import { GameState, RowData } from '../types';

export const PLAY_STORE_SCENARIO_NAMES = [
  'puzzle-preview',
  'puzzle-chain',
  'home-sunny',
  'animal-dialogue',
  'variant-menu',
  'daily',
  'flawless-victory',
  'home-dusk',
] as const;

export type PlayStoreScenarioName = typeof PLAY_STORE_SCENARIO_NAMES[number];

export interface PlayStoreScenario {
  name: PlayStoreScenarioName;
  storage: Record<string, string>;
}

const SCENARIO_SET = new Set<string>(PLAY_STORE_SCENARIO_NAMES);

export function parsePlayStoreScenario(
  search: string,
  isDev: boolean,
  platform: string
): PlayStoreScenarioName | null {
  if (!isDev || platform !== 'web') return null;
  const value = new URLSearchParams(search).get('playStoreScenario');
  return value && SCENARIO_SET.has(value)
    ? value as PlayStoreScenarioName
    : null;
}
```

Define helpers named `baseProgress`, `sunnyProgress`, `duskProgress`, `baseStats`, `tutorialRows`, `previewSave`, and `chainSave`. Use these exact canonical values:

- Tutorial words: `PLAY`, `PANT`, `HEAR`.
- Preview selection: `L` from `PLAY`.
- Mid-chain rows: `PAY`, `PLANT`, `HEAR`, active row 1.
- Sunny animals: `fox`, `pangolin`, `owl`, `axolotl`.
- Sunny rooms: `cozy_den`, `kitchen`, `study`, `aquarium`.
- Dusk phase: phase 2, 60 puzzles, weighted phase progress 70.
- Variant stats: 40 completed, 34 three-star completions.
- Reduced motion: true for deterministic captures.
- All one-time intro flags: string value `"true"`.

Use `GameState.PLAYING` in saved puzzle payloads and preserve the full `SavedPuzzleState` shape from `puzzleSaveState.ts`, including `solution`, `reverseSolution`, `currentVariant`, `selectedVariant`, `moveDirection`, `currentPhase`, `isPlayingDaily`, and `savedAt`.

- [ ] **Step 4: Implement `buildPlayStoreScenario`**

The function must return fresh serialized objects and never share mutable fixture state:

```typescript
export function buildPlayStoreScenario(
  name: PlayStoreScenarioName,
  today: string
): PlayStoreScenario {
  const common: Record<string, string> = {
    wordshift_schema_version: '4',
    wordshift_onboarding_step: 'complete',
    wordshift_settings: JSON.stringify({
      soundEnabled: false,
      hapticsEnabled: false,
      reducedMotion: true,
    }),
    wordshift_daily_login: JSON.stringify({
      lastClaimedDate: today,
      cycleDay: 3,
    }),
    wordshift_setup_selector_intro_seen: 'true',
    wordshift_daily_challenge_intro_seen: 'true',
    wordshift_challenge_intro_seen: 'true',
    wordshift_journal_intro_seen: 'true',
    wordshift_starter_intro_seen: 'true',
    wordshift_notification_prompted: 'true',
    wordshift_mandatory_harvest_seen: 'true',
    wordshift_pit_harvest_intro_seen: 'true',
    wordshift_gated_unlock_intro_seen: 'true',
    wordshift_harvest_home_intro_seen: 'true',
    wordshift_fox_play_nudge_seen: 'true',
    wordshift_pit_nudge_seen: 'true',
  };

  const storage = { ...common };
  storage.wordshift_home_progress = JSON.stringify(
    name === 'home-dusk' ? duskProgress(today) :
    name === 'home-sunny' || name === 'animal-dialogue' ? sunnyProgress(today) :
    baseProgress(today)
  );

  if (name === 'puzzle-preview' || name === 'variant-menu') {
    storage.wordshift_in_progress_puzzle = JSON.stringify(previewSave());
  }
  if (name === 'puzzle-chain') {
    storage.wordshift_in_progress_puzzle = JSON.stringify(chainSave());
  }
  if (name === 'variant-menu') {
    storage.wordshift_star_stats = JSON.stringify(baseStats(40));
  }
  if (name === 'daily') {
    storage.wordshift_daily_challenge = JSON.stringify({
      completedChallenges: [{
        date: today,
        stars: 3,
        hintsUsed: 0,
        invalidAttempts: 0,
        completedAt: Date.parse(`${today}T12:00:00`),
      }],
      totalCompleted: 15,
      currentStreak: 7,
      bestStreak: 12,
      lastCompletedDate: today,
      streakFreezes: 1,
      lastFreezeGrantDate: today,
      firstDailyMercyGranted: true,
    });
  }

  return { name, storage };
}
```

Give `daily` progress at least 10 puzzles and `flawless-victory` zero completed puzzles so it serves curated puzzle 0.

- [ ] **Step 5: Run scenario tests**

```bash
cd mobile && npm test -- --no-coverage --testPathPattern=playStoreScenario
```

Expected: PASS.

- [ ] **Step 6: Commit and push**

```bash
git add mobile/src/dev/playStoreScenarios.ts \
  mobile/src/__tests__/playStoreScenario.test.ts
git commit -m "test: define Play Store capture scenarios"
git push -u origin cursor/play-store-listing-assets-a2df
```

---

## Task 3: Seed Capture State Before App Bootstrap

**Files:**
- Create: `mobile/src/dev/playStoreCapture.ts`
- Create: `mobile/src/dev/playStoreCapture.web.ts`
- Modify: `mobile/App.tsx`
- Modify: `mobile/src/services/telemetry.ts`
- Modify: `mobile/src/__tests__/playStoreScenario.test.ts`

- [ ] **Step 1: Add failing capture-safety tests**

Add tests proving the generic module is inert:

```typescript
import {
  getPlayStoreScenarioName,
  isPlayStoreCaptureActive,
  preparePlayStoreCapture,
} from '../dev/playStoreCapture';

test('generic capture module is inert outside web development', async () => {
  expect(isPlayStoreCaptureActive()).toBe(false);
  expect(getPlayStoreScenarioName()).toBeNull();
  await expect(preparePlayStoreCapture()).resolves.toBe(false);
});
```

- [ ] **Step 2: Implement the native/production no-op module**

Create `playStoreCapture.ts`:

```typescript
import { PlayStoreScenarioName } from './playStoreScenarios';

export function isPlayStoreCaptureActive(): boolean {
  return false;
}

export function getPlayStoreScenarioName(): PlayStoreScenarioName | null {
  return null;
}

export async function preparePlayStoreCapture(): Promise<boolean> {
  return false;
}
```

- [ ] **Step 3: Implement the web capture module**

Create `playStoreCapture.web.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildPlayStoreScenario,
  parsePlayStoreScenario,
  PlayStoreScenarioName,
} from './playStoreScenarios';

const scenarioName = typeof window === 'undefined'
  ? null
  : parsePlayStoreScenario(window.location.search, __DEV__, 'web');

export function isPlayStoreCaptureActive(): boolean {
  return scenarioName !== null;
}

export function getPlayStoreScenarioName(): PlayStoreScenarioName | null {
  return scenarioName;
}

export async function preparePlayStoreCapture(): Promise<boolean> {
  if (!scenarioName) return false;
  const today = new Date();
  const localDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  const scenario = buildPlayStoreScenario(scenarioName, localDate);
  await AsyncStorage.clear();
  await AsyncStorage.multiSet(Object.entries(scenario.storage));
  return true;
}
```

- [ ] **Step 4: Wire capture preparation into bootstrap**

Import the capture functions in `App.tsx`. Change bootstrap order so capture seeding precedes migrations and cloud restore:

```typescript
const captureActive = isPlayStoreCaptureActive();
logEvent({ type: 'app_open' });
(async () => {
  try {
    if (captureActive) {
      await preparePlayStoreCapture();
    } else {
      installCloudProviderIfConfigured();
      await maybeAutoRestoreOnFreshInstall();
    }
    await runMigrations();
    initShareImage();
    setBillingProvider(createRevenueCatBillingProvider());
    setAdProvider(createAdMobAdProvider());
    if (!captureActive) {
      void initIAP().catch((err) => console.warn('initIAP failed:', err));
      void initAds().catch((err) => console.warn('initAds failed:', err));
    }
    await Promise.all([
      initCosmetics(),
      initHints(),
      loadEntitlements(),
      loadPixelFonts(),
    ]);
  } catch (error) {
    console.warn('Bootstrap init failed:', error);
  } finally {
    if (!cancelled) setBootReady(true);
  }
})();
```

Also gate Sentry initialization:

```typescript
const sentryDsn = isPlayStoreCaptureActive() ? null : getSentryDsn();
```

Do not change `Sentry.wrap(App)` unless web export proves that import itself is incompatible.

- [ ] **Step 5: Suppress telemetry during capture**

Import `isPlayStoreCaptureActive` in `telemetry.ts` and make the enablement decision return false:

```typescript
export function isTelemetryEnabled(): boolean {
  if (isPlayStoreCaptureActive()) return false;
  return getTelemetryEndpoint().length > 0 || isSupabaseConfigured();
}
```

Keep the existing `isSupabaseConfigured` import from `supabaseClient.ts`.

- [ ] **Step 6: Add App integration tripwires**

Extend `appIntegration.test.ts` source checks to assert:

```typescript
expect(appSource).toContain('await preparePlayStoreCapture()');
expect(appSource).toContain('if (captureActive)');
expect(appSource).toContain('installCloudProviderIfConfigured()');
```

The test must also verify `preparePlayStoreCapture` appears before `runMigrations` in source order.

- [ ] **Step 7: Run tests, typecheck, and web export**

```bash
cd mobile && npm test -- --no-coverage --testPathPattern='playStoreScenario|appIntegration|telemetry'
cd mobile && npm run typecheck
cd mobile && npx expo export --platform web --output-dir /tmp/wordshift-web-export
```

Expected: all commands PASS.

- [ ] **Step 8: Commit and push**

```bash
git add mobile/src/dev/playStoreCapture.ts \
  mobile/src/dev/playStoreCapture.web.ts \
  mobile/App.tsx \
  mobile/src/services/telemetry.ts \
  mobile/src/__tests__/playStoreScenario.test.ts \
  mobile/src/__tests__/appIntegration.test.ts
git commit -m "feat: add isolated Play Store capture mode"
git push -u origin cursor/play-store-listing-assets-a2df
```

---

## Task 4: Build the Playwright Capture Runner

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/package-lock.json`
- Modify: `.gitignore`
- Create: `docs/play-store/campaign.json`
- Create: `mobile/scripts/tools/capturePlayStoreScreenshots.mjs`

- [ ] **Step 1: Add the latest Playwright dependency with npm**

Run:

```bash
cd mobile && npm install --save-dev playwright
npx playwright install chromium
```

Do not invent or pin a version manually. Preserve the pre-existing `react-native-web` working-tree change and stage only Playwright-related package hunks for this task.

- [ ] **Step 2: Add campaign metadata**

Create `docs/play-store/campaign.json` with eight ordered records:

```json
[
  {
    "scenario": "puzzle-preview",
    "source": "01_puzzle_preview.png",
    "final": "01_shift_one_letter.png",
    "headline": "SHIFT ONE LETTER",
    "support": "Move it down. Keep both words real.",
    "altText": "WordShift puzzle board with the letter L selected and valid and invalid destination word previews visible.",
    "theme": "bright"
  },
  {
    "scenario": "puzzle-chain",
    "source": "02_puzzle_chain.png",
    "final": "02_every_word_stays_real.png",
    "headline": "EVERY WORD STAYS REAL",
    "support": "Build a chain one clever move at a time.",
    "altText": "WordShift puzzle showing PAY, PLANT, and HEAR midway through a valid letter-shifting chain.",
    "theme": "bright"
  },
  {
    "scenario": "home-sunny",
    "source": "03_home_sunny.png",
    "final": "03_build_a_home.png",
    "headline": "BUILD A HOME",
    "support": "Your words bring every room to life.",
    "altText": "Sunny WordShift house with several furnished rooms and four animal companions.",
    "theme": "bright"
  },
  {
    "scenario": "animal-dialogue",
    "source": "04_animal_dialogue.png",
    "final": "04_meet_unlikely_friends.png",
    "headline": "MEET 13 UNLIKELY FRIENDS",
    "support": "They always have something to tell you.",
    "altText": "Ember the fox speaking to the player in a warm dialogue scene over the animal house.",
    "theme": "bright"
  },
  {
    "scenario": "variant-menu",
    "source": "05_variant_menu.png",
    "final": "05_master_every_mode.png",
    "headline": "MASTER EVERY MODE",
    "support": "Reverse, Double Shift, Speed, and Blind Offering.",
    "altText": "WordShift setup menu displaying Standard, Reverse, Double Shift, Speed, and Blind Offering modes.",
    "theme": "dusk"
  },
  {
    "scenario": "daily",
    "source": "06_daily.png",
    "final": "06_new_puzzle_every_day.png",
    "headline": "A NEW PUZZLE EVERY DAY",
    "support": "Build your streak and compare your standing.",
    "altText": "WordShift home screen with a completed Daily Challenge card and a seven-day streak.",
    "theme": "dusk"
  },
  {
    "scenario": "flawless-victory",
    "source": "07_flawless_victory.png",
    "final": "07_flawless_offering.png",
    "headline": "CHASE A FLAWLESS OFFERING",
    "support": "No hints. No mistakes. One perfect chain.",
    "altText": "WordShift victory screen showing a flawless three-star solve and amber rewards.",
    "theme": "dusk"
  },
  {
    "scenario": "home-dusk",
    "source": "08_home_dusk.png",
    "final": "08_theyve_been_waiting.png",
    "headline": "THEY'VE BEEN WAITING",
    "support": "Some houses remember every word.",
    "altText": "The WordShift animal house at dusk with a subtly mysterious atmosphere and no explicit horror imagery.",
    "theme": "mystery"
  }
]
```

- [ ] **Step 3: Ignore capture-only state**

Add:

```gitignore
.superpowers/
mobile/.cache/play-store-capture/
```

Do not ignore `docs/play-store/source/` or `docs/play-store/final/`; both are deliverables.

- [ ] **Step 4: Implement Expo and browser lifecycle**

`capturePlayStoreScreenshots.mjs` must:

1. Resolve repository paths from `import.meta.dirname`.
2. Spawn `npx expo start --web --port 8091` with `EXPO_NO_INTERACTIVE=1`.
3. Poll `http://127.0.0.1:8091` until it returns successfully or 120 seconds elapse.
4. Launch Playwright Chromium with viewport 432x768 and device scale factor 2.5.
5. Abort every request whose URL host is not `localhost`, `127.0.0.1`, or a `data:` URL.
6. Open a fresh browser context per scenario.
7. Always terminate the exact Expo child process in `finally`.

Use:

```javascript
const VIEWPORT = { width: 432, height: 768 };
const DEVICE_SCALE_FACTOR = 2.5;
const BASE_URL = 'http://127.0.0.1:8091';

async function waitForServer(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  throw new Error(`Expo web server did not become ready within ${timeoutMs}ms`);
}
```

- [ ] **Step 5: Implement deterministic scenario interactions**

For each scenario, navigate to:

```javascript
`${BASE_URL}/?playStoreScenario=${encodeURIComponent(item.scenario)}`
```

Then perform these exact production interactions:

- `puzzle-preview`: click `Play puzzle`; wait for `Letter L` and `✓ PLANT`.
- `puzzle-chain`: click `Play puzzle`; wait for `Pick a letter from this row`.
- `home-sunny`: wait for `Play puzzle` and the house.
- `animal-dialogue`: click `Ember the fox`; wait for `Continue dialogue`.
- `variant-menu`: click `Play puzzle`; click the setup button whose label starts with `Difficulty`; wait for `Reverse Shift` and `Double Shift`.
- `daily`: wait for the label beginning `Daily challenge completed`.
- `flawless-victory`: click `Play puzzle`; click `Letter L`; click `Drop zone 2`; click `Letter T`; click `Drop zone 5`; wait for `Skip celebration animation`; click it; wait for `3 of 3 stars`.
- `home-dusk`: wait for `Play puzzle` and the Phase 2 house.

Prefer `getByLabel` and visible preview text. If duplicate letter labels occur, scope to the active row using the `Pick a letter from this row` region instead of using `.first()` blindly.

- [ ] **Step 6: Capture exact 1080x1920 raw PNGs**

Write each screenshot to the campaign record's `source` filename under `docs/play-store/source/`. Assert dimensions immediately after capture by reading it with `pngjs`. A 432x768 viewport at device scale factor 2.5 must produce 1080x1920.

- [ ] **Step 7: Add npm script**

Add:

```json
"capture:play-store": "node scripts/tools/capturePlayStoreScreenshots.mjs"
```

- [ ] **Step 8: Run the capture pipeline**

```bash
cd mobile && npm run capture:play-store
```

Expected: eight raw PNGs are created and each scenario logs `captured 1080x1920`.

- [ ] **Step 9: Commit and push**

Stage only related package hunks:

```bash
git add -p mobile/package.json mobile/package-lock.json
git add .gitignore docs/play-store/campaign.json \
  mobile/scripts/tools/capturePlayStoreScreenshots.mjs \
  docs/play-store/source
git commit -m "feat: capture authentic Play Store screenshots"
git push -u origin cursor/play-store-listing-assets-a2df
```

---

## Task 5: Compose and Validate Upload-Ready PNGs

**Files:**
- Create: `mobile/scripts/tools/playStorePng.mjs`
- Create: `mobile/scripts/tools/composePlayStoreScreenshots.mjs`
- Create: `mobile/scripts/tools/validatePlayStoreAssets.mjs`
- Create: `mobile/scripts/tools/playStoreAssets.test.mjs`
- Modify: `mobile/package.json`

- [ ] **Step 1: Write failing Node tests**

Use `node:test`, temporary directories, and `pngjs`. Test:

- `writeOpaquePng` writes PNG color type 2.
- `readPngMetadata` returns dimensions and color type.
- `validateFinalAssets` rejects wrong dimensions.
- Campaign JSON has eight unique scenarios, source names, final names, and alt texts.

The core assertions:

```javascript
test('writeOpaquePng emits 24-bit RGB PNG', async () => {
  const file = path.join(tempDir, 'opaque.png');
  const png = new PNG({ width: 2, height: 2 });
  png.data.fill(255);
  await writeOpaquePng(file, png);
  assert.deepEqual(await readPngMetadata(file), {
    width: 2,
    height: 2,
    bitDepth: 8,
    colorType: 2,
  });
});

test('campaign defines eight unique upload images', async () => {
  const campaign = JSON.parse(await fs.readFile(campaignPath, 'utf8'));
  assert.equal(campaign.length, 8);
  assert.equal(new Set(campaign.map(item => item.scenario)).size, 8);
  assert.equal(new Set(campaign.map(item => item.final)).size, 8);
  assert.ok(campaign.every(item => item.altText.length >= 30));
});
```

- [ ] **Step 2: Run tests and confirm missing modules**

```bash
cd mobile && node --test scripts/tools/playStoreAssets.test.mjs
```

Expected: FAIL because PNG helpers and validator do not exist.

- [ ] **Step 3: Implement opaque PNG helpers**

`playStorePng.mjs` must read PNGs with `PNG.sync.read` and write with:

```javascript
export async function writeOpaquePng(filePath, png) {
  const flattened = new PNG({ width: png.width, height: png.height });
  for (let i = 0; i < png.data.length; i += 4) {
    const alpha = png.data[i + 3] / 255;
    flattened.data[i] = Math.round(png.data[i] * alpha);
    flattened.data[i + 1] = Math.round(png.data[i + 1] * alpha);
    flattened.data[i + 2] = Math.round(png.data[i + 2] * alpha);
    flattened.data[i + 3] = 255;
  }
  const encoded = PNG.sync.write(flattened, {
    colorType: 2,
    inputColorType: 6,
    inputHasAlpha: true,
  });
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, encoded);
}
```

`readPngMetadata` must read IHDR directly and return width, height, bit depth, and color type. Reject non-PNG signatures.

- [ ] **Step 4: Implement storybook composition with Playwright**

For each campaign record:

1. Read source PNG and both Shantell font files as base64.
2. Build an HTML document with an opaque 432x768 root.
3. Use approved palettes:
   - bright: `#756BE6`, `#FFF2D2`, `#F4B942`, `#4A2E37`
   - dusk: `#51466F`, `#F5E7CC`, `#C99047`, `#2A2438`
   - mystery: `#292844`, `#EBDCC7`, `#A85B64`, `#171725`
4. Reserve the top 88 CSS pixels for headline/support.
5. Place the authentic 9:16 source image below, with an 8-pixel wood frame and 14-pixel corner radius.
6. Render at device scale factor 2.5.
7. Re-encode the screenshot through `writeOpaquePng`.

Use embedded fonts:

```javascript
const fontCss = `
  @font-face {
    font-family: "Shantell";
    src: url(data:font/ttf;base64,${regularFontBase64}) format("truetype");
    font-weight: 400;
  }
  @font-face {
    font-family: "Shantell";
    src: url(data:font/ttf;base64,${boldFontBase64}) format("truetype");
    font-weight: 700;
  }
`;
```

Read `regularFontBase64` and `boldFontBase64` from the two bundled Shantell TTF files before constructing the HTML passed to `page.setContent`.

- [ ] **Step 5: Implement final-asset validation**

`validatePlayStoreAssets.mjs` must:

- Require exactly the eight filenames from `campaign.json`.
- Require each screenshot to be 1080x1920, bit depth 8, color type 2.
- Require `feature-graphic.png` to be 1024x500, bit depth 8, color type 2.
- Reject files over 8 MB.
- Print one line per valid asset and exit nonzero on any failure.

- [ ] **Step 6: Add scripts**

```json
"compose:play-store": "node scripts/tools/composePlayStoreScreenshots.mjs",
"validate:play-store": "node scripts/tools/validatePlayStoreAssets.mjs",
"test:play-store-assets": "node --test scripts/tools/playStoreAssets.test.mjs"
```

- [ ] **Step 7: Run tests and compose screenshots**

```bash
cd mobile && npm run test:play-store-assets
cd mobile && npm run compose:play-store
```

Expected: tests PASS and eight composed screenshots appear under `docs/play-store/final/`.

- [ ] **Step 8: Commit and push**

```bash
git add mobile/scripts/tools/playStorePng.mjs \
  mobile/scripts/tools/composePlayStoreScreenshots.mjs \
  mobile/scripts/tools/validatePlayStoreAssets.mjs \
  mobile/scripts/tools/playStoreAssets.test.mjs \
  mobile/package.json mobile/package-lock.json \
  docs/play-store/final
git commit -m "feat: compose Play Store screenshot campaign"
git push -u origin cursor/play-store-listing-assets-a2df
```

---

## Task 6: Create the Feature Graphic

**Files:**
- Create: `docs/play-store/source/feature-background.png`
- Create: `mobile/scripts/tools/composePlayStoreFeatureGraphic.mjs`
- Create: `docs/play-store/final/feature-graphic.png`
- Replace: `docs/feature-graphic.png`

- [ ] **Step 1: Generate the source background**

Use the image-generation tool with:

- References: `mobile/assets/icon.png`, `mobile/assets/ui/wordmark.png`, `mobile/assets/environment/sky_day.png`, `mobile/assets/characters/fox/idle.png`.
- Subject: Ember on the left, bright forest transitioning subtly to dusk on the right, candy tiles and amber, tiny distant red-eye cue.
- Constraints: no text, no logo imitation, no robes, no entity, no gore, no border.
- Aspect: 16:9 source with safe central composition for later crop to 1024x500.

Save the generated source as `docs/play-store/source/feature-background.png`.

- [ ] **Step 2: Implement exact wordmark composition**

`composePlayStoreFeatureGraphic.mjs` must:

1. Open an opaque 1024x500 Playwright page.
2. Cover the canvas with the generated background.
3. Overlay the exact `mobile/assets/ui/wordmark.png` centered in the safe middle area.
4. Add exact existing candy-tile/amber assets only if they improve hierarchy.
5. Capture and re-encode with `writeOpaquePng`.
6. Write both `docs/play-store/final/feature-graphic.png` and `docs/feature-graphic.png`.

- [ ] **Step 3: Validate the feature graphic**

```bash
cd mobile && node scripts/tools/composePlayStoreFeatureGraphic.mjs
cd mobile && npm run validate:play-store
```

Expected: `feature-graphic.png: 1024x500, RGB, valid`.

- [ ] **Step 4: Manually inspect at full and thumbnail size**

Confirm:

- Ember and the exact wordmark are recognizable.
- The center-safe crop retains both.
- The red-eye cue is discoverable only on closer inspection.
- The image does not expose Phase 3+ content.
- No generated text artifacts exist.

- [ ] **Step 5: Commit and push**

```bash
git add docs/play-store/source/feature-background.png \
  docs/play-store/final/feature-graphic.png \
  docs/feature-graphic.png \
  mobile/scripts/tools/composePlayStoreFeatureGraphic.mjs
git commit -m "feat: replace Play Store feature graphic"
git push -u origin cursor/play-store-listing-assets-a2df
```

---

## Task 7: Finalize Google Play Listing Copy

**Files:**
- Modify: `docs/STORE_LISTING.md`
- Modify: `docs/LAUNCH_CHECKLIST.md`
- Modify: `docs/index.md`

- [ ] **Step 1: Replace stale identity and feature counts**

Use:

```text
App title: WordShift
Short description: Shift letters, build a home, meet strange friends. They've been waiting.
```

Replace every `ten`/`10` companion claim with `13` and every `40 achievements` claim with `51 achievements`.

- [ ] **Step 2: Replace the full Google Play description**

Use this copy, preserving line breaks and avoiding em dashes:

```text
SHIFT ONE LETTER. CHANGE EVERYTHING.

WordShift is a cozy word puzzle with one satisfying rule: move a letter from one word into the next, and keep both words real.

HOW IT WORKS

• Pick a letter from the current word.
• Drop it into the word below.
• Keep both results valid.
• Continue the chain to complete the puzzle.

Simple to learn. Surprisingly clever to master.

BUILD A HOME FROM YOUR WORDS

Every solved puzzle earns amber for a growing woodland house. Build 13 rooms, welcome 13 unlikely animal companions, and return to hear what they have to say.

They are warm, funny, thoughtful, and very glad you found them.

MASTER EVERY KIND OF SHIFT

• Four difficulty levels for quick or demanding sessions
• Reverse Shift journeys down the chain and back again
• Double Shift moves two letters at every step
• Speed Shift tests how quickly you can see the pattern
• Blind Offering hides previews for a true mastery challenge
• Thousands of curated and generated word puzzles

RETURN EACH DAY

Take on a shared Daily Challenge, build protected streaks, complete daily and weekly quests, collect 51 achievements, and chase flawless solves with no hints, mistakes, or undos.

A COZY GAME. MOSTLY.

The longer you stay, the more the house changes. Familiar conversations take on new meanings. The animals remember the words you make.

Some mysteries unfold slowly.

PLAY YOUR WAY

• Core puzzles work offline
• No account required
• Optional hints and accessibility settings
• Reduced-motion support
• Free to play with occasional ads
• Optional purchases for convenience and cosmetic expression
• Purchases never accelerate the story

WordShift is a slow-burn word game and mystery for players 13 and older.

The house is ready.
They've been waiting.
```

- [ ] **Step 3: Document campaign assets and alt text**

Replace the old five-shot list with a table generated from `docs/play-store/campaign.json`. Record exact upload paths under `docs/play-store/final/`.

- [ ] **Step 4: Update launch checklist honestly**

Split the current combined item into:

```markdown
- [x] **Generate Play Store creative** — eight 1080x1920 phone screenshots and
      the 1024x500 feature graphic are in `docs/play-store/final/`.
- [ ] **Upload Play Store creative** — upload the generated phone screenshots
      and feature graphic in Play Console, preserving their numbered order.
```

Do not mark the Play Console upload complete.

- [ ] **Step 5: Update public landing page counts**

Change only stale factual counts in `docs/index.md`; do not redesign the page.

- [ ] **Step 6: Run copy guards**

```bash
cd mobile && npm test -- --no-coverage --testPathPattern='noEmDashes|keeperCountCanon|configValidation'
```

Also run:

```bash
rg -n "ten animal|10 animal|40 achievements" docs
```

Expected: tests PASS and ripgrep finds no stale store-facing counts.

- [ ] **Step 7: Commit and push**

```bash
git add docs/STORE_LISTING.md docs/LAUNCH_CHECKLIST.md docs/index.md
git commit -m "docs: finalize Google Play listing copy"
git push -u origin cursor/play-store-listing-assets-a2df
```

---

## Task 8: End-to-End Verification and Visual Review

**Files:**
- Modify only files required to correct verified defects.
- Update the existing draft pull request after final verification.

- [ ] **Step 1: Run the complete asset pipeline from clean source inputs**

Add:

```json
"generate:play-store": "npm run capture:play-store && npm run compose:play-store && node scripts/tools/composePlayStoreFeatureGraphic.mjs && npm run validate:play-store"
```

Run:

```bash
cd mobile && npm run generate:play-store
```

Expected: eight authentic source captures, eight composed screenshots, and one validated feature graphic.

- [ ] **Step 2: Run automated quality gates**

```bash
cd mobile && npm run typecheck
cd mobile && npm run lint
cd mobile && npm test -- --no-coverage --ci
cd mobile && npm run test:play-store-assets
cd mobile && npx expo export --platform web --output-dir /tmp/wordshift-web-export
```

Expected:

- Typecheck exits 0.
- Lint has 0 errors.
- All Jest suites pass.
- Node asset tests pass.
- Web export exits 0.

- [ ] **Step 3: Perform manual GUI review**

Use the computer-use subagent to review:

- All eight source app states.
- All eight final screenshots at full size.
- The numbered sequence at thumbnail size.
- The feature graphic at full size and a narrow center crop.

Reject and regenerate any asset with clipped text, hidden game UI, duplicate content, unreadable previews, wrong phase, spoilers, false claims, or generated-text artifacts.

- [ ] **Step 4: Record a concise visual walkthrough**

Create a short screen recording that scrolls through the eight final screenshots and feature graphic. Save it as:

```text
/opt/cursor/artifacts/wordshift_play_store_campaign.webm
```

Use the video-review subagent to verify the recording shows all nine assets clearly before citing it.

- [ ] **Step 5: Request code review**

Use the code-reviewer subagent with the approved design spec and this implementation plan. Resolve all high-confidence correctness, authenticity, policy, or build findings before finalizing.

- [ ] **Step 6: Verify repository scope**

```bash
git status --short
git diff --check
git diff --stat claude/mobile-game-assessment-lmpeyy...HEAD
```

Confirm `.superpowers/`, Playwright browser caches, and unrelated package changes are not staged.

- [ ] **Step 7: Commit final corrections and push**

```bash
git add -p
git diff --cached --check
git commit -m "fix: polish Play Store campaign assets"
git push -u origin cursor/play-store-listing-assets-a2df
```

Skip this commit when review produces no corrections.

- [ ] **Step 8: Update the draft pull request**

Update the PR body with:

- Final listing-copy summary.
- Test results.
- `<img>` references to the feature graphic and representative screenshots.
- `<video>` reference to the walkthrough.

Do not mark the PR ready for review.
