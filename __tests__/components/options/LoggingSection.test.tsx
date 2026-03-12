// __tests__/components/options/LoggingSection.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { LoggingSection } from '../../../src/renderer/components/options/LoggingSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

describe('LoggingSection', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'zeebDialog', {
      value: { openFile: vi.fn().mockResolvedValue(null), openDirectory: vi.fn() },
      writable: true,
    });
  });

  it('renders log file path input', () => {
    render(<LoggingSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByPlaceholderText('Log file path...')).toBeDefined();
  });

  it('renders max undos input', () => {
    render(<LoggingSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('max-undos')).toBeDefined();
  });

  it('clamps max undos to 0-1000', () => {
    const updateConfig = vi.fn();
    render(<LoggingSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
    fireEvent.change(screen.getByTestId('max-undos'), { target: { value: '1500' } });
    expect(updateConfig).toHaveBeenCalledWith({ maxUndos: 1000 });
  });
});
