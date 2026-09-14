/**
 * Home-surface launch-readiness pins (accessibility-devices-2/6, ftue-6,
 * performance-size-7, boot-persistence-5, product-retention-3).
 *
 * These surfaces have no renderer in this environment, so each fix is pinned
 * at the line that was wrong, the way homeSurfaceFixes.test.ts does. The
 * count-up leaf is small enough to execute against a synchronous hook mock.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const HOME = read('components/home/HomeScreen.tsx');
const MENU = read('components/ui/UtilityMenu.tsx');
const SETTINGS = read('components/SettingsScreen.tsx');
const COUNT_UP = read('components/home/AmberCountUpText.tsx');

describe('bottom sheets clear the system navigation bar (edge-to-edge Modals)', () => {
  test('the dialogue sheet pads its text column by the larger of its authored room and the inset', () => {
    expect(HOME).toContain('const dialogueSheetBottomPad = Math.max(34, screenInsets.bottom + 12);');
    // Both dialogue sheets (the resident card and the intro/override card).
    const uses = HOME.match(/styles\.dialogueTextCol, \{ paddingBottom: dialogueSheetBottomPad \}/g) ?? [];
    expect(uses).toHaveLength(2);
    expect(HOME).not.toContain('<View style={styles.dialogueTextCol}>');
  });

  test('the journal hub, the unlock/quest sheets and the locked-room card pad the same way', () => {
    expect(HOME).toContain('const hubSheetBottomPad = Math.max(32, screenInsets.bottom + 12);');
    expect(HOME).toContain('const shopSheetBottomPad = Math.max(40, screenInsets.bottom + 12);');
    expect(HOME).toContain('paddingBottom: hubSheetBottomPad');
    const shopUses = HOME.match(/paddingBottom: shopSheetBottomPad/g) ?? [];
    expect(shopUses).toHaveLength(3);
    expect(HOME).not.toContain('style={styles.shopModal}\n');
  });

  test('the shared utility menu reads the safe-area inset itself', () => {
    expect(MENU).toContain("import { useScreenInsets } from '../../hooks/useScreenInsets';");
    expect(MENU).toContain('const sheetBottomPad = Math.max(32, screenInsets.bottom + 12);');
    expect(MENU).toContain('style={[styles.compactHubModal, { paddingBottom: sheetBottomPad }]}');
  });
});

describe('the header streak badge yields to the amber balance on narrow phones', () => {
  test('below 340dp the count text is dropped and the flame carries the badge', () => {
    expect(HOME).toContain('const streakIconOnly = screenWidth < 340;');
    expect(HOME).toMatch(/\{!streakIconOnly && \(\s*<Text style=\{\[styles\.streakBadgeCount/);
    // The number still reaches assistive tech through the badge label.
    expect(HOME).toContain('accessibilityLabel={`${progress.currentStreak} day streak');
  });
});

describe('the amber count-up no longer re-renders the home screen per frame', () => {
  test('HomeScreen holds no per-frame display state and renders the memoized leaf', () => {
    expect(HOME).not.toContain('setDisplayAmber');
    expect(HOME).not.toContain('amberCountRafRef');
    expect(HOME).toContain('<AmberCountUpText value={progress.amber} phase={progress.currentPhase} style={styles.amberCount} />');
    // The gem pop stays on the native driver in HomeScreen.
    expect(HOME).toContain('Animated.timing(amberPulse, { toValue: peak, duration: 150, useNativeDriver: true })');
  });

  test('the leaf is memoized and owns the requestAnimationFrame tick', () => {
    expect(COUNT_UP).toMatch(/React\.FC<AmberCountUpTextProps> = memo\(/);
    expect(COUNT_UP).toContain('requestAnimationFrame(tick)');
    expect(COUNT_UP).toContain('cancelAnimationFrame(rafRef.current)');
  });
});

describe('the reveal tap-to-skip pointer renders under the first reveal', () => {
  test('the resident dialogue bubble is followed by the hook-owned hint', () => {
    expect(HOME).toContain('{dialogueFlow.revealSkipHint ? (');
    expect(HOME).toMatch(/styles\.dialogueRevealSkipHint, \{ color: panelSt\.muted \}\]\} accessibilityLiveRegion="polite"/);
  });
});

describe('Reset All tells the truth about the linked cloud backup', () => {
  test('the confirmation names the cloud overwrite, not only this device', () => {
    const at = SETTINGS.indexOf("'Reset All Progress'");
    const prompt = SETTINGS.slice(at, at + 900);
    expect(prompt).toContain('replaces the cloud backup linked to your recovery code');
    expect(prompt).toContain('another device using that code');
    expect(prompt).not.toMatch(/[—–]/);
  });
});

describe('the locked-room card points at the House Upgrades once Phase 2 opens', () => {
  const card = HOME.slice(HOME.indexOf('{/* Room Unlock Modal */}'), HOME.indexOf('{/* Animal Invite Prompt */}'));

  test('the pointer row rides areUpgradesAvailable and opens the Shop', () => {
    expect(card).toContain('areUpgradesAvailable(progress.currentPhase) && onOpenShop && (');
    expect(card).toContain('accessibilityLabel="Open the Shop for house upgrades"');
    expect(card).toContain('{getHouseUpgradesPointerLabel(progress.currentPhase)}');
    // It closes the card before navigating, like the Unlock Progress pointer.
    expect(card).toMatch(/unlockFlow\.setShowRoomUnlock\(null\);\s*onOpenShop\(\);/);
  });

  test('both pointers share the phase-aware label from phaseNarrative', () => {
    const uses = HOME.match(/getHouseUpgradesPointerLabel\(progress\.currentPhase\)/g) ?? [];
    expect(uses).toHaveLength(2);
    expect(HOME).not.toContain('Room Upgrades: in the Shop\n');
  });
});
