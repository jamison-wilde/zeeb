import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WindowState {
  width: number;
  height: number;
  maximized: boolean;
}

const FILENAME = 'window-state.json';
const DEFAULTS: WindowState = { width: 1024, height: 768, maximized: false };

function getPath(): string {
  return path.join(app.getPath('userData'), FILENAME);
}

export function loadWindowState(): WindowState {
  try {
    const raw = fs.readFileSync(getPath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<WindowState>;
    return {
      width: typeof parsed.width === 'number' ? parsed.width : DEFAULTS.width,
      height: typeof parsed.height === 'number' ? parsed.height : DEFAULTS.height,
      maximized: typeof parsed.maximized === 'boolean' ? parsed.maximized : DEFAULTS.maximized,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveWindowState(partial: Partial<WindowState>): void {
  const current = loadWindowState();
  const merged = { ...current, ...partial };
  try {
    fs.writeFileSync(getPath(), JSON.stringify(merged, null, 2), 'utf-8');
  } catch {
    /* best effort — don't crash main on disk error */
  }
}
