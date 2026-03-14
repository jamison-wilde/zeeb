import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import App from '../src/renderer/App';
import { createMockFsAdapter } from '../src/adapters/fs';
import { initConfigStore } from '../src/stores/configStore';

const mockFs = createMockFsAdapter();

let optionsCallback: (() => void) | null = null;
const mockZeebMenu = {
  onOptions: vi.fn((cb: () => void) => { optionsCallback = cb; }),
  onUndo: vi.fn(),
  onReleaseNotes: vi.fn(),
  onOpenFolder: vi.fn(),
  onWindowStateChanged: vi.fn(() => () => {}),
};

describe('App', () => {
  beforeEach(() => {
    initConfigStore(mockFs);
    optionsCallback = null;
    vi.clearAllMocks();
    mockZeebMenu.onOptions.mockImplementation((cb: () => void) => { optionsCallback = cb; });
    Object.defineProperty(window, 'zeebMenu', { value: mockZeebMenu, writable: true, configurable: true });
    Object.defineProperty(window, 'zeebApp', {
      value: { getPath: vi.fn(), getWebviewPreloadPath: vi.fn().mockResolvedValue('') },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'zeebImdb', {
      value: { suggest: vi.fn().mockResolvedValue([]) },
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
    mockZeebMenu.onOpenFolder = vi.fn();
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
});
