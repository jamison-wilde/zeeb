import { DEFAULT_REMOVE_TERMS, DEFAULT_KEEP_TERMS, DEFAULT_MOVIE_EXTENSIONS, DEFAULT_SUBTITLE_EXTENSIONS } from '../../src/utils/defaultTerms';

describe('defaultTerms', () => {
  it('remove terms includes common release group tags', () => {
    expect(DEFAULT_REMOVE_TERMS).toContain('YIFY');
    expect(DEFAULT_REMOVE_TERMS).toContain('BluRay');
    expect(DEFAULT_REMOVE_TERMS).toContain('WEBRip');
  });

  it('remove terms includes modern encoding formats', () => {
    expect(DEFAULT_REMOVE_TERMS).toContain('x265');
    expect(DEFAULT_REMOVE_TERMS).toContain('HEVC');
    expect(DEFAULT_REMOVE_TERMS).toContain('HDR');
    expect(DEFAULT_REMOVE_TERMS).toContain('Atmos');
    expect(DEFAULT_REMOVE_TERMS).toContain('DTS-HD');
  });

  it('keep terms includes quality markers', () => {
    const displayLabels = DEFAULT_KEEP_TERMS.map(([, d]) => d);
    expect(displayLabels).toContain('720p');
    expect(displayLabels).toContain('1080p');
    expect(displayLabels).toContain('4K');
    expect(displayLabels).toContain("Director's Cut");
    expect(displayLabels).toContain('Extended');
  });

  it('movie extensions includes standard formats', () => {
    expect(DEFAULT_MOVIE_EXTENSIONS).toContain('mkv');
    expect(DEFAULT_MOVIE_EXTENSIONS).toContain('mp4');
    expect(DEFAULT_MOVIE_EXTENSIONS).toContain('avi');
  });

  it('subtitle extensions includes standard formats', () => {
    expect(DEFAULT_SUBTITLE_EXTENSIONS).toContain('srt');
    expect(DEFAULT_SUBTITLE_EXTENSIONS).toContain('sub');
    expect(DEFAULT_SUBTITLE_EXTENSIONS).toContain('idx');
  });

  it('has no duplicates in remove terms', () => {
    const unique = new Set(DEFAULT_REMOVE_TERMS.map(t => t.toLowerCase()));
    expect(unique.size).toBe(DEFAULT_REMOVE_TERMS.length);
  });
});
