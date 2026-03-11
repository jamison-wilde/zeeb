import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { FileList } from '../FileList';
import { SearchParts } from '../SearchParts';
import { MovieResults } from '../MovieResults';
import { RenamePreview } from '../RenamePreview';

interface RenamerProps {
  instanceId: number;
  visible: boolean;
  onComplete?: () => void;
}

export function Renamer({ instanceId, visible, onComplete }: RenamerProps): React.JSX.Element {
  if (!visible) {
    return <View />;
  }

  return (
    <View style={styles.container}>
      <FileList
        files={[]}
        selectedIndex={-1}
        onSelect={() => {}}
      />
      <View testID="search-parts">
        <SearchParts
          parts={[]}
          onPartStateChange={() => {}}
          onPartTextChange={() => {}}
          onSearch={() => {}}
        />
      </View>
      <View testID="movie-results">
        <MovieResults
          matches={[]}
          onSelect={() => {}}
        />
      </View>
      <RenamePreview
        originalName=""
        previewName=""
        onRename={() => {}}
        onSkip={() => {}}
      />
      <WebView
        testID="imdb-webview"
        source={{ uri: 'about:blank' }}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
