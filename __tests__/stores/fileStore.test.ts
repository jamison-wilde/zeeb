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

  it('filters sample files when configured', () => {
    const sample = { ...mockFile, id: '2', name: 'Movie.sample.mkv' };
    const store = createFileStore();
    store.getState().setFiles([mockFile, sample]);
    const filtered = store.getState().getFilteredFiles(false);
    expect(filtered).toHaveLength(1);
  });

  it('clears files', () => {
    const store = createFileStore();
    store.getState().setFiles([mockFile]);
    store.getState().clear();
    expect(store.getState().files).toHaveLength(0);
  });
});
