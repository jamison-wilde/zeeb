import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import type { FsAdapter } from '../../adapters/fs';
import { FileList } from './FileList';
import { SearchParts } from './SearchParts';
import { MovieResults } from './MovieResults';
import { RenamePreview } from './RenamePreview';
import { createRenamerStore } from '../../stores/renamerStore';
import { useConfigStore } from '../../stores/configStore';
import { useTesterStore } from '../../stores/testerStore';
import { useUndoStore } from '../../stores/undoStore';
import type { MovieFile, SearchPartState } from '../../types';
import { parseFilename } from '../../services/filenameParser';
import { useFilenamePreview } from '../hooks/useFilenamePreview';
import { createLogger } from '../../services/logger';
import { executeRename } from '../../services/renamePipeline';
import { usePosterFetch } from '../hooks/usePosterFetch';
import { useAutoSelect } from '../hooks/useAutoSelect';
import { useImdbWebview } from '../hooks/useImdbWebview';
import { PosterGrid } from './PosterGrid';
import { NfoViewer } from './NfoViewer';
import { cp437StringToUnicode } from '../../utils/cp437';
import { useNotificationStore } from '../../stores/notificationStore';

interface RenamerProps {
  instanceId: number;
  fileIndex: number;
  files?: MovieFile[];
  isFileVisible?: (file: MovieFile) => boolean;
  fs: FsAdapter;
  onFileRenamed?: (fileId: string, newName: string, newPath: string) => void;
  onComplete?: () => void;
  onFileSelect?: (index: number) => void;
  showTt?: boolean;
  onShowTtChange?: (v: boolean) => void;
  showSample?: boolean;
  onShowSampleChange?: (v: boolean) => void;
}

