/**
 * Shared content hash utility — DJB2 algorithm.
 *
 * Single source of truth for all content hashing in the write pipeline.
 */

/** DJB2 hash → positive 32-bit integer. */
export function stableHashInt(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

/** DJB2 hash → hex string with "h_" prefix. */
export function computeContentHash(input: string): string {
  return `h_${stableHashInt(input).toString(16)}`;
}
