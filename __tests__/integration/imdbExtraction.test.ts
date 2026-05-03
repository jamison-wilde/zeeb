import { describe, it, expect } from 'vitest';
import {
  parseSearchResults,
  parseTitleData,
} from '../../src/services/imdbExtractor';

describe('IMDB extraction integration', () => {
  it('round-trips search results through message format', () => {
    const original = [
      { tt: 'tt0111161', title: 'The Shawshank Redemption', year: 1994, aka: null, thumbnailUrl: null },
    ];
    const message = JSON.stringify({ type: 'searchResults', results: original });
    const parsed = parseSearchResults(message);
    expect(parsed).toEqual(original);
  });

  it('round-trips title data through message format', () => {
    const original = {
      tt: 'tt0111161', title: 'The Shawshank Redemption', year: 1994,
      rating: 9.3, directors: ['Frank Darabont'], genres: ['Drama'],
      actors: ['Tim Robbins'], duration: 142, mpaa: 'R', aka: [], posterUrl: null,
    };
    const message = JSON.stringify({ type: 'titleData', data: original });
    const parsed = parseTitleData(message);
    expect(parsed).toEqual(original);
  });
});
