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
  const [showTt, setShowTt] = useState(false);
  const [showSample, setShowSample] = useState(false);

  // Each renamer gets its own file index; they interleave (0,2,4... and 1,3,5...)
  const [fileIndex0, setFileIndex0] = useState(0);
  const [fileIndex1, setFileIndex1] = useState(1);

  const fileStoreRef = useRef(createFileStore());
  const undoStoreRef = useRef(createUndoStore(fs));

  const files = useStore(fileStoreRef.current, (s) => s.files);
  const setFiles = useStore(fileStoreRef.current, (s) => s.setFiles);
  const updateFile = useStore(fileStoreRef.current, (s) => s.updateFile);

  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      if (!showSample && /sample/i.test(f.name)) return false;
      if (!showTt && /tt\d{5,}/.test(f.name)) return false;
      return true;
    });
  }, [files, showTt, showSample]);

  const transactions = useStore(undoStoreRef.current, (s) => s.transactions);
  const undoTransaction = useStore(undoStoreRef.current, (s) => s.undoTransaction);

  const config = useConfigStore((s) => s.config);
  const load = useConfigStore((s) => s.load);
  const save = useConfigStore((s) => s.save);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    window.zeebMenu.onOptions(() => setShowOptions(true));
    window.zeebMenu.onUndo(() => {
      const txns = undoStoreRef.current.getState().transactions;
      if (txns.length > 0) {
        void undoStoreRef.current.getState().undoTransaction(txns[txns.length - 1].id);
      }
    });
    window.zeebMenu.onReleaseNotes(() => setShowReleaseNotes(true));
  }, []);

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
      setFileIndex0(0);
      setFileIndex1(1);
      setActiveRenamer(0);
      setView('process');
    },
    [fs, config.movieExtensions, setFiles],
  );

  const handleComplete0 = useCallback(() => {
    // Renamer 0 done — advance its index by 2, flip to renamer 1
    setFileIndex0((prev) => prev + 2);
    setActiveRenamer(1);
  }, []);

  const handleComplete1 = useCallback(() => {
    // Renamer 1 done — advance its index by 2, flip to renamer 0
    setFileIndex1((prev) => prev + 2);
    setActiveRenamer(0);
  }, []);

  const handleFileRenamed = useCallback(
    (fileId: string, newName: string, newPath: string) => {
      const ext = newName.includes('.') ? newName.substring(newName.lastIndexOf('.') + 1).toLowerCase() : '';
      const sep = newPath.includes('\\') ? '\\' : '/';
      const folder = newPath.substring(0, newPath.lastIndexOf(sep));
      updateFile(fileId, { name: newName, nativePath: newPath, extension: ext, folder });
    },
    [updateFile],
  );

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
      {view === 'folderBrowser' && (
        <div className="flex flex-row p-2 bg-gray-100 gap-3">
          <button
            data-testid="start-processing"
            className="px-3 py-2 hover:bg-gray-200 rounded"
            onClick={() => setView('process')}
          >
            Start Processing
          </button>
        </div>
      )}

      {view === 'folderBrowser' && (
        <div data-testid="folder-browser" className="flex-1">
          <FolderBrowser
            onFolderSelected={handleFolderSelected}
            recentFolders={recentFolders}
          />
        </div>
      )}

      {view === 'process' && (
        <div data-testid="renamer-view" className="flex-1 flex flex-col min-h-0">
          <div data-testid="renamer-0" className={`flex-1 flex flex-col min-h-0 ${activeRenamer === 0 ? '' : 'hidden'}`}>
            <Renamer
              instanceId={0}
              visible={activeRenamer === 0}
              fileIndex={fileIndex0}
              files={filteredFiles}
              fs={fs}
              undoStore={undoStoreRef.current}
              onFileRenamed={handleFileRenamed}
              onComplete={handleComplete0}
              showTt={showTt}
              onShowTtChange={setShowTt}
              showSample={showSample}
              onShowSampleChange={setShowSample}
            />
          </div>
          <div data-testid="renamer-1" className={`flex-1 flex flex-col min-h-0 ${activeRenamer === 1 ? '' : 'hidden'}`}>
            <Renamer
              instanceId={1}
              visible={activeRenamer === 1}
              fileIndex={fileIndex1}
              files={filteredFiles}
              fs={fs}
              undoStore={undoStoreRef.current}
              onFileRenamed={handleFileRenamed}
              onComplete={handleComplete1}
              showTt={showTt}
              onShowTtChange={setShowTt}
              showSample={showSample}
              onShowSampleChange={setShowSample}
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
