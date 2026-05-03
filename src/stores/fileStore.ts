import { create } from 'zustand';
import type { MovieFile } from '../types';

interface FileStoreState {
  files: MovieFile[];
  setFiles: (files: MovieFile[]) => void;
  updateFile: (id: string, updates: Partial<MovieFile>) => void;
  clear: () => void;
}

export const useFileStore = create<FileStoreState>((set) => ({
  files: [],

  setFiles(files) {
    set({ files });
  },

  updateFile(id, updates) {
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  },

  clear() {
    set({ files: [] });
  },
}));
