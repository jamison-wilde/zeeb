import React, { useCallback } from 'react';
import type { ZeebConfig } from '../../../types';

interface BrowserSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function BrowserSection({ config, updateConfig }: BrowserSectionProps): React.JSX.Element {
  const handleZoom = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(50, Math.min(200, parseInt(e.target.value, 10) || 100));
      updateConfig({ htmlZoom: val });
    },
    [updateConfig],
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-ink mb-3">Visibility</h3>
        <label className="flex items-center gap-2">
          <input
            data-testid="show-webview"
            type="checkbox"
            checked={config.showWebView}
            onChange={(e) => updateConfig({ showWebView: e.target.checked })}
          />
          <span className="text-sm">Show Browser</span>
        </label>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink mb-3">Browser Zoom</h3>
        <div className="flex items-center gap-3">
          <button
            className="px-2 py-1 border border-toggle-off text-ink-2 rounded-[3px] text-sm font-bold"
            onClick={() => updateConfig({ htmlZoom: Math.max(50, config.htmlZoom - 10) })}
          >
            −
          </button>
          <input
            data-testid="html-zoom"
            type="number"
            min={50}
            max={200}
            className="border border-line rounded px-2 py-1 text-sm w-20 text-center bg-panel text-ink"
            value={config.htmlZoom}
            onChange={handleZoom}
          />
          <span className="text-sm text-ink-2">%</span>
          <button
            className="px-2 py-1 border border-toggle-off text-ink-2 rounded-[3px] text-sm font-bold"
            onClick={() => updateConfig({ htmlZoom: Math.min(200, config.htmlZoom + 10) })}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
