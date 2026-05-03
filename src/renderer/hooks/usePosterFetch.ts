import { useEffect, useState } from 'react';
import { searchPosters } from '../../services/tmdbService';
import type { ZeebConfig, MovieMetadata } from '../../types';

interface UsePosterFetchArgs {
  metadata: MovieMetadata | null;
  config: ZeebConfig;
  setPosterPaths: (paths: string[]) => void;
}

interface UsePosterFetchResult {
  selectedPosterIndex: number | null;
  setSelectedPosterIndex: (i: number | null) => void;
}

export function usePosterFetch(args: UsePosterFetchArgs): UsePosterFetchResult {
  const { metadata, config, setPosterPaths } = args;
  const [selectedPosterIndex, setSelectedPosterIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!metadata?.tt) {
      setPosterPaths([]);
      setSelectedPosterIndex(null);
      return;
    }
    let cancelled = false;
    searchPosters(metadata.tt, config.urlTmdbApi, config.tmdbApiKey)
      .then((paths) => {
        if (cancelled) return;
        setPosterPaths(paths);
        setSelectedPosterIndex(paths.length > 0 ? 0 : null);
      });
    return () => { cancelled = true; };
  }, [metadata?.tt, config.urlTmdbApi, config.tmdbApiKey, setPosterPaths]);

  return { selectedPosterIndex, setSelectedPosterIndex };
}
