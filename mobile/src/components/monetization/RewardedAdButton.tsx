import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  showRewarded,
  isRewardedCapReached,
  isAdsReady,
  RewardedPlacement,
} from '../../services/ads';
import { isPatronSync } from '../../services/entitlements';
import { hapticLight, hapticMedium } from '../../services/haptics';

interface RewardedAdButtonProps {
  /** The opt-in placement (analytics/policy key in ads.ts). */
  placement: RewardedPlacement;
  /**
   * Fired ONLY when the player watched the full ad and earned the reward.
   * The host grants the actual reward (amber, streak protection, etc.).
   */
  onReward: () => void;
  /** Button label, e.g. "Tend the offering for bonus amber". */
  label: string;
  /** Narrative phase, for tasteful phase-aware tinting. */
  phase: number;
  /**
   * Which background the button sits on. 'auto' (default) infers from phase
   * (dark at phase 3+), which is right when the host surface follows the phase
   * theme (victory modal, store). Hosts that are dark at EVERY phase (the
   * speed-rescue overlay, the pit's tending modal) must pass 'dark' so the
   * label keeps its light-gold ink instead of dark-on-dark.
   */
  surface?: 'auto' | 'light' | 'dark';
  /**
   * Render even when no ad backend is available, in a disabled state, instead of
   * hiding entirely. Default false → the affordance simply isn't there when there
   * is nothing to offer (the honest, non-nagging default).
   */
  showWhenUnavailable?: boolean;
  /** Optional style override for the touchable. */
  style?: object;
}

/**
 * Player-initiated rewarded-ad affordance. NEVER auto-shows — it is a button the
 * player chooses to tap (interstitials are the only auto format, gated elsewhere).
 *
 * Graceful by construction:
 *   - Suppressed entirely for Patron holders (they bought the quiet table).
 *   - Hidden (or disabled, if `showWhenUnavailable`) when no real ad provider is
 *     connected — the NoOp backend reports `isReady()` false via the provider name,
 *     and a tap resolves to `{ completed:false, reason:'no_provider' }`.
 *   - Hidden when the rewarded daily cap is reached.
 *   - `onReward` fires only on a genuine completed view.
 *
 * Build only — see RewardedAdButton.md / the integration notes for the recommended
 * call site. Not wired into App.tsx here.
 */
export const RewardedAdButton: React.FC<RewardedAdButtonProps> = ({
  placement,
  onReward,
  label,
  phase,
  surface = 'auto',
  showWhenUnavailable = false,
  style,
}) => {
  // Patron suppression is synchronous and permanent for this render.
  const patron = isPatronSync();
  const providerReady = isAdsReady();

  const [capReached, setCapReached] = useState(false);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Check the daily cap once when potentially visible.
  useEffect(() => {
    if (patron || !providerReady) return;
    let cancelled = false;
    (async () => {
      const reached = await isRewardedCapReached();
      if (!cancelled && mounted.current) setCapReached(reached);
    })();
    return () => {
      cancelled = true;
    };
  }, [patron, providerReady]);

  const handlePress = useCallback(async () => {
    if (busy || patron || !providerReady) return;
    setBusy(true);
    hapticLight();
    try {
      const result = await showRewarded(placement);
      if (!mounted.current) return;
      if (result.completed) {
        hapticMedium();
        onReward();
      }
      if (result.reason === 'daily_cap') {
        setCapReached(true);
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [busy, patron, providerReady, placement, onReward]);

  // Suppression: Patron, no provider (unless showWhenUnavailable), or capped.
  const unavailable = !providerReady || capReached;
  if (patron) return null;
  if (unavailable && !showWhenUnavailable) return null;

  const disabled = unavailable || busy;
  const isDark = surface === 'auto' ? phase >= 3 : surface === 'dark';

  return (
    <TouchableOpacity
      style={[styles.button, isDark ? styles.buttonDark : styles.buttonLight, disabled && styles.disabled, style]}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
    >
      {busy ? (
        <ActivityIndicator size="small" color={isDark ? '#FFD479' : '#755A00'} />
      ) : (
        <Text style={[styles.label, isDark ? styles.labelDark : styles.labelLight]}>
          {'▷ '}
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonLight: {
    backgroundColor: 'rgba(255, 201, 77, 0.22)',
    borderColor: 'rgba(184, 134, 11, 0.5)',
  },
  buttonDark: {
    backgroundColor: 'rgba(150, 90, 60, 0.18)',
    borderColor: 'rgba(180, 110, 70, 0.4)',
  },
  disabled: { opacity: 0.4 },
  label: { fontSize: 13.5, fontWeight: '800' },
  // Dark amber ink on the light gold pill (matches freeDoubleTextLight in the
  // victory modal); the old #FFD479 was near-invisible on cream surfaces.
  labelLight: { color: '#755A00' },
  labelDark: { color: '#E0B080' },
});

export default RewardedAdButton;
