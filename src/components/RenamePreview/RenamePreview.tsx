import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface RenamePreviewProps {
  originalName: string;
  previewName: string;
  onRename: () => void;
  onSkip: () => void;
}

export function RenamePreview({
  originalName,
  previewName,
  onRename,
  onSkip,
}: RenamePreviewProps): React.JSX.Element {
  const renameDisabled = previewName.length === 0;

  return (
    <View style={styles.container} testID="rename-preview">
      <Text style={styles.label}>Original:</Text>
      <Text style={styles.filename}>{originalName}</Text>
      <Text style={styles.arrow}>→</Text>
      <Text style={styles.label}>New:</Text>
      <Text style={styles.filename}>{previewName}</Text>
      <View style={styles.buttons}>
        <TouchableOpacity
          testID="rename-button"
          style={[styles.button, styles.renameButton, renameDisabled && styles.buttonDisabled]}
          onPress={onRename}
          disabled={renameDisabled}
        >
          <Text style={styles.buttonText}>Rename</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="skip-button"
          style={[styles.button, styles.skipButton]}
          onPress={onSkip}
        >
          <Text style={styles.buttonText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  filename: {
    fontSize: 14,
    marginBottom: 8,
  },
  arrow: {
    textAlign: 'center',
    fontSize: 18,
    marginVertical: 4,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  renameButton: {
    backgroundColor: '#4a90d9',
  },
  skipButton: {
    backgroundColor: '#999',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
