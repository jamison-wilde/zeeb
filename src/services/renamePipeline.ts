import type { FsAdapter } from '../adapters/fs';
import type { ZeebConfig, MovieFile, MovieMetadata, UndoEntry } from '../types';
import { renameFile, findSubtitles, renameSubtitles } from './fileRenamer';
import { generateUrlFileContent, generateWeblocContent } from './urlFileWriter';
import { buildTitleUrl } from './imdbExtractor';
import { buildPosterUrl } from './tmdbService';
import { interpolateFormat } from './formatEngine';

export interface ExecuteRenameArgs {
  fs: FsAdapter;
  currentFile: MovieFile;
  previewFilename: string;
  metadata: MovieMetadata;
  posterRemotePath: string | null;
  selectedAka: string | null;
  config: ZeebConfig;
  platform: 'mac' | 'win';
}

export interface ExecuteRenameResult {
  entries: UndoEntry[];
  finalPath: string;
  finalFolder: string;
  posterSaveError?: Error;
}

export async function executeRename(args: ExecuteRenameArgs): Promise<ExecuteRenameResult> {
  const { fs, currentFile, previewFilename, metadata, posterRemotePath, selectedAka, config, platform } = args;
  const entries: UndoEntry[] = [];

  const sep = currentFile.nativePath.includes('\\') ? '\\' : '/';
  let workingFolder = currentFile.folder;
  const newPath = `${workingFolder}${sep}${previewFilename}`;
  const fileEntry = await renameFile(fs, currentFile.nativePath, newPath);
  entries.push(fileEntry);

  // Rename subtitles
  const baseName = currentFile.name.replace(/\.[^.]+$/, '');
  const newBase = previewFilename.replace(/\.[^.]+$/, '');
  const subs = await findSubtitles(fs, workingFolder, baseName, config.subtitleExtensions);
  if (subs.length > 0) {
    const subEntries = await renameSubtitles(fs, subs, baseName, newBase);
    entries.push(...subEntries);
  }

  // Rename folder if enabled
  if (config.renameFolder) {
    const parentParts = workingFolder.split(/[\\/]/);
    if (parentParts.length > 1 && parentParts[parentParts.length - 1] !== '') {
      const parentDir = parentParts.slice(0, -1).join(sep);
      const newFolderName = newBase;
      const currentFolderName = parentParts[parentParts.length - 1];
      if (currentFolderName !== newFolderName) {
        const newFolderPath = `${parentDir}${sep}${newFolderName}`;
        await fs.rename(workingFolder, newFolderPath);
        entries.push({ type: 'rename', sourcePath: workingFolder, destPath: newFolderPath });
        workingFolder = newFolderPath;
      }
    }
  }

  // Create URL file if enabled
  let nfoContent: string | null = null;
  if (config.createUrlFile) {
    if (config.includeNfoInUrl && currentFile.nfoPath) {
      try {
        const nfoName = currentFile.nfoPath.split(/[\\/]/).pop()!;
        const nfoPath = workingFolder !== currentFile.folder
          ? `${workingFolder}${sep}${nfoName}`
          : currentFile.nfoPath;
        nfoContent = await fs.readFile(nfoPath, 'utf-8');
      } catch { /* NFO read failed — skip */ }
    }

    const isMac = platform === 'mac';
    const urlExt = isMac ? '.webloc' : '.url';
    const urlPath = `${workingFolder}${sep}${newBase}${urlExt}`;
    const imdbUrl = buildTitleUrl(metadata.tt, config.urlImdbTT);

    const urlContent = isMac
      ? generateWeblocContent({
          url: imdbUrl,
          originalPath: config.includeOriginalInUrl ? currentFile.nativePath : undefined,
          includeOriginal: config.includeOriginalInUrl,
          nfoContent,
        })
      : generateUrlFileContent({
          url: imdbUrl,
          originalPath: config.includeOriginalInUrl ? currentFile.nativePath : undefined,
          nfoContent,
          includeOriginal: config.includeOriginalInUrl,
        });

    await fs.writeFile(urlPath, urlContent, 'utf-8');
    entries.push({ type: 'create', sourcePath: urlPath, destPath: urlPath });

    if (config.deleteNfoAfterInclude && nfoContent != null && currentFile.nfoPath) {
      const nfoName = currentFile.nfoPath.split(/[\\/]/).pop()!;
      const nfoPath = workingFolder !== currentFile.folder
        ? `${workingFolder}${sep}${nfoName}`
        : currentFile.nfoPath;
      await fs.unlink(nfoPath);
      entries.push({ type: 'delete', sourcePath: nfoPath, destPath: null, content: nfoContent });
    }
  }

  // Save poster if enabled and a remote path was provided
  let posterSaveError: Error | undefined;
  if (config.createPoster && posterRemotePath) {
    try {
      const posterUrl = buildPosterUrl(posterRemotePath, config.posterSaveSize);

      let posterFolder = workingFolder;
      if (currentFile.isDvdFolder && !config.posterInDvdFolder) {
        const parts = workingFolder.split(/[\\/]/);
        posterFolder = parts.slice(0, -1).join(sep);
      }

      let posterBaseName = newBase;
      if (config.separatePosterFormat && config.formatPoster) {
        posterBaseName = interpolateFormat(config.formatPoster, metadata, {
          saved: '',
          selectedAka: selectedAka ?? undefined,
          directorSeparator: config.directorSeparator,
          genreSeparator: config.genreSeparator,
          starSeparator: config.starSeparator,
          removeThe: config.removeThe,
          swapThe: config.swapThe,
          titleSpaceChar: config.titleSpaceChar,
          mpaaMap: config.mpaaMap,
          theWord: config.theWord,
        });
      }

      const posterSavePath = `${posterFolder}${sep}${posterBaseName}.jpg`;
      await fs.downloadToFile(posterUrl, posterSavePath);
      entries.push({ type: 'create', sourcePath: posterSavePath, destPath: posterSavePath });
    } catch (err) {
      posterSaveError = err instanceof Error ? err : new Error(String(err));
    }
  }

  const finalPath = `${workingFolder}${sep}${previewFilename}`;
  return { entries, finalPath, finalFolder: workingFolder, posterSaveError };
}
