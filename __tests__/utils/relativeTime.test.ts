import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from '../../src/utils/relativeTime';

const NOW = 1_700_000_000_000;

describe('formatRelativeTime', () => {
  it('formats each bucket', () => {
    expect(formatRelativeTime(NOW - 30_000, NOW)).toBe('just now');
    expect(formatRelativeTime(NOW - 2 * 60_000, NOW)).toBe('2 min ago');
    expect(formatRelativeTime(NOW - 3 * 3_600_000, NOW)).toBe('3 h ago');
    expect(formatRelativeTime(NOW - 30 * 3_600_000, NOW)).toBe('yesterday');
    expect(formatRelativeTime(NOW - 3 * 86_400_000, NOW)).toBe('3 days ago');
  });

  it('falls back to a locale date beyond a week', () => {
    const old = NOW - 30 * 86_400_000;
    expect(formatRelativeTime(old, NOW)).toBe(new Date(old).toLocaleDateString());
  });
});
