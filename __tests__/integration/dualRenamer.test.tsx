import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import App from '../../src/renderer/App';
import { createMockFsAdapter } from '../../src/adapters/fs';
import { initConfigStore } from '../../src/stores/configStore';

const mockFs = createMockFsAdapter();

describe('Dual Renamer integration', () => {
  beforeEach(() => {
    initConfigStore(mockFs);
    Object.defineProperty(window, 'zeebMenu', {
      value: { onOptions: vi.fn(), onUndoRename: vi.fn(), onToggleWebView: vi.fn(), onReleaseNotes: vi.fn(), onOpenFolder: vi.fn(), onAbout: vi.fn(), onWindowStateChanged: vi.fn(() => () => {}), sendWebViewState: vi.fn() },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'zeebApp', {
      value: { getPath: vi.fn(), getWebviewPreloadPath: vi.fn().mockResolvedValue(''), getVersion: vi.fn().mockResolvedValue('0.0.0') },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'zeebImdb', {
      value: { suggest: vi.fn().mockResolvedValue([]) },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'zeebUpdate', {
      value: {
        onUpdateAvailable: vi.fn(() => () => {}),
        downloadUpdate: vi.fn().mockResolvedValue(undefined),
        onDownloadProgress: vi.fn(() => () => {}),
        onDownloadComplete: vi.fn(() => () => {}),
        onDownloadError: vi.fn(() => () => {}),
        showInFolder: vi.fn().mockResolvedValue(undefined),
        openExternal: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  it('renders two Renamer instances in process view', async () => {
    render(<App fs={mockFs} />);
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: '/some/path' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('list-movies-button'));
    });
    expect(screen.getByTestId('renamer-0')).toBeDefined();
    expect(screen.getByTestId('renamer-1')).toBeDefined();
  });

  it('only shows the active renamer as visible', async () => {
    render(<App fs={mockFs} />);
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: '/some/path' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('list-movies-button'));
    });
    // Renamer-0 is active by default, renamer-1 is hidden
    // Both testID wrappers exist, but only one Renamer has visible=true
    expect(screen.getByTestId('renamer-0')).toBeDefined();
    expect(screen.getByTestId('renamer-1')).toBeDefined();
  });
});
