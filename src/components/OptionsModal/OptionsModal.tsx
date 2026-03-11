import React from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

interface OptionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OptionsModal({ visible, onClose }: OptionsModalProps): React.JSX.Element {
  return (
    <Modal visible={!!visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Options</Text>
          <TouchableOpacity testID="close-options" onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Format Strings</Text>
          <TextInput
            testID="format-standard-input"
            style={styles.input}
            placeholder="Standard format"
          />
          <TextInput
            testID="format-aka-input"
            style={styles.input}
            placeholder="AKA format"
          />
          <TextInput
            testID="format-dvd-input"
            style={styles.input}
            placeholder="DVD format"
          />

          <Text style={styles.sectionTitle}>Remove Terms</Text>
          <TextInput
            testID="remove-terms-input"
            style={styles.input}
            placeholder="Terms to remove"
          />

          <Text style={styles.sectionTitle}>Keep Terms</Text>
          <TextInput
            testID="keep-terms-input"
            style={styles.input}
            placeholder="Terms to keep"
          />

          <Text style={styles.sectionTitle}>Separators</Text>
          <TextInput
            testID="director-separator-input"
            style={styles.input}
            placeholder="Director separator"
          />
          <TextInput
            testID="genre-separator-input"
            style={styles.input}
            placeholder="Genre separator"
          />
          <TextInput
            testID="star-separator-input"
            style={styles.input}
            placeholder="Star separator"
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeText: {
    color: '#4a90d9',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
});
