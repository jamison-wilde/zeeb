import React, { useEffect, useState, useCallback } from 'react';
import { renderMarkdown } from '../../services/markdownRenderer';
import { usePlatform } from '../PlatformContext';

interface UpdateData {
  version: string;
  releaseNotes: string;
  releaseUrl: string;
  assets: Array<{ name: string; url: string; size: number }>;
}

interface UpdateModalProps {
  data: UpdateData;
  onClose: () => void;
  onSkip: (version: string) => void;
}

export function UpdateModal({ data, onClose, onSkip }: UpdateModalProps): React.JSX.Element {
  const platform = usePlatform();
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadedPath, setDownloadedPath] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    unsubs.push(platform.update.onDownloadProgress((p) => {
      setProgress(p.percent);
    }));
    unsubs.push(platform.update.onDownloadComplete((d) => {
      setDownloadedPath(d.filePath);
      setDownloadState('complete');
    }));
    unsubs.push(platform.update.onDownloadError((e) => {
      setErrorMessage(e.message);
      setDownloadState('error');
    }));
    return () => unsubs.forEach((fn) => fn());
  }, [platform]);

  const platformAsset = data.assets.find((a) => {
    if (process.platform === 'win32') return a.name.endsWith('.exe');
    if (process.platform === 'darwin') return a.name.endsWith('.dmg');
    return false;
  });

  const handleDownload = useCallback(() => {
    if (!platformAsset) return;
    setDownloadState('downloading');
    setProgress(0);
    setErrorMessage('');
    platform.update.downloadUpdate(platformAsset.url);
  }, [platform, platformAsset]);

  const handleShowInFolder = useCallback(() => {
    platform.update.showInFolder(downloadedPath);
  }, [platform, downloadedPath]);

  const handleViewOnGithub = useCallback(() => {
    platform.update.openExternal(data.releaseUrl);
  }, [platform, data.releaseUrl]);

  const handleSkip = useCallback(() => {
    onSkip(data.version);
  }, [data.version, onSkip]);

  const notesHtml = renderMarkdown(data.releaseNotes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-4/5 max-w-2xl max-h-[80%] bg-white rounded-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">Zeeb Movie Renamer v{data.version} Available</h2>
          <button className="text-gray-400 hover:text-gray-600 text-xl" onClick={onClose}>×</button>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: notesHtml }}
        />

        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="flex gap-2">
            {downloadState === 'idle' && platformAsset && (
              <button
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700"
                onClick={handleDownload}
              >
                Download Update
              </button>
            )}
            {downloadState === 'downloading' && (
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded h-8 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all flex items-center justify-center text-white text-xs font-bold"
                    style={{ width: `${progress}%` }}
                  >
                    {progress}%
                  </div>
                </div>
              </div>
            )}
            {downloadState === 'complete' && (
              <button
                className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700"
                onClick={handleShowInFolder}
              >
                Show in Folder
              </button>
            )}
            {downloadState === 'error' && (
              <>
                <button
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700"
                  onClick={handleDownload}
                >
                  Retry Download
                </button>
                <span className="text-red-500 text-sm self-center">{errorMessage}</span>
              </>
            )}
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-bold rounded hover:bg-gray-300"
              onClick={handleViewOnGithub}
            >
              View on GitHub
            </button>
          </div>
          <button
            className="text-xs text-gray-400 hover:text-gray-600"
            onClick={handleSkip}
          >
            Skip this version
          </button>
        </div>
      </div>
    </div>
  );
}
