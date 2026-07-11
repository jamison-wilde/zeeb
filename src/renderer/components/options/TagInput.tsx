import React, { useState, useCallback } from 'react';

interface TagInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  filter?: string;
}

export function TagInput({ values, onChange, placeholder, filter }: TagInputProps): React.JSX.Element {
  const [input, setInput] = useState('');

  const addTag = useCallback(
    (raw: string) => {
      const tag = raw.replace(/,/g, '').trim();
      if (tag && !values.includes(tag)) {
        onChange([...values, tag]);
      }
      setInput('');
    },
    [values, onChange],
  );

  const removeTag = useCallback(
    (index: number) => {
      onChange(values.filter((_, i) => i !== index));
    },
    [values, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag(input);
      }
    },
    [input, addTag],
  );

  const visibleTags = filter
    ? values.map((v, i) => [i, v] as const).filter(([, v]) => v.toLowerCase().includes(filter.toLowerCase()))
    : values.map((v, i) => [i, v] as const);

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border border-line rounded bg-panel min-h-[38px]">
      {visibleTags.map(([originalIndex, v]) => (
        <span
          key={`${v}-${originalIndex}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-row-selected text-accent rounded text-sm"
        >
          {v}
          <button
            data-testid="tag-remove"
            className="text-accent hover:opacity-70 font-bold leading-none"
            onClick={() => removeTag(originalIndex)}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[80px] outline-none text-sm bg-transparent text-ink"
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
