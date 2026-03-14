import React, { useState } from 'react';

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
  const [folderPath, setFolderPath] = useState(recentFolders[0] ?? '');
  const [recursionMode, setRecursionMode] = useState<RecursionMode>(initialRecursionMode);

  const handleBrowse = async (): Promise<void> => {
    const zeebDialog = (window as any).zeebDialog;
    if (zeebDialog) {
      const path = await zeebDialog.openDirectory();
      if (path) setFolderPath(path);
    }
  };

  return (
    <div className="flex-1 p-4">
      <div className="flex gap-2 mb-3">
        <input
          data-testid="folder-path-input"
          className="flex-1 border border-gray-300 rounded px-2 py-1.5"
          value={folderPath}
          onChange={(e) => setFolderPath(e.target.value)}
          placeholder="Enter folder path..."
        />
        <button
          data-testid="browse-button"
          className="px-3 py-1.5 bg-gray-200 rounded hover:bg-gray-300 shrink-0"
          onClick={handleBrowse}
        >
          Browse...
        </button>
        <button
          data-testid="list-movies-button"
          className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 shrink-0"
          onClick={() => onFolderSelected(folderPath, recursionMode)}
        >
          List Movies
        </button>
      </div>

      <div data-testid="recent-folders" className="flex gap-2 mb-3 overflow-x-auto max-h-10">
        {recentFolders.map((folder, index) => (
          <div key={index} className="flex items-center bg-gray-200 rounded text-sm shrink-0">
            <button
              className="px-2 py-1 whitespace-nowrap hover:bg-gray-300 rounded-l"
              onClick={() => onFolderSelected(folder, recursionMode)}
            >
              {folder}
            </button>
            <button
              className="px-1 py-1 text-red-500 hover:text-red-700 hover:bg-gray-300 rounded-r text-xs font-bold"
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
            className={`px-2 py-1 border rounded ${
              recursionMode === option.value
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-gray-300'
            }`}
            onClick={() => setRecursionMode(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 italic">
        Note: Listing movies can take several seconds or more, especially on network shares or when including subfolders.
      </p>
    </div>
  );
}
