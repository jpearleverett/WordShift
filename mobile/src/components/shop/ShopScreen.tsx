import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { CandyColors, TILE_THEMES, CONFETTI_THEMES } from '../../theme/colors';
import { AmberInline } from '../AmberInline';
import { useScreenInsets } from '../../hooks/useScreenInsets';
import {
  getCosmeticsByCategory,
  ownsCosmetic,
  recordAmberCosmeticPurchase,
  equipCosmetic,
  unequipCosmetic,
  getEquipped,
  CosmeticItem,
  CosmeticCategory,
} from '../../services/cosmetics';
import { spendAmber } from '../../services/amberCurrency';
import {
  getShopTitle,
  getShopSubtitle,
  getShopThemeSectionLabel,
  getShopDefaultThemeName,
  getShopConfettiSectionLabel,
  getShopDefaultConfettiName,
  getShopPatronLockedLabel,
  getShopStoreBridgeText,
} from '../../services/phaseNarrative';
import { hapticLight, hapticMedium } from '../../services/haptics';
import { isPatronSync } from '../../services/entitlements';

interface ShopScreenProps {
  phase: number;
  amberBalance: number;
  onClose: () => void;
  onAmberChange?: (newBalance: number) => void;
  /** Open the Patron (cosmetic IAP) modal. */
  onOpenPatron?: () => void;
  /** Open the Store (amber packs). Renders a "Need more amber?" row when provided. */
  onOpenStore?: () => void;
}

const PREVIEW_LETTERS = ['A', 'B', 'C', 'D'];

/** A small row of tiles previewing a tile palette. */
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

const DEFAULT_CONFETTI = ['#FF6B9D', '#C44DFF', '#4DAFFF', '#FFD84D', '#4DE8C2', '#FF8C4D'];

/** A small scatter of dots previewing a confetti palette. */
const ConfettiPreview: React.FC<{ themeId: string | null }> = ({ themeId }) => {
  const palette = themeId && CONFETTI_THEMES[themeId] ? CONFETTI_THEMES[themeId] : DEFAULT_CONFETTI;
  return (
    <View style={styles.previewConfetti}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <View key={i} style={[styles.previewDot, { backgroundColor: palette[i % palette.length] }]} />
      ))}
    </View>
  );
};

