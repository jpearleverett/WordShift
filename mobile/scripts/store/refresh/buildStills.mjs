/**
 * Entry point named in the refresh-2026-09 brief (section 2, "Scripts").
 * Builds the phone and tablet screenshots (plus the store icon copy and the review
 * files) through scripts/store/buildRefresh.mjs:
 *
 *   node scripts/store/refresh/buildStills.mjs
 */
if (process.argv.length <= 2) process.argv.push('phone', 'tablet', 'icon');
await import('../buildRefresh.mjs');
