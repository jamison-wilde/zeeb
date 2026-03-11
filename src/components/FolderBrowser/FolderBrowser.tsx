import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

interface FolderBrowserProps {
  onFolderSelected: (path: string, recursionMode: string) => void;
  recentFolders: string[];
}

type RecursionMode = 'none' | 'subfolders' | 'full';

const RECURSION_OPTIONS: { label: string; value: RecursionMode }[] = [
  { label: 'None', value: 'none' },
  { label: 'Subfolders', value: 'subfolders' },
  { label: 'Full', value: 'full' },
];

export function FolderBrowser({ onFolderSelected, recentFolders }: FolderBrowserProps): React.JSX.Element {
  const [folderPath, setFolderPath] = useState('');
  const [recursionMode, setRecursionMode] = useState<RecursionMode>('none');

  const handleListMovies = (): void => {
    onFolderSelected(folderPath, recursionMode);
  };

  return (
    <View style={styles.container}>
      <TextInput
        testID="folder-path-input"
        style={styles.input}
        value={folderPath}
        onChangeText={setFolderPath}
        placeholder="Enter folder path..."
      />

      <ScrollView testID="recent-folders" horizontal style={styles.recentFolders}>
        {recentFolders.map((folder, index) => (
          <TouchableOpacity
            key={index}
            style={styles.recentFolder}
            onPress={() => setFolderPath(folder)}
          >
            <Text>{folder}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View testID="recursion-mode" style={styles.recursionMode}>
        {RECURSION_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.recursionOption,
              recursionMode === option.value && styles.recursionOptionSelected,
            ]}
            onPress={() => setRecursionMode(option.value)}
          >
            <Text>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        testID="list-movies-button"
        style={styles.listButton}
        onPress={handleListMovies}
      >
        <Text>List Movies</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  recentFolders: {
    maxHeight: 40,
    marginBottom: 12,
  },
  recentFolder: {
    padding: 8,
    marginRight: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  recursionMode: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  recursionOption: {
    padding: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
  recursionOptionSelected: {
    backgroundColor: '#4a90d9',
    borderColor: '#4a90d9',
  },
  listButton: {
    backgroundColor: '#4a90d9',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
});
