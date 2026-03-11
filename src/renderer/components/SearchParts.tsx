import React from 'react';
import type { SearchPart, SearchPartState } from '../../types';
import { SearchPartItem } from './SearchPartItem';

interface SearchPartsProps {
  parts: SearchPart[];
  onPartStateChange: (id: string, state: SearchPartState) => void;
  onPartTextChange: (id: string, text: string) => void;
  onSearch: () => void;
}

export function SearchParts({
  parts,
  onPartStateChange,
  onPartTextChange,
  onSearch,
}: SearchPartsProps): React.JSX.Element {
  return (
    <div className="p-2">
      <div data-testid="search-parts-row" className="flex overflow-x-auto mb-2">
        {parts.map((part) => (
          <SearchPartItem
            key={part.id}
            part={part}
            onStateChange={onPartStateChange}
            onTextChange={onPartTextChange}
          />
        ))}
      </div>
      <button
        data-testid="search-button"
        className="w-full bg-blue-500 text-white py-2 rounded font-bold hover:bg-blue-600"
        onClick={onSearch}
      >
        Search
      </button>
    </div>
  );
}
