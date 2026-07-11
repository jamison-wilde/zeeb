import React from 'react';
import type { SearchPart, SearchPartState } from '../../types';

interface SearchPartItemProps {
  part: SearchPart;
  onStateChange: (id: string, state: SearchPartState) => void;
  onTextChange: (id: string, text: string) => void;
  dragging?: boolean;
  mergeHighlight?: boolean;
}

const UNDERLINE: Record<SearchPartState, string> = {
  search: 'border-part-search',
  keep: 'border-part-keep',
  keepAlways: 'border-part-keep-always',
  remove: 'border-part-remove',
  removeAlways: 'border-part-remove-always',
};

const TEXT_TREATMENT: Record<SearchPartState, string> = {
  search: 'text-ink-bright',
  keep: 'text-ink',
  keepAlways: 'text-ink',
  remove: 'text-ink-dim line-through',
  removeAlways: 'text-ink-faint line-through',
};

const ACTIVE_FILL: Record<SearchPartState, string> = {
  search: 'bg-part-search text-on-accent',
  keep: 'bg-part-keep text-on-accent',
  keepAlways: 'bg-part-keep-always text-on-accent',
  remove: 'bg-part-remove text-on-accent',
  removeAlways: 'bg-part-remove-always text-white',
};

interface ActionButton {
  label: string;
  state: SearchPartState;
  title: string;
}

const BIG_BUTTONS: ActionButton[] = [
  { label: '+', state: 'keep', title: 'Keep' },
  { label: '−', state: 'remove', title: 'Remove' },
];

const SMALL_BUTTONS: ActionButton[] = [
  { label: '?', state: 'search', title: 'Search' },
  { label: '★', state: 'keepAlways', title: 'Always keep' },
  { label: '×', state: 'removeAlways', title: 'Never' },
];

export function SearchPartItem({
  part,
  onStateChange,
  onTextChange,
  dragging = false,
  mergeHighlight = false,
}: SearchPartItemProps): React.JSX.Element {
  const renderButton = (btn: ActionButton, sizeClass: string): React.JSX.Element => (
    <button
      key={btn.state}
      type="button"
      title={btn.title}
      aria-pressed={part.state === btn.state}
      className={`${sizeClass} flex items-center justify-center rounded-[3px] font-mono font-bold leading-none ${
        part.state === btn.state ? ACTIVE_FILL[btn.state] : 'text-ghost'
      }`}
      onClick={() => onStateChange(part.id, btn.state)}
    >
      {btn.label}
    </button>
  );

  return (
    <div
      data-part-id={part.id}
      className={`flex flex-col shrink-0 border rounded bg-chip overflow-hidden touch-pan-x ${
        mergeHighlight ? 'border-accent' : 'border-line'
      } ${dragging ? 'opacity-50' : ''}`}
    >
      <input
        className={`px-1.5 pt-px pb-0 text-center text-chip font-mono font-semibold bg-transparent border-b-2 outline-none ${UNDERLINE[part.state]} ${TEXT_TREATMENT[part.state]}`}
        value={part.text}
        onChange={(e) => onTextChange(part.id, e.target.value)}
        size={Math.max(part.text.length, 2)}
      />
      <div className="flex flex-col items-center gap-px px-[3px] py-[2px]">
        <div className="flex gap-[2px]">{BIG_BUTTONS.map((b) => renderButton(b, 'w-6 h-[18px] text-chip-glyph'))}</div>
        <div className="flex gap-px">{SMALL_BUTTONS.map((b) => renderButton(b, 'w-[15px] h-3 text-chip-small'))}</div>
      </div>
    </div>
  );
}
