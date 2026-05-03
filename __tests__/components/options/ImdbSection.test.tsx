// __tests__/components/options/ImdbSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ImdbSection } from '../../../src/renderer/components/options/ImdbSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';
import { PlatformProvider } from '../../../src/renderer/PlatformContext';
import { createMockPlatformAdapter } from '../../../src/adapters/platform';
import type { ZeebConfig } from '../../../src/types';

function renderSection(config: ZeebConfig) {
  return render(
    <PlatformProvider value={createMockPlatformAdapter()}>
      <ImdbSection config={config} updateConfig={vi.fn()} />
    </PlatformProvider>,
  );
}

describe('ImdbSection', () => {
  it('renders IMDB search URL input', () => {
    renderSection(DEFAULT_CONFIG);
    expect(screen.getByTestId('imdb-search-url')).toBeDefined();
  });

  it('renders MPAA mapping table', () => {
    const config: ZeebConfig = { ...DEFAULT_CONFIG, mpaaMap: [['R', 'R'], ['PG-13', 'PG13']] };
    renderSection(config);
    expect(screen.getByText('IMDB Rating')).toBeDefined();
    expect(screen.getByText('Output')).toBeDefined();
  });
});
