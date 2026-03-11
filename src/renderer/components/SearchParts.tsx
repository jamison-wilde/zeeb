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
    <div data-testid="search-parts-row" className="flex flex-nowrap px-1 py-1">
      {parts.map((part) => (
        <SearchPartItem
          key={part.id}
          part={part}
          onStateChange={onPartStateChange}
          onTextChange={onPartTextChange}
        />
      ))}
    </div>
  );
}
