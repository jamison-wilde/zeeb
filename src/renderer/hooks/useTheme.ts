import { useEffect, useState } from 'react';
import type { PlatformAdapter } from '../../adapters/platform';

export type ThemeSetting = 'dark' | 'light' | 'system';

export function useTheme(theme: ThemeSetting, platform: PlatformAdapter): void {
  const [systemDark, setSystemDark] = useState(true);

  useEffect(() => {
    if (theme !== 'system') return;
    let mounted = true;
    void platform.theme.getSystemIsDark().then((isDark) => {
      if (mounted) setSystemDark(isDark);
    });
    return () => {
      mounted = false;
    };
  }, [theme, platform]);

  useEffect(() => {
    return platform.theme.onSystemThemeChanged(setSystemDark);
  }, [platform]);

  useEffect(() => {
    const resolved =
      theme === 'light' ? 'light'
      : theme === 'system' ? (systemDark ? 'dark' : 'light')
      : 'dark';
    document.documentElement.setAttribute('data-theme', resolved);
  }, [theme, systemDark]);
}
