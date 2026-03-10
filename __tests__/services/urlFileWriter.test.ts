import { generateUrlFileContent, generateWeblocContent } from '../../src/services/urlFileWriter';

describe('urlFileWriter', () => {
  it('generates Windows .url content', () => {
    const content = generateUrlFileContent({
      url: 'http://www.imdb.com/title/tt0111161/',
      originalPath: '/movies/old.mkv',
      nfoContent: null,
    });
    expect(content).toContain('[InternetShortcut]');
    expect(content).toContain('URL=http://www.imdb.com/title/tt0111161/');
    expect(content).toContain('[OriginalFilename]');
    expect(content).toContain('NAME=/movies/old.mkv');
  });

  it('includes NFO section when provided', () => {
    const content = generateUrlFileContent({
      url: 'http://www.imdb.com/title/tt0111161/',
      originalPath: '/movies/old.mkv',
      nfoContent: 'line1\nline2',
    });
    expect(content).toContain('[NFO]');
    expect(content).toContain('NFO=line1');
    expect(content).toContain('NFO=line2');
  });

  it('generates macOS .webloc plist XML', () => {
    const content = generateWeblocContent('http://www.imdb.com/title/tt0111161/');
    expect(content).toContain('<?xml version="1.0"');
    expect(content).toContain('<string>http://www.imdb.com/title/tt0111161/</string>');
  });
});
