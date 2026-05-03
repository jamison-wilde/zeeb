import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateModal } from '../../src/renderer/components/UpdateModal';
import { PlatformProvider } from '../../src/renderer/PlatformContext';
import { createMockPlatformAdapter } from '../../src/adapters/platform';

const mockData = {
  version: '4.1.0',
  releaseNotes: '### Added\n- Cool feature',
  releaseUrl: 'https://github.com/jamison-wilde/zeeb/releases/tag/v4.1.0',
  assets: [
    { name: 'Zeeb-Movie-Renamer-4.1.0-Setup.exe', url: 'https://example.com/setup.exe', size: 50000000 },
    { name: 'Zeeb-Movie-Renamer-4.1.0.dmg', url: 'https://example.com/setup.dmg', size: 60000000 },
  ],
};

function renderModal(extraOverrides: Parameters<typeof createMockPlatformAdapter>[0] = {}, props: Partial<{ onClose: () => void; onSkip: (v: string) => void }> = {}) {
  const downloadUpdate = vi.fn().mockResolvedValue(undefined);
  const showInFolder = vi.fn().mockResolvedValue(undefined);
  const openExternal = vi.fn().mockResolvedValue(undefined);
  const platform = createMockPlatformAdapter({
    update: {
      downloadUpdate,
      showInFolder,
      openExternal,
      ...(extraOverrides.update ?? {}),
    },
    ...extraOverrides,
  });
  const onClose = props.onClose ?? vi.fn();
  const onSkip = props.onSkip ?? vi.fn();
  return {
    downloadUpdate,
    showInFolder,
    openExternal,
    onClose,
    onSkip,
    ...render(
      <PlatformProvider value={platform}>
        <UpdateModal data={mockData} onClose={onClose} onSkip={onSkip} />
      </PlatformProvider>,
    ),
  };
}

describe('UpdateModal', () => {
  it('renders version in header', () => {
    renderModal();
    expect(screen.getByText(/4\.1\.0/)).toBeTruthy();
  });

  it('renders release notes as HTML', () => {
    renderModal();
    expect(screen.getByText('Cool feature')).toBeTruthy();
  });

  it('calls onSkip when skip link clicked', () => {
    const onSkip = vi.fn();
    renderModal({}, { onSkip });
    fireEvent.click(screen.getByText(/skip this version/i));
    expect(onSkip).toHaveBeenCalledWith('4.1.0');
  });

  it('calls openExternal when View on GitHub clicked', () => {
    const { openExternal } = renderModal();
    fireEvent.click(screen.getByText(/view on github/i));
    expect(openExternal).toHaveBeenCalledWith(mockData.releaseUrl);
  });

  it('calls downloadUpdate when Download clicked', () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    const { downloadUpdate } = renderModal();
    fireEvent.click(screen.getByText(/download update/i));
    expect(downloadUpdate).toHaveBeenCalledWith(mockData.assets[0].url);
  });
});
