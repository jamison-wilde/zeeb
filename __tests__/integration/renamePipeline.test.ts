import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renameFile } from '../../src/services/fileRenamer';
import { generateUrlFileContent } from '../../src/services/urlFileWriter';
import { interpolateFormat } from '../../src/services/formatEngine';
import { createUndoStore } from '../../src/stores/undoStore';
import { createLogger } from '../../src/services/logger';
import { createMockFsAdapter } from '../../src/adapters/fs';
import type { FsAdapter } from '../../src/adapters/fs';
import type { MovieMetadata } from '../../src/types';

describe('Full rename pipeline', () => {
  const meta: MovieMetadata = {
    tt: 'tt0111161', title: 'The Shawshank Redemption', year: 1994,
    rating: 9.3, directors: ['Frank Darabont'], genres: ['Drama'],
    actors: ['Tim Robbins', 'Morgan Freeman'], duration: 142,
    mpaa: 'R', aka: [], posterUrl: 'https://image.tmdb.org/t/p/w500/abc.jpg',
  };

  let fs: FsAdapter & { rename: ReturnType<typeof vi.fn>; appendFile: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const base = createMockFsAdapter();
    fs = {
      ...base,
      rename: vi.fn().mockResolvedValue(undefined),
      appendFile: vi.fn().mockResolvedValue(undefined),
    } as FsAdapter & { rename: ReturnType<typeof vi.fn>; appendFile: ReturnType<typeof vi.fn> };
  });

  it('executes complete rename with undo, URL file, and logging', async () => {
    const undoStore = createUndoStore(fs);
    const logger = createLogger(fs, '/mock/zeeb.log');

    const newName = interpolateFormat(
      '<title> (<year>).<imdb>(<rating100>).<saved>',
      meta,
      { saved: '720p' }
    );
    expect(newName).toBe('The Shawshank Redemption (1994).tt0111161(93).720p');

    undoStore.getState().beginTransaction();
    const entry = await renameFile(fs, '/movies/old.mkv', `/movies/${newName}.mkv`);
    undoStore.getState().addEntry(entry);

    const urlContent = generateUrlFileContent({
      url: `https://www.imdb.com/title/${meta.tt}/`,
      originalPath: '/movies/old.mkv',
      includeOriginal: true,
      nfoContent: null,
    });
    expect(urlContent).toContain(meta.tt);

    undoStore.getState().commitTransaction('/movies');
    expect(undoStore.getState().transactions).toHaveLength(1);

    await logger.log('rename', '/movies/old.mkv', `/movies/${newName}.mkv`);
    expect(fs.appendFile).toHaveBeenCalled();

    await undoStore.getState().undoTransaction(undoStore.getState().transactions[0].id);
    expect(fs.rename).toHaveBeenCalledWith(`/movies/${newName}.mkv`, '/movies/old.mkv');
  });

  it('creates URL file when createUrlFile is true', async () => {
    const undoStore = createUndoStore(fs);

    undoStore.getState().beginTransaction();
    const entry = await renameFile(fs, '/movies/old.mkv', '/movies/new.mkv');
    undoStore.getState().addEntry(entry);

    const urlContent = generateUrlFileContent({
      url: 'https://www.imdb.com/title/tt0111161/',
      originalPath: '/movies/old.mkv',
      nfoContent: null,
      includeOriginal: true,
    });
    expect(urlContent).toContain('[InternetShortcut]');
    expect(urlContent).toContain('[OriginalFilename]');
    expect(urlContent).toContain('NAME=/movies/old.mkv');

    undoStore.getState().commitTransaction('/movies');
    expect(undoStore.getState().transactions).toHaveLength(1);
  });

  it('respects maxUndos limit in commitTransaction', () => {
    const undoStore = createUndoStore(fs);
    for (let i = 0; i < 5; i++) {
      undoStore.getState().beginTransaction();
      undoStore.getState().addEntry({ type: 'rename', sourcePath: `/old${i}.mkv`, destPath: `/new${i}.mkv` });
      undoStore.getState().commitTransaction('/movies', 2);
    }
    expect(undoStore.getState().transactions).toHaveLength(2);
  });
});
