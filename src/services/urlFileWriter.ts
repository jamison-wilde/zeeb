export interface UrlFileOptions {
  url: string;
  originalPath: string;
  nfoContent: string | null;
}

/**
 * Generates Windows .url file content in INI format.
 */
export function generateUrlFileContent(options: UrlFileOptions): string {
  const lines: string[] = [
    '[InternetShortcut]',
    `URL=${options.url}`,
    '',
    '[OriginalFilename]',
    `NAME=${options.originalPath}`,
  ];

  if (options.nfoContent) {
    lines.push('');
    lines.push('[NFO]');
    for (const line of options.nfoContent.split('\n')) {
      lines.push(`NFO=${line}`);
    }
  }

  return lines.join('\r\n') + '\r\n';
}

/**
 * Generates macOS .webloc plist XML content.
 */
function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function generateWeblocContent(url: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>URL</key>
\t<string>${escapeXml(url)}</string>
</dict>
</plist>
`;
}
