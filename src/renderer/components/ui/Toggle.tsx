import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  title?: string;
  'data-testid'?: string;
  'aria-label'?: string;
}

export function Toggle({ checked, onChange, label, title, 'data-testid': testId, 'aria-label': ariaLabel }: ToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      data-testid={testId}
      aria-label={ariaLabel}
      className="flex items-center gap-1 shrink-0 cursor-pointer select-none"
      onClick={() => onChange(!checked)}
    >
      {label && (
        <span className={`text-[10px] ${checked ? 'text-ink' : 'text-ink-dim'}`}>{label}</span>
      )}
      <span className={`relative w-[22px] h-3 rounded-md ${checked ? 'bg-accent' : 'bg-toggle-off'}`}>
        <span
          className={`absolute top-[2px] w-2 h-2 rounded-full ${
            checked ? 'right-[2px] bg-on-accent' : 'left-[2px] bg-toggle-knob-off'
          }`}
        />
      </span>
    </button>
  );
}
