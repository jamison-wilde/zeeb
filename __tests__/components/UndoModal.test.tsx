import React from 'react';
import { render } from '@testing-library/react-native';
import { UndoModal } from '../../src/components/UndoModal';

describe('UndoModal', () => {
  it('shows empty state when no transactions', () => {
    const { getByText } = render(<UndoModal visible={true} onClose={jest.fn()} transactions={[]} onUndo={jest.fn()} />);
    expect(getByText('No undo history')).toBeTruthy();
  });
});
