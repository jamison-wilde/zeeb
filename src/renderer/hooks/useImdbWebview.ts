import { useCallback, useEffect, useRef, useState } from 'react';
import type { ZeebConfig, MovieMetadata } from '../../types';
import { buildTitleUrl, parseTitleData } from '../../services/imdbExtractor';
import { useTesterStore } from '../../stores/testerStore';

interface WebviewIpcMessageEvent {
  channel: string;
  args?: unknown[];
}

interface UseImdbWebviewArgs {
  webviewEl: WebviewTag | null;
  config: ZeebConfig;
  instanceId: number;
  onTitleData: (data: MovieMetadata) => void;
  onAkasReceived: (akas: string[]) => void;
}

interface UseImdbWebviewResult {
  urlInput: string;
  setUrlInput: (s: string) => void;
  navigateToTitle: (tt: string) => void;
  navigateToUrl: (url: string) => void;
  goBack: () => void;
  webviewPreloadPath: string;
}

export function useImdbWebview(args: UseImdbWebviewArgs): UseImdbWebviewResult {
  const { webviewEl, config, instanceId, onTitleData, onAkasReceived } = args;

  const [webviewPreloadPath, setWebviewPreloadPath] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const navigationMode = useRef<'title' | 'idle' | 'tester'>('idle');
  const webviewReady = useRef(false);

  const testerRequest = useTesterStore((s) => s.testerRequest);
  const setTesterResult = useTesterStore((s) => s.setResult);
  const setTesterError = useTesterStore((s) => s.setError);

  // Fetch webview preload path once
  useEffect(() => {
    window.zeebApp.getWebviewPreloadPath().then(setWebviewPreloadPath);
  }, []);

  // Send extraction patterns when they change
  useEffect(() => {
    if (!webviewEl) return;
    try {
      webviewEl.send('set-extraction-patterns', config.extractionPatterns);
    } catch { /* webview not ready yet */ }
  }, [webviewEl, config.extractionPatterns]);

  // Apply zoom when config changes
  useEffect(() => {
    if (!webviewEl || !webviewReady.current) return;
    try {
      webviewEl.setZoomFactor(config.htmlZoom / 100);
    } catch { /* webview not ready */ }
  }, [webviewEl, config.htmlZoom]);

  // Webview lifecycle: dom-ready, navigation, ipc-message, crash recovery
  useEffect(() => {
    if (!webviewEl) return;
    const webview = webviewEl;

    const handleDomReady = () => {
      webviewReady.current = true;
      try { setUrlInput(webview.getURL()); } catch { /* ignore */ }
      try { webview.setZoomFactor(config.htmlZoom / 100); } catch { /* ignore */ }
      try { webview.send('set-extraction-patterns', config.extractionPatterns); } catch { /* ignore */ }
    };

    const handleNavigate = (_event: Event) => {
      try { setUrlInput(webview.getURL()); } catch { /* ignore */ }
    };

    const handleIpcMessage = (event: WebviewIpcMessageEvent) => {
      if (event.channel !== 'extraction-result') return;
      const message = event.args?.[0];
      if (typeof message !== 'string') return;

      try {
        const parsed = JSON.parse(message);
        if (parsed.type === 'moreAkas' && Array.isArray(parsed.akas)) {
          onAkasReceived(parsed.akas);
          return;
        }
      } catch { /* not JSON or not moreAkas — fall through */ }

      const titleData = parseTitleData(message);
      if (titleData) {
        if (navigationMode.current === 'tester') {
          setTesterResult(titleData);
          navigationMode.current = 'idle';
          useTesterStore.setState({ testerRequest: null });
        } else {
          onTitleData(titleData);
        }
      }
    };

    const handleCrash = () => {
      webviewReady.current = false;
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('ipc-message', handleIpcMessage);
    webview.addEventListener('render-process-gone', handleCrash);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('ipc-message', handleIpcMessage);
      webview.removeEventListener('render-process-gone', handleCrash);
    };
  }, [webviewEl, config.extractionPatterns, config.htmlZoom, onAkasReceived, onTitleData, setTesterResult]);

  // Tester request handler — only first instance responds
  useEffect(() => {
    if (!testerRequest || !webviewEl || instanceId !== 0) return;
    navigationMode.current = 'tester';
    const url = `${config.urlImdbTT}${testerRequest.tt}/`;
    webviewEl.loadURL(url);

    const timer = setTimeout(() => {
      if (navigationMode.current === 'tester') {
        setTesterError(`Timed out fetching data for ${testerRequest.tt}`);
        navigationMode.current = 'idle';
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [testerRequest, webviewEl, instanceId, config.urlImdbTT, setTesterError]);

  // Navigation helpers
  const navigateToTitle = useCallback((tt: string) => {
    const url = buildTitleUrl(tt, config.urlImdbTT);
    navigationMode.current = 'title';
    webviewEl?.loadURL(url);
  }, [webviewEl, config.urlImdbTT]);

  const navigateToUrl = useCallback((url: string) => {
    navigationMode.current = 'idle';
    webviewEl?.loadURL(url);
  }, [webviewEl]);

  const goBack = useCallback(() => {
    webviewEl?.goBack();
  }, [webviewEl]);

  return {
    urlInput,
    setUrlInput,
    navigateToTitle,
    navigateToUrl,
    goBack,
    webviewPreloadPath,
  };
}
