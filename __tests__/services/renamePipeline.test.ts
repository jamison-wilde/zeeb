import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeRename, type ExecuteRenameArgs } from '../../src/services/renamePipeline';
import { createMockFsAdapter } from '../../src/adapters/fs';
import type { ZeebConfig, MovieFile, MovieMetadata } from '../../src/types';
import { DEFAULT_CONFIG } from '../../src/services/configDefaults';

function makeFile(overrides: Partial<MovieFile> = {}): MovieFile {
  return {
    id: 'f1',
    name: 'old.mkv',
    nativePath: '/movies/old.mkv',
    folder: '/movies',
    extension: 'mkv',
    size: 0,
    isDvdFolder: false,
    hasNfo: false,
    hasUrl: false,
    hasPoster: false,
    nfoPath: null,
    urlPath: null,
    posterPath: null,
    ...overrides,
  };
}

function makeMetadata(overrides: Partial<MovieMetadata> = {}): MovieMetadata {
  return {
    tt: 'tt0111161',
    title: 'The Shawshank Redemption',
    year: 1994,
    rating: 9.3,
    directors: ['Frank Darabont'],
    genres: ['Drama'],
    actors: ['Tim Robbins'],
    duration: 142,
    mpaa: 'R',
    aka: [],
    posterUrl: null,
    ...overrides,
  };
}

function makeConfig(overrides: Partial<ZeebConfig> = {}): ZeebConfig {
  return {
    ...DEFAULT_CONFIG,
    createUrlFile: false,
    createPoster: false,
    renameFolder: false,
    ...overrides,
  };
}

function makeArgs(overrides: Partial<ExecuteRenameArgs> = {}): ExecuteRenameArgs {
  return {
    fs: createMockFsAdapter(),
    currentFile: makeFile(),
    previewFilename: 'New Movie (1994).mkv',
    metadata: makeMetadata(),
    posterRemotePath: null,
    selectedAka: null,
    config: makeConfig(),
    platform: 'win',
    ...overrides,
  };
}

