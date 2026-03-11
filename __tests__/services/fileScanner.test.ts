import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanDirectory } from '../../src/services/fileScanner';
import { createMockFsAdapter } from '../../src/adapters/fs';
import type { FsAdapter, DirEntry } from '../../src/adapters/fs';

const mkEntry = (name: string, path: string, isFile: boolean, size = 0): DirEntry => ({
  name, path, isFile, isDirectory: !isFile, size,
});

const mockFiles: DirEntry[] = [
  mkEntry('Movie.mkv', '/movies/Movie.mkv', true, 1000),
  mkEntry('Movie.srt', '/movies/Movie.srt', true, 100),
  mkEntry('Movie.nfo', '/movies/Movie.nfo', true, 50),
  mkEntry('subfolder', '/movies/subfolder', false),
  mkEntry('random.txt', '/movies/random.txt', true, 10),
];

describe('fileScanner', () => {
  let fs: FsAdapter;

  beforeEach(() => {
    fs = createMockFsAdapter({
      readdir: vi.fn().mockResolvedValue(mockFiles),
      exists: vi.fn().mockResolvedValue(false),
    });
  });

  it('returns only movie files matching extensions', async () => {
    const files = await scanDirectory(fs, '/movies', ['mkv', 'avi'], 'none');
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('Movie.mkv');
  });

  it('detects associated NFO files', async () => {
    (fs.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const files = await scanDirectory(fs, '/movies', ['mkv'], 'none');
    expect(files[0].hasNfo).toBe(true);
  });

  it('detects DVD folders by VIDEO_TS.IFO presence', async () => {
    const dvdFiles: DirEntry[] = [
      mkEntry('MyMovie', '/movies/MyMovie', false),
    ];
    const dvdContents: DirEntry[] = [
      mkEntry('VIDEO_TS.IFO', '/movies/MyMovie/VIDEO_TS.IFO', true, 500),
    ];
    (fs.readdir as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(dvdFiles)
      .mockResolvedValueOnce(dvdContents);
    const files = await scanDirectory(fs, '/movies', ['mkv'], 'none');
    expect(files[0].isDvdFolder).toBe(true);
  });

  it('recurses into subfolders when mode is subfolders', async () => {
    const subFiles: DirEntry[] = [
      mkEntry('Sub.mkv', '/movies/subfolder/Sub.mkv', true, 2000),
    ];
    (fs.readdir as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockFiles)
      .mockResolvedValueOnce(subFiles);
    const files = await scanDirectory(fs, '/movies', ['mkv'], 'subfolders');
    expect(files).toHaveLength(2);
  });
});
