import { createConfigStore, DEFAULT_CONFIG } from '../../src/stores/configStore';

// Mock react-native-fs
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/docs',
  readFile: jest.fn(),
  writeFile: jest.fn(),
  exists: jest.fn(),
}));

import RNFS from 'react-native-fs';

describe('configStore', () => {
  beforeEach(() => jest.clearAllMocks());

  it('initializes with defaults when no config file exists', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
    const store = createConfigStore();
    await store.getState().load();
    expect(store.getState().config.formatStandard).toBe(DEFAULT_CONFIG.formatStandard);
  });

  it('loads config from JSON file', async () => {
    const saved = { ...DEFAULT_CONFIG, removeThe: true };
    (RNFS.exists as jest.Mock).mockResolvedValue(true);
    (RNFS.readFile as jest.Mock).mockResolvedValue(JSON.stringify(saved));
    const store = createConfigStore();
    await store.getState().load();
    expect(store.getState().config.removeThe).toBe(true);
  });

  it('saves config to JSON file', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
    (RNFS.writeFile as jest.Mock).mockResolvedValue(undefined);
    const store = createConfigStore();
    await store.getState().load();
    store.getState().updateConfig({ removeThe: true });
    await store.getState().save();
    expect(RNFS.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('zeeb-config.json'),
      expect.stringContaining('"removeThe": true'),
      'utf8'
    );
  });

  it('merges partial updates without losing other fields', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
    const store = createConfigStore();
    await store.getState().load();
    const original = store.getState().config.formatStandard;
    store.getState().updateConfig({ removeThe: true });
    expect(store.getState().config.formatStandard).toBe(original);
  });
});
