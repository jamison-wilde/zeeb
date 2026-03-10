import RNFS from 'react-native-fs';
import { MovieFile } from '../types';

type RecursionMode = 'none' | 'subfolders' | 'full';

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `file_${Date.now()}_${idCounter}`;
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.substring(dot + 1).toLowerCase() : '';
}

function getBaseName(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.substring(0, dot) : filename;
}

function getFolder(filepath: string): string {
  const sep = filepath.lastIndexOf('/');
  return sep >= 0 ? filepath.substring(0, sep) : '';
}

async function isDvdOrBluray(dirPath: string): Promise<boolean> {
  try {
    const contents = await RNFS.readDir(dirPath);
    return contents.some(
      (item) =>
        item.isFile() &&
        (item.name.toUpperCase() === 'VIDEO_TS.IFO' ||
          item.name.toUpperCase() === 'INDEX.BDMV'),
    );
  } catch {
    return false;
  }
}

async function checkAssociatedFile(
  dirPath: string,
  baseName: string,
  ext: string,
): Promise<string | null> {
  const candidate = `${dirPath}/${baseName}.${ext}`;
  const exists = await RNFS.exists(candidate);
  return exists ? candidate : null;
}

/**
 * Scans a directory for movie files matching the given extensions.
 * Detects associated NFO, URL, and poster files.
 * Detects DVD/Blu-ray folder structures.
 */
export async function scanDirectory(
  path: string,
  extensions: string[],
  recursionMode: RecursionMode,
): Promise<MovieFile[]> {
  const results: MovieFile[] = [];
  const entries = await RNFS.readDir(path);
  const extSet = new Set(extensions.map((e) => e.toLowerCase()));

  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = getExtension(entry.name);
      if (!extSet.has(ext)) continue;

      const baseName = getBaseName(entry.name);
      const folder = getFolder(entry.path);

      const nfoPath = await checkAssociatedFile(folder, baseName, 'nfo');
      const urlPath = await checkAssociatedFile(folder, baseName, 'url');
      const posterPath = await checkAssociatedFile(folder, baseName, 'jpg');

      results.push({
        id: generateId(),
        name: entry.name,
        nativePath: entry.path,
        folder,
        extension: ext,
        size: entry.size,
        isDvdFolder: false,
        hasNfo: nfoPath !== null,
        hasUrl: urlPath !== null,
        hasPoster: posterPath !== null,
        nfoPath,
        urlPath,
        posterPath,
      });
    } else if (entry.isDirectory()) {
      const dvd = await isDvdOrBluray(entry.path);
      if (dvd) {
        const baseName = entry.name;
        const folder = getFolder(entry.path);
        const nfoPath = await checkAssociatedFile(folder, baseName, 'nfo');
        const urlPath = await checkAssociatedFile(folder, baseName, 'url');
        const posterPath = await checkAssociatedFile(folder, baseName, 'jpg');

        results.push({
          id: generateId(),
          name: entry.name,
          nativePath: entry.path,
          folder,
          extension: '',
          size: entry.size,
          isDvdFolder: true,
          hasNfo: nfoPath !== null,
          hasUrl: urlPath !== null,
          hasPoster: posterPath !== null,
          nfoPath,
          urlPath,
          posterPath,
        });
      } else if (recursionMode === 'subfolders' || recursionMode === 'full') {
        const subResults = await scanDirectory(
          entry.path,
          extensions,
          recursionMode === 'full' ? 'full' : 'none',
        );
        results.push(...subResults);
      }
    }
  }

  return results;
}
