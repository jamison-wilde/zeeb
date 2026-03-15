import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/renderer/App';
import { createMockFsAdapter } from '../../src/adapters/fs';
import { initConfigStore } from '../../src/stores/configStore';

const mockFs = createMockFsAdapter();

const mockZeebMenu = {
  onOptions: vi.fn(),
  onUndoRename: vi.fn(),
  onToggleWebView: vi.fn(),
  onReleaseNotes: vi.fn(),
  onOpenFolder: vi.fn(),
  onAbout: vi.fn(),
  onWindowStateChanged: vi.fn(() => () => {}),
  sendWebViewState: vi.fn(),
};

describe('App', () => {
  beforeEach(() => {
    initConfigStore(mockFs);
    Object.defineProperty(window, 'zeebMenu', { value: mockZeebMenu, writable: true, configurable: true });
    Object.defineProperty(window, 'zeebApp', {
      value: { getPath: vi.fn(), getWebviewPreloadPath: vi.fn().mockResolvedValue(''), getVersion: vi.fn().mockResolvedValue('0.0.0') },
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

  it('renders folder browser view by default', () => {
    render(<App fs={mockFs} />);
    expect(screen.getByTestId('folder-browser')).toBeDefined();
  });

  it('shows folder path input in folder browser', () => {
    render(<App fs={mockFs} />);
    expect(screen.getByPlaceholderText('Enter folder path...')).toBeDefined();
  });
});
