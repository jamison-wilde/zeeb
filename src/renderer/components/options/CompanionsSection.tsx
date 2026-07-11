// src/renderer/components/options/CompanionsSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';
import { BrowseInput } from './BrowseInput';

interface CompanionsSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function CompanionsSection({ config, updateConfig }: CompanionsSectionProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-ink mb-3">URL File</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              data-testid="create-url-file"
              type="checkbox"
              checked={config.createUrlFile}
              onChange={(e) => updateConfig({ createUrlFile: e.target.checked })}
            />
            <span className="text-sm">Create .url file</span>
          </label>
          <div className="ml-6 space-y-2">
            <label className="flex items-center gap-2">
              <input
                data-testid="include-original-in-url"
                type="checkbox"
                checked={config.includeOriginalInUrl}
                disabled={!config.createUrlFile}
                onChange={(e) => updateConfig({ includeOriginalInUrl: e.target.checked })}
              />
              <span className={`text-sm ${!config.createUrlFile ? 'text-ink-faint' : ''}`}>
                Include original filename in .url
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                data-testid="include-nfo-in-url"
                type="checkbox"
                checked={config.includeNfoInUrl}
                disabled={!config.createUrlFile}
                onChange={(e) => updateConfig({ includeNfoInUrl: e.target.checked })}
              />
              <span className={`text-sm ${!config.createUrlFile ? 'text-ink-faint' : ''}`}>
                Include NFO content in .url
              </span>
            </label>
            <label className="flex items-center gap-2 ml-4">
              <input
                data-testid="delete-nfo-after-include"
                type="checkbox"
                checked={config.deleteNfoAfterInclude}
                disabled={!config.createUrlFile || !config.includeNfoInUrl}
                onChange={(e) => updateConfig({ deleteNfoAfterInclude: e.target.checked })}
              />
              <span
                className={`text-sm ${
                  !config.createUrlFile || !config.includeNfoInUrl ? 'text-ink-faint' : ''
                }`}
              >
                Delete original NFO after including
              </span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink mb-3">Poster</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              data-testid="create-poster"
              type="checkbox"
              checked={config.createPoster}
              onChange={(e) => updateConfig({ createPoster: e.target.checked })}
            />
            <span className="text-sm">Download poster from TMDB</span>
          </label>
          <div className="ml-6">
            <label className="flex items-center gap-2">
              <input
                data-testid="poster-in-dvd-folder"
                type="checkbox"
                checked={config.posterInDvdFolder}
                disabled={!config.createPoster}
                onChange={(e) => updateConfig({ posterInDvdFolder: e.target.checked })}
              />
              <span className={`text-sm ${!config.createPoster ? 'text-ink-faint' : ''}`}>
                Place poster inside DVD folder
              </span>
            </label>
            <div className="flex items-center gap-2 mt-2">
              <label className={`text-sm ${!config.createPoster ? 'text-ink-faint' : ''}`}>
                Save size:
              </label>
              <select
                data-testid="poster-save-size"
                className="border border-line rounded px-2 py-1 text-sm bg-panel text-ink"
                value={config.posterSaveSize}
                disabled={!config.createPoster}
                onChange={(e) => updateConfig({ posterSaveSize: e.target.value })}
              >
                <option value="w185">w185 (185px)</option>
                <option value="w342">w342 (342px)</option>
                <option value="w500">w500 (500px)</option>
                <option value="w780">w780 (780px)</option>
                <option value="original">Original</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink mb-3">TMDB</h3>
        <div className="space-y-2">
          <label className="text-sm text-ink-2">API Key:</label>
          <input
            data-testid="tmdb-api-key"
            type="text"
            className="w-full border border-line rounded px-2 py-1 text-sm font-mono bg-panel text-ink"
            value={config.tmdbApiKey}
            onChange={(e) => updateConfig({ tmdbApiKey: e.target.value })}
            placeholder="TMDB API key..."
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink mb-3">NFO</h3>
        <div className="space-y-2">
          <label className="text-sm text-ink-2">Additional NFO folder:</label>
          <BrowseInput
            value={config.nfoFolder}
            onChange={(v) => updateConfig({ nfoFolder: v })}
            placeholder="NFO folder path..."
            mode="directory"
          />
          <label className="flex items-center gap-2 mt-2">
            <input
              data-testid="scan-nfo"
              type="checkbox"
              checked={config.scanNfo}
              onChange={(e) => updateConfig({ scanNfo: e.target.checked })}
            />
            <span className="text-sm">Scan NFO folder</span>
          </label>
        </div>
      </div>
    </div>
  );
}
