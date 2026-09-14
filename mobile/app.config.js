/** A native dependency change requires a new binary; never cross update channels. */
module.exports = ({ config }) => {
  const releaseChannel = process.env.WORDSHIFT_RELEASE_CHANNEL || 'internal-testing';
  if (!['development', 'preview', 'internal-testing', 'production'].includes(releaseChannel)) {
    throw new Error(`Unknown WordShift release channel: ${releaseChannel}`);
  }
  // Ad units follow the release channel, not a hand-edited literal: a
  // production build serves LIVE units no matter what app.json says, and every
  // other channel keeps the app.json literal (which must stay `true`, so that
  // testers never tap live ads; a MISSING literal also resolves to test units,
  // since the ad adapters read anything but an explicit `true` as live;
  // productionConfig.test.ts pins both states).
  const extra = config.extra || {};
  const adsUseTestIds = releaseChannel !== 'production' && extra.adsUseTestIds !== false;
  return {
    ...config,
    runtimeVersion: `${config.version}-${releaseChannel}`,
    extra: { ...extra, releaseChannel, adsUseTestIds },
  };
};
