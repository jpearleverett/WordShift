import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Modal,
  Image,
} from 'react-native';
import { SURFACE, getSurfaceTheme, getModalInSpring } from '../theme/surfaces';
import { PIXEL_FONT_BOLD } from '../theme/fonts';
import { hapticSuccess } from '../services/haptics';
import { playUiSound } from '../services/uiSound';
import { PanelCard } from './ui/PanelCard';
import { CandyButton } from './ui/CandyButton';
import { RewardReveal } from './ui/RewardReveal';
import { DailyLoginGrant, DAILY_LOGIN_REWARDS, DAILY_LOGIN_CYCLE_LENGTH } from '../services/dailyLoginReward';
import { getSettingsSync } from '../services/settings';
// First-ever-claim copy: a brand-new player has never left, so "Welcome Back"
// is wrong. The returning-player welcome/reset/received/jackpot/collect copy is
// phase-aware too. Both live in phaseNarrative with the rest of the text.
import { getDailyLoginFirstClaimCopy, getDailyLoginModalCopy } from '../services/phaseNarrative';
import { FONT_SIZE } from '../theme/typeScale';

import { CHROME_ICONS } from './ui/chromeIcons';
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
          ...getModalInSpring(phase),
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

  // Amber-gem particle burst from the claimed day cell on Collect. The cell
  // reports its own layout (measured once it renders as the claimed cell);
  // reset on every fresh grant so a stale layout can never anchor a new burst.
  const [claimedCellLayout, setClaimedCellLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [burstActive, setBurstActive] = useState(false);
  const BURST_PARTICLE_COUNT = 5;
  const burstParticles = useRef(
    Array.from({ length: BURST_PARTICLE_COUNT }, () => ({
      tx: new Animated.Value(0),
      ty: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.6),
    })),
  ).current;

  useEffect(() => {
    if (!visible) return;
    setBurstActive(false);
    setClaimedCellLayout(null);
  }, [visible]);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    // The Collect handler now plays its own semantic sound (the button
    // itself is soundKind="none").
    playUiSound('selection');
    if (reducedMotion) {
      onClose();
      return;
    }
    const showBurst = claimedCellLayout !== null;
    if (showBurst) {
      setBurstActive(true);
      burstParticles.forEach((p, i) => {
        p.tx.setValue(0);
        p.ty.setValue(0);
        p.opacity.setValue(1);
        p.scale.setValue(0.6);
        const angle = (i / burstParticles.length) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 22 + Math.random() * 14;
        Animated.parallel([
          Animated.timing(p.tx, { toValue: Math.cos(angle) * dist, duration: 340, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(p.ty, { toValue: Math.sin(angle) * dist - 8, duration: 340, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 0, duration: 340, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.spring(p.scale, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();
      });
    }
    const closeDelayMs = showBurst ? 350 : 0;
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: SURFACE.modalOutMs,
        delay: closeDelayMs,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: SURFACE.modalOutMs,
        delay: closeDelayMs,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [reducedMotion, backdropOpacity, cardOpacity, onClose, claimedCellLayout, burstParticles]);

  if (!grant) return null;

  const claimedDay = grant.day;
  const firstClaimCopy = grant.isFirstClaim ? getDailyLoginFirstClaimCopy(phase) : null;
  const copy = getDailyLoginModalCopy(phase);

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
              {firstClaimCopy ? firstClaimCopy.title : copy.welcomeTitle}
            </Text>

            {firstClaimCopy && (
              <Text style={[styles.resetLine, { color: t.muted }]}>
                {firstClaimCopy.subtitle}
              </Text>
            )}

            {!firstClaimCopy && grant.reset && (
              <Text style={[styles.resetLine, { color: t.muted }]}>
                {copy.resetLine}
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
                    onLayout={isClaimed ? (e) => setClaimedCellLayout(e.nativeEvent.layout) : undefined}
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
                      <Image source={CHROME_ICONS.check} style={styles.checkMarkIcon} resizeMode="contain" accessibilityLabel="claimed" />
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
              {/* Amber-gem particle burst from the claimed day cell on Collect,
                  ~350ms before the modal closes. Reduced motion skips it (kept
                  sound + haptic; see handleClose). */}
              {burstActive && claimedCellLayout && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.burstAnchor,
                    { left: claimedCellLayout.x + claimedCellLayout.width / 2, top: claimedCellLayout.y + claimedCellLayout.height / 2 },
                  ]}
                >
                  {burstParticles.map((p, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.burstGem,
                        { opacity: p.opacity, transform: [{ translateX: p.tx }, { translateY: p.ty }, { scale: p.scale }] },
                      ]}
                    >
                      <Image source={AMBER_ICON} style={styles.burstGemIcon} />
                    </Animated.View>
                  ))}
                </View>
              )}
            </View>

            {/* Claimed amount, prominent — counts up with an amber-icon pop and
                a soft glow (the shared RewardReveal, so the daily claim gets the
                same magnitude-aware acknowledgment as the other reward moments
                instead of a static number appearing all at once). */}
            <View style={styles.claimedBanner}>
              <RewardReveal
                amount={grant.amount + grant.comebackBonus}
                icon={AMBER_ICON}
                label={copy.received}
                phase={phase}
              />
              {/* Win-back line: a first claim can never be a comeback. */}
              {!grant.isFirstClaim && grant.comebackBonus > 0 && (
                <Text style={[styles.jackpotText, { color: t.amberText }]}>
                  +{grant.comebackBonus} {copy.comebackBonus}
                </Text>
              )}
              {claimedDay === DAILY_LOGIN_CYCLE_LENGTH && (
                <Text style={[styles.jackpotText, { color: t.amberText }]}>
                  {copy.jackpot}
                </Text>
              )}
            </View>

            <CandyButton
              label={copy.collect}
              onPress={handleClose}
              phase={phase}
              variant="primary"
              size="lg"
              style={styles.collectButton}
              accessibilityLabel="Collect daily reward"
              soundKind="none"
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
    paddingHorizontal: SURFACE.panelPadX,
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
    fontSize: FONT_SIZE.display,
    fontWeight: '900',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: 0.5,
  },
  resetLine: {
    fontSize: FONT_SIZE.body,
    fontWeight: '600',
    fontFamily: PIXEL_FONT_BOLD,
    marginTop: 4,
    fontStyle: 'italic',
  },
  cycleRow: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 20,
    marginBottom: 4,
  },
  // Amber-gem particle burst anchor, positioned at the claimed cell's center
  // (see claimedCellLayout); each gem is a small absolutely-positioned Image
  // that flies outward + fades on Collect.
  burstAnchor: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  burstGem: {
    position: 'absolute',
    left: -7,
    top: -7,
    width: 14,
    height: 14,
  },
  burstGemIcon: {
    width: 14,
    height: 14,
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
    fontSize: FONT_SIZE.micro,
    fontWeight: '700',
    fontFamily: PIXEL_FONT_BOLD,
    marginBottom: 3,
  },
  // The carved check (generateGameIcons chrome) marks a claimed day.
  checkMarkIcon: {
    width: 18,
    height: 18,
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
    fontSize: FONT_SIZE.small,
    fontWeight: '700',
    fontFamily: PIXEL_FONT_BOLD,
  },
  dayAmountClaimed: {
    fontSize: FONT_SIZE.bodyLg,
    fontWeight: '800',
    fontFamily: PIXEL_FONT_BOLD,
  },
  claimedBanner: {
    marginTop: 18,
    alignItems: 'center',
  },
  jackpotText: {
    fontSize: FONT_SIZE.callout,
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
