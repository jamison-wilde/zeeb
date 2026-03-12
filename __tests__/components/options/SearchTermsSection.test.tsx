// __tests__/components/options/SearchTermsSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchTermsSection } from '../../../src/renderer/components/options/SearchTermsSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';
import type { ZeebConfig } from '../../../src/types';

describe('SearchTermsSection', () => {
  it('renders remove terms as tags', () => {
    render(<SearchTermsSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByText('YIFY')).toBeDefined();
  });

  it('renders keep terms as a two-column table', () => {
    render(<SearchTermsSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByText('Match')).toBeDefined();
    expect(screen.getByText('Display')).toBeDefined();
  });

  it('filters keep terms by text input', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      keepTerms: [['720p', '720p'], ['1080p', '1080p'], ['dc', "Director's Cut"]] as Array<[string, string]>,
    };
    const updateConfig = vi.fn();
    render(<SearchTermsSection config={config as ZeebConfig} updateConfig={updateConfig} />);
    const filterInput = screen.getByPlaceholderText('Filter terms...');
    await userEvent.type(filterInput, '720');
    // Only rows containing "720" in match or display should be visible
    expect(screen.getAllByDisplayValue('720p').length).toBeGreaterThan(0);
    expect(screen.queryByDisplayValue("Director's Cut")).not.toBeInTheDocument();
  });

  it('filters keep terms by display column', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      keepTerms: [['720p', '720p'], ['dc', "Director's Cut"], ['1080p', '1080p']] as Array<[string, string]>,
    };
    render(<SearchTermsSection config={config as ZeebConfig} updateConfig={vi.fn()} />);
    const filterInput = screen.getByPlaceholderText('Filter terms...');
    await userEvent.type(filterInput, 'director');
    // Row with display "Director's Cut" should be visible (matched by display column)
    expect(screen.getByDisplayValue("Director's Cut")).toBeInTheDocument();
    expect(screen.getByDisplayValue('dc')).toBeInTheDocument();
    // Other rows should be hidden
    expect(screen.queryByDisplayValue('720p')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('1080p')).not.toBeInTheDocument();
  });
});
