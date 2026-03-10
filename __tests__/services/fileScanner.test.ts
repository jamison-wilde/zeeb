jest.mock('react-native-fs', () => ({
  readDir: jest.fn(),
  exists: jest.fn(),
}));

import RNFS from 'react-native-fs';
import { scanDirectory } from '../../src/services/fileScanner';

const mockFiles = [
  { name: 'Movie.mkv', path: '/movies/Movie.mkv', isFile: () => true, isDirectory: () => false, size: 1000 },
  { name: 'Movie.srt', path: '/movies/Movie.srt', isFile: () => true, isDirectory: () => false, size: 100 },
  { name: 'Movie.nfo', path: '/movies/Movie.nfo', isFile: () => true, isDirectory: () => false, size: 50 },
  { name: 'subfolder', path: '/movies/subfolder', isFile: () => false, isDirectory: () => true, size: 0 },
  { name: 'random.txt', path: '/movies/random.txt', isFile: () => true, isDirectory: () => false, size: 10 },
];

describe('fileScanner', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns only movie files matching extensions', async () => {
    (RNFS.readDir as jest.Mock).mockResolvedValue(mockFiles);
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
    const files = await scanDirectory('/movies', ['mkv', 'avi'], 'none');
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('Movie.mkv');
  });

  it('detects associated NFO files', async () => {
    (RNFS.readDir as jest.Mock).mockResolvedValue(mockFiles);
    (RNFS.exists as jest.Mock).mockResolvedValue(true);
    const files = await scanDirectory('/movies', ['mkv'], 'none');
    expect(files[0].hasNfo).toBe(true);
  });

  it('detects DVD folders by VIDEO_TS.IFO presence', async () => {
    const dvdFiles = [
      { name: 'MyMovie', path: '/movies/MyMovie', isFile: () => false, isDirectory: () => true, size: 0 },
    ];
    const dvdContents = [
      { name: 'VIDEO_TS.IFO', path: '/movies/MyMovie/VIDEO_TS.IFO', isFile: () => true, isDirectory: () => false, size: 500 },
    ];
    (RNFS.readDir as jest.Mock)
      .mockResolvedValueOnce(dvdFiles)
      .mockResolvedValueOnce(dvdContents);
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
    const files = await scanDirectory('/movies', ['mkv'], 'none');
    expect(files[0].isDvdFolder).toBe(true);
  });

  it('recurses into subfolders when mode is subfolders', async () => {
    const subFiles = [
      { name: 'Sub.mkv', path: '/movies/subfolder/Sub.mkv', isFile: () => true, isDirectory: () => false, size: 2000 },
    ];
    (RNFS.readDir as jest.Mock)
      .mockResolvedValueOnce(mockFiles)
      .mockResolvedValueOnce(subFiles);
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
    const files = await scanDirectory('/movies', ['mkv'], 'subfolders');
    expect(files).toHaveLength(2);
  });
});
