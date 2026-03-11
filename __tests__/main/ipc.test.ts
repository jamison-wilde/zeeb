import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  app: {
    getPath: vi.fn(),
  },
}));

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  rename: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  appendFile: vi.fn(),
  unlink: vi.fn(),
  access: vi.fn(),
}));

import { ipcMain } from 'electron';
import { registerIpcHandlers } from '../../src/main/ipc';

describe('IPC handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers all expected IPC channels', () => {
    registerIpcHandlers();
    const handleMock = ipcMain.handle as ReturnType<typeof vi.fn>;
    const channels = handleMock.mock.calls.map((c: unknown[]) => c[0]);
    expect(channels).toContain('fs:readdir');
    expect(channels).toContain('fs:readFile');
    expect(channels).toContain('fs:writeFile');
    expect(channels).toContain('fs:appendFile');
    expect(channels).toContain('fs:rename');
    expect(channels).toContain('fs:unlink');
    expect(channels).toContain('fs:exists');
    expect(channels).toContain('dialog:openDirectory');
    expect(channels).toContain('app:getPath');
  });
});
