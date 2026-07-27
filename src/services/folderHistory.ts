import type { FolderHistoryEntry, RecursionMode } from '../types';

export const FOLDER_HISTORY_LIMIT = 10;

// Windows paths are case-insensitive.
const samePath = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

export function upsertFolderHistory(
  history: FolderHistoryEntry[],
  entry: { path: string; depth: RecursionMode; fileCount: number; lastScanned: number },
): FolderHistoryEntry[] {
  const rest = history.filter((h) => !samePath(h.path, entry.path));
  return [{ ...entry }, ...rest].slice(0, FOLDER_HISTORY_LIMIT);
}

export function removeFromFolderHistory(
  history: FolderHistoryEntry[],
  path: string,
): FolderHistoryEntry[] {
  return history.filter((h) => !samePath(h.path, path));
}
