import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Renamer } from './components/Renamer';

type ViewName = 'folderBrowser' | 'process';

function App(): React.JSX.Element {
  const [view, setView] = useState<ViewName>('folderBrowser');
  const [activeRenamer, setActiveRenamer] = useState<0 | 1>(0);
  const [showOptions, setShowOptions] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);

  const swapRenamer = useCallback(() => {
    setActiveRenamer((prev) => (prev === 0 ? 1 : 0) as 0 | 1);
  }, []);

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
          <Text>Folder Browser</Text>
        </View>
      )}

      {view === 'process' && (
        <View testID="renamer-view" style={styles.content}>
          <View testID="renamer-0">
            <Renamer
              instanceId={0}
              visible={activeRenamer === 0}
              onComplete={swapRenamer}
            />
          </View>
          <View testID="renamer-1">
            <Renamer
              instanceId={1}
              visible={activeRenamer === 1}
              onComplete={swapRenamer}
            />
          </View>
        </View>
      )}

      <Modal visible={showOptions} transparent>
        <View testID="options-modal" style={styles.modal}>
          <Text>Options</Text>
          <TouchableOpacity onPress={() => setShowOptions(false)}>
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={showUndo} transparent>
        <View testID="undo-modal" style={styles.modal}>
          <Text>Undo</Text>
          <TouchableOpacity onPress={() => setShowUndo(false)}>
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={showReleaseNotes} transparent>
        <View testID="release-notes-modal" style={styles.modal}>
          <Text>Release Notes</Text>
          <TouchableOpacity onPress={() => setShowReleaseNotes(false)}>
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});

export default App;
