import React from 'react';

interface ReleaseNotesProps {
  visible: boolean;
  onClose: () => void;
}

const RELEASE_NOTES = `Zeeb - Electron Rewrite

v3.0.0
- Migrated from React Native to Electron
- Built-in Chromium WebView for IMDB extraction
- Windows and macOS desktop support
- Tailwind CSS UI
- Dual renamer with swap logic for faster processing
- Improved IMDB extraction with configurable patterns
- Full undo support with transaction history
- Legacy config import from XML
`;

export function ReleaseNotes({ visible, onClose }: ReleaseNotesProps): React.JSX.Element | null {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-4/5 max-h-[70%] bg-white rounded-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">Release Notes</h2>
          <button data-testid="release-notes-close" className="text-blue-500" onClick={onClose}>
            Close
          </button>
        </div>
        <div data-testid="release-notes-content" className="flex-1 overflow-y-auto p-4">
          <p className="text-sm leading-relaxed whitespace-pre-line">{RELEASE_NOTES}</p>
        </div>
      </div>
    </div>
  );
}
