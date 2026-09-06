/** Native random source substitute for Node service tests. */
export async function getRandomBytesAsync(length: number): Promise<Uint8Array> {
  return new Uint8Array(require('crypto').randomBytes(length));
}
