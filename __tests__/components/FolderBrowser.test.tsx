import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { FolderBrowser } from '../../src/renderer/components/FolderBrowser';

describe('FolderBrowser', () => {
  it('renders folder path input', () => {
    render(<FolderBrowser onFolderSelected={vi.fn()} recentFolders={[]} />);
    expect(screen.getByTestId('folder-path-input')).toBeDefined();
  });

  it('renders recursion mode selector', () => {
    render(<FolderBrowser onFolderSelected={vi.fn()} recentFolders={[]} />);
    expect(screen.getByTestId('recursion-mode')).toBeDefined();
  });

  it('calls onFolderSelected when list movies pressed', () => {
    const onSelect = vi.fn();
    render(<FolderBrowser onFolderSelected={onSelect} recentFolders={[]} />);
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: '/movies' } });
    fireEvent.click(screen.getByTestId('list-movies-button'));
    expect(onSelect).toHaveBeenCalledWith('/movies', expect.any(String));
  });
});
