import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReleaseNotes } from '../../src/components/ReleaseNotes';

describe('ReleaseNotes', () => {
  it('renders release notes content', () => {
    const { getByTestId } = render(<ReleaseNotes visible={true} onClose={jest.fn()} />);
    expect(getByTestId('release-notes-content')).toBeTruthy();
  });

  it('calls onClose when close button pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<ReleaseNotes visible={true} onClose={onClose} />);
    fireEvent.press(getByTestId('release-notes-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
