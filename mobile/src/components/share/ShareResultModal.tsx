import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { ShareCard } from './ShareCard';
import { ShareableResult, isDailyShareBonusAvailable, DAILY_SHARE_BONUS_AMBER } from '../../services/shareResults';
import { shareResultImage, isImageShareAvailable } from '../../services/shareImage';
import { hapticLight } from '../../services/haptics';

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

  useEffect(() => {
    if (result) {
      isDailyShareBonusAvailable().then(setBonusAvailable).catch(() => {});
    }
  }, [result]);

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
      const outcome = await Share.share({ message: challengeText });
      if (outcome.action === Share.sharedAction) onShared?.();
    } catch {
      // Player dismissed the sheet or the OS rejected it — nothing to do.
    } finally {
      setSharing(false);
    }
  };

  const phase = result?.phase ?? 0;
  const isDark = phase >= 3;

  return (
    <Modal
      visible={result != null}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {result && (
            <>
              <ShareCard ref={cardRef} result={result} />

              {bonusAvailable && (
                <Text style={styles.bonusHint}>
                  +{DAILY_SHARE_BONUS_AMBER} amber for your first share today
                </Text>
              )}
              <Text style={styles.captureHint}>
                {isImageShareAvailable()
                  ? 'Shares as an image.'
                  : 'Shares your result — or screenshot the card above.'}
              </Text>

              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.btn, styles.shareBtn, isDark && styles.shareBtnDark]}
                  onPress={handleShare}
                  disabled={sharing}
                  accessibilityRole="button"
                  accessibilityLabel="Share result"
                >
                  {sharing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.shareBtnText}>Share</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.closeBtn]}
                  onPress={onClose}
                  disabled={sharing}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </View>

              {challengeText != null && (
                <TouchableOpacity
                  style={[styles.challengeBtn, isDark && styles.challengeBtnDark]}
                  onPress={handleChallengeShare}
                  disabled={sharing}
                  accessibilityRole="button"
                  accessibilityLabel="Challenge a friend with this puzzle"
                >
                  <Text style={styles.challengeBtnText}>⚔️ Challenge a friend</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 4, 14, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: { alignItems: 'center' },
  bonusHint: {
    color: '#FFD479',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 16,
  },
  captureHint: {
    color: 'rgba(225,215,240,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 18 },
  btn: {
    minWidth: 120,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    backgroundColor: '#7E57C2',
    borderWidth: 1,
    borderColor: 'rgba(200,170,240,0.5)',
  },
  shareBtnDark: { backgroundColor: '#7A2A48', borderColor: 'rgba(200,120,150,0.5)' },
  shareBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  closeBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  closeBtnText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '700' },
  challengeBtn: {
    marginTop: 12,
    minWidth: 252,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(200,170,240,0.45)',
  },
  challengeBtnDark: { borderColor: 'rgba(200,120,150,0.45)' },
  challengeBtnText: { color: 'rgba(235,225,250,0.95)', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
});
