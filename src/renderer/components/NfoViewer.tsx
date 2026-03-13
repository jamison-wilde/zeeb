import React, { useEffect, useState, useCallback } from 'react';

interface NfoViewerProps {
  visible: boolean;
  content: string;
  onClose: () => void;
}

const URL_REGEX = /https?:\/\/[^\s<>")\]]+(?<![,.:;])/g;

interface ContentSegment {
  type: 'text' | 'url';
  value: string;
}

function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(URL_REGEX.source, 'g');

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'url', value: match[0] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return segments;
}

function CopyableUrl({ url, index }: { url: string; index: number }): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [url]);

  return (
    <span className="relative inline">
      <span className="text-blue-400 underline">{url}</span>
      <span
        data-testid={`copy-url-${index}`}
        className="absolute -top-4 -right-5 cursor-pointer text-[10px] text-gray-400 hover:text-white select-none"
        onClick={handleCopy}
        title="Copy URL"
      >
        {copied ? 'Copied!' : '📋'}
      </span>
    </span>
  );
}

export function NfoViewer({ visible, content, onClose }: NfoViewerProps): React.JSX.Element | null {
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  const segments = parseContent(content);
  let urlIndex = 0;

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
          {segments.map((seg, i) => {
            if (seg.type === 'url') {
              const idx = urlIndex++;
              return <CopyableUrl key={i} url={seg.value} index={idx} />;
            }
            return <React.Fragment key={i}>{seg.value}</React.Fragment>;
          })}
        </pre>
      </div>
    </div>
  );
}
