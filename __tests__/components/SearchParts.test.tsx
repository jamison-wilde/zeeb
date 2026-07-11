import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { SearchParts } from '../../src/renderer/components/SearchParts';
import type { SearchPart } from '../../src/types';
import * as dnd from '../../src/renderer/components/searchPartsDnd';

// vi.spyOn cannot redefine ES-module namespace exports; use spy-mode mocking.
// Place this at the top of the file with the other imports (it is hoisted):
vi.mock(import('../../src/renderer/components/searchPartsDnd'), { spy: true });

const parts: SearchPart[] = [
  { id: '0', text: 'The', state: 'search', originalText: 'The', editable: true },
  { id: '1', text: 'Matrix', state: 'search', originalText: 'Matrix', editable: true },
  { id: '2', text: 'BluRay', state: 'remove', originalText: 'BluRay', editable: true },
];

describe('SearchParts', () => {
  it('renders all parts', () => {
    render(
      <SearchParts parts={parts} onPartStateChange={vi.fn()} onPartTextChange={vi.fn()} onSearch={vi.fn()} />
    );
    expect(screen.getByDisplayValue('The')).toBeDefined();
    expect(screen.getByDisplayValue('Matrix')).toBeDefined();
    expect(screen.getByDisplayValue('BluRay')).toBeDefined();
  });

  it('passes onSearch prop through (search button is in parent component)', () => {
    const onSearch = vi.fn();
    render(
      <SearchParts parts={parts} onPartStateChange={vi.fn()} onPartTextChange={vi.fn()} onSearch={onSearch} />
    );
    // Search button was moved to the Renamer filename bar
    expect(screen.getByDisplayValue('The')).toBeDefined();
  });

  it('lights exactly one state button per chip', () => {
    render(
      <SearchParts parts={parts} onPartStateChange={vi.fn()} onPartTextChange={vi.fn()} onSearch={vi.fn()} />
    );
    const chip = screen.getByDisplayValue('BluRay').closest('[data-part-id]') as HTMLElement;
    const lit = chip.querySelectorAll('button[aria-pressed="true"]');
    expect(lit).toHaveLength(1);
    expect(lit[0].getAttribute('title')).toBe('Remove');
  });

  it('changes state from both button rows', () => {
    const onStateChange = vi.fn();
    render(
      <SearchParts parts={parts} onPartStateChange={onStateChange} onPartTextChange={vi.fn()} onSearch={vi.fn()} />
    );
    const chip = screen.getByDisplayValue('Matrix').closest('[data-part-id]') as HTMLElement;
    fireEvent.click(chip.querySelector('button[title="Keep"]')!);
    expect(onStateChange).toHaveBeenCalledWith('1', 'keep');
    fireEvent.click(chip.querySelector('button[title="Never"]')!);
    expect(onStateChange).toHaveBeenCalledWith('1', 'removeAlways');
  });
});

function chipOf(text: string): HTMLElement {
  return screen.getByDisplayValue(text).closest('[data-part-id]') as HTMLElement;
}

describe('drag interactions', () => {
  afterEach(() => {
    vi.mocked(dnd.hitTest).mockRestore();
  });

  it('merges when hit-test reports merge', () => {
    const onMerge = vi.fn();
    vi.mocked(dnd.hitTest).mockReturnValue({ type: 'merge', targetId: '1' });
    render(
      <SearchParts parts={parts} onPartStateChange={vi.fn()} onPartTextChange={vi.fn()} onSearch={vi.fn()}
        onMergeParts={onMerge} onReorderParts={vi.fn()} />
    );
    const chip = chipOf('The');
    fireEvent.pointerDown(chip, { pointerId: 1, clientX: 10, clientY: 5, pointerType: 'mouse' });
    fireEvent.pointerMove(chip, { pointerId: 1, clientX: 60, clientY: 5, pointerType: 'mouse' });
    fireEvent.pointerUp(chip, { pointerId: 1, clientX: 60, clientY: 5, pointerType: 'mouse' });
    expect(onMerge).toHaveBeenCalledWith('0', '1');
  });

  it('reorders when hit-test reports reorder', () => {
    const onReorder = vi.fn();
    vi.mocked(dnd.hitTest).mockReturnValue({ type: 'reorder', index: 2 });
    render(
      <SearchParts parts={parts} onPartStateChange={vi.fn()} onPartTextChange={vi.fn()} onSearch={vi.fn()}
        onMergeParts={vi.fn()} onReorderParts={onReorder} />
    );
    const chip = chipOf('The');
    fireEvent.pointerDown(chip, { pointerId: 1, clientX: 10, clientY: 5, pointerType: 'mouse' });
    fireEvent.pointerMove(chip, { pointerId: 1, clientX: 90, clientY: 5, pointerType: 'mouse' });
    fireEvent.pointerUp(chip, { pointerId: 1, clientX: 90, clientY: 5, pointerType: 'mouse' });
    expect(onReorder).toHaveBeenCalledWith('0', 2);
  });

  it('does not drag below the movement threshold (click still edits)', () => {
    const onMerge = vi.fn();
    const onReorder = vi.fn();
    render(
      <SearchParts parts={parts} onPartStateChange={vi.fn()} onPartTextChange={vi.fn()} onSearch={vi.fn()}
        onMergeParts={onMerge} onReorderParts={onReorder} />
    );
    const chip = chipOf('The');
    fireEvent.pointerDown(chip, { pointerId: 1, clientX: 10, clientY: 5, pointerType: 'mouse' });
    fireEvent.pointerMove(chip, { pointerId: 1, clientX: 12, clientY: 5, pointerType: 'mouse' });
    fireEvent.pointerUp(chip, { pointerId: 1, clientX: 12, clientY: 5, pointerType: 'mouse' });
    expect(onMerge).not.toHaveBeenCalled();
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('cancels a pending long-press timer on unmount', () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(
        <SearchParts parts={parts} onPartStateChange={vi.fn()} onPartTextChange={vi.fn()} onSearch={vi.fn()}
          onMergeParts={vi.fn()} onReorderParts={vi.fn()} />
      );
      const chip = chipOf('The');
      fireEvent.pointerDown(chip, { pointerId: 1, clientX: 10, clientY: 5, pointerType: 'touch' });
      unmount();
      vi.advanceTimersByTime(400);
      expect(vi.mocked(dnd.hitTest)).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
