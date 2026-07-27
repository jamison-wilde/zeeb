import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { OpenFolderModal } from '../../src/renderer/components/OpenFolderModal';
import { PlatformProvider } from '../../src/renderer/PlatformContext';
import { createMockPlatformAdapter } from '../../src/adapters/platform';
import type { FolderHistoryEntry } from '../../src/types';

const history: FolderHistoryEntry[] = [
  { path: 'D:\\New Downloads', depth: 'subfolders', fileCount: 14, lastScanned: Date.now() - 120_000 },
  { path: '\\\\nas\\media', depth: 'full', fileCount: null, lastScanned: null },
];

function renderModal(props: Partial<React.ComponentProps<typeof OpenFolderModal>> = {}) {
  const defaults = {
    visible: true,
    history,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    onRemove: vi.fn(),
  };
  return render(
    <PlatformProvider value={createMockPlatformAdapter()}>
      <OpenFolderModal {...defaults} {...props} />
    </PlatformProvider>,
  );
}

describe('OpenFolderModal', () => {
  it('renders nothing when not visible', () => {
    renderModal({ visible: false });
    expect(screen.queryByTestId('open-folder-modal')).toBeNull();
  });

  it('prefills the top history entry path and depth', () => {
    renderModal();
    expect((screen.getByTestId('folder-path-input') as HTMLInputElement).value).toBe('D:\\New Downloads');
    const segments = screen.getByTestId('recursion-mode').querySelectorAll('button');
    expect(segments[1].getAttribute('aria-pressed')).toBe('true'); // Sub
  });

  it('resets depth to none for a fresh typed path', () => {
    renderModal();
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: 'D:\\Somewhere Else' } });
    const segments = screen.getByTestId('recursion-mode').querySelectorAll('button');
    expect(segments[0].getAttribute('aria-pressed')).toBe('true'); // None
  });

  it('adopts the saved depth when the typed path matches history case-insensitively', () => {
    renderModal();
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: '\\\\NAS\\media' } });
    const segments = screen.getByTestId('recursion-mode').querySelectorAll('button');
    expect(segments[2].getAttribute('aria-pressed')).toBe('true'); // Full
  });

  it('selects with the staged path and depth from List Movies and Enter', () => {
    const onSelect = vi.fn();
    renderModal({ onSelect });
    fireEvent.click(screen.getByTestId('list-movies-button'));
    expect(onSelect).toHaveBeenCalledWith('D:\\New Downloads', 'subfolders');
    fireEvent.keyDown(screen.getByTestId('folder-path-input'), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('disables List Movies when the path is blank', () => {
    renderModal({ history: [] });
    expect((screen.getByTestId('list-movies-button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables List Movies when the path is only whitespace', () => {
    renderModal({ history: [] });
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: '   ' } });
    expect((screen.getByTestId('list-movies-button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('prefills once history loads after the modal is already visible', () => {
    const { rerender } = renderModal({ history: [] });
    expect((screen.getByTestId('folder-path-input') as HTMLInputElement).value).toBe('');

    rerender(
      <PlatformProvider value={createMockPlatformAdapter()}>
        <OpenFolderModal visible history={history} onClose={vi.fn()} onSelect={vi.fn()} onRemove={vi.fn()} />
      </PlatformProvider>,
    );

    expect((screen.getByTestId('folder-path-input') as HTMLInputElement).value).toBe('D:\\New Downloads');
    const segments = screen.getByTestId('recursion-mode').querySelectorAll('button');
    expect(segments[1].getAttribute('aria-pressed')).toBe('true'); // Sub
  });

  it('does not clobber a typed path when history changes while the modal stays open', () => {
    const { rerender } = renderModal({ history: [] });
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: 'D:\\Typed By User' } });

    rerender(
      <PlatformProvider value={createMockPlatformAdapter()}>
        <OpenFolderModal visible history={history} onClose={vi.fn()} onSelect={vi.fn()} onRemove={vi.fn()} />
      </PlatformProvider>,
    );

    expect((screen.getByTestId('folder-path-input') as HTMLInputElement).value).toBe('D:\\Typed By User');
  });

  it('one-touch scans a row with its saved depth', () => {
    const onSelect = vi.fn();
    renderModal({ onSelect });
    fireEvent.click(screen.getByTestId('history-scan-1'));
    expect(onSelect).toHaveBeenCalledWith('\\\\nas\\media', 'full');
  });

  it('stages a row on path click without selecting', () => {
    const onSelect = vi.fn();
    renderModal({ onSelect });
    fireEvent.click(screen.getByText('\\\\nas\\media'));
    expect(onSelect).not.toHaveBeenCalled();
    expect((screen.getByTestId('folder-path-input') as HTMLInputElement).value).toBe('\\\\nas\\media');
    const segments = screen.getByTestId('recursion-mode').querySelectorAll('button');
    expect(segments[2].getAttribute('aria-pressed')).toBe('true');
  });

  it('shows scan metadata only when present, plus a depth badge', () => {
    renderModal();
    expect(screen.getByText(/14 files · scanned/)).toBeDefined();
    expect(screen.getByTestId('history-row-1').textContent).not.toContain('files');
    expect(screen.getByTestId('history-row-0').textContent).toContain('Sub');
    expect(screen.getByTestId('history-row-1').textContent).toContain('Full');
  });

  it('removes a row via its close control', () => {
    const onRemove = vi.fn();
    renderModal({ onRemove });
    fireEvent.click(screen.getByTestId('history-remove-0'));
    expect(onRemove).toHaveBeenCalledWith('D:\\New Downloads');
  });

  it('closes on the header control and on Escape', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByTestId('close-open-folder'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders the slow-scan note and recursion tooltips', () => {
    renderModal();
    expect(screen.getByText(/listing movies can take/i)).toBeDefined();
    const segments = screen.getByTestId('recursion-mode').querySelectorAll('button');
    segments.forEach((b) => expect(b.getAttribute('title')).toBeTruthy());
  });
});
