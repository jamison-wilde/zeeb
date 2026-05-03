import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AboutModal } from '../../src/renderer/components/AboutModal';
import { PlatformProvider } from '../../src/renderer/PlatformContext';
import { createMockPlatformAdapter } from '../../src/adapters/platform';

function renderModal(visible = true) {
  return render(
    <PlatformProvider value={createMockPlatformAdapter()}>
      <AboutModal visible={visible} onClose={vi.fn()} version="4.0.0" />
    </PlatformProvider>,
  );
}

describe('AboutModal', () => {
  it('renders app name', () => {
    renderModal();
    expect(screen.getByText('Zeeb Movie Renamer')).toBeTruthy();
  });

  it('renders version', () => {
    renderModal();
    expect(screen.getByText(/4\.0\.0/)).toBeTruthy();
  });

  it('renders TMDB attribution', () => {
    renderModal();
    expect(screen.getByText(/not endorsed or certified by TMDB/)).toBeTruthy();
  });

  it('renders icon credit', () => {
    renderModal();
    expect(screen.getByText(/Kristof Polleunis/)).toBeTruthy();
  });

  it('returns null when not visible', () => {
    const { container } = renderModal(false);
    expect(container.innerHTML).toBe('');
  });
});
