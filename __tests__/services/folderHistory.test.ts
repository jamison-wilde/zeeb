import { describe, it, expect } from 'vitest';
import {
  upsertFolderHistory,
  removeFromFolderHistory,
  FOLDER_HISTORY_LIMIT,
} from '../../src/services/folderHistory';
import type { FolderHistoryEntry } from '../../src/types';

const entry = (path: string, depth: FolderHistoryEntry['depth'] = 'none'): FolderHistoryEntry =>
  ({ path, depth, fileCount: null, lastScanned: null });

describe('upsertFolderHistory', () => {
  it('inserts new entries at the front with scan metadata', () => {
    const out = upsertFolderHistory([entry('D:\\old')], {
      path: 'D:\\new', depth: 'full', fileCount: 12, lastScanned: 1000,
    });
    expect(out[0]).toEqual({ path: 'D:\\new', depth: 'full', fileCount: 12, lastScanned: 1000 });
    expect(out[1].path).toBe('D:\\old');
  });

  it('replaces an existing entry case-insensitively and moves it to the front', () => {
    const out = upsertFolderHistory([entry('D:\\a'), entry('D:\\Movies', 'subfolders')], {
      path: 'd:\\movies', depth: 'none', fileCount: 3, lastScanned: 2000,
    });
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ path: 'd:\\movies', depth: 'none', fileCount: 3, lastScanned: 2000 });
  });

  it('caps the history at the limit', () => {
    const many = Array.from({ length: FOLDER_HISTORY_LIMIT }, (_, i) => entry(`D:\\f${i}`));
    const out = upsertFolderHistory(many, { path: 'D:\\extra', depth: 'none', fileCount: 1, lastScanned: 1 });
    expect(out).toHaveLength(FOLDER_HISTORY_LIMIT);
    expect(out[0].path).toBe('D:\\extra');
    expect(out.some((e) => e.path === `D:\\f${FOLDER_HISTORY_LIMIT - 1}`)).toBe(false);
  });
});

describe('removeFromFolderHistory', () => {
  it('removes case-insensitively and leaves others alone', () => {
    const out = removeFromFolderHistory([entry('D:\\A'), entry('D:\\B')], 'd:\\a');
    expect(out.map((e) => e.path)).toEqual(['D:\\B']);
  });
});
