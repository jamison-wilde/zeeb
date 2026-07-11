import { parseFilename } from '../../src/services/filenameParser';

const removeTerms = ['BluRay', 'x264', 'YIFY', '720p', 'DTS'];
const keepTerms: Array<[string, string]> = [['Directors Cut', 'Directors Cut'], ['Extended', 'Extended']];

describe('parseFilename', () => {
  it('splits filename into parts by common separators', () => {
    const parts = parseFilename('The.Matrix.1999.720p.BluRay.x264-YIFY.mkv', removeTerms, keepTerms);
    const texts = parts.map(p => p.text);
    expect(texts).toContain('The');
    expect(texts).toContain('Matrix');
    expect(texts).toContain('1999');
  });

  it('marks remove terms as remove state', () => {
    const parts = parseFilename('Movie.720p.BluRay.x264.mkv', removeTerms, keepTerms);
    const bluray = parts.find(p => p.text === 'BluRay');
    expect(bluray?.state).toBe('remove');
  });

  it('marks keep terms as keep state', () => {
    const parts = parseFilename('Movie.Directors.Cut.mkv', removeTerms, keepTerms);
    const dc = parts.find(p => p.text === 'Directors Cut');
    expect(dc?.state).toBe('keep');
  });

  it('strips file extension', () => {
    const parts = parseFilename('Movie.mkv', removeTerms, keepTerms);
    expect(parts.find(p => p.text === 'mkv')).toBeUndefined();
  });

  it('handles spaces, dots, underscores, and dashes as separators', () => {
    const parts = parseFilename('Movie_Name-2024 720p.mkv', removeTerms, keepTerms);
    const texts = parts.map(p => p.text);
    expect(texts).toContain('Movie');
    expect(texts).toContain('Name');
    expect(texts).toContain('2024');
  });

  it('detects year-like 4-digit numbers and marks as remove', () => {
    const parts = parseFilename('Movie.1999.mkv', removeTerms, keepTerms);
    const year = parts.find(p => p.text === '1999');
    expect(year?.state).toBe('remove');
  });

  it('marks year in realistic filename as remove', () => {
    const parts = parseFilename('Movie.Name.2023.1080p.BluRay.mkv', removeTerms, keepTerms);
    const year = parts.find(p => p.text === '2023');
    expect(year?.state).toBe('remove');
  });

  it('does not mark non-year 4-digit numbers as remove', () => {
    const parts = parseFilename('Movie.1800.mkv', removeTerms, keepTerms);
    const token = parts.find(p => p.text === '1800');
    expect(token?.state).toBe('search');
  });

  it('returns empty array for empty input', () => {
    expect(parseFilename('', removeTerms, keepTerms)).toEqual([]);
  });

  it('only marks the last year-like token as remove when title contains a year', () => {
    const parts = parseFilename('2001.A.Space.Odyssey.1968.mkv', removeTerms, keepTerms);
    const p2001 = parts.find(p => p.text === '2001');
    const p1968 = parts.find(p => p.text === '1968');
    expect(p2001?.state).toBe('search');
    expect(p1968?.state).toBe('remove');
  });

  it('uses match token from keepTerms pairs for matching', () => {
    const result = parseFilename(
      'Movie.720p.BluRay.mkv',
      ['BluRay'],
      [['720', '720p'], ['dc', "Director's Cut"]],
    );
    const kept = result.find(p => p.state === 'keep');
    expect(kept).toBeDefined();
    expect(kept!.text).toBe('720p'); // display label replaces raw token
  });

  it('matches multi-word keep term pairs', () => {
    const result = parseFilename(
      'Movie.Directors.Cut.1080p.mkv',
      [],
      [["Director's Cut", "Director's Cut"], ['1080', '1080p']],
    );
    const kept1080 = result.find(p => p.state === 'keep');
    expect(kept1080).toBeDefined();
    expect(kept1080!.text).toBe('1080p');
  });
});

describe('separatorAfter', () => {
  it('captures the separator run following each token', () => {
    const parts = parseFilename('A.Trip_to the-Moon.1902.mkv', [], []);
    expect(parts.map((p) => p.separatorAfter)).toEqual(['.', '_', ' ', '-', '.', '']);
  });

  it('captures multi-character separator runs', () => {
    const parts = parseFilename('Foo..-..Bar.mkv', [], []);
    expect(parts.map((p) => p.separatorAfter)).toEqual(['..-..', '']);
  });

  it('multi-token keep terms take the separator after their last token', () => {
    const parts = parseFilename('Movie.Final.Cut.2001.mkv', [], [['Final Cut', 'Final Cut']]);
    const keep = parts.find((p) => p.text === 'Final Cut');
    expect(keep?.separatorAfter).toBe('.');
  });
});
