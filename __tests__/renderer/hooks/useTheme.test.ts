import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme, type ThemeSetting } from '../../../src/renderer/hooks/useTheme';
import { createMockPlatformAdapter } from '../../../src/adapters/platform';

describe('useTheme', () => {
  it('applies explicit dark and light themes', () => {
    const platform = createMockPlatformAdapter();
    const { rerender } = renderHook(({ t }) => useTheme(t, platform), {
      initialProps: { t: 'dark' as ThemeSetting },
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    rerender({ t: 'light' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('resolves system from the platform and follows live changes', async () => {
    let listener: (isDark: boolean) => void = () => {};
    const platform = createMockPlatformAdapter({
      theme: {
        getSystemIsDark: async () => false,
        onSystemThemeChanged: (cb: (isDark: boolean) => void) => {
          listener = cb;
          return () => {};
        },
      },
    });
    renderHook(() => useTheme('system', platform));
    await act(async () => {});
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    act(() => listener(true));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('falls back to dark for unknown values', () => {
    const platform = createMockPlatformAdapter();
    renderHook(() => useTheme('purple' as never, platform));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
