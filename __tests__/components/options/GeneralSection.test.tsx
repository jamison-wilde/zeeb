// __tests__/components/options/GeneralSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { GeneralSection } from '../../../src/renderer/components/options/GeneralSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

describe('GeneralSection', () => {
  it('renders removeThe checkbox', () => {
    render(<GeneralSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('remove-the')).toBeDefined();
  });

  it('toggles removeThe', () => {
    const updateConfig = vi.fn();
    render(<GeneralSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
    fireEvent.click(screen.getByTestId('remove-the'));
    expect(updateConfig).toHaveBeenCalledWith({ removeThe: true });
  });

  it('renders separator inputs', () => {
    render(<GeneralSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('saved-part-separator')).toBeDefined();
    expect(screen.getByTestId('director-separator')).toBeDefined();
  });

  it('renders theWord input', () => {
    render(<GeneralSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('the-word-input')).toBeDefined();
  });
});
