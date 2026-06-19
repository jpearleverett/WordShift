/**
 * External links surfaced in Settings (and required for store submission).
 *
 * The privacy policy and terms documents live in the repo at docs/ and are
 * served via GitHub Pages (Settings → Pages → deploy from branch, /docs).
 * The trailing slashes match the Jekyll `permalink` front matter in those
 * files, so the URLs resolve directly once Pages is enabled. If the hosting
 * location changes, update these URLs and the store listing entries together.
 */
export const EXTERNAL_LINKS = {
  privacyPolicy: 'https://jpearleverett.github.io/WordShift/privacy-policy/',
  termsOfService: 'https://jpearleverett.github.io/WordShift/terms/',
  supportEmail: 'jpearleverett@gmail.com',
} as const;

export function getSupportMailto(appVersion: string): string {
  const subject = encodeURIComponent(`WordShift Support (v${appVersion})`);
  return `mailto:${EXTERNAL_LINKS.supportEmail}?subject=${subject}`;
}
