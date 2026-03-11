import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { SearchParts } from '../../src/renderer/components/SearchParts';
import type { SearchPart } from '../../src/types';

const parts: SearchPart[] = [
  { id: '0', text: 'The', state: 'search', originalText: 'The', editable: true },
  { id: '1', text: 'Matrix', state: 'search', originalText: 'Matrix', editable: true },
  { id: '2', text: 'BluRay', state: 'remove', originalText: 'BluRay', editable: true },
];

describe('SearchParts', () => {
  it('renders all parts', () => {
    render(
      <SearchParts parts={parts} onPartStateChange={vi.fn()} onPartTextChange={vi.fn()} onSearch={vi.fn()} />
    );
    expect(screen.getByText('The')).toBeDefined();
    expect(screen.getByText('Matrix')).toBeDefined();
    expect(screen.getByText('BluRay')).toBeDefined();
  });

  it('calls onSearch when search button pressed', () => {
    const onSearch = vi.fn();
    render(
      <SearchParts parts={parts} onPartStateChange={vi.fn()} onPartTextChange={vi.fn()} onSearch={onSearch} />
    );
    fireEvent.click(screen.getByTestId('search-button'));
    expect(onSearch).toHaveBeenCalled();
  });
});
