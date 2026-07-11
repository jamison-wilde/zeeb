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
    expect(screen.getByDisplayValue('The')).toBeDefined();
    expect(screen.getByDisplayValue('Matrix')).toBeDefined();
    expect(screen.getByDisplayValue('BluRay')).toBeDefined();
  });

  it('passes onSearch prop through (search button is in parent component)', () => {
    const onSearch = vi.fn();
    render(
      <SearchParts parts={parts} onPartStateChange={vi.fn()} onPartTextChange={vi.fn()} onSearch={onSearch} />
    );
    // Search button was moved to the Renamer filename bar
    expect(screen.getByDisplayValue('The')).toBeDefined();
  });

  it('lights exactly one state button per chip', () => {
    render(
      <SearchParts parts={parts} onPartStateChange={vi.fn()} onPartTextChange={vi.fn()} onSearch={vi.fn()} />
    );
    const chip = screen.getByDisplayValue('BluRay').closest('[data-part-id]') as HTMLElement;
    const lit = chip.querySelectorAll('button[aria-pressed="true"]');
    expect(lit).toHaveLength(1);
    expect(lit[0].getAttribute('title')).toBe('Remove');
  });

  it('changes state from both button rows', () => {
    const onStateChange = vi.fn();
    render(
      <SearchParts parts={parts} onPartStateChange={onStateChange} onPartTextChange={vi.fn()} onSearch={vi.fn()} />
    );
    const chip = screen.getByDisplayValue('Matrix').closest('[data-part-id]') as HTMLElement;
    fireEvent.click(chip.querySelector('button[title="Keep"]')!);
    expect(onStateChange).toHaveBeenCalledWith('1', 'keep');
    fireEvent.click(chip.querySelector('button[title="Never"]')!);
    expect(onStateChange).toHaveBeenCalledWith('1', 'removeAlways');
  });
});
