// __tests__/components/options/FormatTesterSection.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { FormatTesterSection } from '../../../src/renderer/components/options/FormatTesterSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

describe('FormatTesterSection', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'zeebImdb', {
      value: { suggest: vi.fn().mockResolvedValue([]) },
      writable: true,
    });
  });

  it('renders tt# input in idle state', () => {
    render(<FormatTesterSection config={DEFAULT_CONFIG} />);
    expect(screen.getByPlaceholderText('Enter tt# (e.g., tt0068646)')).toBeDefined();
  });

  it('renders Test button', () => {
    render(<FormatTesterSection config={DEFAULT_CONFIG} />);
    expect(screen.getByText('Test')).toBeDefined();
  });

  it('shows error for invalid tt#', async () => {
    render(<FormatTesterSection config={DEFAULT_CONFIG} />);
    fireEvent.change(screen.getByPlaceholderText('Enter tt# (e.g., tt0068646)'), {
      target: { value: 'invalid' },
    });
    fireEvent.click(screen.getByText('Test'));
    await vi.waitFor(() => {
      expect(screen.getByText(/Could not fetch data/)).toBeDefined();
    });
  });
});
