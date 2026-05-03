import type { ZeebConfig } from '../types';
import { DEFAULT_REMOVE_TERMS, DEFAULT_KEEP_TERMS } from '../utils/defaultTerms';

const KNOWN_REGEX_KEYS = [
  'reFilenamePartsSplitter',
  'reImdbTT',
  'reYear',
  'reRating',
  'reDuration',
];

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function parseLegacyXml(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Match leaf tags only (content has no child tags)
  const tagPattern = /<(\w+)>([^<]*)<\/\1>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(xml)) !== null) {
    const key = match[1];
    const value = decodeXmlEntities(match[2]);
    result[key] = value;
  }

  return result;
}

export interface LegacyCustomizations {
  hasCustomRemoveTerms: boolean;
  customRemoveTerms: string[];
  hasCustomKeepTerms: boolean;
  customKeepTerms: string[];
}

export function detectCustomizations(parsed: Record<string, string>): LegacyCustomizations {
  const defaultRemoveSet = new Set(DEFAULT_REMOVE_TERMS.map(t => t.toLowerCase()));
  const defaultKeepSet = new Set(DEFAULT_KEEP_TERMS.map(([m]) => m.toLowerCase()));

  const removeTerms = parsed.removeTerms
    ? parsed.removeTerms.split(',').map(t => t.trim()).filter(Boolean)
    : [];
  const keepTerms = parsed.keepTerms
    ? parsed.keepTerms.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const customRemoveTerms = removeTerms.filter(t => !defaultRemoveSet.has(t.toLowerCase()));
  const customKeepTerms = keepTerms.filter(t => !defaultKeepSet.has(t.toLowerCase()));

  return {
    hasCustomRemoveTerms: customRemoveTerms.length > 0,
    customRemoveTerms,
    hasCustomKeepTerms: customKeepTerms.length > 0,
    customKeepTerms,
  };
}

export function migrateLegacyConfig(parsed: Record<string, string>): Partial<ZeebConfig> {
  const config: Partial<ZeebConfig> = {};

  // Format strings
  if (parsed.formatStandard) config.formatStandard = parsed.formatStandard;
  if (parsed.formatAka) config.formatAka = parsed.formatAka;
  if (parsed.formatDvd) config.formatDvd = parsed.formatDvd;
  if (parsed.formatPoster) config.formatPoster = parsed.formatPoster;
  if (parsed.formatUrl) config.formatUrl = parsed.formatUrl;

  // Booleans
  if (parsed.removeThe) config.removeThe = parsed.removeThe === 'true';
  if (parsed.swapThe) config.swapThe = parsed.swapThe === 'true';
  if (parsed.renameFolder) config.renameFolder = parsed.renameFolder === 'true';
  if (parsed.createUrlFile) config.createUrlFile = parsed.createUrlFile === 'true';
  if (parsed.createPoster) config.createPoster = parsed.createPoster === 'true';
  if (parsed.scanNfo) config.scanNfo = parsed.scanNfo === 'true';
  if (parsed.showWebView) config.showWebView = parsed.showWebView === 'true';

  // Comma-separated terms: merge custom terms on top of new defaults
  if (parsed.removeTerms) {
    const legacyTerms = parsed.removeTerms.split(',').map(t => t.trim()).filter(Boolean);
    const defaultSet = new Set(DEFAULT_REMOVE_TERMS.map(t => t.toLowerCase()));
    const customTerms = legacyTerms.filter(t => !defaultSet.has(t.toLowerCase()));
    config.removeTerms = [...DEFAULT_REMOVE_TERMS, ...customTerms];
  }

  if (parsed.keepTerms) {
    const legacyTerms = parsed.keepTerms.split(',').map(t => t.trim()).filter(Boolean);
    const defaultSet = new Set(DEFAULT_KEEP_TERMS.map(([m]) => m.toLowerCase()));
    const customTerms: Array<[string, string]> = legacyTerms
      .filter(t => !defaultSet.has(t.toLowerCase()))
      .map(t => [t, t] as [string, string]);
    config.keepTerms = [...DEFAULT_KEEP_TERMS, ...customTerms];
  }

  // Custom regex patterns
  const regexPatterns: Record<string, string> = {};
  let hasRegex = false;
  for (const key of KNOWN_REGEX_KEYS) {
    if (parsed[key]) {
      regexPatterns[key] = parsed[key];
      hasRegex = true;
    }
  }
  if (hasRegex) {
    config.customRegexPatterns = regexPatterns;
  }

  // Numeric values
  if (parsed.htmlZoom) config.htmlZoom = parseFloat(parsed.htmlZoom);

  // String values
  if (parsed.titleSpaceChar) config.titleSpaceChar = parsed.titleSpaceChar;
  if (parsed.directorSeparator) config.directorSeparator = parsed.directorSeparator;
  if (parsed.genreSeparator) config.genreSeparator = parsed.genreSeparator;
  if (parsed.starSeparator) config.starSeparator = parsed.starSeparator;

  return config;
}
