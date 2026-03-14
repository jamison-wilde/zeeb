import { app } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';

function run(args: string[], done: () => void): void {
  const updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
  spawn(updateExe, args, { detached: true }).on('close', done);
}

export function handleSquirrelEvents(): boolean {
  if (process.platform !== 'win32') return false;

  const cmd = process.argv[1];

  switch (cmd) {
    case '--squirrel-install':
    case '--squirrel-updated':
      run(['--createShortcut=' + path.basename(process.execPath)], () => app.quit());
      return true;

    case '--squirrel-uninstall':
      run(['--removeShortcut=' + path.basename(process.execPath)], () => app.quit());
      return true;

    case '--squirrel-obsolete':
      app.quit();
      return true;

    default:
      return false;
  }
}
