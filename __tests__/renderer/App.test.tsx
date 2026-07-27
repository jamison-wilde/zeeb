import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../../src/renderer/App';
import { createMockFsAdapter } from '../../src/adapters/fs';
import { useConfigStore } from '../../src/stores/configStore';
import { PlatformProvider } from '../../src/renderer/PlatformContext';
import { createMockPlatformAdapter } from '../../src/adapters/platform';

const mockFs = createMockFsAdapter();

function renderApp() {
  return render(
    <PlatformProvider value={createMockPlatformAdapter()}>
      <App fs={mockFs} />
    </PlatformProvider>,
  );
}

describe('App', () => {
  beforeEach(() => {
    useConfigStore.getState().setFs(mockFs);
  });

  it('shows the open folder modal at startup', () => {
    renderApp();
    expect(screen.getByTestId('open-folder-modal')).toBeDefined();
  });

  it('shows the folder path input in the modal', () => {
    renderApp();
    expect(screen.getByPlaceholderText('Enter folder path...')).toBeDefined();
  });
});
