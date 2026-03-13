// __tests__/components/options/ImdbSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { ImdbSection } from '../../../src/renderer/components/options/ImdbSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

describe('ImdbSection', () => {
  it('renders IMDB search URL input', () => {
    render(<ImdbSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('imdb-search-url')).toBeDefined();
  });

  it('renders MPAA mapping table', () => {
    const config = { ...DEFAULT_CONFIG, mpaaMap: [['R', 'R'], ['PG-13', 'PG13']] as Array<[string, string]> };
    render(<ImdbSection config={config} updateConfig={vi.fn()} />);
    expect(screen.getByText('IMDB Rating')).toBeDefined();
    expect(screen.getByText('Output')).toBeDefined();
  });

});
