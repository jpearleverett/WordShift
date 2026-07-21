import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Modal,
  Image,
} from 'react-native';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { PIXEL_FONT_BOLD } from '../theme/fonts';
import { hapticSuccess } from '../services/haptics';
import { playUiSound } from '../services/uiSound';
import { PanelCard } from './ui/PanelCard';
import { CandyButton } from './ui/CandyButton';
import { AmberInline } from './AmberInline';
import { DailyLoginGrant, DAILY_LOGIN_REWARDS, DAILY_LOGIN_CYCLE_LENGTH } from '../services/dailyLoginReward';
import { getSettingsSync } from '../services/settings';
// First-ever-claim copy: a brand-new player has never left, so "Welcome Back"
// is wrong. Lives in phaseNarrative with the rest of the player-facing text.
import { getDailyLoginFirstClaimCopy } from '../services/phaseNarrative';

const AMBER_ICON = require('../../assets/ui/amber.png');

interface DailyLoginModalProps {
  /** The already-granted reward to present, or null to keep the modal closed. */
  grant: DailyLoginGrant | null;
  /** Narrative phase, for phase-aware theming. */
  phase: number;
  onClose: () => void;
}

/**
 * Celebratory daily-login claim modal. Purely presentational: the amber has
 * already been credited by claimDailyLoginReward() before this renders. Shows
 * the full 7-day escalating cycle so the player feels the "don't break the
 * chain" pull, with the just-claimed day popped and highlighted.
 */
