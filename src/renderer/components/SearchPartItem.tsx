import React from 'react';
import type { SearchPart, SearchPartState } from '../../types';

interface SearchPartItemProps {
  part: SearchPart;
  onStateChange: (id: string, state: SearchPartState) => void;
  onTextChange: (id: string, text: string) => void;
}

const STATE_COLORS: Record<SearchPartState, string> = {
  search: 'border-blue-500 text-blue-500',
  keep: 'border-green-500 text-green-500',
  remove: 'border-red-500 text-red-500',
  keepAlways: 'border-green-800 text-green-800',
  removeAlways: 'border-red-900 text-red-900',
};

const NEXT_STATE: Record<SearchPartState, SearchPartState> = {
  search: 'keep',
  keep: 'remove',
  remove: 'search',
  keepAlways: 'removeAlways',
  removeAlways: 'keepAlways',
};

export function SearchPartItem({ part, onStateChange }: SearchPartItemProps): React.JSX.Element {
  return (
    <button
      className={`px-2 py-1 mr-1 border rounded text-sm ${STATE_COLORS[part.state]}`}
      onClick={() => onStateChange(part.id, NEXT_STATE[part.state])}
    >
      {part.text}
    </button>
  );
}
