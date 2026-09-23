/**
 * BO-8 (launch readiness review 2026-09-22): the season-pass premium unlock is
 * an AMBER spend, so it must never be logged as `iap_purchase`, the event the
 * real-money purchase funnel counts. The server view
 * (docs/supabase/analytics_views_v1.sql) also excludes the legacy rows, which
 * this pins from the other side.
 */
import * as fs from 'fs';
import * as path from 'path';

const MOBILE = path.resolve(__dirname, '..', '..');
const REPO = path.resolve(MOBILE, '..');

describe('season premium unlock analytics', () => {
  const modal = fs.readFileSync(path.join(MOBILE, 'src', 'components', 'SeasonPassModal.tsx'), 'utf8');

  test('logs its own event, never iap_purchase', () => {
    expect(modal).toContain("'season_premium_unlocked'");
    expect(modal).not.toMatch(/type:\s*'iap_purchase'/);
  });

  test('the real-money unlock is a real purchase under its own kind, which the funnel counts', () => {
    const checkout = fs.readFileSync(path.join(MOBILE, 'src', 'services', 'seasonPremiumCheckout.ts'), 'utf8');
    expect(checkout).toMatch(/type:\s*'iap_purchase'/);
    expect(checkout).toContain("const KIND = 'season_premium';");
    expect(checkout).not.toMatch(/kind:\s*'season'/);
  });

  test('the purchase-funnel view excludes amber spends, old and new', () => {
    const sql = fs.readFileSync(path.join(REPO, 'docs', 'supabase', 'analytics_views_v1.sql'), 'utf8');
    const funnel = sql.slice(sql.indexOf('create or replace view public.analytics_purchase_funnel'));
    expect(funnel).toContain("in ('purchase_initiated', 'iap_purchase', 'purchase_cancelled', 'purchase_failed')");
    expect(funnel).not.toContain("'season_premium_unlocked'");
    expect(funnel).toContain("coalesce(e.data->>'kind', '') <> 'season'");
    expect(funnel).toContain("coalesce(e.data->>'productId', '') <> 'season_premium_amber'");
  });
});
