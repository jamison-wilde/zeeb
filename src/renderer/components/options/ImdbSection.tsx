// src/renderer/components/options/ImdbSection.tsx
import React, { useCallback } from 'react';
import type { ZeebConfig } from '../../../types';
import { KeyValueTable } from './KeyValueTable';

interface ImdbSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function ImdbSection({ config, updateConfig }: ImdbSectionProps): React.JSX.Element {
  const handleZoom = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(50, Math.min(200, parseInt(e.target.value, 10) || 100));
      updateConfig({ htmlZoom: val });
    },
    [updateConfig],
  );

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
        <h3 className="text-sm font-bold text-gray-700 mb-3">HTML Zoom</h3>
        <div className="flex items-center gap-3">
          <button
            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-bold"
            onClick={() => updateConfig({ htmlZoom: Math.max(50, config.htmlZoom - 10) })}
          >
            −
          </button>
          <input
            data-testid="html-zoom"
            type="number"
            min={50}
            max={200}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-20 text-center"
            value={config.htmlZoom}
            onChange={handleZoom}
          />
          <span className="text-sm text-gray-500">%</span>
          <button
            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-bold"
            onClick={() => updateConfig({ htmlZoom: Math.min(200, config.htmlZoom + 10) })}
          >
            +
          </button>
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
