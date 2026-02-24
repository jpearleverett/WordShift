type RawConfig = Record<string, unknown>;

function getExtras(): RawConfig {
  try {
    const loaded = require('expo-constants');
    const constants = loaded.default ?? loaded;
    return (constants?.expoConfig?.extra ?? {}) as RawConfig;
  } catch {
    return {};
  }
}

function stringValue(key: string, fallback: string = ''): string {
  const extras = getExtras();
  const fromExtra = extras[key];
  if (typeof fromExtra === 'string') return fromExtra;
  const fromEnv = process.env[key];
  if (typeof fromEnv === 'string') return fromEnv;
  return fallback;
}

function boolValue(key: string, fallback: boolean = false): boolean {
  const normalized = stringValue(key, fallback ? 'true' : 'false').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export interface RuntimeConfig {
  enableSentry: boolean;
  enableAnalytics: boolean;
  enableIap: boolean;
  enableCloudSync: boolean;
  sentryDsn: string;
  posthogApiKey: string;
  posthogHost: string;
  revenueCatIosApiKey: string;
  revenueCatAndroidApiKey: string;
  revenueCatEntitlementId: string;
  revenueCatProductId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseSaveTable: string;
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    enableSentry: boolValue('ENABLE_SENTRY', false),
    enableAnalytics: boolValue('ENABLE_ANALYTICS', false),
    enableIap: boolValue('ENABLE_IAP', false),
    enableCloudSync: boolValue('ENABLE_CLOUD_SYNC', false),
    sentryDsn: stringValue('SENTRY_DSN'),
    posthogApiKey: stringValue('POSTHOG_API_KEY'),
    posthogHost: stringValue('POSTHOG_HOST', 'https://us.i.posthog.com'),
    revenueCatIosApiKey: stringValue('REVENUECAT_IOS_API_KEY'),
    revenueCatAndroidApiKey: stringValue('REVENUECAT_ANDROID_API_KEY'),
    revenueCatEntitlementId: stringValue('REVENUECAT_ENTITLEMENT_ID', 'patron'),
    revenueCatProductId: stringValue('REVENUECAT_PRODUCT_ID', 'patrons_key'),
    supabaseUrl: stringValue('SUPABASE_URL'),
    supabaseAnonKey: stringValue('SUPABASE_ANON_KEY'),
    supabaseSaveTable: stringValue('SUPABASE_SAVE_TABLE', 'game_saves'),
  };
}
