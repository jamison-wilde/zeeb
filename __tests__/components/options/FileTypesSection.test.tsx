// __tests__/components/options/FileTypesSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FileTypesSection } from '../../../src/renderer/components/options/FileTypesSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

describe('FileTypesSection', () => {
  it('renders movie extensions as tags', () => {
    render(<FileTypesSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByText('mkv')).toBeDefined();
    expect(screen.getByText('avi')).toBeDefined();
  });

  it('renders subtitle extensions as tags', () => {
    render(<FileTypesSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByText('srt')).toBeDefined();
    expect(screen.getByText('sub')).toBeDefined();
  });
});
