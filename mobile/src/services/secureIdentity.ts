/** Bearer credentials must never fall back to a clock or Math.random. */
export async function createSecureIdentity(): Promise<string> {
  const { getRandomBytesAsync } = require('expo-crypto') as typeof import('expo-crypto');
  const bytes = await getRandomBytesAsync(16);
  if (bytes.length !== 16) throw new Error('Secure random generation is unavailable');
  return `ws2_${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function isSecureIdentity(value: unknown): value is string {
  return typeof value === 'string' && /^ws2_[a-f0-9]{32}$/.test(value);
}

export function formatSecureRecoveryCode(owner: string): string {
  if (!isSecureIdentity(owner)) throw new Error('A secure backup has not been created');
  return `WS2-${owner.slice(4).toUpperCase().match(/.{8}/g)!.join('-')}`;
}

export function parseSecureRecoveryCode(code: string): string | null {
  const normalized = code.trim().replace(/[\s-]/g, '').toLowerCase();
  return /^ws2[a-f0-9]{32}$/.test(normalized) ? `ws2_${normalized.slice(3)}` : null;
}
