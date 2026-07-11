import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

const PANEL_STYLE: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  padding: '32px',
  maxWidth: '720px',
  margin: '40px auto',
  background: 'var(--z-panel)',
  color: 'var(--z-ink)',
  border: '1px solid var(--z-line)',
  borderRadius: '6px',
};

const PRE_STYLE: React.CSSProperties = {
  background: 'var(--z-raised)',
  padding: '12px',
  borderRadius: '4px',
  overflowX: 'auto',
  fontSize: '12px',
  lineHeight: '1.4',
  whiteSpace: 'pre-wrap',
};

const BUTTON_STYLE: React.CSSProperties = {
  padding: '8px 14px',
  marginRight: '8px',
  border: '1px solid var(--z-toggle-off)',
  borderRadius: '3px',
  color: 'var(--z-ink-2)',
  cursor: 'pointer',
  fontSize: '13px',
};

function formatError(error: Error): string {
  const stack = error.stack ?? '';
  const frames = stack.split('\n').slice(0, 6).join('\n');
  return `${error.name}: ${error.message}\n${frames}`;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleCopy = (): void => {
    if (this.state.error) {
      void navigator.clipboard.writeText(formatError(this.state.error));
    }
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={PANEL_STYLE}>
        <h1 style={{ margin: '0 0 12px', fontSize: '20px' }}>Something went wrong</h1>
        <p style={{ margin: '0 0 16px', color: 'var(--z-ink-2)' }}>{error.name}: {error.message}</p>
        <pre style={PRE_STYLE}>{formatError(error)}</pre>
        <div style={{ marginTop: '16px' }}>
          <button type="button" style={BUTTON_STYLE} onClick={this.handleReload}>Reload</button>
          <button type="button" style={BUTTON_STYLE} onClick={this.handleCopy}>Copy error</button>
        </div>
      </div>
    );
  }
}
