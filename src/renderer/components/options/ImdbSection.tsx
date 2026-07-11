// src/renderer/components/options/ImdbSection.tsx
import React, { useCallback } from 'react';
import type { ZeebConfig } from '../../../types';
import { KeyValueTable } from './KeyValueTable';
import { usePlatform } from '../../PlatformContext';

interface ImdbSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function ImdbSection({ config, updateConfig }: ImdbSectionProps): React.JSX.Element {
  const platform = usePlatform();
  const handleMpaaChange = useCallback(
    (pairs: Array<[string, string]>) => {
      updateConfig({ mpaaMap: pairs });
    },
    [updateConfig],
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-ink mb-3">URLs</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-ink-2 mb-1">IMDB Search URL</label>
            <input
              data-testid="imdb-search-url"
              className="w-full border border-line rounded px-2 py-1.5 text-sm bg-panel text-ink"
              value={config.urlImdbSearch}
              onChange={(e) => updateConfig({ urlImdbSearch: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-ink-2 mb-1">IMDB Title URL</label>
            <input
              data-testid="imdb-title-url"
              className="w-full border border-line rounded px-2 py-1.5 text-sm bg-panel text-ink"
              value={config.urlImdbTT}
              onChange={(e) => updateConfig({ urlImdbTT: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink mb-3">TMDB</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-ink-2 mb-1">TMDB API Key</label>
            <input
              data-testid="tmdb-api-key"
              className="w-full border border-line rounded px-2 py-1.5 text-sm font-mono bg-panel text-ink"
              value={config.tmdbApiKey}
              onChange={(e) => updateConfig({ tmdbApiKey: e.target.value })}
            />
          </div>
          <button
            className="text-xs text-accent hover:underline"
            onClick={() => platform.update.openExternal('https://www.themoviedb.org/settings/api')}
          >
            Get your own API key
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink mb-3">MPAA Mapping</h3>
        <p className="text-xs text-ink-faint mb-2">Map IMDB ratings to custom output strings.</p>
        <KeyValueTable
          values={config.mpaaMap}
          onChange={handleMpaaChange}
          leftHeader="IMDB Rating"
          rightHeader="Output"
          leftPlaceholder="e.g. R"
          rightPlaceholder="e.g. R"
        />
      </div>
    </div>
  );
}
