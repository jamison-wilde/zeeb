import React from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { RenameTransaction } from '../../types';

interface UndoModalProps {
  visible: boolean;
  onClose: () => void;
  transactions: RenameTransaction[];
  onUndo: (id: string) => void;
}

export function UndoModal({
  visible,
  onClose,
  transactions,
  onUndo,
}: UndoModalProps): React.JSX.Element {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Undo History</Text>
          <TouchableOpacity testID="close-undo" onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text>No undo history</Text>
          </View>
        ) : (
          <FlatList
            testID="undo-list"
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <View style={styles.itemInfo}>
                  <Text style={styles.timestamp}>
                    {new Date(item.timestamp).toLocaleString()}
                  </Text>
                  <Text style={styles.entryCount}>
                    {item.entries.length} {item.entries.length === 1 ? 'file' : 'files'}
                  </Text>
                </View>
                <TouchableOpacity
                  testID={`undo-button-${item.id}`}
                  style={styles.undoButton}
                  onPress={() => onUndo(item.id)}
                >
                  <Text style={styles.undoButtonText}>Undo</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  itemInfo: {
    flex: 1,
  },
  timestamp: {
    fontSize: 14,
  },
  entryCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  undoButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  undoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
