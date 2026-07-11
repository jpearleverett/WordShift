import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  shouldShowSharePrompt,
  consumeSharePrompt,
  clearSharePrompts,
  getSharePromptInvite,
  SHARE_PROMPT_INVITES,
  SharePromptContext,
  SharePromptState,
} from '../services/sharePrompts';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

const STORAGE_KEY = 'wordshift_share_prompts';

const ctx = (over: Partial<SharePromptContext> = {}): SharePromptContext => ({
  isFlawlessWin: false,
  isPhaseTransition: false,
  isOnboarding: false,
  ...over,
});

const fresh: SharePromptState = { sharePromptShown: false };

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearSharePrompts();
});

describe('shouldShowSharePrompt (pure)', () => {
  it('fires on a flawless win from a fresh state', () => {
    expect(shouldShowSharePrompt(fresh, ctx({ isFlawlessWin: true }))).toBe(true);
  });

  it('fires on a phase transition from a fresh state', () => {
    expect(shouldShowSharePrompt(fresh, ctx({ isPhaseTransition: true }))).toBe(true);
  });

  it('does not fire on a non-peak victory', () => {
    expect(shouldShowSharePrompt(fresh, ctx())).toBe(false);
  });

  it('is suppressed during onboarding even at a peak', () => {
    expect(
      shouldShowSharePrompt(fresh, ctx({ isFlawlessWin: true, isOnboarding: true }))
    ).toBe(false);
    expect(
      shouldShowSharePrompt(fresh, ctx({ isPhaseTransition: true, isOnboarding: true }))
    ).toBe(false);
  });

  it('is suppressed once already shown', () => {
    expect(
      shouldShowSharePrompt({ sharePromptShown: true }, ctx({ isFlawlessWin: true }))
    ).toBe(false);
  });
});

describe('consumeSharePrompt (lifecycle)', () => {
  it('fires exactly once at the first peak, then never again', async () => {
    expect(await consumeSharePrompt(ctx({ isFlawlessWin: true }))).toBe(true);
    expect(await consumeSharePrompt(ctx({ isFlawlessWin: true }))).toBe(false);
    // even a different kind of peak is suppressed after the one-time fire
    expect(await consumeSharePrompt(ctx({ isPhaseTransition: true }))).toBe(false);
  });

  it('the first peak can be a phase transition', async () => {
    expect(await consumeSharePrompt(ctx({ isPhaseTransition: true }))).toBe(true);
    expect(await consumeSharePrompt(ctx({ isFlawlessWin: true }))).toBe(false);
  });

  it('does not consume the one-time fire on a non-peak victory', async () => {
    expect(await consumeSharePrompt(ctx())).toBe(false);
    // still available for a later real peak
    expect(await consumeSharePrompt(ctx({ isFlawlessWin: true }))).toBe(true);
  });

  it('is suppressed during onboarding and stays available afterwards', async () => {
    expect(
      await consumeSharePrompt(ctx({ isFlawlessWin: true, isOnboarding: true }))
    ).toBe(false);
    expect(
      await consumeSharePrompt(ctx({ isFlawlessWin: true, isOnboarding: false }))
    ).toBe(true);
  });

  it('persists the shown flag to device-local storage', async () => {
    expect(await consumeSharePrompt(ctx({ isFlawlessWin: true }))).toBe(true);
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string)).toMatchObject({ sharePromptShown: true });
  });

  it('clearSharePrompts re-arms the one-time nudge (Reset All)', async () => {
    expect(await consumeSharePrompt(ctx({ isFlawlessWin: true }))).toBe(true);
    expect(await consumeSharePrompt(ctx({ isFlawlessWin: true }))).toBe(false);
    await clearSharePrompts();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(await consumeSharePrompt(ctx({ isFlawlessWin: true }))).toBe(true);
  });
});

describe('invite copy', () => {
  const DASH = /[–—]/;

  it('has an in-world line for every phase 0-5, all dash-free', () => {
    for (let p = 0; p <= 5; p++) {
      const line = SHARE_PROMPT_INVITES[p as 0 | 1 | 2 | 3 | 4 | 5];
      expect(typeof line).toBe('string');
      expect(line.length).toBeGreaterThan(0);
      expect(DASH.test(line)).toBe(false);
    }
  });

  it('getSharePromptInvite clamps out-of-range phases', () => {
    expect(getSharePromptInvite(0)).toBe(SHARE_PROMPT_INVITES[0]);
    expect(getSharePromptInvite(1)).toBe(SHARE_PROMPT_INVITES[1]);
    expect(getSharePromptInvite(9)).toBe(SHARE_PROMPT_INVITES[5]);
    expect(getSharePromptInvite(-3)).toBe(SHARE_PROMPT_INVITES[0]);
    expect(getSharePromptInvite(2.6)).toBe(SHARE_PROMPT_INVITES[3]);
  });
});
