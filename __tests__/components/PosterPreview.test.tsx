import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PosterPreview } from '../../src/components/PosterPreview';

describe('PosterPreview', () => {
  it('renders poster image when URL provided', () => {
    const { getByTestId } = render(<PosterPreview posterUrl="https://image.tmdb.org/t/p/w500/abc.jpg" onSelect={jest.fn()} />);
    expect(getByTestId('poster-image')).toBeTruthy();
  });

  it('shows placeholder when no URL', () => {
    const { getByTestId } = render(<PosterPreview posterUrl={null} onSelect={jest.fn()} />);
    expect(getByTestId('poster-placeholder')).toBeTruthy();
  });
});
