import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormatTesterSection } from '../../../src/renderer/components/options/FormatTesterSection';
import { useTesterStore } from '../../../src/stores/testerStore';
import { DEFAULT_CONFIG } from '../../../src/services/configDefaults';

describe('FormatTesterSection', () => {
  beforeEach(() => {
    useTesterStore.getState().clear();
  });

  it('renders input and Test button', () => {
    render(<FormatTesterSection config={DEFAULT_CONFIG as any} />);
    expect(screen.getByPlaceholderText(/Enter tt#/)).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('sets testerRequest in store on valid tt# submit', async () => {
    render(<FormatTesterSection config={DEFAULT_CONFIG as any} />);
    const input = screen.getByPlaceholderText(/Enter tt#/);
    await userEvent.type(input, 'tt0068646');
    await userEvent.click(screen.getByText('Test'));
    expect(useTesterStore.getState().testerRequest).toEqual({ tt: 'tt0068646' });
  });

  it('shows error for invalid tt# format', async () => {
    render(<FormatTesterSection config={DEFAULT_CONFIG as any} />);
    const input = screen.getByPlaceholderText(/Enter tt#/);
    await userEvent.type(input, 'badid');
    await userEvent.click(screen.getByText('Test'));
    expect(screen.getByText(/expected format/)).toBeInTheDocument();
    expect(useTesterStore.getState().testerRequest).toBeNull();
  });

  it('shows token table when testerResult is populated', () => {
    useTesterStore.getState().setResult({
      tt: 'tt0068646', title: 'The Godfather', year: 1972,
      rating: 9.2, directors: ['Francis Ford Coppola'], genres: ['Crime', 'Drama'],
      actors: ['Marlon Brando'], duration: 175, mpaa: 'R', aka: [], posterUrl: null,
    });
    render(<FormatTesterSection config={DEFAULT_CONFIG as any} />);
    expect(screen.getByText('The Godfather')).toBeInTheDocument();
    expect(screen.getByText('1972')).toBeInTheDocument();
  });

  it('shows error when testerError is set', () => {
    useTesterStore.getState().setError('Could not fetch data for tt9999999');
    render(<FormatTesterSection config={DEFAULT_CONFIG as any} />);
    expect(screen.getByText(/Could not fetch/)).toBeInTheDocument();
  });

  it('Godfather button fills tt0068646 into input', async () => {
    render(<FormatTesterSection config={DEFAULT_CONFIG as any} />);
    await userEvent.click(screen.getByText('Godfather'));
    expect((screen.getByPlaceholderText(/Enter tt#/) as HTMLInputElement).value).toBe('tt0068646');
  });

  it('defaults input to currentTt from store', () => {
    useTesterStore.getState().setCurrentTt('tt0111161');
    render(<FormatTesterSection config={DEFAULT_CONFIG as any} />);
    expect((screen.getByPlaceholderText(/Enter tt#/) as HTMLInputElement).value).toBe('tt0111161');
  });
});
