import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { buildPosterUrl } from '../../services/tmdbService';

interface PosterGridProps {
  posterPaths: string[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  compact: boolean;
}

/** Thumbnail that only loads its image when scrolled into view. */
function LazyPosterThumb({ path, size, index, selected, onSelect, onMouseEnter, onMouseLeave, className }: {
  path: string;
  size: string;
  index: number;
  selected: boolean;
  onSelect: (i: number) => void;
  onMouseEnter: (i: number) => void;
  onMouseLeave: () => void;
  className: string;
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const src = visible ? buildPosterUrl(path, size) : undefined;

  return (
    <div
      ref={ref}
      className={`shrink-0 cursor-pointer border-2 rounded ${
        selected ? 'border-blue-500' : 'border-transparent'
      }`}
      onClick={() => onSelect(index)}
      onMouseEnter={() => onMouseEnter(index)}
      onMouseLeave={onMouseLeave}
    >
      {src ? (
        <img
          src={src}
          alt={`Poster ${index + 1}`}
          className={className}
        />
      ) : (
        <div className={`${className} bg-gray-200`} />
      )}
    </div>
  );
}

export function PosterGrid({ posterPaths, selectedIndex, onSelect, compact }: PosterGridProps): React.JSX.Element | null {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => setHoverIndex(null), []);

  if (posterPaths.length === 0) return null;

  const thumbSize = compact ? 'w92' : 'w185';
  const thumbClass = compact ? 'w-[92px] h-[138px] object-cover rounded' : 'w-[185px] h-[278px] object-cover rounded';

  // Position tooltip near cursor using viewport coordinates (rendered via portal)
  const tipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    pointerEvents: 'none',
  };

  if (hoverIndex !== null) {
    const tipWidth = 320;
    const tipHeight = 480;
    const pad = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = tipPos.x + pad;
    if (left + tipWidth > vw) {
      left = tipPos.x - tipWidth - pad;
    }
    if (left < 0) left = 0;

    let top = tipPos.y - tipHeight / 2;
    if (top < 0) top = 0;
    if (top + tipHeight > vh) top = Math.max(0, vh - tipHeight);

    tipStyle.left = left;
    tipStyle.top = top;
  }

  return (
    <div
      ref={containerRef}
      className={`flex gap-2 p-2 ${
        compact ? 'overflow-x-auto flex-nowrap' : 'flex-wrap overflow-y-auto'
      }`}
      style={compact ? undefined : { maxHeight: '100%' }}
      onMouseMove={hoverIndex !== null ? handleMouseMove : undefined}
    >
      {posterPaths.map((path, i) => (
        <LazyPosterThumb
          key={`${path}-${i}`}
          path={path}
          size={thumbSize}
          index={i}
          selected={selectedIndex === i}
          onSelect={onSelect}
          onMouseEnter={setHoverIndex}
          onMouseLeave={handleMouseLeave}
          className={thumbClass}
        />
      ))}
      {hoverIndex !== null && createPortal(
        <div style={tipStyle} className="bg-white shadow-lg rounded border border-gray-200 p-1">
          <img
            data-testid="poster-hover-preview"
            src={buildPosterUrl(posterPaths[hoverIndex], 'w780')}
            alt="Preview"
            className="max-h-[460px] rounded"
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
