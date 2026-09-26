// Link-out tiles. Play Console and AdMob have no suitable real-time API, so
// they are links with a note on what to check there and how far behind it is.
import { REVENUECAT_DASHBOARD_URL } from './revenuecat.js';
import { sentryIssuesUrl } from './sentry.js';

export function buildLinks(config) {
  const links = [
    { id: 'play_console', label: 'Google Play Console', url: config.playConsoleUrl,
      note: 'Installs, uninstalls, ratings, reviews and Android vitals (crash and ANR rates). Usually 1 to 3 days behind, so this dashboard sees players first.' },
    { id: 'admob', label: 'AdMob', url: config.admobUrl,
      note: 'Ad requests, fill, impressions and estimated earnings. Most numbers arrive within about 4 hours; earnings are final at the end of the month.' },
    { id: 'revenuecat', label: 'RevenueCat', url: REVENUECAT_DASHBOARD_URL,
      note: 'Real revenue, subscriptions, trials and refunds. The money truth for purchases.' },
    { id: 'sentry', label: 'Sentry', url: sentryIssuesUrl(config.sentryLink),
      note: 'Crash and error reports with stack traces.' },
  ];
  if (config.projectRef) {
    links.push({ id: 'supabase', label: 'Supabase', url: `https://supabase.com/dashboard/project/${config.projectRef}`,
      note: 'Database health, disk usage and the SQL editor.' });
  }
  return links;
}
