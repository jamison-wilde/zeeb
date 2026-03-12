// __tests__/components/options/FormattingSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { FormattingSection } from '../../../src/renderer/components/options/FormattingSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';
import type { ZeebConfig } from '../../../src/types';

describe('FormattingSection', () => {
  it('shows only Standard and AKA inputs when all separate toggles are off', () => {
    const config = { ...DEFAULT_CONFIG, separateDvdFormat: false, separatePosterFormat: false, separateUrlFormat: false };
    render(<FormattingSection config={config as ZeebConfig} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('format-standard-input')).toBeInTheDocument();
    expect(screen.getByTestId('format-aka-input')).toBeInTheDocument();
    expect(screen.queryByTestId('format-dvd-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('format-dvd-aka-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('format-poster-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('format-url-input')).not.toBeInTheDocument();
  });

  it('shows DVD inputs when separateDvdFormat is on', () => {
    const config = { ...DEFAULT_CONFIG, separateDvdFormat: true };
    render(<FormattingSection config={config as ZeebConfig} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('format-dvd-input')).toBeInTheDocument();
    expect(screen.getByTestId('format-dvd-aka-input')).toBeInTheDocument();
  });

  it('shows poster input when separatePosterFormat is on', () => {
    const config = { ...DEFAULT_CONFIG, separatePosterFormat: true };
    render(<FormattingSection config={config as ZeebConfig} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('format-poster-input')).toBeInTheDocument();
  });

  it('shows URL input when separateUrlFormat is on', () => {
    const config = { ...DEFAULT_CONFIG, separateUrlFormat: true };
    render(<FormattingSection config={config as ZeebConfig} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('format-url-input')).toBeInTheDocument();
  });

  it('renders token reference panel', () => {
    render(<FormattingSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByText('Available Tokens')).toBeDefined();
    expect(screen.getByText('<title>')).toBeDefined();
    expect(screen.getByText('<year>')).toBeDefined();
  });

  it('updates config when format input changes', () => {
    const updateConfig = vi.fn();
    render(<FormattingSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
    fireEvent.change(screen.getByTestId('format-standard-input'), {
      target: { value: '<title> (<year>)' },
    });
    expect(updateConfig).toHaveBeenCalledWith({ formatStandard: '<title> (<year>)' });
  });

  it('inserts token at cursor when token clicked after input focused', () => {
    const updateConfig = vi.fn();
    render(<FormattingSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
    const input = screen.getByTestId('format-standard-input') as HTMLInputElement;
    fireEvent.focus(input);
    // Set cursor position to end
    input.selectionStart = input.value.length;
    input.selectionEnd = input.value.length;
    fireEvent.click(screen.getByTestId('token-title'));
    expect(updateConfig).toHaveBeenCalled();
    const call = updateConfig.mock.calls[0][0];
    expect(call.formatStandard).toContain('<title>');
  });
});
