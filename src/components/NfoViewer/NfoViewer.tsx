import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface NfoViewerProps {
  visible: boolean;
  content: string;
  onClose: () => void;
}

export function NfoViewer({ visible, content, onClose }: NfoViewerProps): React.JSX.Element {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>NFO Viewer</Text>
          <TouchableOpacity testID="close-nfo" onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.content}>
          <Text style={styles.nfoText}>{content}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeText: {
    color: '#4a90d9',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  nfoText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#00ff00',
    lineHeight: 16,
  },
});
