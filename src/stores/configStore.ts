import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { FsAdapter } from '../adapters/fs';
import type { ZeebConfig } from '../types';
import { DEFAULT_CONFIG } from '../services/configDefaults';
import { DEFAULT_MPAA_MAP } from '../utils/defaultTerms';

export { DEFAULT_CONFIG };

const CONFIG_FILENAME = 'zeeb-config.json';

interface ConfigStoreState {
  config: ZeebConfig;
  load: () => Promise<void>;
  save: () => Promise<void>;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function createConfigStore(fs: FsAdapter): StoreApi<ConfigStoreState> {
  let configPath: string | null = null;

  async function getConfigPath(): Promise<string> {
    if (!configPath) {
      const dir = await fs.getConfigDir();
      configPath = `${dir}/${CONFIG_FILENAME}`;
    }
    return configPath;
  }

  return createStore<ConfigStoreState>((set, get) => ({
    config: { ...DEFAULT_CONFIG },

    async load() {
      const path = await getConfigPath();
      const fileExists = await fs.exists(path);
      if (fileExists) {
        const json = await fs.readFile(path, 'utf8');
        try {
          const saved = JSON.parse(json) as Record<string, unknown>;
          // Migrate legacy keepTerms: string[] → Array<[string, string]>
          if (Array.isArray(saved.keepTerms)) {
            saved.keepTerms = (saved.keepTerms as unknown[]).map((t) =>
              Array.isArray(t) ? t : [t, t],
            );
          }
          // Migrate legacy mpaaMap: Record<string, string> → Array<[string, string]>
          if (saved.mpaaMap && !Array.isArray(saved.mpaaMap)) {
            const entries = Object.entries(saved.mpaaMap as Record<string, string>);
            saved.mpaaMap = entries.length > 0 ? entries : DEFAULT_MPAA_MAP;
          } else if (Array.isArray(saved.mpaaMap) && (saved.mpaaMap as unknown[]).length === 0) {
            saved.mpaaMap = DEFAULT_MPAA_MAP;
          }
          set({ config: { ...DEFAULT_CONFIG, ...(saved as Partial<ZeebConfig>) } });
        } catch {
          set({ config: { ...DEFAULT_CONFIG } });
        }
      } else {
        set({ config: { ...DEFAULT_CONFIG } });
      }
    },

    async save() {
      const path = await getConfigPath();
      const json = JSON.stringify(get().config, null, 2);
      await fs.writeFile(path, json, 'utf8');
    },

    updateConfig(partial: Partial<ZeebConfig>) {
      set((state) => ({ config: { ...state.config, ...partial } }));
    },
  }));
}

let defaultStore: StoreApi<ConfigStoreState> | null = null;

export function initConfigStore(fs: FsAdapter): void {
  defaultStore = createConfigStore(fs);
}

export function getConfigStore(): StoreApi<ConfigStoreState> {
  if (!defaultStore) throw new Error('Config store not initialized. Call initConfigStore(fs) first.');
  return defaultStore;
}

export function useConfigStore(): ConfigStoreState;
export function useConfigStore<T>(selector: (state: ConfigStoreState) => T): T;
export function useConfigStore<T>(selector?: (state: ConfigStoreState) => T) {
  return useStore(getConfigStore(), selector as (state: ConfigStoreState) => T);
}
