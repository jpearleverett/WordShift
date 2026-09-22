import React, { type ReactElement } from 'react';

// Keep state and refs across deliberate rerenders, while leaving native views
// inert. Calling the original callbacks twice before a render exercises the
// same-frame race that disabled state alone cannot protect.
let mockSlots: any[] = [];
let mockCursor = 0;
jest.mock('../hooks/useScreenInsets', () => ({ useScreenInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }) }));
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: jest.fn(),
  useCallback: (callback: unknown) => callback,
  useState: (initial: unknown) => {
    const slot = mockCursor++;
    if (!(slot in mockSlots)) mockSlots[slot] = typeof initial === 'function' ? initial() : initial;
    return [mockSlots[slot], (next: any) => {
      mockSlots[slot] = typeof next === 'function' ? next(mockSlots[slot]) : next;
    }];
  },
  useRef: (initial: unknown) => {
    const slot = mockCursor++;
    if (!(slot in mockSlots)) mockSlots[slot] = { current: initial };
    return mockSlots[slot];
  },
}));
jest.mock('react-native', () => ({
  useWindowDimensions: () => ({ width: 390, height: 844 }), View: 'View', Text: 'Text', Image: 'Image', TouchableOpacity: 'TouchableOpacity',
  Modal: 'Modal', ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator',
  Animated: { View: 'AnimatedView', Value: class { setValue() {} } },
  StyleSheet: { create: (styles: unknown) => styles },
  Platform: { OS: 'android', select: (spec: Record<string, unknown>) => spec.android ?? spec.default },
  Linking: { openURL: jest.fn(async () => undefined) },
}));
jest.mock('../components/ui/NineSlice', () => ({ NineSliceFrame: 'NineSliceFrame' }));
jest.mock('../components/ui/CandyButton', () => ({ CandyButton: 'CandyButton' }));
jest.mock('../components/ui/PanelCard', () => ({ PanelCard: 'PanelCard' }));
jest.mock('../components/AmberInline', () => ({ AmberInline: 'AmberInline', AmberValue: 'AmberValue' }));
jest.mock('../components/home/AmberSparkle', () => ({ AmberSparkle: 'AmberSparkle' }));
jest.mock('../components/monetization/SupportComparison', () => ({ SupportComparison: 'SupportComparison' }));
jest.mock('../components/monetization/RewardedAdButton', () => ({ RewardedAdButton: 'RewardedAdButton' }));
jest.mock('../components/monetization/GiftOverlay', () => ({ GiftOverlay: 'GiftOverlay' }));
jest.mock('../components/ui/RewardReveal', () => ({ RewardReveal: 'RewardReveal' }));
jest.mock('../components/monetization/storeArt', () => ({ getStoreArt: () => 1, STORE_ART_KEYS: { dailyAmber: 'daily' } }));
jest.mock('../hooks/useCountUp', () => ({ useCountUp: (value: number) => ({ value, running: false }) }));
jest.mock('../services/settings', () => ({ getSettingsSync: () => ({ reducedMotion: true }) }));
jest.mock('../services/a11yAnnounce', () => ({ announceForA11y: jest.fn() }));
jest.mock('../services/haptics', () => ({ hapticLight: jest.fn(), hapticMedium: jest.fn() }));
jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn() }));
jest.mock('../services/ads', () => ({ isAdsReady: () => true, isRewardedCapReached: jest.fn(async () => false), retryAdConsentIfUnready: jest.fn(async () => undefined), subscribeAdsReady: () => () => {} }));
jest.mock('../services/dailyAmberReward', () => ({
  claimDailyAmberReward: jest.fn(), createDailyAmberClaimId: jest.fn(() => 'claim-one'),
  getDailyAmberStatus: jest.fn(),
}));
jest.mock('../services/saveRetry', () => ({ saveWithPlayerRetry: jest.fn((save: () => Promise<unknown>) => save()) }));
jest.mock('../services/entitlements', () => ({
  ENTITLEMENTS: { PATRON: 'patron', ADFREE: 'adfree', COSMETIC_BUNDLE: 'bundle', STARTER_PACK: 'starter', SUPPORTER: 'supporter' },
  hasEntitlementSync: jest.fn(() => false), hasMadeAmberPurchaseSync: jest.fn(() => true),
  isPatronSync: jest.fn(() => false), isAdFreeSync: jest.fn(() => false),
}));
jest.mock('../services/iap', () => ({
  PRODUCT_IDS: { PATRON_KEY: 'patron', REMOVE_ADS: 'ads', COSMETIC_BUNDLE: 'bundle',
    SUPPORTER_SUB: 'supporter', STARTER_PACK: 'starter', AMBER_SMALL: 'amber',
    AMBER_MEDIUM: 'amber-medium', AMBER_LARGE: 'amber-large', HINTS_SMALL: 'hints', HINTS_LARGE: 'hints-large' },
  CONSUMABLE_PRODUCTS: [
    { productId: 'amber', reward: { kind: 'amber', amount: 100 }, name: 'Amber', description: 'Amber pack', fallbackPrice: '$1' },
    { productId: 'hints', reward: { kind: 'hints', amount: 5 }, name: 'Hints', description: 'Hint pack', fallbackPrice: '$1' },
  ],
  STARTER_PACK_INFO: { productId: 'starter', name: 'Welcome', description: 'Starter pack', fallbackPrice: '$2' },
  getProducts: jest.fn(async () => []), isBillingReady: () => true,
  isStoreUnavailableError: (error: string | undefined) => ['billing_unavailable', 'product_not_found', 'purchase_in_progress'].includes(error ?? ''),
  getSubscriptionManagementUrl: jest.fn(async (fallback: string) => fallback),
  purchaseConsumable: jest.fn(), purchaseStarterPack: jest.fn(), purchaseProduct: jest.fn(),
  settleConsumableGrant: jest.fn(), restorePurchases: jest.fn(),
  subscribeBillingChanges: jest.fn(() => () => {}),
}));

