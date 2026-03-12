import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { TagInput } from '../../../src/renderer/components/options/TagInput';

describe('TagInput', () => {
  it('renders each value as a pill', () => {
    render(<TagInput values={['mkv', 'avi', 'mp4']} onChange={vi.fn()} placeholder="Add..." />);
    expect(screen.getByText('mkv')).toBeDefined();
    expect(screen.getByText('avi')).toBeDefined();
    expect(screen.getByText('mp4')).toBeDefined();
  });

  it('adds a tag on Enter', () => {
    const onChange = vi.fn();
    render(<TagInput values={['mkv']} onChange={onChange} placeholder="Add..." />);
    const input = screen.getByPlaceholderText('Add...');
    fireEvent.change(input, { target: { value: 'webm' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['mkv', 'webm']);
  });

  it('adds a tag on comma', () => {
    const onChange = vi.fn();
    render(<TagInput values={['mkv']} onChange={onChange} placeholder="Add..." />);
    const input = screen.getByPlaceholderText('Add...');
    fireEvent.change(input, { target: { value: 'webm,' } });
    fireEvent.keyDown(input, { key: ',' });
    expect(onChange).toHaveBeenCalledWith(['mkv', 'webm']);
  });

  it('removes a tag when x clicked', () => {
    const onChange = vi.fn();
    render(<TagInput values={['mkv', 'avi']} onChange={onChange} placeholder="Add..." />);
    const removeButtons = screen.getAllByTestId('tag-remove');
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith(['avi']);
  });

  it('does not add duplicate tags', () => {
    const onChange = vi.fn();
    render(<TagInput values={['mkv']} onChange={onChange} placeholder="Add..." />);
    const input = screen.getByPlaceholderText('Add...');
    fireEvent.change(input, { target: { value: 'mkv' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });
});
