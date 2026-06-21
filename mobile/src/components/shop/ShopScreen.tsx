import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { CandyColors, TILE_THEMES } from '../../theme/colors';
import {
  getCosmeticsByCategory,
  ownsCosmetic,
  recordAmberCosmeticPurchase,
  equipCosmetic,
  unequipCosmetic,
  getEquipped,
  CosmeticItem,
} from '../../services/cosmetics';
import { spendAmber } from '../../services/amberCurrency';
import {
  getShopTitle,
  getShopSubtitle,
  getShopThemeSectionLabel,
  getShopDefaultThemeName,
  getShopPatronLockedLabel,
} from '../../services/phaseNarrative';
import { hapticLight, hapticMedium } from '../../services/haptics';

interface ShopScreenProps {
  phase: number;
  amberBalance: number;
  onClose: () => void;
  onAmberChange?: (newBalance: number) => void;
}

const PREVIEW_LETTERS = ['A', 'B', 'C', 'D'];

/** A small row of tiles previewing a palette. */
const ThemePreview: React.FC<{ themeId: string | null }> = ({ themeId }) => {
  const palette = themeId && TILE_THEMES[themeId] ? TILE_THEMES[themeId] : CandyColors.tileColors;
  return (
    <View style={styles.previewRow}>
      {PREVIEW_LETTERS.map((ch, i) => {
        const c = palette[i % palette.length];
        return (
          <View
            key={ch}
            style={[styles.previewTile, { backgroundColor: c.bg, borderColor: c.border }]}
          >
            <Text style={styles.previewTileText}>{ch}</Text>
          </View>
        );
      })}
    </View>
  );
};

