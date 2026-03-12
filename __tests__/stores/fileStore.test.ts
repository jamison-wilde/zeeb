import { createFileStore } from '../../src/stores/fileStore';
import type { MovieFile } from '../../src/types';

const mockFile: MovieFile = {
  id: '1', name: 'Movie.mkv', nativePath: '/movies/Movie.mkv',
  folder: '/movies', extension: 'mkv', size: 1024, isDvdFolder: false,
  hasNfo: false, hasUrl: false, hasPoster: false,
  nfoPath: null, urlPath: null, posterPath: null,
};

describe('fileStore', () => {
  it('sets scanned files', () => {
    const store = createFileStore();
    store.getState().setFiles([mockFile]);
    expect(store.getState().files).toHaveLength(1);
  });

  it('updates a file entry in place', () => {
    const store = createFileStore();
    store.getState().setFiles([mockFile]);
    store.getState().updateFile('1', { name: 'Renamed.mkv', nativePath: '/movies/Renamed.mkv' });
    expect(store.getState().files[0].name).toBe('Renamed.mkv');
    expect(store.getState().files[0].nativePath).toBe('/movies/Renamed.mkv');
  });

  it('clears files', () => {
    const store = createFileStore();
    store.getState().setFiles([mockFile]);
    store.getState().clear();
    expect(store.getState().files).toHaveLength(0);
  });
});
