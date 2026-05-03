// __tests__/components/options/CompanionsSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { CompanionsSection } from '../../../src/renderer/components/options/CompanionsSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';
import { PlatformProvider } from '../../../src/renderer/PlatformContext';
import { createMockPlatformAdapter } from '../../../src/adapters/platform';
import type { ZeebConfig } from '../../../src/types';

function renderSection(config: ZeebConfig, updateConfig: (p: Partial<ZeebConfig>) => void = vi.fn()) {
  return render(
    <PlatformProvider value={createMockPlatformAdapter()}>
      <CompanionsSection config={config} updateConfig={updateConfig} />
    </PlatformProvider>,
  );
}

describe('CompanionsSection', () => {
  it('renders createUrlFile checkbox', () => {
    renderSection(DEFAULT_CONFIG);
    expect(screen.getByTestId('create-url-file')).toBeDefined();
  });

  it('disables sub-options when parent is unchecked', () => {
    renderSection({ ...DEFAULT_CONFIG, createUrlFile: false });
    expect((screen.getByTestId('include-original-in-url') as HTMLInputElement).disabled).toBe(true);
  });

  it('disables deleteNfo when both dependencies are off', () => {
    renderSection({ ...DEFAULT_CONFIG, createUrlFile: true, includeNfoInUrl: false });
    expect((screen.getByTestId('delete-nfo-after-include') as HTMLInputElement).disabled).toBe(true);
  });

  it('enables deleteNfo when both dependencies are on', () => {
    renderSection({ ...DEFAULT_CONFIG, createUrlFile: true, includeNfoInUrl: true });
    expect((screen.getByTestId('delete-nfo-after-include') as HTMLInputElement).disabled).toBe(false);
  });

  it('renders posterSaveSize dropdown', () => {
    renderSection(DEFAULT_CONFIG);
    expect(screen.getByTestId('poster-save-size')).toBeDefined();
  });

  it('disables posterSaveSize when createPoster is unchecked', () => {
    renderSection({ ...DEFAULT_CONFIG, createPoster: false });
    expect((screen.getByTestId('poster-save-size') as HTMLSelectElement).disabled).toBe(true);
  });

  it('updates posterSaveSize on change', () => {
    const updateConfig = vi.fn();
    renderSection(DEFAULT_CONFIG, updateConfig);
    fireEvent.change(screen.getByTestId('poster-save-size'), { target: { value: 'w500' } });
    expect(updateConfig).toHaveBeenCalledWith({ posterSaveSize: 'w500' });
  });

  it('renders TMDB API key input', () => {
    renderSection(DEFAULT_CONFIG);
    expect(screen.getByTestId('tmdb-api-key')).toBeDefined();
  });

  it('updates tmdbApiKey on change', () => {
    const updateConfig = vi.fn();
    renderSection(DEFAULT_CONFIG, updateConfig);
    fireEvent.change(screen.getByTestId('tmdb-api-key'), { target: { value: 'my-new-key' } });
    expect(updateConfig).toHaveBeenCalledWith({ tmdbApiKey: 'my-new-key' });
  });
});
