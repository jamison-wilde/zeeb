import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/renderer/App';
import { createMockFsAdapter } from '../../src/adapters/fs';
import { initConfigStore } from '../../src/stores/configStore';

const mockFs = createMockFsAdapter();

describe('App', () => {
  beforeEach(() => {
    initConfigStore(mockFs);
  });

  it('renders toolbar with Options and Undo buttons', () => {
    render(<App fs={mockFs} />);
    expect(screen.getByText('Options')).toBeDefined();
    expect(screen.getByText('Undo')).toBeDefined();
  });

  it('shows folder browser by default', () => {
    render(<App fs={mockFs} />);
    expect(screen.getByPlaceholderText('Enter folder path...')).toBeDefined();
  });
});
