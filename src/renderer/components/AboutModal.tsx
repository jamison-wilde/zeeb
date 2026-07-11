import React from 'react';
import zeebIcon from '../assets/zeeb512.png';
import tmdbLogo from '../assets/tmdb-logo.svg';
import { usePlatform } from '../PlatformContext';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
  version: string;
}

export function AboutModal({ visible, onClose, version }: AboutModalProps): React.JSX.Element | null {
  const platform = usePlatform();
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[400px] bg-panel rounded-lg overflow-hidden flex flex-col">
        <div className="flex justify-end p-2">
          <button className="text-ink-faint hover:text-ink-2 text-xl" onClick={onClose}>×</button>
        </div>

        <div className="flex flex-col items-center px-6 pb-6 space-y-4">
          <img src={zeebIcon} alt="Zeeb" className="w-24 h-24" />
          <div className="text-center">
            <h2 className="text-xl font-bold">Zeeb Movie Renamer</h2>
            <p className="text-sm text-ink-dim">Version {version}</p>
          </div>

          <p className="text-xs text-ink-dim text-center">
            A rewrite of the original{' '}
            <button
              className="text-accent hover:underline"
              onClick={() => platform.update.openExternal('https://sourceforge.net/projects/zeeb/')}
            >
              Zeeb
            </button>{' '}
            (Adobe Flex)
          </p>

          <p className="text-xs text-ink-faint">Icon by Kristof Polleunis</p>

          <div className="w-full border-t border-line-subtle pt-4 flex flex-col items-center space-y-2">
            <img src={tmdbLogo} alt="TMDB" className="h-8" />
            <p className="text-[10px] text-ink-faint text-center leading-relaxed">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>

          <p className="text-[10px] text-ink-faint">MIT License</p>
        </div>
      </div>
    </div>
  );
}
