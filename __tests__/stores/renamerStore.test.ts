import { createRenamerStore } from '../../src/stores/renamerStore';

describe('renamerStore', () => {
  it('tracks current file index', () => {
    const store = createRenamerStore();
    store.getState().setCurrentIndex(5);
    expect(store.getState().currentIndex).toBe(5);
  });

  it('stores search parts for current file', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([
      { id: '0', text: 'Movie', originalText: 'Movie', state: 'search', editable: true },
    ]);
    expect(store.getState().searchParts).toHaveLength(1);
  });

  it('updates a search part state', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([
      { id: '0', text: 'Movie', originalText: 'Movie', state: 'search', editable: true },
    ]);
    store.getState().updatePartState('0', 'remove');
    expect(store.getState().searchParts[0].state).toBe('remove');
  });

  it('stores movie matches and selected metadata', () => {
    const store = createRenamerStore();
    store.getState().setMovieMatches([
      { tt: 'tt0111161', title: 'Shawshank', year: 1994, aka: null, thumbnailUrl: null, stars: null },
    ]);
    expect(store.getState().movieMatches).toHaveLength(1);
  });

  it('stores selected metadata', () => {
    const store = createRenamerStore();
    store.getState().setMetadata({
      tt: 'tt0111161', title: 'The Shawshank Redemption', year: 1994,
      rating: 9.3, directors: ['Frank Darabont'], genres: ['Drama'],
      actors: ['Tim Robbins'], duration: 142, mpaa: 'R', aka: [], posterUrl: null,
    });
    expect(store.getState().metadata?.title).toBe('The Shawshank Redemption');
  });

  it('resets state for next file', () => {
    const store = createRenamerStore();
    store.getState().setMetadata({
      tt: 'tt0111161', title: 'Test', year: null,
      rating: null, directors: [], genres: [], actors: [],
      duration: null, mpaa: null, aka: [], posterUrl: null,
    });
    store.getState().reset();
    expect(store.getState().metadata).toBeNull();
    expect(store.getState().searchParts).toEqual([]);
  });
});
