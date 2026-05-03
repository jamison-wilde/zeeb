// __tests__/components/options/LoggingSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { LoggingSection } from '../../../src/renderer/components/options/LoggingSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';
import { PlatformProvider } from '../../../src/renderer/PlatformContext';
import { createMockPlatformAdapter } from '../../../src/adapters/platform';
import type { ZeebConfig } from '../../../src/types';

function renderSection(config: ZeebConfig, updateConfig: (p: Partial<ZeebConfig>) => void = vi.fn()) {
  return render(
    <PlatformProvider value={createMockPlatformAdapter()}>
      <LoggingSection config={config} updateConfig={updateConfig} />
    </PlatformProvider>,
  );
}

describe('LoggingSection', () => {
  it('renders log file path input', () => {
    renderSection(DEFAULT_CONFIG);
    expect(screen.getByPlaceholderText('Log file path...')).toBeDefined();
  });

  it('renders max undos input', () => {
    renderSection(DEFAULT_CONFIG);
    expect(screen.getByTestId('max-undos')).toBeDefined();
  });

  it('clamps max undos to 0-1000', () => {
    const updateConfig = vi.fn();
    renderSection(DEFAULT_CONFIG, updateConfig);
    fireEvent.change(screen.getByTestId('max-undos'), { target: { value: '1500' } });
    expect(updateConfig).toHaveBeenCalledWith({ maxUndos: 1000 });
  });
});
