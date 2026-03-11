import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import App from '../src/renderer/App';
import { createMockFsAdapter } from '../src/adapters/fs';
import { initConfigStore } from '../src/stores/configStore';

const mockFs = createMockFsAdapter();

describe('App', () => {
  beforeEach(() => {
    initConfigStore(mockFs);
  });

  it('renders folder browser view by default', () => {
    render(<App fs={mockFs} />);
    expect(screen.getByTestId('folder-browser')).toBeDefined();
  });

  it('switches to process view', () => {
    render(<App fs={mockFs} />);
    fireEvent.click(screen.getByTestId('start-processing'));
    expect(screen.queryByTestId('folder-browser')).toBeNull();
    expect(screen.getByTestId('renamer-view')).toBeDefined();
  });

  it('shows options modal', () => {
    render(<App fs={mockFs} />);
    fireEvent.click(screen.getByTestId('options-button'));
    expect(screen.getByTestId('options-modal')).toBeDefined();
  });
});
