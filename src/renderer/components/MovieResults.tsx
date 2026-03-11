import React from 'react';
import type { MovieMatch } from '../../types';

interface MovieResultsProps {
  matches: MovieMatch[];
  onSelect: (tt: string) => void;
}

export function MovieResults({ matches, onSelect }: MovieResultsProps): React.JSX.Element {
  if (matches.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">No results</div>
    );
  }

  return (
    <div data-testid="movie-results-list" className="overflow-y-auto max-h-48">
      {matches.map((item) => (
        <button
          key={item.tt}
          className="w-full text-left px-3 py-2.5 border-b border-gray-200 hover:bg-gray-50"
          onClick={() => onSelect(item.tt)}
        >
          {item.title} ({item.year})
        </button>
      ))}
    </div>
  );
}
