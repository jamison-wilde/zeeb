import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import App from '../src/renderer/App';
import { createMockFsAdapter } from '../src/adapters/fs';
import { useConfigStore } from '../src/stores/configStore';

const mockFs = createMockFsAdapter();

let optionsCallback: (() => void) | null = null;
let undoRenameCallback: (() => void) | null = null;
let toggleWebViewCallback: (() => void) | null = null;

const mockZeebMenu = {
  onOptions: vi.fn((cb: () => void) => { optionsCallback = cb; }),
  onUndoRename: vi.fn((cb: () => void) => { undoRenameCallback = cb; }),
  onToggleWebView: vi.fn((cb: () => void) => { toggleWebViewCallback = cb; }),
  onReleaseNotes: vi.fn(),
  onOpenFolder: vi.fn(),
  onAbout: vi.fn(),
  sendWebViewState: vi.fn(),
};

describe('App', () => {
  beforeEach(() => {
    useConfigStore.getState().setFs(mockFs);
    optionsCallback = null;
    undoRenameCallback = null;
    toggleWebViewCallback = null;
    vi.clearAllMocks();
    mockZeebMenu.onOptions.mockImplementation((cb: () => void) => { optionsCallback = cb; });
    mockZeebMenu.onUndoRename.mockImplementation((cb: () => void) => { undoRenameCallback = cb; });
    mockZeebMenu.onToggleWebView.mockImplementation((cb: () => void) => { toggleWebViewCallback = cb; });
    Object.defineProperty(window, 'zeebMenu', { value: mockZeebMenu, writable: true, configurable: true });
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

  it('renders folder browser view by default', () => {
    render(<App fs={mockFs} />);
    expect(screen.getByTestId('folder-browser')).toBeDefined();
  });

  it('does not render Start Processing button', () => {
    render(<App fs={mockFs} />);
    expect(screen.queryByTestId('start-processing')).toBeNull();
  });

  it('shows options modal via menu event', () => {
    render(<App fs={mockFs} />);
    act(() => { optionsCallback?.(); });
    expect(screen.getByTestId('options-modal')).toBeDefined();
  });

  it('registers onOpenFolder handler', () => {
    render(<App fs={mockFs} />);
    expect(mockZeebMenu.onOpenFolder).toHaveBeenCalled();
  });

  it('switches to folder browser when Open Folder callback fires', () => {
    let openFolderCallback: (() => void) | null = null;
    mockZeebMenu.onOpenFolder = vi.fn((cb: () => void) => { openFolderCallback = cb; });
    render(<App fs={mockFs} />);
    act(() => { openFolderCallback?.(); });
    expect(screen.getByTestId('folder-browser')).toBeDefined();
  });

  it('opens undo modal via onUndoRename menu event', () => {
    render(<App fs={mockFs} />);
    act(() => { undoRenameCallback?.(); });
    expect(screen.getByText('Undo History')).toBeDefined();
  });

  it('does not register onUndo handler', () => {
    render(<App fs={mockFs} />);
    expect(mockZeebMenu).not.toHaveProperty('onUndo');
  });
});
