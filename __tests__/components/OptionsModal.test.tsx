import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { OptionsModal } from '../../src/renderer/components/OptionsModal';
import { createMockFsAdapter } from '../../src/adapters/fs';
import { initConfigStore } from '../../src/stores/configStore';

const mockFs = createMockFsAdapter();

describe('OptionsModal', () => {
  beforeEach(() => {
    initConfigStore(mockFs);
  });

  it('renders format string inputs', () => {
    render(<OptionsModal visible={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('format-standard-input')).toBeDefined();
  });

  it('calls onClose when close button pressed', () => {
    const onClose = vi.fn();
    render(<OptionsModal visible={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('close-options'));
    expect(onClose).toHaveBeenCalled();
  });
});
