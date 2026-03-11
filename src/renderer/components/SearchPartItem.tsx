import React from 'react';
import type { SearchPart, SearchPartState } from '../../types';

interface SearchPartItemProps {
  part: SearchPart;
  onStateChange: (id: string, state: SearchPartState) => void;
  onTextChange: (id: string, text: string) => void;
}

const CONTAINER_COLORS: Record<SearchPartState, string> = {
  search: 'border-gray-400 bg-gray-100 text-gray-800',
  keep: 'border-green-500 bg-green-100 text-green-900',
  keepAlways: 'border-green-700 bg-green-200 text-green-900',
  remove: 'border-red-500 bg-red-100 text-red-900',
  removeAlways: 'border-red-700 bg-red-200 text-red-900',
};

const INPUT_COLORS: Record<SearchPartState, string> = {
  search: 'bg-gray-100 text-gray-800',
  keep: 'bg-green-100 text-green-900',
  keepAlways: 'bg-green-200 text-green-900',
  remove: 'bg-red-100 text-red-900',
  removeAlways: 'bg-red-200 text-red-900',
};

interface ActionButton {
  label: string;
  state: SearchPartState;
  title: string;
}

const ACTION_BUTTONS: ActionButton[] = [
  { label: '?', state: 'search', title: 'Search (include in query)' },
  { label: '+', state: 'keep', title: 'Keep (append to filename)' },
  { label: '★', state: 'keepAlways', title: 'Keep Always (save permanently)' },
  { label: '−', state: 'remove', title: 'Remove (exclude this time)' },
  { label: '×', state: 'removeAlways', title: 'Remove Always (save permanently)' },
];

const ACTIVE_BUTTON_COLORS: Record<SearchPartState, string> = {
  search: 'bg-gray-500 text-white',
  keep: 'bg-green-500 text-white',
  keepAlways: 'bg-green-700 text-white',
  remove: 'bg-red-500 text-white',
  removeAlways: 'bg-red-700 text-white',
};

export function SearchPartItem({ part, onStateChange, onTextChange }: SearchPartItemProps): React.JSX.Element {
  return (
    <div
      className={`inline-flex flex-col mr-1 mb-1 border rounded text-sm ${CONTAINER_COLORS[part.state]}`}
      style={{ minWidth: '48px' }}
    >
      <input
        className={`px-2 pt-1 pb-0 w-full text-center text-sm font-medium bg-transparent border-none outline-none ${INPUT_COLORS[part.state]}`}
        value={part.text}
        onChange={(e) => onTextChange(part.id, e.target.value)}
        style={{ minWidth: '32px', width: `${Math.max(part.text.length, 3)}ch` }}
      />
      <div className="flex justify-center gap-0.5 px-1 pb-1 pt-0.5">
        {ACTION_BUTTONS.map(({ label, state, title }) => (
          <button
            key={state}
            title={title}
            className={`w-5 h-5 flex items-center justify-center rounded text-xs leading-none transition-colors
              ${part.state === state
                ? ACTIVE_BUTTON_COLORS[state]
                : 'hover:bg-black/10 text-current opacity-60 hover:opacity-100'
              }`}
            onClick={() => onStateChange(part.id, state)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
