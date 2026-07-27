import React, { useCallback, useEffect, useState } from 'react';
import { usePlatform } from '../PlatformContext';
import { formatRelativeTime } from '../../utils/relativeTime';
import type { FolderHistoryEntry, RecursionMode } from '../../types';

export interface OpenFolderModalProps {
  visible: boolean;
  history: FolderHistoryEntry[];
  onClose: () => void;
  onSelect: (path: string, depth: RecursionMode) => void;
  onRemove: (path: string) => void;
}

const DEPTH_OPTIONS: { label: string; value: RecursionMode; tooltip: string }[] = [
  { label: 'None', value: 'none', tooltip: 'Only look in this directory, not in subfolders' },
  { label: 'Sub', value: 'subfolders', tooltip: 'Look one level deep into immediate subfolders, but not deeper' },
  { label: 'Full', value: 'full', tooltip: 'Recursively look in all subfolders at every level' },
];

const DEPTH_BADGE: Record<RecursionMode, string> = {
  none: 'None',
  subfolders: 'Sub',
  full: 'Full',
};

export function OpenFolderModal({
  visible,
  history,
  onClose,
  onSelect,
  onRemove,
}: OpenFolderModalProps): React.JSX.Element | null {
  const platform = usePlatform();
  const [path, setPath] = useState('');
  const [depth, setDepth] = useState<RecursionMode>('none');

  useEffect(() => {
    if (!visible) return;
    setPath(history[0]?.path ?? '');
    setDepth(history[0]?.depth ?? 'none');
    // Only reset when the modal opens; history churn while open must not clobber edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  const stagePath = useCallback(
    (value: string) => {
      setPath(value);
      const match = history.find((h) => h.path.toLowerCase() === value.toLowerCase());
      setDepth(match ? match.depth : 'none');
    },
    [history],
  );

  const submit = useCallback(() => {
    const trimmed = path.trim();
    if (trimmed) onSelect(trimmed, depth);
  }, [path, depth, onSelect]);

  const handleBrowse = useCallback(async () => {
    const chosen = await platform.dialog.openDirectory();
    if (chosen) stagePath(chosen);
  }, [platform, stagePath]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-start justify-center pt-11">
      <div
        data-testid="open-folder-modal"
        className="w-[680px] bg-modal border border-toggle-off rounded-lg shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-line">
          <span className="text-xs font-bold text-ink">Open Movie Folder</span>
          <span className="flex-1" />
          <button
            data-testid="close-open-folder"
            className="text-ink-faint text-base leading-none px-1"
            title="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-2.5">
          <input
            data-testid="folder-path-input"
            className="flex-1 font-mono text-body text-ink-bright bg-well border border-accent-muted rounded-[3px] px-2 py-1"
            value={path}
            onChange={(e) => stagePath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="Enter folder path..."
          />
          <span data-testid="recursion-mode" className="flex border border-toggle-off rounded-[3px] overflow-hidden shrink-0">
            {DEPTH_OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                title={opt.tooltip}
                aria-pressed={depth === opt.value}
                className={`text-label font-semibold px-2 py-1 ${i > 0 ? 'border-l border-toggle-off' : ''} ${
                  depth === opt.value ? 'bg-accent text-on-accent' : 'text-ink-dim'
                }`}
                onClick={() => setDepth(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </span>
          <button
            data-testid="browse-button"
            className="text-label font-bold border border-toggle-off text-ink-2 rounded-[3px] px-2.5 py-1 shrink-0"
            onClick={handleBrowse}
          >
            Browse…
          </button>
          <button
            data-testid="list-movies-button"
            disabled={!path.trim()}
            className="text-label font-bold bg-accent text-on-accent rounded-[3px] px-3 py-1 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={submit}
          >
            List Movies
          </button>
        </div>

        <div className="px-3 pb-1 text-badge font-bold uppercase tracking-[0.07em] text-ink-faint">
          History — ▶ lists with saved depth
        </div>
        <div className="pb-1.5">
          {history.map((entry, i) => (
            <div key={entry.path} data-testid={`history-row-${i}`} className="flex items-center gap-2 px-3 py-1">
              <button
                data-testid={`history-scan-${i}`}
                title="List now with saved depth"
                className="w-5 h-4 flex items-center justify-center rounded-[3px] bg-row-selected text-accent text-label shrink-0"
                onClick={() => onSelect(entry.path, entry.depth)}
              >
                ▶
              </button>
              <button
                title="Load into the row above"
                className="flex-1 text-left font-mono font-semibold text-body text-ink-2 truncate"
                onClick={() => stagePath(entry.path)}
              >
                {entry.path}
              </button>
              {entry.fileCount !== null && entry.lastScanned !== null && (
                <span className="text-label text-ink-faint whitespace-nowrap shrink-0">
                  {entry.fileCount} files · scanned {formatRelativeTime(entry.lastScanned)}
                </span>
              )}
              <span className="text-micro font-mono font-bold bg-toggle-off text-ink-2 rounded-[2px] px-[5px] py-[2px] shrink-0">
                {DEPTH_BADGE[entry.depth]}
              </span>
              <button
                data-testid={`history-remove-${i}`}
                title="Remove from history"
                className="text-body font-mono font-bold text-ink-faint px-0.5"
                onClick={() => onRemove(entry.path)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <p className="px-3 py-1.5 text-label text-ink-dim italic border-t border-line">
          Note: Listing movies can take several seconds or more, especially on network shares or when including subfolders.
        </p>
      </div>
    </div>
  );
}