export function Renamer({ instanceId, fileIndex, files = [], isFileVisible, fs, onFileRenamed, onComplete, onFileSelect, showTt, onShowTtChange, showSample, onShowSampleChange }: RenamerProps): React.JSX.Element | null {
  const storeRef = useRef(createRenamerStore());
  const [webviewEl, setWebviewEl] = useState<WebviewTag | null>(null);
  const [selectedTt, setSelectedTt] = useState('');
  const [useAka, setUseAka] = useState(false);
  const [selectedAka, setSelectedAka] = useState('');
  const [nfoViewerOpen, setNfoViewerOpen] = useState(false);
  const [nfoContent, setNfoContent] = useState('');

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
  const posterPaths = useStore(storeRef.current, (s) => s.posterPaths);
  const setPosterPaths = useStore(storeRef.current, (s) => s.setPosterPaths);

  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.save);

  const currentFile = useMemo(() => files[fileIndex] ?? null, [files, fileIndex]);

  const {
    urlInput,
    setUrlInput,
    navigateToTitle,
    navigateToUrl,
    goBack,
    webviewPreloadPath,
  } = useImdbWebview({
    webviewEl,
    config,
    instanceId,
    onTitleData: setMetadata,
    onAkasReceived: appendAkas,
  });

  const autoSearchRef = useRef(false);

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
  }, [currentFile, config.removeTerms, config.keepTerms, setSearchParts, setMovieMatches, setMetadata, setPreviewFilename]);

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

  useFilenamePreview({
    metadata,
    currentFile,
    searchParts,
    useAka,
    selectedAka,
    config,
    setPreviewFilename,
  });

  const { selectedPosterIndex, setSelectedPosterIndex } = usePosterFetch({
    metadata,
    config,
    setPosterPaths,
  });

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
      navigateToTitle(tt);
    },
    [navigateToTitle],
  );

  useAutoSelect({
    currentFile,
    webviewEl,
    fs,
    movieMatches,
    searchParts,
    onSelectImdbTt: setSelectedTt,
    navigateToTitle: handleMovieSelect,
  });

  const handleUrlSubmit = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      let url = urlInput.trim();
      if (url && !url.startsWith('http')) url = 'https://' + url;
      if (url) navigateToUrl(url);
    }
  }, [navigateToUrl, urlInput]);

  const handlePreviewChange = useCallback(
    (name: string) => {
      setPreviewFilename(name);
    },
    [setPreviewFilename],
  );

  const advance = useCallback(() => {
    reset();
    setSelectedPosterIndex(null);
    onComplete?.();
  }, [reset, onComplete]);

  const handleRename = useCallback(async () => {
    if (!currentFile || !previewFilename || !metadata) return;
    const posterRemotePath =
      selectedPosterIndex != null && posterPaths.length > 0
        ? posterPaths[selectedPosterIndex]
        : null;
    const platform: 'mac' | 'win' =
      navigator.userAgent.includes('Macintosh') ? 'mac' : 'win';

    try {
      const result = await executeRename({
        fs,
        currentFile,
        previewFilename,
        metadata,
        posterRemotePath,
        selectedAka: useAka ? selectedAka : null,
        config,
        platform,
      });

      useUndoStore.getState().beginTransaction();
      result.entries.forEach((e) => useUndoStore.getState().addEntry(e));
      useUndoStore.getState().commitTransaction(currentFile.folder, config.maxUndos);

      onFileRenamed?.(currentFile.id, previewFilename, result.finalPath);

      if (config.logFilePath) {
        const logger = createLogger(fs, config.logFilePath);
        await logger.log('rename', currentFile.nativePath, result.finalPath);
      }

      if (result.posterSaveError) {
        useNotificationStore.getState().notify('error', 'Poster save failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      useNotificationStore.getState().notify('error', `Rename failed: ${msg}`);
    }

    advance();
  }, [
    currentFile,
    previewFilename,
    metadata,
    fs,
    onFileRenamed,
    config,
    advance,
    selectedPosterIndex,
    posterPaths,
    useAka,
    selectedAka,
  ]);

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
          {config.showWebView && (
            <div className="flex items-center gap-1 px-1 py-0.5 bg-gray-100 border-b border-gray-300">
              <button
                className="px-1.5 py-0.5 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                onClick={goBack}
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
          )}
          <div className="flex-1 min-h-0 relative">
            {webviewPreloadPath && (
              <webview
                ref={(el: WebviewTag | null) => { if (el && el !== webviewEl) setWebviewEl(el); }}
                data-testid="imdb-webview"
                src="about:blank"
                preload={webviewPreloadPath}
                style={config.showWebView
                  ? { width: '100%', height: '100%' }
                  : { position: 'absolute', left: '-9999px', width: '1px', height: '1px' }
                }
              />
            )}
            {!config.showWebView && (
              <>
                {selectedTt && !metadata && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                    <div className="text-sm text-gray-500 animate-pulse">Loading movie data...</div>
                  </div>
                )}
                <PosterGrid
                  posterPaths={posterPaths}
                  selectedIndex={selectedPosterIndex}
                  onSelect={setSelectedPosterIndex}
                  compact={false}
                />
              </>
            )}
            {config.showWebView && posterPaths.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-white/95 border-t border-gray-300 z-10">
                <PosterGrid
                  posterPaths={posterPaths}
                  selectedIndex={selectedPosterIndex}
                  onSelect={setSelectedPosterIndex}
                  compact={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom area: fixed — filename info + search parts + rename (full width) */}
      <div className="shrink-0 border-t border-gray-300">
        {currentFile && (
          <div className="flex items-center gap-2 px-2 py-0.5 bg-gray-50 border-b border-gray-200">
            {currentFile.nfoPath && (
              <button
                data-testid="nfo-button"
                className="px-2 py-0.5 bg-gray-600 text-white text-[11px] font-bold rounded hover:bg-gray-700 shrink-0"
                onClick={async () => {
                  try {
                    const raw = await fs.readFile(currentFile.nfoPath!, 'latin1');
                    setNfoContent(cp437StringToUnicode(raw));
                    setNfoViewerOpen(true);
                  } catch { /* silently skip */ }
                }}
              >
                NFO
              </button>
            )}
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
      <NfoViewer
        visible={nfoViewerOpen}
        content={nfoContent}
        onClose={() => setNfoViewerOpen(false)}
      />
    </div>
  );
}
