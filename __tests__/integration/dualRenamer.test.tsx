import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
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

describe('Dual Renamer integration', () => {
  beforeEach(() => {
    useConfigStore.getState().setFs(mockFs);
  });

  it('renders two Renamer instances in process view', async () => {
    renderApp();
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: '/some/path' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('list-movies-button'));
    });
    expect(screen.getByTestId('renamer-0')).toBeDefined();
    expect(screen.getByTestId('renamer-1')).toBeDefined();
  });

  it('only shows the active renamer as visible', async () => {
    renderApp();
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: '/some/path' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('list-movies-button'));
    });
    expect(screen.getByTestId('renamer-0')).toBeDefined();
    expect(screen.getByTestId('renamer-1')).toBeDefined();
  });
});
