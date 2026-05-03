import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { FolderBrowser } from '../../src/renderer/components/FolderBrowser';
import { PlatformProvider } from '../../src/renderer/PlatformContext';
import { createMockPlatformAdapter } from '../../src/adapters/platform';

function renderBrowser(props: Partial<React.ComponentProps<typeof FolderBrowser>> = {}) {
  const defaults = { onFolderSelected: vi.fn(), recentFolders: [] };
  return render(
    <PlatformProvider value={createMockPlatformAdapter()}>
      <FolderBrowser {...defaults} {...props} />
    </PlatformProvider>,
  );
}

describe('FolderBrowser', () => {
  it('renders folder path input', () => {
    renderBrowser();
    expect(screen.getByTestId('folder-path-input')).toBeDefined();
  });

  it('renders recursion mode selector', () => {
    renderBrowser();
    expect(screen.getByTestId('recursion-mode')).toBeDefined();
  });

  it('calls onFolderSelected when list movies pressed', () => {
    const onSelect = vi.fn();
    renderBrowser({ onFolderSelected: onSelect });
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: '/movies' } });
    fireEvent.click(screen.getByTestId('list-movies-button'));
    expect(onSelect).toHaveBeenCalledWith('/movies', expect.any(String));
  });

  it('renders List Movies button on the same row as Browse', () => {
    renderBrowser();
    const browse = screen.getByTestId('browse-button');
    const listMovies = screen.getByTestId('list-movies-button');
    expect(browse.parentElement).toBe(listMovies.parentElement);
  });

  it('renders tooltips on recursion mode buttons', () => {
    renderBrowser();
    const buttons = screen.getByTestId('recursion-mode').querySelectorAll('button');
    expect(buttons[0].getAttribute('title')).toBeTruthy();
    expect(buttons[1].getAttribute('title')).toBeTruthy();
    expect(buttons[2].getAttribute('title')).toBeTruthy();
  });

  it('calls onFolderSelected when a recent folder is clicked', () => {
    const onSelect = vi.fn();
    renderBrowser({ onFolderSelected: onSelect, recentFolders: ['/movies', '/tv'] });
    fireEvent.click(screen.getByText('/movies'));
    expect(onSelect).toHaveBeenCalledWith('/movies', expect.any(String));
  });

  it('renders explanatory note text', () => {
    renderBrowser();
    expect(screen.getByText(/listing movies can take/i)).toBeDefined();
  });

  it('disables List Movies button when path is empty', () => {
    renderBrowser();
    expect((screen.getByTestId('list-movies-button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables List Movies button when path is whitespace only', () => {
    renderBrowser();
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: '   ' } });
    expect((screen.getByTestId('list-movies-button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables List Movies button once a path is entered', () => {
    renderBrowser();
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: '/movies' } });
    expect((screen.getByTestId('list-movies-button') as HTMLButtonElement).disabled).toBe(false);
  });
});
