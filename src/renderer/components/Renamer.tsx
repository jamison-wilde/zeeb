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
  const [urlInput, setUrlInput] = useState('');

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
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.save);

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

  // Auto-select a search result whose year matches the year detected in the filename
  useEffect(() => {
    if (movieMatches.length === 0) return;
    const yearPart = searchParts.find(
      (p) => p.state === 'remove' && /^\d{4}$/.test(p.text) && parseInt(p.text, 10) > 1900,
    );
    if (!yearPart) return;
    const match = movieMatches.slice(0, 8).find((m) => m.year === parseInt(yearPart.text, 10));
    if (match) {
      handleMovieSelect(match.tt);
    }
  }, [movieMatches]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Update URL bar
      try {
        const url = webview.getURL();
        setUrlInput(url);
      } catch { /* ignore */ }

      if (navigationMode.current === 'search') {
        const script = generateSearchExtractionScript();
        webview.executeJavaScript(script);
      } else if (navigationMode.current === 'title') {
        const script = generateTitleExtractionScript(config.extractionPatterns);
        webview.executeJavaScript(script);
      }
    };

    const handleNavigate = (_event: any) => {
      try {
        const url = webview.getURL();
        setUrlInput(url);
      } catch { /* ignore */ }
    };

    webview.addEventListener('ipc-message', handleMessage);
    webview.addEventListener('did-finish-load', handleLoadEnd);
    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('did-navigate-in-page', handleNavigate);

    return () => {
      webview.removeEventListener('ipc-message', handleMessage);
      webview.removeEventListener('did-finish-load', handleLoadEnd);
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('did-navigate-in-page', handleNavigate);
    };
  }, [webviewPreloadPath, config.extractionPatterns, setMovieMatches, setMetadata]);

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

      // Persist always keep/remove terms immediately
      const part = storeRef.current.getState().searchParts.find((p) => p.id === id);
      if (!part) return;
      const term = part.text.toLowerCase();

      if (state === 'keepAlways') {
        if (!config.keepTerms.some((t) => t.toLowerCase() === term)) {
          updateConfig({ keepTerms: [...config.keepTerms, part.text] });
          void saveConfig();
        }
      } else if (state === 'removeAlways') {
        if (!config.removeTerms.some((t) => t.toLowerCase() === term)) {
          updateConfig({ removeTerms: [...config.removeTerms, part.text] });
          void saveConfig();
        }
      }
    },
    [updatePartState, config.keepTerms, config.removeTerms, updateConfig, saveConfig],
  );

  const handlePartTextChange = useCallback(
    (id: string, text: string) => {
      updatePartText(id, text);
    },
    [updatePartText],
  );

  const handleSearch = useCallback(() => {
    const query = searchParts
      .filter((p) => p.state === 'search')
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

  const handleBack = useCallback(() => {
    webviewRef.current?.goBack();
  }, []);

  const handleUrlSubmit = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      let url = urlInput.trim();
      if (url && !url.startsWith('http')) url = 'https://' + url;
      if (url) {
        navigationMode.current = 'idle';
        webviewRef.current?.loadURL(url);
      }
    }
  }, [urlInput]);

  const handlePreviewChange = useCallback(
    (name: string) => {
      setPreviewFilename(name);
    },
    [setPreviewFilename],
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
    <div className="flex-1 flex flex-col h-full">
      {/* Top area: left panel + right panel */}
      <div className="flex-1 flex flex-row min-h-0">
        {/* Left panel: file list + search results */}
        <div className="w-[420px] flex flex-col border-r border-gray-300 shrink-0">
          <div className="flex-1 overflow-y-auto min-h-0">
            <FileList
              files={files}
              selectedIndex={currentIndex}
              onSelect={handleFileSelect}
            />
          </div>
          <div className="border-t border-gray-300">
            <div className="px-2 py-1 bg-gray-100 text-xs font-bold text-gray-600">Search Results</div>
            <div data-testid="movie-results" className="overflow-y-auto max-h-48">
              <MovieResults
                matches={movieMatches}
                onSelect={handleMovieSelect}
              />
            </div>
          </div>
        </div>

        {/* Right panel: URL bar + webview */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-1 px-1 py-0.5 bg-gray-100 border-b border-gray-300">
            <button
              className="px-1.5 py-0.5 text-xs bg-gray-200 hover:bg-gray-300 rounded"
              onClick={handleBack}
              title="Back"
            >
              ←
            </button>
            <input
              className="flex-1 px-2 py-0.5 text-xs border border-gray-300 rounded bg-white"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={handleUrlSubmit}
              placeholder="URL"
            />
          </div>
          <div className="flex-1 min-h-0">
            {webviewPreloadPath && (
              <webview
                ref={(el: any) => { webviewRef.current = el; }}
                data-testid="imdb-webview"
                src="about:blank"
                preload={webviewPreloadPath}
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom area: filename info + search parts + rename (full width) */}
      <div className="border-t border-gray-300">
        {currentFile && (
          <div className="flex items-center px-2 py-0.5 text-xs text-gray-600 bg-gray-50 border-b border-gray-200">
            <span className="flex-1 truncate">
              Filename: {currentFile.name}
              {currentFile.size > 0 && <span className="ml-3">Size: {Math.round(currentFile.size / 1024 / 1024)}MB</span>}
            </span>
            <button
              data-testid="search-button"
              className="px-3 py-0.5 bg-blue-500 text-white text-xs font-bold rounded hover:bg-blue-600 shrink-0 ml-2"
              onClick={handleSearch}
            >
              Search
            </button>
          </div>
        )}
        <div data-testid="search-parts">
          <SearchParts
            parts={searchParts}
            onPartStateChange={handlePartStateChange}
            onPartTextChange={handlePartTextChange}
            onSearch={handleSearch}
          />
        </div>
        <RenamePreview
          originalName={currentFile?.name ?? ''}
          previewName={previewFilename}
          onPreviewChange={handlePreviewChange}
          onRename={handleRename}
          onSkip={handleSkip}
        />
      </div>
    </div>
  );
}
