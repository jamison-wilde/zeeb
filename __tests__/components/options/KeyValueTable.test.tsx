import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { KeyValueTable } from '../../../src/renderer/components/options/KeyValueTable';

describe('KeyValueTable', () => {
  const defaults = {
    leftHeader: 'Match',
    rightHeader: 'Display',
    leftPlaceholder: 'match term',
    rightPlaceholder: 'display label',
  };

  it('renders rows for each pair', () => {
    render(
      <KeyValueTable
        values={[['720', '720p'], ['dc', "Director's Cut"]]}
        onChange={vi.fn()}
        {...defaults}
      />,
    );
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(4);
    expect((inputs[0] as HTMLInputElement).value).toBe('720');
    expect((inputs[1] as HTMLInputElement).value).toBe('720p');
  });

  it('calls onChange when a cell is edited', () => {
    const onChange = vi.fn();
    render(
      <KeyValueTable values={[['720', '720p']]} onChange={onChange} {...defaults} />,
    );
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[1], { target: { value: '720P HD' } });
    expect(onChange).toHaveBeenCalledWith([['720', '720P HD']]);
  });

  it('removes a row when × clicked', () => {
    const onChange = vi.fn();
    render(
      <KeyValueTable
        values={[['720', '720p'], ['dc', "Director's Cut"]]}
        onChange={onChange}
        {...defaults}
      />,
    );
    const removeButtons = screen.getAllByTestId('kv-remove');
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith([['dc', "Director's Cut"]]);
  });

  it('adds a blank row when Add clicked', () => {
    const onChange = vi.fn();
    render(
      <KeyValueTable values={[['720', '720p']]} onChange={onChange} {...defaults} />,
    );
    fireEvent.click(screen.getByTestId('kv-add'));
    expect(onChange).toHaveBeenCalledWith([['720', '720p'], ['', '']]);
  });
});
