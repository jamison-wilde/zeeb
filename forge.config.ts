import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'assets/zeeb',
    name: 'Zeeb Movie Renamer',
  },
  makers: [
    new MakerSquirrel({
      name: 'Zeeb',
      setupIcon: 'assets/zeeb.ico',
      noMsi: true,
    }),
    new MakerDMG({
      icon: 'assets/zeeb.icns',
    }),
    new MakerZIP({}, ['darwin']),
  ],
  hooks: {
    generateAssets: async () => {
      const { execSync } = require('child_process');
      execSync('node scripts/extract-changelog.js', { stdio: 'inherit' });
    },
  },
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/main/index.ts', config: 'vite.main.config.ts', target: 'main' },
        { entry: 'src/preload/main.ts', config: 'vite.preload.config.ts', target: 'preload', name: 'main_preload' },
        { entry: 'src/preload/webview.ts', config: 'vite.preload.config.ts', target: 'preload', name: 'webview_preload' },
      ],
      renderer: [
        { name: 'main_window', config: 'vite.renderer.config.ts' },
      ],
    }),
  ],
};

export default config;
