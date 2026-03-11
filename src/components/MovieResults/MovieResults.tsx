import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { MovieMatch } from '../../types';

interface MovieResultsProps {
  matches: MovieMatch[];
  onSelect: (tt: string) => void;
}

export function MovieResults({ matches, onSelect }: MovieResultsProps): React.JSX.Element {
  if (matches.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text>No results</Text>
      </View>
    );
  }

  return (
    <FlatList
      testID="movie-results-list"
      data={matches}
      keyExtractor={(item) => item.tt}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.item}
          onPress={() => onSelect(item.tt)}
        >
          <Text>{item.title} ({item.year})</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
});
