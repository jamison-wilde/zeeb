import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Renamer } from '../../src/renderer/components/Renamer';
import { createMockFsAdapter } from '../../src/adapters/fs';
import { initConfigStore } from '../../src/stores/configStore';
import type { MovieFile } from '../../src/types';

const mockFs = createMockFsAdapter();

const testFile: MovieFile = {
  id: 'test1',
  name: 'The.Matrix.1999.mkv',
  nativePath: '/movies/The.Matrix.1999.mkv',
  folder: '/movies',
  extension: 'mkv',
  size: 1000,
  isDvdFolder: false,
  hasNfo: false,
  hasUrl: false,
  hasPoster: false,
  nfoPath: null,
  urlPath: null,
  posterPath: null,
};

describe('Renamer', () => {
  beforeEach(() => {
    initConfigStore(mockFs);
    Object.defineProperty(window, 'zeebApp', {
      value: { getPath: vi.fn(), getWebviewPreloadPath: vi.fn().mockResolvedValue('') },
      writable: true,
      configurable: true,
    });
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <Renamer instanceId={0} visible={false} files={[testFile]} fs={mockFs} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders file list and search parts when visible', () => {
    render(
      <Renamer instanceId={0} visible={true} files={[testFile]} fs={mockFs} />,
    );
    expect(screen.getByTestId('file-list')).toBeDefined();
  });
});
