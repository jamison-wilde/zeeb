import React from 'react';
import type { MovieFile } from '../../types';

interface FileListProps {
  files: MovieFile[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function FileList({ files, selectedIndex, onSelect }: FileListProps): React.JSX.Element {
  return (
    <div data-testid="file-list" className="overflow-y-auto max-h-48">
      {files.map((file, index) => (
        <button
          key={file.id}
          className={`w-full text-left px-3 py-2.5 border-b border-gray-200 flex items-center ${
            index === selectedIndex ? 'bg-blue-100' : 'hover:bg-gray-50'
          }`}
          onClick={() => onSelect(index)}
        >
          <span className="flex-1 text-xs">{file.name}</span>
          {file.hasNfo && (
            <span className="text-xs text-blue-500 font-bold ml-2">NFO</span>
          )}
        </button>
      ))}
    </div>
  );
}
