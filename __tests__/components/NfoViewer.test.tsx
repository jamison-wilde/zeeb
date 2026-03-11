import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { NfoViewer } from '../../src/renderer/components/NfoViewer';

describe('NfoViewer', () => {
  it('renders NFO content', () => {
    render(<NfoViewer visible={true} content="╔═══╗" onClose={vi.fn()} />);
    expect(screen.getByText('╔═══╗')).toBeDefined();
  });
});
