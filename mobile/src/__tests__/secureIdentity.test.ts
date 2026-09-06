import { createSecureIdentity, formatSecureRecoveryCode, parseSecureRecoveryCode } from '../services/secureIdentity';
import { getRandomBytesAsync } from 'expo-crypto';
jest.mock('expo-crypto', () => ({ getRandomBytesAsync: jest.fn() }));

test('all random bytes survive display and recovery, independently of the clock', async () => {
  (getRandomBytesAsync as jest.Mock).mockResolvedValueOnce(new Uint8Array(16).fill(1));
  (getRandomBytesAsync as jest.Mock).mockResolvedValueOnce(new Uint8Array(16).fill(2));
  const first = await createSecureIdentity();
  const second = await createSecureIdentity();
  expect(first).not.toBe(second);
  expect(parseSecureRecoveryCode(formatSecureRecoveryCode(first))).toBe(first);
  expect(parseSecureRecoveryCode(formatSecureRecoveryCode(second))).toBe(second);
});

test('missing native secure randomness fails instead of generating a weak capability', async () => {
  (getRandomBytesAsync as jest.Mock).mockRejectedValueOnce(new Error('native unavailable'));
  await expect(createSecureIdentity()).rejects.toThrow('native unavailable');
  expect(parseSecureRecoveryCode('WS-INST-MTO7')).toBeNull();
  expect(parseSecureRecoveryCode('WS2-' + 'F'.repeat(31))).toBeNull();
});
