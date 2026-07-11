import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { SearchPart, SearchPartState } from '../../types';
import { SearchPartItem } from './SearchPartItem';
import * as dnd from './searchPartsDnd';
import type { ChipRect, DropTarget } from './searchPartsDnd';

interface SearchPartsProps {
  parts: SearchPart[];
  onPartStateChange: (id: string, state: SearchPartState) => void;
  onPartTextChange: (id: string, text: string) => void;
  onSearch: () => void;
  onMergeParts?: (sourceId: string, targetId: string) => void;
  onReorderParts?: (sourceId: string, targetIndex: number) => void;
}

interface PendingDrag {
  sourceId: string;
  pointerId: number;
  startX: number;
  startY: number;
}

interface ActiveDrag extends PendingDrag {
  x: number;
  target: DropTarget;
  text: string;
  caretX: number | null;
}

export function SearchParts({
  parts,
  onPartStateChange,
  onPartTextChange,
  onSearch,
  onMergeParts,
  onReorderParts,
}: SearchPartsProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<PendingDrag | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drag, setDrag] = useState<ActiveDrag | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const chipRects = useCallback((): ChipRect[] => {
    const container = containerRef.current;
    if (!container) return [];
    return Array.from(container.querySelectorAll<HTMLElement>('[data-part-id]')).map((el) => {
      const r = el.getBoundingClientRect();
      return { id: el.dataset.partId as string, left: r.left, right: r.right };
    });
  }, []);

  const caretFor = useCallback(
    (target: DropTarget, rects: ChipRect[], sourceId: string): number | null => {
      if (!target || target.type !== 'reorder') return null;
      const others = rects.filter((r) => r.id !== sourceId);
      if (target.index >= others.length) return others.length ? others[others.length - 1].right + 1 : null;
      return others[target.index].left - 2;
    },
    [],
  );

  const beginDrag = useCallback(
    (pending: PendingDrag, x: number) => {
      const text = parts.find((p) => p.id === pending.sourceId)?.text ?? '';
      const rects = chipRects();
      const target = dnd.hitTest(rects, x, pending.sourceId);
      setDrag({ ...pending, x, target, text, caretX: caretFor(target, rects, pending.sourceId) });
      pendingRef.current = null;
      const active = document.activeElement as HTMLElement | null;
      active?.blur?.();
    },
    [parts, chipRects, caretFor],
  );

  const endDrag = useCallback(() => {
    clearLongPress();
    pendingRef.current = null;
    setDrag(null);
  }, [clearLongPress]);

  useEffect(() => {
    if (!drag) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') endDrag();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drag, endDrag]);

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = e.target as HTMLElement;
      if (el.closest('button')) return; // state buttons act on click, never drag
      const chip = el.closest<HTMLElement>('[data-part-id]');
      if (!chip) return;
      const pending: PendingDrag = {
        sourceId: chip.dataset.partId as string,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
      };
      pendingRef.current = pending;
      if (e.pointerType === 'touch') {
        clearLongPress();
        longPressTimer.current = setTimeout(() => {
          if (pendingRef.current === pending) beginDrag(pending, pending.startX);
        }, dnd.LONG_PRESS_MS);
      }
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [beginDrag, clearLongPress],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (drag && e.pointerId === drag.pointerId) {
        e.preventDefault();
        const rects = chipRects();
        const target = dnd.hitTest(rects, e.clientX, drag.sourceId);
        setDrag({ ...drag, x: e.clientX, target, caretX: caretFor(target, rects, drag.sourceId) });
        return;
      }
      const pending = pendingRef.current;
      if (!pending || e.pointerId !== pending.pointerId) return;
      const moved = Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY);
      if (moved <= dnd.DRAG_THRESHOLD_PX) return;
      if (e.pointerType === 'touch') {
        // moved before long-press fired: this is a scroll, not a drag
        clearLongPress();
        pendingRef.current = null;
      } else {
        beginDrag(pending, e.clientX);
      }
    },
    [drag, beginDrag, chipRects, caretFor, clearLongPress],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (drag && e.pointerId === drag.pointerId) {
        if (drag.target?.type === 'merge') onMergeParts?.(drag.sourceId, drag.target.targetId);
        if (drag.target?.type === 'reorder') onReorderParts?.(drag.sourceId, drag.target.index);
      }
      endDrag();
    },
    [drag, onMergeParts, onReorderParts, endDrag],
  );

  return (
    <div
      ref={containerRef}
      data-testid="search-parts-row"
      className="relative flex flex-nowrap gap-1 px-2 py-1.5"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={endDrag}
    >
      {parts.map((part) => (
        <SearchPartItem
          key={part.id}
          part={part}
          onStateChange={onPartStateChange}
          onTextChange={onPartTextChange}
          dragging={drag?.sourceId === part.id}
          mergeHighlight={drag?.target?.type === 'merge' && drag.target.targetId === part.id}
        />
      ))}
      {drag && drag.caretX !== null && containerRef.current && (
        <span
          className="pointer-events-none fixed w-[3px] bg-accent z-50"
          style={{
            left: drag.caretX,
            top: containerRef.current.getBoundingClientRect().top + 4,
            height: containerRef.current.getBoundingClientRect().height - 8,
          }}
        />
      )}
      {drag && (
        <span
          className="pointer-events-none fixed z-50 font-mono text-chip-title font-semibold px-2 py-0.5 rounded border border-accent bg-chip text-ink-bright"
          style={{
            left: drag.x + 8,
            top: containerRef.current
              ? containerRef.current.getBoundingClientRect().top - 6
              : 0,
          }}
        >
          {drag.text}
        </span>
      )}
    </div>
  );
}
