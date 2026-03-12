// src/renderer/components/options/LoggingSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';

interface LoggingSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function LoggingSection({ config, updateConfig }: LoggingSectionProps): React.JSX.Element {
  return <div>Logging placeholder</div>;
}
