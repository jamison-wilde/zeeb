// __tests__/components/options/SearchTermsSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SearchTermsSection } from '../../../src/renderer/components/options/SearchTermsSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

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
});
