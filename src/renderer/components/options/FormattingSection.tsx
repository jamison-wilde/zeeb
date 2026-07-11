// src/renderer/components/options/FormattingSection.tsx
import React, { useCallback, useRef, useState } from 'react';
import type { ZeebConfig } from '../../../types';

interface FormattingSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

type FormatKey = 'formatStandard' | 'formatAka' | 'formatDvd' | 'formatDvdAka' | 'formatPoster' | 'formatUrl';

type FormatFieldDef = { key: string; label: string; testId: string };

function getVisibleFields(config: ZeebConfig): FormatFieldDef[] {
  const fields: FormatFieldDef[] = [
    { key: 'formatStandard', label: 'Standard Format', testId: 'format-standard-input' },
    { key: 'formatAka', label: 'AKA Format', testId: 'format-aka-input' },
  ];
  if (config.separateDvdFormat) {
    fields.push(
      { key: 'formatDvd', label: 'DVD Folder Format', testId: 'format-dvd-input' },
      { key: 'formatDvdAka', label: 'DVD AKA Format', testId: 'format-dvd-aka-input' },
    );
  }
  if (config.separatePosterFormat) {
    fields.push({ key: 'formatPoster', label: 'Poster Format', testId: 'format-poster-input' });
  }
  if (config.separateUrlFormat) {
    fields.push({ key: 'formatUrl', label: 'URL File Format', testId: 'format-url-input' });
  }
  return fields;
}

const TOKENS = [
  { token: '<title>', short: '<t>', desc: 'Movie title', testId: 'token-title' },
  { token: '<year>', short: '<y>', desc: 'Release year', testId: 'token-year' },
  { token: '<imdb>', short: '<tt>', desc: 'IMDB tt number', testId: 'token-imdb' },
  { token: '<rating100>', short: '<r100>', desc: 'Rating 0\u2013100', testId: 'token-rating100' },
  { token: '<rating10>', short: '<r10>', desc: 'Rating 0\u201310', testId: 'token-rating10' },
  { token: '<saved>', short: '<s>', desc: 'Saved/kept parts', testId: 'token-saved' },
  { token: '<aka>', short: '<a>', desc: 'Also Known As', testId: 'token-aka' },
  { token: '<directors>', short: '<d>', desc: 'All directors', testId: 'token-directors' },
  { token: '<director>', short: '<d1>', desc: 'First director', testId: 'token-director' },
  { token: '<genres>', short: '<g>', desc: 'All genres', testId: 'token-genres' },
  { token: '<genre>', short: '<g1>', desc: 'First genre', testId: 'token-genre' },
  { token: '<stars>', short: '', desc: 'All stars', testId: 'token-stars' },
  { token: '<star1>', short: '', desc: 'First star', testId: 'token-star1' },
  { token: '<stars2>', short: '', desc: 'First 2 stars', testId: 'token-stars2' },
  { token: '<stars3>', short: '', desc: 'First 3 stars', testId: 'token-stars3' },
  { token: '<mpaa>', short: '<c>', desc: 'MPAA rating', testId: 'token-mpaa' },
  { token: '<duration>', short: '', desc: 'Duration (min)', testId: 'token-duration' },
  { token: '<H>', short: '', desc: 'Hours', testId: 'token-h' },
  { token: '<M>', short: '', desc: 'Minutes', testId: 'token-m' },
  { token: '<original>', short: '<o>', desc: 'Original filename', testId: 'token-original' },
] as const;

export function FormattingSection({ config, updateConfig }: FormattingSectionProps): React.JSX.Element {
  const [focusedField, setFocusedField] = useState<FormatKey | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleTokenClick = useCallback(
    (token: string) => {
      if (!focusedField) return;
      const input = inputRefs.current[focusedField];
      if (!input) return;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      const current = (config as unknown as Record<string, unknown>)[focusedField] as string;
      const newValue = current.slice(0, start) + token + current.slice(end);
      updateConfig({ [focusedField]: newValue });
      // Restore cursor after React re-render
      requestAnimationFrame(() => {
        input.focus();
        const pos = start + token.length;
        input.setSelectionRange(pos, pos);
      });
    },
    [focusedField, config, updateConfig],
  );

  const visibleFields = getVisibleFields(config);

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-3">
        <p className="text-xs text-ink-faint mb-3">
          Use <code>/</code> in format strings to create subfolders.
        </p>
        <div className="space-y-1 mb-3">
          <label className="flex items-center gap-2 text-xs text-ink-2">
            <input type="checkbox" checked={config.separateDvdFormat}
              onChange={(e) => updateConfig({ separateDvdFormat: e.target.checked })} />
            Use separate DVD folder format.
          </label>
          <label className="flex items-center gap-2 text-xs text-ink-2">
            <input type="checkbox" checked={config.separatePosterFormat}
              onChange={(e) => updateConfig({ separatePosterFormat: e.target.checked })} />
            Use separate poster format.
          </label>
          <label className="flex items-center gap-2 text-xs text-ink-2">
            <input type="checkbox" checked={config.separateUrlFormat}
              onChange={(e) => updateConfig({ separateUrlFormat: e.target.checked })} />
            Use separate URL file format.
          </label>
        </div>
        {visibleFields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-ink-2 mb-1">{f.label}</label>
            <input
              ref={(el) => { inputRefs.current[f.key] = el; }}
              data-testid={f.testId}
              className="w-full border border-line rounded px-2 py-1.5 text-sm font-mono bg-panel text-ink"
              value={(config as unknown as Record<string, unknown>)[f.key] as string}
              onChange={(e) => updateConfig({ [f.key]: e.target.value })}
              onFocus={() => setFocusedField(f.key as FormatKey)}
            />
          </div>
        ))}
      </div>
      <div className="w-56 flex-shrink-0 bg-raised border border-line-subtle rounded-lg p-3">
        <div className="text-xs font-bold text-ink mb-2">Available Tokens</div>
        <div className="space-y-0.5">
          {TOKENS.map((t) => (
            <button
              key={t.token}
              data-testid={t.testId}
              className={`w-full text-left flex justify-between items-center px-1.5 py-0.5 rounded text-xs hover:bg-row-selected ${
                focusedField ? 'cursor-pointer' : 'opacity-50 cursor-default'
              }`}
              onClick={() => handleTokenClick(t.token)}
            >
              <code className="text-purple-600">{t.token}</code>
              <span className="text-ink-dim text-label ml-2">{t.desc}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 text-label text-ink-faint">
          {focusedField ? 'Click to insert at cursor' : 'Focus an input first'}
        </div>
      </div>
    </div>
  );
}
