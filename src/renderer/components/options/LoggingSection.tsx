// src/renderer/components/options/LoggingSection.tsx
import React, { useCallback } from 'react';
import type { ZeebConfig } from '../../../types';
import { BrowseInput } from './BrowseInput';

interface LoggingSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function LoggingSection({ config, updateConfig }: LoggingSectionProps): React.JSX.Element {
  const handleMaxUndos = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(0, Math.min(1000, parseInt(e.target.value, 10) || 0));
      updateConfig({ maxUndos: val });
    },
    [updateConfig],
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-ink mb-2">Log File</h3>
        <BrowseInput
          value={config.logFilePath}
          onChange={(v) => updateConfig({ logFilePath: v })}
          placeholder="Log file path..."
          mode="file"
        />
      </div>
      <div>
        <h3 className="text-sm font-bold text-ink mb-2">Undo History</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm text-ink-2">Maximum undos remembered:</label>
          <input
            data-testid="max-undos"
            type="number"
            min={0}
            max={1000}
            className="border border-line rounded px-2 py-1 text-sm w-24 bg-panel text-ink"
            value={config.maxUndos}
            onChange={handleMaxUndos}
          />
        </div>
      </div>
    </div>
  );
}
