import { createStore, type StoreApi } from 'zustand/vanilla';
import type { FsAdapter } from '../adapters/fs';
import type { UndoEntry, RenameTransaction } from '../types';

interface UndoStoreState {
  transactions: RenameTransaction[];
  pendingTransaction: { entries: UndoEntry[] } | null;
  beginTransaction: () => void;
  addEntry: (entry: UndoEntry) => void;
  commitTransaction: (maxUndos?: number) => void;
  discardTransaction: () => void;
  undoTransaction: (id: string) => Promise<void>;
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

    commitTransaction(maxUndos?: number) {
      const pending = get().pendingTransaction;
      if (!pending) return;
      if (maxUndos === 0) {
        set({ pendingTransaction: null });
        return;
      }
      const transaction: RenameTransaction = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        timestamp: Date.now(),
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

    async undoTransaction(id: string) {
      const transaction = get().transactions.find((t) => t.id === id);
      if (!transaction) return;

      const errors: Array<{ entry: UndoEntry; error: unknown }> = [];
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
        } catch (error) {
          errors.push({ entry, error });
        }
      }

      if (errors.length === 0) {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
      }
      if (errors.length > 0) {
        throw new Error(
          `Undo partially failed: ${errors.length}/${reversed.length} entries failed`,
        );
      }
    },
  }));
}
