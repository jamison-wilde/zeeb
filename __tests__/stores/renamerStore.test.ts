import { createRenamerStore } from '../../src/stores/renamerStore';
import type { SearchPart, SearchPartState } from '../../src/types';

const mkPart = (id: string, text: string, sep = '.', state: SearchPartState = 'search'): SearchPart =>
  ({ id, text, originalText: text, state, editable: true, separatorAfter: sep });

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

describe('mergeParts', () => {
  it('joins with the earlier part separator regardless of drag direction', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([mkPart('0', 'DDP5'), mkPart('1', '1')]);
    store.getState().mergeParts('1', '0'); // drag "1" onto "DDP5"
    const parts = store.getState().searchParts;
    expect(parts).toHaveLength(1);
    expect(parts[0].text).toBe('DDP5.1');
  });

  it('keeps the drop target state and id', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([mkPart('0', 'DDP5', '.', 'remove'), mkPart('1', '1', '.', 'keep')]);
    store.getState().mergeParts('0', '1'); // drag "DDP5" onto "1"
    const parts = store.getState().searchParts;
    expect(parts[0].id).toBe('1');
    expect(parts[0].state).toBe('keep');
    expect(parts[0].text).toBe('DDP5.1');
  });

  it('falls back to "." when the earlier separator is empty', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([mkPart('0', 'AV1', ''), mkPart('1', 'YIFY', '')]);
    store.getState().mergeParts('0', '1');
    expect(store.getState().searchParts[0].text).toBe('AV1.YIFY');
  });

  it('adopts the later part separatorAfter and ignores bad ids', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([mkPart('0', 'a', '-'), mkPart('1', 'b', '_')]);
    store.getState().mergeParts('0', 'nope');
    expect(store.getState().searchParts).toHaveLength(2);
    store.getState().mergeParts('0', '1');
    expect(store.getState().searchParts[0].separatorAfter).toBe('_');
  });
});

describe('reorderParts', () => {
  it('moves a part to the given post-removal index', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([mkPart('0', 'a'), mkPart('1', 'b'), mkPart('2', 'c')]);
    store.getState().reorderParts('0', 2); // a to the end
    expect(store.getState().searchParts.map((p) => p.text)).toEqual(['b', 'c', 'a']);
    store.getState().reorderParts('2', 0); // c (id '2') to the front
    expect(store.getState().searchParts.map((p) => p.text)).toEqual(['c', 'b', 'a']);
  });

  it('clamps out-of-range indexes and ignores unknown ids', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([mkPart('0', 'a'), mkPart('1', 'b')]);
    store.getState().reorderParts('0', 99);
    expect(store.getState().searchParts.map((p) => p.text)).toEqual(['b', 'a']);
    store.getState().reorderParts('nope', 0);
    expect(store.getState().searchParts.map((p) => p.text)).toEqual(['b', 'a']);
  });
});
