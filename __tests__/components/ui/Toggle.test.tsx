import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { Toggle } from '../../../src/renderer/components/ui/Toggle';

describe('Toggle', () => {
  it('reflects checked state via role=switch', () => {
    render(<Toggle checked={true} onChange={vi.fn()} label="TT" />);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('TT')).toBeDefined();
  });

  it('reports the inverted value on click', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Sample" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('exposes an accessible name via aria-label', () => {
    render(<Toggle checked={false} onChange={vi.fn()} label="▦" aria-label="Poster thumbnails" />);
    expect(screen.getByRole('switch', { name: 'Poster thumbnails' })).toBeDefined();
  });
});
