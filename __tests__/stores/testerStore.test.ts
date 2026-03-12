import { describe, it, expect, beforeEach } from 'vitest';
import { useTesterStore } from '../../src/stores/testerStore';

describe('testerStore', () => {
  beforeEach(() => {
    useTesterStore.getState().clear();
  });

  it('starts with null request and result', () => {
    const state = useTesterStore.getState();
    expect(state.testerRequest).toBeNull();
    expect(state.testerResult).toBeNull();
    expect(state.testerError).toBeNull();
  });

  it('setRequest sets the request and clears previous results', () => {
    useTesterStore.getState().setRequest('tt0068646');
    const state = useTesterStore.getState();
    expect(state.testerRequest).toEqual({ tt: 'tt0068646' });
    expect(state.testerResult).toBeNull();
    expect(state.testerError).toBeNull();
  });

  it('setResult sets the result', () => {
    const meta = {
      tt: 'tt0068646', title: 'The Godfather', year: 1972,
      rating: 9.2, directors: ['Francis Ford Coppola'], genres: ['Crime'],
      actors: ['Marlon Brando'], duration: 175, mpaa: 'R', aka: [], posterUrl: null,
    };
    useTesterStore.getState().setResult(meta);
    expect(useTesterStore.getState().testerResult).toEqual(meta);
  });

  it('clear resets all fields', () => {
    useTesterStore.getState().setRequest('tt0068646');
    useTesterStore.getState().setError('fail');
    useTesterStore.getState().clear();
    const state = useTesterStore.getState();
    expect(state.testerRequest).toBeNull();
    expect(state.testerResult).toBeNull();
    expect(state.testerError).toBeNull();
  });
});
