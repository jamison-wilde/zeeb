import React, { useState } from 'react';
import { usePlatform } from '../PlatformContext';

interface FolderBrowserProps {
  onFolderSelected: (path: string, recursionMode: string) => void;
  recentFolders: string[];
  onRemoveRecentFolder?: (folder: string) => void;
  initialRecursionMode?: 'none' | 'subfolders' | 'full';
}

type RecursionMode = 'none' | 'subfolders' | 'full';

const RECURSION_OPTIONS: { label: string; value: RecursionMode; tooltip: string }[] = [
  { label: 'None', value: 'none', tooltip: 'Only look in this directory, not in subfolders' },
  { label: 'Subfolders', value: 'subfolders', tooltip: 'Look one level deep into immediate subfolders, but not deeper' },
  { label: 'Full', value: 'full', tooltip: 'Recursively look in all subfolders at every level' },
];

export function FolderBrowser({ onFolderSelected, recentFolders, onRemoveRecentFolder, initialRecursionMode = 'none' }: FolderBrowserProps): React.JSX.Element {
  const platform = usePlatform();
  const [folderPath, setFolderPath] = useState(recentFolders[0] ?? '');
  const [recursionMode, setRecursionMode] = useState<RecursionMode>(initialRecursionMode);

  const handleBrowse = async (): Promise<void> => {
    const path = await platform.dialog.openDirectory();
    if (path) setFolderPath(path);
  };

  return (
    <div className="flex-1 p-4">
      <div className="flex gap-2 mb-3">
        <input
          data-testid="folder-path-input"
          className="flex-1 border border-line rounded px-2 py-1.5 bg-panel text-ink"
          value={folderPath}
          onChange={(e) => setFolderPath(e.target.value)}
          placeholder="Enter folder path..."
        />
        <button
          data-testid="browse-button"
          className="px-3 py-1.5 border border-toggle-off text-ink-2 rounded-[3px] shrink-0"
          onClick={handleBrowse}
        >
          Browse...
        </button>
        <button
          data-testid="list-movies-button"
          disabled={!folderPath.trim()}
          className="px-3 py-1.5 bg-accent text-on-accent rounded-[3px] hover:opacity-90 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onFolderSelected(folderPath, recursionMode)}
        >
          List Movies
        </button>
      </div>

      <div data-testid="recent-folders" className="flex gap-2 mb-3 overflow-x-auto max-h-10">
        {recentFolders.map((folder, index) => (
          <div key={index} className="flex items-center bg-well rounded text-sm shrink-0">
            <button
              className="px-2 py-1 whitespace-nowrap hover:bg-raised rounded-l-[3px]"
              onClick={() => onFolderSelected(folder, recursionMode)}
            >
              {folder}
            </button>
            <button
              className="px-1 py-1 text-part-remove hover:text-part-remove-always hover:bg-raised rounded-r-[3px] text-xs font-bold"
              onClick={() => onRemoveRecentFolder?.(folder)}
              title="Remove"
            >
              x
            </button>
          </div>
        ))}
      </div>

      <div data-testid="recursion-mode" className="flex gap-2 mb-3">
        {RECURSION_OPTIONS.map((option) => (
          <button
            key={option.value}
            title={option.tooltip}
            className={`px-2 py-1 border rounded-[3px] ${
              recursionMode === option.value
                ? 'bg-accent border-accent text-on-accent'
                : 'border-line text-ink-2'
            }`}
            onClick={() => setRecursionMode(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-ink-faint italic">
        Note: Listing movies can take several seconds or more, especially on network shares or when including subfolders.
      </p>
    </div>
  );
}
