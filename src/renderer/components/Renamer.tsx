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
import { useTesterStore } from '../../stores/testerStore';
import type { MovieFile, SearchPartState, UndoEntry } from '../../types';
import { parseFilename } from '../../services/filenameParser';
import {
  buildTitleUrl,
  parseTitleData,
} from '../../services/imdbExtractor';
import { extractImdbFromNfo } from '../../services/nfoParser';
import { interpolateFormat } from '../../services/formatEngine';
import { renameFile, findSubtitles, renameSubtitles } from '../../services/fileRenamer';
import { createLogger } from '../../services/logger';

interface RenamerProps {
  instanceId: number;
  visible: boolean;
  fileIndex: number;
  files?: MovieFile[];
  isFileVisible?: (file: MovieFile) => boolean;
  fs: FsAdapter;
  undoStore?: StoreApi<{
    beginTransaction: () => void;
    addEntry: (entry: UndoEntry) => void;
    commitTransaction: () => void;
  }>;
  onFileRenamed?: (fileId: string, newName: string, newPath: string) => void;
  onComplete?: () => void;
  onFileSelect?: (index: number) => void;
  showTt?: boolean;
  onShowTtChange?: (v: boolean) => void;
  showSample?: boolean;
  onShowSampleChange?: (v: boolean) => void;
}

