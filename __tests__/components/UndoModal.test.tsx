import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UndoModal } from '../../src/renderer/components/UndoModal';
import { useUndoStore } from '../../src/stores/undoStore';
import { createMockFsAdapter } from '../../src/adapters/fs';
import type { FsAdapter } from '../../src/adapters/fs';

describe('UndoModal', () => {
  let fs: FsAdapter;

  beforeEach(() => {
    fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
    });
    useUndoStore.setState({ transactions: [], pendingTransaction: null });
    useUndoStore.getState().setFs(fs);
  });

  function seedTransaction(entries?: Array<{ type: 'rename' | 'create' | 'delete'; sourcePath: string; destPath: string | null }>) {
    if (entries) {
      useUndoStore.getState().beginTransaction();
      for (const e of entries) {
        useUndoStore.getState().addEntry(e);
      }
      useUndoStore.getState().commitTransaction('/movies');
    }
  }

  it('shows empty state when no transactions', () => {
    render(<UndoModal visible={true} onClose={vi.fn()} onRescan={vi.fn()} />);
    expect(screen.getByText('No undo history')).toBeDefined();
  });

  it('shows movie names in collapsed row', () => {
    seedTransaction([
      { type: 'rename', sourcePath: '/movies/Old.Movie.mkv', destPath: '/movies/New Movie (2024).mkv' },
      { type: 'rename', sourcePath: '/movies/Old.Movie.srt', destPath: '/movies/New Movie (2024).srt' },
    ]);
    render(<UndoModal visible={true} onClose={vi.fn()} onRescan={vi.fn()} />);
    expect(screen.getByText(/New Movie \(2024\)/)).toBeDefined();
    expect(screen.getByText(/2 files/)).toBeDefined();
  });

  it('expands to show entry details', () => {
    seedTransaction([
      { type: 'rename', sourcePath: '/movies/Old.mkv', destPath: '/movies/New.mkv' },
    ]);
    render(<UndoModal visible={true} onClose={vi.fn()} onRescan={vi.fn()} />);
    fireEvent.click(screen.getByTestId('expand-toggle-0'));
    expect(screen.getByText(/Old\.mkv/)).toBeDefined();
    expect(screen.getByText(/New\.mkv/)).toBeDefined();
  });

  it('shows relative paths based on basePath', () => {
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/movies/sub/Old.mkv', destPath: '/movies/sub/New.mkv' });
    useUndoStore.getState().commitTransaction('/movies');
    render(<UndoModal visible={true} onClose={vi.fn()} onRescan={vi.fn()} />);
    fireEvent.click(screen.getByTestId('expand-toggle-0'));
    expect(screen.getByText(/sub\/Old\.mkv/)).toBeDefined();
    expect(screen.getByText(/sub\/New\.mkv/)).toBeDefined();
  });

  it('shows per-file success results after undo', async () => {
    seedTransaction([
      { type: 'rename', sourcePath: '/movies/Old.mkv', destPath: '/movies/New.mkv' },
    ]);
    render(<UndoModal visible={true} onClose={vi.fn()} onRescan={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('undo-button-0'));
    });
    expect(screen.getByText(/✓/)).toBeDefined();
  });

  it('shows per-file failure results after partial undo', async () => {
    (fs.rename as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('ENOENT'));
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/movies/A.mkv', destPath: '/movies/B.mkv' });
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/movies/C.mkv', destPath: '/movies/D.mkv' });
    useUndoStore.getState().commitTransaction('/movies');
    render(<UndoModal visible={true} onClose={vi.fn()} onRescan={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('undo-button-0'));
    });
    expect(screen.getByText(/✗/)).toBeDefined();
    expect(screen.getByText(/✓/)).toBeDefined();
  });

  it('calls onRescan on close when undos were performed', async () => {
    const onRescan = vi.fn();
    seedTransaction([
      { type: 'rename', sourcePath: '/movies/Old.mkv', destPath: '/movies/New.mkv' },
    ]);
    render(<UndoModal visible={true} onClose={vi.fn()} onRescan={onRescan} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('undo-button-0'));
    });
    fireEvent.click(screen.getByTestId('close-undo'));
    expect(onRescan).toHaveBeenCalled();
  });

  it('does not call onRescan on close when no undos performed', () => {
    const onRescan = vi.fn();
    seedTransaction([
      { type: 'rename', sourcePath: '/movies/Old.mkv', destPath: '/movies/New.mkv' },
    ]);
    render(<UndoModal visible={true} onClose={vi.fn()} onRescan={onRescan} />);
    fireEvent.click(screen.getByTestId('close-undo'));
    expect(onRescan).not.toHaveBeenCalled();
  });
});
