import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { withStagedPublication } from './composePlayStoreScreenshots.mjs';
import {
  APPROVED_SCENARIOS,
  getValidDropZoneLabelMatcher,
  isAllowedCaptureRequest,
  isSafePngBasename,
  requireAllVisibleCompanions,
  requireNoPartialVerticalOcclusion,
  validateCampaign,
} from './capturePlayStoreHelpers.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const RUNNER_PATH = path.join(SCRIPT_DIR, 'capturePlayStoreScreenshots.mjs');
const PACKAGE_PATH = path.resolve(SCRIPT_DIR, '../../package.json');
const ROW_PATH = path.resolve(SCRIPT_DIR, '../../src/components/Row.tsx');
const HOME_PATH = path.resolve(
  SCRIPT_DIR,
  '../../src/components/home/HomeScreen.tsx'
);
const HOUSE_WORLD_PATH = path.resolve(
  SCRIPT_DIR,
  '../../src/components/home/HouseWorld.tsx'
);
const ANIMAL_SPRITE_PATH = path.resolve(
  SCRIPT_DIR,
  '../../src/components/home/AnimalSprite.tsx'
);
const DIFFICULTY_MENU_PATH = path.resolve(
  SCRIPT_DIR,
  '../../src/components/puzzle/DifficultyMenu.tsx'
);
const CONFETTI_PATH = path.resolve(
  SCRIPT_DIR,
  '../../src/components/Confetti.tsx'
);
const SCENARIOS_PATH = path.resolve(
  SCRIPT_DIR,
  '../../src/dev/playStoreScenarios.ts'
);
const CAPTURE_WEB_PATH = path.resolve(
  SCRIPT_DIR,
  '../../src/dev/playStoreCapture.web.ts'
);
const CAPTURE_NATIVE_PATH = path.resolve(
  SCRIPT_DIR,
  '../../src/dev/playStoreCapture.ts'
);
const EXPECTED_SCENARIOS = [
  'puzzle-preview',
  'puzzle-chain',
  'home-sunny',
  'animal-dialogue',
  'variant-menu',
  'flawless-victory',
  'home-dusk',
  'home-storm',
];

const makeCampaign = () => EXPECTED_SCENARIOS.map((scenario, index) => ({
  scenario,
  source: `${String(index + 1).padStart(2, '0')}_${scenario}.png`,
  final: `${String(index + 1).padStart(2, '0')}_${scenario}_final.png`,
  headline: `Headline ${index + 1}`,
  support: `Support ${index + 1}`,
  altText: `Alt text ${index + 1}`,
  theme: index < 4 ? 'bright' : index < 6 ? 'dusk' : 'mystery',
  uneaseLevel: index + 1,
}));

