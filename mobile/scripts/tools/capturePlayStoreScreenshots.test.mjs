import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  APPROVED_SCENARIOS,
  isAllowedCaptureRequest,
  isSafePngBasename,
  validateCampaign,
} from './capturePlayStoreHelpers.mjs';

const makeCampaign = () => APPROVED_SCENARIOS.map((scenario, index) => ({
  scenario,
  source: `${String(index + 1).padStart(2, '0')}_${scenario}.png`,
  final: `${String(index + 1).padStart(2, '0')}_${scenario}_final.png`,
  headline: `Headline ${index + 1}`,
  support: `Support ${index + 1}`,
  altText: `Alt text ${index + 1}`,
  theme: index < 4 ? 'bright' : index < 7 ? 'dusk' : 'mystery',
}));

describe('capture campaign validation', () => {
  test('accepts the approved order, safe PNG basenames, and themes', () => {
    const campaign = makeCampaign();

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
