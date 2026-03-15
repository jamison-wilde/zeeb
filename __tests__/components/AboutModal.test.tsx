import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AboutModal } from '../../src/renderer/components/AboutModal';

beforeEach(() => {
  (window as any).zeebUpdate = {
    ...(window as any).zeebUpdate,
    openExternal: vi.fn().mockResolvedValue(undefined),
  };
});

describe('AboutModal', () => {
  it('renders app name', () => {
    render(<AboutModal visible={true} onClose={vi.fn()} version="4.0.0" />);
    expect(screen.getByText('Zeeb Movie Renamer')).toBeTruthy();
  });

  it('renders version', () => {
    render(<AboutModal visible={true} onClose={vi.fn()} version="4.0.0" />);
    expect(screen.getByText(/4\.0\.0/)).toBeTruthy();
  });

  it('renders TMDB attribution', () => {
    render(<AboutModal visible={true} onClose={vi.fn()} version="4.0.0" />);
    expect(screen.getByText(/not endorsed or certified by TMDB/)).toBeTruthy();
  });

  it('renders icon credit', () => {
    render(<AboutModal visible={true} onClose={vi.fn()} version="4.0.0" />);
    expect(screen.getByText(/Kristof Polleunis/)).toBeTruthy();
  });

  it('returns null when not visible', () => {
    const { container } = render(<AboutModal visible={false} onClose={vi.fn()} version="4.0.0" />);
    expect(container.innerHTML).toBe('');
  });
});