export const DailyLoginModal: React.FC<DailyLoginModalProps> = ({ grant, phase, onClose }) => {
  const t = getSurfaceTheme(phase);
  const reducedMotion = getSettingsSync().reducedMotion;

  const backdropOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const cardScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.92)).current;
  const cardOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const claimedPop = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const closingRef = useRef(false);

  const visible = grant !== null;

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    // The 7-day reward reveal had no sound AND no haptic — the jackpot appeared
    // in silence. Mark the reward moment (self-gated on the sound/haptic prefs).
    hapticSuccess();
    playUiSound('amber_earn');
    if (reducedMotion) {
      backdropOpacity.setValue(1);
      cardScale.setValue(1);
      cardOpacity.setValue(1);
      claimedPop.setValue(1);
      return;
    }
    backdropOpacity.setValue(0);
    cardScale.setValue(0.92);
    cardOpacity.setValue(0);
    claimedPop.setValue(0);
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          ...SURFACE.modalIn,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(claimedPop, {
        toValue: 1,
        friction: 4,
        tension: 160,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [visible, reducedMotion, backdropOpacity, cardScale, cardOpacity, claimedPop]);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (reducedMotion) {
      onClose();
      return;
    }
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: SURFACE.modalOutMs,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: SURFACE.modalOutMs,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [reducedMotion, backdropOpacity, cardOpacity, onClose]);

  if (!grant) return null;

  const claimedDay = grant.day;
  const firstClaimCopy = grant.isFirstClaim ? getDailyLoginFirstClaimCopy(phase) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlayRoot}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay, opacity: backdropOpacity }]}
        />
        <Animated.View
          style={[
            styles.cardWrap,
            {
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            },
          ]}
        >
          <PanelCard phase={phase} kind="panel" style={styles.card}>
            <View style={[styles.glow, { backgroundColor: t.glow }]} />

            <Text style={[styles.title, { color: t.title }]}>
              {firstClaimCopy ? firstClaimCopy.title : 'Welcome Back'}
            </Text>

            {firstClaimCopy && (
              <Text style={[styles.resetLine, { color: t.muted }]}>
                {firstClaimCopy.subtitle}
              </Text>
            )}

            {!firstClaimCopy && grant.reset && (
              <Text style={[styles.resetLine, { color: t.muted }]}>
                A new chain begins
              </Text>
            )}

            {/* 7-day cycle row */}
            <View
              style={styles.cycleRow}
              accessible
              accessibilityLabel={`Daily login cycle, day ${claimedDay} of ${DAILY_LOGIN_CYCLE_LENGTH}`}
            >
              {DAILY_LOGIN_REWARDS.map((amount, idx) => {
                const dayNum = idx + 1;
                const isClaimed = dayNum === claimedDay;
                const isPast = dayNum < claimedDay;
                const isJackpot = dayNum === DAILY_LOGIN_CYCLE_LENGTH;
                return (
                  <Animated.View
                    key={dayNum}
                    style={[
                      styles.dayCell,
                      { backgroundColor: t.sectionBg, borderColor: t.sectionBorder },
                      isJackpot && { borderColor: t.amberTintBorder },
                      isClaimed && {
                        borderColor: t.amberTintBorder,
                        borderWidth: 2,
                        backgroundColor: t.amberTint,
                      },
                      !isClaimed && !isPast && styles.dayCellFuture,
                      isClaimed && { transform: [{ scale: claimedPop }] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayLabel,
                        { color: t.muted },
                        isClaimed && { color: t.amberText },
                      ]}
                    >
                      {isJackpot ? 'Day 7' : `Day ${dayNum}`}
                    </Text>
                    {isPast ? (
                      <Text style={[styles.checkMark, { color: t.amberText }]} accessibilityLabel="claimed">✓</Text>
                    ) : (
                      <View style={styles.dayAmount}>
                        <Image source={AMBER_ICON} style={styles.dayAmberIcon} accessibilityLabel="amber" />
                        <Text
                          style={[
                            styles.dayAmountText,
                            { color: t.title },
                            isClaimed && [styles.dayAmountClaimed, { color: t.amberText }],
                          ]}
                        >
                          {amount}
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                );
              })}
            </View>

            {/* Claimed amount, prominent */}
            <View style={styles.claimedBanner}>
              <Text style={[styles.claimedText, { color: t.title }]}>
                You received <AmberInline size={18} /> {grant.amount + grant.comebackBonus}
              </Text>
              {/* Win-back line: a first claim can never be a comeback. */}
              {!grant.isFirstClaim && grant.comebackBonus > 0 && (
                <Text style={[styles.jackpotText, { color: t.amberText }]}>
                  +{grant.comebackBonus} welcome-back bonus
                </Text>
              )}
              {claimedDay === DAILY_LOGIN_CYCLE_LENGTH && (
                <Text style={[styles.jackpotText, { color: t.amberText }]}>
                  Jackpot!
                </Text>
              )}
            </View>

            <CandyButton
              label="Collect"
              onPress={handleClose}
              phase={phase}
              variant="primary"
              size="lg"
              style={styles.collectButton}
              accessibilityLabel="Collect daily reward"
            />
          </PanelCard>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    width: '100%',
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    height: 180,
    opacity: 0.3,
    borderRadius: 100,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: 0.5,
  },
  resetLine: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: PIXEL_FONT_BOLD,
    marginTop: 4,
    fontStyle: 'italic',
  },
  cycleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 20,
    marginBottom: 4,
  },
  dayCell: {
    width: 42,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 2.5,
    marginVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  dayCellFuture: {
    opacity: 0.45,
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: PIXEL_FONT_BOLD,
    marginBottom: 3,
  },
  checkMark: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: PIXEL_FONT_BOLD,
  },
  dayAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayAmberIcon: {
    width: 11,
    height: 11,
    marginRight: 2,
  },
  dayAmountText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: PIXEL_FONT_BOLD,
  },
  dayAmountClaimed: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: PIXEL_FONT_BOLD,
  },
  claimedBanner: {
    marginTop: 18,
    alignItems: 'center',
  },
  claimedText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: PIXEL_FONT_BOLD,
  },
  jackpotText: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: PIXEL_FONT_BOLD,
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  collectButton: {
    marginTop: 22,
    alignSelf: 'stretch',
  },
});
