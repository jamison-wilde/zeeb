import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FolderBrowser } from '../../src/components/FolderBrowser';

describe('FolderBrowser', () => {
  it('renders folder path input', () => {
    const { getByTestId } = render(<FolderBrowser onFolderSelected={jest.fn()} recentFolders={[]} />);
    expect(getByTestId('folder-path-input')).toBeTruthy();
  });

  it('renders recursion mode selector', () => {
    const { getByTestId } = render(<FolderBrowser onFolderSelected={jest.fn()} recentFolders={[]} />);
    expect(getByTestId('recursion-mode')).toBeTruthy();
  });

  it('calls onFolderSelected when list movies pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(<FolderBrowser onFolderSelected={onSelect} recentFolders={[]} />);
    fireEvent.changeText(getByTestId('folder-path-input'), '/movies');
    fireEvent.press(getByTestId('list-movies-button'));
    expect(onSelect).toHaveBeenCalledWith('/movies', expect.any(String));
  });
});
