import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import type { FsAdapter } from '../adapters/fs';
import { Renamer } from './components/Renamer';
import { FolderBrowser } from './components/FolderBrowser';
import { OptionsModal } from './components/OptionsModal';
import { UndoModal } from './components/UndoModal';
import { ReleaseNotes } from './components/ReleaseNotes';
import { UpdateModal } from './components/UpdateModal';
import { AboutModal } from './components/AboutModal';
import { NotificationToast } from './components/NotificationToast';
import { useConfigStore, getConfigStore } from '../stores/configStore';
import { createFileStore } from '../stores/fileStore';
import { createUndoStore } from '../stores/undoStore';
import { scanDirectory } from '../services/fileScanner';
import { useDualCursor } from './hooks/useDualCursor';

type ViewName = 'folderBrowser' | 'process';

interface AppProps {
  fs: FsAdapter;
}

function App({ fs }: AppProps): React.JSX.Element {
  const [view, setView] = useState<ViewName>('folderBrowser');
  const [showOptions, setShowOptions] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showTt, setShowTt] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [updateData, setUpdateData] = useState<UpdateData | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [appVersion, setAppVersion] = useState('');

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

  const cursor = useDualCursor({ files, isFileVisible });

  const config = useConfigStore((s) => s.config);
  const load = useConfigStore((s) => s.load);
  const save = useConfigStore((s) => s.save);

  useEffect(() => {
    void load().then(() => {
      // Sync menu checkbox with config on startup
      window.zeebMenu.sendWebViewState(getConfigStore().getState().config.showWebView);
    });
  }, [load]);

  useEffect(() => {
    window.zeebApp.getVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    window.zeebMenu.onOptions(() => setShowOptions(true));
    window.zeebMenu.onUndoRename(() => setShowUndo(true));
    window.zeebMenu.onToggleWebView(() => {
      const store = getConfigStore().getState();
      const newVal = !store.config.showWebView;
      store.updateConfig({ showWebView: newVal });
      void store.save();
      window.zeebMenu.sendWebViewState(newVal);
    });
    window.zeebMenu.onReleaseNotes(() => setShowReleaseNotes(true));
    window.zeebMenu.onOpenFolder(() => {
      setFiles([]);
      setView('folderBrowser');
    });
    window.zeebMenu.onAbout(() => setShowAbout(true));
  }, []);

  useEffect(() => {
    return window.zeebUpdate.onUpdateAvailable((data) => {
      setUpdateData(data);
    });
  }, []);

  const recentFolders = useMemo(() => config.recentFolders, [config.recentFolders]);

  const updateConfig = useConfigStore((s) => s.updateConfig);

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
      cursor.setFromList(results);
      setView('process');
    },
    [fs, config.movieExtensions, config.recentFolders, setFiles, updateConfig, save, cursor],
  );

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

  const handleSkipUpdate = useCallback((version: string) => {
    updateConfig({ skipUpdateVersion: version });
    void save();
    setUpdateData(null);
  }, [updateConfig, save]);

  const handleRescan = useCallback(async () => {
    const cfg = getConfigStore().getState().config;
    const folder = cfg.recentFolders[0];
    if (!folder) return;
    const results = await scanDirectory(
      fs,
      folder,
      cfg.movieExtensions,
      cfg.recursionMode,
      { detectDvd: cfg.detectDvd },
    );
    setFiles(results);
  }, [fs, setFiles]);

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
          <div data-testid="renamer-0" className={`flex-1 flex flex-col min-h-0 ${cursor.active === 0 ? '' : 'hidden'}`}>
            <Renamer
              instanceId={0}
              fileIndex={cursor.index0}
              files={files}
              isFileVisible={isFileVisible}
              fs={fs}
              undoStore={undoStoreRef.current}
              onFileRenamed={handleFileRenamed}
              onComplete={cursor.advance}
              onFileSelect={cursor.selectAt}
              showTt={showTt}
              onShowTtChange={setShowTt}
              showSample={showSample}
              onShowSampleChange={setShowSample}
            />
          </div>
          <div data-testid="renamer-1" className={`flex-1 flex flex-col min-h-0 ${cursor.active === 1 ? '' : 'hidden'}`}>
            <Renamer
              instanceId={1}
              fileIndex={cursor.index1}
              files={files}
              isFileVisible={isFileVisible}
              fs={fs}
              undoStore={undoStoreRef.current}
              onFileRenamed={handleFileRenamed}
              onComplete={cursor.advance}
              onFileSelect={cursor.selectAt}
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
        undoStore={undoStoreRef.current}
        onRescan={handleRescan}
      />
      <ReleaseNotes
        visible={showReleaseNotes}
        onClose={() => setShowReleaseNotes(false)}
      />
      {updateData && (
        <UpdateModal
          data={updateData}
          onClose={() => setUpdateData(null)}
          onSkip={handleSkipUpdate}
        />
      )}
      <AboutModal
        visible={showAbout}
        onClose={() => setShowAbout(false)}
        version={appVersion}
      />
      <NotificationToast />
    </div>
  );
}

export default App;
