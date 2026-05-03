import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useConfigStore, DEFAULT_CONFIG } from '../../src/stores/configStore';
import { createMockFsAdapter } from '../../src/adapters/fs';
import type { FsAdapter } from '../../src/adapters/fs';

describe('configStore', () => {
  let fs: FsAdapter;

  beforeEach(() => {
    fs = createMockFsAdapter({
      exists: vi.fn().mockResolvedValue(false),
      readFile: vi.fn().mockResolvedValue(''),
      writeFile: vi.fn().mockResolvedValue(undefined),
      getConfigDir: vi.fn().mockResolvedValue('/mock/docs'),
    });
    useConfigStore.getState().setFs(fs);
    useConfigStore.setState({ config: { ...DEFAULT_CONFIG } });
  });

  it('initializes with defaults when no config file exists', async () => {
    await useConfigStore.getState().load();
    expect(useConfigStore.getState().config.formatStandard).toBe(DEFAULT_CONFIG.formatStandard);
  });

  it('loads config from JSON file', async () => {
    const saved = { ...DEFAULT_CONFIG, removeThe: true };
    (fs.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(saved));
    await useConfigStore.getState().load();
    expect(useConfigStore.getState().config.removeThe).toBe(true);
  });

  it('saves config to JSON file', async () => {
    await useConfigStore.getState().load();
    useConfigStore.getState().updateConfig({ removeThe: true });
    await useConfigStore.getState().save();
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('zeeb-config.json'),
      expect.stringContaining('"removeThe": true'),
      'utf8',
    );
  });

  it('merges partial updates without losing other fields', async () => {
    await useConfigStore.getState().load();
    const original = useConfigStore.getState().config.formatStandard;
    useConfigStore.getState().updateConfig({ removeThe: true });
    expect(useConfigStore.getState().config.formatStandard).toBe(original);
  });
});

describe('mpaaMap migration', () => {
  beforeEach(() => {
    useConfigStore.setState({ config: { ...DEFAULT_CONFIG } });
  });

  it('migrates legacy Record<string,string> mpaaMap to Array<[string,string]>', async () => {
    const legacyConfig = {
      mpaaMap: { R: 'R', PG: 'PG', 'PG-13': 'PG-13' },
    };
    const fs = createMockFsAdapter({
      exists: vi.fn().mockResolvedValue(true),
      readFile: vi.fn().mockResolvedValue(JSON.stringify(legacyConfig)),
    });
    useConfigStore.getState().setFs(fs);
    await useConfigStore.getState().load();
    expect(Array.isArray(useConfigStore.getState().config.mpaaMap)).toBe(true);
    expect(useConfigStore.getState().config.mpaaMap).toContainEqual(['R', 'R']);
    expect(useConfigStore.getState().config.mpaaMap).toContainEqual(['PG', 'PG']);
  });

  it('falls back to DEFAULT_MPAA_MAP when legacy mpaaMap is empty object', async () => {
    const legacyConfig = { mpaaMap: {} };
    const fs = createMockFsAdapter({
      exists: vi.fn().mockResolvedValue(true),
      readFile: vi.fn().mockResolvedValue(JSON.stringify(legacyConfig)),
    });
    useConfigStore.getState().setFs(fs);
    await useConfigStore.getState().load();
    expect(useConfigStore.getState().config.mpaaMap).toHaveLength(16);
    expect(useConfigStore.getState().config.mpaaMap[0]).toEqual(['NF', 'NR']);
  });

  it('falls back to DEFAULT_MPAA_MAP when mpaaMap is empty array', async () => {
    const legacyConfig = { mpaaMap: [] };
    const fs = createMockFsAdapter({
      exists: vi.fn().mockResolvedValue(true),
      readFile: vi.fn().mockResolvedValue(JSON.stringify(legacyConfig)),
    });
    useConfigStore.getState().setFs(fs);
    await useConfigStore.getState().load();
    expect(useConfigStore.getState().config.mpaaMap).toHaveLength(16);
    expect(useConfigStore.getState().config.mpaaMap[0]).toEqual(['NF', 'NR']);
  });

  it('preserves non-empty Array<[string,string]> mpaaMap', async () => {
    const migratedConfig = {
      mpaaMap: [['R', 'Restricted'], ['PG', 'Parental Guidance']],
    };
    const fs = createMockFsAdapter({
      exists: vi.fn().mockResolvedValue(true),
      readFile: vi.fn().mockResolvedValue(JSON.stringify(migratedConfig)),
    });
    useConfigStore.getState().setFs(fs);
    await useConfigStore.getState().load();
    expect(useConfigStore.getState().config.mpaaMap).toEqual([
      ['R', 'Restricted'],
      ['PG', 'Parental Guidance'],
    ]);
  });
});

describe('keepTerms migration', () => {
  beforeEach(() => {
    useConfigStore.setState({ config: { ...DEFAULT_CONFIG } });
  });

  it('converts legacy string[] keepTerms to [string, string][] on load', async () => {
    const legacyConfig = {
      keepTerms: ['720p', '1080p', "Director's Cut"],
    };
    const fs = createMockFsAdapter({
      exists: vi.fn().mockResolvedValue(true),
      readFile: vi.fn().mockResolvedValue(JSON.stringify(legacyConfig)),
    });
    useConfigStore.getState().setFs(fs);
    await useConfigStore.getState().load();
    expect(useConfigStore.getState().config.keepTerms).toEqual([
      ['720p', '720p'],
      ['1080p', '1080p'],
      ["Director's Cut", "Director's Cut"],
    ]);
  });

  it('preserves already-migrated [string, string][] keepTerms', async () => {
    const migratedConfig = {
      keepTerms: [['720', '720p'], ['dc', "Director's Cut"]],
    };
    const fs = createMockFsAdapter({
      exists: vi.fn().mockResolvedValue(true),
      readFile: vi.fn().mockResolvedValue(JSON.stringify(migratedConfig)),
    });
    useConfigStore.getState().setFs(fs);
    await useConfigStore.getState().load();
    expect(useConfigStore.getState().config.keepTerms).toEqual([
      ['720', '720p'],
      ['dc', "Director's Cut"],
    ]);
  });
});
