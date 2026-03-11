import { parseNfo, extractImdbFromNfo } from '../../src/services/nfoParser';

describe('nfoParser', () => {
  it('converts CP437 bytes to Unicode string', () => {
    const result = parseNfo(Buffer.from([0x41, 0xc9, 0xcd, 0xbb]));
    expect(result).toBe('A\u2554\u2550\u2557');
  });

  it('extracts IMDB tt number from NFO content', () => {
    const nfo = 'Some text\nhttp://www.imdb.com/title/tt0111161/\nMore text';
    expect(extractImdbFromNfo(nfo)).toBe('tt0111161');
  });

  it('extracts tt from various IMDB URL formats', () => {
    expect(extractImdbFromNfo('imdb.com/title/tt1234567')).toBe('tt1234567');
    expect(extractImdbFromNfo('IMDB: tt7654321')).toBe('tt7654321');
  });

  it('returns null when no tt found', () => {
    expect(extractImdbFromNfo('No IMDB link here')).toBeNull();
  });
});
