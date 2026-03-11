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

// Grid layout (2 cols, 3 rows):
// Row 1: [? search]   [− remove]
// Row 2: [+ keep]     [× removeAlways]
// Row 3: [★ keepAlways] [empty]
const ACTION_BUTTONS: (ActionButton | null)[] = [
  { label: '?', state: 'search', title: 'Search (include in query)' },
  { label: '−', state: 'remove', title: 'Remove (exclude this time)' },
  { label: '+', state: 'keep', title: 'Keep (append to filename)' },
  { label: '×', state: 'removeAlways', title: 'Remove Always (save permanently)' },
  { label: '★', state: 'keepAlways', title: 'Keep Always (save permanently)' },
  null,
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
        className={`px-1 pt-1 pb-0 w-full text-center text-xs font-medium bg-transparent border-none outline-none ${INPUT_COLORS[part.state]}`}
        value={part.text}
        onChange={(e) => onTextChange(part.id, e.target.value)}
        style={{ width: `${Math.max(part.text.length + 1, 3)}ch` }}
      />
      <div className="grid grid-cols-2 gap-0.5 px-1 pb-1 pt-0.5">
        {ACTION_BUTTONS.map((btn, i) =>
          btn === null ? (
            <span key={`empty-${i}`} />
          ) : (
            <button
              key={btn.state}
              title={btn.title}
              className={`w-6 h-6 flex items-center justify-center rounded text-sm leading-none transition-colors
                ${part.state === btn.state
                  ? ACTIVE_BUTTON_COLORS[btn.state]
                  : 'hover:bg-black/10 text-current opacity-60 hover:opacity-100'
                }`}
              onClick={() => onStateChange(part.id, btn.state)}
            >
              {btn.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}
