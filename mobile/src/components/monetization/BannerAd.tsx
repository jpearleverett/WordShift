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
import { View, Text, Platform, StyleSheet } from 'react-native';
import { shouldShowBanner } from '../../services/ads';
import { isAdFreeSync } from '../../services/entitlements';
import { SURFACE, getSurfaceTheme } from '../../theme/surfaces';
import { PIXEL_FONT_BOLD } from '../../theme/fonts';
import { FONT_SIZE } from '../../theme/typeScale';

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
 * Renders an anchored adaptive banner inside a labeled cottage tray, or nothing.
 * Mount it at the bottom of a menu screen; it self-suppresses by policy.
 *
 * Two suppression reasons, handled differently so the surrounding layout never
 * jumps as the async native banner loads in (or fails to fill):
 *   - POLICY (ad-free / onboarding / Phase 4+ via shouldShowBanner): render
 *     nothing at all, the honest non-nagging default (no empty shelf for a
 *     paying ad-free player; the menu consumers also policy-gate this View).
 *   - AVAILABILITY (SDK / unit id absent, e.g. Expo Go): the policy still wants
 *     a banner here, so keep the labeled tray at its RESERVED height with an
 *     empty reserved slot instead of collapsing, so shown vs. not-yet-loaded
 *     occupy the same space and nothing below shifts.
 */
export const BannerAd: React.FC<BannerAdProps> = ({ phase, onboarding = false }) => {
  if (!shouldShowBanner({ phase: phase as any, isAdFree: isAdFreeSync(), onboarding })) {
    return null;
  }
  const mod = loadAdsModule();
  const NativeBanner = mod?.BannerAd;
  const unitId = NativeBanner ? resolveBannerUnitId(mod) : undefined;
  const size = mod?.BannerAdSize?.ANCHORED_ADAPTIVE_BANNER ?? 'ANCHORED_ADAPTIVE_BANNER';
  const canRenderNative = !!(NativeBanner && unitId);

  // A subtle phase-aware "shelf" so the raw Google rectangle sits on the cottage
  // surface instead of floating bare (no overflow:hidden — a native ad view must
  // not be clipped; the frame is just a tinted bordered tray around it). The wrap
  // carries a fixed minHeight (label + banner + padding) so it reserves the same
  // space whether the native banner has loaded, or isn't available yet.
  const t = getSurfaceTheme(phase);
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Text style={[styles.label, { color: t.muted }]}>ADVERTISEMENT</Text>
      <View style={[styles.frame, { backgroundColor: t.cardBg, borderColor: t.cardBorder }]}>
        {canRenderNative ? (
          <NativeBanner unitId={unitId} size={size} requestOptions={{}} />
        ) : (
          // Availability suppression: hold the reserved slot so the tray keeps its
          // height and nothing below jumps when an ad is (or isn't) present.
          <View style={styles.reservedSlot} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    // Reserved: label (~20) + banner (~60) + frame/wrap padding (~18). Keeps the
    // menu layout stable as the async native banner loads in or fails to fill.
    minHeight: 100,
  },
  // Small muted uppercase plaque, matching the section-label type treatment used
  // across the menu screens (e.g. StatsScreen's banner tray).
  label: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.micro,
    fontWeight: '800',
    letterSpacing: SURFACE.sectionLetterSpacing,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  frame: {
    padding: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  // Empty banner-sized reservation shown when the native view isn't available,
  // so the framed slot keeps a loaded ad's footprint.
  reservedSlot: {
    width: 320,
    height: 50,
  },
});

export default BannerAd;
