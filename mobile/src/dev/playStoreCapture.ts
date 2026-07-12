import type { PlayStoreScenarioName } from './playStoreScenarios';

export function isPlayStoreCaptureActive(): false {
  return false;
}

export function getPlayStoreScenarioName(): PlayStoreScenarioName | null {
  return null;
}

export function shouldFreezePlayStoreCaptureMotion(): false {
  return false;
}

export async function preparePlayStoreCapture(): Promise<false> {
  return false;
}
