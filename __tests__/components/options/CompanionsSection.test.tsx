// __tests__/components/options/CompanionsSection.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { CompanionsSection } from '../../../src/renderer/components/options/CompanionsSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

describe('CompanionsSection', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'zeebDialog', {
      value: { openFile: vi.fn().mockResolvedValue(null), openDirectory: vi.fn().mockResolvedValue(null) },
      writable: true,
    });
  });

  it('renders createUrlFile checkbox', () => {
    render(<CompanionsSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('create-url-file')).toBeDefined();
  });

  it('disables sub-options when parent is unchecked', () => {
    const config = { ...DEFAULT_CONFIG, createUrlFile: false };
    render(<CompanionsSection config={config} updateConfig={vi.fn()} />);
    expect((screen.getByTestId('include-original-in-url') as HTMLInputElement).disabled).toBe(true);
  });

  it('disables deleteNfo when both dependencies are off', () => {
    const config = { ...DEFAULT_CONFIG, createUrlFile: true, includeNfoInUrl: false };
    render(<CompanionsSection config={config} updateConfig={vi.fn()} />);
    expect((screen.getByTestId('delete-nfo-after-include') as HTMLInputElement).disabled).toBe(true);
  });

  it('enables deleteNfo when both dependencies are on', () => {
    const config = { ...DEFAULT_CONFIG, createUrlFile: true, includeNfoInUrl: true };
    render(<CompanionsSection config={config} updateConfig={vi.fn()} />);
    expect((screen.getByTestId('delete-nfo-after-include') as HTMLInputElement).disabled).toBe(false);
  });

  it('renders posterSaveSize dropdown', () => {
    render(<CompanionsSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('poster-save-size')).toBeDefined();
  });

  it('disables posterSaveSize when createPoster is unchecked', () => {
    const config = { ...DEFAULT_CONFIG, createPoster: false };
    render(<CompanionsSection config={config} updateConfig={vi.fn()} />);
    expect((screen.getByTestId('poster-save-size') as HTMLSelectElement).disabled).toBe(true);
  });

  it('updates posterSaveSize on change', () => {
    const updateConfig = vi.fn();
    render(<CompanionsSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
    fireEvent.change(screen.getByTestId('poster-save-size'), { target: { value: 'w500' } });
    expect(updateConfig).toHaveBeenCalledWith({ posterSaveSize: 'w500' });
  });

  it('renders TMDB API key input', () => {
    render(<CompanionsSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('tmdb-api-key')).toBeDefined();
  });

  it('updates tmdbApiKey on change', () => {
    const updateConfig = vi.fn();
    render(<CompanionsSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
    fireEvent.change(screen.getByTestId('tmdb-api-key'), { target: { value: 'my-new-key' } });
    expect(updateConfig).toHaveBeenCalledWith({ tmdbApiKey: 'my-new-key' });
  });
});
