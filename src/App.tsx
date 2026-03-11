import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useStore } from 'zustand';
import { Renamer } from './components/Renamer';
import { FolderBrowser } from './components/FolderBrowser';
import { OptionsModal } from './components/OptionsModal';
import { UndoModal } from './components/UndoModal';
import { ReleaseNotes } from './components/ReleaseNotes';
import { useConfigStore } from './stores/configStore';
import { createFileStore } from './stores/fileStore';
import { createUndoStore } from './stores/undoStore';
import { scanDirectory } from './services/fileScanner';

type ViewName = 'folderBrowser' | 'process';

function App(): React.JSX.Element {
  const [view, setView] = useState<ViewName>('folderBrowser');
  const [activeRenamer, setActiveRenamer] = useState<0 | 1>(0);
  const [showOptions, setShowOptions] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);

  const fileStoreRef = useRef(createFileStore());
  const undoStoreRef = useRef(createUndoStore());

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
        path,
        config.movieExtensions,
        recursionMode as 'none' | 'subfolders' | 'full',
      );
      setFiles(results);
      setView('process');
    },
    [config.movieExtensions, setFiles],
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
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          testID="options-button"
          style={styles.toolbarButton}
          onPress={() => setShowOptions(true)}
        >
          <Text>Options</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="undo-button"
          style={styles.toolbarButton}
          onPress={() => setShowUndo(true)}
        >
          <Text>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="release-notes-button"
          style={styles.toolbarButton}
          onPress={() => setShowReleaseNotes(true)}
        >
          <Text>Release Notes</Text>
        </TouchableOpacity>
        {view === 'folderBrowser' && (
          <TouchableOpacity
            testID="start-processing"
            style={styles.toolbarButton}
            onPress={() => setView('process')}
          >
            <Text>Start Processing</Text>
          </TouchableOpacity>
        )}
      </View>

      {view === 'folderBrowser' && (
        <View testID="folder-browser" style={styles.content}>
          <FolderBrowser
            onFolderSelected={handleFolderSelected}
            recentFolders={recentFolders}
          />
        </View>
      )}

      {view === 'process' && (
        <View testID="renamer-view" style={styles.content}>
          <View testID="renamer-0">
            <Renamer
              instanceId={0}
              visible={activeRenamer === 0}
              files={files}
              undoStore={undoStoreRef.current}
              onComplete={swapRenamer}
            />
          </View>
          <View testID="renamer-1">
            <Renamer
              instanceId={1}
              visible={activeRenamer === 1}
              files={files}
              undoStore={undoStoreRef.current}
              onComplete={swapRenamer}
            />
          </View>
        </View>
      )}

      <OptionsModal
        visible={showOptions}
        onClose={handleOptionsClose}
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#f0f0f0',
  },
  toolbarButton: {
    marginRight: 12,
    padding: 8,
  },
  content: {
    flex: 1,
  },
});

export default App;
