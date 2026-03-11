import React from 'react';
import { render } from '@testing-library/react-native';
import { NfoViewer } from '../../src/components/NfoViewer';

describe('NfoViewer', () => {
  it('renders NFO content', () => {
    const { getByText } = render(<NfoViewer visible={true} content="╔═══╗" onClose={jest.fn()} />);
    expect(getByText('╔═══╗')).toBeTruthy();
  });
});
