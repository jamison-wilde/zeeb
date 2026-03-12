// src/renderer/components/options/SearchTermsSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';

interface SearchTermsSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function SearchTermsSection({ config, updateConfig }: SearchTermsSectionProps): React.JSX.Element {
  return <div>Search Terms placeholder</div>;
}
