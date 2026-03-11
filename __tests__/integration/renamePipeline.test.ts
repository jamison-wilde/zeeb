jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock',
  moveFile: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(false),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(''),
  readDir: jest.fn().mockResolvedValue([]),
  appendFile: jest.fn().mockResolvedValue(undefined),
}));

import { renameFile } from '../../src/services/fileRenamer';
import { generateUrlFileContent } from '../../src/services/urlFileWriter';
import { interpolateFormat } from '../../src/services/formatEngine';
import { createUndoStore } from '../../src/stores/undoStore';
import { createLogger } from '../../src/services/logger';
import RNFS from 'react-native-fs';
import type { MovieMetadata } from '../../src/types';

describe('Full rename pipeline', () => {
  const meta: MovieMetadata = {
    tt: 'tt0111161', title: 'The Shawshank Redemption', year: 1994,
    rating: 9.3, directors: ['Frank Darabont'], genres: ['Drama'],
    actors: ['Tim Robbins', 'Morgan Freeman'], duration: 142,
    mpaa: 'R', aka: [], posterUrl: 'https://image.tmdb.org/t/p/w500/abc.jpg',
  };

  it('executes complete rename with undo, URL file, and logging', async () => {
    const undoStore = createUndoStore();
    const logger = createLogger('/mock/zeeb.log');

    const newName = interpolateFormat(
      '<title> (<year>).<imdb>(<rating100>).<saved>',
      meta,
      { saved: '720p' }
    );
    expect(newName).toBe('The Shawshank Redemption (1994).tt0111161(100).720p');

    undoStore.getState().beginTransaction();
    const entry = await renameFile('/movies/old.mkv', `/movies/${newName}.mkv`);
    undoStore.getState().addEntry(entry);

    const urlContent = generateUrlFileContent({
      url: `https://www.imdb.com/title/${meta.tt}/`,
      originalPath: '/movies/old.mkv',
      nfoContent: null,
    });
    expect(urlContent).toContain(meta.tt);

    undoStore.getState().commitTransaction();
    expect(undoStore.getState().transactions).toHaveLength(1);

    await logger.log('rename', '/movies/old.mkv', `/movies/${newName}.mkv`);
    expect(RNFS.appendFile).toHaveBeenCalled();

    await undoStore.getState().undoTransaction(undoStore.getState().transactions[0].id);
    expect(RNFS.moveFile).toHaveBeenCalledWith(`/movies/${newName}.mkv`, '/movies/old.mkv');
  });
});
