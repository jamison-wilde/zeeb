import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { MovieFile } from '../../types';

interface FileListProps {
  files: MovieFile[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function FileList({ files, selectedIndex, onSelect }: FileListProps): React.JSX.Element {
  return (
    <FlatList
      testID="file-list"
      data={files}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <TouchableOpacity
          style={[
            styles.item,
            index === selectedIndex && styles.selectedItem,
          ]}
          onPress={() => onSelect(index)}
        >
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            {item.hasNfo && <Text style={styles.nfoIndicator}>NFO</Text>}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedItem: {
    backgroundColor: '#d0e8ff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    flex: 1,
  },
  nfoIndicator: {
    fontSize: 10,
    color: '#4a90d9',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
