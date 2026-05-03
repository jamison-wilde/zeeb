import { useEffect, useRef } from 'react';
import { extractImdbFromNfo } from '../../services/nfoParser';
import type { FsAdapter } from '../../adapters/fs';
import type { MovieFile, MovieMatch, SearchPart } from '../../types';

interface UseAutoSelectArgs {
  currentFile: MovieFile | null;
  webviewEl: WebviewTag | null;
  fs: FsAdapter;
  movieMatches: MovieMatch[];
  searchParts: SearchPart[];
  onSelectImdbTt: (tt: string) => void;
  navigateToTitle: (tt: string) => void;
}

export function useAutoSelect(args: UseAutoSelectArgs): void {
  const {
    currentFile, webviewEl, fs, movieMatches, searchParts,
    onSelectImdbTt, navigateToTitle,
  } = args;

  const nfoSelectedRef = useRef(false);

  // Reset flag whenever the file changes
  useEffect(() => {
    nfoSelectedRef.current = false;
  }, [currentFile]);

  // NFO-driven auto-navigate
  useEffect(() => {
    if (!currentFile?.nfoPath || !webviewEl) return;
    let cancelled = false;
    (async () => {
      try {
        const content = await fs.readFile(currentFile.nfoPath!, 'utf-8');
        const tt = extractImdbFromNfo(content);
        if (tt && !cancelled) {
          nfoSelectedRef.current = true;
          onSelectImdbTt(tt);
          navigateToTitle(tt);
        }
      } catch { /* NFO read failed — fall through to year-based auto-select */ }
    })();
    return () => { cancelled = true; };
  }, [currentFile, webviewEl, fs, onSelectImdbTt, navigateToTitle]);

  // Year-match auto-select. Deliberately doesn't re-fire on searchParts changes;
  // only when new matches arrive. Mirrors the original Renamer behavior.
  useEffect(() => {
    if (movieMatches.length === 0 || nfoSelectedRef.current) return;
    const yearCandidates = searchParts.filter(
      (p) => p.state === 'remove' && /^\d{4}$/.test(p.text) && parseInt(p.text, 10) > 1900,
    );
    const yearPart = yearCandidates[yearCandidates.length - 1] ?? null;
    if (!yearPart) return;
    const match = movieMatches.slice(0, 8).find((m) => m.year === parseInt(yearPart.text, 10));
    if (match) {
      navigateToTitle(match.tt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieMatches]);
}
