/**
 * Season Pass modal — the monthly cosmetic reward track (seasonPass.ts). A free
 * track earned by playing and a premium track unlocked by an active Supporter
 * subscription OR by spending amber (the durable recurring sink). Rewards are
 * amber (reward-only, never phase progress) + an exclusive premium cosmetic.
 *
 * Cottage-skin chrome (PanelCard / CandyButton / getSurfaceTheme), phase-aware,
 * reduced-motion aware. All narrative copy comes from phaseNarrative; the
 * spend/claim logic lives in seasonPass.ts (this file only orchestrates + renders).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../theme/fonts';
import { getSurfaceTheme, SURFACE } from '../theme/surfaces';
import { PanelCard } from './ui/PanelCard';
import { CandyButton } from './ui/CandyButton';
import { PixelPlaque } from './ui/PixelPlaque';
import { hapticLight, hapticMedium } from '../services/haptics';
import { showGameAlert } from '../services/gameAlert';
import { spendAmber } from '../services/amberCurrency';
import { getSeasonPassCopy } from '../services/phaseNarrative';
import { DialoguePhase } from '../types/homeWorld';
import {
  getSeasonPassView,
  claimSeasonTier,
  markSeasonPremiumUnlocked,
  getSeasonPremiumAmberCost,
  SeasonPassView,
} from '../services/seasonPass';
import { logEvent } from '../services/eventLogger';

interface SeasonPassModalProps {
  visible: boolean;
  onClose: () => void;
  phase: number;
  puzzlesSolved: number;
  currentAmber: number;
  onAmberChange: (newBalance: number) => void;
  /** Opens the Store so a non-subscriber can become a Supporter (premium free). */
  onSubscribe?: () => void;
}