import { StoreModal } from '../components/monetization/StoreModal';
import { PatronModal } from '../components/monetization/PatronModal';
import { purchaseConsumable, purchaseProduct, purchaseStarterPack, settleConsumableGrant, restorePurchases, subscribeBillingChanges, getProducts } from '../services/iap';
import { isAdFreeSync, isPatronSync, hasEntitlementSync } from '../services/entitlements';
import { claimDailyAmberReward, createDailyAmberClaimId, getDailyAmberStatus } from '../services/dailyAmberReward';
import { saveWithPlayerRetry } from '../services/saveRetry';

interface ControlProps { [key: string]: any }
type Element = ReactElement<ControlProps>;
function flatten(node: React.ReactNode): Element[] {
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  if (typeof element.type === 'function') {
    return flatten((element.type as (props: ControlProps) => React.ReactNode)(element.props));
  }
  return [element, ...React.Children.toArray(element.props.children).flatMap(flatten)];
}
function deferred<T = any>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

function store(overrides: Partial<React.ComponentProps<typeof StoreModal>> = {}) {
  const props = { visible: true, phase: 2, amberBalance: 200, hintBalance: 2,
    onClose: jest.fn(), onOpenPatron: jest.fn(), onAmberChange: jest.fn(), onHintsChange: jest.fn(), ...overrides };
  const render = (next = {}) => { mockCursor = 0; return flatten(StoreModal({ ...props, ...next }) as React.ReactNode); };
  return { props, render };
}
function patron() {
  const props = { visible: true, phase: 2, onClose: jest.fn(), onPatronChange: jest.fn() };
  const render = (next = {}) => { mockCursor = 0; return flatten(PatronModal({ ...props, ...next }) as React.ReactNode); };
  return { props, render };
}
function control(tree: Element[], label: string): ControlProps {
  const found = tree.find(node => node.props.accessibilityLabel === label);
  if (!found) throw new Error(`Missing control: ${label}`);
  return found.props;
}
function modal(tree: Element[]): ControlProps { return tree.find(node => node.type === 'Modal')!.props; }
function text(tree: Element[]): string { return tree.filter(node => node.type === 'Text').map(node => node.props.children).flat().join(' '); }
function mountEffects(): () => void {
  const cleanups = jest.mocked(React.useEffect).mock.calls.map(([effect]) => effect());
  return () => { cleanups.forEach(cleanup => cleanup?.()); };
}
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
/** Open the store the way a device does: first paint, effects, then the price
 * fetch settles. Buy controls exist only once the store's own price for that
 * SKU has arrived; before that they are disabled placeholders. */
