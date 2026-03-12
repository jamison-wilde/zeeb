// src/renderer/components/options/FormatTesterSection.tsx
import React, { useState, useCallback } from 'react';
import type { ZeebConfig, MovieMetadata } from '../../../types';
import { interpolateFormat } from '../../../services/formatEngine';

interface FormatTesterSectionProps {
  config: ZeebConfig;
}

type TesterState = 'idle' | 'loading' | 'error' | 'results';

const TOKEN_LABELS: Array<{ token: string; label: string }> = [
  { token: 'title', label: '<title>' },
  { token: 'year', label: '<year>' },
  { token: 'tt', label: '<imdb>' },
  { token: 'rating', label: '<rating100>' },
  { token: 'directors', label: '<directors>' },
  { token: 'genres', label: '<genres>' },
  { token: 'actors', label: '<stars>' },
  { token: 'duration', label: '<duration>' },
  { token: 'mpaa', label: '<mpaa>' },
  { token: 'aka', label: '<aka>' },
];

export function FormatTesterSection({ config }: FormatTesterSectionProps): React.JSX.Element {
  const [ttInput, setTtInput] = useState('');
  const [state, setState] = useState<TesterState>('idle');
  const [metadata, setMetadata] = useState<MovieMetadata | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTest = useCallback(async () => {
    const tt = ttInput.trim();
    if (!tt.match(/^tt\d{5,}$/)) {
      setState('error');
      setErrorMsg(`Could not fetch data for "${tt}" — expected format: tt0068646`);
      return;
    }

    setState('loading');
    try {
      const results = await window.zeebImdb.suggest(tt);
      const match = results.find((r: { tt: string }) => r.tt === tt);
      if (!match) {
        setState('error');
        setErrorMsg(`Could not fetch data for ${tt}`);
        return;
      }
      const meta: MovieMetadata = {
        tt: match.tt,
        title: match.title,
        year: match.year,
        rating: null,
        directors: [],
        genres: [],
        actors: [],
        duration: null,
        mpaa: null,
        aka: [],
        posterUrl: match.thumbnailUrl,
      };
      setMetadata(meta);
      setState('results');
    } catch {
      setState('error');
      setErrorMsg(`Could not fetch data for ${tt}`);
    }
  }, [ttInput]);

  const preview = metadata
    ? interpolateFormat(config.formatStandard, metadata, {
        saved: '(from current file)',
        directorSeparator: config.directorSeparator,
        genreSeparator: config.genreSeparator,
        starSeparator: config.starSeparator,
        removeThe: config.removeThe,
        swapThe: config.swapThe,
        titleSpaceChar: config.titleSpaceChar,
      })
    : '';

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
          placeholder="Enter tt# (e.g., tt0068646)"
          value={ttInput}
          onChange={(e) => setTtInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTest()}
        />
        <button
          className="px-4 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          onClick={handleTest}
          disabled={state === 'loading'}
        >
          {state === 'loading' ? 'Fetching...' : 'Test'}
        </button>
      </div>

      {state === 'error' && <p className="text-red-500 text-sm">{errorMsg}</p>}

      {state === 'results' && metadata && (
        <div className="space-y-4">
          <table className="w-full text-sm border border-gray-200 rounded">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Token</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Value</th>
              </tr>
            </thead>
            <tbody>
              {TOKEN_LABELS.map(({ token, label }) => {
                let value = '';
                if (token === 'title') value = metadata.title;
                else if (token === 'year') value = metadata.year?.toString() ?? '';
                else if (token === 'tt') value = metadata.tt;
                else if (token === 'rating') value = metadata.rating != null ? Math.round(metadata.rating * 10.75).toString() : '(unavailable)';
                else if (token === 'directors') value = metadata.directors.join(config.directorSeparator) || '(unavailable)';
                else if (token === 'genres') value = metadata.genres.join(config.genreSeparator) || '(unavailable)';
                else if (token === 'actors') value = metadata.actors.join(config.starSeparator) || '(unavailable)';
                else if (token === 'duration') value = metadata.duration?.toString() ?? '(unavailable)';
                else if (token === 'mpaa') value = metadata.mpaa ?? '(unavailable)';
                else if (token === 'aka') value = metadata.aka[0] ?? '(unavailable)';
                return (
                  <tr key={token} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 font-mono text-purple-600">{label}</td>
                    <td className="px-3 py-1.5">{value}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-gray-100">
                <td className="px-3 py-1.5 font-mono text-purple-600">{`<saved>`}</td>
                <td className="px-3 py-1.5 text-gray-400">(from current file)</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="px-3 py-1.5 font-mono text-purple-600">{`<original>`}</td>
                <td className="px-3 py-1.5 text-gray-400">{metadata.tt}</td>
              </tr>
            </tbody>
          </table>

          <div>
            <h4 className="text-xs font-semibold text-gray-600 mb-1">Preview</h4>
            <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm font-mono">
              {preview}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
