import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/renderer/App';
import { createMockFsAdapter } from '../../src/adapters/fs';
import { initConfigStore } from '../../src/stores/configStore';

const mockFs = createMockFsAdapter();

const mockZeebMenu = {
  onOptions: vi.fn(),
  onUndoRename: vi.fn(),
  onToggleWebView: vi.fn(),
  onReleaseNotes: vi.fn(),
  onOpenFolder: vi.fn(),
  onWindowStateChanged: vi.fn(() => () => {}),
  sendWebViewState: vi.fn(),
};

describe('App', () => {
  beforeEach(() => {
    initConfigStore(mockFs);
    Object.defineProperty(window, 'zeebMenu', { value: mockZeebMenu, writable: true, configurable: true });
  });

  it('renders folder browser view by default', () => {
    render(<App fs={mockFs} />);
    expect(screen.getByTestId('folder-browser')).toBeDefined();
  });

  it('shows folder path input in folder browser', () => {
    render(<App fs={mockFs} />);
    expect(screen.getByPlaceholderText('Enter folder path...')).toBeDefined();
  });
});
