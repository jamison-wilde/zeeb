import { createStore, type StoreApi } from 'zustand/vanilla';
import type { FsAdapter } from '../adapters/fs';
import type { UndoEntry, RenameTransaction, UndoResult } from '../types';

interface UndoStoreState {
  transactions: RenameTransaction[];
  pendingTransaction: { entries: UndoEntry[] } | null;
  beginTransaction: () => void;
  addEntry: (entry: UndoEntry) => void;
  commitTransaction: (basePath: string, maxUndos?: number) => void;
  discardTransaction: () => void;
  undoTransaction: (id: string) => Promise<UndoResult[]>;
}

export function createUndoStore(fs: FsAdapter): StoreApi<UndoStoreState> {
  return createStore<UndoStoreState>((set, get) => ({
    transactions: [],
    pendingTransaction: null,

    beginTransaction() {
      set({ pendingTransaction: { entries: [] } });
    },

    addEntry(entry: UndoEntry) {
      const pending = get().pendingTransaction;
      if (!pending) return;
      set({
        pendingTransaction: {
          entries: [...pending.entries, entry],
        },
      });
    },

    commitTransaction(basePath: string, maxUndos?: number) {
      const pending = get().pendingTransaction;
      if (!pending) return;
      if (maxUndos === 0) {
        set({ pendingTransaction: null });
        return;
      }
      const transaction: RenameTransaction = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        timestamp: Date.now(),
        basePath,
        entries: pending.entries,
      };
      set((state) => {
        let txns = [...state.transactions, transaction];
        if (maxUndos != null && maxUndos > 0 && txns.length > maxUndos) {
          txns = txns.slice(txns.length - maxUndos);
        }
        return { transactions: txns, pendingTransaction: null };
      });
    },

    discardTransaction() {
      set({ pendingTransaction: null });
    },

    async undoTransaction(id: string): Promise<UndoResult[]> {
      const transaction = get().transactions.find((t) => t.id === id);
      if (!transaction) return [];

      const results: UndoResult[] = [];
      const reversed = [...transaction.entries].reverse();
      for (const entry of reversed) {
        try {
          switch (entry.type) {
            case 'rename':
              if (entry.destPath) {
                await fs.rename(entry.destPath, entry.sourcePath);
              }
              break;
            case 'create':
              if (entry.destPath) {
                await fs.unlink(entry.destPath);
              }
              break;
            case 'delete':
              if (entry.content != null) {
                await fs.writeFile(entry.sourcePath, entry.content, 'utf-8');
              }
              break;
          }
          results.push({ entry, success: true });
        } catch (error) {
          results.push({
            entry,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const failedEntries = results.filter((r) => !r.success).map((r) => r.entry);
      if (failedEntries.length === 0) {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
      } else {
        const retryTransaction: RenameTransaction = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          timestamp: Date.now(),
          basePath: transaction.basePath,
          entries: failedEntries,
        };
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? retryTransaction : t,
          ),
        }));
      }

      return results;
    },
  }));
}
