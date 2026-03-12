// src/renderer/components/options/ImdbSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';

interface ImdbSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function ImdbSection({ config, updateConfig }: ImdbSectionProps): React.JSX.Element {
  return <div>IMDB placeholder</div>;
}
