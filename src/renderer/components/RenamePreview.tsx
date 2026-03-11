import React from 'react';

interface RenamePreviewProps {
  originalName: string;
  previewName: string;
  onPreviewChange: (name: string) => void;
  onRename: () => void;
  onSkip: () => void;
}

export function RenamePreview({
  originalName,
  previewName,
  onPreviewChange,
  onRename,
  onSkip,
}: RenamePreviewProps): React.JSX.Element {
  const renameDisabled = previewName.length === 0;

  return (
    <div data-testid="rename-preview" className="flex items-center gap-2 px-2 py-1.5 border-t border-gray-300">
      <button
        data-testid="rename-button"
        className={`px-4 py-1.5 rounded text-white text-xs font-bold shrink-0 ${
          renameDisabled ? 'bg-blue-500/50 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
        }`}
        onClick={onRename}
        disabled={renameDisabled}
      >
        Rename
      </button>
      <button
        data-testid="skip-button"
        className="px-4 py-1.5 rounded bg-gray-400 text-white text-xs font-bold hover:bg-gray-500 shrink-0"
        onClick={onSkip}
      >
        Skip
      </button>
      <input
        data-testid="preview-name-input"
        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded bg-white"
        value={previewName}
        onChange={(e) => onPreviewChange(e.target.value)}
        placeholder="New filename..."
      />
    </div>
  );
}
