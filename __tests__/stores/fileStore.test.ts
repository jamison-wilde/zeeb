import { beforeEach } from 'vitest';
import { useFileStore } from '../../src/stores/fileStore';
import type { MovieFile } from '../../src/types';

const mockFile: MovieFile = {
  id: '1', name: 'Movie.mkv', nativePath: '/movies/Movie.mkv',
  folder: '/movies', extension: 'mkv', size: 1024, isDvdFolder: false,
  hasNfo: false, hasUrl: false, hasPoster: false,
  nfoPath: null, urlPath: null, posterPath: null,
};

describe('fileStore', () => {
  beforeEach(() => {
    useFileStore.setState({ files: [] });
  });

  it('sets scanned files', () => {
    useFileStore.getState().setFiles([mockFile]);
    expect(useFileStore.getState().files).toHaveLength(1);
  });

  it('updates a file entry in place', () => {
    useFileStore.getState().setFiles([mockFile]);
    useFileStore.getState().updateFile('1', { name: 'Renamed.mkv', nativePath: '/movies/Renamed.mkv' });
    expect(useFileStore.getState().files[0].name).toBe('Renamed.mkv');
    expect(useFileStore.getState().files[0].nativePath).toBe('/movies/Renamed.mkv');
  });

  it('clears files', () => {
    useFileStore.getState().setFiles([mockFile]);
    useFileStore.getState().clear();
    expect(useFileStore.getState().files).toHaveLength(0);
  });
});
