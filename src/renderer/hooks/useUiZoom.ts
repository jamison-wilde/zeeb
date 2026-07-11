import { useEffect } from 'react';
import type { PlatformAdapter } from '../../adapters/platform';
import { DEFAULT_CONFIG } from '../../services/configDefaults';

export const UI_ZOOM_MIN = 50;
export const UI_ZOOM_MAX = 250;
export const UI_ZOOM_STEP = 10;

export function clampUiZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return DEFAULT_CONFIG.uiZoom;
  return Math.min(UI_ZOOM_MAX, Math.max(UI_ZOOM_MIN, zoom));
}

/** Applies the persisted UI scale (config.uiZoom, percent) to the window. */
export function useUiZoom(uiZoom: number, platform: PlatformAdapter): void {
  useEffect(() => {
    platform.ui.setZoomFactor(clampUiZoom(uiZoom) / 100);
  }, [uiZoom, platform]);
}
