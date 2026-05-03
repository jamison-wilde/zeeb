import React from 'react';
import { createRoot } from 'react-dom/client';
import { createElectronFsAdapter } from '../adapters/fs';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const fs = createElectronFsAdapter();

const root = createRoot(document.getElementById('root')!);
root.render(
  <ErrorBoundary>
    <App fs={fs} />
  </ErrorBoundary>,
);
