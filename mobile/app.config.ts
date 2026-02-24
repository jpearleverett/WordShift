import { ExpoConfig, ConfigContext } from 'expo/config';

const baseConfig = require('./app.json').expo as ExpoConfig;

export default (_ctx: ConfigContext): ExpoConfig => {
  const plugins = Array.isArray(baseConfig.plugins) ? [...baseConfig.plugins] : [];
  if (!plugins.some((plugin) => Array.isArray(plugin) && plugin[0] === '@sentry/react-native/expo')) {
    plugins.push(['@sentry/react-native/expo', {}]);
  }

  return {
    ...baseConfig,
    plugins,
    extra: {
      ...(baseConfig.extra || {}),
      ENABLE_SENTRY: process.env.ENABLE_SENTRY ?? 'false',
      ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS ?? 'false',
      ENABLE_IAP: process.env.ENABLE_IAP ?? 'false',
      ENABLE_CLOUD_SYNC: process.env.ENABLE_CLOUD_SYNC ?? 'false',
      SENTRY_DSN: process.env.SENTRY_DSN ?? '',
      POSTHOG_API_KEY: process.env.POSTHOG_API_KEY ?? '',
      POSTHOG_HOST: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
      REVENUECAT_IOS_API_KEY: process.env.REVENUECAT_IOS_API_KEY ?? '',
      REVENUECAT_ANDROID_API_KEY: process.env.REVENUECAT_ANDROID_API_KEY ?? '',
      REVENUECAT_ENTITLEMENT_ID: process.env.REVENUECAT_ENTITLEMENT_ID ?? 'patron',
      REVENUECAT_PRODUCT_ID: process.env.REVENUECAT_PRODUCT_ID ?? 'patrons_key',
      SUPABASE_URL: process.env.SUPABASE_URL ?? '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',
      SUPABASE_SAVE_TABLE: process.env.SUPABASE_SAVE_TABLE ?? 'game_saves',
    },
  };
};
