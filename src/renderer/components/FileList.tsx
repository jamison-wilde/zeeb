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
            className={`w-full text-left px-2 py-0.5 flex items-center gap-1.5 ${
              index === selectedIndex ? 'bg-row-selected' : ''
            } ${!visible ? 'opacity-30' : ''}`}
            onClick={() => onSelect(index)}
          >
            <span className={`flex-1 font-mono text-[11px] truncate ${index === selectedIndex ? 'text-ink-bright' : 'text-ink-2'}`}>
              {file.name}
            </span>
            {file.hasNfo && (
              <span className={`font-mono font-bold text-[8px] border rounded-[3px] px-[3px] py-px shrink-0 ${
                index === selectedIndex ? 'text-accent border-accent-muted' : 'text-ink-faint border-line'
              }`}>
                NFO
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
