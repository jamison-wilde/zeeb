import RNFS from 'react-native-fs';

export interface Logger {
  log(type: string, source: string, dest: string | null): Promise<void>;
}

/**
 * Creates a logger that appends timestamped lines to the given file path.
 */
export function createLogger(filePath: string): Logger {
  return {
    async log(type: string, source: string, dest: string | null): Promise<void> {
      const timestamp = new Date().toISOString();
      const destStr = dest ?? '';
      const line = `${timestamp} [${type}] ${source} -> ${destStr}\n`;
      await RNFS.appendFile(filePath, line, 'utf8');
    },
  };
}
