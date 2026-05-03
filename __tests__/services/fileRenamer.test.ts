import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renameFile, findSubtitles, renameSubtitles } from '../../src/services/fileRenamer';
import { createMockFsAdapter } from '../../src/adapters/fs';
import type { FsAdapter } from '../../src/adapters/fs';

describe('fileRenamer', () => {
  let fs: FsAdapter;

  beforeEach(() => {
    fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      readdir: vi.fn().mockResolvedValue([]),
    });
  });

  it('renames file and returns undo entry', async () => {
    const entry = await renameFile(fs, '/movies/old.mkv', '/movies/new.mkv');
    expect(fs.rename).toHaveBeenCalledWith('/movies/old.mkv', '/movies/new.mkv');
    expect(entry.type).toBe('rename');
    expect(entry.sourcePath).toBe('/movies/old.mkv');
    expect(entry.destPath).toBe('/movies/new.mkv');
  });

  it('finds subtitle files matching movie name', async () => {
    (fs.readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'Movie.srt', path: '/movies/Movie.srt', isFile: true, isDirectory: false },
      { name: 'Movie.en.srt', path: '/movies/Movie.en.srt', isFile: true, isDirectory: false },
      { name: 'Other.srt', path: '/movies/Other.srt', isFile: true, isDirectory: false },
    ]);
    const subs = await findSubtitles(fs, '/movies', 'Movie', ['srt', 'sub']);
    expect(subs).toHaveLength(2);
  });

  it('renames subtitles to match new movie name', async () => {
    const entries = await renameSubtitles(
      fs,
      ['/movies/Movie.srt', '/movies/Movie.en.srt'],
      'Movie',
      'New Movie (2024)',
    );
    expect(entries).toHaveLength(2);
    expect(fs.rename).toHaveBeenCalledWith('/movies/Movie.srt', '/movies/New Movie (2024).srt');
    expect(fs.rename).toHaveBeenCalledWith('/movies/Movie.en.srt', '/movies/New Movie (2024).en.srt');
  });

  it('does not rename a subtitle whose name does not start with oldBase', async () => {
    const renameMock = vi.fn().mockResolvedValue(undefined);
    const fs2 = createMockFsAdapter({ rename: renameMock });

    const entries = await renameSubtitles(
      fs2,
      ['/folder/My.Movie.en.srt'],
      'Movie',
      'Film',
    );

    expect(renameMock).not.toHaveBeenCalled();
    expect(entries).toHaveLength(0);
  });

  it('replaces only the prefix when oldBase repeats elsewhere in the name', async () => {
    const renameMock = vi.fn().mockResolvedValue(undefined);
    const fs2 = createMockFsAdapter({ rename: renameMock });

    const entries = await renameSubtitles(
      fs2,
      ['/folder/Foo.Foo.en.srt'],
      'Foo',
      'Bar',
    );

    expect(renameMock).toHaveBeenCalledWith('/folder/Foo.Foo.en.srt', '/folder/Bar.Foo.en.srt');
    expect(entries).toHaveLength(1);
  });
});
