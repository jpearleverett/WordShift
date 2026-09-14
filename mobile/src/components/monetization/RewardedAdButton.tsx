import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated, Image, View } from 'react-native';
import { CHROME_ICONS } from '../ui/chromeIcons';
import { PIXEL_FONT_BOLD } from '../../theme/fonts';
import {
  showRewarded,
  isRewardedCapReached,
  isAdsReady,
  subscribeAdsReady,
  retryAdConsentIfUnready,
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
  onReward: () => void | Promise<void>;
  /** Persist an earned account reward even if its host has since closed. */
  completeAfterUnmount?: boolean;
  /** Parent operation lock; canStart also protects against same-frame taps. */
  disabled?: boolean;
  canStart?: () => boolean;
  /** Covers the entire ad and awaited reward save, including a grant retry. */
  onBusyChange?: (busy: boolean) => void;
  onRewardError?: (error: unknown) => void;
  /** Button label, e.g. "Tend the offering for bonus amber". */
  label: string;
  /**
   * Screen-reader label, when the visible one is too terse to stand alone.
   * Defaults to `label`. The Store's faucet row shows a bare "Watch" because
   * the amount sits beside it on the row's value rail, but a reader hitting the
   * button on its own still needs to be told what the tap earns.
   */
  accessibilityLabel?: string;
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
  completeAfterUnmount = false,
  disabled: externallyDisabled = false,
  canStart,
  onBusyChange,
  onRewardError,
  label,
  accessibilityLabel,
  phase,
  surface = 'auto',
  showWhenUnavailable = false,
  style,
}) => {
  // Patron suppression is synchronous and permanent for this render.
  const patron = isPatronSync();
  // Subscribed, not sampled: a consent retry (below) can make the provider
  // ready while this button is already on screen.
  const providerReady = useSyncExternalStore(subscribeAdsReady, isAdsReady, () => false);

  // A rewarded surface that renders unready is an ad exposure too: re-ask for
  // consent (an offline cold start's failed update) so the button can come up
  // once the network is back.
  useEffect(() => {
    if (patron || providerReady) return;
    retryAdConsentIfUnready(true).catch(() => {});
  }, [patron, providerReady]);

  const [capReached, setCapReached] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const earnedReward = useRef<(() => void | Promise<void>) | null>(null);
  const [retryReward, setRetryReward] = useState(false);
  const [errorLabel, setErrorLabel] = useState<string | null>(null);
  const mounted = useRef(true);
  const [busyOpacity] = useState(() => new Animated.Value(1));
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
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [patron, providerReady]);

  const handlePress = useCallback(async () => {
    const hasEarnedReward = earnedReward.current !== null;
    if (busyRef.current || externallyDisabled || (!hasEarnedReward && (patron || !providerReady || capReached))) return;
    if (canStart && !canStart()) return;
    busyRef.current = true;
    setBusy(true);
    setErrorLabel(null);
    onBusyChange?.(true);
    hapticLight();
    try {
      if (!earnedReward.current) {
        const result = await showRewarded(placement);
        if (!mounted.current && !completeAfterUnmount) return;
        if (result.completed) {
          // Capture this earned reward's callback. A rerender may supply a
          // different board/claim callback; retries must finish the original.
          earnedReward.current = onReward;
        }
        if (result.reason === 'daily_cap' && mounted.current) setCapReached(true);
      }
      if (earnedReward.current) {
        await earnedReward.current();
        earnedReward.current = null;
        if (mounted.current) {
          hapticMedium();
          setRetryReward(false);
        }
      }
    } catch (error) {
      // A completed ad is already paid for with the player's time. Retain its
      // grant on failure so Retry saves it without presenting another ad.
      if (mounted.current) {
        setRetryReward(earnedReward.current !== null);
        setErrorLabel(earnedReward.current ? 'Retry reward' : 'Try again');
      }
      onRewardError?.(error);
    } finally {
      busyRef.current = false;
      onBusyChange?.(false);
      if (mounted.current) setBusy(false);
    }
  }, [externallyDisabled, patron, providerReady, capReached, canStart, onBusyChange,
    placement, completeAfterUnmount, onReward, onRewardError]);

  // Suppression: Patron, no provider (unless showWhenUnavailable), or capped.
  const unavailable = !retryReward && (!providerReady || capReached);
  if (patron && !retryReward) return null;
  if (unavailable && !showWhenUnavailable) return null;

  const disabled = unavailable || busy || externallyDisabled;
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
      accessibilityLabel={retryReward ? 'Retry saving your earned reward. No additional ad.' : errorLabel ?? accessibilityLabel ?? label}
    >
      {busy ? (
        // Branded tap->ad handoff: keep the play glyph, name what's happening
        // in-world (phase-aware), and show a small amber pip so it reads as
        // "summoning your reward" rather than a generic frozen spinner.
        <Animated.View style={[styles.busyRow, { opacity: busyOpacity }]}>
          <Image source={CHROME_ICONS.play} style={styles.playIcon} resizeMode="contain" accessible={false} />
          <AmberInline size={13} style={styles.busyPip} />
          {/* Single line by contract: this button is now a rail-width child in
              the Store (154dp, not the old 224dp full-width tier), and the busy
              copy is longer than the resting label — left to wrap it grew the
              button a whole line taller the instant the player tapped it. */}
          <Text numberOfLines={1} style={[styles.label, isDark ? styles.labelDark : styles.labelLight, styles.busyLabel]}>
            {getRewardedBusyLabel(phase)}
          </Text>
        </Animated.View>
      ) : (
        /* The amber candy play mark (generateGameIcons chrome) leads the label
           where a '▷' glyph used to. */
        <View style={styles.busyRow}>
          <Image source={CHROME_ICONS.play} style={styles.playIcon} resizeMode="contain" accessible={false} />
          {/* Clamped for the same reason: at the OS max font scale the resting
              label wraps too, which reintroduces the height jump from the other
              side. accessibilityLabel is the prop, not this Text, so an ellipsis
              never reaches a screen reader. */}
          <Text numberOfLines={1} style={[styles.label, isDark ? styles.labelDark : styles.labelLight]}>{errorLabel ?? label}</Text>
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
    // Shrink before the pill can overrun a narrow host rail.
    flexShrink: 1,
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
