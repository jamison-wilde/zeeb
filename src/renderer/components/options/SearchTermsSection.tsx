// src/renderer/components/options/SearchTermsSection.tsx
import React, { useState } from 'react';
import type { ZeebConfig } from '../../../types';
import { TagInput } from './TagInput';
import { KeyValueTable } from './KeyValueTable';

interface SearchTermsSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function SearchTermsSection({ config, updateConfig }: SearchTermsSectionProps): React.JSX.Element {
  const [removeFilter, setRemoveFilter] = useState('');
  const [keepFilter, setKeepFilter] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">Remove Terms</h3>
        <p className="text-xs text-gray-500 mb-2">Terms auto-marked as &quot;remove&quot; when parsing filenames.</p>
        <input
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-2"
          placeholder="Filter remove terms..."
          value={removeFilter}
          onChange={(e) => setRemoveFilter(e.target.value)}
        />
        <TagInput
          values={config.removeTerms}
          onChange={(v) => updateConfig({ removeTerms: v })}
          placeholder="Add term..."
          filter={removeFilter}
        />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">Keep Terms</h3>
        <p className="text-xs text-gray-500 mb-2">
          Match column is what to look for in filenames. Display column is what to show in the saved parts.
        </p>
        <input
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-2"
          placeholder="Filter keep terms..."
          value={keepFilter}
          onChange={(e) => setKeepFilter(e.target.value)}
        />
        <KeyValueTable
          values={config.keepTerms}
          onChange={(v) => updateConfig({ keepTerms: v })}
          leftHeader="Match"
          rightHeader="Display"
          leftPlaceholder="match term"
          rightPlaceholder="display label"
          filter={keepFilter}
        />
      </div>
    </div>
  );
}
