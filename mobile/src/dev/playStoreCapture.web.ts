import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString } from '../services/dateUtils';
import {
  getSettings,
  invalidateSettingsCache,
} from '../services/settings';
import {
  buildPlayStoreScenario,
  parsePlayStoreScenario,
} from './playStoreScenarios';
import type { PlayStoreScenarioName } from './playStoreScenarios';

function readScenarioName(): PlayStoreScenarioName | null {
  if (typeof window === 'undefined' || typeof __DEV__ === 'undefined') {
    return null;
  }

  try {
    return parsePlayStoreScenario(window.location.search, __DEV__, 'web');
  } catch {
    return null;
  }
}

const scenarioName = readScenarioName();

export function isPlayStoreCaptureActive(): boolean {
  return scenarioName !== null;
}

export function getPlayStoreScenarioName(): PlayStoreScenarioName | null {
  return scenarioName;
}

export function shouldFreezePlayStoreCaptureMotion(): boolean {
  return scenarioName !== null;
}

export async function preparePlayStoreCapture(): Promise<boolean> {
  if (scenarioName === null) return false;

  const scenario = buildPlayStoreScenario(
    scenarioName,
    getLocalDateString()
  );
  await AsyncStorage.clear();
  await AsyncStorage.multiSet(Object.entries(scenario.storage));
  invalidateSettingsCache();
  await getSettings();
  return true;
}
