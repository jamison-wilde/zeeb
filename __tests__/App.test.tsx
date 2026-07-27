import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/renderer/App';
import { createMockFsAdapter, type DirEntry } from '../src/adapters/fs';
import { useConfigStore } from '../src/stores/configStore';
import { useFileStore } from '../src/stores/fileStore';
import { DEFAULT_CONFIG } from '../src/services/configDefaults';
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
// App's mount effect calls this once the async config load() settles. Tests that
// write to config after mount (e.g. via a folder scan) must wait on this signal
// first, otherwise the in-flight load() can resolve later and clobber the write.
const sendWebViewStateMock = vi.fn();

function makePlatform() {
  return createMockPlatformAdapter({
    menu: {
      onOptions: onOptionsMock,
      onUndoRename: onUndoRenameMock,
      onToggleWebView: onToggleWebViewMock,
      onOpenFolder: onOpenFolderMock,
      sendWebViewState: sendWebViewStateMock,
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

async function renderAppAfterInitialLoad() {
  const result = renderApp();
  await waitFor(() => expect(sendWebViewStateMock).toHaveBeenCalled());
  return result;
}

describe('App', () => {
  beforeEach(() => {
    useConfigStore.getState().setFs(mockFs);
    useConfigStore.setState({ config: { ...DEFAULT_CONFIG } });
    useFileStore.getState().clear();
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

  it('scans a folder successfully, records history, and reopens without losing the loaded file list', async () => {
    const readdirMock = mockFs.readdir as ReturnType<typeof vi.fn>;
    readdirMock.mockResolvedValueOnce([
      { name: 'Movie.2020.mkv', path: 'D:\\Movies\\Movie.2020.mkv', isFile: true, isDirectory: false, size: 100 },
    ]);

    await renderAppAfterInitialLoad();
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: 'D:\\Movies' } });
    fireEvent.click(screen.getByTestId('list-movies-button'));

    await waitFor(() => expect(screen.queryByTestId('open-folder-modal')).toBeNull());

    const entry = useConfigStore.getState().config.folderHistory[0];
    expect(entry).toMatchObject({ path: 'D:\\Movies', depth: 'none' });
    expect(typeof entry.fileCount).toBe('number');
    expect(typeof entry.lastScanned).toBe('number');
    expect(useFileStore.getState().files).toHaveLength(1);

    act(() => { openFolderCallback?.(); });
    expect(screen.getByTestId('open-folder-modal')).toBeDefined();
    expect(useFileStore.getState().files).toHaveLength(1);
  });

  it('does not drop a history entry when two scans overlap and resolve out of order', async () => {
    const readdirMock = mockFs.readdir as ReturnType<typeof vi.fn>;
    let resolveA!: (value: DirEntry[]) => void;
    let resolveB!: (value: DirEntry[]) => void;
    readdirMock.mockImplementationOnce(() => new Promise<DirEntry[]>((resolve) => { resolveA = resolve; }));
    readdirMock.mockImplementationOnce(() => new Promise<DirEntry[]>((resolve) => { resolveB = resolve; }));

    await renderAppAfterInitialLoad();
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: 'D:\\A' } });
    fireEvent.click(screen.getByTestId('list-movies-button'));
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: 'D:\\B' } });
    fireEvent.click(screen.getByTestId('list-movies-button'));

    // Resolve A first and let its history write fully settle before B resolves —
    // this is what the closure-captured (stale) folderHistory bug depends on.
    act(() => { resolveA([]); });
    await waitFor(() => {
      const paths = useConfigStore.getState().config.folderHistory.map((h) => h.path);
      expect(paths).toContain('D:\\A');
    });

    act(() => { resolveB([]); });
    await waitFor(() => {
      const paths = useConfigStore.getState().config.folderHistory.map((h) => h.path);
      expect(paths).toContain('D:\\B');
    });

    const paths = useConfigStore.getState().config.folderHistory.map((h) => h.path);
    expect(paths).toContain('D:\\A');
    expect(paths).toContain('D:\\B');
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
