import React, { useState, useCallback, useRef } from 'react';
import { buildPosterUrl } from '../../services/tmdbService';

interface PosterGridProps {
  posterPaths: string[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  compact: boolean;
}

export function PosterGrid({ posterPaths, selectedIndex, onSelect, compact }: PosterGridProps): React.JSX.Element | null {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTipPos({ x, y });
  }, []);

  if (posterPaths.length === 0) return null;

  // Position tooltip: prefer to the right of cursor, flip left if near right edge
  // Prefer above cursor origin, shift down if near top
  const tipStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 20,
    pointerEvents: 'none',
  };

  if (containerRef.current && hoverIndex !== null) {
    const rect = containerRef.current.getBoundingClientRect();
    const tipWidth = 320;
    const tipHeight = 480;
    const pad = 16;

    // Horizontal: prefer right of cursor
    let left = tipPos.x + pad;
    if (left + tipWidth > rect.width) {
      left = tipPos.x - tipWidth - pad;
    }
    if (left < 0) left = 0;

    // Vertical: align top with cursor, shift down if would go above container
    let top = tipPos.y - tipHeight / 2;
    if (top < 0) top = 0;
    if (top + tipHeight > rect.height) top = Math.max(0, rect.height - tipHeight);

    tipStyle.left = left;
    tipStyle.top = top;
  }

  return (
    <div
      ref={containerRef}
      className={`flex gap-2 p-2 relative ${compact ? 'overflow-x-auto flex-nowrap' : 'flex-wrap'}`}
      onMouseMove={hoverIndex !== null ? handleMouseMove : undefined}
    >
      {posterPaths.map((path, i) => (
        <div
          key={`${path}-${i}`}
          className={`shrink-0 cursor-pointer border-2 rounded ${
            selectedIndex === i ? 'border-blue-500' : 'border-transparent'
          }`}
          onClick={() => onSelect(i)}
          onMouseEnter={() => setHoverIndex(i)}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <img
            src={buildPosterUrl(path, 'w185')}
            alt={`Poster ${i + 1}`}
            className="w-[92px] h-[138px] object-cover rounded"
          />
        </div>
      ))}
      {hoverIndex !== null && (
        <div style={tipStyle} className="bg-white shadow-lg rounded border border-gray-200 p-1">
          <img
            data-testid="poster-hover-preview"
            src={buildPosterUrl(posterPaths[hoverIndex], 'w780')}
            alt="Preview"
            className="max-h-[460px] rounded"
          />
        </div>
      )}
    </div>
  );
}
