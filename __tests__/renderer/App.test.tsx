import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/renderer/App';
import { createMockFsAdapter } from '../../src/adapters/fs';
import { initConfigStore } from '../../src/stores/configStore';

const mockFs = createMockFsAdapter();

const mockZeebMenu = {
  onOptions: vi.fn(),
  onUndo: vi.fn(),
  onReleaseNotes: vi.fn(),
  onWindowStateChanged: vi.fn(() => () => {}),
};

describe('App', () => {
  beforeEach(() => {
    initConfigStore(mockFs);
    Object.defineProperty(window, 'zeebMenu', { value: mockZeebMenu, writable: true, configurable: true });
  });

  it('renders toolbar with Start Processing button', () => {
    render(<App fs={mockFs} />);
    expect(screen.getByTestId('start-processing')).toBeDefined();
  });

  it('shows folder browser by default', () => {
    render(<App fs={mockFs} />);
    expect(screen.getByPlaceholderText('Enter folder path...')).toBeDefined();
  });
});
