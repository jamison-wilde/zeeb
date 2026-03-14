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

  it('renders List Movies button on the same row as Browse', () => {
    render(<FolderBrowser onFolderSelected={vi.fn()} recentFolders={[]} />);
    const browse = screen.getByTestId('browse-button');
    const listMovies = screen.getByTestId('list-movies-button');
    expect(browse.parentElement).toBe(listMovies.parentElement);
  });

  it('renders tooltips on recursion mode buttons', () => {
    render(<FolderBrowser onFolderSelected={vi.fn()} recentFolders={[]} />);
    const buttons = screen.getByTestId('recursion-mode').querySelectorAll('button');
    expect(buttons[0].getAttribute('title')).toBeTruthy();
    expect(buttons[1].getAttribute('title')).toBeTruthy();
    expect(buttons[2].getAttribute('title')).toBeTruthy();
  });

  it('calls onFolderSelected when a recent folder is clicked', () => {
    const onSelect = vi.fn();
    render(<FolderBrowser onFolderSelected={onSelect} recentFolders={['/movies', '/tv']} />);
    fireEvent.click(screen.getByText('/movies'));
    expect(onSelect).toHaveBeenCalledWith('/movies', expect.any(String));
  });

  it('renders explanatory note text', () => {
    render(<FolderBrowser onFolderSelected={vi.fn()} recentFolders={[]} />);
    expect(screen.getByText(/listing movies can take/i)).toBeDefined();
  });
});
