import React, { useState } from 'react';
import { buildPosterUrl } from '../../services/tmdbService';

interface PosterGridProps {
  posterPaths: string[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  compact: boolean;
}

export function PosterGrid({ posterPaths, selectedIndex, onSelect, compact }: PosterGridProps): React.JSX.Element | null {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (posterPaths.length === 0) return null;

  return (
    <div className={`flex gap-2 p-2 relative ${compact ? 'overflow-x-auto flex-nowrap' : 'flex-wrap'}`}>
      {posterPaths.map((path, i) => (
        <div
          key={path}
          className={`shrink-0 cursor-pointer border-2 rounded ${
            selectedIndex === i ? 'border-blue-500' : 'border-transparent'
          }`}
          onClick={() => onSelect(i)}
          onMouseEnter={() => setHoverIndex(i)}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <img
            src={buildPosterUrl(path, 'w185')}
            alt={`Poster ${i + 1}`}
            className="w-[92px] h-[138px] object-cover rounded"
          />
        </div>
      ))}
      {hoverIndex !== null && (
        <div className="absolute z-10 top-0 right-0 p-2 bg-white shadow-lg rounded border border-gray-200">
          <img
            data-testid="poster-hover-preview"
            src={buildPosterUrl(posterPaths[hoverIndex], 'w780')}
            alt="Preview"
            className="max-h-[400px] rounded"
          />
        </div>
      )}
    </div>
  );
}