async function openStore(ui: ReturnType<typeof store>): Promise<Element[]> {
  ui.render(); mountEffects(); await flush(); return ui.render();
}
function billingChange() {
  const calls = jest.mocked(subscribeBillingChanges).mock.calls;
  return calls[calls.length - 1][0];
}
function seedDailyStatus() {
  // This is the one async-open value: populate the initially null daily status
  // through its real state slot, without depending on the component's hook order.
  const slot = mockSlots.findIndex(value => value === null);
  // Store has successMsg followed by amberFaucet, both null on first render.
  mockSlots[slot + 1] = { available: true, remaining: 2, claimsToday: 0 };
}

beforeEach(() => {
  mockSlots = []; mockCursor = 0;
  jest.clearAllMocks();
  jest.mocked(isPatronSync).mockReturnValue(false);
  jest.mocked(isAdFreeSync).mockReturnValue(false);
  jest.mocked(hasEntitlementSync).mockReturnValue(false);
  jest.mocked(getDailyAmberStatus).mockResolvedValue({ available: true, remaining: 2, claimedToday: 0, dateKey: 'today' } as any);
  jest.mocked(getProducts).mockResolvedValue([
    { productId: 'amber', priceString: '$1' }, { productId: 'hints', priceString: '$1' },
    { productId: 'starter', priceString: '$2' }, { productId: 'bundle', priceString: '$3' },
    { productId: 'supporter', priceString: '$4' },
  ] as any);
  jest.mocked(purchaseConsumable).mockResolvedValue({ success: false, productId: 'amber', cancelled: true });
  jest.mocked(purchaseStarterPack).mockResolvedValue({ success: false, productId: 'starter', cancelled: true });
  jest.mocked(purchaseProduct).mockResolvedValue({ success: false, productId: 'patron', cancelled: true });
  jest.mocked(restorePurchases).mockResolvedValue({ entitlements: [] });
  jest.mocked(settleConsumableGrant).mockResolvedValue({ amberBalance: 300, hintBalance: 7, applied: true });
});

