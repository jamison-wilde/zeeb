import React from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface PosterPreviewProps {
  posterUrl: string | null;
  onSelect: () => void;
}

export function PosterPreview({ posterUrl, onSelect }: PosterPreviewProps): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.container} onPress={onSelect}>
      {posterUrl ? (
        <Image
          testID="poster-image"
          source={{ uri: posterUrl }}
          style={styles.poster}
          resizeMode="contain"
        />
      ) : (
        <View testID="poster-placeholder" style={styles.placeholder}>
          <Text style={styles.placeholderText}>No Poster</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 8,
  },
  poster: {
    width: 150,
    height: 225,
    borderRadius: 4,
  },
  placeholder: {
    width: 150,
    height: 225,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#999',
  },
});
