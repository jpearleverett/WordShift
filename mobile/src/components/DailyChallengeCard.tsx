import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { CandyColors } from '../theme/colors';
import { getDailyStatus } from '../services/dailyChallenge';
import { getActiveEvent } from '../services/liveEvents';
import { getEventBadgeLabel } from '../services/phaseNarrative';
import { Difficulty } from '../types';
import { getSettingsSync } from '../services/settings';

const CALENDAR_ICON = require('../../assets/ui/calendar.png');
const MOON_ICON = require('../../assets/ui/moon.png');
// Completed state: the carved check + the real star sprites (the card used to
// draw a '✓' glyph over a '★★☆' text string beside candy sprite badges).
const CHECK_ICON = require('../../assets/ui/check.png');
const STAR_FILLED = require('../../assets/ui/star_filled.png');
const STAR_EMPTY = require('../../assets/ui/star_empty.png');

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
 * - Completed: checkmark with stars, tap re-checks the daily standing
 * - The home header owns the single visible play-streak indicator. This
 *   button keeps its separate daily-only streak in its accessibility label.
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
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [glowAnim] = useState(() => new Animated.Value(0.3));
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getDailyStatus().then(status => {
      if (cancelled) return;
      setIsCompleted(status.isCompleted);
      setDifficulty(status.difficulty);
      setStreak(status.streak);
      setStars(status.todayResult?.stars ?? 0);
    }).catch(() => {});
    return () => { cancelled = true; };
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
  }, [isCompleted, phase, glowAnim, pulseAnim]);

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
            ? `Daily challenge completed. ${stars} stars. ${streak > 1 ? `${streak} day daily-challenge streak. ` : ''}${onRecheckStanding ? 'Tap to check your standing.' : ''}`
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
            <Image source={CHECK_ICON} style={styles.checkIconImage} resizeMode="contain" accessible={false} />
            <View style={styles.miniStarsRow} accessible={false}>
              {[1, 2, 3].map(slot => (
                <Image
                  key={slot}
                  source={slot <= stars ? STAR_FILLED : STAR_EMPTY}
                  style={styles.miniStarIcon}
                  resizeMode="contain"
                />
              ))}
            </View>
          </View>
        ) : (
          <Image source={CALENDAR_ICON} style={styles.calendarIconImage} />
        )}

        {/* Not-completed indicator dot */}
        {!isCompleted && (
          <View style={[
            styles.notifDot,
            phase >= 4 && { backgroundColor: '#B83C3C' },
          ]} />
        )}

        {/* Full-moon event badge (small moon accent; the label rides the
            card's accessibilityLabel above). Absolute so the card's size and
            layout are unchanged. */}
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
  calendarIconImage: {
    width: 24,
    height: 24,
  },
  completedContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconImage: {
    width: 14,
    height: 14,
    marginTop: -1,
  },
  miniStarsRow: {
    flexDirection: 'row',
    marginTop: 1,
  },
  miniStarIcon: {
    width: 9,
    height: 9,
    marginHorizontal: 0.5,
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
  moonBadgeIcon: {
    width: 12,
    height: 12,
  },
});
