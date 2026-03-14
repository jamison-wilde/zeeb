import { describe, it, expect } from 'vitest';
import { isNewerVersion } from '../../src/services/versionCompare';

describe('isNewerVersion', () => {
  it('returns true when candidate major is higher', () => {
    expect(isNewerVersion('5.0.0', '4.0.0')).toBe(true);
  });

  it('returns true when candidate minor is higher', () => {
    expect(isNewerVersion('4.1.0', '4.0.0')).toBe(true);
  });

  it('returns true when candidate patch is higher', () => {
    expect(isNewerVersion('4.0.1', '4.0.0')).toBe(true);
  });

  it('returns false when versions are equal', () => {
    expect(isNewerVersion('4.0.0', '4.0.0')).toBe(false);
  });

  it('returns false when candidate is older', () => {
    expect(isNewerVersion('3.9.9', '4.0.0')).toBe(false);
  });

  it('strips v prefix', () => {
    expect(isNewerVersion('v5.0.0', 'v4.0.0')).toBe(true);
  });

  it('handles two-segment versions', () => {
    expect(isNewerVersion('4.1', '4.0')).toBe(true);
  });
});
