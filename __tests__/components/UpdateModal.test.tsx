import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateModal } from '../../src/renderer/components/UpdateModal';

const mockData = {
  version: '4.1.0',
  releaseNotes: '### Added\n- Cool feature',
  releaseUrl: 'https://github.com/jamison-wilde/zeeb/releases/tag/v4.1.0',
  assets: [
    { name: 'Zeeb-Movie-Renamer-4.1.0-Setup.exe', url: 'https://example.com/setup.exe', size: 50000000 },
    { name: 'Zeeb-Movie-Renamer-4.1.0.dmg', url: 'https://example.com/setup.dmg', size: 60000000 },
  ],
};

beforeEach(() => {
  (window as any).zeebUpdate = {
    downloadUpdate: vi.fn().mockResolvedValue(undefined),
    onDownloadProgress: vi.fn().mockReturnValue(vi.fn()),
    onDownloadComplete: vi.fn().mockReturnValue(vi.fn()),
    onDownloadError: vi.fn().mockReturnValue(vi.fn()),
    showInFolder: vi.fn().mockResolvedValue(undefined),
    openExternal: vi.fn().mockResolvedValue(undefined),
  };
});

describe('UpdateModal', () => {
  it('renders version in header', () => {
    render(<UpdateModal data={mockData} onClose={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText(/4\.1\.0/)).toBeTruthy();
  });

  it('renders release notes as HTML', () => {
    render(<UpdateModal data={mockData} onClose={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText('Cool feature')).toBeTruthy();
  });

  it('calls onSkip when skip link clicked', () => {
    const onSkip = vi.fn();
    render(<UpdateModal data={mockData} onClose={vi.fn()} onSkip={onSkip} />);
    fireEvent.click(screen.getByText(/skip this version/i));
    expect(onSkip).toHaveBeenCalledWith('4.1.0');
  });

  it('calls openExternal when View on GitHub clicked', () => {
    render(<UpdateModal data={mockData} onClose={vi.fn()} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByText(/view on github/i));
    expect(window.zeebUpdate.openExternal).toHaveBeenCalledWith(mockData.releaseUrl);
  });

  it('calls downloadUpdate when Download clicked', () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    render(<UpdateModal data={mockData} onClose={vi.fn()} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByText(/download update/i));
    expect(window.zeebUpdate.downloadUpdate).toHaveBeenCalledWith(mockData.assets[0].url);
  });
});
