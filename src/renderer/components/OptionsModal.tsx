import React, { useCallback } from 'react';
import { useConfigStore } from '../../stores/configStore';

interface OptionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OptionsModal({ visible, onClose }: OptionsModalProps): React.JSX.Element | null {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);

  const handleChange = useCallback(
    (field: string, value: string) => {
      updateConfig({ [field]: value });
    },
    [updateConfig],
  );

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" data-testid="options-modal">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold">Options</h2>
        <button data-testid="close-options" className="text-blue-500" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-bold mt-4 mb-2 text-gray-700">Format Strings</h3>
        <input
          data-testid="format-standard-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="Standard format"
          value={config.formatStandard}
          onChange={(e) => handleChange('formatStandard', e.target.value)}
        />
        <input
          data-testid="format-aka-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="AKA format"
          value={config.formatAka}
          onChange={(e) => handleChange('formatAka', e.target.value)}
        />
        <input
          data-testid="format-dvd-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="DVD format"
          value={config.formatDvd}
          onChange={(e) => handleChange('formatDvd', e.target.value)}
        />

        <h3 className="text-sm font-bold mt-4 mb-2 text-gray-700">Remove Terms</h3>
        <input
          data-testid="remove-terms-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="Terms to remove"
          value={config.removeTerms.join(', ')}
          onChange={(e) =>
            updateConfig({ removeTerms: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })
          }
        />

        <h3 className="text-sm font-bold mt-4 mb-2 text-gray-700">Keep Terms</h3>
        <input
          data-testid="keep-terms-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="Terms to keep"
          value={config.keepTerms.join(', ')}
          onChange={(e) =>
            updateConfig({ keepTerms: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })
          }
        />

        <h3 className="text-sm font-bold mt-4 mb-2 text-gray-700">Separators</h3>
        <input
          data-testid="director-separator-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="Director separator"
          value={config.directorSeparator}
          onChange={(e) => handleChange('directorSeparator', e.target.value)}
        />
        <input
          data-testid="genre-separator-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="Genre separator"
          value={config.genreSeparator}
          onChange={(e) => handleChange('genreSeparator', e.target.value)}
        />
        <input
          data-testid="star-separator-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="Star separator"
          value={config.starSeparator}
          onChange={(e) => handleChange('starSeparator', e.target.value)}
        />
      </div>
    </div>
  );
}
