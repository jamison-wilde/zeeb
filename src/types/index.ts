// src/types/index.ts

export type SearchPartState = 'search' | 'keep' | 'remove' | 'keepAlways' | 'removeAlways';

export interface SearchPart {
  id: string;
  text: string;
  originalText: string;
  state: SearchPartState;
  editable: boolean;
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
  entries: UndoEntry[];
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
  // Window state
  windowWidth: number;
  windowHeight: number;
  windowMaximized: boolean;

  // Format strings
  formatStandard: string;
  formatAka: string;
  formatDvd: string;
  formatPoster: string;
  formatUrl: string;

  // File handling
  movieExtensions: string[];
  subtitleExtensions: string[];
  removeTerms: string[];
  keepTerms: string[];

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

  // Options
  renameFolder: boolean;
  createUrlFile: boolean;
  createPoster: boolean;
  removeThe: boolean;
  swapThe: boolean;
  titleSpaceChar: string;
  htmlZoom: number;
  showWebView: boolean;

  // NFO
  nfoFolder: string;
  scanNfo: boolean;

  // MPAA mapping
  mpaaMap: Record<string, string>;

  // Recent folders
  recentFolders: string[];

  // Recursion
  recursionMode: 'none' | 'subfolders' | 'full';

  // Log
  logFilePath: string;

  // Legacy regex (for imported configs)
  customRegexPatterns: Record<string, string> | null;
}
