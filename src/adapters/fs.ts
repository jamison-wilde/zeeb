export interface DirEntry {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
  size?: number;
}

export interface FsAdapter {
  readdir(dirPath: string): Promise<DirEntry[]>;
  readFile(filePath: string, encoding: string): Promise<string>;
  writeFile(filePath: string, data: string, encoding: string): Promise<void>;
  appendFile(filePath: string, data: string, encoding: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  unlink(filePath: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  getConfigDir(): Promise<string>;
}

/**
 * Creates an FsAdapter backed by the preload-exposed zeebFs API.
 * Call this in the renderer process.
 */
export function createElectronFsAdapter(): FsAdapter {
  const zeebFs = (window as any).zeebFs;
  const zeebApp = (window as any).zeebApp;

  return {
    readdir: (dirPath) => zeebFs.readdir(dirPath),
    readFile: (filePath, encoding) => zeebFs.readFile(filePath, encoding),
    writeFile: (filePath, data, encoding) => zeebFs.writeFile(filePath, data, encoding),
    appendFile: (filePath, data, encoding) => zeebFs.appendFile(filePath, data, encoding),
    rename: (oldPath, newPath) => zeebFs.rename(oldPath, newPath),
    unlink: (filePath) => zeebFs.unlink(filePath),
    exists: (filePath) => zeebFs.exists(filePath),
    getConfigDir: () => zeebApp.getPath('userData'),
  };
}

/**
 * Creates a mock FsAdapter for testing.
 */
export function createMockFsAdapter(overrides?: Partial<FsAdapter>): FsAdapter {
  return {
    readdir: async () => [],
    readFile: async () => '',
    writeFile: async () => {},
    appendFile: async () => {},
    rename: async () => {},
    unlink: async () => {},
    exists: async () => false,
    getConfigDir: async () => '/mock/config',
    ...overrides,
  };
}
