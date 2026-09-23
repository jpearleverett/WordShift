/**
 * Refuses an OTA publish whose resolved app config does not match its channel.
 *
 * app.config.js derives the runtime (<version>-<channel>) and the ad mode from
 * WORDSHIFT_RELEASE_CHANNEL. A publish with the variable missing or wrong goes
 * out under a runtime no installed build has: the CLI reports success and no
 * device ever receives it. Run by .eas/workflows/publish-update.yml before the
 * update is published; also usable by hand from mobile/:
 *   WORDSHIFT_RELEASE_CHANNEL=production node scripts/tools/checkOtaConfig.mjs
 */
import { execFileSync } from 'node:child_process';

const channel = process.env.WORDSHIFT_RELEASE_CHANNEL;
if (!channel) {
  console.error('WORDSHIFT_RELEASE_CHANNEL is not set; refusing to publish.');
  process.exit(1);
}
const raw = execFileSync('npx', ['expo', 'config', '--type', 'public', '--json'], { encoding: 'utf8', env: process.env });
const config = JSON.parse(raw.slice(raw.indexOf('{')));
const problems = [];
const expectedRuntime = `${config.version}-${channel}`;
if (config.runtimeVersion !== expectedRuntime) problems.push(`runtimeVersion is ${JSON.stringify(config.runtimeVersion)}, expected "${expectedRuntime}"`);
const liveAds = channel === 'production';
if (config.extra?.adsUseTestIds !== !liveAds) problems.push(`adsUseTestIds is ${config.extra?.adsUseTestIds}, expected ${!liveAds} for the ${channel} channel`);
if (config.extra?.creatorCode) problems.push('creatorCode is set; it must be empty in a shipped update');
if (problems.length) {
  console.error(`OTA config check failed for channel ${channel}:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`OTA config OK: channel ${channel}, runtime ${config.runtimeVersion}, adsUseTestIds ${config.extra.adsUseTestIds}.`);
