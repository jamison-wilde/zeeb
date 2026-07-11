// src/renderer/components/options/FileTypesSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';
import { TagInput } from './TagInput';

interface FileTypesSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function FileTypesSection({ config, updateConfig }: FileTypesSectionProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-ink mb-2">Movie Extensions</h3>
        <TagInput
          values={config.movieExtensions}
          onChange={(v) => updateConfig({ movieExtensions: v })}
          placeholder="Add extension..."
        />
      </div>
      <div>
        <h3 className="text-sm font-bold text-ink mb-2">Subtitle Extensions</h3>
        <TagInput
          values={config.subtitleExtensions}
          onChange={(v) => updateConfig({ subtitleExtensions: v })}
          placeholder="Add extension..."
        />
      </div>
    </div>
  );
}
