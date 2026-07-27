import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const quit = vi.fn();
const spawn = vi.fn();

vi.mock('electron', () => ({
  app: { quit },
}));

vi.mock('node:child_process', () => ({
  default: { spawn },
  spawn,
}));

describe('handleSquirrelEvents', () => {
  const originalArgv = process.argv;
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.resetModules();
    quit.mockReset();
    spawn.mockReset();
    spawn.mockReturnValue({
      on: vi.fn((_event: string, done: () => void) => {
        done();
      }),
    });
    Object.defineProperty(process, 'platform', { value: 'win32' });
  });

  afterEach(() => {
    process.argv = originalArgv;
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it.each([
    ['--squirrel-install', '--createShortcut='],
    ['--squirrel-updated', '--createShortcut='],
    ['--squirrel-uninstall', '--removeShortcut='],
  ])('limits %s shortcuts to the Start Menu', async (event, shortcutCommand) => {
    process.argv = ['electron.exe', event];
    const { handleSquirrelEvents } = await import('../../src/main/squirrelHandler');

    expect(handleSquirrelEvents()).toBe(true);
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn.mock.calls[0][1]).toEqual([
      expect.stringContaining(shortcutCommand),
      '--shortcut-locations=StartMenu',
    ]);
    expect(quit).toHaveBeenCalledTimes(1);
  });

  it('ignores non-Squirrel launches', async () => {
    process.argv = ['electron.exe'];
    const { handleSquirrelEvents } = await import('../../src/main/squirrelHandler');

    expect(handleSquirrelEvents()).toBe(false);
    expect(spawn).not.toHaveBeenCalled();
  });
});
