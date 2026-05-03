import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDualCursor } from '../../../src/renderer/hooks/useDualCursor';
import type { MovieFile } from '../../../src/types';

function makeFile(name: string, id = name): MovieFile {
  return {
    id,
    name,
    nativePath: `/m/${name}`,
    folder: '/m',
    extension: 'mkv',
    size: 0,
    isDvdFolder: false,
    hasNfo: false,
    hasUrl: false,
    hasPoster: false,
    nfoPath: null,
    urlPath: null,
    posterPath: null,
  };
}

describe('useDualCursor', () => {
  it('places initial cursors on the first two visible files via setFromList', () => {
    const files = [makeFile('sample.mkv'), makeFile('a.mkv'), makeFile('b.mkv'), makeFile('c.mkv')];
    const visible = (f: { name: string }) => !f.name.startsWith('sample');
    const { result } = renderHook(() => useDualCursor({ files, isFileVisible: visible }));
    act(() => result.current.setFromList(files));
    expect(result.current.active).toBe(0);
    expect(result.current.index0).toBe(1);
    expect(result.current.index1).toBe(2);
  });

  it('advance() moves the active cursor past current and the other index, then flips active', () => {
    const files = [makeFile('a'), makeFile('b'), makeFile('c'), makeFile('d')];
    const { result } = renderHook(() => useDualCursor({ files, isFileVisible: () => true }));
    act(() => result.current.setFromList(files));
    act(() => result.current.advance());
    expect(result.current.active).toBe(1);
    expect(result.current.index0).toBe(2);
    expect(result.current.index1).toBe(1);
  });

  it('selectAt(N) updates the active cursor and moves the other to next visible after N', () => {
    const files = [makeFile('a'), makeFile('b'), makeFile('c'), makeFile('d')];
    const { result } = renderHook(() => useDualCursor({ files, isFileVisible: () => true }));
    act(() => result.current.setFromList(files));
    act(() => result.current.selectAt(3));
    expect(result.current.index0).toBe(3);
    expect(result.current.index1).toBe(4);
  });
});
