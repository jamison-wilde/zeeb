import React, { useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useConfigStore } from '../../stores/configStore';

interface OptionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OptionsModal({ visible, onClose }: OptionsModalProps): React.JSX.Element {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);

  const handleChange = useCallback(
    (field: string, value: string) => {
      updateConfig({ [field]: value });
    },
    [updateConfig],
  );

  return (
    <Modal visible={!!visible} animationType="slide" transparent={false}>
      <View testID="options-modal" style={styles.container}>
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
            value={config.formatStandard}
            onChangeText={(v) => handleChange('formatStandard', v)}
          />
          <TextInput
            testID="format-aka-input"
            style={styles.input}
            placeholder="AKA format"
            value={config.formatAka}
            onChangeText={(v) => handleChange('formatAka', v)}
          />
          <TextInput
            testID="format-dvd-input"
            style={styles.input}
            placeholder="DVD format"
            value={config.formatDvd}
            onChangeText={(v) => handleChange('formatDvd', v)}
          />

          <Text style={styles.sectionTitle}>Remove Terms</Text>
          <TextInput
            testID="remove-terms-input"
            style={styles.input}
            placeholder="Terms to remove"
            value={config.removeTerms.join(', ')}
            onChangeText={(v) =>
              updateConfig({ removeTerms: v.split(',').map((t) => t.trim()).filter(Boolean) })
            }
          />

          <Text style={styles.sectionTitle}>Keep Terms</Text>
          <TextInput
            testID="keep-terms-input"
            style={styles.input}
            placeholder="Terms to keep"
            value={config.keepTerms.join(', ')}
            onChangeText={(v) =>
              updateConfig({ keepTerms: v.split(',').map((t) => t.trim()).filter(Boolean) })
            }
          />

          <Text style={styles.sectionTitle}>Separators</Text>
          <TextInput
            testID="director-separator-input"
            style={styles.input}
            placeholder="Director separator"
            value={config.directorSeparator}
            onChangeText={(v) => handleChange('directorSeparator', v)}
          />
          <TextInput
            testID="genre-separator-input"
            style={styles.input}
            placeholder="Genre separator"
            value={config.genreSeparator}
            onChangeText={(v) => handleChange('genreSeparator', v)}
          />
          <TextInput
            testID="star-separator-input"
            style={styles.input}
            placeholder="Star separator"
            value={config.starSeparator}
            onChangeText={(v) => handleChange('starSeparator', v)}
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
