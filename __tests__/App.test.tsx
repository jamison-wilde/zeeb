import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import App from '../src/renderer/App';
import { createMockFsAdapter } from '../src/adapters/fs';
import { useConfigStore } from '../src/stores/configStore';
import { PlatformProvider } from '../src/renderer/PlatformContext';
import { createMockPlatformAdapter } from '../src/adapters/platform';

const mockFs = createMockFsAdapter({ readdir: vi.fn(async () => []) });

let optionsCallback: (() => void) | null = null;
let undoRenameCallback: (() => void) | null = null;
let toggleWebViewCallback: (() => void) | null = null;
let openFolderCallback: (() => void) | null = null;

const onOptionsMock = vi.fn((cb: () => void) => { optionsCallback = cb; });
const onUndoRenameMock = vi.fn((cb: () => void) => { undoRenameCallback = cb; });
const onToggleWebViewMock = vi.fn((cb: () => void) => { toggleWebViewCallback = cb; });
const onOpenFolderMock = vi.fn((cb: () => void) => { openFolderCallback = cb; });

function makePlatform() {
  return createMockPlatformAdapter({
    menu: {
      onOptions: onOptionsMock,
      onUndoRename: onUndoRenameMock,
      onToggleWebView: onToggleWebViewMock,
      onOpenFolder: onOpenFolderMock,
    },
  });
}

function renderApp() {
  return render(
    <PlatformProvider value={makePlatform()}>
      <App fs={mockFs} />
    </PlatformProvider>,
  );
}

describe('App', () => {
  beforeEach(() => {
    useConfigStore.getState().setFs(mockFs);
    optionsCallback = null;
    undoRenameCallback = null;
    toggleWebViewCallback = null;
    openFolderCallback = null;
    vi.clearAllMocks();
    onOptionsMock.mockImplementation((cb: () => void) => { optionsCallback = cb; });
    onUndoRenameMock.mockImplementation((cb: () => void) => { undoRenameCallback = cb; });
    onToggleWebViewMock.mockImplementation((cb: () => void) => { toggleWebViewCallback = cb; });
    onOpenFolderMock.mockImplementation((cb: () => void) => { openFolderCallback = cb; });
  });

  it('shows the open folder modal at startup', () => {
    renderApp();
    expect(screen.getByTestId('open-folder-modal')).toBeDefined();
  });

  it('does not render Start Processing button', () => {
    renderApp();
    expect(screen.queryByTestId('start-processing')).toBeNull();
  });

  it('shows options modal via menu event', () => {
    renderApp();
    act(() => { optionsCallback?.(); });
    expect(screen.getByTestId('options-modal')).toBeDefined();
  });

  it('registers onOpenFolder handler', () => {
    renderApp();
    expect(onOpenFolderMock).toHaveBeenCalled();
  });

  it('reopens the modal from the Open Folder menu event without clearing state', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('close-open-folder'));
    expect(screen.queryByTestId('open-folder-modal')).toBeNull();
    act(() => { openFolderCallback?.(); });
    expect(screen.getByTestId('open-folder-modal')).toBeDefined();
  });

  it('opens undo modal via onUndoRename menu event', () => {
    renderApp();
    act(() => { undoRenameCallback?.(); });
    expect(screen.getByText('Undo History')).toBeDefined();
  });

  it('keeps the modal open and toasts when a scan fails', async () => {
    (mockFs.readdir as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('nope'));
    renderApp();
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: 'D:\\bad' } });
    fireEvent.click(screen.getByTestId('list-movies-button'));
    await screen.findByText('Folder listing failed');
    expect(screen.getByTestId('open-folder-modal')).toBeDefined();
  });
});
