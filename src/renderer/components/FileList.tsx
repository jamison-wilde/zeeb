import React from 'react';
import type { MovieFile } from '../../types';

interface FileListProps {
  files: MovieFile[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isFileVisible?: (file: MovieFile) => boolean;
}

export function FileList({ files, selectedIndex, onSelect, isFileVisible }: FileListProps): React.JSX.Element {
  return (
    <div data-testid="file-list" className="overflow-y-auto">
      {files.map((file, index) => {
        const visible = isFileVisible ? isFileVisible(file) : true;
        return (
          <button
            key={file.id}
            className={`w-full text-left px-2 py-1.5 border-b border-gray-200 flex items-center ${
              index === selectedIndex ? 'bg-blue-100' : 'hover:bg-gray-50'
            } ${!visible ? 'opacity-30' : ''}`}
            onClick={() => onSelect(index)}
          >
            <span className="flex-1 text-xs truncate">{file.name}</span>
            {file.hasNfo && (
              <span className="text-[10px] text-blue-500 font-bold ml-1 shrink-0">NFO</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
