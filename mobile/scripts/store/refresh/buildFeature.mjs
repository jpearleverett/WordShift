/**
 * Entry point named in the refresh-2026-09 brief (section 2, "Scripts").
 * Builds feature graphics A and B (and refreshes the review files) through
 * scripts/store/buildRefresh.mjs:
 *
 *   node scripts/store/refresh/buildFeature.mjs
 */
if (process.argv.length <= 2) process.argv.push('feature');
await import('../buildRefresh.mjs');
