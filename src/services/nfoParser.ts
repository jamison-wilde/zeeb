import { cp437ToUnicode } from '../utils/cp437';

/**
 * Parses a CP437-encoded NFO buffer into a Unicode string.
 */
export function parseNfo(buffer: Buffer): string {
  return cp437ToUnicode(buffer);
}

/**
 * Extracts an IMDB tt identifier from NFO text content.
 * Returns null if no tt number is found.
 */
export function extractImdbFromNfo(content: string): string | null {
  const match = content.match(/tt(\d{7,})/i);
  if (!match) return null;
  return `tt${match[1]}`;
}
