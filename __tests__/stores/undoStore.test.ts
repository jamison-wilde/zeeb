import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUndoStore } from '../../src/stores/undoStore';
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
    useUndoStore.setState({ transactions: [], pendingTransaction: null });
    useUndoStore.getState().setFs(fs);
  });

  it('begins and commits a transaction', () => {
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    useUndoStore.getState().commitTransaction('/movies');
    expect(useUndoStore.getState().transactions).toHaveLength(1);
    expect(useUndoStore.getState().transactions[0].entries).toHaveLength(1);
  });

  it('discards uncommitted transaction', () => {
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    useUndoStore.getState().discardTransaction();
    expect(useUndoStore.getState().transactions).toHaveLength(0);
  });

  it('undoes a transaction by reversing renames', async () => {
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    useUndoStore.getState().commitTransaction('/movies');

    const id = useUndoStore.getState().transactions[0].id;
    const results = await useUndoStore.getState().undoTransaction(id);
    expect(fs.rename).toHaveBeenCalledWith('/new.mkv', '/old.mkv');
    expect(useUndoStore.getState().transactions).toHaveLength(0);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
  });

  it('undoes entries in reverse order', async () => {
    const callOrder: string[] = [];
    (fs.rename as ReturnType<typeof vi.fn>).mockImplementation((from: string) => {
      callOrder.push(from);
      return Promise.resolve();
    });

    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/a.mkv', destPath: '/b.mkv' });
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/c.mkv', destPath: '/d.mkv' });
    useUndoStore.getState().commitTransaction('/movies');

    const id = useUndoStore.getState().transactions[0].id;
    await useUndoStore.getState().undoTransaction(id);
    expect(callOrder).toEqual(['/d.mkv', '/b.mkv']);
  });

  it('restores deleted file on undo', async () => {
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({
      type: 'delete',
      sourcePath: '/movies/info.nfo',
      destPath: null,
      content: 'NFO content here',
    });
    useUndoStore.getState().commitTransaction('/movies');

    const id = useUndoStore.getState().transactions[0].id;
    await useUndoStore.getState().undoTransaction(id);
    expect(fs.writeFile).toHaveBeenCalledWith('/movies/info.nfo', 'NFO content here', 'utf-8');
    expect(useUndoStore.getState().transactions).toHaveLength(0);
  });

  it('trims oldest transactions when exceeding maxUndos', () => {
    for (let i = 0; i < 5; i++) {
      useUndoStore.getState().beginTransaction();
      useUndoStore.getState().addEntry({ type: 'rename', sourcePath: `/old${i}.mkv`, destPath: `/new${i}.mkv` });
      useUndoStore.getState().commitTransaction('/movies', 3);
    }
    expect(useUndoStore.getState().transactions).toHaveLength(3);
    expect(useUndoStore.getState().transactions[0].entries[0].sourcePath).toBe('/old2.mkv');
  });

  it('skips recording when maxUndos is 0', () => {
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    useUndoStore.getState().commitTransaction('/movies', 0);
    expect(useUndoStore.getState().transactions).toHaveLength(0);
  });

  it('stores basePath on committed transaction', () => {
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    useUndoStore.getState().commitTransaction('/movies');
    expect(useUndoStore.getState().transactions[0].basePath).toBe('/movies');
  });

  it('returns UndoResult array on successful undo', async () => {
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    useUndoStore.getState().commitTransaction('/movies');

    const id = useUndoStore.getState().transactions[0].id;
    const results = await useUndoStore.getState().undoTransaction(id);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].entry.sourcePath).toBe('/old.mkv');
  });

  it('returns UndoResult with failure info and keeps failed entries', async () => {
    (fs.rename as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('ENOENT'));
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/old2.mkv', destPath: '/new2.mkv' });
    useUndoStore.getState().commitTransaction('/movies');

    const txId = useUndoStore.getState().transactions[0].id;
    const results = await useUndoStore.getState().undoTransaction(txId);
    expect(results).toHaveLength(2);
    expect(results.find(r => r.entry.sourcePath === '/old2.mkv')!.success).toBe(false);
    expect(results.find(r => r.entry.sourcePath === '/old.mkv')!.success).toBe(true);

    expect(useUndoStore.getState().transactions).toHaveLength(1);
    expect(useUndoStore.getState().transactions[0].id).not.toBe(txId);
    expect(useUndoStore.getState().transactions[0].entries).toHaveLength(1);
    expect(useUndoStore.getState().transactions[0].entries[0].sourcePath).toBe('/old2.mkv');
    expect(useUndoStore.getState().transactions[0].basePath).toBe('/movies');
  });
});
