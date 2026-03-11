import { createStore, type StoreApi } from 'zustand/vanilla';
import type { SearchPart, SearchPartState, MovieMatch, MovieMetadata } from '../types';

interface RenamerStoreState {
  currentIndex: number;
  searchParts: SearchPart[];
  movieMatches: MovieMatch[];
  metadata: MovieMetadata | null;
  posterUrls: string[];
  previewFilename: string;

  setCurrentIndex: (index: number) => void;
  setSearchParts: (parts: SearchPart[]) => void;
  updatePartState: (id: string, state: SearchPartState) => void;
  updatePartText: (id: string, text: string) => void;
  setMovieMatches: (matches: MovieMatch[]) => void;
  setMetadata: (metadata: MovieMetadata | null) => void;
  setPosterUrls: (urls: string[]) => void;
  setPreviewFilename: (filename: string) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  currentIndex: 0,
  searchParts: [] as SearchPart[],
  movieMatches: [] as MovieMatch[],
  metadata: null as MovieMetadata | null,
  posterUrls: [] as string[],
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

    setMovieMatches(matches: MovieMatch[]) {
      set({ movieMatches: matches });
    },

    setMetadata(metadata: MovieMetadata | null) {
      set({ metadata });
    },

    setPosterUrls(urls: string[]) {
      set({ posterUrls: urls });
    },

    setPreviewFilename(filename: string) {
      set({ previewFilename: filename });
    },

    reset() {
      set({ ...INITIAL_STATE });
    },
  }));
}
