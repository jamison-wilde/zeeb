import React, { useState, useCallback } from 'react';
import type { RenameTransaction, UndoEntry, UndoResult } from '../../types';
import { useUndoStore } from '../../stores/undoStore';

interface UndoModalProps {
  visible: boolean;
  onClose: () => void;
  onRescan: () => void;
}

interface DisplayTransaction {
  txn: RenameTransaction;
  results: UndoResult[] | null;
}

function getRelativePath(fullPath: string, basePath: string): string {
  const normFull = fullPath.replace(/\\/g, '/');
  const normBase = basePath.replace(/\\/g, '/').replace(/\/$/, '') + '/';
  if (normFull.startsWith(normBase)) {
    return normFull.slice(normBase.length);
  }
  return normFull.split('/').pop() ?? normFull;
}

function extractMovieNames(entries: UndoEntry[]): string[] {
  const names = new Set<string>();
  for (const entry of entries) {
    const path = entry.destPath ?? entry.sourcePath;
    const filename = path.replace(/\\/g, '/').split('/').pop() ?? '';
    const stem = filename.replace(/\.[^.]+$/, '');
    names.add(stem);
  }
  return Array.from(names);
}

function formatMovieNames(names: string[]): string {
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
}

function entryDescription(entry: UndoEntry, basePath: string): string {
  const src = getRelativePath(entry.sourcePath, basePath);
  switch (entry.type) {
    case 'rename': {
      const dst = entry.destPath ? getRelativePath(entry.destPath, basePath) : '';
      return `rename: ${src} \u2192 ${dst}`;
    }
    case 'create': {
      const dst = entry.destPath ? getRelativePath(entry.destPath, basePath) : src;
      return `create: ${dst} (will delete)`;
    }
    case 'delete':
      return `delete: ${src} (will restore)`;
  }
}

function resultDescription(result: UndoResult, basePath: string): React.JSX.Element {
  const src = getRelativePath(result.entry.sourcePath, basePath);
  const icon = result.success ? '\u2713' : '\u2717';
  const color = result.success ? 'text-part-keep' : 'text-part-remove';
  const suffix = result.success ? '' : ` \u2014 ${result.error ?? 'unknown error'}`;
  return (
    <div className={`text-xs pl-6 py-0.5 ${color}`}>
      {icon} {result.entry.type}: {src}{suffix}
    </div>
  );
}

export function UndoModal({ visible, onClose, onRescan }: UndoModalProps): React.JSX.Element | null {
  const transactions = useUndoStore((s) => s.transactions);
  const undoTransaction = useUndoStore((s) => s.undoTransaction);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Maps transaction id -> results (including fully-succeeded ones that were removed from store)
  const [undoResults, setUndoResults] = useState<Map<string, { txn: RenameTransaction; results: UndoResult[] }>>(new Map());
  const [didUndo, setDidUndo] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleUndo = useCallback(async (id: string) => {
    const txn = transactions.find((t) => t.id === id);
    if (!txn) return;
    setPendingIds((prev) => new Set(prev).add(id));
    const results = await undoTransaction(id);
    setUndoResults((prev) => new Map(prev).set(id, { txn, results }));
    setExpandedIds((prev) => new Set(prev).add(id));
    setDidUndo(true);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (results.every((r) => r.success)) {
      setTimeout(() => {
        setUndoResults((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      }, 1000);
    }
  }, [undoTransaction, transactions]);

  const handleClose = useCallback(() => {
    if (didUndo) onRescan();
    setExpandedIds(new Set());
    setUndoResults(new Map());
    setDidUndo(false);
    onClose();
  }, [didUndo, onRescan, onClose]);

  if (!visible) return null;

  // Build display list: merge transactions with any result-only entries (fully succeeded, removed from store)
  const displayItems: DisplayTransaction[] = [];
  const seenIds = new Set<string>();

  for (const txn of transactions) {
    const resultEntry = undoResults.get(txn.id);
    displayItems.push({ txn, results: resultEntry?.results ?? null });
    seenIds.add(txn.id);
  }
  // Add completed transactions still showing their results (removed from store but in undoResults)
  for (const [id, { txn, results }] of undoResults) {
    if (!seenIds.has(id)) {
      displayItems.push({ txn, results });
    }
  }

  const isEmpty = displayItems.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-panel flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-line-subtle">
        <h2 className="text-lg font-bold">Undo History</h2>
        <button data-testid="close-undo" className="text-accent" onClick={handleClose}>
          Close
        </button>
      </div>
      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center p-6 text-ink-faint">
          No undo history
        </div>
      ) : (
        <div data-testid="undo-list" className="flex-1 overflow-y-auto">
          {displayItems.map(({ txn, results }, index) => {
            const isExpanded = expandedIds.has(txn.id);
            const isPending = pendingIds.has(txn.id);
            const movieNames = extractMovieNames(txn.entries);

            return (
              <div key={txn.id} className="border-b border-line-subtle">
                <div className="flex items-center px-3 py-2.5">
                  <button
                    data-testid={`expand-toggle-${index}`}
                    className="mr-2 text-ink-faint hover:text-ink-2 w-4"
                    onClick={() => toggleExpand(txn.id)}
                  >
                    {isExpanded ? '\u25BC' : '\u25B6'}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{formatMovieNames(movieNames)}</p>
                    <p className="text-xs text-ink-dim mt-0.5">
                      {txn.entries.length} {txn.entries.length === 1 ? 'file' : 'files'}
                    </p>
                  </div>
                  {results ? (
                    <span className="px-4 py-1.5 text-ink-faint font-bold text-sm">DONE</span>
                  ) : (
                    <button
                      data-testid={`undo-button-${index}`}
                      className="px-4 py-1.5 bg-part-remove text-on-accent rounded-[3px] font-bold text-sm hover:opacity-90 disabled:opacity-50"
                      onClick={() => handleUndo(txn.id)}
                      disabled={isPending}
                    >
                      {isPending ? '...' : 'UNDO'}
                    </button>
                  )}
                </div>
                {isExpanded && !results && (
                  <div className="pb-2">
                    {txn.entries.map((entry, i) => (
                      <div key={i} className="text-xs text-ink-2 pl-6 py-0.5">
                        {entryDescription(entry, txn.basePath)}
                      </div>
                    ))}
                  </div>
                )}
                {isExpanded && results && (
                  <div className="pb-2">
                    {results.map((result, i) => (
                      <React.Fragment key={i}>
                        {resultDescription(result, txn.basePath)}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
