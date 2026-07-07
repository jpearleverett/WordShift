import React, { useCallback, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Easing, ActivityIndicator } from 'react-native';
import { ShareCard } from './ShareCard';
import { ShareableResult, isDailyShareBonusAvailable, shareChallengeText, DAILY_SHARE_BONUS_AMBER } from '../../services/shareResults';
import { shareResultImage, isImageShareAvailable } from '../../services/shareImage';
import { getChallengeFriendLabel } from '../../services/phaseNarrative';
import { hapticLight } from '../../services/haptics';
import { SURFACE, getSurfaceTheme } from '../../theme/surfaces';
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

  const reducedMotion = getSettingsSync().reducedMotion;
  const backdropOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const contentScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.92)).current;
  const contentOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const closingRef = useRef(false);

  const visible = result != null;

  useEffect(() => {
    if (result) {
      isDailyShareBonusAvailable().then(setBonusAvailable).catch(() => {});
    }
  }, [result]);

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    if (reducedMotion) {
      backdropOpacity.setValue(1);
      contentScale.setValue(1);
      contentOpacity.setValue(1);
      return;
    }
    backdropOpacity.setValue(0);
    contentScale.setValue(0.92);
    contentOpacity.setValue(0);
    const anim = Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(contentScale, {
        toValue: 1,
        ...SURFACE.modalIn,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [visible, reducedMotion, backdropOpacity, contentScale, contentOpacity]);

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

  const handleShare = async () => {
    if (!result || sharing) return;
    hapticLight();
    setSharing(true);
    try {
      const ok = await shareResultImage(cardRef.current, result);
      if (ok) onShared?.();
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
      if (ok) onShared?.();
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
              <ShareCard ref={cardRef} result={result} />

              <PanelCard phase={phase} kind="panel" style={styles.actionPanel}>
                {bonusAvailable && (
                  <Text style={[styles.bonusHint, { color: t.amberText }]}>
                    +{DAILY_SHARE_BONUS_AMBER} amber for your first share today
                  </Text>
                )}
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
                      <View style={styles.spinnerOverlay} pointerEvents="none">
                        <ActivityIndicator color={t.primaryText} />
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
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bonusHint: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  captureHint: {
    fontSize: 12,
    fontWeight: '600',
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
  challengeBtn: {
    alignSelf: 'stretch',
    marginTop: 12,
  },
});
