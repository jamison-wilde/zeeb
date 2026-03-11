import { createStore, type StoreApi } from 'zustand/vanilla';
import type { MovieFile } from '../types';

interface FileStoreState {
  files: MovieFile[];
  setFiles: (files: MovieFile[]) => void;
  clear: () => void;
  getFilteredFiles: (showSamples: boolean) => MovieFile[];
}

export function createFileStore(): StoreApi<FileStoreState> {
  return createStore<FileStoreState>((set, get) => ({
    files: [],

    setFiles(files: MovieFile[]) {
      set({ files });
    },

    clear() {
      set({ files: [] });
    },

    getFilteredFiles(showSamples: boolean): MovieFile[] {
      const { files } = get();
      if (showSamples) return files;
      return files.filter((f) => !f.name.toLowerCase().includes('.sample.'));
    },
  }));
}
