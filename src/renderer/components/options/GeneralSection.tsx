// src/renderer/components/options/GeneralSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';

interface GeneralSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function GeneralSection({ config, updateConfig }: GeneralSectionProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">Title Handling</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              data-testid="remove-the"
              type="checkbox"
              checked={config.removeThe}
              onChange={(e) => updateConfig({ removeThe: e.target.checked })}
            />
            <span className="text-sm">Remove &quot;The&quot; from beginning</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              data-testid="swap-the"
              type="checkbox"
              checked={config.swapThe}
              onChange={(e) => updateConfig({ swapThe: e.target.checked })}
            />
            <span className="text-sm">Swap &quot;The&quot; to end after comma</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-40">Custom &quot;The&quot; word:</label>
            <input
              data-testid="the-word-input"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
              value={config.theWord}
              onChange={(e) => updateConfig({ theWord: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-40">Replace title spaces with:</label>
            <input
              data-testid="title-space-char"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
              value={config.titleSpaceChar}
              onChange={(e) => updateConfig({ titleSpaceChar: e.target.value })}
              placeholder="(blank = keep spaces)"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">Separators</h3>
        <div className="space-y-2">
          {[
            { key: 'savedPartSeparator', label: 'Saved parts separator', testId: 'saved-part-separator' },
            { key: 'directorSeparator', label: 'Director separator', testId: 'director-separator' },
            { key: 'genreSeparator', label: 'Genre separator', testId: 'genre-separator' },
            { key: 'starSeparator', label: 'Star separator', testId: 'star-separator' },
          ].map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-40">{s.label}:</label>
              <input
                data-testid={s.testId}
                className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
                value={config[s.key as keyof ZeebConfig] as string}
                onChange={(e) => updateConfig({ [s.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">Behavior</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              data-testid="rename-folder"
              type="checkbox"
              checked={config.renameFolder}
              onChange={(e) => updateConfig({ renameFolder: e.target.checked })}
            />
            <span className="text-sm">Rename parent folder</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              data-testid="detect-dvd"
              type="checkbox"
              checked={config.detectDvd}
              onChange={(e) => updateConfig({ detectDvd: e.target.checked })}
            />
            <span className="text-sm">Detect DVD/BluRay folders</span>
          </label>
        </div>
      </div>
    </div>
  );
}
