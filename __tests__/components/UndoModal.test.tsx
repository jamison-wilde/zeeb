import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { UndoModal } from '../../src/renderer/components/UndoModal';
import { createUndoStore } from '../../src/stores/undoStore';
import { createMockFsAdapter } from '../../src/adapters/fs';

describe('UndoModal', () => {
  it('shows empty state when no transactions', () => {
    const fs = createMockFsAdapter();
    const store = createUndoStore(fs);
    render(<UndoModal visible={true} onClose={vi.fn()} undoStore={store} onRescan={vi.fn()} />);
    expect(screen.getByText('No undo history')).toBeDefined();
  });
});
