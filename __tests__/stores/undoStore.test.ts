import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUndoStore } from '../../src/stores/undoStore';
import { createMockFsAdapter } from '../../src/adapters/fs';
import type { FsAdapter } from '../../src/adapters/fs';

describe('undoStore', () => {
  let fs: FsAdapter;

  beforeEach(() => {
    fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('begins and commits a transaction', () => {
    const store = createUndoStore(fs);
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().commitTransaction('/movies');
    expect(store.getState().transactions).toHaveLength(1);
    expect(store.getState().transactions[0].entries).toHaveLength(1);
  });

  it('discards uncommitted transaction', () => {
    const store = createUndoStore(fs);
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().discardTransaction();
    expect(store.getState().transactions).toHaveLength(0);
  });

  it('undoes a transaction by reversing renames', async () => {
    const store = createUndoStore(fs);
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().commitTransaction('/movies');

    const results = await store.getState().undoTransaction(store.getState().transactions[0].id);
    expect(fs.rename).toHaveBeenCalledWith('/new.mkv', '/old.mkv');
    expect(store.getState().transactions).toHaveLength(0);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
  });

  it('undoes entries in reverse order', async () => {
    const callOrder: string[] = [];
    (fs.rename as ReturnType<typeof vi.fn>).mockImplementation((from: string) => {
      callOrder.push(from);
      return Promise.resolve();
    });

    const store = createUndoStore(fs);
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/a.mkv', destPath: '/b.mkv' });
    store.getState().addEntry({ type: 'rename', sourcePath: '/c.mkv', destPath: '/d.mkv' });
    store.getState().commitTransaction('/movies');

    await store.getState().undoTransaction(store.getState().transactions[0].id);
    expect(callOrder).toEqual(['/d.mkv', '/b.mkv']);
  });

  it('restores deleted file on undo', async () => {
    const store = createUndoStore(fs);
    store.getState().beginTransaction();
    store.getState().addEntry({
      type: 'delete',
      sourcePath: '/movies/info.nfo',
      destPath: null,
      content: 'NFO content here',
    });
    store.getState().commitTransaction('/movies');

    await store.getState().undoTransaction(store.getState().transactions[0].id);
    expect(fs.writeFile).toHaveBeenCalledWith('/movies/info.nfo', 'NFO content here', 'utf-8');
    expect(store.getState().transactions).toHaveLength(0);
  });

  it('trims oldest transactions when exceeding maxUndos', () => {
    const store = createUndoStore(fs);
    for (let i = 0; i < 5; i++) {
      store.getState().beginTransaction();
      store.getState().addEntry({ type: 'rename', sourcePath: `/old${i}.mkv`, destPath: `/new${i}.mkv` });
      store.getState().commitTransaction('/movies', 3);
    }
    expect(store.getState().transactions).toHaveLength(3);
    expect(store.getState().transactions[0].entries[0].sourcePath).toBe('/old2.mkv');
  });

  it('skips recording when maxUndos is 0', () => {
    const store = createUndoStore(fs);
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().commitTransaction('/movies', 0);
    expect(store.getState().transactions).toHaveLength(0);
  });

  it('stores basePath on committed transaction', () => {
    const store = createUndoStore(fs);
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().commitTransaction('/movies');
    expect(store.getState().transactions[0].basePath).toBe('/movies');
  });

  it('returns UndoResult array on successful undo', async () => {
    const store = createUndoStore(fs);
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().commitTransaction('/movies');

    const results = await store.getState().undoTransaction(store.getState().transactions[0].id);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].entry.sourcePath).toBe('/old.mkv');
  });

  it('returns UndoResult with failure info and keeps failed entries', async () => {
    (fs.rename as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('ENOENT'));
    const store = createUndoStore(fs);
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().addEntry({ type: 'rename', sourcePath: '/old2.mkv', destPath: '/new2.mkv' });
    store.getState().commitTransaction('/movies');

    const txId = store.getState().transactions[0].id;
    const results = await store.getState().undoTransaction(txId);
    expect(results).toHaveLength(2);
    // Entries processed in reverse: /old2 first (fails via mockRejectedValueOnce), /old second (succeeds)
    expect(results.find(r => r.entry.sourcePath === '/old2.mkv')!.success).toBe(false);
    expect(results.find(r => r.entry.sourcePath === '/old.mkv')!.success).toBe(true);

    // Original transaction replaced with one containing only failed entry
    expect(store.getState().transactions).toHaveLength(1);
    expect(store.getState().transactions[0].id).not.toBe(txId);
    expect(store.getState().transactions[0].entries).toHaveLength(1);
    expect(store.getState().transactions[0].entries[0].sourcePath).toBe('/old2.mkv');
    expect(store.getState().transactions[0].basePath).toBe('/movies');
  });
});
