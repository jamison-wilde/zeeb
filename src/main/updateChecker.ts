import { app, BrowserWindow } from 'electron';
import https from 'node:https';
import path from 'node:path';
import fs from 'node:fs';
import { isNewerVersion } from '../services/versionCompare';

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface ReleaseData {
  version: string;
  releaseNotes: string;
  releaseUrl: string;
  assets: Array<{ name: string; url: string; size: number }>;
}

function fetchLatestRelease(): Promise<ReleaseData | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/jamison-wilde/zeeb/releases/latest',
      headers: { 'User-Agent': 'Zeeb-Movie-Renamer' },
    };

    const req = https.get(options, (res) => {
      if (res.statusCode !== 200) { resolve(null); res.resume(); return; }
      let body = '';
      res.on('data', (chunk: string) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({
            version: (data.tag_name || '').replace(/^v/, ''),
            releaseNotes: data.body || '',
            releaseUrl: data.html_url || '',
            assets: (data.assets || []).map((a: ReleaseAsset) => ({
              name: a.name,
              url: a.browser_download_url,
              size: a.size,
            })),
          });
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
  });
}

export function downloadAsset(
  url: string,
  window: BrowserWindow,
): void {
  const fileName = url.split('/').pop() || 'download';
  const downloadsPath = app.getPath('downloads');
  const filePath = path.join(downloadsPath, fileName);

  const follow = (downloadUrl: string) => {
    https.get(downloadUrl, { headers: { 'User-Agent': 'Zeeb-Movie-Renamer' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        const location = res.headers.location;
        if (location) { follow(location); return; }
      }

      if (res.statusCode !== 200) {
        window.webContents.send('update:download-error', { message: `HTTP ${res.statusCode}` });
        res.resume();
        return;
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let bytesDownloaded = 0;
      const file = fs.createWriteStream(filePath);

      res.on('data', (chunk: Buffer) => {
        bytesDownloaded += chunk.length;
        const percent = totalBytes > 0 ? Math.round((bytesDownloaded / totalBytes) * 100) : 0;
        window.webContents.send('update:download-progress', { percent, bytesDownloaded, totalBytes });
      });

      res.pipe(file);

      file.on('finish', () => {
        file.close();
        window.webContents.send('update:download-complete', { filePath });
      });

      file.on('error', (err) => {
        fs.unlink(filePath, () => {});
        window.webContents.send('update:download-error', { message: err.message });
      });
    }).on('error', (err) => {
      window.webContents.send('update:download-error', { message: err.message });
    });
  };

  follow(url);
}

export function checkForUpdates(window: BrowserWindow, skipVersion: string | null): void {
  setTimeout(async () => {
    const release = await fetchLatestRelease();
    if (!release) return;
    if (!isNewerVersion(release.version, app.getVersion())) return;
    if (skipVersion === release.version) return;
    window.webContents.send('update:available', release);
  }, 5000);
}
