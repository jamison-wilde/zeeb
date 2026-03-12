import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { BrowseInput } from '../../../src/renderer/components/options/BrowseInput';

describe('BrowseInput', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'zeebDialog', {
      value: {
        openDirectory: vi.fn().mockResolvedValue('/selected/dir'),
        openFile: vi.fn().mockResolvedValue('/selected/file.log'),
      },
      writable: true,
    });
  });

  it('renders text input with current value', () => {
    render(<BrowseInput value="/some/path" onChange={vi.fn()} placeholder="path" mode="directory" />);
    expect((screen.getByPlaceholderText('path') as HTMLInputElement).value).toBe('/some/path');
  });

  it('calls onChange when text input changes', () => {
    const onChange = vi.fn();
    render(<BrowseInput value="" onChange={onChange} placeholder="path" mode="directory" />);
    fireEvent.change(screen.getByPlaceholderText('path'), { target: { value: '/new/path' } });
    expect(onChange).toHaveBeenCalledWith('/new/path');
  });

  it('calls openDirectory when Browse clicked in directory mode', async () => {
    const onChange = vi.fn();
    render(<BrowseInput value="" onChange={onChange} placeholder="path" mode="directory" />);
    fireEvent.click(screen.getByText('Browse'));
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('/selected/dir');
    });
  });

  it('calls openFile when Browse clicked in file mode', async () => {
    const onChange = vi.fn();
    render(<BrowseInput value="" onChange={onChange} placeholder="path" mode="file" />);
    fireEvent.click(screen.getByText('Browse'));
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('/selected/file.log');
    });
  });
});
