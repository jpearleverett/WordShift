import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated, Image, View } from 'react-native';
import { CHROME_ICONS } from '../ui/chromeIcons';
import { PIXEL_FONT_BOLD } from '../../theme/fonts';
import {
  showRewarded,
  isRewardedCapReached,
  isAdsReady,
  RewardedPlacement,
} from '../../services/ads';
import { isPatronSync } from '../../services/entitlements';
import { hapticLight, hapticMedium } from '../../services/haptics';
import { getSettingsSync } from '../../services/settings';
import { AmberInline } from '../AmberInline';
import { FONT_SIZE } from '../../theme/typeScale';

// Phase-aware busy-state copy for the tap->ad handoff: a bare "Loading..."
// read as a stall. Bright days stay plain; the descent frames the same wait
// as the house/arrangement doing its own quiet work. Short, no em dashes.
function getRewardedBusyLabel(phase: number): string {
  if (phase >= 4) return 'the arrangement gathers...';
  if (phase >= 2) return 'the offering gathers...';
  return 'preparing...';
}

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
   * theme (the victory modal's modalBg darkens at phase 3). Hosts that are
   * dark at EVERY phase (the speed-rescue overlay, the pit's tending modal)
   * must pass 'dark'. Hosts on the cottage pixel skin (PanelCard) must pass
   * an explicit surface too — its parchment stays LIGHT through phase 3
   * (storm) and only flips dark at 4, so 'auto' renders light-on-light there.
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
 * Live call sites: victory 2x (VictoryModal), speed rescue (App.tsx Time's-Up
 * overlay), hint recovery (out-of-hints alert → StoreModal), and the daily
 * amber faucet (StoreModal Free Amber card).
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
  const busyOpacity = useRef(new Animated.Value(1)).current;
  const busyLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Subtle "summoning the reward" shimmer on the pill while busy, in place of
  // a flat disabled dimming. Reduced-motion holds a static opacity instead.
  useEffect(() => {
    busyLoopRef.current?.stop();
    busyLoopRef.current = null;

    if (!busy) {
      busyOpacity.setValue(1);
      return;
    }
    if (getSettingsSync().reducedMotion) {
      busyOpacity.setValue(0.85);
      return;
    }
    busyLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(busyOpacity, {
          toValue: 0.6,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(busyOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ])
    );
    busyLoopRef.current.start();

    return () => {
      busyLoopRef.current?.stop();
      busyLoopRef.current = null;
    };
  }, [busy, busyOpacity]);

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
      // The flat disabled dim is reserved for the unavailable state; while
      // busy the shimmer on busyRow carries the "still working" tell instead.
      style={[styles.button, isDark ? styles.buttonDark : styles.buttonLight, unavailable && styles.disabled, style]}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
    >
      {busy ? (
        // Branded tap->ad handoff: keep the play glyph, name what's happening
        // in-world (phase-aware), and show a small amber pip so it reads as
        // "summoning your reward" rather than a generic frozen spinner.
        <Animated.View style={[styles.busyRow, { opacity: busyOpacity }]}>
          <Image source={CHROME_ICONS.play} style={styles.playIcon} resizeMode="contain" accessible={false} />
          <AmberInline size={13} style={styles.busyPip} />
          <Text style={[styles.label, isDark ? styles.labelDark : styles.labelLight, styles.busyLabel]}>
            {getRewardedBusyLabel(phase)}
          </Text>
        </Animated.View>
      ) : (
        /* The amber candy play mark (generateGameIcons chrome) leads the label
           where a '▷' glyph used to. */
        <View style={styles.busyRow}>
          <Image source={CHROME_ICONS.play} style={styles.playIcon} resizeMode="contain" accessible={false} />
          <Text style={[styles.label, isDark ? styles.labelDark : styles.labelLight]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busyPip: {
    marginLeft: 6,
  },
  playIcon: {
    width: 13,
    height: 13,
    marginRight: 6,
  },
  busyLabel: {
    marginLeft: 6,
  },
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
  label: { fontSize: FONT_SIZE.body, fontWeight: '800', fontFamily: PIXEL_FONT_BOLD },
  // Dark amber ink on the light gold pill (matches freeDoubleTextLight in the
  // victory modal); the old #FFD479 was near-invisible on cream surfaces, and
  // #755A00 measured only ~3:1 over the storm skin's deeper parchment —
  // #4E3C00 holds ≥4.5:1 on every light host (bright cream through storm tan).
  labelLight: { color: '#4E3C00' },
  labelDark: { color: '#E0B080' },
});

export default RewardedAdButton;
