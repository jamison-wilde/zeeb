import React from 'react';

interface RenamePreviewProps {
  originalName: string;
  previewName: string;
  onRename: () => void;
  onSkip: () => void;
}

export function RenamePreview({
  originalName,
  previewName,
  onRename,
  onSkip,
}: RenamePreviewProps): React.JSX.Element {
  const renameDisabled = previewName.length === 0;

  return (
    <div data-testid="rename-preview" className="p-3">
      <p className="text-xs text-gray-500 mb-0.5">Original:</p>
      <p className="text-sm mb-2">{originalName}</p>
      <p className="text-center text-lg my-1">&rarr;</p>
      <p className="text-xs text-gray-500 mb-0.5">New:</p>
      <p className="text-sm mb-2">{previewName}</p>
      <div className="flex gap-2 mt-2">
        <button
          data-testid="rename-button"
          className={`flex-1 py-2 rounded text-white font-bold ${
            renameDisabled ? 'bg-blue-500/50 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
          }`}
          onClick={onRename}
          disabled={renameDisabled}
        >
          Rename
        </button>
        <button
          data-testid="skip-button"
          className="flex-1 py-2 rounded bg-gray-400 text-white font-bold hover:bg-gray-500"
          onClick={onSkip}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
