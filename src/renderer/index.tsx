import React from 'react';
import { createRoot } from 'react-dom/client';
import { createElectronFsAdapter } from '../adapters/fs';
import { createElectronPlatformAdapter } from '../adapters/platform';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PlatformProvider } from './PlatformContext';
import './index.css';

const fs = createElectronFsAdapter();
const platform = createElectronPlatformAdapter();

const root = createRoot(document.getElementById('root')!);
root.render(
  <ErrorBoundary>
    <PlatformProvider value={platform}>
      <App fs={fs} />
    </PlatformProvider>
  </ErrorBoundary>,
);
