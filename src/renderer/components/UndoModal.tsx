import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';
import type { RenameTransaction } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyStore = StoreApi<any>;

interface UndoModalProps {
  visible: boolean;
  onClose: () => void;
  undoStore: AnyStore;
  onRescan: () => void;
}

export function UndoModal({ visible, onClose, undoStore, onRescan }: UndoModalProps): React.JSX.Element | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transactions: RenameTransaction[] = useStore(undoStore, (s: any) => s.transactions);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold">Undo History</h2>
        <button data-testid="close-undo" className="text-blue-500" onClick={onClose}>
          Close
        </button>
      </div>
      {transactions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 text-gray-500">
          No undo history
        </div>
      ) : (
        <div data-testid="undo-list" className="flex-1 overflow-y-auto">
          {transactions.map((item) => (
            <div key={item.id} className="flex items-center px-3 py-2.5 border-b border-gray-200">
              <div className="flex-1">
                <p className="text-sm">{item.entries.length} {item.entries.length === 1 ? 'file' : 'files'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
