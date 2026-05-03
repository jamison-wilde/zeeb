import React, { useEffect, useState } from 'react';
import { renderMarkdown } from '../../services/markdownRenderer';
import { usePlatform } from '../PlatformContext';

interface ReleaseNotesProps {
  visible: boolean;
  onClose: () => void;
}

export function ReleaseNotes({ visible, onClose }: ReleaseNotesProps): React.JSX.Element | null {
  const platform = usePlatform();
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!visible) return;
    platform.appMeta.getReleaseNotes().then((md) => {
      setHtml(renderMarkdown(md));
    });
  }, [visible, platform]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-4/5 max-w-2xl max-h-[70%] bg-white rounded-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">Release Notes</h2>
          <button data-testid="release-notes-close" className="text-blue-500" onClick={onClose}>
            Close
          </button>
        </div>
        <div
          data-testid="release-notes-content"
          className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
