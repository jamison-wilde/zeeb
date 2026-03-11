import React from 'react';
import type { RenameTransaction } from '../../types';

interface UndoModalProps {
  visible: boolean;
  onClose: () => void;
  transactions: RenameTransaction[];
  onUndo: (id: string) => void;
}

export function UndoModal({ visible, onClose, transactions, onUndo }: UndoModalProps): React.JSX.Element | null {
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
                <p className="text-sm">{new Date(item.timestamp).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.entries.length} {item.entries.length === 1 ? 'file' : 'files'}
                </p>
              </div>
              <button
                data-testid={`undo-button-${item.id}`}
                className="px-4 py-1.5 bg-red-500 text-white rounded font-bold text-sm hover:bg-red-600"
                onClick={() => onUndo(item.id)}
              >
                Undo
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
