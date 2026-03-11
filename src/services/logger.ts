import type { FsAdapter } from '../adapters/fs';

export interface Logger {
  log(type: string, source: string, dest: string | null): Promise<void>;
}

export function createLogger(fs: FsAdapter, filePath: string): Logger {
  return {
    async log(type: string, source: string, dest: string | null): Promise<void> {
      const timestamp = new Date().toISOString();
      const destStr = dest ?? '';
      const line = `${timestamp} [${type}] ${source} -> ${destStr}\n`;
      await fs.appendFile(filePath, line, 'utf8');
    },
  };
}
