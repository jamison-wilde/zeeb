import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { BrowseInput } from '../../../src/renderer/components/options/BrowseInput';
import { PlatformProvider } from '../../../src/renderer/PlatformContext';
import { createMockPlatformAdapter } from '../../../src/adapters/platform';

function renderInput(props: Partial<React.ComponentProps<typeof BrowseInput>>, overrides: Parameters<typeof createMockPlatformAdapter>[0] = {}) {
  const defaults = { value: '', onChange: vi.fn(), placeholder: 'path', mode: 'directory' as const };
  return render(
    <PlatformProvider value={createMockPlatformAdapter(overrides)}>
      <BrowseInput {...defaults} {...props} />
    </PlatformProvider>,
  );
}

describe('BrowseInput', () => {
  it('renders text input with current value', () => {
    renderInput({ value: '/some/path' });
    expect((screen.getByPlaceholderText('path') as HTMLInputElement).value).toBe('/some/path');
  });

  it('calls onChange when text input changes', () => {
    const onChange = vi.fn();
    renderInput({ onChange });
    fireEvent.change(screen.getByPlaceholderText('path'), { target: { value: '/new/path' } });
    expect(onChange).toHaveBeenCalledWith('/new/path');
  });

  it('calls openDirectory when Browse clicked in directory mode', async () => {
    const onChange = vi.fn();
    renderInput({ onChange, mode: 'directory' }, {
      dialog: { openDirectory: vi.fn().mockResolvedValue('/selected/dir') },
    });
    fireEvent.click(screen.getByText('Browse'));
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('/selected/dir');
    });
  });

  it('calls openFile when Browse clicked in file mode', async () => {
    const onChange = vi.fn();
    renderInput({ onChange, mode: 'file' }, {
      dialog: { openFile: vi.fn().mockResolvedValue('/selected/file.log') },
    });
    fireEvent.click(screen.getByText('Browse'));
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('/selected/file.log');
    });
  });
});
