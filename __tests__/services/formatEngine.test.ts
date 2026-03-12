import { interpolateFormat } from '../../src/services/formatEngine';
import type { MovieMetadata } from '../../src/types';

const meta: MovieMetadata = {
  tt: 'tt0111161',
  title: 'The Shawshank Redemption',
  year: 1994,
  rating: 9.3,
  directors: ['Frank Darabont'],
  genres: ['Drama'],
  actors: ['Tim Robbins', 'Morgan Freeman', 'Bob Gunton'],
  duration: 142,
  mpaa: 'R',
  aka: ['Die Verurteilten'],
  posterUrl: null,
};

describe('interpolateFormat', () => {
  it('replaces <title> with movie title', () => {
    expect(interpolateFormat('<title>', meta, { saved: '' })).toBe('The Shawshank Redemption');
  });

  it('replaces <year> with release year', () => {
    expect(interpolateFormat('<year>', meta, { saved: '' })).toBe('1994');
  });

  it('replaces <rating100> with rating on 0-100 scale', () => {
    // 9.3 out of 10 → round(9.3 * 10) = 93
    const result = interpolateFormat('<rating100>', meta, { saved: '' });
    expect(result).toBe('93');
  });

  it('replaces <rating10> with rating', () => {
    expect(interpolateFormat('<rating10>', meta, { saved: '' })).toBe('9.3');
  });

  it('replaces <imdb> with tt number', () => {
    expect(interpolateFormat('<imdb>', meta, { saved: '' })).toBe('tt0111161');
  });

  it('replaces <directors> with separator-joined list', () => {
    expect(interpolateFormat('<directors>', meta, { saved: '', directorSeparator: ', ' })).toBe('Frank Darabont');
  });

  it('replaces <star1> with first actor', () => {
    expect(interpolateFormat('<star1>', meta, { saved: '' })).toBe('Tim Robbins');
  });

  it('handles compound format string', () => {
    const fmt = '<title> (<year>).<imdb>(<rating100>).<saved>';
    const result = interpolateFormat(fmt, meta, { saved: '720p' });
    expect(result).toBe('The Shawshank Redemption (1994).tt0111161(93).720p');
  });

  it('replaces <H> and <M> for duration', () => {
    expect(interpolateFormat('<H>h<M>m', meta, { saved: '' })).toBe('2h22m');
  });

  it('handles removeThe option', () => {
    expect(interpolateFormat('<title>', meta, { saved: '', removeThe: true })).toBe('Shawshank Redemption');
  });

  it('handles swapThe option', () => {
    expect(interpolateFormat('<title>', meta, { saved: '', swapThe: true })).toBe('Shawshank Redemption, The');
  });

  it('replaces spaces with titleSpaceChar', () => {
    expect(interpolateFormat('<title>', meta, { saved: '', titleSpaceChar: '.' })).toBe('The.Shawshank.Redemption');
  });

  it('returns empty string for null fields', () => {
    const noYear = { ...meta, year: null };
    expect(interpolateFormat('<year>', noYear, { saved: '' })).toBe('');
  });

  it('sanitizes illegal filename characters', () => {
    const colonTitle = { ...meta, title: '2001: A Space Odyssey' };
    const result = interpolateFormat('<title> (<year>)', colonTitle, { saved: '' });
    expect(result).toBe('2001 - A Space Odyssey (1994)');
  });

  it('removes question marks and asterisks from filenames', () => {
    const weirdTitle = { ...meta, title: 'What If...?' };
    expect(interpolateFormat('<title>', weirdTitle, { saved: '' })).toBe('What If..');
  });
});

describe('interpolateFormat mpaaMap', () => {
  const mpaaMap: Array<[string, string]> = [
    ['NF', 'NR'],
    ['R', 'Restricted'],
    ['PG', 'PG'],
    ['PG_13', 'PG-13'],
  ];

  it('applies mpaaMap when raw value has a mapping', () => {
    const result = interpolateFormat('<mpaa>', meta, { saved: '', mpaaMap });
    expect(result).toBe('Restricted');
  });

  it('passes through raw value when no mapping found', () => {
    const unknownMpaa = { ...meta, mpaa: 'UNKNOWN' };
    const result = interpolateFormat('<mpaa>', unknownMpaa, { saved: '', mpaaMap });
    expect(result).toBe('UNKNOWN');
  });

  it('uses NF fallback when mpaa is null', () => {
    const noMpaa = { ...meta, mpaa: null };
    const result = interpolateFormat('<mpaa>', noMpaa, { saved: '', mpaaMap });
    expect(result).toBe('NR');
  });

  it('works with empty mpaaMap', () => {
    const result = interpolateFormat('<mpaa>', meta, { saved: '', mpaaMap: [] });
    expect(result).toBe('R');
  });
});
