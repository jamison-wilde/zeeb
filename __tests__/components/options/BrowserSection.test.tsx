import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { BrowserSection } from '../../../src/renderer/components/options/BrowserSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

describe('BrowserSection', () => {
  it('renders showWebView checkbox', () => {
    render(<BrowserSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('show-webview')).toBeDefined();
  });

  it('renders HTML zoom input', () => {
    render(<BrowserSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('html-zoom')).toBeDefined();
  });

  it('toggles showWebView', () => {
    const updateConfig = vi.fn();
    render(<BrowserSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
    fireEvent.click(screen.getByTestId('show-webview'));
    expect(updateConfig).toHaveBeenCalledWith({ showWebView: true });
  });

  it('clamps zoom to 50-200', () => {
    const updateConfig = vi.fn();
    render(<BrowserSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
    fireEvent.change(screen.getByTestId('html-zoom'), { target: { value: '250' } });
    expect(updateConfig).toHaveBeenCalledWith({ htmlZoom: 200 });
  });
});
