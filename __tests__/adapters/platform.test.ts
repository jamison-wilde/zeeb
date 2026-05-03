import { describe, it, expect } from 'vitest';
import { createMockPlatformAdapter } from '../../src/adapters/platform';

describe('createMockPlatformAdapter', () => {
  it('returns a fully populated adapter when called with no overrides', () => {
    const p = createMockPlatformAdapter();
    expect(typeof p.menu.onOptions).toBe('function');
    expect(typeof p.menu.sendWebViewState).toBe('function');
    expect(typeof p.appMeta.getPath).toBe('function');
    expect(typeof p.appMeta.getVersion).toBe('function');
    expect(typeof p.update.onUpdateAvailable).toBe('function');
    expect(typeof p.update.downloadUpdate).toBe('function');
    expect(typeof p.imdb.suggest).toBe('function');
    expect(typeof p.dialog.openDirectory).toBe('function');
  });

  it('lets callers override individual sub-adapter methods', async () => {
    const customSuggest = async () => [];
    const p = createMockPlatformAdapter({
      imdb: { suggest: customSuggest },
    });
    expect(p.imdb.suggest).toBe(customSuggest);
    expect(typeof p.menu.onOptions).toBe('function');
  });

  it('default mock methods are no-ops returning safe values', async () => {
    const p = createMockPlatformAdapter();
    await expect(p.appMeta.getVersion()).resolves.toBeTypeOf('string');
    await expect(p.dialog.openDirectory()).resolves.toBeNull();
    await expect(p.imdb.suggest('q')).resolves.toEqual([]);
  });
});
