import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface ReleaseNotesProps {
  visible: boolean;
  onClose: () => void;
}

const RELEASE_NOTES = `Zeeb - React Native Rewrite

v2.0.0
- Complete rewrite in React Native for cross-platform support
- Dual renamer with swap logic for faster processing
- Improved IMDB extraction with configurable patterns
- Full undo support with transaction history
- Legacy config import from XML
- NFO file scanning and parsing
- URL and webloc file generation
- TMDB poster downloads
- Customizable format strings with token interpolation
`;

export function ReleaseNotes({ visible, onClose }: ReleaseNotesProps): React.JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Release Notes</Text>
            <TouchableOpacity testID="release-notes-close" onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            testID="release-notes-content"
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.notesText}>{RELEASE_NOTES}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeText: {
    fontSize: 16,
    color: '#007AFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
