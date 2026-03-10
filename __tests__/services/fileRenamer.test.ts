jest.mock('react-native-fs', () => ({
  moveFile: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(false),
  readDir: jest.fn().mockResolvedValue([]),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

import RNFS from 'react-native-fs';
import { renameFile, findSubtitles, renameSubtitles } from '../../src/services/fileRenamer';

describe('fileRenamer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renames file and returns undo entry', async () => {
    const entry = await renameFile('/movies/old.mkv', '/movies/new.mkv');
    expect(RNFS.moveFile).toHaveBeenCalledWith('/movies/old.mkv', '/movies/new.mkv');
    expect(entry.type).toBe('rename');
    expect(entry.sourcePath).toBe('/movies/old.mkv');
    expect(entry.destPath).toBe('/movies/new.mkv');
  });

  it('finds subtitle files matching movie name', async () => {
    (RNFS.readDir as jest.Mock).mockResolvedValue([
      { name: 'Movie.srt', path: '/movies/Movie.srt', isFile: () => true },
      { name: 'Movie.en.srt', path: '/movies/Movie.en.srt', isFile: () => true },
      { name: 'Other.srt', path: '/movies/Other.srt', isFile: () => true },
    ]);
    const subs = await findSubtitles('/movies', 'Movie', ['srt', 'sub']);
    expect(subs).toHaveLength(2);
  });

  it('renames subtitles to match new movie name', async () => {
    const entries = await renameSubtitles(
      ['/movies/Movie.srt', '/movies/Movie.en.srt'],
      'Movie',
      'New Movie (2024)'
    );
    expect(entries).toHaveLength(2);
    expect(RNFS.moveFile).toHaveBeenCalledWith('/movies/Movie.srt', '/movies/New Movie (2024).srt');
    expect(RNFS.moveFile).toHaveBeenCalledWith('/movies/Movie.en.srt', '/movies/New Movie (2024).en.srt');
  });
});
