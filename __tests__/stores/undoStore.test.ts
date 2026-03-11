import { createUndoStore } from '../../src/stores/undoStore';

jest.mock('react-native-fs', () => ({
  moveFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

describe('undoStore', () => {
  it('begins and commits a transaction', () => {
    const store = createUndoStore();
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().commitTransaction();
    expect(store.getState().transactions).toHaveLength(1);
    expect(store.getState().transactions[0].entries).toHaveLength(1);
  });

  it('discards uncommitted transaction', () => {
    const store = createUndoStore();
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().discardTransaction();
    expect(store.getState().transactions).toHaveLength(0);
  });

  it('undoes a transaction by reversing renames', async () => {
    const RNFS = require('react-native-fs');
    const store = createUndoStore();
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().commitTransaction();

    await store.getState().undoTransaction(store.getState().transactions[0].id);
    expect(RNFS.moveFile).toHaveBeenCalledWith('/new.mkv', '/old.mkv');
    expect(store.getState().transactions).toHaveLength(0);
  });

  it('undoes entries in reverse order', async () => {
    const RNFS = require('react-native-fs');
    const callOrder: string[] = [];
    (RNFS.moveFile as jest.Mock).mockImplementation((from: string) => {
      callOrder.push(from);
      return Promise.resolve();
    });

    const store = createUndoStore();
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/a.mkv', destPath: '/b.mkv' });
    store.getState().addEntry({ type: 'rename', sourcePath: '/c.mkv', destPath: '/d.mkv' });
    store.getState().commitTransaction();

    await store.getState().undoTransaction(store.getState().transactions[0].id);
    expect(callOrder).toEqual(['/d.mkv', '/b.mkv']);
  });
});
