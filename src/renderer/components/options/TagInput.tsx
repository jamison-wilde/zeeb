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
    <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded bg-white min-h-[38px]">
      {visibleTags.map(([originalIndex, v]) => (
        <span
          key={`${v}-${originalIndex}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-sm"
        >
          {v}
          <button
            data-testid="tag-remove"
            className="text-blue-500 hover:text-blue-700 font-bold leading-none"
            onClick={() => removeTag(originalIndex)}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[80px] outline-none text-sm"
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
