import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';
import { FileList } from '../FileList';
import { SearchParts } from '../SearchParts';
import { MovieResults } from '../MovieResults';
import { RenamePreview } from '../RenamePreview';
import { createRenamerStore } from '../../stores/renamerStore';
import { useConfigStore } from '../../stores/configStore';
import type { MovieFile, SearchPartState } from '../../types';
import { parseFilename } from '../../services/filenameParser';
import {
  buildSearchUrl,
  buildTitleUrl,
  generateSearchExtractionScript,
  generateTitleExtractionScript,
  parseSearchResults,
  parseTitleData,
} from '../../services/imdbExtractor';
import { interpolateFormat } from '../../services/formatEngine';
import { renameFile, findSubtitles, renameSubtitles } from '../../services/fileRenamer';
import { createLogger } from '../../services/logger';

interface RenamerProps {
  instanceId: number;
  visible: boolean;
  files?: MovieFile[];
  undoStore?: StoreApi<{
    beginTransaction: () => void;
    addEntry: (entry: { type: string; sourcePath: string; destPath: string | null }) => void;
    commitTransaction: () => void;
  }>;
  onComplete?: () => void;
}

export function Renamer({ instanceId, visible, files = [], undoStore, onComplete }: RenamerProps): React.JSX.Element {
  const storeRef = useRef(createRenamerStore());
  const webViewRef = useRef<WebView>(null);

  const currentIndex = useStore(storeRef.current, (s) => s.currentIndex);
  const searchParts = useStore(storeRef.current, (s) => s.searchParts);
  const movieMatches = useStore(storeRef.current, (s) => s.movieMatches);
  const metadata = useStore(storeRef.current, (s) => s.metadata);
  const previewFilename = useStore(storeRef.current, (s) => s.previewFilename);
  const setCurrentIndex = useStore(storeRef.current, (s) => s.setCurrentIndex);
  const setSearchParts = useStore(storeRef.current, (s) => s.setSearchParts);
  const updatePartState = useStore(storeRef.current, (s) => s.updatePartState);
  const updatePartText = useStore(storeRef.current, (s) => s.updatePartText);
  const setMovieMatches = useStore(storeRef.current, (s) => s.setMovieMatches);
  const setMetadata = useStore(storeRef.current, (s) => s.setMetadata);
  const setPreviewFilename = useStore(storeRef.current, (s) => s.setPreviewFilename);
  const reset = useStore(storeRef.current, (s) => s.reset);

  const config = useConfigStore((s) => s.config);

  const currentFile = useMemo(() => files[currentIndex] ?? null, [files, currentIndex]);

  const webViewUrl = useRef('about:blank');
  const navigationMode = useRef<'search' | 'title' | 'idle'>('idle');

  // When file changes, parse filename into search parts
  useEffect(() => {
    if (!currentFile) return;
    const parts = parseFilename(currentFile.name, config.removeTerms, config.keepTerms);
    setSearchParts(parts);
    setMovieMatches([]);
    setMetadata(null);
    setPreviewFilename('');
  }, [currentFile, config.removeTerms, config.keepTerms, setSearchParts, setMovieMatches, setMetadata, setPreviewFilename]);

  // When metadata changes, compute preview filename
  useEffect(() => {
    if (!metadata || !currentFile) {
      setPreviewFilename('');
      return;
    }
    const format = currentFile.isDvdFolder
      ? config.formatDvd
      : metadata.aka.length > 0
        ? config.formatAka
        : config.formatStandard;
    const ext = currentFile.isDvdFolder ? '' : `.${currentFile.extension}`;
    const saved = currentFile.extension;
    const formatted = interpolateFormat(format, metadata, {
      saved,
      directorSeparator: config.directorSeparator,
      genreSeparator: config.genreSeparator,
      starSeparator: config.starSeparator,
      removeThe: config.removeThe,
      swapThe: config.swapThe,
      titleSpaceChar: config.titleSpaceChar,
    });
    setPreviewFilename(formatted + ext);
  }, [metadata, currentFile, config, setPreviewFilename]);

  const handleFileSelect = useCallback(
    (index: number) => {
      reset();
      setCurrentIndex(index);
    },
    [reset, setCurrentIndex],
  );

  const handlePartStateChange = useCallback(
    (id: string, state: SearchPartState) => {
      updatePartState(id, state);
    },
    [updatePartState],
  );

  const handlePartTextChange = useCallback(
    (id: string, text: string) => {
      updatePartText(id, text);
    },
    [updatePartText],
  );

  const handleSearch = useCallback(() => {
    const query = searchParts
      .filter((p) => p.state === 'search' || p.state === 'keep' || p.state === 'keepAlways')
      .map((p) => p.text)
      .join(' ');
    if (!query.trim()) return;
    const url = buildSearchUrl(query, config.urlImdbSearch);
    navigationMode.current = 'search';
    webViewUrl.current = url;
    webViewRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(url)}; true;`);
  }, [searchParts, config.urlImdbSearch]);

  const handleMovieSelect = useCallback(
    (tt: string) => {
      const url = buildTitleUrl(tt, config.urlImdbTT);
      navigationMode.current = 'title';
      webViewUrl.current = url;
      webViewRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(url)}; true;`);
    },
    [config.urlImdbTT],
  );

  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = event.nativeEvent.data;
      const results = parseSearchResults(message);
      if (results.length > 0) {
        setMovieMatches(results);
        return;
      }
      const titleData = parseTitleData(message);
      if (titleData) {
        setMetadata(titleData);
      }
    },
    [setMovieMatches, setMetadata],
  );

  const handleWebViewLoadEnd = useCallback(() => {
    if (navigationMode.current === 'search') {
      const script = generateSearchExtractionScript();
      webViewRef.current?.injectJavaScript(script);
    } else if (navigationMode.current === 'title') {
      const script = generateTitleExtractionScript(config.extractionPatterns);
      webViewRef.current?.injectJavaScript(script);
    }
  }, [config.extractionPatterns]);

  const handleRename = useCallback(async () => {
    if (!currentFile || !previewFilename) return;

    undoStore?.getState().beginTransaction();

    try {
      const newPath = `${currentFile.folder}/${previewFilename}`;
      const entry = await renameFile(currentFile.nativePath, newPath);
      undoStore?.getState().addEntry(entry);

      // Rename subtitles
      const baseName = currentFile.name.replace(/\.[^.]+$/, '');
      const newBase = previewFilename.replace(/\.[^.]+$/, '');
      const subs = await findSubtitles(currentFile.folder, baseName, config.subtitleExtensions);
      if (subs.length > 0) {
        const subEntries = await renameSubtitles(subs, baseName, newBase);
        for (const subEntry of subEntries) {
          undoStore?.getState().addEntry(subEntry);
        }
      }

      undoStore?.getState().commitTransaction();

      // Log the rename
      if (config.logFilePath) {
        const logger = createLogger(config.logFilePath);
        await logger.log('rename', currentFile.nativePath, newPath);
      }
    } catch {
      // Transaction stays pending for inspection; don't commit on error
    }

    advance();
  }, [currentFile, previewFilename, undoStore, config.subtitleExtensions, config.logFilePath]);

  const advance = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < files.length) {
      reset();
      setCurrentIndex(nextIndex);
    }
    onComplete?.();
  }, [currentIndex, files.length, reset, setCurrentIndex, onComplete]);

  const handleSkip = useCallback(() => {
    advance();
  }, [advance]);

  if (!visible) {
    return <View />;
  }

  return (
    <View style={styles.container}>
      <FileList
        files={files}
        selectedIndex={currentIndex}
        onSelect={handleFileSelect}
      />
      <View testID="search-parts">
        <SearchParts
          parts={searchParts}
          onPartStateChange={handlePartStateChange}
          onPartTextChange={handlePartTextChange}
          onSearch={handleSearch}
        />
      </View>
      <View testID="movie-results">
        <MovieResults
          matches={movieMatches}
          onSelect={handleMovieSelect}
        />
      </View>
      <RenamePreview
        originalName={currentFile?.name ?? ''}
        previewName={previewFilename}
        onRename={handleRename}
        onSkip={handleSkip}
      />
      <WebView
        ref={webViewRef}
        testID="imdb-webview"
        source={{ uri: 'about:blank' }}
        onMessage={handleWebViewMessage}
        onLoadEnd={handleWebViewLoadEnd}
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
