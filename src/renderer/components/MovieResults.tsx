import React from 'react';
import type { MovieMatch, SearchPart } from '../../types';

interface MovieResultsProps {
  matches: MovieMatch[];
  onSelect: (tt: string) => void;
  selectedTt?: string;
  searchParts?: SearchPart[];
  showThumbnails?: boolean;
}

function Thumb({ url }: { url: string | null }): React.JSX.Element {
  const [failed, setFailed] = React.useState(false);
  return (
    <span className="w-[22px] h-8 shrink-0 border border-line rounded-[2px] bg-well overflow-hidden">
      {url && !failed && (
        <img src={url} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} />
      )}
    </span>
  );
}

export function MovieResults({
  matches,
  onSelect,
  selectedTt,
  searchParts,
  showThumbnails,
}: MovieResultsProps): React.JSX.Element {
  if (matches.length === 0) {
    return <div className="p-3 text-center text-xs text-ink-faint">No results</div>;
  }

  const yearTokens = new Set(
    (searchParts ?? []).map((p) => p.text.trim()).filter((t) => /^\d{4}$/.test(t)),
  );

  return (
    <div data-testid="movie-results-list" className="overflow-y-auto">
      {matches.map((item) => {
        const selected = selectedTt === item.tt;
        const yearMatched = item.year != null && yearTokens.has(String(item.year));
        return (
          <button
            key={item.tt}
            className={`w-full text-left px-2 py-[3px] flex items-center gap-2 ${selected ? 'bg-row-selected' : ''}`}
            onClick={() => onSelect(item.tt)}
            title={`${item.title}${item.year ? ` (${item.year})` : ''} — ${item.tt}`}
          >
            {showThumbnails && <Thumb url={item.thumbnailUrl} />}
            <span className={`font-semibold text-body truncate ${selected ? 'text-ink-bright' : 'text-ink-2'}`}>
              {item.title || item.tt}
            </span>
            {item.year != null && (
              <span
                className={`font-mono font-bold text-label border rounded-[3px] px-[5px] py-px shrink-0 ${
                  yearMatched
                    ? 'bg-pill-year-bg text-pill-year-fg border-pill-year-line'
                    : 'text-ink-dim border-line'
                }`}
              >
                {item.year}
              </span>
            )}
            {item.aka && (
              <span className="text-label text-ink-faint italic truncate max-w-[30%]">aka {item.aka}</span>
            )}
            <span className="flex-1" />
            {item.stars && (
              <span className="text-label text-ink-faint truncate max-w-[40%] shrink-0">{item.stars}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
