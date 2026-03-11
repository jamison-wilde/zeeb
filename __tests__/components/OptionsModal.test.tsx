import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OptionsModal } from '../../src/components/OptionsModal';

jest.mock('react-native-fs', () => ({ DocumentDirectoryPath: '/mock' }));

describe('OptionsModal', () => {
  it('renders format string inputs', () => {
    const { getByTestId } = render(<OptionsModal visible={true} onClose={jest.fn()} />);
    expect(getByTestId('format-standard-input')).toBeTruthy();
  });

  it('calls onClose when close button pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<OptionsModal visible={true} onClose={onClose} />);
    fireEvent.press(getByTestId('close-options'));
    expect(onClose).toHaveBeenCalled();
  });
});
