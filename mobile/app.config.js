/** A native dependency change requires a new binary; never cross update channels. */
module.exports = ({ config }) => {
  const releaseChannel = process.env.WORDSHIFT_RELEASE_CHANNEL || 'internal-testing';
  if (!['development', 'preview', 'internal-testing', 'production'].includes(releaseChannel)) {
    throw new Error(`Unknown WordShift release channel: ${releaseChannel}`);
  }
  return {
    ...config,
    runtimeVersion: `${config.version}-${releaseChannel}`,
    extra: { ...config.extra, releaseChannel },
  };
};
