import React from 'react';
import type { MovieMatch } from '../../types';

interface MovieResultsProps {
  matches: MovieMatch[];
  onSelect: (tt: string) => void;
}

export function MovieResults({ matches, onSelect }: MovieResultsProps): React.JSX.Element {
  if (matches.length === 0) {
    return (
      <div className="p-3 text-center text-xs text-gray-500">No results</div>
    );
  }

  return (
    <div data-testid="movie-results-list" className="overflow-y-auto max-h-48">
      {matches.map((item) => (
        <button
          key={item.tt}
          className="w-full text-left px-2 py-1.5 border-b border-gray-200 hover:bg-blue-50 text-xs truncate"
          onClick={() => onSelect(item.tt)}
          title={`${item.title}${item.year ? ` (${item.year})` : ''} — ${item.tt}`}
        >
          <span className="font-medium">{item.title || item.tt}</span>
          {item.year && <span className="text-gray-500 ml-1">({item.year})</span>}
          {item.aka && <span className="text-gray-400 ml-1 italic">aka {item.aka}</span>}
        </button>
      ))}
    </div>
  );
}
