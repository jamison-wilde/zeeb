import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { ReleaseNotes } from '../../src/renderer/components/ReleaseNotes';

beforeEach(() => {
  (window as any).zeebApp = {
    ...((window as any).zeebApp || {}),
    getReleaseNotes: vi.fn().mockResolvedValue('### Added\n- Cool feature'),
  };
});

describe('ReleaseNotes', () => {
  it('renders release notes content', () => {
    render(<ReleaseNotes visible={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('release-notes-content')).toBeDefined();
  });

  it('calls onClose when close button pressed', () => {
    const onClose = vi.fn();
    render(<ReleaseNotes visible={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('release-notes-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
