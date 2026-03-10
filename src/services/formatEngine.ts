import type { MovieMetadata } from '../types';

export interface FormatOptions {
  saved: string;
  directorSeparator?: string;
  genreSeparator?: string;
  starSeparator?: string;
  removeThe?: boolean;
  swapThe?: boolean;
  titleSpaceChar?: string;
}

function applyTheHandling(title: string, options: FormatOptions): string {
  let result = title;
  if (options.removeThe) {
    result = result.replace(/^The\s+/i, '');
  } else if (options.swapThe) {
    result = result.replace(/^(The)\s+(.+)$/i, '$2, $1');
  }
  if (options.titleSpaceChar) {
    result = result.replace(/ /g, options.titleSpaceChar);
  }
  return result;
}

export function interpolateFormat(
  format: string,
  metadata: MovieMetadata,
  options: FormatOptions,
): string {
  const dirSep = options.directorSeparator ?? ', ';
  const genSep = options.genreSeparator ?? ', ';
  const starSep = options.starSeparator ?? ', ';
  const dur = metadata.duration ?? 0;

  const tokens: Record<string, string> = {
    '<title>': applyTheHandling(metadata.title, options),
    '<year>': metadata.year?.toString() ?? '',
    '<imdb>': metadata.tt,
    '<rating100>': Math.min(100, Math.round((metadata.rating ?? 0) * 10.75)).toString(),
    '<rating10>': metadata.rating?.toString() ?? '',
    '<directors>': metadata.directors.join(dirSep),
    '<director>': metadata.directors[0] ?? '',
    '<genres>': metadata.genres.join(genSep),
    '<genre>': metadata.genres[0] ?? '',
    '<stars>': metadata.actors.join(starSep),
    '<star1>': metadata.actors[0] ?? '',
    '<stars2>': metadata.actors.slice(0, 2).join(starSep),
    '<stars3>': metadata.actors.slice(0, 3).join(starSep),
    '<duration>': metadata.duration?.toString() ?? '',
    '<mpaa>': metadata.mpaa ?? '',
    '<H>': Math.floor(dur / 60).toString(),
    '<M>': (dur % 60).toString(),
    '<aka>': metadata.aka[0] ?? '',
    '<original>': metadata.title,
    '<saved>': options.saved,
  };

  let result = format;
  for (const [token, value] of Object.entries(tokens)) {
    result = result.split(token).join(value);
  }
  return result;
}
