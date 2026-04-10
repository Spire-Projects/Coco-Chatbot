/**
 * Generates a short human-readable code for use as a QR code value.
 *
 * Format: `{PREFIX}-{6 random base-36 uppercase chars}`
 * Examples: VAR-A1B2C3, ACC-X9Y8Z7
 *
 * This is client-side generation. Uniqueness is probabilistic (36^6 ≈ 2.1B
 * combinations) which is more than sufficient for a retail inventory.
 */
export function generateShortCode(prefix: 'VAR' | 'ACC'): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  for (const byte of array) {
    code += chars[byte % chars.length];
  }
  return `${prefix}-${code}`;
}
