import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RenamePreview } from '../../src/components/RenamePreview';

describe('RenamePreview', () => {
  it('displays formatted filename preview', () => {
    const { getByText } = render(
      <RenamePreview originalName="Movie.mkv" previewName="New Movie (2024).mkv" onRename={jest.fn()} onSkip={jest.fn()} />
    );
    expect(getByText('New Movie (2024).mkv')).toBeTruthy();
  });

  it('calls onRename when rename button pressed', () => {
    const onRename = jest.fn();
    const { getByTestId } = render(
      <RenamePreview originalName="Movie.mkv" previewName="New.mkv" onRename={onRename} onSkip={jest.fn()} />
    );
    fireEvent.press(getByTestId('rename-button'));
    expect(onRename).toHaveBeenCalled();
  });

  it('calls onSkip when skip button pressed', () => {
    const onSkip = jest.fn();
    const { getByTestId } = render(
      <RenamePreview originalName="Movie.mkv" previewName="New.mkv" onRename={jest.fn()} onSkip={onSkip} />
    );
    fireEvent.press(getByTestId('skip-button'));
    expect(onSkip).toHaveBeenCalled();
  });
});
