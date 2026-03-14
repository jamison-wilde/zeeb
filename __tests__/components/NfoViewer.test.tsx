import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NfoViewer } from '../../src/renderer/components/NfoViewer';

describe('NfoViewer', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <NfoViewer visible={false} content="test" onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders NFO content', () => {
    render(<NfoViewer visible={true} content="╔═══╗" onClose={vi.fn()} />);
    expect(screen.getByText('╔═══╗')).toBeDefined();
  });

  it('detects URLs and renders them as links', () => {
    const content = 'Visit https://example.com for info';
    render(<NfoViewer visible={true} content={content} onClose={vi.fn()} />);
    expect(screen.getByText('https://example.com')).toBeDefined();
  });

  it('does not include trailing punctuation in detected URLs', () => {
    const content = 'See (https://example.com).';
    render(<NfoViewer visible={true} content={content} onClose={vi.fn()} />);
    expect(screen.getByText('https://example.com')).toBeDefined();
  });

  it('copies URL to clipboard on click', async () => {
    const content = 'Visit https://example.com for info';
    render(<NfoViewer visible={true} content={content} onClose={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-url-0'));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com');
  });

  it('shows clipboard icon on hover and Copied! after click', async () => {
    const content = 'Visit https://example.com for info';
    render(<NfoViewer visible={true} content={content} onClose={vi.fn()} />);
    const urlWrapper = screen.getByTestId('copy-url-0');
    fireEvent.mouseEnter(urlWrapper);
    expect(urlWrapper.textContent).toContain('📋');
    await act(async () => {
      fireEvent.click(urlWrapper);
    });
    expect(urlWrapper.textContent).toContain('Copied!');
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(<NfoViewer visible={true} content="test" onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
