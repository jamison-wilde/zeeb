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
    <div data-testid="rename-preview" className="flex items-center gap-2 px-2 py-1.5 bg-surface border-t border-line">
      <button
        data-testid="rename-button"
        className={`px-4 py-1 rounded-[3px] bg-accent text-on-accent text-[11px] font-bold shrink-0 ${
          renameDisabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={onRename}
        disabled={renameDisabled}
      >
        Rename
      </button>
      <button
        data-testid="skip-button"
        className="px-3 py-1 rounded-[3px] border border-toggle-off text-ink-2 text-[11px] font-bold shrink-0"
        onClick={onSkip}
      >
        Skip
      </button>
      <input
        data-testid="preview-name-input"
        className="flex-1 px-2 py-1 font-mono text-[11px] text-ink-bright bg-raised border border-line rounded-[3px]"
        value={previewName}
        onChange={(e) => onPreviewChange(e.target.value)}
        placeholder="New filename..."
      />
    </div>
  );
}
