import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import RNFS from 'react-native-fs';
import type { ZeebConfig } from '../types';
import { DEFAULT_CONFIG } from '../services/configDefaults';

export { DEFAULT_CONFIG };

const CONFIG_PATH = `${RNFS.DocumentDirectoryPath}/zeeb-config.json`;

interface ConfigStoreState {
  config: ZeebConfig;
  load: () => Promise<void>;
  save: () => Promise<void>;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function createConfigStore(): StoreApi<ConfigStoreState> {
  return createStore<ConfigStoreState>((set, get) => ({
    config: { ...DEFAULT_CONFIG },

    async load() {
      const fileExists = await RNFS.exists(CONFIG_PATH);
      if (fileExists) {
        const json = await RNFS.readFile(CONFIG_PATH, 'utf8');
        const saved = JSON.parse(json) as Partial<ZeebConfig>;
        set({ config: { ...DEFAULT_CONFIG, ...saved } });
      } else {
        set({ config: { ...DEFAULT_CONFIG } });
      }
    },

    async save() {
      const json = JSON.stringify(get().config);
      await RNFS.writeFile(CONFIG_PATH, json, 'utf8');
    },

    updateConfig(partial: Partial<ZeebConfig>) {
      set((state) => ({ config: { ...state.config, ...partial } }));
    },
  }));
}

const defaultStore = createConfigStore();

export function useConfigStore(): ConfigStoreState;
export function useConfigStore<T>(selector: (state: ConfigStoreState) => T): T;
export function useConfigStore<T>(selector?: (state: ConfigStoreState) => T) {
  return useStore(defaultStore, selector as (state: ConfigStoreState) => T);
}
