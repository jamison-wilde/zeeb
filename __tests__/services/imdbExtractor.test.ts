import { describe, it, expect } from 'vitest';
import {
  buildSearchUrl,
  buildTitleUrl,
  generateSearchExtractionScript,
  generateTitleExtractionScript,
  parseSearchResults,
  parseTitleData,
} from '../../src/services/imdbExtractor';
import type { ExtractionPattern } from '../../src/types';

describe('imdbExtractor', () => {
  it('builds IMDB search URL from query', () => {
    const url = buildSearchUrl('The Matrix 1999', 'https://www.imdb.com/find?s=tt&q=');
    expect(url).toBe('https://www.imdb.com/find?s=tt&q=The%20Matrix%201999');
  });

  it('builds IMDB title URL from tt number', () => {
    const url = buildTitleUrl('tt0111161', 'https://www.imdb.com/title/');
    expect(url).toBe('https://www.imdb.com/title/tt0111161/');
  });

  it('generates JS injection script for search page', () => {
    const script = generateSearchExtractionScript();
    expect(script).toContain('zeebIpc.sendToHost');
    expect(script).toContain('JSON.stringify');
  });

  it('generates JS injection script for title page', () => {
    const patterns: ExtractionPattern[] = [
      { field: 'title', jsonLdPath: 'name', domSelector: 'h1 span', regexPattern: null, regexGroup: null },
    ];
    const script = generateTitleExtractionScript(patterns);
    expect(script).toContain('application/ld+json');
    expect(script).toContain('querySelector');
  });

  it('search extraction script uses zeebIpc.sendToHost', () => {
    const script = generateSearchExtractionScript();
    expect(script).toContain('window.zeebIpc.sendToHost');
    expect(script).not.toContain('ReactNativeWebView');
  });

  it('title extraction script uses zeebIpc.sendToHost', () => {
    const script = generateTitleExtractionScript([]);
    expect(script).toContain('window.zeebIpc.sendToHost');
    expect(script).not.toContain('ReactNativeWebView');
  });

  it('parses search results from WebView message', () => {
    const message = JSON.stringify({
      type: 'searchResults',
      results: [
        { tt: 'tt0111161', title: 'The Shawshank Redemption', year: 1994, aka: null, thumbnailUrl: null },
        { tt: 'tt0111162', title: 'Another Movie', year: 2000, aka: null, thumbnailUrl: null },
      ],
    });
    const results = parseSearchResults(message);
    expect(results).toHaveLength(2);
    expect(results[0].tt).toBe('tt0111161');
  });

  it('parses title data from WebView message', () => {
    const message = JSON.stringify({
      type: 'titleData',
      data: {
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
      },
    });
    const data = parseTitleData(message);
    expect(data?.title).toBe('The Shawshank Redemption');
    expect(data?.rating).toBe(9.3);
  });
});
