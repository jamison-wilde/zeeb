import { isWindows, isMacOS, urlShortcutExtension } from '../../src/utils/platform';

describe('platform utils', () => {
  it('urlShortcutExtension returns .url or .webloc', () => {
    const ext = urlShortcutExtension();
    expect(['.url', '.webloc']).toContain(ext);
  });

  it('isWindows and isMacOS are mutually exclusive', () => {
    expect(isWindows() && isMacOS()).toBe(false);
  });
});
