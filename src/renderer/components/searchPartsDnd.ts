export const DRAG_THRESHOLD_PX = 5;
export const LONG_PRESS_MS = 350;
export const MERGE_BAND_RATIO = 0.6;

export interface ChipRect {
  id: string;
  left: number;
  right: number;
}

export type DropTarget =
  | { type: 'merge'; targetId: string }
  | { type: 'reorder'; index: number }
  | null;

/**
 * Classify a drop position. Over the central band of another chip = merge;
 * over gaps or chip edges = reorder (index into the array with the source
 * removed); outside the strip = null (abort).
 */
export function hitTest(rects: ChipRect[], x: number, sourceId: string): DropTarget {
  const others = rects.filter((r) => r.id !== sourceId);
  if (others.length === 0) return null;
  if (x < others[0].left || x > others[others.length - 1].right) return null;

  for (const r of others) {
    const inset = ((r.right - r.left) * (1 - MERGE_BAND_RATIO)) / 2;
    if (x >= r.left + inset && x <= r.right - inset) {
      return { type: 'merge', targetId: r.id };
    }
  }

  let index = others.length;
  for (let i = 0; i < others.length; i++) {
    if (x < (others[i].left + others[i].right) / 2) {
      index = i;
      break;
    }
  }
  return { type: 'reorder', index };
}
