import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MovieResults } from '../../src/components/MovieResults';
import type { MovieMatch } from '../../src/types';

const matches: MovieMatch[] = [
  { tt: 'tt0111161', title: 'The Shawshank Redemption', year: 1994, aka: null, thumbnailUrl: null },
  { tt: 'tt0068646', title: 'The Godfather', year: 1972, aka: null, thumbnailUrl: null },
];

describe('MovieResults', () => {
  it('renders movie matches', () => {
    const { getByText } = render(<MovieResults matches={matches} onSelect={jest.fn()} />);
    expect(getByText('The Shawshank Redemption (1994)')).toBeTruthy();
    expect(getByText('The Godfather (1972)')).toBeTruthy();
  });

  it('calls onSelect with tt when match tapped', () => {
    const onSelect = jest.fn();
    const { getByText } = render(<MovieResults matches={matches} onSelect={onSelect} />);
    fireEvent.press(getByText('The Shawshank Redemption (1994)'));
    expect(onSelect).toHaveBeenCalledWith('tt0111161');
  });

  it('shows empty state when no matches', () => {
    const { getByText } = render(<MovieResults matches={[]} onSelect={jest.fn()} />);
    expect(getByText('No results')).toBeTruthy();
  });
});
