/**
 * The Keeper's Edition music box: every authored bed, played on demand.
 *
 * Sold only after the ending (the utility menu shows the row from then on, and
 * the story_end moment offer opens it once). Not owned: the box describes
 * itself and sells the Keeper's Edition against the store's live price. Owned:
 * a list of twelve songs; tapping one crossfades to it, and closing the box
 * hands music back to the house (or stops it when background music is off in
 * Settings, since the box plays even then: the player asked for the song).
 * Expression only: nothing here touches progress.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useScreenInsets } from '../hooks/useScreenInsets';
import { useProductPrice } from '../hooks/useProductPrice';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../theme/fonts';
import { FONT_SIZE } from '../theme/typeScale';
import { getSurfaceTheme, SURFACE } from '../theme/surfaces';
import { PanelCard } from './ui/PanelCard';
import { PixelPlaque } from './ui/PixelPlaque';
import { CandyButton } from './ui/CandyButton';
import { CHROME_ICONS } from './ui/chromeIcons';
import { getStoreArt } from './monetization/storeArt';
import { getMusicBoxCopy, getStoreUnavailableMessage } from '../services/phaseNarrative';
import { MUSIC_BOX_TRACKS, playMusicBoxSong, stopMusicBoxSong, restoreHouseMusic } from '../services/musicBox';
import {
  KEEPERS_EDITION_INFO,
  isStoreUnavailableError,
  purchaseProduct,
  subscribeBillingChanges,
} from '../services/iap';
import { ENTITLEMENTS, hasEntitlementSync } from '../services/entitlements';
import { showGameAlert } from '../services/gameAlert';
import { logEvent } from '../services/eventLogger';
import { hapticMedium } from '../services/haptics';

interface MusicBoxModalProps {
  visible: boolean;
  phase: number;
  onClose: () => void;
}

export const MusicBoxModal: React.FC<MusicBoxModalProps> = ({ visible, phase, onClose }) => {
  const insets = useScreenInsets();
  const { height: windowHeight } = useWindowDimensions();
  const t = getSurfaceTheme(phase);
  const copy = getMusicBoxCopy();
  // Ownership is read on every render (a restore or a late entitlement load
  // must show the songs); billing changes only trigger that re-render.
  const [justBought, setJustBought] = useState(false);
  const [, setBillingTick] = useState(0);
  const owned = justBought || hasEntitlementSync(ENTITLEMENTS.KEEPERS_EDITION);
  const [playing, setPlaying] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const playedRef = useRef(false);
  const price = useProductPrice(KEEPERS_EDITION_INFO.productId, KEEPERS_EDITION_INFO.fallbackPrice, visible && !owned);

  useEffect(() => subscribeBillingChanges(() => setBillingTick(n => n + 1)), []);

  const handleClose = useCallback(() => {
    if (playedRef.current) {
      playedRef.current = false;
      setPlaying(null);
      // The house bed covers every host of this box (home and the pit).
      restoreHouseMusic(phase);
    }
    onClose();
  }, [onClose, phase]);

  const play = useCallback((track: string) => {
    playedRef.current = true;
    setPlaying(track);
    playMusicBoxSong(track);
  }, []);

  const stop = useCallback(() => {
    setPlaying(null);
    stopMusicBoxSong();
  }, []);

  const buy = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const productId = KEEPERS_EDITION_INFO.productId;
    logEvent({ type: 'purchase_initiated', data: { productId, kind: 'keepers_edition' } });
    try {
      const result = await purchaseProduct(productId);
      if (result.success) {
        hapticMedium();
        logEvent({ type: 'iap_purchase', data: { productId, kind: 'keepers_edition' } });
        setJustBought(true);
        return;
      }
      if (result.pending) {
        showGameAlert(copy.title, copy.pendingMessage);
        return;
      }
      if (result.cancelled) {
        logEvent({ type: 'purchase_cancelled', data: { productId, kind: 'keepers_edition' } });
        return;
      }
      logEvent({ type: 'purchase_failed', data: { productId, kind: 'keepers_edition', reason: result.error ?? 'unknown' } });
      showGameAlert('Not available right now', isStoreUnavailableError(result.error)
        ? getStoreUnavailableMessage(phase)
        : "We couldn't confirm this purchase. Check your store purchase history before trying again.");
    } catch {
      logEvent({ type: 'purchase_failed', data: { productId, kind: 'keepers_edition', reason: 'exception' } });
      showGameAlert('Not available right now', "We couldn't confirm this purchase. Check your store purchase history before trying again.");
    } finally {
      setBusy(false);
    }
  }, [busy, copy.title, copy.pendingMessage, phase]);

  const hostDark = phase >= 2;
  const maxHeight = Math.max(240, windowHeight - insets.top - insets.bottom - 24);
  const group = (tracks: readonly string[], label: string) => (
    <View key={label}>
      <Text style={[styles.groupLabel, { color: t.muted }]}>{label}</Text>
      {tracks.map(track => {
        const active = playing === track;
        const title = copy.trackTitles[track] ?? track;
        return (
          <TouchableOpacity
            key={track}
            onPress={() => play(track)}
            style={[styles.trackRow, { backgroundColor: t.sectionBg, borderColor: active ? t.amberTintBorder : t.sectionBorder }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={active ? `${title}, playing` : `Play ${title}`}
          >
            <Image source={active ? CHROME_ICONS.play : CHROME_ICONS.starBullet} style={styles.trackMark} />
            <Text style={[styles.trackTitle, { color: active ? t.amberText : t.body }]}>{title}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={[styles.overlay, { backgroundColor: t.overlay }]}>
        <PanelCard phase={phase} kind="panel" style={StyleSheet.flatten([styles.card, { maxHeight }])}>
          <PixelPlaque phase={phase} label="MUSIC BOX" style={styles.plaque} />
          <Image source={getStoreArt(KEEPERS_EDITION_INFO.productId)} style={styles.art} resizeMode="contain" accessible={false} />
          <Text style={[styles.title, { color: t.title }]}>{copy.title}</Text>
          {owned ? (
            <>
              <Text style={[styles.body, { color: t.body }]}>{copy.intro}</Text>
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {group(MUSIC_BOX_TRACKS.filter(track => track.startsWith('music_home_')), copy.houseLabel)}
                {group(MUSIC_BOX_TRACKS.filter(track => track.startsWith('music_puzzle_')), copy.boardLabel)}
              </ScrollView>
              {playing && (
                <CandyButton label={copy.stopLabel} variant="secondary" phase={phase} hostDark={hostDark}
                  onPress={stop} style={styles.button} soundKind="none" />
              )}
            </>
          ) : (
            <>
              <Text style={[styles.body, { color: t.body }]}>{copy.lockedBody}</Text>
              {price.available ? (
                <CandyButton
                  label={copy.buyLabel(price.label)}
                  variant="primary"
                  phase={phase}
                  hostDark={hostDark}
                  disabled={busy}
                  onPress={() => { buy().catch(() => {}); }}
                  style={styles.button}
                />
              ) : (
                <Text style={[styles.note, { color: t.muted }]}>{getStoreUnavailableMessage(phase)}</Text>
              )}
            </>
          )}
          <CandyButton label={copy.closeLabel} variant="quiet" phase={phase} hostDark={hostDark}
            onPress={handleClose} style={styles.button} />
        </PanelCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
  card: { width: '100%', maxWidth: 460, paddingTop: 18, paddingHorizontal: SURFACE.panelPadX, paddingBottom: 16 },
  plaque: { alignSelf: 'center', marginBottom: 8 },
  art: { width: 64, height: 64, alignSelf: 'center', marginBottom: 6 },
  title: { fontFamily: PIXEL_FONT_BOLD, fontSize: FONT_SIZE.headline, textAlign: 'center' },
  body: { fontFamily: BODY_FONT, fontSize: FONT_SIZE.body, textAlign: 'center', marginTop: 6, marginBottom: 10 },
  note: { fontFamily: BODY_FONT, fontSize: FONT_SIZE.small, textAlign: 'center', marginBottom: 8 },
  list: { flexGrow: 0, marginBottom: 8 },
  groupLabel: { fontFamily: PIXEL_FONT_BOLD, fontSize: FONT_SIZE.small, letterSpacing: 1.2, marginTop: 6, marginBottom: 6 },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: SURFACE.cardRadius,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    gap: 10,
  },
  trackMark: { width: 14, height: 14 },
  trackTitle: { flex: 1, fontFamily: BODY_FONT, fontSize: FONT_SIZE.body },
  button: { alignSelf: 'center', marginTop: 6 },
});
