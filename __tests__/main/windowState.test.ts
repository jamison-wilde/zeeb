import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/userData'),
  },
}));

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import * as fs from 'node:fs';
import { loadWindowState, saveWindowState } from '../../src/main/windowState';

const readFileSyncMock = fs.readFileSync as unknown as ReturnType<typeof vi.fn>;
const writeFileSyncMock = fs.writeFileSync as unknown as ReturnType<typeof vi.fn>;

describe('windowState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns defaults when window-state.json is missing', () => {
    readFileSyncMock.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(loadWindowState()).toEqual({ width: 1024, height: 768, maximized: false });
  });

  it('returns defaults when window-state.json is malformed JSON', () => {
    readFileSyncMock.mockReturnValue('not json {');
    expect(loadWindowState()).toEqual({ width: 1024, height: 768, maximized: false });
  });

  it('returns parsed values when file is well-formed', () => {
    readFileSyncMock.mockReturnValue(JSON.stringify({ width: 1600, height: 900, maximized: true }));
    expect(loadWindowState()).toEqual({ width: 1600, height: 900, maximized: true });
  });

  it('falls back to defaults for individual missing or wrongly-typed fields', () => {
    readFileSyncMock.mockReturnValue(JSON.stringify({ width: 'huge', maximized: true }));
    expect(loadWindowState()).toEqual({ width: 1024, height: 768, maximized: true });
  });

  it('saveWindowState merges partial updates without losing other fields', () => {
    readFileSyncMock.mockReturnValue(JSON.stringify({ width: 1600, height: 900, maximized: false }));
    saveWindowState({ width: 1280 });
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    const [, payload] = writeFileSyncMock.mock.calls[0];
    expect(JSON.parse(payload as string)).toEqual({ width: 1280, height: 900, maximized: false });
  });

  it('saveWindowState swallows write errors silently', () => {
    readFileSyncMock.mockReturnValue(JSON.stringify({ width: 1024, height: 768, maximized: false }));
    writeFileSyncMock.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    expect(() => saveWindowState({ maximized: true })).not.toThrow();
  });
});
