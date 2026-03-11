import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { FileList } from '../../src/renderer/components/FileList';
import type { MovieFile } from '../../src/types';

const files: MovieFile[] = [
  { id: '1', name: 'Movie1.mkv', nativePath: '/m/1.mkv', folder: '/m', extension: 'mkv', size: 1000, isDvdFolder: false, hasNfo: false, hasUrl: false, hasPoster: false, nfoPath: null, urlPath: null, posterPath: null },
  { id: '2', name: 'Movie2.mkv', nativePath: '/m/2.mkv', folder: '/m', extension: 'mkv', size: 2000, isDvdFolder: false, hasNfo: true, hasUrl: false, hasPoster: false, nfoPath: '/m/2.nfo', urlPath: null, posterPath: null },
];

describe('FileList', () => {
  it('renders all files', () => {
    render(<FileList files={files} selectedIndex={0} onSelect={vi.fn()} />);
    expect(screen.getByText('Movie1.mkv')).toBeDefined();
    expect(screen.getByText('Movie2.mkv')).toBeDefined();
  });

  it('calls onSelect when file tapped', () => {
    const onSelect = vi.fn();
    render(<FileList files={files} selectedIndex={0} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Movie2.mkv'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
