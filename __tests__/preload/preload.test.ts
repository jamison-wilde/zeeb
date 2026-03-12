import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    sendToHost: vi.fn(),
  },
}));

vi.mock('node:path', () => ({
  default: { join: (...args: string[]) => args.join('/') },
  join: (...args: string[]) => args.join('/'),
}));

describe('main preload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exposes zeebFs and zeebDialog APIs', async () => {
    await import('../../src/preload/main');
    const { contextBridge: cb } = await import('electron');
    const exposeMock = cb.exposeInMainWorld as ReturnType<typeof vi.fn>;
    const keys = exposeMock.mock.calls.map((c: unknown[]) => c[0]);
    expect(keys).toContain('zeebFs');
    expect(keys).toContain('zeebDialog');
    expect(keys).toContain('zeebApp');
    expect(keys).toContain('zeebImdb');
    expect(keys).toContain('zeebMenu');
  });
});

describe('webview preload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('registers ipcRenderer.on listener for extraction patterns', async () => {
    await import('../../src/preload/webview');
    const { ipcRenderer } = await import('electron');
    const onMock = ipcRenderer.on as ReturnType<typeof vi.fn>;
    const channels = onMock.mock.calls.map((c: unknown[]) => c[0]);
    expect(channels).toContain('set-extraction-patterns');
  });
});
