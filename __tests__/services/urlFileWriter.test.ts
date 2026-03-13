import { generateUrlFileContent, generateWeblocContent } from '../../src/services/urlFileWriter';

describe('urlFileWriter', () => {
  describe('generateUrlFileContent', () => {
    it('generates Windows .url content with InternetShortcut section', () => {
      const content = generateUrlFileContent({
        url: 'http://www.imdb.com/title/tt0111161/',
        nfoContent: null,
      });
      expect(content).toContain('[InternetShortcut]');
      expect(content).toContain('URL=http://www.imdb.com/title/tt0111161/');
    });

    it('omits [OriginalFilename] when includeOriginal is false', () => {
      const content = generateUrlFileContent({
        url: 'http://www.imdb.com/title/tt0111161/',
        originalPath: '/movies/old.mkv',
        includeOriginal: false,
        nfoContent: null,
      });
      expect(content).not.toContain('[OriginalFilename]');
      expect(content).not.toContain('NAME=');
    });

    it('omits [OriginalFilename] when includeOriginal is omitted', () => {
      const content = generateUrlFileContent({
        url: 'http://www.imdb.com/title/tt0111161/',
        originalPath: '/movies/old.mkv',
        nfoContent: null,
      });
      expect(content).not.toContain('[OriginalFilename]');
    });

    it('includes [OriginalFilename] when includeOriginal is true', () => {
      const content = generateUrlFileContent({
        url: 'http://www.imdb.com/title/tt0111161/',
        originalPath: '/movies/old.mkv',
        includeOriginal: true,
        nfoContent: null,
      });
      expect(content).toContain('[OriginalFilename]');
      expect(content).toContain('NAME=/movies/old.mkv');
    });

    it('omits [OriginalFilename] when includeOriginal is true but originalPath is absent', () => {
      const content = generateUrlFileContent({
        url: 'http://www.imdb.com/title/tt0111161/',
        includeOriginal: true,
        nfoContent: null,
      });
      expect(content).not.toContain('[OriginalFilename]');
    });

    it('includes NFO section when provided', () => {
      const content = generateUrlFileContent({
        url: 'http://www.imdb.com/title/tt0111161/',
        nfoContent: 'line1\nline2',
      });
      expect(content).toContain('[NFO]');
    });

    it('uses sequential LINE keys for NFO content', () => {
      const content = generateUrlFileContent({
        url: 'http://www.imdb.com/title/tt0111161/',
        nfoContent: 'line1\nline2\nline3',
      });
      expect(content).toContain('LINE0=line1');
      expect(content).toContain('LINE1=line2');
      expect(content).toContain('LINE2=line3');
      expect(content).not.toContain('NFO=');
    });

    it('omits NFO section when nfoContent is null', () => {
      const content = generateUrlFileContent({
        url: 'http://www.imdb.com/title/tt0111161/',
        nfoContent: null,
      });
      expect(content).not.toContain('[NFO]');
    });

    it('uses CRLF line endings', () => {
      const content = generateUrlFileContent({
        url: 'http://www.imdb.com/title/tt0111161/',
        nfoContent: null,
      });
      expect(content).toMatch(/\r\n/);
    });
  });

  describe('generateWeblocContent', () => {
    it('generates macOS .webloc plist XML from string (backward compat)', () => {
      const content = generateWeblocContent('http://www.imdb.com/title/tt0111161/');
      expect(content).toContain('<?xml version="1.0"');
      expect(content).toContain('<string>http://www.imdb.com/title/tt0111161/</string>');
    });

    it('generates webloc with optional original and NFO when provided', () => {
      const content = generateWeblocContent({
        url: 'http://www.imdb.com/title/tt0111161/',
        originalPath: '/movies/old.mkv',
        nfoContent: 'Title: The Shawshank Redemption',
      });
      expect(content).toContain('<key>URL</key>');
      expect(content).toContain('<string>http://www.imdb.com/title/tt0111161/</string>');
      expect(content).toContain('<key>OriginalFilename</key>');
      expect(content).toContain('<string>/movies/old.mkv</string>');
      expect(content).toContain('<key>NFOContent</key>');
      expect(content).toContain('Title: The Shawshank Redemption');
    });

    it('generates webloc without optional fields when omitted', () => {
      const content = generateWeblocContent({
        url: 'http://www.imdb.com/title/tt0111161/',
      });
      expect(content).toContain('<key>URL</key>');
      expect(content).not.toContain('<key>OriginalFilename</key>');
      expect(content).not.toContain('<key>NFOContent</key>');
    });

    it('escapes XML special characters in URL', () => {
      const content = generateWeblocContent('http://example.com/search?a=1&b=2');
      expect(content).toContain('&amp;');
      expect(content).not.toContain('&b=');
    });
  });
});