export const ShopScreen: React.FC<ShopScreenProps> = ({
  phase,
  amberBalance,
  onClose,
  onAmberChange,
  onOpenPatron,
  onOpenStore,
}) => {
  const screenInsets = useScreenInsets();
  const isDark = phase >= 3;
  const bgColor = isDark ? '#0A0A14' : '#1A1030';
  const textColor = isDark ? 'rgba(200, 170, 190, 0.9)' : 'rgba(220, 200, 240, 0.92)';
  const headerColor = isDark ? '#B36A86' : CandyColors.white;
  const cardBg = isDark ? 'rgba(60, 20, 40, 0.32)' : 'rgba(100, 70, 150, 0.18)';
  const cardBorder = isDark ? 'rgba(120, 40, 60, 0.4)' : 'rgba(150, 120, 200, 0.3)';

  const [balance, setBalance] = useState(amberBalance);
  const [owned, setOwned] = useState<Record<string, boolean>>({});
  const [equipped, setEquipped] = useState<Partial<Record<CosmeticCategory, string>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const tileThemes = useMemo(() => getCosmeticsByCategory('tile_theme'), []);
  const confettiThemes = useMemo(() => getCosmeticsByCategory('confetti'), []);
  const allItems = useMemo(() => [...tileThemes, ...confettiThemes], [tileThemes, confettiThemes]);

  const refresh = useCallback(async () => {
    const ownedEntries = await Promise.all(
      allItems.map(async t => [t.id, await ownsCosmetic(t.id)] as const)
    );
    const [tile, confetti] = await Promise.all([
      getEquipped('tile_theme'),
      getEquipped('confetti'),
    ]);
    setOwned(Object.fromEntries(ownedEntries));
    setEquipped({ tile_theme: tile, confetti });
  }, [allItems]);

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

  const handleEquipDefault = useCallback(async (category: CosmeticCategory) => {
    if (busy) return;
    setBusy(`__default_${category}__`);
    try {
      await unequipCosmetic(category);
      hapticLight();
      await refresh();
    } finally {
      setBusy(null);
    }
  }, [busy, refresh]);

  const renderActionButton = (item: CosmeticItem) => {
    const isOwned = owned[item.id];
    const isEquipped = equipped[item.category] === item.id;
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
          <Text style={styles.actionBuyText}><AmberInline size={14} /> {cost}</Text>
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

  const renderSection = (
    category: CosmeticCategory,
    sectionLabel: string,
    defaultName: string,
    defaultDesc: string,
    items: CosmeticItem[],
    Preview: React.FC<{ themeId: string | null }>,
  ) => {
    const defaultEquipped = equipped[category] === undefined;
    return (
      <View key={category}>
        <Text style={[styles.sectionLabel, { color: textColor }]}>{sectionLabel}</Text>

        {/* Default (free) option */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Preview themeId={null} />
          <View style={styles.cardBody}>
            <Text style={[styles.cardName, { color: headerColor }]}>{defaultName}</Text>
            <Text style={[styles.cardDesc, { color: textColor }]}>{defaultDesc}</Text>
          </View>
          {defaultEquipped ? (
            <View style={[styles.actionBtn, styles.actionEquipped]}>
              <Text style={styles.actionEquippedText}>Equipped ✓</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionEquip]}
              onPress={() => handleEquipDefault(category)}
              disabled={busy != null}
              accessibilityRole="button"
              accessibilityLabel={`Equip ${defaultName}`}
            >
              <Text style={styles.actionEquipText}>Equip</Text>
            </TouchableOpacity>
          )}
        </View>

        {items.map(item => (
          <View
            key={item.id}
            style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
          >
            <Preview themeId={item.id} />
            <View style={styles.cardBody}>
              <Text style={[styles.cardName, { color: headerColor }]}>{item.name}</Text>
              <Text style={[styles.cardDesc, { color: textColor }]} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
            {renderActionButton(item)}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={[styles.header, { paddingTop: screenInsets.top + 12 }]}>
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
          <Text style={styles.amberPillText}><AmberInline size={14} /> {Math.max(0, balance)}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(48, screenInsets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={textColor} />
          </View>
        ) : (
          <>
            {onOpenPatron && !isPatronSync() && (
              <TouchableOpacity
                style={styles.patronBanner}
                onPress={() => { hapticLight(); onOpenPatron(); }}
                accessibilityLabel="Become a Patron"
                accessibilityRole="button"
              >
                <Text style={styles.patronBannerTitle}>{'✦'} Become a Patron</Text>
                <Text style={styles.patronBannerSub}>Support WordShift. A small amber bonus + an exclusive gold tile set</Text>
              </TouchableOpacity>
            )}
            {renderSection(
              'tile_theme',
              getShopThemeSectionLabel(phase),
              getShopDefaultThemeName(phase),
              'The original candy tiles.',
              tileThemes,
              ThemePreview,
            )}
            {renderSection(
              'confetti',
              getShopConfettiSectionLabel(phase),
              getShopDefaultConfettiName(phase),
              'The usual phase-aware celebration.',
              confettiThemes,
              ConfettiPreview,
            )}

            {onOpenStore && (
              <TouchableOpacity
                style={styles.storeBridge}
                onPress={() => { hapticLight(); onOpenStore(); }}
                accessibilityRole="button"
                accessibilityLabel="Open the Store for amber packs"
              >
                <Text style={styles.storeBridgeTitle}>{getShopStoreBridgeText(phase).title}</Text>
                <Text style={[styles.storeBridgeSub, { color: textColor }]}>
                  {getShopStoreBridgeText(phase).subtitle}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.footnote, { color: textColor }]}>
              Cosmetics are for expression only. They never change the puzzle, the
              story, or your progress.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    // paddingTop applied inline via useScreenInsets (safe-area aware)
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
  patronBanner: {
    backgroundColor: 'rgba(139, 105, 20, 0.18)',
    borderColor: 'rgba(255, 212, 121, 0.55)',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  patronBannerTitle: { color: '#FFD479', fontSize: 16, fontWeight: '900', marginBottom: 3 },
  patronBannerSub: { color: 'rgba(220, 200, 240, 0.85)', fontSize: 12.5, fontWeight: '600' },
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
  previewConfetti: {
    width: 96,
    height: 52,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  previewDot: { width: 12, height: 12, borderRadius: 3 },
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
  storeBridge: {
    backgroundColor: 'rgba(120, 100, 60, 0.14)',
    borderColor: 'rgba(255, 212, 121, 0.35)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    alignItems: 'center',
  },
  storeBridgeTitle: { color: '#FFD479', fontSize: 14.5, fontWeight: '800', marginBottom: 2 },
  storeBridgeSub: { fontSize: 12, fontWeight: '600' },
  footnote: {
    fontSize: 11.5,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
    opacity: 0.8,
  },
});
