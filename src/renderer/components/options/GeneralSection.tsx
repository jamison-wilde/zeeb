// src/renderer/components/options/GeneralSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';

interface GeneralSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function GeneralSection({ config, updateConfig }: GeneralSectionProps): React.JSX.Element {
  return <div>General placeholder</div>;
}
