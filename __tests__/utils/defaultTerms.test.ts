import { DEFAULT_REMOVE_TERMS, DEFAULT_KEEP_TERMS, DEFAULT_MOVIE_EXTENSIONS, DEFAULT_SUBTITLE_EXTENSIONS, DEFAULT_MPAA_MAP } from '../../src/utils/defaultTerms';

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

  it('keep terms has exactly 35 entries', () => {
    expect(DEFAULT_KEEP_TERMS).toHaveLength(35);
  });

  it('keep terms includes legacy quality markers', () => {
    const keys = DEFAULT_KEEP_TERMS.map(([k]) => k);
    const displayLabels = DEFAULT_KEEP_TERMS.map(([, d]) => d);
    expect(keys).toContain('720p');
    expect(keys).toContain('1080p');
    expect(displayLabels).toContain('720p');
    expect(displayLabels).toContain('1080p');
    expect(displayLabels).toContain('4K');
    expect(displayLabels).toContain("Director's Cut");
    expect(displayLabels).toContain('Extended');
    expect(displayLabels).toContain('HDTV');
    expect(displayLabels).toContain('Remastered');
    expect(displayLabels).toContain('Unrated');
    expect(displayLabels).toContain('Uncut');
  });

  it('keep terms does NOT include removed entries', () => {
    const keys = DEFAULT_KEEP_TERMS.map(([k]) => k);
    const displayLabels = DEFAULT_KEEP_TERMS.map(([, d]) => d);
    expect(displayLabels).not.toContain('Criterion Collection');
    expect(keys).not.toContain('cc');
    expect(displayLabels).not.toContain('Platinum Edition');
    expect(displayLabels).not.toContain('Atmos');
    expect(displayLabels).not.toContain('TrueHD');
    expect(displayLabels).not.toContain('DDP5.1');
    expect(displayLabels).not.toContain('Theatrical');
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

describe('DEFAULT_MPAA_MAP', () => {
  it('has exactly 16 entries', () => {
    expect(DEFAULT_MPAA_MAP).toHaveLength(16);
  });

  it('has NF as first entry', () => {
    expect(DEFAULT_MPAA_MAP[0]).toEqual(['NF', 'NR']);
  });

  it('includes key MPAA ratings', () => {
    const keys = DEFAULT_MPAA_MAP.map(([k]) => k);
    expect(keys).toContain('R');
    expect(keys).toContain('PG');
    expect(keys).toContain('PG_13');
    expect(keys).toContain('G');
    expect(keys).toContain('NC_17');
    expect(keys).toContain('UNRATED');
  });

  it('maps PG_13 to PG-13', () => {
    const entry = DEFAULT_MPAA_MAP.find(([k]) => k === 'PG_13');
    expect(entry?.[1]).toBe('PG-13');
  });
});
