import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from '../../src/services/logger';
import { createMockFsAdapter } from '../../src/adapters/fs';
import type { FsAdapter } from '../../src/adapters/fs';

describe('logger', () => {
  let fs: FsAdapter;

  beforeEach(() => {
    fs = createMockFsAdapter({
      appendFile: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('appends timestamped entry to log file', async () => {
    const logger = createLogger(fs, '/mock/zeeb.log');
    await logger.log('rename', '/old.mkv', '/new.mkv');
    expect(fs.appendFile).toHaveBeenCalledWith(
      '/mock/zeeb.log',
      expect.stringMatching(/\d{4}-\d{2}-\d{2}.*rename.*\/old\.mkv.*\/new\.mkv/),
      'utf8',
    );
  });

  it('logs different operation types', async () => {
    const logger = createLogger(fs, '/mock/zeeb.log');
    await logger.log('poster', '/movie.jpg', null);
    expect(fs.appendFile).toHaveBeenCalled();
  });
});
