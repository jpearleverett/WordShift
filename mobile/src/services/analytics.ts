import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRuntimeConfig } from '../config/runtime';

const ANALYTICS_DISTINCT_ID_KEY = 'wordshift_analytics_distinct_id';

export interface AnalyticsProvider {
  getName(): string;
  isReady(): boolean;
  init(): Promise<boolean>;
  identify(distinctId: string, traits?: Record<string, unknown>): Promise<void>;
  track(event: string, properties?: Record<string, unknown>): Promise<void>;
}

class NoOpAnalyticsProvider implements AnalyticsProvider {
  getName(): string { return 'Disabled'; }
  isReady(): boolean { return false; }
  async init(): Promise<boolean> { return false; }
  async identify(_distinctId: string, _traits?: Record<string, unknown>): Promise<void> {}
  async track(_event: string, _properties?: Record<string, unknown>): Promise<void> {}
}

class PostHogHttpProvider implements AnalyticsProvider {
  private readonly apiKey: string;
  private readonly host: string;
  private ready = false;
  private distinctId: string | null = null;

  constructor(apiKey: string, host: string) {
    this.apiKey = apiKey;
    this.host = host.endsWith('/') ? host.slice(0, -1) : host;
  }

  getName(): string {
    return 'PostHog';
  }

  isReady(): boolean {
    return this.ready;
  }

  async init(): Promise<boolean> {
    if (!this.apiKey || !this.host) {
      this.ready = false;
      return false;
    }
    this.distinctId = await getOrCreateDistinctId();
    this.ready = true;
    return true;
  }

  async identify(distinctId: string, traits?: Record<string, unknown>): Promise<void> {
    if (!this.ready) return;
    this.distinctId = distinctId;
    await AsyncStorage.setItem(ANALYTICS_DISTINCT_ID_KEY, distinctId).catch(() => {});
    if (!traits || Object.keys(traits).length === 0) return;

    const body = {
      api_key: this.apiKey,
      event: '$identify',
      properties: {
        distinct_id: distinctId,
        $set: traits,
      },
    };
    await safePost(`${this.host}/capture/`, body);
  }

  async track(event: string, properties?: Record<string, unknown>): Promise<void> {
    if (!this.ready) return;
    const distinctId = this.distinctId ?? await getOrCreateDistinctId();
    const body = {
      api_key: this.apiKey,
      event,
      properties: {
        distinct_id: distinctId,
        source: 'wordshift-mobile',
        ...properties,
      },
    };
    await safePost(`${this.host}/capture/`, body);
  }
}

async function safePost(url: string, body: Record<string, unknown>): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // Analytics failures should never crash gameplay.
  }
}

async function getOrCreateDistinctId(): Promise<string> {
  const existing = await AsyncStorage.getItem(ANALYTICS_DISTINCT_ID_KEY).catch(() => null);
  if (existing) return existing;
  const nextId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(ANALYTICS_DISTINCT_ID_KEY, nextId).catch(() => {});
  return nextId;
}

let provider: AnalyticsProvider = new NoOpAnalyticsProvider();
let analyticsInitialized = false;

export async function initAnalytics(): Promise<{ enabled: boolean; provider: string }> {
  if (analyticsInitialized) {
    return { enabled: provider.isReady(), provider: provider.getName() };
  }

  const runtime = getRuntimeConfig();
  if (!runtime.enableAnalytics || !runtime.posthogApiKey) {
    provider = new NoOpAnalyticsProvider();
    analyticsInitialized = true;
    return { enabled: false, provider: provider.getName() };
  }

  const nextProvider = new PostHogHttpProvider(runtime.posthogApiKey, runtime.posthogHost);
  const ok = await nextProvider.init();
  provider = ok ? nextProvider : new NoOpAnalyticsProvider();
  analyticsInitialized = true;

  return { enabled: provider.isReady(), provider: provider.getName() };
}

export async function identifyAnalyticsUser(
  distinctId: string,
  traits?: Record<string, unknown>
): Promise<void> {
  await provider.identify(distinctId, traits);
}

export async function trackAnalyticsEvent(
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await provider.track(event, properties);
}

export function getAnalyticsStatus(): { initialized: boolean; ready: boolean; provider: string } {
  return {
    initialized: analyticsInitialized,
    ready: provider.isReady(),
    provider: provider.getName(),
  };
}

export async function clearAnalyticsState(): Promise<void> {
  await AsyncStorage.removeItem(ANALYTICS_DISTINCT_ID_KEY).catch(() => {});
}
