import { useCallback, useState, useRef, useEffect } from 'react';
import type { MovieFile } from '../../types';

interface UseDualCursorArgs {
  files: MovieFile[];
  isFileVisible: (f: { name: string }) => boolean;
}

export interface DualCursor {
  active: 0 | 1;
  index0: number;
  index1: number;
  setFromList: (files: MovieFile[]) => void;
  advance: () => void;
  selectAt: (clickedIndex: number) => void;
}

export function useDualCursor({ files, isFileVisible }: UseDualCursorArgs): DualCursor {
  const [active, setActive] = useState<0 | 1>(0);
  const [index0, setIndex0] = useState(0);
  const [index1, setIndex1] = useState(1);

  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const findNextVisible = useCallback((from: number, otherIdx: number): number => {
    const list = filesRef.current;
    let idx = from;
    while (idx < list.length && (!isFileVisible(list[idx]) || idx === otherIdx)) {
      idx += 1;
    }
    return idx;
  }, [isFileVisible]);

  const setFromList = useCallback((next: MovieFile[]) => {
    filesRef.current = next;
    let idx0 = 0;
    while (idx0 < next.length && !isFileVisible(next[idx0])) idx0 += 1;
    let idx1 = idx0 + 1;
    while (idx1 < next.length && !isFileVisible(next[idx1])) idx1 += 1;
    setIndex0(idx0);
    setIndex1(idx1);
    setActive(0);
  }, [isFileVisible]);

  const advance = useCallback(() => {
    if (active === 0) {
      setIndex0((prev) => findNextVisible(prev + 1, index1));
      setActive(1);
    } else {
      setIndex1((prev) => findNextVisible(prev + 1, index0));
      setActive(0);
    }
  }, [active, index0, index1, findNextVisible]);

  const selectAt = useCallback((clickedIndex: number) => {
    if (active === 0) {
      setIndex0(clickedIndex);
      setIndex1(findNextVisible(clickedIndex + 1, clickedIndex));
    } else {
      setIndex1(clickedIndex);
      setIndex0(findNextVisible(clickedIndex + 1, clickedIndex));
    }
  }, [active, findNextVisible]);

  return { active, index0, index1, setFromList, advance, selectAt };
}
