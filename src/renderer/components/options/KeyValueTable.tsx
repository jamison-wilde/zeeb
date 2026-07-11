import React, { useCallback } from 'react';

interface KeyValueTableProps {
  values: Array<[string, string]>;
  onChange: (values: Array<[string, string]>) => void;
  leftHeader: string;
  rightHeader: string;
  leftPlaceholder?: string;
  rightPlaceholder?: string;
  filter?: string;
}

export function KeyValueTable({
  values, onChange, leftHeader, rightHeader, leftPlaceholder, rightPlaceholder, filter,
}: KeyValueTableProps): React.JSX.Element {
  const handleCellChange = useCallback(
    (rowIndex: number, colIndex: 0 | 1, value: string) => {
      const updated = values.map((row, i) => {
        if (i !== rowIndex) return row;
        const copy: [string, string] = [...row];
        copy[colIndex] = value;
        return copy;
      });
      onChange(updated);
    },
    [values, onChange],
  );

  const handleRemove = useCallback(
    (index: number) => { onChange(values.filter((_, i) => i !== index)); },
    [values, onChange],
  );

  const handleAdd = useCallback(() => {
    onChange([...values, ['', '']]);
  }, [values, onChange]);

  const visibleRows = filter
    ? values.map((pair, i) => [i, pair] as const).filter(([, [m, d]]) => {
        const f = filter.toLowerCase();
        return m.toLowerCase().includes(f) || d.toLowerCase().includes(f);
      })
    : values.map((pair, i) => [i, pair] as const);

  return (
    <div className="border border-line rounded overflow-hidden">
      <div className="grid grid-cols-[3fr_5fr_32px] bg-raised text-xs font-semibold text-ink-2">
        <div className="px-2 py-1.5 border-r border-line-subtle">{leftHeader}</div>
        <div className="px-2 py-1.5 border-r border-line-subtle">{rightHeader}</div>
        <div />
      </div>
      {visibleRows.map(([originalIndex, [left, right]]) => (
        <div key={originalIndex} className="grid grid-cols-[3fr_5fr_32px] border-t border-line-subtle">
          <input className="px-2 py-1 text-sm border-r border-line-subtle outline-none bg-panel text-ink" placeholder={leftPlaceholder} value={left} onChange={(e) => handleCellChange(originalIndex, 0, e.target.value)} />
          <input className="px-2 py-1 text-sm border-r border-line-subtle outline-none bg-panel text-ink" placeholder={rightPlaceholder} value={right} onChange={(e) => handleCellChange(originalIndex, 1, e.target.value)} />
          <button data-testid="kv-remove" className="text-part-remove hover:text-part-remove-always text-sm font-bold" onClick={() => handleRemove(originalIndex)}>×</button>
        </div>
      ))}
      <div className="border-t border-line-subtle p-1.5">
        <button data-testid="kv-add" className="text-sm text-accent hover:underline" onClick={handleAdd}>+ Add</button>
      </div>
    </div>
  );
}
