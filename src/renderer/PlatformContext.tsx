import React, { createContext, useContext } from 'react';
import type { PlatformAdapter } from '../adapters/platform';

const PlatformContext = createContext<PlatformAdapter | null>(null);

interface PlatformProviderProps {
  value: PlatformAdapter;
  children: React.ReactNode;
}

export function PlatformProvider({ value, children }: PlatformProviderProps): React.JSX.Element {
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformAdapter {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error('usePlatform must be used inside <PlatformProvider>');
  }
  return ctx;
}
