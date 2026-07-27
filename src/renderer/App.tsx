import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import type { FsAdapter } from '../adapters/fs';
import { Renamer } from './components/Renamer';
import { OpenFolderModal } from './components/OpenFolderModal';
import { OptionsModal } from './components/OptionsModal';
import { UndoModal } from './components/UndoModal';
import { ReleaseNotes } from './components/ReleaseNotes';
import { UpdateModal } from './components/UpdateModal';
import { AboutModal } from './components/AboutModal';
import { NotificationToast } from './components/NotificationToast';
import { useConfigStore } from '../stores/configStore';
import { useFileStore } from '../stores/fileStore';
import { useNotificationStore } from '../stores/notificationStore';
import { scanDirectory } from '../services/fileScanner';
import { upsertFolderHistory, removeFromFolderHistory } from '../services/folderHistory';
import { useDualCursor } from './hooks/useDualCursor';
import { useTheme } from './hooks/useTheme';
import { useUiZoom, clampUiZoom, UI_ZOOM_STEP } from './hooks/useUiZoom';
import { DEFAULT_CONFIG } from '../services/configDefaults';
import { usePlatform } from './PlatformContext';
import type { RecursionMode } from '../types';

interface AppProps {
  fs: FsAdapter;
}

function App({ fs }: AppProps): React.JSX.Element {
  const platform = usePlatform();
  const [showOpenFolder, setShowOpenFolder] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showTt, setShowTt] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [updateData, setUpdateData] = useState<UpdateData | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  const files = useFileStore((s) => s.files);
  const setFiles = useFileStore((s) => s.setFiles);
  const updateFile = useFileStore((s) => s.updateFile);

  const isFileVisible = useCallback((f: { name: string }) => {
    if (!showSample && /sample/i.test(f.name)) return false;
    if (!showTt && /tt\d{5,}/.test(f.name)) return false;
    return true;
  }, [showTt, showSample]);

  const cursor = useDualCursor({ files, isFileVisible });

  const config = useConfigStore((s) => s.config);
  const load = useConfigStore((s) => s.load);
  const save = useConfigStore((s) => s.save);

  useTheme(config.theme, platform);
  useUiZoom(config.uiZoom, platform);

  useEffect(() => {
    void load().then(() => {
      // Sync menu checkbox with config on startup
      platform.menu.sendWebViewState(useConfigStore.getState().config.showWebView);
    });
  }, [load, platform]);

  useEffect(() => {
    platform.appMeta.getVersion().then(setAppVersion);
  }, [platform]);

  useEffect(() => {
    platform.menu.onOptions(() => setShowOptions(true));
    platform.menu.onUndoRename(() => setShowUndo(true));
    platform.menu.onToggleWebView(() => {
      const store = useConfigStore.getState();
      const newVal = !store.config.showWebView;
      store.updateConfig({ showWebView: newVal });
      void store.save();
      platform.menu.sendWebViewState(newVal);
    });
    platform.menu.onReleaseNotes(() => setShowReleaseNotes(true));
    platform.menu.onOpenFolder(() => {
      setShowOpenFolder(true);
    });
    platform.menu.onAbout(() => setShowAbout(true));
    platform.menu.onSetTheme((t) => {
      const store = useConfigStore.getState();
      store.updateConfig({ theme: t });
      void store.save();
    });
    platform.menu.onZoomIn(() => {
      const store = useConfigStore.getState();
      store.updateConfig({ uiZoom: clampUiZoom(store.config.uiZoom + UI_ZOOM_STEP) });
      void store.save();
    });
    platform.menu.onZoomOut(() => {
      const store = useConfigStore.getState();
      store.updateConfig({ uiZoom: clampUiZoom(store.config.uiZoom - UI_ZOOM_STEP) });
      void store.save();
    });
    platform.menu.onZoomReset(() => {
      const store = useConfigStore.getState();
      store.updateConfig({ uiZoom: DEFAULT_CONFIG.uiZoom });
      void store.save();
    });
  }, [platform]);

  useEffect(() => {
    platform.menu.sendThemeState(config.theme);
  }, [config.theme, platform]);

  useEffect(() => {
    return platform.update.onUpdateAvailable((data) => {
      setUpdateData(data);
    });
  }, [platform]);

  const updateConfig = useConfigStore((s) => s.updateConfig);

  const handleFolderSelected = useCallback(
    async (path: string, depth: RecursionMode) => {
      let results;
      try {
        results = await scanDirectory(fs, path, config.movieExtensions, depth, {
          detectDvd: config.detectDvd,
        });
      } catch {
        useNotificationStore.getState().notify('error', 'Folder listing failed');
        return;
      }
      updateConfig({
        folderHistory: upsertFolderHistory(config.folderHistory, {
          path,
          depth,
          fileCount: results.length,
          lastScanned: Date.now(),
        }),
      });
      void save();
      setFiles(results);
      cursor.setFromList(results);
      setShowOpenFolder(false);
    },
    [fs, config.movieExtensions, config.detectDvd, config.folderHistory, setFiles, updateConfig, save, cursor],
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

  const handleRemoveHistory = useCallback(
    (path: string) => {
      updateConfig({ folderHistory: removeFromFolderHistory(config.folderHistory, path) });
      void save();
    },
    [config.folderHistory, updateConfig, save],
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
    const cfg = useConfigStore.getState().config;
    const entry = cfg.folderHistory[0];
    if (!entry) return;
    const results = await scanDirectory(fs, entry.path, cfg.movieExtensions, entry.depth, {
      detectDvd: cfg.detectDvd,
    });
    setFiles(results);
  }, [fs, setFiles]);

  return (
    <div className="flex flex-col h-full">
      <div data-testid="renamer-view" className="flex-1 flex flex-col min-h-0">
        <div data-testid="renamer-0" className={`flex-1 flex flex-col min-h-0 ${cursor.active === 0 ? '' : 'hidden'}`}>
          <Renamer
            instanceId={0}
            fileIndex={cursor.index0}
            files={files}
            isFileVisible={isFileVisible}
            fs={fs}
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

      <OpenFolderModal
        visible={showOpenFolder}
        history={config.folderHistory}
        onClose={() => setShowOpenFolder(false)}
        onSelect={handleFolderSelected}
        onRemove={handleRemoveHistory}
      />

      <OptionsModal visible={showOptions} onClose={handleOptionsClose} />
      <UndoModal
        visible={showUndo}
        onClose={() => setShowUndo(false)}
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