export const ShopScreen: React.FC<ShopScreenProps> = ({
  phase,
  amberBalance,
  onClose,
  onAmberChange,
}) => {
  const isDark = phase >= 3;
  const bgColor = isDark ? '#0A0A14' : '#1A1030';
  const textColor = isDark ? 'rgba(200, 170, 190, 0.9)' : 'rgba(220, 200, 240, 0.92)';
  const headerColor = isDark ? '#B36A86' : CandyColors.white;
  const cardBg = isDark ? 'rgba(60, 20, 40, 0.32)' : 'rgba(100, 70, 150, 0.18)';
  const cardBorder = isDark ? 'rgba(120, 40, 60, 0.4)' : 'rgba(150, 120, 200, 0.3)';

  const [balance, setBalance] = useState(amberBalance);
  const [owned, setOwned] = useState<Record<string, boolean>>({});
  const [equipped, setEquipped] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const themes = getCosmeticsByCategory('tile_theme');

  const refresh = useCallback(async () => {
    const ownedEntries = await Promise.all(
      themes.map(async t => [t.id, await ownsCosmetic(t.id)] as const)
    );
    const eq = await getEquipped('tile_theme');
    setOwned(Object.fromEntries(ownedEntries));
    setEquipped(eq);
  }, [themes]);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  useEffect(() => { setBalance(amberBalance); }, [amberBalance]);

  const handleBuy = useCallback(async (item: CosmeticItem) => {
    if (busy || item.acquisition.kind !== 'amber') return;
    const cost = item.acquisition.cost;
    if (balance < cost) return;
    setBusy(item.id);
    try {
      const spend = await spendAmber(cost, `cosmetic_${item.id}`);
      if (!spend.success) return;
      setBalance(spend.newBalance);
      onAmberChange?.(spend.newBalance);
      await recordAmberCosmeticPurchase(item.id);
      await equipCosmetic(item.id); // auto-equip on purchase
      hapticMedium();
      await refresh();
    } finally {
      setBusy(null);
    }
  }, [busy, balance, onAmberChange, refresh]);

  const handleEquip = useCallback(async (item: CosmeticItem) => {
    if (busy) return;
    setBusy(item.id);
    try {
      await equipCosmetic(item.id);
      hapticLight();
      await refresh();
    } finally {
      setBusy(null);
    }
  }, [busy, refresh]);

  const handleEquipDefault = useCallback(async () => {
    if (busy) return;
    setBusy('__default__');
    try {
      await unequipCosmetic('tile_theme');
      hapticLight();
      await refresh();
    } finally {
      setBusy(null);
    }
  }, [busy, refresh]);

  const renderActionButton = (item: CosmeticItem) => {
    const isOwned = owned[item.id];
    const isEquipped = equipped === item.id;
    if (isEquipped) {
      return (
        <View style={[styles.actionBtn, styles.actionEquipped]}>
          <Text style={styles.actionEquippedText}>Equipped ✓</Text>
        </View>
      );
    }
    if (isOwned) {
      return (
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionEquip]}
          onPress={() => handleEquip(item)}
          disabled={busy != null}
          accessibilityRole="button"
          accessibilityLabel={`Equip ${item.name}`}
        >
          <Text style={styles.actionEquipText}>Equip</Text>
        </TouchableOpacity>
      );
    }
    if (item.acquisition.kind === 'amber') {
      const cost = item.acquisition.cost;
      const affordable = balance >= cost;
      return (
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBuy, !affordable && styles.actionDisabled]}
          onPress={() => handleBuy(item)}
          disabled={!affordable || busy != null}
          accessibilityRole="button"
          accessibilityState={{ disabled: !affordable || busy != null }}
          accessibilityLabel={`Buy ${item.name} for ${cost} amber`}
        >
          <Text style={styles.actionBuyText}>{'💎'} {cost}</Text>
        </TouchableOpacity>
      );
    }
    // entitlement (e.g. Patron) — locked unless owned
    return (
      <View style={[styles.actionBtn, styles.actionLocked]}>
        <Text style={styles.actionLockedText}>{getShopPatronLockedLabel()}</Text>
      </View>
    );
  };

  const defaultEquipped = equipped === undefined;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onClose}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: headerColor }]}>{getShopTitle(phase)}</Text>
          <Text style={[styles.subtitle, { color: textColor }]} numberOfLines={2}>
            {getShopSubtitle(phase)}
          </Text>
        </View>
        <View style={styles.amberPill}>
          <Text style={styles.amberPillText}>{'💎'} {Math.max(0, balance)}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={textColor} />
          </View>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: textColor }]}>
              {getShopThemeSectionLabel(phase)}
            </Text>

            {/* Default (free) option */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <ThemePreview themeId={null} />
              <View style={styles.cardBody}>
                <Text style={[styles.cardName, { color: headerColor }]}>
                  {getShopDefaultThemeName(phase)}
                </Text>
                <Text style={[styles.cardDesc, { color: textColor }]}>
                  The original candy tiles.
                </Text>
              </View>
              {defaultEquipped ? (
                <View style={[styles.actionBtn, styles.actionEquipped]}>
                  <Text style={styles.actionEquippedText}>Equipped ✓</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionEquip]}
                  onPress={handleEquipDefault}
                  disabled={busy != null}
                  accessibilityRole="button"
                  accessibilityLabel="Equip default tiles"
                >
                  <Text style={styles.actionEquipText}>Equip</Text>
                </TouchableOpacity>
              )}
            </View>

            {themes.map(item => (
              <View
                key={item.id}
                style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
              >
                <ThemePreview themeId={item.id} />
                <View style={styles.cardBody}>
                  <Text style={[styles.cardName, { color: headerColor }]}>{item.name}</Text>
                  <Text style={[styles.cardDesc, { color: textColor }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
                {renderActionButton(item)}
              </View>
            ))}

            <Text style={[styles.footnote, { color: textColor }]}>
              Themes are for expression only — they never change the puzzle, the
              story, or your progress.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 56;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  backButton: { width: 72, paddingVertical: 8 },
  backButtonText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  subtitle: { fontSize: 12, fontWeight: '500', textAlign: 'center', marginTop: 2, paddingHorizontal: 4 },
  amberPill: {
    width: 72,
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  amberPillText: { color: '#FFD479', fontSize: 15, fontWeight: '900' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
  loading: { paddingTop: 80, alignItems: 'center' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  cardBody: { flex: 1, paddingHorizontal: 12 },
  cardName: { fontSize: 16, fontWeight: '800' },
  cardDesc: { fontSize: 12.5, fontWeight: '500', marginTop: 3, lineHeight: 17 },
  previewRow: { flexDirection: 'row', width: 96, flexWrap: 'wrap', gap: 4 },
  previewTile: {
    width: 22,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTileText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  actionBtn: {
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBuy: { backgroundColor: 'rgba(120, 80, 180, 0.7)', borderWidth: 1, borderColor: 'rgba(200,170,240,0.5)' },
  actionBuyText: { color: CandyColors.white, fontSize: 15, fontWeight: '900' },
  actionEquip: { backgroundColor: 'rgba(80, 160, 120, 0.55)', borderWidth: 1, borderColor: 'rgba(150,230,190,0.5)' },
  actionEquipText: { color: CandyColors.white, fontSize: 14, fontWeight: '800' },
  actionEquipped: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  actionEquippedText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '800' },
  actionLocked: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  actionLockedText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '700' },
  actionDisabled: { opacity: 0.45 },
  footnote: {
    fontSize: 11.5,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
    opacity: 0.8,
  },
});
