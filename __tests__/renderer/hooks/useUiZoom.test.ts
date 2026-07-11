import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUiZoom, clampUiZoom } from '../../../src/renderer/hooks/useUiZoom';
import { createMockPlatformAdapter } from '../../../src/adapters/platform';

describe('useUiZoom', () => {
  it('applies the configured zoom percent as a factor and follows changes', () => {
    const setZoomFactor = vi.fn();
    const platform = createMockPlatformAdapter({ ui: { setZoomFactor } });
    const { rerender } = renderHook(({ z }) => useUiZoom(z, platform), {
      initialProps: { z: 130 },
    });
    expect(setZoomFactor).toHaveBeenCalledWith(1.3);
    rerender({ z: 150 });
    expect(setZoomFactor).toHaveBeenLastCalledWith(1.5);
  });

  it('clamps out-of-range values before applying', () => {
    const setZoomFactor = vi.fn();
    const platform = createMockPlatformAdapter({ ui: { setZoomFactor } });
    renderHook(() => useUiZoom(400, platform));
    expect(setZoomFactor).toHaveBeenCalledWith(2.5);
  });
});

describe('clampUiZoom', () => {
  it('clamps to the 50-250 range and defaults non-finite values', () => {
    expect(clampUiZoom(10)).toBe(50);
    expect(clampUiZoom(400)).toBe(250);
    expect(clampUiZoom(130)).toBe(130);
    expect(clampUiZoom(Number.NaN)).toBe(130);
  });
});
