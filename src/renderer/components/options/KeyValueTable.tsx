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
    <div className="border border-gray-300 rounded overflow-hidden">
      <div className="grid grid-cols-[3fr_5fr_32px] bg-gray-100 text-xs font-semibold text-gray-600">
        <div className="px-2 py-1.5 border-r border-gray-200">{leftHeader}</div>
        <div className="px-2 py-1.5 border-r border-gray-200">{rightHeader}</div>
        <div />
      </div>
      {visibleRows.map(([originalIndex, [left, right]]) => (
        <div key={originalIndex} className="grid grid-cols-[3fr_5fr_32px] border-t border-gray-200">
          <input className="px-2 py-1 text-sm border-r border-gray-200 outline-none" placeholder={leftPlaceholder} value={left} onChange={(e) => handleCellChange(originalIndex, 0, e.target.value)} />
          <input className="px-2 py-1 text-sm border-r border-gray-200 outline-none" placeholder={rightPlaceholder} value={right} onChange={(e) => handleCellChange(originalIndex, 1, e.target.value)} />
          <button data-testid="kv-remove" className="text-red-400 hover:text-red-600 text-sm font-bold" onClick={() => handleRemove(originalIndex)}>×</button>
        </div>
      ))}
      <div className="border-t border-gray-200 p-1.5">
        <button data-testid="kv-add" className="text-sm text-blue-500 hover:text-blue-700" onClick={handleAdd}>+ Add</button>
      </div>
    </div>
  );
}
