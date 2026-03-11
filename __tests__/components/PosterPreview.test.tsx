import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PosterPreview } from '../../src/renderer/components/PosterPreview';

describe('PosterPreview', () => {
  it('renders poster image when URL provided', () => {
    render(<PosterPreview posterUrl="https://image.tmdb.org/t/p/w500/abc.jpg" onSelect={vi.fn()} />);
    expect(screen.getByTestId('poster-image')).toBeDefined();
  });

  it('shows placeholder when no URL', () => {
    render(<PosterPreview posterUrl={null} onSelect={vi.fn()} />);
    expect(screen.getByTestId('poster-placeholder')).toBeDefined();
  });
});
