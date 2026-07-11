import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { MovieResults } from '../../src/renderer/components/MovieResults';
import type { MovieMatch, SearchPart } from '../../src/types';

const matches: MovieMatch[] = [
  { tt: 'tt0111161', title: 'The Shawshank Redemption', year: 1994, aka: null, thumbnailUrl: 'https://img.example/shawshank.jpg', stars: 'Tim Robbins, Morgan Freeman' },
  { tt: 'tt0068646', title: 'The Godfather', year: 1972, aka: null, thumbnailUrl: null, stars: null },
];

const parts: SearchPart[] = [
  { id: '0', text: 'Shawshank', originalText: 'Shawshank', state: 'search', editable: true, separatorAfter: '.' },
  { id: '1', text: '1994', originalText: '1994', state: 'remove', editable: true, separatorAfter: '' },
];

describe('MovieResults', () => {
  it('renders titles, year pills, and stars', () => {
    render(<MovieResults matches={matches} onSelect={vi.fn()} searchParts={parts} showThumbnails={true} />);
    expect(screen.getByText('The Shawshank Redemption')).toBeDefined();
    expect(screen.getByText('1994')).toBeDefined();
    expect(screen.getByText('1972')).toBeDefined();
    expect(screen.getByText('Tim Robbins, Morgan Freeman')).toBeDefined();
  });

  it('fills the year pill green only when a part token matches the year', () => {
    render(<MovieResults matches={matches} onSelect={vi.fn()} searchParts={parts} showThumbnails={false} />);
    expect(screen.getByText('1994').className).toContain('bg-pill-year-bg');
    expect(screen.getByText('1972').className).not.toContain('bg-pill-year-bg');
  });

  it('renders thumbnails only when showThumbnails is on', () => {
    const { container, rerender } = render(
      <MovieResults matches={matches} onSelect={vi.fn()} searchParts={parts} showThumbnails={true} />,
    );
    expect(container.querySelectorAll('img')).toHaveLength(1); // only the match with a url
    rerender(<MovieResults matches={matches} onSelect={vi.fn()} searchParts={parts} showThumbnails={false} />);
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('calls onSelect with tt when a row is tapped', () => {
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
