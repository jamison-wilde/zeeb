import React, { useCallback } from 'react';

interface BrowseInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  mode: 'file' | 'directory';
}

export function BrowseInput({ value, onChange, placeholder, mode }: BrowseInputProps): React.JSX.Element {
  const handleBrowse = useCallback(async () => {
    const result = mode === 'directory'
      ? await window.zeebDialog.openDirectory()
      : await window.zeebDialog.openFile();
    if (result) {
      onChange(result);
    }
  }, [mode, onChange]);

  return (
    <div className="flex gap-2">
      <input
        className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm"
        onClick={handleBrowse}
      >
        Browse
      </button>
    </div>
  );
}
