import React, { useCallback, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { ShareCard } from './ShareCard';
import { ShareableResult, isDailyShareBonusAvailable, shareChallengeText, DAILY_SHARE_BONUS_AMBER } from '../../services/shareResults';
import { shareResultImage, isImageShareAvailable } from '../../services/shareImage';
import { getChallengeFriendLabel } from '../../services/phaseNarrative';
import { hapticLight, hapticSuccess } from '../../services/haptics';
import { playUiSound } from '../../services/uiSound';
import { SURFACE, getSurfaceTheme, getModalInSpring } from '../../theme/surfaces';
import { PIXEL_FONT_BOLD } from '../../theme/fonts';
import { PanelCard } from '../ui/PanelCard';
import { CandyButton } from '../ui/CandyButton';
import { getSettingsSync } from '../../services/settings';

/**
 * Share preview: shows the polished result card and shares it. Captures a PNG
 * when the native capturer is available, otherwise falls back to the emoji-grid
 * text share (both handled inside `shareResultImage`). The card is always visible
 * so players can screenshot it even on the text-fallback path.
 */

interface ShareResultModalProps {
  result: ShareableResult | null;
  onClose: () => void;
  onShared?: () => void;
  /** Pre-built friend-challenge share text (standard non-daily boards only). */
  challengeText?: string | null;
}

export const ShareResultModal: React.FC<ShareResultModalProps> = ({ result, onClose, onShared, challengeText }) => {
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [bonusAvailable, setBonusAvailable] = useState(false);
  // The +5 daily-share reward, once actually earned by a completed share: the
  // pre-share hint swaps into an earned confirmation instead of a silent refresh.
  const [bonusEarned, setBonusEarned] = useState(false);
  const bonusAvailableRef = useRef(false);

  const reducedMotion = getSettingsSync().reducedMotion;
  const backdropOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const contentScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.92)).current;
  const contentOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  // The card gets its own small "here is your card" reveal a beat after the panel.
  const cardScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.95)).current;
  const cardOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  // Breathing opacity for the on-brand "capturing..." label (native driver).
  const capturePulse = useRef(new Animated.Value(1)).current;
  // Earned-reward pop for the "+5 amber" confirmation.
  const earnedScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.8)).current;
  const earnedOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const closingRef = useRef(false);

  const visible = result != null;

  useEffect(() => {
    if (result) {
      isDailyShareBonusAvailable()
        .then((v) => {
          setBonusAvailable(v);
          bonusAvailableRef.current = v;
        })
        .catch(() => {});
    }
  }, [result]);

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    setBonusEarned(false);
    if (reducedMotion) {
      backdropOpacity.setValue(1);
      contentScale.setValue(1);
      contentOpacity.setValue(1);
      cardScale.setValue(1);
      cardOpacity.setValue(1);
      return;
    }
    backdropOpacity.setValue(0);
    contentScale.setValue(0.92);
    contentOpacity.setValue(0);
    cardScale.setValue(0.95);
    cardOpacity.setValue(0);
    const anim = Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(contentScale, {
        toValue: 1,
        ...getModalInSpring(result?.phase ?? 0),
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      // The card materializes as its own beat, just after the panel settles.
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.spring(cardScale, {
            toValue: 1,
            ...getModalInSpring(result?.phase ?? 0),
            useNativeDriver: true,
          }),
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [visible, reducedMotion, backdropOpacity, contentScale, contentOpacity, cardScale, cardOpacity]);

  // On-brand "capturing..." breathe while a share is in flight (native driver,
  // reduced-motion pins to steady).
  useEffect(() => {
    if (!sharing || reducedMotion) {
      capturePulse.setValue(1);
      return;
    }
    capturePulse.setValue(0.55);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(capturePulse, { toValue: 1, duration: 520, useNativeDriver: true }),
        Animated.timing(capturePulse, { toValue: 0.55, duration: 520, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sharing, reducedMotion, capturePulse]);

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
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: SURFACE.modalOutMs,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [reducedMotion, backdropOpacity, contentOpacity, onClose]);

  // Called on any completed share. Beyond the caller's onShared refresh, it
  // acknowledges the +5 daily-share reward when a share actually claims it:
  // haptic + share sound + the pre-share hint swapping into an earned state
  // (re-checking availability so we never fake the reward).
  const acknowledgeShareSuccess = useCallback(async () => {
    onShared?.();
    if (!bonusAvailableRef.current) return;
    const stillAvailable = await isDailyShareBonusAvailable().catch(() => true);
    if (stillAvailable) return;
    bonusAvailableRef.current = false;
    setBonusAvailable(false);
    setBonusEarned(true);
    hapticSuccess();
    // 'amber_earn' is not in this build's UiSoundKind, so pair the success
    // haptic with the existing confirmation tick.
    playUiSound('tap');
    if (reducedMotion) {
      earnedScale.setValue(1);
      earnedOpacity.setValue(1);
      return;
    }
    earnedScale.setValue(0.8);
    earnedOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(earnedScale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.timing(earnedOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [onShared, reducedMotion, earnedScale, earnedOpacity]);

  const handleShare = async () => {
    if (!result || sharing) return;
    hapticLight();
    setSharing(true);
    try {
      const ok = await shareResultImage(cardRef.current, result);
      if (ok) await acknowledgeShareSuccess();
    } finally {
      setSharing(false);
    }
  };

  const handleChallengeShare = async () => {
    if (!challengeText || sharing) return;
    hapticLight();
    setSharing(true);
    try {
      // Routed through shareResults so a completed challenge share records
      // success (share count + first-share-of-day bonus) like every other
      // share path; a dismissed sheet / OS rejection resolves false.
      const ok = await shareChallengeText(challengeText);
      if (ok) await acknowledgeShareSuccess();
    } finally {
      setSharing(false);
    }
  };

  const phase = result?.phase ?? 0;
  const t = getSurfaceTheme(phase);

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
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
            styles.content,
            {
              transform: [{ scale: contentScale }],
              opacity: contentOpacity,
            },
          ]}
        >
          {result && (
            <>
              <Animated.View style={{ transform: [{ scale: cardScale }], opacity: cardOpacity }}>
                <ShareCard ref={cardRef} result={result} />
              </Animated.View>

              <PanelCard phase={phase} kind="card" style={styles.actionPanel}>
                {bonusEarned ? (
                  <Animated.Text
                    accessibilityLiveRegion="polite"
                    style={[
                      styles.bonusHint,
                      { color: t.amberText, opacity: earnedOpacity, transform: [{ scale: earnedScale }] },
                    ]}
                  >
                    Shared. +{DAILY_SHARE_BONUS_AMBER} amber
                  </Animated.Text>
                ) : bonusAvailable ? (
                  <Text style={[styles.bonusHint, { color: t.amberText }]}>
                    +{DAILY_SHARE_BONUS_AMBER} amber for your first share today
                  </Text>
                ) : null}
                <Text style={[styles.captureHint, { color: t.muted }]}>
                  {isImageShareAvailable()
                    ? 'Shares as an image.'
                    : 'Shares your result, or screenshot the card above.'}
                </Text>

                <View style={styles.buttons}>
                  <View style={styles.shareBtnWrap}>
                    <CandyButton
                      label="Share"
                      onPress={handleShare}
                      phase={phase}
                      variant="primary"
                      disabled={sharing}
                      style={styles.shareBtn}
                      accessibilityLabel="Share result"
                    />
                    {sharing && (
                      <View
                        style={[styles.spinnerOverlay, styles.captureFill, { backgroundColor: t.cardBg, borderColor: t.amberTintBorder }]}
                        pointerEvents="none"
                      >
                        <Animated.Text style={[styles.captureLabel, { color: t.amberText, opacity: capturePulse }]}>
                          capturing...
                        </Animated.Text>
                      </View>
                    )}
                  </View>
                  <CandyButton
                    label="Close"
                    onPress={handleClose}
                    phase={phase}
                    variant="quiet"
                    disabled={sharing}
                    style={styles.closeBtn}
                    accessibilityLabel="Close"
                  />
                </View>

                {challengeText != null && (
                  <CandyButton
                    label={getChallengeFriendLabel(phase)}
                    icon={require('../../../assets/ui/paper_plane.png')}
                    onPress={handleChallengeShare}
                    phase={phase}
                    variant="secondary"
                    disabled={sharing}
                    style={styles.challengeBtn}
                    accessibilityLabel="Challenge a friend with this puzzle"
                  />
                )}
              </PanelCard>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: { alignItems: 'center' },
  actionPanel: {
    width: 320,
    marginTop: 14,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: SURFACE.cardPadX,
    alignItems: 'center',
  },
  bonusHint: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: PIXEL_FONT_BOLD,
    marginBottom: 4,
  },
  captureHint: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: PIXEL_FONT_BOLD,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnWrap: {
    position: 'relative',
  },
  shareBtn: {
    minWidth: 130,
  },
  closeBtn: {
    minWidth: 90,
  },
  spinnerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Parchment status chip that masks the "Share" label while capturing.
  captureFill: {
    borderRadius: 14,
    borderWidth: 1.5,
  },
  captureLabel: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: 0.4,
  },
  challengeBtn: {
    alignSelf: 'stretch',
    marginTop: 12,
  },
});