describe('renamePipeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --- Test 1: plain file rename ---
  it('renames a single file with no extras', async () => {
    const renameMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({ rename: renameMock });
    const result = await executeRename(makeArgs({ fs }));
    expect(renameMock).toHaveBeenCalledWith('/movies/old.mkv', '/movies/New Movie (1994).mkv');
    expect(result.entries).toEqual([
      { type: 'rename', sourcePath: '/movies/old.mkv', destPath: '/movies/New Movie (1994).mkv' },
    ]);
    expect(result.finalPath).toBe('/movies/New Movie (1994).mkv');
    expect(result.finalFolder).toBe('/movies');
    expect(result.posterSaveError).toBeUndefined();
  });

  // --- Test 2: subtitles ---
  it('renames matching subtitle files alongside the movie', async () => {
    const renameMock = vi.fn().mockResolvedValue(undefined);
    const readdirMock = vi.fn().mockResolvedValue([
      { name: 'old.mkv', path: '/movies/old.mkv', isFile: true, isDirectory: false },
      { name: 'old.en.srt', path: '/movies/old.en.srt', isFile: true, isDirectory: false },
      { name: 'old.fr.srt', path: '/movies/old.fr.srt', isFile: true, isDirectory: false },
    ]);
    const fs = createMockFsAdapter({ rename: renameMock, readdir: readdirMock });
    const result = await executeRename(makeArgs({ fs }));
    expect(renameMock).toHaveBeenCalledWith('/movies/old.mkv', '/movies/New Movie (1994).mkv');
    expect(renameMock).toHaveBeenCalledWith('/movies/old.en.srt', '/movies/New Movie (1994).en.srt');
    expect(renameMock).toHaveBeenCalledWith('/movies/old.fr.srt', '/movies/New Movie (1994).fr.srt');
    expect(result.entries).toHaveLength(3);
  });

  // --- Test 3: folder rename ---
  it('renames the containing folder when enabled and folder name differs', async () => {
    const renameMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({ rename: renameMock });
    const result = await executeRename(makeArgs({
      fs,
      currentFile: makeFile({ nativePath: '/parent/old folder/old.mkv', folder: '/parent/old folder' }),
      config: makeConfig({ renameFolder: true }),
    }));
    expect(renameMock).toHaveBeenCalledWith('/parent/old folder/old.mkv', '/parent/old folder/New Movie (1994).mkv');
    expect(renameMock).toHaveBeenCalledWith('/parent/old folder', '/parent/New Movie (1994)');
    expect(result.finalFolder).toBe('/parent/New Movie (1994)');
    expect(result.entries[result.entries.length - 1]).toEqual({
      type: 'rename',
      sourcePath: '/parent/old folder',
      destPath: '/parent/New Movie (1994)',
    });
  });

  // --- Test 4: URL file (Windows) ---
  it('writes a .url file with original path when createUrlFile is on', async () => {
    const writeFileMock = vi.fn().mockResolvedValue(undefined);
    const renameMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({ rename: renameMock, writeFile: writeFileMock });
    const result = await executeRename(makeArgs({
      fs,
      config: makeConfig({ createUrlFile: true, includeOriginalInUrl: true }),
    }));
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const [path, content] = writeFileMock.mock.calls[0];
    expect(path).toBe('/movies/New Movie (1994).url');
    expect(content).toContain('https://www.imdb.com/title/tt0111161/');
    expect(content).toContain('/movies/old.mkv');
    expect(result.entries.find((e) => e.type === 'create' && e.sourcePath.endsWith('.url'))).toBeTruthy();
  });

  // --- Test 5: URL file with NFO + delete-after ---
  it('includes NFO content in the URL file and deletes the NFO when configured', async () => {
    const writeFileMock = vi.fn().mockResolvedValue(undefined);
    const unlinkMock = vi.fn().mockResolvedValue(undefined);
    const readFileMock = vi.fn().mockResolvedValue('NFO BODY');
    const fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      writeFile: writeFileMock,
      unlink: unlinkMock,
      readFile: readFileMock,
    });
    const result = await executeRename(makeArgs({
      fs,
      currentFile: makeFile({ nfoPath: '/movies/old.nfo', hasNfo: true }),
      config: makeConfig({
        createUrlFile: true,
        includeNfoInUrl: true,
        deleteNfoAfterInclude: true,
      }),
    }));
    expect(readFileMock).toHaveBeenCalledWith('/movies/old.nfo', 'utf-8');
    const urlContent = writeFileMock.mock.calls[0][1] as string;
    expect(urlContent).toContain('NFO BODY');
    expect(unlinkMock).toHaveBeenCalledWith('/movies/old.nfo');
    expect(result.entries.some((e) => e.type === 'delete' && e.content === 'NFO BODY')).toBe(true);
  });

  // --- Test 6: Mac webloc ---
  it('writes a .webloc file when platform is mac', async () => {
    const writeFileMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      writeFile: writeFileMock,
    });
    await executeRename(makeArgs({
      fs,
      platform: 'mac',
      config: makeConfig({ createUrlFile: true }),
    }));
    const [path, content] = writeFileMock.mock.calls[0];
    expect(path).toBe('/movies/New Movie (1994).webloc');
    expect(content).toContain('<plist');
  });

  // --- Test 7: DVD folder rename ---
  // DVD MovieFiles have nativePath = the DVD folder, folder = parent dir, extension = ''.
  // First rename targets the DVD folder itself; renameFolder is intentionally off here
  // because the DVD case + renameFolder has well-known surprising behavior we don't want
  // to lock in via this test.
  it('renames a DVD folder (no extension) using its parent as the working folder', async () => {
    const renameMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({ rename: renameMock });
    const result = await executeRename(makeArgs({
      fs,
      currentFile: makeFile({
        name: 'OLD DVD',
        nativePath: '/parent/OLD DVD',
        folder: '/parent',
        extension: '',
        isDvdFolder: true,
      }),
      previewFilename: 'New Movie (1994)',
      config: makeConfig({ separateDvdFormat: true }),
    }));
    expect(renameMock).toHaveBeenCalledWith('/parent/OLD DVD', '/parent/New Movie (1994)');
    expect(result.finalPath).toBe('/parent/New Movie (1994)');
    expect(result.finalFolder).toBe('/parent');
  });

  // --- Test 8: AKA selected ---
  it('passes selectedAka through to poster format interpolation', async () => {
    const downloadMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      downloadToFile: downloadMock,
    });
    await executeRename(makeArgs({
      fs,
      posterRemotePath: '/abc.jpg',
      selectedAka: 'Castaway',
      metadata: makeMetadata({ aka: ['Castaway'] }),
      config: makeConfig({
        createPoster: true,
        separatePosterFormat: true,
        formatPoster: '<aka> Poster',
      }),
    }));
    expect(downloadMock).toHaveBeenCalledTimes(1);
    const [, savePath] = downloadMock.mock.calls[0];
    expect(savePath).toBe('/movies/Castaway Poster.jpg');
  });

  // --- Test 9: poster save (default size and base name) ---
  it('saves a poster using the renamed base when separatePosterFormat is off', async () => {
    const downloadMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      downloadToFile: downloadMock,
    });
    await executeRename(makeArgs({
      fs,
      posterRemotePath: '/abc.jpg',
      config: makeConfig({ createPoster: true }),
    }));
    expect(downloadMock).toHaveBeenCalledTimes(1);
    const [posterUrl, savePath] = downloadMock.mock.calls[0];
    expect(posterUrl).toContain('/abc.jpg');
    expect(savePath).toBe('/movies/New Movie (1994).jpg');
  });

  // --- Test 10: poster with separate format ---
  it('uses formatPoster string for poster filename when separatePosterFormat is on', async () => {
    const downloadMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      downloadToFile: downloadMock,
    });
    await executeRename(makeArgs({
      fs,
      posterRemotePath: '/abc.jpg',
      config: makeConfig({
        createPoster: true,
        separatePosterFormat: true,
        formatPoster: '<title> (<year>)',
      }),
    }));
    const [, savePath] = downloadMock.mock.calls[0];
    expect(savePath).toBe('/movies/The Shawshank Redemption (1994).jpg');
  });

  // --- Test 11: DVD poster outside folder ---
  // For DVD entries, workingFolder = currentFile.folder = the parent directory.
  // With posterInDvdFolder=false the existing logic walks one segment up from there:
  // /library/movies → /library. Locking in current behavior.
  it('saves the poster one level above workingFolder when DVD with posterInDvdFolder=false', async () => {
    const downloadMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      downloadToFile: downloadMock,
    });
    await executeRename(makeArgs({
      fs,
      currentFile: makeFile({
        name: 'OLD DVD',
        nativePath: '/library/movies/OLD DVD',
        folder: '/library/movies',
        extension: '',
        isDvdFolder: true,
      }),
      previewFilename: 'New Movie (1994)',
      posterRemotePath: '/abc.jpg',
      config: makeConfig({
        createPoster: true,
        posterInDvdFolder: false,
      }),
    }));
    const [, savePath] = downloadMock.mock.calls[0];
    expect(savePath).toBe('/library/New Movie (1994).jpg');
  });

  // --- Test 12: pipeline throws on fs.rename failure ---
  it('throws when the primary rename fails and returns no entries', async () => {
    const renameMock = vi.fn().mockRejectedValue(new Error('EACCES'));
    const fs = createMockFsAdapter({ rename: renameMock });
    await expect(executeRename(makeArgs({ fs }))).rejects.toThrow(/EACCES/);
  });
});
