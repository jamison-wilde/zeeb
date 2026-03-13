// src/renderer/components/OptionsModal.tsx
import React, { useState } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { FormattingSection } from './options/FormattingSection';
import { GeneralSection } from './options/GeneralSection';
import { FileTypesSection } from './options/FileTypesSection';
import { SearchTermsSection } from './options/SearchTermsSection';
import { CompanionsSection } from './options/CompanionsSection';
import { LoggingSection } from './options/LoggingSection';
import { ImdbSection } from './options/ImdbSection';
import { BrowserSection } from './options/BrowserSection';
import { FormatTesterSection } from './options/FormatTesterSection';

const SECTIONS = [
  { id: 'formatting', label: 'Formatting' },
  { id: 'general', label: 'General' },
  { id: 'file-types', label: 'File Types' },
  { id: 'search-terms', label: 'Search Terms' },
  { id: 'companions', label: 'Companions' },
  { id: 'logging', label: 'Logging' },
  { id: 'imdb', label: 'IMDB' },
  { id: 'browser', label: 'Browser' },
  { id: 'format-tester', label: 'Format Tester' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

interface OptionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OptionsModal({ visible, onClose }: OptionsModalProps): React.JSX.Element | null {
  const [activeSection, setActiveSection] = useState<SectionId>('formatting');
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" data-testid="options-modal">
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-bold">Options</h2>
        <button data-testid="close-options" className="text-blue-500 hover:text-blue-700" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="flex flex-1 min-h-0">
        <nav className="w-48 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`w-full text-left px-4 py-2.5 text-sm ${
                activeSection === s.id
                  ? 'bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-500'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'formatting' && (
            <div data-testid="section-formatting">
              <FormattingSection config={config} updateConfig={updateConfig} />
            </div>
          )}
          {activeSection === 'general' && (
            <div data-testid="section-general">
              <GeneralSection config={config} updateConfig={updateConfig} />
            </div>
          )}
          {activeSection === 'file-types' && (
            <div data-testid="section-file-types">
              <FileTypesSection config={config} updateConfig={updateConfig} />
            </div>
          )}
          {activeSection === 'search-terms' && (
            <div data-testid="section-search-terms">
              <SearchTermsSection config={config} updateConfig={updateConfig} />
            </div>
          )}
          {activeSection === 'companions' && (
            <div data-testid="section-companions">
              <CompanionsSection config={config} updateConfig={updateConfig} />
            </div>
          )}
          {activeSection === 'logging' && (
            <div data-testid="section-logging">
              <LoggingSection config={config} updateConfig={updateConfig} />
            </div>
          )}
          {activeSection === 'imdb' && (
            <div data-testid="section-imdb">
              <ImdbSection config={config} updateConfig={updateConfig} />
            </div>
          )}
          {activeSection === 'browser' && (
            <div data-testid="section-browser">
              <BrowserSection config={config} updateConfig={updateConfig} />
            </div>
          )}
          {activeSection === 'format-tester' && (
            <div data-testid="section-format-tester">
              <FormatTesterSection config={config} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
