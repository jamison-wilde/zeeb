// src/renderer/components/options/FileTypesSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';

interface FileTypesSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function FileTypesSection({ config, updateConfig }: FileTypesSectionProps): React.JSX.Element {
  return <div>File Types placeholder</div>;
}
