import React from 'react';

interface NfoViewerProps {
  visible: boolean;
  content: string;
  onClose: () => void;
}

export function NfoViewer({ visible, content, onClose }: NfoViewerProps): React.JSX.Element | null {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold text-white">NFO Viewer</h2>
        <button data-testid="close-nfo" className="text-blue-400" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="font-mono text-xs text-green-400 leading-4 whitespace-pre">
          {content}
        </pre>
      </div>
    </div>
  );
}
