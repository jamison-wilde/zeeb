import type {
  MovieFile,
  MovieMatch,
  MovieMetadata,
  SearchPart,
  SearchPartState,
  RenameTransaction,
  UndoEntry,
  ZeebConfig,
  ExtractionPattern,
  FormatTokens,
} from '../src/types';

describe('Core types', () => {
  it('MovieFile has required fields', () => {
    const file: MovieFile = {
      id: '1',
      name: 'Movie.2024.720p.mkv',
      nativePath: '/movies/Movie.2024.720p.mkv',
      folder: '/movies',
      extension: 'mkv',
      size: 1024,
      isDvdFolder: false,
      hasNfo: false,
      hasUrl: false,
      hasPoster: false,
      nfoPath: null,
      urlPath: null,
      posterPath: null,
    };
    expect(file.name).toBe('Movie.2024.720p.mkv');
  });

  it('SearchPart tracks state and text', () => {
    const part: SearchPart = {
      id: '0',
      text: 'Movie',
      originalText: 'Movie',
      state: 'search',
      editable: true,
    };
    expect(part.state).toBe('search');
  });

  it('MovieMetadata holds extracted IMDB data', () => {
    const meta: MovieMetadata = {
      tt: 'tt0111161',
      title: 'The Shawshank Redemption',
      year: 1994,
      rating: 9.3,
      directors: ['Frank Darabont'],
      genres: ['Drama'],
      actors: ['Tim Robbins', 'Morgan Freeman'],
      duration: 142,
      mpaa: 'R',
      aka: [],
      posterUrl: null,
    };
    expect(meta.tt).toBe('tt0111161');
  });

  it('RenameTransaction tracks undo operations', () => {
    const tx: RenameTransaction = {
      id: '1',
      timestamp: Date.now(),
      entries: [
        {
          type: 'rename',
          sourcePath: '/movies/old.mkv',
          destPath: '/movies/new.mkv',
        },
      ],
    };
    expect(tx.entries).toHaveLength(1);
  });

  it('ExtractionPattern supports all three tiers', () => {
    const pattern: ExtractionPattern = {
      field: 'title',
      jsonLdPath: 'name',
      domSelector: 'h1[data-testid="hero__pageTitle"] span',
      regexPattern: '<title>(.+?) \\(\\d{4}\\)',
      regexGroup: 1,
    };
    expect(pattern.field).toBe('title');
  });
});
