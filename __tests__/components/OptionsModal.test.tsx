import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { OptionsModal } from '../../src/renderer/components/OptionsModal';
import { createMockFsAdapter } from '../../src/adapters/fs';
import { useConfigStore } from '../../src/stores/configStore';

const mockFs = createMockFsAdapter();

describe('OptionsModal', () => {
  beforeEach(() => {
    useConfigStore.getState().setFs(mockFs);
  });

  it('renders nothing when not visible', () => {
    const { container } = render(<OptionsModal visible={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders sidebar with all section names', () => {
    render(<OptionsModal visible={true} onClose={vi.fn()} />);
    expect(screen.getByText('Formatting')).toBeDefined();
    expect(screen.getByText('General')).toBeDefined();
    expect(screen.getByText('File Types')).toBeDefined();
    expect(screen.getByText('Search Terms')).toBeDefined();
    expect(screen.getByText('Companions')).toBeDefined();
    expect(screen.getByText('Logging')).toBeDefined();
    expect(screen.getByText('IMDB')).toBeDefined();
    expect(screen.getByText('Format Tester')).toBeDefined();
  });

  it('shows Formatting section by default', () => {
    render(<OptionsModal visible={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('section-formatting')).toBeDefined();
  });

  it('switches section when sidebar item clicked', () => {
    render(<OptionsModal visible={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('General'));
    expect(screen.getByTestId('section-general')).toBeDefined();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<OptionsModal visible={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('close-options'));
    expect(onClose).toHaveBeenCalled();
  });
});
