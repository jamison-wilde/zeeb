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

const ACTION_BUTTONS: (ActionButton | null)[] = [
  { label: '?', state: 'search', title: 'Search' },
  { label: '−', state: 'remove', title: 'Remove' },
  { label: '+', state: 'keep', title: 'Keep' },
  { label: '×', state: 'removeAlways', title: 'Remove Always' },
  { label: '★', state: 'keepAlways', title: 'Keep Always' },
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
      className={`inline-flex flex-col shrink-0 mr-0.5 mb-0.5 border rounded ${CONTAINER_COLORS[part.state]}`}
    >
      <input
        className={`px-1 pt-0.5 pb-0 text-center text-xs font-semibold bg-transparent border-none outline-none ${INPUT_COLORS[part.state]}`}
        value={part.text}
        onChange={(e) => onTextChange(part.id, e.target.value)}
        size={Math.max(part.text.length, 2)}
      />
      <div className="grid grid-cols-2 gap-px px-0.5 pb-0.5">
        {ACTION_BUTTONS.map((btn, i) =>
          btn === null ? (
            <span key={`empty-${i}`} />
          ) : (
            <button
              key={btn.state}
              title={btn.title}
              className={`w-5 h-4 flex items-center justify-center rounded text-xs font-bold leading-none
                ${part.state === btn.state
                  ? ACTIVE_BUTTON_COLORS[btn.state]
                  : 'hover:bg-black/10 text-current opacity-50 hover:opacity-100'
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
