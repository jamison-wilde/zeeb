import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import type { FsAdapter } from '../adapters/fs';
import { Renamer } from './components/Renamer';
import { FolderBrowser } from './components/FolderBrowser';
import { OptionsModal } from './components/OptionsModal';
import { UndoModal } from './components/UndoModal';
import { ReleaseNotes } from './components/ReleaseNotes';
import { useConfigStore } from '../stores/configStore';
import { createFileStore } from '../stores/fileStore';
import { createUndoStore } from '../stores/undoStore';
import { scanDirectory } from '../services/fileScanner';

type ViewName = 'folderBrowser' | 'process';

interface AppProps {
  fs: FsAdapter;
}

function App({ fs }: AppProps): React.JSX.Element {
  const [view, setView] = useState<ViewName>('folderBrowser');
  const [activeRenamer, setActiveRenamer] = useState<0 | 1>(0);
  const [showOptions, setShowOptions] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);

  const fileStoreRef = useRef(createFileStore());
  const undoStoreRef = useRef(createUndoStore(fs));

  const files = useStore(fileStoreRef.current, (s) => s.files);
  const setFiles = useStore(fileStoreRef.current, (s) => s.setFiles);

  const transactions = useStore(undoStoreRef.current, (s) => s.transactions);
  const undoTransaction = useStore(undoStoreRef.current, (s) => s.undoTransaction);

  const config = useConfigStore((s) => s.config);
  const load = useConfigStore((s) => s.load);
  const save = useConfigStore((s) => s.save);

  useEffect(() => {
    void load();
  }, [load]);

  const recentFolders = useMemo(() => config.recentFolders, [config.recentFolders]);

  const handleFolderSelected = useCallback(
    async (path: string, recursionMode: string) => {
      const results = await scanDirectory(
        fs,
        path,
        config.movieExtensions,
        recursionMode as 'none' | 'subfolders' | 'full',
      );
      setFiles(results);
      setView('process');
    },
    [fs, config.movieExtensions, setFiles],
  );

  const swapRenamer = useCallback(() => {
    setActiveRenamer((prev) => (prev === 0 ? 1 : 0) as 0 | 1);
  }, []);

  const handleOptionsClose = useCallback(() => {
    setShowOptions(false);
    void save();
  }, [save]);

  const handleUndo = useCallback(
    (id: string) => {
      void undoTransaction(id);
    },
    [undoTransaction],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-row p-2 bg-gray-100 gap-3">
        <button
          data-testid="options-button"
          className="px-3 py-2 hover:bg-gray-200 rounded"
          onClick={() => setShowOptions(true)}
        >
          Options
        </button>
        <button
          data-testid="undo-button"
          className="px-3 py-2 hover:bg-gray-200 rounded"
          onClick={() => setShowUndo(true)}
        >
          Undo
        </button>
        <button
          data-testid="release-notes-button"
          className="px-3 py-2 hover:bg-gray-200 rounded"
          onClick={() => setShowReleaseNotes(true)}
        >
          Release Notes
        </button>
        {view === 'folderBrowser' && (
          <button
            data-testid="start-processing"
            className="px-3 py-2 hover:bg-gray-200 rounded"
            onClick={() => setView('process')}
          >
            Start Processing
          </button>
        )}
      </div>

      {view === 'folderBrowser' && (
        <div data-testid="folder-browser" className="flex-1">
          <FolderBrowser
            onFolderSelected={handleFolderSelected}
            recentFolders={recentFolders}
          />
        </div>
      )}

      {view === 'process' && (
        <div data-testid="renamer-view" className="flex-1 flex flex-col">
          <div data-testid="renamer-0">
            <Renamer
              instanceId={0}
              visible={activeRenamer === 0}
              files={files}
              fs={fs}
              undoStore={undoStoreRef.current}
              onComplete={swapRenamer}
            />
          </div>
          <div data-testid="renamer-1">
            <Renamer
              instanceId={1}
              visible={activeRenamer === 1}
              files={files}
              fs={fs}
              undoStore={undoStoreRef.current}
              onComplete={swapRenamer}
            />
          </div>
        </div>
      )}

      <OptionsModal visible={showOptions} onClose={handleOptionsClose} />
      <UndoModal
        visible={showUndo}
        onClose={() => setShowUndo(false)}
        transactions={transactions}
        onUndo={handleUndo}
      />
      <ReleaseNotes
        visible={showReleaseNotes}
        onClose={() => setShowReleaseNotes(false)}
      />
    </div>
  );
}

export default App;
