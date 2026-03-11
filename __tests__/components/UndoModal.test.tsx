import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { UndoModal } from '../../src/renderer/components/UndoModal';

describe('UndoModal', () => {
  it('shows empty state when no transactions', () => {
    render(<UndoModal visible={true} onClose={vi.fn()} transactions={[]} onUndo={vi.fn()} />);
    expect(screen.getByText('No undo history')).toBeDefined();
  });
});
