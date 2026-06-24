/**
 * External links surfaced in Settings (and required for store submission).
 *
 * The privacy policy, terms of service, and data-deletion documents live in the
 * repo at docs/ and are served LIVE via GitHub Pages (deployed from branch,
 * /docs). All three URLs below are published and publicly accessible — verified
 * resolving — so the Settings links and the store-listing metadata point at live
 * pages. The trailing slashes match the Jekyll `permalink` front matter in those
 * files. If the hosting location changes, update these URLs and the store
 * listing entries together.
 */
export const EXTERNAL_LINKS = {
  privacyPolicy: 'https://jpearleverett.github.io/WordShift/privacy-policy/',
  termsOfService: 'https://jpearleverett.github.io/WordShift/terms/',
  dataDeletion: 'https://jpearleverett.github.io/WordShift/data-deletion/',
  supportEmail: 'jpearleverett@gmail.com',
} as const;

export function getSupportMailto(appVersion: string): string {
  const subject = encodeURIComponent(`WordShift Support (v${appVersion})`);
  return `mailto:${EXTERNAL_LINKS.supportEmail}?subject=${subject}`;
}
