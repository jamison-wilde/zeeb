import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import type { SearchPart, SearchPartState } from '../../types';
import { SearchPartItem } from './SearchPartItem';

interface SearchPartsProps {
  parts: SearchPart[];
  onPartStateChange: (id: string, state: SearchPartState) => void;
  onPartTextChange: (id: string, text: string) => void;
  onSearch: () => void;
}

export function SearchParts({
  parts,
  onPartStateChange,
  onPartTextChange,
  onSearch,
}: SearchPartsProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <ScrollView horizontal style={styles.partsRow} testID="search-parts-row">
        {parts.map((part) => (
          <SearchPartItem
            key={part.id}
            part={part}
            onStateChange={onPartStateChange}
            onTextChange={onPartTextChange}
          />
        ))}
      </ScrollView>
      <TouchableOpacity
        testID="search-button"
        style={styles.searchButton}
        onPress={onSearch}
      >
        <Text style={styles.searchButtonText}>Search</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  partsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  searchButton: {
    backgroundColor: '#4a90d9',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
