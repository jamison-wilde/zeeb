import { describe, it, expect } from 'vitest';
import { hitTest, type ChipRect } from '../../src/renderer/components/searchPartsDnd';

// three 100px chips with 10px gaps: [0,100] [110,210] [220,320]
const rects: ChipRect[] = [
  { id: 'a', left: 0, right: 100 },
  { id: 'b', left: 110, right: 210 },
  { id: 'c', left: 220, right: 320 },
];

describe('hitTest', () => {
  it('returns merge when over the central band of another chip', () => {
    expect(hitTest(rects, 160, 'a')).toEqual({ type: 'merge', targetId: 'b' });
  });

  it('returns reorder at chip edges and gaps (index is post-removal)', () => {
    // dragging c: remaining order is [a, b]; x=105 sits in the a|b gap → index 1
    expect(hitTest(rects, 105, 'c')).toEqual({ type: 'reorder', index: 1 });
    // dragging a: remaining [b, c]; left edge of b (within 20% inset) → before b → index 0
    expect(hitTest(rects, 112, 'a')).toEqual({ type: 'reorder', index: 0 });
  });

  it('never merges a chip into itself', () => {
    expect(hitTest(rects, 50, 'a')).not.toEqual({ type: 'merge', targetId: 'a' });
  });

  it('returns null outside the strip', () => {
    expect(hitTest(rects, -50, 'a')).toBeNull();
    expect(hitTest(rects, 500, 'a')).toBeNull();
    expect(hitTest([{ id: 'a', left: 0, right: 100 }], 50, 'a')).toBeNull();
  });
});
