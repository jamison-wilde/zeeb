import React, { useState } from 'react';

interface FolderBrowserProps {
  onFolderSelected: (path: string, recursionMode: string) => void;
  recentFolders: string[];
}

type RecursionMode = 'none' | 'subfolders' | 'full';

const RECURSION_OPTIONS: { label: string; value: RecursionMode }[] = [
  { label: 'None', value: 'none' },
  { label: 'Subfolders', value: 'subfolders' },
  { label: 'Full', value: 'full' },
];

export function FolderBrowser({ onFolderSelected, recentFolders }: FolderBrowserProps): React.JSX.Element {
  const [folderPath, setFolderPath] = useState('');
  const [recursionMode, setRecursionMode] = useState<RecursionMode>('none');

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
          className="px-3 py-1.5 bg-gray-200 rounded hover:bg-gray-300"
          onClick={handleBrowse}
        >
          Browse...
        </button>
      </div>

      <div data-testid="recent-folders" className="flex gap-2 mb-3 overflow-x-auto max-h-10">
        {recentFolders.map((folder, index) => (
          <button
            key={index}
            className="px-2 py-1 bg-gray-200 rounded whitespace-nowrap text-sm"
            onClick={() => setFolderPath(folder)}
          >
            {folder}
          </button>
        ))}
      </div>

      <div data-testid="recursion-mode" className="flex gap-2 mb-3">
        {RECURSION_OPTIONS.map((option) => (
          <button
            key={option.value}
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

      <button
        data-testid="list-movies-button"
        className="w-full bg-blue-500 text-white py-2.5 rounded hover:bg-blue-600"
        onClick={() => onFolderSelected(folderPath, recursionMode)}
      >
        List Movies
      </button>
    </div>
  );
}
