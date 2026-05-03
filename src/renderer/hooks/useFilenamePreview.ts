import { useEffect } from 'react';
import { interpolateFormat } from '../../services/formatEngine';
import type { ZeebConfig, MovieFile, MovieMetadata, SearchPart } from '../../types';

interface UseFilenamePreviewArgs {
  metadata: MovieMetadata | null;
  currentFile: MovieFile | null;
  searchParts: SearchPart[];
  useAka: boolean;
  selectedAka: string;
  config: ZeebConfig;
  setPreviewFilename: (s: string) => void;
}

export function useFilenamePreview(args: UseFilenamePreviewArgs): void {
  const {
    metadata, currentFile, searchParts, useAka, selectedAka, config, setPreviewFilename,
  } = args;

  useEffect(() => {
    if (!metadata || !currentFile) {
      setPreviewFilename('');
      return;
    }
    const format = currentFile.isDvdFolder && config.separateDvdFormat
      ? (useAka && selectedAka ? config.formatDvdAka : config.formatDvd)
      : (useAka && selectedAka ? config.formatAka : config.formatStandard);
    const ext = currentFile.isDvdFolder ? '' : `.${currentFile.extension}`;
    const keepParts = searchParts
      .filter((p) => p.state === 'keep' || p.state === 'keepAlways')
      .map((p) => p.text);
    const saved = keepParts.join(config.savedPartSeparator ?? ' ');
    const formatted = interpolateFormat(format, metadata, {
      saved,
      selectedAka: useAka ? selectedAka : undefined,
      directorSeparator: config.directorSeparator,
      genreSeparator: config.genreSeparator,
      starSeparator: config.starSeparator,
      removeThe: config.removeThe,
      swapThe: config.swapThe,
      titleSpaceChar: config.titleSpaceChar,
      mpaaMap: config.mpaaMap,
      theWord: config.theWord,
    });
    setPreviewFilename(formatted + ext);
  }, [metadata, currentFile, config, searchParts, useAka, selectedAka, setPreviewFilename]);
}
