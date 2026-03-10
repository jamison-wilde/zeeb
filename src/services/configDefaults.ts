import type { ZeebConfig } from '../types';
import {
  DEFAULT_REMOVE_TERMS,
  DEFAULT_KEEP_TERMS,
  DEFAULT_MOVIE_EXTENSIONS,
  DEFAULT_SUBTITLE_EXTENSIONS,
} from '../utils/defaultTerms';

export const DEFAULT_CONFIG: ZeebConfig = {
  // Window state
  windowWidth: 1024,
  windowHeight: 768,
  windowMaximized: false,

  // Format strings
  formatStandard: '<title> (<year>).<imdb>(<rating100>).<saved>',
  formatAka: '<title> (<year>).<imdb>(<rating100>).<aka>.<saved>',
  formatDvd: '<title> (<year>).<imdb>(<rating100>)',
  formatPoster: '<title> (<year>).<imdb>(<rating100>)',
  formatUrl: '<title> (<year>).<imdb>(<rating100>)',

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

  // Options
  renameFolder: false,
  createUrlFile: true,
  createPoster: true,
  removeThe: false,
  swapThe: false,
  titleSpaceChar: ' ',
  htmlZoom: 100,
  showWebView: false,

  // NFO
  nfoFolder: '',
  scanNfo: false,

  // MPAA mapping
  mpaaMap: {},

  // Recent folders
  recentFolders: [],

  // Recursion
  recursionMode: 'none',

  // Log
  logFilePath: '',

  // Legacy regex
  customRegexPatterns: null,
};
