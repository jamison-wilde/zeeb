import { create } from 'zustand';
import { createElectronFsAdapter, type FsAdapter } from '../adapters/fs';
import type { ZeebConfig } from '../types';
import { DEFAULT_CONFIG } from '../services/configDefaults';
import { DEFAULT_MPAA_MAP } from '../utils/defaultTerms';
import { FOLDER_HISTORY_LIMIT } from '../services/folderHistory';

export { DEFAULT_CONFIG };

const CONFIG_FILENAME = 'zeeb-config.json';

interface ConfigStoreState {
  config: ZeebConfig;
  load: () => Promise<void>;
  save: () => Promise<void>;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
  setFs: (adapter: FsAdapter) => void;
}

let fs: FsAdapter = createElectronFsAdapter();
let configPath: string | null = null;

async function getConfigPath(): Promise<string> {
  if (!configPath) {
    const dir = await fs.getConfigDir();
    configPath = `${dir}/${CONFIG_FILENAME}`;
  }
  return configPath;
}

export const useConfigStore = create<ConfigStoreState>((set, get) => ({
  config: { ...DEFAULT_CONFIG },

  async load() {
    const path = await getConfigPath();
    const fileExists = await fs.exists(path);
    if (fileExists) {
      const json = await fs.readFile(path, 'utf8');
      try {
        const saved = JSON.parse(json) as Record<string, unknown>;
        if (Array.isArray(saved.keepTerms)) {
          saved.keepTerms = (saved.keepTerms as unknown[]).map((t) =>
            Array.isArray(t) ? t : [t, t],
          );
        }
        if (saved.mpaaMap && !Array.isArray(saved.mpaaMap)) {
          const entries = Object.entries(saved.mpaaMap as Record<string, string>);
          saved.mpaaMap = entries.length > 0 ? entries : DEFAULT_MPAA_MAP;
        } else if (Array.isArray(saved.mpaaMap) && (saved.mpaaMap as unknown[]).length === 0) {
          saved.mpaaMap = DEFAULT_MPAA_MAP;
        }
        if (!Array.isArray(saved.folderHistory) && Array.isArray(saved.recentFolders)) {
          const depth =
            saved.recursionMode === 'subfolders' || saved.recursionMode === 'full'
              ? saved.recursionMode
              : 'none';
          saved.folderHistory = (saved.recentFolders as unknown[])
            .filter((p): p is string => typeof p === 'string')
            .map((path) => ({ path, depth, fileCount: null, lastScanned: null }));
        }
        if (Array.isArray(saved.folderHistory)) {
          saved.folderHistory = (saved.folderHistory as unknown[])
            .filter(
              (e): e is Record<string, unknown> =>
                !!e && typeof e === 'object' && typeof (e as Record<string, unknown>).path === 'string',
            )
            .map((e) => ({
              path: e.path as string,
              depth: e.depth === 'subfolders' || e.depth === 'full' ? e.depth : 'none',
              fileCount: typeof e.fileCount === 'number' ? e.fileCount : null,
              lastScanned: typeof e.lastScanned === 'number' ? e.lastScanned : null,
            }))
            .slice(0, FOLDER_HISTORY_LIMIT);
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

  updateConfig(partial) {
    set((state) => ({ config: { ...state.config, ...partial } }));
  },

  setFs(adapter) {
    fs = adapter;
    configPath = null;
  },
}));
