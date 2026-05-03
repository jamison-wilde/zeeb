import type { FsAdapter } from '../adapters/fs';
import type { UndoEntry } from '../types';

export async function renameFile(fs: FsAdapter, src: string, dest: string): Promise<UndoEntry> {
  await fs.rename(src, dest);
  return {
    type: 'rename',
    sourcePath: src,
    destPath: dest,
  };
}

export async function findSubtitles(
  fs: FsAdapter,
  folder: string,
  baseName: string,
  extensions: string[],
): Promise<string[]> {
  const items = await fs.readdir(folder);
  const extSet = new Set(extensions.map(e => e.toLowerCase()));

  return items
    .filter(item => {
      if (!item.isFile) return false;
      const name = item.name;
      if (!name.startsWith(baseName)) return false;
      const suffix = name.substring(baseName.length);
      if (!suffix.startsWith('.')) return false;
      const lastDot = suffix.lastIndexOf('.');
      const ext = suffix.substring(lastDot + 1).toLowerCase();
      return extSet.has(ext);
    })
    .map(item => item.path);
}

export async function renameSubtitles(
  fs: FsAdapter,
  paths: string[],
  oldBase: string,
  newBase: string,
): Promise<UndoEntry[]> {
  const entries: UndoEntry[] = [];

  for (const filePath of paths) {
    const dirSep = filePath.lastIndexOf('/');
    const dir = dirSep >= 0 ? filePath.substring(0, dirSep) : '';
    const fileName = dirSep >= 0 ? filePath.substring(dirSep + 1) : filePath;

    if (!fileName.startsWith(oldBase)) continue;

    const newFileName = newBase + fileName.slice(oldBase.length);
    if (newFileName === fileName) continue;

    const newPath = dir ? `${dir}/${newFileName}` : newFileName;

    await fs.rename(filePath, newPath);
    entries.push({
      type: 'rename',
      sourcePath: filePath,
      destPath: newPath,
    });
  }

  return entries;
}
