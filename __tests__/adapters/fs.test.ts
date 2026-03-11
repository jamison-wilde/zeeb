import { describe, it, expect } from 'vitest';
import type { FsAdapter, DirEntry } from '../../src/adapters/fs';
import { createMockFsAdapter } from '../../src/adapters/fs';

describe('FsAdapter interface', () => {
  it('createMockFsAdapter returns an object implementing the interface', () => {
    const adapter = createMockFsAdapter();
    expect(typeof adapter.readdir).toBe('function');
    expect(typeof adapter.readFile).toBe('function');
    expect(typeof adapter.writeFile).toBe('function');
    expect(typeof adapter.appendFile).toBe('function');
    expect(typeof adapter.rename).toBe('function');
    expect(typeof adapter.unlink).toBe('function');
    expect(typeof adapter.exists).toBe('function');
    expect(typeof adapter.getConfigDir).toBe('function');
  });

  it('mock readdir returns empty array by default', async () => {
    const adapter = createMockFsAdapter();
    const result = await adapter.readdir('/any');
    expect(result).toEqual([]);
  });
});
