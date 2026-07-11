import type { AdProvider, RewardedPlacement, RewardedResult } from '../ads';

export interface AdMobConfig {
  interstitialId?: string;
  rewardedId?: string;
}

export function createAdMobAdProvider(_config: AdMobConfig = {}): AdProvider {
  return {
    async initialize(): Promise<void> {},
    async loadRewarded(_placement: RewardedPlacement): Promise<void> {},
    async showRewarded(_placement: RewardedPlacement): Promise<RewardedResult> {
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
