import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { SearchPart, SearchPartState } from '../../types';

interface SearchPartItemProps {
  part: SearchPart;
  onStateChange: (id: string, state: SearchPartState) => void;
  onTextChange: (id: string, text: string) => void;
}

const STATE_COLORS: Record<SearchPartState, string> = {
  search: '#4a90d9',
  keep: '#4caf50',
  remove: '#f44336',
  keepAlways: '#2e7d32',
  removeAlways: '#b71c1c',
};

const NEXT_STATE: Record<SearchPartState, SearchPartState> = {
  search: 'keep',
  keep: 'remove',
  remove: 'search',
  keepAlways: 'removeAlways',
  removeAlways: 'keepAlways',
};

export function SearchPartItem({ part, onStateChange }: SearchPartItemProps): React.JSX.Element {
  const color = STATE_COLORS[part.state];

  return (
    <TouchableOpacity
      style={[styles.part, { borderColor: color }]}
      onPress={() => onStateChange(part.id, NEXT_STATE[part.state])}
    >
      <Text style={[styles.text, { color }]}>{part.text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  part: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    borderWidth: 1,
    borderRadius: 4,
  },
  text: {
    fontSize: 14,
  },
});
