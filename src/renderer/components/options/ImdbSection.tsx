// src/renderer/components/options/ImdbSection.tsx
import React, { useCallback } from 'react';
import type { ZeebConfig } from '../../../types';
import { KeyValueTable } from './KeyValueTable';

interface ImdbSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function ImdbSection({ config, updateConfig }: ImdbSectionProps): React.JSX.Element {
  const handleMpaaChange = useCallback(
    (pairs: Array<[string, string]>) => {
      updateConfig({ mpaaMap: pairs });
    },
    [updateConfig],
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">URLs</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">IMDB Search URL</label>
            <input
              data-testid="imdb-search-url"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={config.urlImdbSearch}
              onChange={(e) => updateConfig({ urlImdbSearch: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">IMDB Title URL</label>
            <input
              data-testid="imdb-title-url"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={config.urlImdbTT}
              onChange={(e) => updateConfig({ urlImdbTT: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">MPAA Mapping</h3>
        <p className="text-xs text-gray-500 mb-2">Map IMDB ratings to custom output strings.</p>
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
