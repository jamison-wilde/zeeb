import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { MovieResults } from '../../src/renderer/components/MovieResults';
import type { MovieMatch } from '../../src/types';

const matches: MovieMatch[] = [
  { tt: 'tt0111161', title: 'The Shawshank Redemption', year: 1994, aka: null, thumbnailUrl: null, stars: null },
  { tt: 'tt0068646', title: 'The Godfather', year: 1972, aka: null, thumbnailUrl: null, stars: null },
];

describe('MovieResults', () => {
  it('renders movie matches', () => {
    render(<MovieResults matches={matches} onSelect={vi.fn()} />);
    expect(screen.getByText('The Shawshank Redemption')).toBeDefined();
    expect(screen.getByText('The Godfather')).toBeDefined();
    expect(screen.getByText('(1994)')).toBeDefined();
    expect(screen.getByText('(1972)')).toBeDefined();
  });

  it('calls onSelect with tt when match tapped', () => {
    const onSelect = vi.fn();
    render(<MovieResults matches={matches} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('The Shawshank Redemption'));
    expect(onSelect).toHaveBeenCalledWith('tt0111161');
  });

  it('shows empty state when no matches', () => {
    render(<MovieResults matches={[]} onSelect={vi.fn()} />);
    expect(screen.getByText('No results')).toBeDefined();
  });
});
