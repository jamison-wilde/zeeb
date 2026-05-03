import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { ReleaseNotes } from '../../src/renderer/components/ReleaseNotes';
import { PlatformProvider } from '../../src/renderer/PlatformContext';
import { createMockPlatformAdapter } from '../../src/adapters/platform';

function renderNotes(onClose = vi.fn()) {
  const platform = createMockPlatformAdapter({
    appMeta: { getReleaseNotes: vi.fn().mockResolvedValue('### Added\n- Cool feature') },
  });
  return {
    onClose,
    ...render(
      <PlatformProvider value={platform}>
        <ReleaseNotes visible={true} onClose={onClose} />
      </PlatformProvider>,
    ),
  };
}

describe('ReleaseNotes', () => {
  it('renders release notes content', () => {
    renderNotes();
    expect(screen.getByTestId('release-notes-content')).toBeDefined();
  });

  it('calls onClose when close button pressed', () => {
    const { onClose } = renderNotes();
    fireEvent.click(screen.getByTestId('release-notes-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
