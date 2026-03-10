import RNFS from 'react-native-fs';
import type { UndoEntry } from '../types';

export async function renameFile(src: string, dest: string): Promise<UndoEntry> {
  await RNFS.moveFile(src, dest);
  return {
    type: 'rename',
    sourcePath: src,
    destPath: dest,
  };
}

export async function findSubtitles(
  folder: string,
  baseName: string,
  extensions: string[],
): Promise<string[]> {
  const items = await RNFS.readDir(folder);
  const extSet = new Set(extensions.map(e => e.toLowerCase()));

  return items
    .filter(item => {
      if (typeof item.isFile === 'function' && !item.isFile()) return false;
      const name = item.name;
      if (!name.startsWith(baseName)) return false;
      const suffix = name.substring(baseName.length);
      // suffix should be like ".srt" or ".en.srt"
      if (!suffix.startsWith('.')) return false;
      const lastDot = suffix.lastIndexOf('.');
      const ext = suffix.substring(lastDot + 1).toLowerCase();
      return extSet.has(ext);
    })
    .map(item => item.path);
}

export async function renameSubtitles(
  paths: string[],
  oldBase: string,
  newBase: string,
): Promise<UndoEntry[]> {
  const entries: UndoEntry[] = [];

  for (const filePath of paths) {
    const dirSep = filePath.lastIndexOf('/');
    const dir = dirSep >= 0 ? filePath.substring(0, dirSep) : '';
    const fileName = dirSep >= 0 ? filePath.substring(dirSep + 1) : filePath;

    const newFileName = fileName.replace(oldBase, newBase);
    const newPath = dir ? `${dir}/${newFileName}` : newFileName;

    await RNFS.moveFile(filePath, newPath);
    entries.push({
      type: 'rename',
      sourcePath: filePath,
      destPath: newPath,
    });
  }

  return entries;
}