export const SeasonPassModal: React.FC<SeasonPassModalProps> = ({
  visible,
  onClose,
  phase,
  puzzlesSolved,
  currentAmber,
  onAmberChange,
  onSubscribe,
}) => {
  const t = getSurfaceTheme(phase);
  const copy = getSeasonPassCopy(phase as DialoguePhase);
  const [view, setView] = useState<SeasonPassView | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setView(await getSeasonPassView(puzzlesSolved));
    } catch {
      /* leave the last view up */
    }
  }, [puzzlesSolved]);

  useEffect(() => {
    if (visible) refresh().catch(() => {});
  }, [visible, refresh]);

  const claim = useCallback(
    async (tier: number, track: 'free' | 'premium') => {
      if (busy) return;
      setBusy(true);
      try {
        const r = await claimSeasonTier(tier, track, puzzlesSolved);
        if (r.granted) {
          hapticMedium();
          if (typeof r.newBalance === 'number') onAmberChange(r.newBalance);
          logEvent({ type: 'season_reward_claimed', data: { tier, track, amber: r.amber, cosmetic: r.cosmeticGranted } });
          await refresh();
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, puzzlesSolved, onAmberChange, refresh],
  );

  const claimAll = useCallback(async () => {
    if (busy || !view) return;
    setBusy(true);
    try {
      let last = -1;
      for (const tr of view.tiers) {
        if (tr.freeClaimable) {
          const r = await claimSeasonTier(tr.tier, 'free', puzzlesSolved);
          if (r.granted && typeof r.newBalance === 'number') last = r.newBalance;
        }
        if (tr.premiumClaimable) {
          const r = await claimSeasonTier(tr.tier, 'premium', puzzlesSolved);
          if (r.granted && typeof r.newBalance === 'number') last = r.newBalance;
        }
      }
      if (last >= 0) {
        hapticMedium();
        onAmberChange(last);
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [busy, view, puzzlesSolved, onAmberChange, refresh]);

  const unlockPremiumWithAmber = useCallback(async () => {
    if (busy) return;
    const cost = getSeasonPremiumAmberCost();
    if (currentAmber < cost) {
      showGameAlert('Not enough amber', `The premium track opens for ${cost} amber. Keep offering, or become a Supporter to have it free every season.`);
      return;
    }
    setBusy(true);
    try {
      const spend = await spendAmber(cost, 'season_pass');
      if (!spend.success) {
        showGameAlert('Not enough amber', spend.error ?? 'Try again in a moment.');
        return;
      }
      await markSeasonPremiumUnlocked(puzzlesSolved);
      hapticMedium();
      onAmberChange(spend.newBalance);
      logEvent({ type: 'iap_purchase', data: { productId: 'season_premium_amber', kind: 'season', amber: cost } });
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [busy, currentAmber, puzzlesSolved, onAmberChange, refresh]);

  const hostDark = phase >= 2;
  const cost = getSeasonPremiumAmberCost();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: t.overlay }]}>
        <PanelCard phase={phase} kind="panel" style={styles.card}>
          <PixelPlaque phase={phase} label={'SEASON PASS'} style={styles.plaque} />
          <Text style={[styles.title, { color: t.title }]}>{copy.title}</Text>
          <Text style={[styles.tagline, { color: t.body }]}>{copy.tagline}</Text>

          {view && (
            <>
              <Text style={[styles.progress, { color: t.amberText }]}>
                Tier {view.tiersUnlocked} of {view.totalTiers}
                {view.tiersUnlocked < view.totalTiers
                  ? ` · ${view.puzzlesToNextTier} more puzzle${view.puzzlesToNextTier === 1 ? '' : 's'} to the next`
                  : ' · complete'}
              </Text>

              {!view.premiumUnlocked && (
                <PanelCard phase={phase} kind="card" style={styles.premiumBox}>
                  <Text style={[styles.premiumLocked, { color: t.body }]}>{copy.lockedLine}</Text>
                  <CandyButton
                    label={`Unlock premium · ${cost} amber`}
                    variant="amber"
                    phase={phase}
                    hostDark={hostDark}
                    disabled={busy}
                    onPress={() => { hapticLight(); unlockPremiumWithAmber().catch(() => {}); }}
                    style={styles.premiumBtn}
                  />
                  {onSubscribe && (
                    <TouchableOpacity
                      onPress={() => { hapticLight(); onSubscribe(); }}
                      accessibilityRole="button"
                      accessibilityLabel="Become a Supporter for the premium track"
                    >
                      <Text style={[styles.subscribeLink, { color: t.muted }]}>
                        Supporters get it free every season. <Text style={{ color: t.title, fontWeight: '800' }}>Become a Supporter →</Text>
                      </Text>
                    </TouchableOpacity>
                  )}
                </PanelCard>
              )}
              {view.premiumUnlocked && (
                <Text style={[styles.premiumActive, { color: t.amberText }]}>
                  Premium unlocked{view.premiumViaSupporter ? ' (Supporter)' : ''} ✦
                </Text>
              )}

              <ScrollView style={styles.track} showsVerticalScrollIndicator={false}>
                {view.tiers.map((tr) => (
                  <View
                    key={tr.tier}
                    style={[
                      styles.tierRow,
                      { backgroundColor: t.sectionBg, borderColor: t.sectionBorder, opacity: tr.unlocked ? 1 : 0.55 },
                    ]}
                  >
                    <View style={[styles.tierBadge, { backgroundColor: t.amberTint, borderColor: t.amberTintBorder }]}>
                      <Text style={[styles.tierNum, { color: t.amberText }]}>{tr.tier}</Text>
                    </View>
                    <View style={styles.tierRewards}>
                      <Text style={[styles.tierReward, { color: t.body }]}>
                        Free: +{tr.freeAmber} amber
                        {tr.freeClaimed ? ' ✓' : ''}
                      </Text>
                      <Text style={[styles.tierReward, { color: view.premiumUnlocked ? t.title : t.muted }]}>
                        Premium: +{tr.premiumAmber} amber{tr.premiumCosmetic ? ' + confetti' : ''}
                        {tr.premiumClaimed ? ' ✓' : ''}
                      </Text>
                    </View>
                    <View style={styles.tierActions}>
                      {tr.freeClaimable && (
                        <CandyButton
                          label="Claim"
                          variant="primary"
                          size="md"
                          phase={phase}
                          hostDark={hostDark}
                          disabled={busy}
                          onPress={() => { hapticLight(); claim(tr.tier, 'free').catch(() => {}); }}
                          style={styles.claimBtn}
                        />
                      )}
                      {tr.premiumClaimable && (
                        <CandyButton
                          label="Claim +"
                          variant="amber"
                          size="md"
                          phase={phase}
                          hostDark={hostDark}
                          disabled={busy}
                          onPress={() => { hapticLight(); claim(tr.tier, 'premium').catch(() => {}); }}
                          style={styles.claimBtn}
                        />
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>

              {view.claimableCount > 0 && (
                <CandyButton
                  label={`Claim all (${view.claimableCount})`}
                  variant="primary"
                  phase={phase}
                  hostDark={hostDark}
                  disabled={busy}
                  onPress={() => { hapticLight(); claimAll().catch(() => {}); }}
                  style={styles.claimAllBtn}
                />
              )}
            </>
          )}

          <CandyButton
            label="Close"
            variant="quiet"
            phase={phase}
            hostDark={hostDark}
            onPress={() => { hapticLight(); onClose(); }}
            style={styles.closeBtn}
          />
        </PanelCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
  card: { width: '100%', maxWidth: 460, maxHeight: '90%', paddingTop: 18, paddingHorizontal: 18, paddingBottom: 16 },
  plaque: { alignSelf: 'center', marginBottom: 8 },
  title: { fontFamily: PIXEL_FONT_BOLD, fontSize: 22, textAlign: 'center' },
  tagline: { fontFamily: BODY_FONT, fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 10 },
  progress: { fontFamily: PIXEL_FONT_BOLD, fontSize: 13, textAlign: 'center', marginBottom: 10 },
  premiumBox: { padding: 14, marginBottom: 10 },
  premiumLocked: { fontFamily: BODY_FONT, fontSize: 13.5, textAlign: 'center', marginBottom: 10 },
  premiumBtn: { alignSelf: 'center' },
  subscribeLink: { fontFamily: BODY_FONT, fontSize: 12.5, textAlign: 'center', marginTop: 10 },
  premiumActive: { fontFamily: PIXEL_FONT_BOLD, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  track: { flexGrow: 0, marginBottom: 8 },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: SURFACE.cardRadius,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  tierBadge: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tierNum: { fontFamily: PIXEL_FONT_BOLD, fontSize: 15 },
  tierRewards: { flex: 1 },
  tierReward: { fontFamily: BODY_FONT, fontSize: 12.5, lineHeight: 18 },
  tierActions: { flexDirection: 'row', gap: 6 },
  claimBtn: {},
  claimAllBtn: { alignSelf: 'center', marginTop: 2, marginBottom: 6 },
  closeBtn: { alignSelf: 'center', marginTop: 4 },
});

export default SeasonPassModal;
