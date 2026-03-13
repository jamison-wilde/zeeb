export interface UrlFileOptions {
  url: string;
  originalPath?: string;
  includeOriginal?: boolean;
  nfoContent: string | null;
}

export interface WeblocOptions {
  url: string;
  originalPath?: string;
  nfoContent?: string | null;
}

/**
 * Generates Windows .url file content in INI format.
 */
export function generateUrlFileContent(options: UrlFileOptions): string {
  const lines: string[] = [
    '[InternetShortcut]',
    `URL=${options.url}`,
  ];

  if (options.includeOriginal && options.originalPath) {
    lines.push('');
    lines.push('[OriginalFilename]');
    lines.push(`NAME=${options.originalPath}`);
  }

  if (options.nfoContent) {
    lines.push('');
    lines.push('[NFO]');
    options.nfoContent.split('\n').forEach((line, i) => {
      lines.push(`LINE${i}=${line}`);
    });
  }

  return lines.join('\r\n') + '\r\n';
}

/**
 * Generates macOS .webloc plist XML content.
 */
function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function generateWeblocContent(options: WeblocOptions | string): string {
  const url = typeof options === 'string' ? options : options.url;
  const originalPath = typeof options === 'string' ? undefined : options.originalPath;
  const nfoContent = typeof options === 'string' ? undefined : options.nfoContent;

  const extraEntries: string[] = [];

  if (originalPath) {
    extraEntries.push(`\t<key>OriginalFilename</key>`);
    extraEntries.push(`\t<string>${escapeXml(originalPath)}</string>`);
  }

  if (nfoContent) {
    extraEntries.push(`\t<key>NFOContent</key>`);
    extraEntries.push(`\t<string>${escapeXml(nfoContent)}</string>`);
  }

  const extraBlock = extraEntries.length > 0 ? '\n' + extraEntries.join('\n') : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>URL</key>
\t<string>${escapeXml(url)}</string>${extraBlock}
</dict>
</plist>
`;
}
