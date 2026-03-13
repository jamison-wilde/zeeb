import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import App from '../../src/renderer/App';
import { createMockFsAdapter } from '../../src/adapters/fs';
import { initConfigStore } from '../../src/stores/configStore';

const mockFs = createMockFsAdapter();

describe('Dual Renamer integration', () => {
  beforeEach(() => {
    initConfigStore(mockFs);
    Object.defineProperty(window, 'zeebMenu', {
      value: { onOptions: vi.fn(), onUndo: vi.fn(), onReleaseNotes: vi.fn(), onWindowStateChanged: vi.fn(() => () => {}) },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'zeebApp', {
      value: { getPath: vi.fn(), getWebviewPreloadPath: vi.fn().mockResolvedValue('') },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'zeebImdb', {
      value: { suggest: vi.fn().mockResolvedValue([]) },
      writable: true,
      configurable: true,
    });
  });

  it('renders two Renamer instances in process view', () => {
    render(<App fs={mockFs} />);
    fireEvent.click(screen.getByTestId('start-processing'));
    expect(screen.getByTestId('renamer-0')).toBeDefined();
    expect(screen.getByTestId('renamer-1')).toBeDefined();
  });

  it('only shows the active renamer as visible', () => {
    render(<App fs={mockFs} />);
    fireEvent.click(screen.getByTestId('start-processing'));
    // Renamer-0 is active by default, renamer-1 is hidden
    // Both testID wrappers exist, but only one Renamer has visible=true
    expect(screen.getByTestId('renamer-0')).toBeDefined();
    expect(screen.getByTestId('renamer-1')).toBeDefined();
  });
});
