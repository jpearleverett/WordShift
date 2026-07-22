import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { CandyColors } from '../theme/colors';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../theme/fonts';
import { getDailyStatus } from '../services/dailyChallenge';
import { getActiveEvent } from '../services/liveEvents';
import { getEventBadgeLabel } from '../services/phaseNarrative';
import { Difficulty } from '../types';
import { getSettingsSync } from '../services/settings';

// Same flame sprite as the header streak pill — the badge is the DAILY streak
// count, and the flame keeps it from reading as an unread-notification count.
const FLAME_ICON = require('../../assets/ui/flame.png');
const CALENDAR_ICON = require('../../assets/ui/calendar.png');
const MOON_ICON = require('../../assets/ui/moon.png');

// F78: attention pulses slow into a smolder as the descent deepens — same
// colors, longer breath (bright base 1200ms -> ~2200ms at Phase 3 -> ~2800ms
// at Phase 4+). Easing is unchanged at the call sites.
const getPhaseScaledPulseMs = (phase: number, brightMs: number): number => {
  if (phase >= 4) return 2800;
  if (phase >= 3) return 2200;
  return brightMs;
};

interface DailyChallengeCardProps {
  onStartDaily: (difficulty: Difficulty) => void;
  phase?: number;
  /** Changing this value re-runs the daily status load (e.g. after returning home from a daily completion). */
  refreshSignal?: number | string;
  /** Tapping the COMPLETED card re-checks today's leaderboard standing (the
   *  standing was previously shown exactly once, on completion). */
  onRecheckStanding?: () => void;
}

/**
 * Compact daily challenge button designed to sit in the header row.
 * - Not completed: pulsing calendar icon, tap starts daily
 * - Completed: checkmark with stars, tap does nothing extra
 * - Streak badge shown when streak > 1
 */
export const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({
  onStartDaily,
  phase = 0,
  refreshSignal,
  onRecheckStanding,
}) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('HARD');
  const [stars, setStars] = useState(0);
  const [streak, setStreak] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loadStatus();
    // Re-run on mount and whenever refreshSignal changes (e.g. after a daily
    // completion when returning home) so the card never shows stale state.
  }, [refreshSignal]);

  useEffect(() => {
    // Stop any existing loops
    if (pulseLoopRef.current) {
      pulseLoopRef.current.stop();
      pulseLoopRef.current = null;
    }
    if (glowLoopRef.current) {
      glowLoopRef.current.stop();
      glowLoopRef.current = null;
    }

    if (getSettingsSync().reducedMotion) {
      pulseAnim.setValue(1);
      glowAnim.setValue(isCompleted ? 0 : 0.6);
      return;
    }

    if (!isCompleted) {
      const halfCycle = getPhaseScaledPulseMs(phase, 1200);
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: halfCycle,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: halfCycle,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoopRef.current.start();

      glowLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: halfCycle,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: halfCycle,
            useNativeDriver: true,
          }),
        ])
      );
      glowLoopRef.current.start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }

    return () => {
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current = null;
      }
      if (glowLoopRef.current) {
        glowLoopRef.current.stop();
        glowLoopRef.current = null;
      }
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
    };
  }, [isCompleted, phase]);

  const loadStatus = async () => {
    const status = await getDailyStatus();
    setIsCompleted(status.isCompleted);
    setDifficulty(status.difficulty);
    setStreak(status.streak);
    if (status.todayResult) {
      setStars(status.todayResult.stars);
    }
  };

  const handlePress = () => {
    if (!isCompleted) {
      onStartDaily(difficulty);
    } else {
      // Already played today — re-check the leaderboard standing.
      onRecheckStanding?.();
    }
  };

  const btnBg = isCompleted
    ? 'rgba(34, 197, 94, 0.3)'
    : phase >= 4
      ? 'rgba(180, 60, 60, 0.4)'
      : phase >= 3
        ? 'rgba(160, 140, 60, 0.4)'
        : 'rgba(255, 200, 60, 0.35)';

  const glowColor = phase >= 4
    ? 'rgba(180, 60, 60, 0.6)'
    : phase >= 3
      ? 'rgba(160, 140, 60, 0.5)'
      : 'rgba(255, 200, 60, 0.5)';

  // Full-moon live event (deterministic local-calendar math — no network).
  // Cheap pure call; recomputed per render so the badge tracks the window.
  const eventBadgeLabel = getActiveEvent() ? getEventBadgeLabel(phase) : null;

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: btnBg }]}
        onPress={handlePress}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        activeOpacity={isCompleted && !onRecheckStanding ? 1 : 0.7}
        accessibilityLabel={
          (isCompleted
            ? `Daily challenge completed. ${stars} stars. ${streak > 1 ? `${streak} day streak. ` : ''}${onRecheckStanding ? 'Tap to check your standing.' : ''}`
            : 'Start daily challenge') +
          (eventBadgeLabel ? ` ${eventBadgeLabel}.` : '')
        }
        accessibilityRole="button"
      >
        {/* Glow ring for uncompleted */}
        {!isCompleted && (
          <Animated.View
            style={[
              styles.glowRing,
              { borderColor: glowColor, opacity: glowAnim },
            ]}
            pointerEvents="none"
          />
        )}

        {isCompleted ? (
          <View style={styles.completedContent}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.miniStars}>
              {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
            </Text>
          </View>
        ) : (
          <Image source={CALENDAR_ICON} style={styles.calendarIconImage} />
        )}

        {/* Daily-streak badge (flame + count, mirroring the header streak
            pill; a bare number here read as a notification count) */}
        {streak > 1 && (
          <View style={[
            styles.streakBadge,
            phase >= 3 && { backgroundColor: '#8B4513' },
          ]}>
            <Image source={FLAME_ICON} style={styles.streakBadgeFlame} />
            <Text style={styles.streakBadgeText}>{streak}</Text>
          </View>
        )}

        {/* Not-completed indicator dot */}
        {!isCompleted && (
          <View style={[
            styles.notifDot,
            phase >= 4 && { backgroundColor: '#B83C3C' },
          ]} />
        )}

        {/* Full-moon event badge (small moon accent; the label rides the
            card's accessibilityLabel above). Absolute, mirroring the streak
            badge, so the card's size and layout are unchanged. */}
        {eventBadgeLabel && (
          <View
            style={[styles.moonBadge, phase >= 4 && styles.moonBadgeDark]}
            pointerEvents="none"
          >
            <Image source={MOON_ICON} style={styles.moonBadgeIcon} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
  },
  calendarIcon: {
    fontFamily: BODY_FONT,
    fontSize: 18,
  },
  calendarIconImage: {
    width: 24,
    height: 24,
  },
  completedContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 14,
    fontWeight: '900',
    color: CandyColors.green.main,
    marginTop: -1,
  },
  miniStars: {
    fontFamily: BODY_FONT,
    fontSize: 7,
    color: CandyColors.yellow.main,
    marginTop: -2,
    letterSpacing: 0.5,
  },
  streakBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: CandyColors.orange.main,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  streakBadgeFlame: {
    width: 9,
    height: 9,
    marginRight: 1,
  },
  streakBadgeText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 9,
    fontWeight: '900',
    color: CandyColors.white,
  },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CandyColors.red.main,
  },
  moonBadge: {
    position: 'absolute',
    bottom: -4,
    left: -6,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(90, 80, 150, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moonBadgeDark: {
    backgroundColor: 'rgba(120, 45, 45, 0.85)',
  },
  moonBadgeText: {
    fontFamily: BODY_FONT,
    fontSize: 9,
  },
  moonBadgeIcon: {
    width: 12,
    height: 12,
  },
});
