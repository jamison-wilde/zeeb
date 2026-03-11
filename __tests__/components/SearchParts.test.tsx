import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchParts } from '../../src/components/SearchParts';
import type { SearchPart } from '../../src/types';

const parts: SearchPart[] = [
  { id: '0', text: 'The', state: 'search', originalText: 'The', editable: true },
  { id: '1', text: 'Matrix', state: 'search', originalText: 'Matrix', editable: true },
  { id: '2', text: 'BluRay', state: 'remove', originalText: 'BluRay', editable: true },
];

describe('SearchParts', () => {
  it('renders all parts', () => {
    const { getByText } = render(
      <SearchParts parts={parts} onPartStateChange={jest.fn()} onPartTextChange={jest.fn()} onSearch={jest.fn()} />
    );
    expect(getByText('The')).toBeTruthy();
    expect(getByText('Matrix')).toBeTruthy();
    expect(getByText('BluRay')).toBeTruthy();
  });

  it('calls onSearch when search button pressed', () => {
    const onSearch = jest.fn();
    const { getByTestId } = render(
      <SearchParts parts={parts} onPartStateChange={jest.fn()} onPartTextChange={jest.fn()} onSearch={onSearch} />
    );
    fireEvent.press(getByTestId('search-button'));
    expect(onSearch).toHaveBeenCalled();
  });
});
