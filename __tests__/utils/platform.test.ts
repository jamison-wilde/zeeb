import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('platform utils', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isWindows returns true on win32', async () => {
    vi.stubGlobal('process', { ...process, platform: 'win32' });
    const { isWindows } = await import('../../src/utils/platform');
    expect(isWindows()).toBe(true);
  });

  it('isMacOS returns true on darwin', async () => {
    vi.stubGlobal('process', { ...process, platform: 'darwin' });
    const { isMacOS } = await import('../../src/utils/platform');
    expect(isMacOS()).toBe(true);
  });

  it('urlShortcutExtension returns .webloc on macOS', async () => {
    vi.stubGlobal('process', { ...process, platform: 'darwin' });
    const { urlShortcutExtension } = await import('../../src/utils/platform');
    expect(urlShortcutExtension()).toBe('.webloc');
  });

  it('urlShortcutExtension returns .url on Windows', async () => {
    vi.stubGlobal('process', { ...process, platform: 'win32' });
    const { urlShortcutExtension } = await import('../../src/utils/platform');
    expect(urlShortcutExtension()).toBe('.url');
  });
});
