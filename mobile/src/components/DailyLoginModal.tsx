import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Image,
} from 'react-native';
import { CandyColors, getPhaseTheme } from '../theme/colors';
import { AmberInline } from './AmberInline';
import { DailyLoginGrant, DAILY_LOGIN_REWARDS, DAILY_LOGIN_CYCLE_LENGTH } from '../services/dailyLoginReward';
import { getSettingsSync } from '../services/settings';

const AMBER_ICON = require('../../assets/ui/amber.png');

interface DailyLoginModalProps {
  /** The already-granted reward to present, or null to keep the modal closed. */
  grant: DailyLoginGrant | null;
  /** Narrative phase, for phase-aware theming. */
  phase: number;
  onClose: () => void;
}

/**
 * Celebratory daily-login claim modal. Purely presentational — the amber has
 * already been credited by claimDailyLoginReward() before this renders. Shows
 * the full 7-day escalating cycle so the player feels the "don't break the
 * chain" pull, with the just-claimed day popped and highlighted.
 */
export const DailyLoginModal: React.FC<DailyLoginModalProps> = ({ grant, phase, onClose }) => {
  const phaseTheme = getPhaseTheme(phase);
  const reducedMotion = getSettingsSync().reducedMotion;

  const cardScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.85)).current;
  const cardOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const claimedPop = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  const visible = grant !== null;

  useEffect(() => {
    if (!visible) return;
    if (reducedMotion) {
      cardScale.setValue(1);
      cardOpacity.setValue(1);
      claimedPop.setValue(1);
      return;
    }
    cardScale.setValue(0.85);
    cardOpacity.setValue(0);
    claimedPop.setValue(0);
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 6,
          tension: 120,
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
  }, [visible, reducedMotion, cardScale, cardOpacity, claimedPop]);

  if (!grant) return null;

  const claimedDay = grant.day;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: phaseTheme.modalOverlayColor }]}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: phaseTheme.modalBgColor,
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            },
          ]}
        >
          <View style={[styles.glow, { backgroundColor: phaseTheme.victoryGlowColor }]} />

          <Text style={[styles.title, { color: phaseTheme.modalTextColor }]}>
            Welcome Back
          </Text>

          {grant.reset && (
            <Text style={[styles.resetLine, { color: phaseTheme.modalSecondaryTextColor }]}>
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
                    { backgroundColor: phaseTheme.modalStatBgColor, borderColor: phaseTheme.modalDividerColor },
                    isJackpot && styles.dayCellJackpot,
                    isClaimed && styles.dayCellClaimed,
                    !isClaimed && !isPast && styles.dayCellFuture,
                    isClaimed && { transform: [{ scale: claimedPop }] },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      { color: phaseTheme.modalSecondaryTextColor },
                      isClaimed && styles.dayLabelClaimed,
                    ]}
                  >
                    {isJackpot ? 'Day 7' : `Day ${dayNum}`}
                  </Text>
                  {isPast ? (
                    <Text style={styles.checkMark} accessibilityLabel="claimed">✓</Text>
                  ) : (
                    <View style={styles.dayAmount}>
                      <Image source={AMBER_ICON} style={styles.dayAmberIcon} accessibilityLabel="amber" />
                      <Text
                        style={[
                          styles.dayAmountText,
                          { color: phaseTheme.modalTextColor },
                          isClaimed && styles.dayAmountClaimed,
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
            <Text style={[styles.claimedText, { color: phaseTheme.modalTextColor }]}>
              You received <AmberInline size={18} /> {grant.amount + grant.comebackBonus}
            </Text>
            {grant.comebackBonus > 0 && (
              <Text style={[styles.jackpotText, { color: CandyColors.yellow.dark }]}>
                +{grant.comebackBonus} welcome-back bonus
              </Text>
            )}
            {claimedDay === DAILY_LOGIN_CYCLE_LENGTH && (
              <Text style={[styles.jackpotText, { color: CandyColors.yellow.dark }]}>
                Jackpot!
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.collectButton}
            onPress={onClose}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Collect daily reward"
          >
            <Text style={styles.collectButtonText}>Collect</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    paddingTop: 26,
    paddingHorizontal: 20,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
    overflow: 'hidden',
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
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resetLine: {
    fontSize: 13,
    fontWeight: '600',
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
  dayCellClaimed: {
    borderColor: CandyColors.yellow.main,
    borderWidth: 2,
    backgroundColor: 'rgba(250, 204, 21, 0.18)',
  },
  dayCellJackpot: {
    borderColor: CandyColors.orange.main,
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 3,
  },
  dayLabelClaimed: {
    color: CandyColors.yellow.dark,
  },
  checkMark: {
    fontSize: 16,
    fontWeight: '800',
    color: CandyColors.success,
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
  },
  dayAmountClaimed: {
    fontSize: 14,
    fontWeight: '800',
    color: CandyColors.yellow.dark,
  },
  claimedBanner: {
    marginTop: 18,
    alignItems: 'center',
  },
  claimedText: {
    fontSize: 18,
    fontWeight: '700',
  },
  jackpotText: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  collectButton: {
    marginTop: 22,
    backgroundColor: CandyColors.purple.main,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 22,
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  collectButtonText: {
    color: CandyColors.white,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
