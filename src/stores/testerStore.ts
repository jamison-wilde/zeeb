import { create } from 'zustand';
import type { MovieMetadata } from '../types';

interface TesterStoreState {
  testerRequest: { tt: string } | null;
  testerResult: MovieMetadata | null;
  testerError: string | null;

  setRequest: (tt: string) => void;
  setResult: (data: MovieMetadata) => void;
  setError: (msg: string) => void;
  clear: () => void;
}

export const useTesterStore = create<TesterStoreState>((set) => ({
  testerRequest: null,
  testerResult: null,
  testerError: null,

  setRequest(tt: string) {
    set({ testerRequest: { tt }, testerResult: null, testerError: null });
  },

  setResult(data: MovieMetadata) {
    set({ testerResult: data });
  },

  setError(msg: string) {
    set({ testerError: msg });
  },

  clear() {
    set({ testerRequest: null, testerResult: null, testerError: null });
  },
}));
