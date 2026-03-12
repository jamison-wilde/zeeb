import { createStore, type StoreApi } from 'zustand/vanilla';
import type { MovieFile } from '../types';

interface FileStoreState {
  files: MovieFile[];
  setFiles: (files: MovieFile[]) => void;
  updateFile: (id: string, updates: Partial<MovieFile>) => void;
  clear: () => void;
}

export function createFileStore(): StoreApi<FileStoreState> {
  return createStore<FileStoreState>((set) => ({
    files: [],

    setFiles(files: MovieFile[]) {
      set({ files });
    },

    updateFile(id: string, updates: Partial<MovieFile>) {
      set((state) => ({
        files: state.files.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      }));
    },

    clear() {
      set({ files: [] });
    },
  }));
}
