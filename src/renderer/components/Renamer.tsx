import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';
import type { FsAdapter } from '../../adapters/fs';
import { FileList } from './FileList';
import { SearchParts } from './SearchParts';
import { MovieResults } from './MovieResults';
import { RenamePreview } from './RenamePreview';
import { createRenamerStore } from '../../stores/renamerStore';
import { useConfigStore } from '../../stores/configStore';
import type { MovieFile, SearchPartState, UndoEntry } from '../../types';
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
  fs: FsAdapter;
  undoStore?: StoreApi<{
    beginTransaction: () => void;
    addEntry: (entry: UndoEntry) => void;
    commitTransaction: () => void;
  }>;
  onComplete?: () => void;
}

export function Renamer({ instanceId, visible, files = [], fs, undoStore, onComplete }: RenamerProps): React.JSX.Element | null {
  const storeRef = useRef(createRenamerStore());
  const webviewRef = useRef<WebviewTag | null>(null);
  const [webviewPreloadPath, setWebviewPreloadPath] = useState('');

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

  const navigationMode = useRef<'search' | 'title' | 'idle'>('idle');

  useEffect(() => {
    window.zeebApp.getWebviewPreloadPath().then(setWebviewPreloadPath);
  }, []);

  useEffect(() => {
    if (!currentFile) return;
    const parts = parseFilename(currentFile.name, config.removeTerms, config.keepTerms);
    setSearchParts(parts);
    setMovieMatches([]);
    setMetadata(null);
    setPreviewFilename('');
  }, [currentFile, config.removeTerms, config.keepTerms, setSearchParts, setMovieMatches, setMetadata, setPreviewFilename]);

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

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleMessage = (event: any) => {
      const message = event.args?.[0];
      if (!message) return;

      const results = parseSearchResults(message);
      if (results.length > 0) {
        setMovieMatches(results);
        return;
      }
      const titleData = parseTitleData(message);
      if (titleData) {
        setMetadata(titleData);
      }
    };

    const handleLoadEnd = () => {
      if (navigationMode.current === 'search') {
        const script = generateSearchExtractionScript();
        webview.executeJavaScript(script);
      } else if (navigationMode.current === 'title') {
        const script = generateTitleExtractionScript(config.extractionPatterns);
        webview.executeJavaScript(script);
      }
    };

    webview.addEventListener('ipc-message', handleMessage);
    webview.addEventListener('did-finish-load', handleLoadEnd);

    return () => {
      webview.removeEventListener('ipc-message', handleMessage);
      webview.removeEventListener('did-finish-load', handleLoadEnd);
    };
  }, [config.extractionPatterns, setMovieMatches, setMetadata]);

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
    webviewRef.current?.loadURL(url);
  }, [searchParts, config.urlImdbSearch]);

  const handleMovieSelect = useCallback(
    (tt: string) => {
      const url = buildTitleUrl(tt, config.urlImdbTT);
      navigationMode.current = 'title';
      webviewRef.current?.loadURL(url);
    },
    [config.urlImdbTT],
  );

  const advance = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < files.length) {
      reset();
      setCurrentIndex(nextIndex);
    }
    onComplete?.();
  }, [currentIndex, files.length, reset, setCurrentIndex, onComplete]);

  const handleRename = useCallback(async () => {
    if (!currentFile || !previewFilename) return;

    undoStore?.getState().beginTransaction();

    try {
      const newPath = `${currentFile.folder}/${previewFilename}`;
      const entry = await renameFile(fs, currentFile.nativePath, newPath);
      undoStore?.getState().addEntry(entry);

      const baseName = currentFile.name.replace(/\.[^.]+$/, '');
      const newBase = previewFilename.replace(/\.[^.]+$/, '');
      const subs = await findSubtitles(fs, currentFile.folder, baseName, config.subtitleExtensions);
      if (subs.length > 0) {
        const subEntries = await renameSubtitles(fs, subs, baseName, newBase);
        for (const subEntry of subEntries) {
          undoStore?.getState().addEntry(subEntry);
        }
      }

      undoStore?.getState().commitTransaction();

      if (config.logFilePath) {
        const logger = createLogger(fs, config.logFilePath);
        await logger.log('rename', currentFile.nativePath, newPath);
      }
    } catch {
      // Transaction stays pending for inspection
    }

    advance();
  }, [currentFile, previewFilename, fs, undoStore, config.subtitleExtensions, config.logFilePath, advance]);

  const handleSkip = useCallback(() => {
    advance();
  }, [advance]);

  if (!visible) return null;

  return (
    <div className="flex-1 flex flex-col">
      <FileList
        files={files}
        selectedIndex={currentIndex}
        onSelect={handleFileSelect}
      />
      <div data-testid="search-parts">
        <SearchParts
          parts={searchParts}
          onPartStateChange={handlePartStateChange}
          onPartTextChange={handlePartTextChange}
          onSearch={handleSearch}
        />
      </div>
      <div data-testid="movie-results">
        <MovieResults
          matches={movieMatches}
          onSelect={handleMovieSelect}
        />
      </div>
      <RenamePreview
        originalName={currentFile?.name ?? ''}
        previewName={previewFilename}
        onRename={handleRename}
        onSkip={handleSkip}
      />
      <webview
        ref={(el: any) => { webviewRef.current = el; }}
        data-testid="imdb-webview"
        src="about:blank"
        preload={webviewPreloadPath}
        className="flex-1"
      />
    </div>
  );
}
