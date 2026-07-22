/**
 * Banner ad — a low-friction anchored banner for MENU / utility surfaces only
 * (never over gameplay, the home art, or a ceremony). Follows the same seam
 * philosophy as the rest of the ad layer: INERT unless the AdMob SDK is present
 * AND a banner ad unit id is configured, so it is always safe to mount and a
 * no-op in Expo Go / Jest.
 *
 * Suppression is centralized in ads.shouldShowBanner (ad-free holders,
 * onboarding, Phase 4+). When suppressed / unavailable it renders nothing — the
 * honest, non-nagging default (never a blank grey placeholder).
 *
 * Ad unit id resolution mirrors providers/googleAdMobAds.ts: test units in dev
 * or when extra.adsUseTestIds is set; otherwise the platform banner id from
 * app.json → extra (admobBannerIdIos / admobBannerIdAndroid). Empty id → nothing.
 */
import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { shouldShowBanner } from '../../services/ads';
import { isAdFreeSync } from '../../services/entitlements';
import { getSurfaceTheme } from '../../theme/surfaces';

interface BannerAdProps {
  /** Narrative phase (banners suppress from Phase 4+). */
  phase: number;
  /** True while the guided onboarding is active (banners suppressed). */
  onboarding?: boolean;
}

function readExtra(): Record<string, any> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default ?? require('expo-constants');
    return Constants?.expoConfig?.extra ?? Constants?.manifest?.extra ?? {};
  } catch {
    return {};
  }
}

/** Same gate as the provider: test ad units in dev, or when extra.adsUseTestIds. */
function shouldUseTestAds(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  return readExtra().adsUseTestIds === true;
}

/** Guarded literal require so Metro bundles the SDK; degrades to null under Jest / Expo Go. */
function loadAdsModule(): any | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}

function resolveBannerUnitId(mod: any): string | undefined {
  if (shouldUseTestAds()) {
    return mod?.TestIds?.BANNER ?? 'ca-app-pub-3940256099942544/6300978111';
  }
  const extra = readExtra();
  return Platform.OS === 'ios' ? extra.admobBannerIdIos : extra.admobBannerIdAndroid;
}

/**
 * Renders an anchored adaptive banner, or nothing. Mount it at the bottom of a
 * menu screen; it self-suppresses by policy and availability.
 */
export const BannerAd: React.FC<BannerAdProps> = ({ phase, onboarding = false }) => {
  if (!shouldShowBanner({ phase: phase as any, isAdFree: isAdFreeSync(), onboarding })) {
    return null;
  }
  const mod = loadAdsModule();
  if (!mod?.BannerAd) return null;
  const unitId = resolveBannerUnitId(mod);
  if (!unitId) return null; // no banner unit configured → nothing (graceful)

  const NativeBanner = mod.BannerAd;
  const size = mod.BannerAdSize?.ANCHORED_ADAPTIVE_BANNER ?? 'ANCHORED_ADAPTIVE_BANNER';
  // A subtle phase-aware "shelf" so the raw Google rectangle sits on the cottage
  // surface instead of floating bare (no overflow:hidden — a native ad view must
  // not be clipped; the frame is just a tinted bordered tray around it).
  const t = getSurfaceTheme(phase);
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.frame, { backgroundColor: t.cardBg, borderColor: t.cardBorder }]}>
        <NativeBanner unitId={unitId} size={size} requestOptions={{}} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  frame: {
    padding: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
});

export default BannerAd;
