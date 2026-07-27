// src/types/index.ts

export type SearchPartState = 'search' | 'keep' | 'remove' | 'keepAlways' | 'removeAlways';

export type RecursionMode = 'none' | 'subfolders' | 'full';

export interface FolderHistoryEntry {
  path: string;
  depth: RecursionMode;
  fileCount: number | null;
  lastScanned: number | null;
}

export interface SearchPart {
  id: string;
  text: string;
  originalText: string;
  state: SearchPartState;
  editable: boolean;
  separatorAfter?: string;
}

export interface MovieFile {
  id: string;
  name: string;
  nativePath: string;
  folder: string;
  extension: string;
  size: number;
  isDvdFolder: boolean;
  hasNfo: boolean;
  hasUrl: boolean;
  hasPoster: boolean;
  nfoPath: string | null;
  urlPath: string | null;
  posterPath: string | null;
}

export interface MovieMatch {
  tt: string;
  title: string;
  year: number | null;
  aka: string | null;
  thumbnailUrl: string | null;
  stars: string | null;
}

export interface MovieMetadata {
  tt: string;
  title: string;
  year: number | null;
  rating: number | null;
  directors: string[];
  genres: string[];
  actors: string[];
  duration: number | null;
  mpaa: string | null;
  aka: string[];
  posterUrl: string | null;
}

export type UndoEntryType = 'rename' | 'create' | 'delete';

export interface UndoEntry {
  type: UndoEntryType;
  sourcePath: string;
  destPath: string | null;
  content?: string;
}

export interface RenameTransaction {
  id: string;
  timestamp: number;
  basePath: string;
  entries: UndoEntry[];
}

export interface UndoResult {
  entry: UndoEntry;
  success: boolean;
  error?: string;
}

export interface ExtractionPattern {
  field: string;
  jsonLdPath: string | null;
  domSelector: string | null;
  regexPattern: string | null;
  regexGroup: number | null;
}

export interface FormatTokens {
  title: string;
  year: string;
  imdb: string;
  rating100: string;
  rating10: string;
  directors: string;
  director: string;
  genres: string;
  genre: string;
  stars: string;
  star1: string;
  stars2: string;
  stars3: string;
  duration: string;
  mpaa: string;
  H: string;
  M: string;
  aka: string;
  original: string;
  saved: string;
}

export interface ZeebConfig {
  // Format strings
  formatStandard: string;
  formatAka: string;
  formatDvd: string;
  formatDvdAka: string;
  formatPoster: string;
  formatUrl: string;

  // File handling
  movieExtensions: string[];
  subtitleExtensions: string[];
  removeTerms: string[];
  keepTerms: Array<[string, string]>;

  // IMDB/TMDB
  urlImdbSearch: string;
  urlImdbTT: string;
  urlTmdbApi: string;
  tmdbApiKey: string;

  // Extraction patterns (user-configurable)
  extractionPatterns: ExtractionPattern[];

  // Separators
  directorSeparator: string;
  genreSeparator: string;
  starSeparator: string;
  savedPartSeparator: string;

  // Options
  renameFolder: boolean;
  createUrlFile: boolean;
  createPoster: boolean;
  removeThe: boolean;
  swapThe: boolean;
  titleSpaceChar: string;
  htmlZoom: number;
  showWebView: boolean;
  theme: 'dark' | 'light' | 'system';
  showResultThumbnails: boolean;
  uiZoom: number;
  includeOriginalInUrl: boolean;
  includeNfoInUrl: boolean;
  deleteNfoAfterInclude: boolean;
  posterInDvdFolder: boolean;
  detectDvd: boolean;
  maxUndos: number;
  theWord: string;
  separateDvdFormat: boolean;
  separatePosterFormat: boolean;
  posterSaveSize: string;
  separateUrlFormat: boolean;

  // NFO
  nfoFolder: string;
  scanNfo: boolean;

  // MPAA mapping
  mpaaMap: Array<[string, string]>;

  // Recent folders
  recentFolders: string[];
  folderHistory: FolderHistoryEntry[];

  // Recursion
  recursionMode: RecursionMode;

  // Log
  logFilePath: string;

  // Legacy regex (for imported configs)
  customRegexPatterns: Record<string, string> | null;

  // Update
  skipUpdateVersion: string | null;
}
