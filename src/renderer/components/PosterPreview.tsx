import React from 'react';

interface PosterPreviewProps {
  posterUrl: string | null;
  onSelect: () => void;
}

export function PosterPreview({ posterUrl, onSelect }: PosterPreviewProps): React.JSX.Element {
  return (
    <button className="flex items-center justify-center p-2" onClick={onSelect}>
      {posterUrl ? (
        <img
          data-testid="poster-image"
          src={posterUrl}
          className="w-[150px] h-[225px] rounded object-contain"
          alt="Movie poster"
        />
      ) : (
        <div
          data-testid="poster-placeholder"
          className="w-[150px] h-[225px] rounded bg-gray-200 flex items-center justify-center"
        >
          <span className="text-gray-400">No Poster</span>
        </div>
      )}
    </button>
  );
}