describe('store purchase controls', () => {
  it('blocks duplicate and cross-product taps, Close, Android Back and Patron navigation until credit is durable', async () => {
    const payment = deferred(); const credit = deferred();
    jest.mocked(purchaseConsumable).mockReturnValue(payment.promise);
    jest.mocked(settleConsumableGrant).mockReturnValue(credit.promise);
    const ui = store(); const initial = await openStore(ui);
    const buy = control(initial, 'Buy Amber, 100 amber, for $1');
    const completed = buy.onPress();
    buy.onPress();
    control(initial, 'Buy Hints, 5 hints, for $1').onPress();
    control(initial, 'Buy Welcome for $2').onPress();
    control(initial, "Buy The Keeper's Collection for $3").onPress();
    control(initial, 'Close store').onPress();
    modal(initial).onRequestClose();
    control(initial, 'Learn about Patron').onPress();
    expect(purchaseConsumable).toHaveBeenCalledTimes(1);
    expect(purchaseProduct).not.toHaveBeenCalled();
    expect(purchaseStarterPack).not.toHaveBeenCalled();
    expect(ui.props.onClose).not.toHaveBeenCalled();
    expect(ui.props.onOpenPatron).not.toHaveBeenCalled();
    expect(control(ui.render(), 'Close store').disabled).toBe(true);

    payment.resolve({ success: true, productId: 'amber', reward: { kind: 'amber', amount: 100 }, grantId: 'paid-one' });
    await settle();
    expect(settleConsumableGrant).toHaveBeenCalledWith('paid-one');
    ui.render({ visible: false });
    const reopened = ui.render();
    control(reopened, 'Close store').onPress();
    control(reopened, 'Buy Amber, 100 amber, for $1').onPress();
    expect(ui.props.onClose).not.toHaveBeenCalled();
    expect(ui.props.onAmberChange).not.toHaveBeenCalled();
    expect(purchaseConsumable).toHaveBeenCalledTimes(1);
    expect(saveWithPlayerRetry).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ title: 'Your purchase is waiting' }));
    credit.resolve({ amberBalance: 300, hintBalance: 2, applied: true });
    await completed;
    expect(ui.props.onAmberChange).toHaveBeenCalledWith(300);
    control(ui.render(), 'Close store').onPress();
    expect(ui.props.onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the confirmed reward visible when the save overlay closes after checkout settles', async () => {
    const payment = deferred();
    jest.mocked(purchaseConsumable).mockReturnValue(payment.promise);
    const ui = store(); await openStore(ui);
    const buying = control(ui.render(), 'Buy Amber, 100 amber, for $1').onPress();
    ui.render({ visible: false });
    payment.resolve({ success: true, productId: 'amber', reward: { kind: 'amber', amount: 100 }, grantId: 'paid-one' });
    await buying;
    // The overlay owner restores visibility after the async grant and flow
    // already returned to idle; this is not a fresh visit to the store.
    const reopened = ui.render();
    expect(text(reopened)).toContain('+100 amber added.');
    control(reopened, 'Close store').onPress();
    ui.render({ visible: false });
    expect(text(ui.render())).not.toContain('+100 amber added.');
  });

  it('refreshes durable ownership without releasing an ongoing purchase', async () => {
    const payment = deferred();
    jest.mocked(purchaseConsumable).mockReturnValue(payment.promise);
    const ui = store(); const initial = await openStore(ui); const cleanup = mountEffects();
    const buying = control(initial, 'Buy Amber, 100 amber, for $1').onPress();
    jest.mocked(hasEntitlementSync).mockImplementation(key => key === 'bundle');
    billingChange()({ entitlements: ['bundle'] });
    const updated = ui.render();
    expect(updated.some(node => node.props.accessibilityLabel === "Buy The Keeper's Collection for $3")).toBe(false);
    expect(control(updated, 'Close store').disabled).toBe(true);
    control(updated, 'Close store').onPress();
    expect(ui.props.onClose).not.toHaveBeenCalled();
    payment.resolve({ success: false, productId: 'amber', cancelled: true });
    await buying;
    cleanup();
  });

  it('resolves a pending purchase only when its own saved purchase notification arrives', async () => {
    jest.mocked(purchaseConsumable).mockResolvedValue({ success: false, productId: 'amber', pending: true });
    const ui = store(); const initial = await openStore(ui); const cleanup = mountEffects();
    await control(initial, 'Buy Amber, 100 amber, for $1').onPress();
    billingChange()({ productId: 'hints' });
    expect(control(ui.render(), 'Buy Amber, 100 amber, for $1').disabled).toBe(true);
    ui.render({ visible: false });
    billingChange()({ productId: 'amber' });
    const updated = ui.render();
    expect(text(updated)).toContain('Your purchase is ready.');
    expect(control(updated, 'Buy Amber, 100 amber, for $1').disabled).toBe(false);
    cleanup();
  });

  it('holds a starter purchase through both saved grants', async () => {
    const hints = deferred();
    jest.mocked(purchaseStarterPack).mockResolvedValue({ success: true, productId: 'starter', reward: { amber: 200, hints: 10 }, grantIds: { amber: 'starter-amber', hints: 'starter-hints' } });
    jest.mocked(settleConsumableGrant).mockResolvedValueOnce({ amberBalance: 400, hintBalance: 2, applied: true }).mockReturnValueOnce(hints.promise);
    const ui = store(); const initial = await openStore(ui);
    const buying = control(initial, 'Buy Welcome for $2').onPress();
    await settle();
    control(initial, 'Close store').onPress();
    expect(ui.props.onClose).not.toHaveBeenCalled();
    hints.resolve({ amberBalance: 400, hintBalance: 12, applied: true });
    await buying;
    expect(ui.props.onAmberChange).toHaveBeenCalledWith(400);
    expect(ui.props.onHintsChange).toHaveBeenCalledWith(12);
    expect(control(ui.render(), 'Close store').disabled).toBe(false);
  });

  it('allows dismissal after cancellation without presenting a failure', async () => {
    const ui = store(); const initial = await openStore(ui);
    await control(initial, 'Buy Amber, 100 amber, for $1').onPress();
    expect(text(ui.render())).not.toContain("couldn't confirm");
    modal(ui.render()).onRequestClose();
    expect(ui.props.onClose).toHaveBeenCalledTimes(1);
  });

  it('explains pending confirmation, blocks stale repurchase callbacks, and permits dismissal', async () => {
    jest.mocked(purchaseConsumable).mockResolvedValue({ success: false, productId: 'amber', pending: true });
    const ui = store(); const initial = await openStore(ui);
    const buy = control(initial, 'Buy Amber, 100 amber, for $1');
    await buy.onPress();
    await buy.onPress();
    const updated = ui.render();
    expect(purchaseConsumable).toHaveBeenCalledTimes(1);
    expect(text(updated)).toContain('still confirming this purchase');
    expect(text(updated)).not.toContain('Nothing was charged');
    expect(control(updated, 'Buy Amber, 100 amber, for $1').disabled).toBe(true);
    expect(control(updated, 'Close store').disabled).toBe(false);
    control(updated, 'Close store').onPress();
    expect(ui.props.onClose).toHaveBeenCalledTimes(1);
  });

  it('never promises there was no charge after an ambiguous purchase error', async () => {
    jest.mocked(purchaseConsumable).mockRejectedValue(new Error('connection lost after checkout'));
    const ui = store(); await openStore(ui);
    await control(ui.render(), 'Buy Amber, 100 amber, for $1').onPress();
    const updated = ui.render();
    expect(text(updated)).toContain('Check your store purchase history');
    expect(text(updated)).not.toContain('Nothing was charged');
    expect(control(updated, 'Close store').disabled).toBe(false);
  });

  it('owns direct daily claims synchronously until their credit is saved', async () => {
    jest.mocked(isPatronSync).mockReturnValue(true);
    const saved = deferred();
    jest.mocked(claimDailyAmberReward).mockReturnValue(saved.promise);
    const ui = store(); await openStore(ui); seedDailyStatus(); const initial = ui.render();
    const claim = initial.find(node => node.props.accessibilityLabel?.startsWith('Claim ') && node.props.onPress)!.props;
    const earning = claim.onPress();
    claim.onPress();
    control(initial, 'Close store').onPress();
    control(initial, 'Buy Amber, 100 amber, for $1').onPress();
    expect(claimDailyAmberReward).toHaveBeenCalledTimes(1);
    expect(createDailyAmberClaimId).toHaveBeenCalledTimes(1);
    expect(ui.props.onClose).not.toHaveBeenCalled();
    expect(purchaseConsumable).not.toHaveBeenCalled();
    saved.resolve({ available: true, remaining: 1, recorded: true, grantedAmount: 60, newBalance: 260 });
    await earning;
    expect(ui.props.onAmberChange).toHaveBeenCalledWith(260);
    expect(control(ui.render(), 'Close store').disabled).toBe(false);
  });

  it('reserves navigation and paid actions for the whole earned-ad callback, including after hiding', async () => {
    const saved = deferred();
    jest.mocked(claimDailyAmberReward).mockReturnValue(saved.promise);
    const ui = store(); await openStore(ui); seedDailyStatus(); const initial = ui.render();
    const ad = initial.find(node => node.type === 'RewardedAdButton')!.props;
    expect(ad.completeAfterUnmount).toBe(true);
    expect(ad.canStart()).toBe(true);
    ad.onBusyChange(true);
    expect(ad.canStart()).toBe(false);
    control(initial, 'Close store').onPress();
    control(initial, 'Buy Amber, 100 amber, for $1').onPress();
    ui.render({ visible: false });
    const earning = ad.onReward();
    expect(claimDailyAmberReward).toHaveBeenCalledTimes(1);
    expect(ui.props.onClose).not.toHaveBeenCalled();
    expect(purchaseConsumable).not.toHaveBeenCalled();
    saved.resolve({ available: true, remaining: 1, recorded: true, grantedAmount: 60, newBalance: 260 });
    await earning;
    expect(ui.props.onAmberChange).toHaveBeenCalledWith(260);
    expect(ad.canStart()).toBe(false);
    ad.onBusyChange(false);
    expect(ad.canStart()).toBe(true);
    expect(control(ui.render(), 'Close store').disabled).toBe(false);
  });
});

