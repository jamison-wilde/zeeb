import React, { useState, useCallback } from 'react';
import type { ZeebConfig } from '../../../types';
import { interpolateFormat } from '../../../services/formatEngine';
import { useTesterStore } from '../../../stores/testerStore';

interface FormatTesterSectionProps {
  config: ZeebConfig;
}

const TOKEN_LABELS: Array<{ token: string; label: string }> = [
  { token: 'title', label: '<title>' },
  { token: 'year', label: '<year>' },
  { token: 'tt', label: '<imdb>' },
  { token: 'rating', label: '<rating100>' },
  { token: 'rating10', label: '<rating10>' },
  { token: 'directors', label: '<directors>' },
  { token: 'director', label: '<director>' },
  { token: 'genres', label: '<genres>' },
  { token: 'genre', label: '<genre>' },
  { token: 'actors', label: '<stars>' },
  { token: 'star1', label: '<star1>' },
  { token: 'duration', label: '<duration>' },
  { token: 'H', label: '<H>' },
  { token: 'M', label: '<M>' },
  { token: 'mpaa', label: '<mpaa>' },
  { token: 'aka', label: '<aka>' },
];

function getTokenValue(token: string, meta: NonNullable<ReturnType<typeof useTesterStore.getState>['testerResult']>, config: ZeebConfig): string {
  const dur = meta.duration ?? 0;
  switch (token) {
    case 'title': return meta.title;
    case 'year': return meta.year?.toString() ?? '';
    case 'tt': return meta.tt;
    case 'rating': return meta.rating != null ? Math.min(100, Math.round(meta.rating * 10)).toString() : '(unavailable)';
    case 'rating10': return meta.rating?.toString() ?? '(unavailable)';
    case 'directors': return meta.directors.join(config.directorSeparator) || '(unavailable)';
    case 'director': return meta.directors[0] ?? '(unavailable)';
    case 'genres': return meta.genres.join(config.genreSeparator) || '(unavailable)';
    case 'genre': return meta.genres[0] ?? '(unavailable)';
    case 'actors': return meta.actors.join(config.starSeparator) || '(unavailable)';
    case 'star1': return meta.actors[0] ?? '(unavailable)';
    case 'duration': return meta.duration?.toString() ?? '(unavailable)';
    case 'H': return Math.floor(dur / 60).toString();
    case 'M': return (dur % 60).toString();
    case 'mpaa': {
      const raw = meta.mpaa;
      if (raw == null) {
        const nf = config.mpaaMap.find(([m]) => m === 'NF');
        return nf ? nf[1] : '(unavailable)';
      }
      const entry = config.mpaaMap.find(([m]) => m === raw);
      return entry ? entry[1] : raw;
    }
    case 'aka': return meta.aka[0] ?? '(unavailable)';
    default: return '';
  }
}

export function FormatTesterSection({ config }: FormatTesterSectionProps): React.JSX.Element {
  const testerRequest = useTesterStore((s) => s.testerRequest);
  const testerResult = useTesterStore((s) => s.testerResult);
  const testerError = useTesterStore((s) => s.testerError);
  const currentTt = useTesterStore((s) => s.currentTt);
  const setRequest = useTesterStore((s) => s.setRequest);

  const [ttInput, setTtInput] = useState(currentTt ?? '');
  const [localError, setLocalError] = useState('');

  const isLoading = testerRequest !== null && testerResult === null && testerError === null;

  const handleTest = useCallback(() => {
    const tt = ttInput.trim();
    if (!tt.match(/^tt\d{5,}$/)) {
      setLocalError(`Could not fetch data for "${tt}" — expected format: tt0068646`);
      return;
    }
    setLocalError('');
    setRequest(tt);
  }, [ttInput, setRequest]);

  const preview = testerResult
    ? interpolateFormat(config.formatStandard, testerResult, {
        saved: '(from current file)',
        directorSeparator: config.directorSeparator,
        genreSeparator: config.genreSeparator,
        starSeparator: config.starSeparator,
        removeThe: config.removeThe,
        swapThe: config.swapThe,
        titleSpaceChar: config.titleSpaceChar,
        mpaaMap: config.mpaaMap,
      })
    : '';

  const errorMsg = localError || testerError;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
          placeholder="Enter tt#"
          value={ttInput}
          onChange={(e) => setTtInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTest()}
        />
        <button
          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
          onClick={() => setTtInput('tt0068646')}
          title="The Godfather (tt0068646)"
        >
          Godfather
        </button>
        <button
          className="px-4 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          onClick={handleTest}
          disabled={isLoading}
        >
          {isLoading ? 'Fetching...' : 'Test'}
        </button>
      </div>

      {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

      {testerResult && (
        <div className="space-y-4">
          <table className="w-full text-sm border border-gray-200 rounded">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Token</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Value</th>
              </tr>
            </thead>
            <tbody>
              {TOKEN_LABELS.map(({ token, label }) => (
                <tr key={token} className="border-t border-gray-100">
                  <td className="px-3 py-1.5 font-mono text-purple-600">{label}</td>
                  <td className="px-3 py-1.5">{getTokenValue(token, testerResult, config)}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-100">
                <td className="px-3 py-1.5 font-mono text-purple-600">{`<saved>`}</td>
                <td className="px-3 py-1.5 text-gray-400">(from current file)</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="px-3 py-1.5 font-mono text-purple-600">{`<original>`}</td>
                <td className="px-3 py-1.5 text-gray-400">{testerResult.tt}</td>
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
