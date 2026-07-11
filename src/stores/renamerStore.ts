import { createStore, type StoreApi } from 'zustand/vanilla';
import type { SearchPart, SearchPartState, MovieMatch, MovieMetadata } from '../types';

interface RenamerStoreState {
  currentIndex: number;
  searchParts: SearchPart[];
  movieMatches: MovieMatch[];
  metadata: MovieMetadata | null;
  posterPaths: string[];
  previewFilename: string;

  setCurrentIndex: (index: number) => void;
  setSearchParts: (parts: SearchPart[]) => void;
  updatePartState: (id: string, state: SearchPartState) => void;
  updatePartText: (id: string, text: string) => void;
  mergeParts: (sourceId: string, targetId: string) => void;
  reorderParts: (sourceId: string, targetIndex: number) => void;
  setMovieMatches: (matches: MovieMatch[]) => void;
  setMetadata: (metadata: MovieMetadata | null) => void;
  appendAkas: (akas: string[]) => void;
  setPosterPaths: (paths: string[]) => void;
  setPreviewFilename: (filename: string) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  currentIndex: 0,
  searchParts: [] as SearchPart[],
  movieMatches: [] as MovieMatch[],
  metadata: null as MovieMetadata | null,
  posterPaths: [] as string[],
  previewFilename: '',
};

export function createRenamerStore(): StoreApi<RenamerStoreState> {
  return createStore<RenamerStoreState>((set) => ({
    ...INITIAL_STATE,

    setCurrentIndex(index: number) {
      set({ currentIndex: index });
    },

    setSearchParts(parts: SearchPart[]) {
      set({ searchParts: parts });
    },

    updatePartState(id: string, state: SearchPartState) {
      set((s) => ({
        searchParts: s.searchParts.map((p) =>
          p.id === id ? { ...p, state } : p,
        ),
      }));
    },

    updatePartText(id: string, text: string) {
      set((s) => ({
        searchParts: s.searchParts.map((p) =>
          p.id === id ? { ...p, text } : p,
        ),
      }));
    },

    mergeParts(sourceId: string, targetId: string) {
      set((s) => {
        const parts = s.searchParts;
        const si = parts.findIndex((p) => p.id === sourceId);
        const ti = parts.findIndex((p) => p.id === targetId);
        if (si < 0 || ti < 0 || si === ti) return s;
        const first = parts[Math.min(si, ti)];
        const second = parts[Math.max(si, ti)];
        const target = parts[ti];
        const merged: SearchPart = {
          ...target,
          text: `${first.text}${first.separatorAfter || '.'}${second.text}`,
          separatorAfter: second.separatorAfter,
        };
        const result = parts.filter((_, i) => i !== si && i !== ti);
        result.splice(Math.min(si, ti), 0, merged);
        return { searchParts: result };
      });
    },

    reorderParts(sourceId: string, targetIndex: number) {
      set((s) => {
        const si = s.searchParts.findIndex((p) => p.id === sourceId);
        if (si < 0) return s;
        const moved = s.searchParts[si];
        const rest = s.searchParts.filter((_, i) => i !== si);
        const idx = Math.max(0, Math.min(targetIndex, rest.length));
        rest.splice(idx, 0, moved);
        return { searchParts: rest };
      });
    },

    setMovieMatches(matches: MovieMatch[]) {
      set({ movieMatches: matches });
    },

    setMetadata(metadata: MovieMetadata | null) {
      set({ metadata });
    },

    appendAkas(akas: string[]) {
      set((s) => {
        if (!s.metadata) return s;
        const existing = new Set(s.metadata.aka);
        const merged = [...s.metadata.aka];
        for (const a of akas) {
          if (!existing.has(a)) {
            existing.add(a);
            merged.push(a);
          }
        }
        return { metadata: { ...s.metadata, aka: merged } };
      });
    },

    setPosterPaths(paths: string[]) {
      set({ posterPaths: paths });
    },

    setPreviewFilename(filename: string) {
      set({ previewFilename: filename });
    },

    reset() {
      set({ ...INITIAL_STATE });
    },
  }));
}
