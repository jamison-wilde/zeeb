import { parseFilename } from '../../src/services/filenameParser';

const removeTerms = ['BluRay', 'x264', 'YIFY', '720p', 'DTS'];
const keepTerms = ['Directors Cut', 'Extended'];

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

  it('detects year-like 4-digit numbers and marks as search', () => {
    const parts = parseFilename('Movie.1999.mkv', removeTerms, keepTerms);
    const year = parts.find(p => p.text === '1999');
    expect(year?.state).toBe('search');
  });

  it('returns empty array for empty input', () => {
    expect(parseFilename('', removeTerms, keepTerms)).toEqual([]);
  });
});
