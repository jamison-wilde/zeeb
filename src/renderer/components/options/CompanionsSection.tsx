// src/renderer/components/options/CompanionsSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';

interface CompanionsSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function CompanionsSection({ config, updateConfig }: CompanionsSectionProps): React.JSX.Element {
  return <div>Companions placeholder</div>;
}
