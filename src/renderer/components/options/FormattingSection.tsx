// src/renderer/components/options/FormattingSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';

interface FormattingSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function FormattingSection({ config, updateConfig }: FormattingSectionProps): React.JSX.Element {
  return <div>Formatting placeholder</div>;
}
