/**
 * The ☰ utility menu is ONE component (components/ui/UtilityMenu), rendered by
 * both the home screen and the Offering Pit. The pit used to re-implement a
 * bespoke two-row sheet (Statistics + Settings) against a different skin, so
 * the same button opened two different menus. These are source-scan contracts
 * (like questPill.test.ts): they pin that neither host owns a menu body any
 * more, that both pass the same prop set, and that the row list lives in the
 * shared component so the two surfaces cannot drift apart again.
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string) =>
  fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

const menuSrc = read('src/components/ui/UtilityMenu.tsx');
const homeSrc = read('src/components/home/HomeScreen.tsx');
const pitSrc = read('src/components/OfferingPitScreen.tsx');

/** The props each host hands the shared menu (order-insensitive). */
function menuProps(hostSrc: string): string[] {
  const start = hostSrc.indexOf('<UtilityMenu');
  expect(start).toBeGreaterThanOrEqual(0);
  const end = hostSrc.indexOf('/>', start);
  expect(end).toBeGreaterThan(start);
  const block = hostSrc.slice(start, end);
  return Array.from(block.matchAll(/^\s*([a-zA-Z]+)=/gm), m => m[1]).sort();
}

describe('utility menu is shared, not duplicated', () => {
  it('both hosts render the shared UtilityMenu', () => {
    expect(homeSrc).toContain('<UtilityMenu');
    expect(pitSrc).toContain('<UtilityMenu');
    expect(homeSrc).toContain("from '../ui/UtilityMenu'");
    expect(pitSrc).toContain("from './ui/UtilityMenu'");
  });

  it('neither host keeps an inline menu body', () => {
    // The pit's bespoke sheet is gone (styles + its own row buttons).
    expect(pitSrc).not.toContain('styles.utilityButton');
    expect(pitSrc).not.toContain('styles.utilityModal');
    expect(pitSrc).not.toContain('styles.utilityTitle');
    // Home no longer owns the rows, the How-to-Play modal, or the altar.
    expect(homeSrc).not.toContain('setShowRulesModal');
    expect(homeSrc).not.toContain('showSacrificeModal');
    // Exactly one menu Modal exists, and it is in the shared component.
    expect(menuSrc).toContain('accessibilityLabel="Close utility menu"');
    expect(homeSrc).not.toContain('accessibilityLabel="Close utility menu"');
    expect(pitSrc).not.toContain('accessibilityLabel="Close utility menu"');
  });

  it('the pit keeps the styles its Tending modal still uses', () => {
    expect(pitSrc).toContain('styles.utilityOverlay');
    expect(pitSrc).toContain('utilityOverlay: {');
  });

  it('both hosts hand the menu the SAME prop set', () => {
    const expected = [
      'amber',
      'onAmberChange',
      'onClose',
      'onOpenSettings',
      'onOpenShop',
      'onOpenStats',
      'onOpenStore',
      'onStartNewCycle',
      'phase',
      'visible',
    ];
    expect(menuProps(homeSrc)).toEqual(expected);
    expect(menuProps(pitSrc)).toEqual(expected);
  });
});

describe('the shared menu owns the whole row set', () => {
  it('renders every row, in the shipped order', () => {
    const order = [
      '"Statistics"',
      'getShopTitle(phase)',
      '"Store"',
      '"How to Play"',
      '"Settings"',
      'isSacrificeAvailable(phase)',
      'getNewCycleTitle()',
    ];
    let cursor = -1;
    for (const token of order) {
      const at = menuSrc.indexOf(token, cursor + 1);
      expect([token, at > cursor]).toEqual([token, true]);
      cursor = at;
    }
  });

  it('every row leads somewhere: the two in-menu surfaces are hosted here', () => {
    // A row that opens nothing is the defect this refactor removes — How to
    // Play and The Offering are rendered by the menu itself, so they work on
    // every host without per-host wiring.
    expect(menuSrc).toContain('<RulesModal');
    expect(menuSrc).toContain('<SacrificeModal');
    expect(menuSrc).toContain('setShowRules(true)');
    expect(menuSrc).toContain('setShowSacrifice(true)');
  });

  it('derives its own skin so the hosts cannot theme it differently', () => {
    expect(menuSrc).toContain('const dtHostDark = phase >= 2;');
    expect(menuSrc).toContain('getPixelSkin(phase, dtHostDark)');
    // No hostDark/skin prop in the public surface.
    const propsBlock = menuSrc.slice(
      menuSrc.indexOf('interface UtilityMenuProps'),
      menuSrc.indexOf('}', menuSrc.indexOf('interface UtilityMenuProps'))
    );
    expect(propsBlock).not.toContain('hostDark');
    expect(propsBlock).not.toContain('skin');
  });

  it('never rounds the generated 9-slice frames with CSS', () => {
    expect(menuSrc).not.toContain('borderRadius');
    expect(read('src/components/ui/HubRow.tsx')).not.toContain('borderRadius');
  });
});
