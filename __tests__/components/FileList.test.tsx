import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FileList } from '../../src/components/FileList';
import type { MovieFile } from '../../src/types';

const files: MovieFile[] = [
  { id: '1', name: 'Movie1.mkv', nativePath: '/m/1.mkv', folder: '/m', extension: 'mkv', size: 1000, isDvdFolder: false, hasNfo: false, hasUrl: false, hasPoster: false, nfoPath: null, urlPath: null, posterPath: null },
  { id: '2', name: 'Movie2.mkv', nativePath: '/m/2.mkv', folder: '/m', extension: 'mkv', size: 2000, isDvdFolder: false, hasNfo: true, hasUrl: false, hasPoster: false, nfoPath: '/m/2.nfo', urlPath: null, posterPath: null },
];

describe('FileList', () => {
  it('renders all files', () => {
    const { getByText } = render(<FileList files={files} selectedIndex={0} onSelect={jest.fn()} />);
    expect(getByText('Movie1.mkv')).toBeTruthy();
    expect(getByText('Movie2.mkv')).toBeTruthy();
  });

  it('calls onSelect when file tapped', () => {
    const onSelect = jest.fn();
    const { getByText } = render(<FileList files={files} selectedIndex={0} onSelect={onSelect} />);
    fireEvent.press(getByText('Movie2.mkv'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
