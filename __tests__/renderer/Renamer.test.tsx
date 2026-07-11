import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Renamer } from '../../src/renderer/components/Renamer';
import { createMockFsAdapter } from '../../src/adapters/fs';
import { useConfigStore } from '../../src/stores/configStore';
import type { MovieFile } from '../../src/types';
import { PlatformProvider } from '../../src/renderer/PlatformContext';
import { createMockPlatformAdapter } from '../../src/adapters/platform';

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

function renderRenamer(files: MovieFile[]) {
  return render(
    <PlatformProvider value={createMockPlatformAdapter()}>
      <Renamer instanceId={0} fileIndex={0} files={files} fs={mockFs} />
    </PlatformProvider>,
  );
}

describe('Renamer', () => {
  beforeEach(() => {
    useConfigStore.getState().setFs(mockFs);
  });

  it('always renders content (visibility controlled by parent CSS)', () => {
    const { container } = renderRenamer([testFile]);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders file list and search parts when visible', () => {
    renderRenamer([testFile]);
    expect(screen.getByTestId('file-list')).toBeDefined();
  });

  it('shows NFO button when file has nfoPath', () => {
    const fileWithNfo = { ...testFile, nfoPath: '/movies/The.Matrix.1999.nfo', hasNfo: true };
    renderRenamer([fileWithNfo]);
    expect(screen.getByTestId('nfo-button')).toBeDefined();
  });

  it('hides NFO button when file has no nfoPath', () => {
    renderRenamer([testFile]);
    expect(screen.queryByTestId('nfo-button')).toBeNull();
  });

  it('shows filter toggles ON while matching files are hidden', () => {
    render(
      <PlatformProvider value={createMockPlatformAdapter()}>
        <Renamer
          instanceId={0}
          fileIndex={0}
          files={[testFile]}
          fs={mockFs}
          showTt={false}
          showSample={false}
        />
      </PlatformProvider>,
    );
    expect(screen.getByTestId('tt-toggle').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('sample-toggle').getAttribute('aria-checked')).toBe('true');
  });

  it('disabling a filter toggle reports the files as visible again', () => {
    const onShowTtChange = vi.fn();
    render(
      <PlatformProvider value={createMockPlatformAdapter()}>
        <Renamer
          instanceId={0}
          fileIndex={0}
          files={[testFile]}
          fs={mockFs}
          showTt={false}
          onShowTtChange={onShowTtChange}
        />
      </PlatformProvider>,
    );
    fireEvent.click(screen.getByTestId('tt-toggle'));
    expect(onShowTtChange).toHaveBeenCalledWith(true);
  });
});