export function Renamer({ instanceId, visible, fileIndex, files = [], isFileVisible, fs, undoStore, onFileRenamed, onComplete, onFileSelect, showTt, onShowTtChange, showSample, onShowSampleChange }: RenamerProps): React.JSX.Element | null {
  const storeRef = useRef(createRenamerStore());
  const [webviewEl, setWebviewEl] = useState<WebviewTag | null>(null);
  const [webviewPreloadPath, setWebviewPreloadPath] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [selectedTt, setSelectedTt] = useState('');
  const [useAka, setUseAka] = useState(false);
  const [selectedAka, setSelectedAka] = useState('');

  const searchParts = useStore(storeRef.current, (s) => s.searchParts);
  const movieMatches = useStore(storeRef.current, (s) => s.movieMatches);
  const metadata = useStore(storeRef.current, (s) => s.metadata);
  const previewFilename = useStore(storeRef.current, (s) => s.previewFilename);
  const setSearchParts = useStore(storeRef.current, (s) => s.setSearchParts);
  const updatePartState = useStore(storeRef.current, (s) => s.updatePartState);
  const updatePartText = useStore(storeRef.current, (s) => s.updatePartText);
  const setMovieMatches = useStore(storeRef.current, (s) => s.setMovieMatches);
  const setMetadata = useStore(storeRef.current, (s) => s.setMetadata);
  const appendAkas = useStore(storeRef.current, (s) => s.appendAkas);
  const setPreviewFilename = useStore(storeRef.current, (s) => s.setPreviewFilename);
  const reset = useStore(storeRef.current, (s) => s.reset);

  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.save);

  const testerRequest = useTesterStore((s) => s.testerRequest);
  const setTesterResult = useTesterStore((s) => s.setResult);
  const setTesterError = useTesterStore((s) => s.setError);

  const currentFile = useMemo(() => files[fileIndex] ?? null, [files, fileIndex]);

  const navigationMode = useRef<'title' | 'idle' | 'tester'>('idle');

  useEffect(() => {
    window.zeebApp.getWebviewPreloadPath().then(setWebviewPreloadPath);
  }, []);

  const autoSearchRef = useRef(false);
  const nfoAutoSelectedRef = useRef(false);

  useEffect(() => {
    if (!currentFile) return;
    const parts = parseFilename(currentFile.name, config.removeTerms, config.keepTerms);
    setSearchParts(parts);
    setMovieMatches([]);
    setMetadata(null);
    setPreviewFilename('');
    setUseAka(false);
    setSelectedAka('');
    autoSearchRef.current = true;
    nfoAutoSelectedRef.current = false;
  }, [currentFile, config.removeTerms, config.keepTerms, setSearchParts, setMovieMatches, setMetadata, setPreviewFilename]);

  // Auto-navigate to IMDB title page if NFO contains a tt#
  useEffect(() => {
    if (!currentFile?.nfoPath || !webviewEl) return;
    let cancelled = false;
    (async () => {
      try {
        const content = await fs.readFile(currentFile.nfoPath!, 'utf-8');
        const tt = extractImdbFromNfo(content);
        if (tt && !cancelled) {
          nfoAutoSelectedRef.current = true;
          setSelectedTt(tt);
          const url = buildTitleUrl(tt, config.urlImdbTT);
          navigationMode.current = 'title';
          webviewEl.loadURL(url);
        }
      } catch { /* NFO read failed — fall through to year-based auto-select */ }
    })();
    return () => { cancelled = true; };
  }, [currentFile, webviewEl, fs, config.urlImdbTT]);

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    const results = await window.zeebImdb.suggest(query);
    setMovieMatches(results);
  }, [setMovieMatches]);

  // Auto-trigger search when parts are set from a new file
  useEffect(() => {
    if (!autoSearchRef.current || searchParts.length === 0) return;
    autoSearchRef.current = false;
    const query = searchParts
      .filter((p) => p.state === 'search')
      .map((p) => p.text)
      .join(' ');
    void doSearch(query);
  }, [searchParts, doSearch]);

  // Auto-populate selectedAka when metadata with AKAs arrives
  useEffect(() => {
    if (metadata && metadata.aka.length > 0) {
      setSelectedAka(metadata.aka[0]);
    } else {
      setSelectedAka('');
      setUseAka(false);
    }
    // Publish current tt to testerStore so Format Tester can use it as default
    if (instanceId === 0) {
      useTesterStore.getState().setCurrentTt(metadata?.tt ?? null);
    }
  }, [metadata, instanceId]);

  useEffect(() => {
    if (!metadata || !currentFile) {
      setPreviewFilename('');
      return;
    }
    const format = currentFile.isDvdFolder && config.separateDvdFormat
      ? (useAka && selectedAka ? config.formatDvdAka : config.formatDvd)
      : (useAka && selectedAka ? config.formatAka : config.formatStandard);
    const ext = currentFile.isDvdFolder ? '' : `.${currentFile.extension}`;
    const keepParts = searchParts
      .filter((p) => p.state === 'keep' || p.state === 'keepAlways')
      .map((p) => p.text);
    const saved = keepParts.join(config.savedPartSeparator ?? ' ');
    const formatted = interpolateFormat(format, metadata, {
      saved,
      selectedAka: useAka ? selectedAka : undefined,
      directorSeparator: config.directorSeparator,
      genreSeparator: config.genreSeparator,
      starSeparator: config.starSeparator,
      removeThe: config.removeThe,
      swapThe: config.swapThe,
      titleSpaceChar: config.titleSpaceChar,
      mpaaMap: config.mpaaMap,
      theWord: config.theWord,
    });
    setPreviewFilename(formatted + ext);
  }, [metadata, currentFile, config, searchParts, useAka, selectedAka, setPreviewFilename]);

  // Auto-select a search result whose year matches the year detected in the filename
  // Skip if NFO already auto-selected a title
  useEffect(() => {
    if (movieMatches.length === 0 || nfoAutoSelectedRef.current) return;
    const yearCandidates = searchParts.filter(
      (p) => p.state === 'remove' && /^\d{4}$/.test(p.text) && parseInt(p.text, 10) > 1900,
    );
    const yearPart = yearCandidates[yearCandidates.length - 1] ?? null;
    if (!yearPart) return;
    const match = movieMatches.slice(0, 8).find((m) => m.year === parseInt(yearPart.text, 10));
    if (match) {
      handleMovieSelect(match.tt);
    }
  }, [movieMatches]); // eslint-disable-line react-hooks/exhaustive-deps

  // Send extraction patterns to webview preload whenever they change
  useEffect(() => {
    if (!webviewEl) return;
    try {
      webviewEl.send('set-extraction-patterns', config.extractionPatterns);
    } catch { /* webview not ready yet — patterns will be sent on next nav */ }
  }, [webviewEl, config.extractionPatterns]);

  useEffect(() => {
    if (!webviewEl) return;
    const webview = webviewEl;

    const handleDomReady = () => {
      try {
        const url = webview.getURL();
        setUrlInput(url);
      } catch { /* ignore */ }
      // Send extraction patterns to the newly loaded preload context
      try {
        webview.send('set-extraction-patterns', config.extractionPatterns);
      } catch { /* ignore */ }
    };

    const handleNavigate = (_event: any) => {
      try {
        setUrlInput(webview.getURL());
      } catch { /* ignore */ }
    };

    const handleIpcMessage = (event: any) => {
      if (event.channel !== 'extraction-result') return;
      const message = event.args?.[0];
      if (!message) return;

      // Handle "moreAkas" — append full AKA list from /releaseinfo
      try {
        const parsed = JSON.parse(message);
        if (parsed.type === 'moreAkas' && Array.isArray(parsed.akas)) {
          appendAkas(parsed.akas);
          return;
        }
      } catch { /* not JSON or not moreAkas — fall through */ }

      const titleData = parseTitleData(message);
      if (titleData) {
        if (navigationMode.current === 'tester') {
          setTesterResult(titleData);
          navigationMode.current = 'idle';
          // Clear only the request so the effect doesn't re-trigger (preserve result)
          useTesterStore.setState({ testerRequest: null });
        } else {
          setMetadata(titleData);
        }
      }
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('ipc-message', handleIpcMessage);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('ipc-message', handleIpcMessage);
    };
  }, [webviewEl, instanceId, config.extractionPatterns, setMovieMatches, setMetadata, setTesterResult]);

  // Handle Format Tester requests — only first Renamer instance responds
  useEffect(() => {
    if (!testerRequest || !webviewEl || instanceId !== 0) return;
    navigationMode.current = 'tester';
    const url = `${config.urlImdbTT}${testerRequest.tt}/`;
    webviewEl.loadURL(url);

    // Timeout after 10 seconds
    const timer = setTimeout(() => {
      if (navigationMode.current === 'tester') {
        setTesterError(`Timed out fetching data for ${testerRequest.tt}`);
        navigationMode.current = 'idle';
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [testerRequest, webviewEl, instanceId, config.urlImdbTT, setTesterError]);

  const handleFileSelect = useCallback(
    (index: number) => {
      onFileSelect?.(index);
    },
    [onFileSelect],
  );

  const handlePartStateChange = useCallback(
    (id: string, state: SearchPartState) => {
      updatePartState(id, state);

      // Persist always keep/remove terms immediately
      const part = storeRef.current.getState().searchParts.find((p) => p.id === id);
      if (!part) return;
      const term = part.text.toLowerCase();

      if (state === 'keepAlways') {
        if (!config.keepTerms.some(([m]) => m.toLowerCase() === term)) {
          updateConfig({ keepTerms: [...config.keepTerms, [part.text, part.text]] });
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
    void doSearch(query);
  }, [searchParts, doSearch]);

  const handleMovieSelect = useCallback(
    (tt: string) => {
      setSelectedTt(tt);
      const url = buildTitleUrl(tt, config.urlImdbTT);
      navigationMode.current = 'title';
      webviewEl?.loadURL(url);
    },
    [webviewEl, config.urlImdbTT],
  );

  const handleBack = useCallback(() => {
    webviewEl?.goBack();
  }, [webviewEl]);

  const handleUrlSubmit = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      let url = urlInput.trim();
      if (url && !url.startsWith('http')) url = 'https://' + url;
      if (url) {
        navigationMode.current = 'idle';
        webviewEl?.loadURL(url);
      }
    }
  }, [webviewEl, urlInput]);

  const handlePreviewChange = useCallback(
    (name: string) => {
      setPreviewFilename(name);
    },
    [setPreviewFilename],
  );

  const advance = useCallback(() => {
    reset();
    onComplete?.();
  }, [reset, onComplete]);

  const handleRename = useCallback(async () => {
    if (!currentFile || !previewFilename) return;

    undoStore?.getState().beginTransaction();

    try {
      const sep = currentFile.nativePath.includes('\\') ? '\\' : '/';
      const newPath = `${currentFile.folder}${sep}${previewFilename}`;
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
      onFileRenamed?.(currentFile.id, previewFilename, newPath);

      if (config.logFilePath) {
        const logger = createLogger(fs, config.logFilePath);
        await logger.log('rename', currentFile.nativePath, newPath);
      }
    } catch {
      // Transaction stays pending for inspection
    }

    advance();
  }, [currentFile, previewFilename, fs, undoStore, onFileRenamed, config.subtitleExtensions, config.logFilePath, advance]);

  const handleSkip = useCallback(() => {
    advance();
  }, [advance]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Top area: left panel + right panel */}
      <div className="flex-1 flex flex-row min-h-0">
        {/* Left panel: file list + search results */}
        <div className="w-[420px] flex flex-col border-r border-gray-300 shrink-0">
          <div className="flex items-center px-2 py-0.5 bg-gray-100 text-xs font-bold text-gray-600 border-b border-gray-300 shrink-0">
            <span>Movie Files</span>
            <span className="flex-1" />
            <label className="flex items-center gap-0.5 font-normal text-gray-500 mr-2">
              <input type="checkbox" checked={showTt ?? false} onChange={(e) => onShowTtChange?.(e.target.checked)} className="w-3 h-3" />
              TT?
            </label>
            <label className="flex items-center gap-0.5 font-normal text-gray-500">
              <input type="checkbox" checked={showSample ?? false} onChange={(e) => onShowSampleChange?.(e.target.checked)} className="w-3 h-3" />
              Sample?
            </label>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <FileList
              files={files}
              selectedIndex={fileIndex}
              onSelect={handleFileSelect}
              isFileVisible={isFileVisible}
            />
          </div>
          <div className="border-t border-gray-300 shrink-0">
            <div className="px-2 py-0.5 bg-gray-100 text-xs font-bold text-gray-600">Search Results</div>
          </div>
          <div data-testid="movie-results" className="overflow-y-auto min-h-[80px] max-h-[30%]">
            <MovieResults
              matches={movieMatches}
              onSelect={handleMovieSelect}
              selectedTt={selectedTt}
            />
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
                ref={(el: any) => { if (el && el !== webviewEl) setWebviewEl(el); }}
                data-testid="imdb-webview"
                src="about:blank"
                preload={webviewPreloadPath}
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom area: fixed — filename info + search parts + rename (full width) */}
      <div className="shrink-0 border-t border-gray-300">
        {currentFile && (
          <div className="flex items-center gap-2 px-2 py-0.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs text-gray-600 truncate">
              {currentFile.name}
            </span>
            <span className="text-xs text-gray-400 shrink-0">
              {currentFile.size > 0 ? `${Math.round(currentFile.size / 1024 / 1024)}MB` : ''}
            </span>
            <span className="flex-1" />
            <button
              data-testid="search-button"
              className="px-2 py-0.5 bg-blue-500 text-white text-[11px] font-bold rounded hover:bg-blue-600 shrink-0"
              onClick={handleSearch}
            >
              Search
            </button>
          </div>
        )}
        <div data-testid="search-parts" className="overflow-x-auto">
          <SearchParts
            parts={searchParts}
            onPartStateChange={handlePartStateChange}
            onPartTextChange={handlePartTextChange}
            onSearch={handleSearch}
          />
        </div>
        {metadata && metadata.aka.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-0.5 border-b border-gray-200 bg-gray-50">
            <button
              className={`px-2 py-0.5 text-[11px] font-bold rounded shrink-0 ${
                useAka
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
              onClick={() => setUseAka(!useAka)}
            >
              Use AKA
            </button>
            <span className="text-[11px] text-gray-500 shrink-0">Also Known As</span>
            <select
              className="flex-1 px-1 py-0.5 text-xs border border-gray-300 rounded bg-white"
              value={selectedAka}
              onChange={(e) => {
                setSelectedAka(e.target.value);
                if (!useAka) setUseAka(true);
              }}
            >
              {metadata.aka.map((a, i) => (
                <option key={i} value={a}>{a}</option>
              ))}
            </select>
          </div>
        )}
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