describe('capture campaign validation', () => {
  test('accepts the exact eight-shot order, safe PNG basenames, and themes', () => {
    const campaign = makeCampaign();

    assert.deepEqual(APPROVED_SCENARIOS, EXPECTED_SCENARIOS);
    assert.equal(validateCampaign(campaign), campaign);
  });

  test('rejects unsafe source and final paths', () => {
    const unsafeSource = makeCampaign();
    unsafeSource[0].source = '../escape.png';
    assert.throws(() => validateCampaign(unsafeSource), /invalid source filename/);

    const unsafeFinal = makeCampaign();
    unsafeFinal[0].final = 'nested/final.png';
    assert.throws(() => validateCampaign(unsafeFinal), /invalid final filename/);

    assert.equal(isSafePngBasename('screen.png'), true);
    assert.equal(isSafePngBasename('screen.PNG'), false);
    assert.equal(isSafePngBasename('../screen.png'), false);
    assert.equal(isSafePngBasename('nested/screen.png'), false);
  });

  test('rejects unsupported themes and scenario order changes', () => {
    const invalidTheme = makeCampaign();
    invalidTheme[0].theme = 'night';
    assert.throws(() => validateCampaign(invalidTheme), /invalid theme "night"/);

    const invalidOrder = makeCampaign();
    [invalidOrder[0], invalidOrder[1]] = [invalidOrder[1], invalidOrder[0]];
    assert.throws(() => validateCampaign(invalidOrder), /out of order/);
  });

  test('requires unease levels one through eight in campaign order', () => {
    const missingLevel = makeCampaign();
    delete missingLevel[0].uneaseLevel;
    assert.throws(
      () => validateCampaign(missingLevel),
      /unease level must be an integer from 1 to 8/
    );

    const repeatedLevel = makeCampaign();
    repeatedLevel[7].uneaseLevel = 7;
    assert.throws(
      () => validateCampaign(repeatedLevel),
      /strictly increase as 1, 2, 3, 4, 5, 6, 7, 8/
    );

    const fractionalLevel = makeCampaign();
    fractionalLevel[3].uneaseLevel = 4.5;
    assert.throws(
      () => validateCampaign(fractionalLevel),
      /unease level must be an integer from 1 to 8/
    );

    for (const level of [0, 9]) {
      const outOfRange = makeCampaign();
      outOfRange[0].uneaseLevel = level;
      assert.throws(
        () => validateCampaign(outOfRange),
        /unease level must be an integer from 1 to 8/
      );
    }

    const descendingLevels = makeCampaign();
    [
      descendingLevels[2].uneaseLevel,
      descendingLevels[3].uneaseLevel,
    ] = [
      descendingLevels[3].uneaseLevel,
      descendingLevels[2].uneaseLevel,
    ];
    assert.throws(
      () => validateCampaign(descendingLevels),
      /strictly increase as 1, 2, 3, 4, 5, 6, 7, 8/
    );
  });
});

describe('capture request allowlist', () => {
  test('allows loopback, data, and blob URLs', () => {
    assert.equal(isAllowedCaptureRequest('http://127.0.0.1:8091/index.bundle'), true);
    assert.equal(isAllowedCaptureRequest('http://localhost:8091/assets/icon.png'), true);
    assert.equal(isAllowedCaptureRequest('data:image/png;base64,AA=='), true);
    assert.equal(isAllowedCaptureRequest('blob:http://127.0.0.1:8091/id'), true);
  });

  test('rejects external, file, and malformed URLs', () => {
    assert.equal(isAllowedCaptureRequest('https://example.com/tracker.js'), false);
    assert.equal(isAllowedCaptureRequest('file:///tmp/secret'), false);
    assert.equal(isAllowedCaptureRequest('not a URL'), false);
  });
});

describe('accessible drop-zone selectors', () => {
  test('matches valid preview labels plus guided and plain fallbacks', () => {
    const matcher = getValidDropZoneLabelMatcher(2, 'PLANT');

    for (const label of [
      'Drop zone 2 of 5, forms PLANT, valid word',
      'Guided drop zone 2 of 6, forms PLANT, valid word',
      'Drop zone 2',
      'Guided drop zone 2',
    ]) {
      assert.match(label, matcher);
    }
    assert.doesNotMatch(
      'Drop zone 2 of 5, would form PLANT, not a valid move',
      matcher
    );
    assert.doesNotMatch(
      'Drop zone 2 of 5, forms PLANE, valid word',
      matcher
    );
    assert.doesNotMatch(
      'Drop zone 3 of 5, forms PLANT, valid word',
      matcher
    );
  });
});

