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

  const isFileVisible = useCallback((f: { name: string }) => {
    if (!showSample && /sample/i.test(f.name)) return false;
    if (!showTt && /tt\d{5,}/.test(f.name)) return false;
    return true;
  }, [showTt, showSample]);

  const findNextVisible = useCallback((fromIndex: number, step: number): number => {
    let idx = fromIndex;
    const allFiles = fileStoreRef.current.getState().files;
    while (idx < allFiles.length && !isFileVisible(allFiles[idx])) {
      idx += step;
    }
    return idx;
  }, [isFileVisible]);

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
    window.zeebMenu.onOpenFolder(() => {
      setFiles([]);
      setView('folderBrowser');
    });
  }, []);

  const recentFolders = useMemo(() => config.recentFolders, [config.recentFolders]);

  const updateConfig = useConfigStore((s) => s.updateConfig);

  useEffect(() => {
    const cleanup = window.zeebMenu.onWindowStateChanged((state: Partial<{ windowWidth: number; windowHeight: number; windowMaximized: boolean }>) => {
      updateConfig(state);
      void save();
    });
    return cleanup;
  }, [updateConfig, save]);

  const handleFolderSelected = useCallback(
    async (path: string, recursionMode: string) => {
      // Save folder and recursion mode to config
      const recent = [path, ...config.recentFolders.filter((f) => f !== path)].slice(0, 10);
      updateConfig({
        recentFolders: recent,
        recursionMode: recursionMode as 'none' | 'subfolders' | 'full',
      });
      void save();

      const results = await scanDirectory(
        fs,
        path,
        config.movieExtensions,
        recursionMode as 'none' | 'subfolders' | 'full',
        { detectDvd: config.detectDvd },
      );
      setFiles(results);
      // Find first two visible files for the interleaved renamers
      let idx0 = 0;
      while (idx0 < results.length && !isFileVisible(results[idx0])) idx0++;
      let idx1 = idx0 + 1;
      while (idx1 < results.length && !isFileVisible(results[idx1])) idx1++;
      setFileIndex0(idx0);
      setFileIndex1(idx1);
      setActiveRenamer(0);
      setView('process');
    },
    [fs, config.movieExtensions, config.recentFolders, setFiles, updateConfig, save],
  );

  // After the active renamer completes (rename/skip), advance it past the
  // other renamer's file so both always point at distinct visible files.
  const handleComplete0 = useCallback(() => {
    setFileIndex0((prev) => {
      // Advance past current file, then skip any invisible files and also
      // skip the file that renamer 1 is sitting on
      const otherIdx = fileIndex1;
      let next = findNextVisible(prev + 1, 1);
      if (next === otherIdx) next = findNextVisible(next + 1, 1);
      return next;
    });
    setActiveRenamer(1);
  }, [findNextVisible, fileIndex1]);

  const handleComplete1 = useCallback(() => {
    setFileIndex1((prev) => {
      const otherIdx = fileIndex0;
      let next = findNextVisible(prev + 1, 1);
      if (next === otherIdx) next = findNextVisible(next + 1, 1);
      return next;
    });
    setActiveRenamer(0);
  }, [findNextVisible, fileIndex0]);

  const handleFileSelect0 = useCallback((clickedIndex: number) => {
    setFileIndex0(clickedIndex);
    const next1 = findNextVisible(clickedIndex + 1, 1);
    setFileIndex1(next1);
  }, [findNextVisible]);

  const handleFileSelect1 = useCallback((clickedIndex: number) => {
    setFileIndex1(clickedIndex);
    const next0 = findNextVisible(clickedIndex + 1, 1);
    setFileIndex0(next0);
  }, [findNextVisible]);

  const handleFileRenamed = useCallback(
    (fileId: string, newName: string, newPath: string) => {
      const ext = newName.includes('.') ? newName.substring(newName.lastIndexOf('.') + 1).toLowerCase() : '';
      const sep = newPath.includes('\\') ? '\\' : '/';
      const folder = newPath.substring(0, newPath.lastIndexOf(sep));
      updateFile(fileId, { name: newName, nativePath: newPath, extension: ext, folder });
    },
    [updateFile],
  );

  const handleRemoveRecentFolder = useCallback(
    (folder: string) => {
      updateConfig({ recentFolders: config.recentFolders.filter((f) => f !== folder) });
      void save();
    },
    [config.recentFolders, updateConfig, save],
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
        <div data-testid="folder-browser" className="flex-1">
          <FolderBrowser
            onFolderSelected={handleFolderSelected}
            recentFolders={recentFolders}
            onRemoveRecentFolder={handleRemoveRecentFolder}
            initialRecursionMode={config.recursionMode}
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
              files={files}
              isFileVisible={isFileVisible}
              fs={fs}
              undoStore={undoStoreRef.current}
              onFileRenamed={handleFileRenamed}
              onComplete={handleComplete0}
              onFileSelect={handleFileSelect0}
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
              files={files}
              isFileVisible={isFileVisible}
              fs={fs}
              undoStore={undoStoreRef.current}
              onFileRenamed={handleFileRenamed}
              onComplete={handleComplete1}
              onFileSelect={handleFileSelect1}
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