describe('Patron purchase and restore controls', () => {
  it('shares one immediate lock across Patron, Remove Ads, restore and dismissal', async () => {
    const payment = deferred();
    jest.mocked(purchaseProduct).mockReturnValue(payment.promise);
    const ui = patron(); const initial = ui.render();
    const buying = control(initial, 'Become a Patron').onPress();
    control(initial, 'Become a Patron').onPress();
    control(initial, 'Remove ads').onPress();
    control(initial, 'Restore purchases').onPress();
    control(initial, 'Maybe later').onPress();
    modal(initial).onRequestClose();
    expect(purchaseProduct).toHaveBeenCalledTimes(1);
    expect(restorePurchases).not.toHaveBeenCalled();
    expect(ui.props.onClose).not.toHaveBeenCalled();
    expect(control(ui.render(), 'Maybe later').disabled).toBe(true);
    payment.resolve({ success: false, productId: 'patron', cancelled: true });
    await buying;
    control(ui.render(), 'Maybe later').onPress();
    expect(ui.props.onClose).toHaveBeenCalledTimes(1);
  });

  it('refreshes both paid flags and the host after Patron success', async () => {
    const payment = deferred();
    jest.mocked(purchaseProduct).mockReturnValue(payment.promise);
    const ui = patron(); const buying = control(ui.render(), 'Become a Patron').onPress();
    jest.mocked(isPatronSync).mockReturnValue(true);
    jest.mocked(isAdFreeSync).mockReturnValue(true);
    payment.resolve({ success: true, productId: 'patron' });
    await buying;
    const updated = ui.render();
    expect(ui.props.onPatronChange).toHaveBeenCalledWith(true);
    expect(text(updated)).toContain('You are a Patron');
    expect(updated.some(node => node.props.accessibilityLabel === 'Remove ads')).toBe(false);
    expect(updated.some(node => node.props.accessibilityLabel === 'Restore purchases')).toBe(false);
  });

  it('shows a deferred Patron approval after durable entitlement confirmation', async () => {
    jest.mocked(purchaseProduct).mockResolvedValue({ success: false, productId: 'patron', pending: true });
    const ui = patron(); const initial = ui.render(); const cleanup = mountEffects();
    await control(initial, 'Become a Patron').onPress();
    jest.mocked(isPatronSync).mockReturnValue(true);
    jest.mocked(isAdFreeSync).mockReturnValue(true);
    billingChange()({ entitlements: ['patron'] });
    const updated = ui.render();
    expect(text(updated)).toContain('Your purchase is ready.');
    expect(text(updated)).toContain('You are a Patron');
    expect(control(updated, 'Close').disabled).toBe(false);
    expect(ui.props.onPatronChange).toHaveBeenCalledWith(true);
    cleanup();
  });

  it('refreshes the host after Remove Ads success too', async () => {
    const payment = deferred();
    jest.mocked(purchaseProduct).mockReturnValue(payment.promise);
    const ui = patron(); const buying = control(ui.render(), 'Remove ads').onPress();
    jest.mocked(isAdFreeSync).mockReturnValue(true);
    payment.resolve({ success: true, productId: 'ads' });
    await buying;
    expect(ui.props.onPatronChange).toHaveBeenCalledWith(false);
    expect(text(ui.render())).toContain('Ads removed');
  });

  it.each(['result', 'exception'])('reports a failed restore returned as %s instead of silently claiming completion', async kind => {
    if (kind === 'result') jest.mocked(restorePurchases).mockResolvedValue({ entitlements: [], error: 'offline' });
    else jest.mocked(restorePurchases).mockRejectedValue(new Error('offline'));
    const ui = patron();
    await control(ui.render(), 'Restore purchases').onPress();
    const updated = ui.render();
    expect(text(updated)).toContain("couldn't restore your purchases");
    expect(ui.props.onPatronChange).not.toHaveBeenCalled();
    expect(control(updated, 'Restore purchases').disabled).toBe(false);
    expect(control(updated, 'Maybe later').disabled).toBe(false);
  });

  it('keeps restoration exclusive and confirms an empty account clearly', async () => {
    const restore = deferred();
    jest.mocked(restorePurchases).mockReturnValue(restore.promise);
    const ui = patron(); const initial = ui.render();
    const restoring = control(initial, 'Restore purchases').onPress();
    control(initial, 'Restore purchases').onPress();
    control(initial, 'Become a Patron').onPress();
    modal(initial).onRequestClose();
    expect(restorePurchases).toHaveBeenCalledTimes(1);
    expect(purchaseProduct).not.toHaveBeenCalled();
    expect(ui.props.onClose).not.toHaveBeenCalled();
    restore.resolve({ entitlements: [] });
    await restoring;
    expect(text(ui.render())).toContain('No previous purchases were found');
  });

  it('preserves the pending purchase guard after a failed restore while allowing close', async () => {
    jest.mocked(purchaseProduct).mockResolvedValue({ success: false, productId: 'patron', pending: true });
    jest.mocked(restorePurchases).mockResolvedValue({ entitlements: [], error: 'offline' });
    const ui = patron();
    await control(ui.render(), 'Become a Patron').onPress();
    expect(text(ui.render())).toContain('still confirming this purchase');
    await control(ui.render(), 'Restore purchases').onPress();
    const updated = ui.render();
    expect(control(updated, 'Become a Patron').disabled).toBe(true);
    expect(control(updated, 'Maybe later').disabled).toBe(false);
  });
});