describe('capture publication and stability policy', () => {
  test('runner captures into one staged source directory before publication', async () => {
    const runner = await fs.readFile(RUNNER_PATH, 'utf8');

    assert.match(
      runner,
      /await withStagedPublication\(\{\s*finalDir: SOURCE_DIR,/
    );
    assert.match(
      runner,
      /preserveNames:\s*\['feature-background\.png'\]/
    );
    assert.match(runner, /captureScenario\(browser, item, stagingDir\)/);
    assert.doesNotMatch(
      runner,
      /path\.join\(SOURCE_DIR,\s*item\.source\)/
    );
  });

  test('staged source failure leaves current captures untouched and cleans temp state', async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'wordshift-play-store-capture-')
    );
    const sourceDir = path.join(tempDir, 'source');
    const currentPath = path.join(sourceDir, '01_puzzle_preview.png');

    try {
      await fs.mkdir(sourceDir);
      await fs.writeFile(currentPath, 'current capture');

      await assert.rejects(
        withStagedPublication({
          finalDir: sourceDir,
          populateAndValidate: async stagingDir => {
            await fs.writeFile(
              path.join(stagingDir, '01_puzzle_preview.png'),
              'partial replacement'
            );
            await fs.writeFile(
              path.join(stagingDir, '02_puzzle_chain.png'),
              'partial new capture'
            );
            throw new Error('simulated capture failure');
          },
        }),
        /simulated capture failure/
      );

      assert.equal(await fs.readFile(currentPath, 'utf8'), 'current capture');
      assert.deepEqual(await fs.readdir(sourceDir), ['01_puzzle_preview.png']);
      assert.deepEqual(await fs.readdir(tempDir), ['source']);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  test('runner installs deterministic randomness before loading each scenario', async () => {
    const runner = await fs.readFile(RUNNER_PATH, 'utf8');

    assert.match(runner, /await context\.addInitScript\(/);
    assert.match(runner, /Math\.random\s*=\s*\(\)\s*=>/);
    assert.match(runner, /seed:\s*item\.scenario/);
  });

  test('capture motion policy settles row geometry and home currency chrome', async () => {
    const [row, home] = await Promise.all([
      fs.readFile(ROW_PATH, 'utf8'),
      fs.readFile(HOME_PATH, 'utf8'),
    ]);

    assert.match(row, /shouldFreezePlayStoreCaptureMotion/);
    assert.match(row, /if \(freezeCaptureMotion\) \{/);
    assert.match(home, /shouldFreezePlayStoreCaptureMotion/);
    assert.match(home, /if \(shouldFreezePlayStoreCaptureMotion\(\)\) \{/);
  });

  test('flawless capture normalizes scroll after victory and seeds transient state', async () => {
    const [runner, scenarios] = await Promise.all([
      fs.readFile(RUNNER_PATH, 'utf8'),
      fs.readFile(SCENARIOS_PATH, 'utf8'),
    ]);

    assert.match(
      runner,
      /resetPuzzleScrollPosition\(page,\s*3\)/
    );
    assert.match(
      runner,
      /element\.scrollTop\s*=\s*0/
    );
    assert.match(
      runner,
      /Math\.abs\(element\.scrollTop\)\s*<\s*0\.5/
    );
    assert.match(
      scenarios,
      /wordshift_first_win_glitch:\s*'true'/
    );
  });

  test('capture-only motion freeze suppresses effects without changing native behavior', async () => {
    const [confetti, captureWeb, captureNative] = await Promise.all([
      fs.readFile(CONFETTI_PATH, 'utf8'),
      fs.readFile(CAPTURE_WEB_PATH, 'utf8'),
      fs.readFile(CAPTURE_NATIVE_PATH, 'utf8'),
    ]);

    assert.match(
      confetti,
      /import \{ shouldFreezePlayStoreCaptureMotion \} from '\.\.\/dev\/playStoreCapture'/
    );
    assert.match(
      confetti,
      /getSettingsSync\(\)\.reducedMotion\s*\|\|\s*shouldFreezePlayStoreCaptureMotion\(\)/
    );
    assert.match(
      confetti,
      /!active\s*\|\|\s*reducedMotion\s*\|\|\s*freezeCaptureMotion/
    );
    assert.match(captureWeb, /return scenarioName !== null/);
    assert.match(captureNative, /shouldFreezePlayStoreCaptureMotion\(\): false \{\s*return false/);
  });

  test('four-companion guard rejects a frame with only three visible animals', () => {
    const requiredLabels = ['Ember', 'Panko', 'Archimedes', 'Axel'];
    const threeVisible = requiredLabels.map((label, index) => ({
      label,
      visibleRatio: index === 3 ? 0.59 : 0.95,
      viewportRatio: 1,
      occludedBy: index === 3
        ? [{ label: 'PLAY dock', overlapRatio: 0.41 }]
        : [],
    }));

    assert.throws(
      () => requireAllVisibleCompanions(
        threeVisible,
        requiredLabels,
        0.6
      ),
      /missing Axel.*Axel=0\.590.*viewport=1\.000.*PLAY dock=0\.410.*3\/4 companions visible/
    );
    assert.deepEqual(
      requireAllVisibleCompanions(
        threeVisible.map(metric => ({ ...metric, visibleRatio: 0.6 })),
        requiredLabels,
        0.6
      ),
      requiredLabels
    );
  });

  test('unoccluded ratio subtracts every home overlay from viewport-visible area', async () => {
    const helpers = await import('./capturePlayStoreHelpers.mjs');
    assert.equal(typeof helpers.measureUnoccludedVisibleArea, 'function');
    const result = helpers.measureUnoccludedVisibleArea(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 0, y: 0, width: 100, height: 100 },
      [
        { label: 'header', x: 0, y: 0, width: 100, height: 20 },
        { label: 'Next Unlock sign', x: 0, y: 20, width: 100, height: 20 },
        { label: 'ambient line', x: 0, y: 40, width: 100, height: 10 },
        { label: 'PLAY dock', x: 0, y: 80, width: 100, height: 20 },
      ]
    );

    assert.equal(result.viewportRatio, 1);
    assert.equal(result.visibleRatio, 0.3);
    assert.deepEqual(
      result.occludedBy.map(item => [item.label, item.overlapRatio]),
      [
        ['header', 0.2],
        ['Next Unlock sign', 0.2],
        ['ambient line', 0.1],
        ['PLAY dock', 0.2],
      ]
    );
  });

  test('home capture measures unoccluded area before the four-animal guard', async () => {
    const runner = await fs.readFile(RUNNER_PATH, 'utf8');

    assert.match(runner, /measureUnoccludedVisibleArea\(/);
    assert.match(runner, /getHomeOverlayRects\(/);
    assert.match(runner, /requireAllVisibleCompanions\(/);
    assert.doesNotMatch(runner, /visible\.length\s*>=\s*3/);
  });

  test('home framing rejects a locked-room line that peeks beneath the Next Unlock bar', () => {
    const nextUnlockBar = { top: 150, bottom: 216 };

    assert.throws(
      () => requireNoPartialVerticalOcclusion(
        { top: 207, bottom: 225 },
        nextUnlockBar,
        'Build: 200'
      ),
      /Build: 200 partially overlaps the Next Unlock bar/
    );
    assert.equal(
      requireNoPartialVerticalOcclusion(
        { top: 180, bottom: 200 },
        nextUnlockBar,
        'Build: 200'
      ),
      'occluded'
    );
    assert.equal(
      requireNoPartialVerticalOcclusion(
        { top: 220, bottom: 238 },
        nextUnlockBar,
        'Build: 200'
      ),
      'clear'
    );
  });

  test('locked-room geometry derives the minimum upward correction', async () => {
    const helpers = await import('./capturePlayStoreHelpers.mjs');
    assert.equal(
      typeof helpers.getRequiredUpwardShiftForVerticalClearance,
      'function'
    );
    assert.equal(
      helpers.getRequiredUpwardShiftForVerticalClearance(
        { top: 105, bottom: 124 },
        { top: 112, bottom: 162 },
        0.5
      ),
      12.5
    );
    assert.equal(
      helpers.getRequiredUpwardShiftForVerticalClearance(
        { top: 90, bottom: 110 },
        { top: 112, bottom: 162 },
        0.5
      ),
      0
    );
  });

  test('home capture parameterizes locked-room geometry for sunny and storm', async () => {
    const runner = await fs.readFile(RUNNER_PATH, 'utf8');

    assert.match(runner, /requireNoPartialVerticalOcclusion\(/);
    assert.match(runner, /Build Jungle Hammock for 200 amber/);
    assert.match(
      runner,
      /async function assertHomeLockedRoomGeometry\(page,\s*scenario,\s*amber\)/,
      'locked-room audit must accept scenario fixture values'
    );
    assert.match(
      runner,
      /lockedRoom\.getByText\('Jungle Hammock'/,
      'capture must guard the locked-room title'
    );
    assert.match(
      runner,
      /amber >= 200\s*\?\s*'Tap to build this room'\s*:\s*`\$\{amber\} \/\s*200`/,
      'capture must guard each scenario production affordability line'
    );
    assert.match(
      runner,
      /'home-sunny':\s*\{\s*amber:\s*180\s*\}[\s\S]*'home-storm':\s*\{\s*amber:\s*420\s*\}/
    );
  });

  test('storm capture pans the semantic HouseWorld surface and waits for stable frames', async () => {
    const [runner, houseWorld] = await Promise.all([
      fs.readFile(RUNNER_PATH, 'utf8'),
      fs.readFile(HOUSE_WORLD_PATH, 'utf8'),
    ]);

    assert.match(
      runner,
      /case 'home-storm':[\s\S]*await waitForHome\(page\);[\s\S]*await panHouseToVisibleCompanions\(page,\s*'home-storm'\);[\s\S]*return;/
    );
    assert.match(
      runner,
      /async function panHouseToVisibleCompanions\(page,\s*scenario\)/
    );
    assert.match(houseWorld, /testID="home-world-pan-surface"/);
    assert.match(houseWorld, /minDist=\{10\}/);
    assert.match(runner, /getByTestId\('home-world-pan-surface'\)/);
    assert.match(runner, /panSurface\.boundingBox\(\)/);
    assert.match(runner, /HOME_PAN_ACTIVATION_DISTANCE\s*=\s*10/);
    assert.match(
      runner,
      /requestedUpwardDistance\s*\+\s*HOME_PAN_ACTIVATION_DISTANCE/
    );
    assert.match(
      runner,
      /page\.mouse\.down\(\)[\s\S]*page\.mouse\.move\([\s\S]*page\.mouse\.up\(\)/
    );
    assert.doesNotMatch(runner, /page\.mouse\.move\(24,\s*(?:620|314)/);
    assert.match(runner, /waitForStableHomeGeometry\(/);
    assert.match(runner, /stableFrameTarget\s*=\s*3/);
    assert.match(runner, /requestAnimationFrame/);
    assert.match(runner, /stableFrameCount\s*>=\s*stableFrameTarget/);
    assert.match(
      runner,
      /await waitForDocumentReadiness\(page\);[\s\S]*await assertHomeChromeGeometry\(page,\s*scenario\)/
    );
  });

  test('ambient capture state uses a semantic opacity hook without copy coupling', async () => {
    const [runner, home] = await Promise.all([
      fs.readFile(RUNNER_PATH, 'utf8'),
      fs.readFile(HOME_PATH, 'utf8'),
    ]);

    assert.match(home, /testID="home-ambient-line"/);
    assert.match(runner, /confirmAmbientCaptureState\(page\)/);
    assert.match(runner, /'home-ambient-line'/);
    assert.match(runner, /querySelector\(`\[data-testid="\$\{testId\}"\]`\)/);
    assert.match(runner, /const detached = element === null/);
    assert.match(runner, /const opacity = detached/);
    assert.match(runner, /return detached \|\| opacity <= 0\.001/);
    assert.doesNotMatch(runner, /Today's challenge is ready/);
    assert.doesNotMatch(runner, /The daily incantation is prepared/);
    assert.doesNotMatch(runner, /Today's words are chosen/);
  });

  test('home overlays expose semantic geometry hooks', async () => {
    const home = await fs.readFile(HOME_PATH, 'utf8');

    assert.match(home, /testID="home-header"/);
    assert.match(home, /testID="home-next-unlock-sign"/);
    assert.match(home, /testID="home-play-dock"/);
  });

  test('storm scenario uses production phase rendering without a sky override', async () => {
    const [runner, scenarios, houseWorld, animalSprite] = await Promise.all([
      fs.readFile(RUNNER_PATH, 'utf8'),
      fs.readFile(SCENARIOS_PATH, 'utf8'),
      fs.readFile(HOUSE_WORLD_PATH, 'utf8'),
      fs.readFile(ANIMAL_SPRITE_PATH, 'utf8'),
    ]);

    assert.match(
      scenarios,
      /case 'home-storm':\s*return stormProgress\(today\);/
    );
    assert.match(
      scenarios,
      /function stormProgress\(today: string\)[\s\S]*currentPhase:\s*3/
    );
    assert.match(
      scenarios,
      /return assertNever\(name\);/
    );
    assert.match(
      houseWorld,
      /currentPhase >= 4 \? SKY_SHADOW :\s*currentPhase >= 3 \? SKY_STORM :/
    );
    assert.match(
      animalSprite,
      /currentPhase >= 4 && sprites\.robed \? sprites\.robed : sprites\.idle/
    );
    assert.doesNotMatch(
      `${runner}\n${scenarios}`,
      /sky(?:Image|Asset|Source)?Override|overrideSky|sky_storm\.png|SKY_STORM/
    );
  });

  test('production setup render contract has no nonexistent combination teaser', async () => {
    const difficultyMenu = await fs.readFile(DIFFICULTY_MENU_PATH, 'utf8');

    assert.doesNotMatch(
      difficultyMenu,
      /More combo styles unlock later as you progress\./
    );
    assert.doesNotMatch(
      difficultyMenu,
      /More layered arrangements will reveal themselves\./
    );
  });

  test('flawless capture waits for the skip layer to unmount', async () => {
    const runner = await fs.readFile(RUNNER_PATH, 'utf8');

    assert.match(
      runner,
      /skipCelebration\.waitFor\(\{\s*state: 'detached'/
    );
  });

  test('capture interactions contain no Daily screenshot branch', async () => {
    const runner = await fs.readFile(RUNNER_PATH, 'utf8');

    assert.doesNotMatch(runner, /case 'daily':/);
    assert.doesNotMatch(runner, /Today’s Standing/);
  });

  test('real storm smoke capture is temporary, isolated, and cleanup-safe', async () => {
    const runner = await fs.readFile(RUNNER_PATH, 'utf8');
    const smokeFunction = runner.match(
      /async function runHomeStormSmoke\([\s\S]*?\n}\n/
    )?.[0];

    assert.ok(smokeFunction, 'runner must define a focused home-storm smoke path');
    assert.match(runner, /--smoke-home-storm/);
    assert.match(
      smokeFunction,
      /fs\.mkdtemp\(path\.join\(\s*os\.tmpdir\(\),\s*'wordshift-home-storm-smoke-'\s*\)\)/
    );
    assert.match(
      smokeFunction,
      /captureScenario\(\s*browser,\s*smokeItem,\s*smokeDirectory,\s*\{\s*debugDirectory:\s*smokeDirectory\s*\}\s*\)/
    );
    assert.match(smokeFunction, /assertPngDimensions\(/);
    assert.match(
      smokeFunction,
      /finally[\s\S]*fs\.rm\(smokeDirectory,\s*\{\s*recursive:\s*true,\s*force:\s*true\s*\}\)/
    );
    assert.doesNotMatch(smokeFunction, /SOURCE_DIR|withStagedPublication/);
    assert.match(runner, /context\.route\('\*\*\/\*'/);
    assert.match(runner, /isAllowedCaptureRequest\(route\.request\(\)\.url\(\)\)/);
  });

  test('capture and asset commands run the real storm smoke gate', async () => {
    const pkg = JSON.parse(await fs.readFile(PACKAGE_PATH, 'utf8'));

    assert.match(
      pkg.scripts['test:play-store-capture'],
      /capturePlayStoreScreenshots\.test\.mjs/
    );
    assert.match(
      pkg.scripts['test:play-store-capture'],
      /--smoke-home-storm/
    );
    assert.match(
      pkg.scripts['test:play-store-assets'],
      /npm run test:play-store-capture/
    );
  });

  test('aggregate Play Store asset tests include capture runner regressions', async () => {
    const pkg = JSON.parse(await fs.readFile(PACKAGE_PATH, 'utf8'));

    assert.match(
      pkg.scripts['test:play-store-assets'],
      /npm run test:play-store-capture/
    );
    assert.match(
      pkg.scripts['test:play-store-capture'],
      /capturePlayStoreScreenshots\.test\.mjs/
    );
  });
});
