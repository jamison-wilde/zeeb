import type { ZeebConfig } from '../types';
import {
  DEFAULT_REMOVE_TERMS,
  DEFAULT_KEEP_TERMS,
  DEFAULT_MOVIE_EXTENSIONS,
  DEFAULT_SUBTITLE_EXTENSIONS,
  DEFAULT_MPAA_MAP,
} from '../utils/defaultTerms';

export const DEFAULT_CONFIG: ZeebConfig = {
  // Window state
  windowWidth: 1024,
  windowHeight: 768,
  windowMaximized: false,

  // Format strings
  formatStandard: '<title> (<year>).<imdb>(<rating100>).<saved>',
  formatAka: '<aka> (<title>) (<year>).<imdb>(<rating100>).<saved>',
  formatDvd: '<title> (<year>).<imdb>(<rating100>).<saved>',
  formatDvdAka: '<aka> (<title>) (<year>).<imdb>(<rating100>).<saved>',
  formatPoster: '',
  formatUrl: '',

  // File handling
  movieExtensions: DEFAULT_MOVIE_EXTENSIONS,
  subtitleExtensions: DEFAULT_SUBTITLE_EXTENSIONS,
  removeTerms: DEFAULT_REMOVE_TERMS,
  keepTerms: DEFAULT_KEEP_TERMS,

  // IMDB/TMDB
  urlImdbSearch: 'https://www.imdb.com/find?s=tt&q=',
  urlImdbTT: 'https://www.imdb.com/title/',
  urlTmdbApi: 'https://api.themoviedb.org/3/',
  tmdbApiKey: 'bb81778a56280ab7f28d2048dfdbec88',

  // Extraction patterns
  extractionPatterns: [],

  // Separators
  directorSeparator: ', ',
  genreSeparator: ', ',
  starSeparator: ', ',
  savedPartSeparator: '.',

  // Options
  renameFolder: false,
  createUrlFile: true,
  createPoster: true,
  removeThe: false,
  swapThe: false,
  titleSpaceChar: ' ',
  htmlZoom: 100,
  showWebView: false,
  includeOriginalInUrl: true,
  includeNfoInUrl: false,
  deleteNfoAfterInclude: false,
  posterInDvdFolder: true,
  detectDvd: true,
  maxUndos: 100,
  theWord: 'The',
  separateDvdFormat: false,
  separatePosterFormat: false,
  separateUrlFormat: false,

  // NFO
  nfoFolder: '',
  scanNfo: false,

  // MPAA mapping
  mpaaMap: DEFAULT_MPAA_MAP,

  // Recent folders
  recentFolders: [],

  // Recursion
  recursionMode: 'none',

  // Log
  logFilePath: '',

  // Legacy regex
  customRegexPatterns: null,
};
