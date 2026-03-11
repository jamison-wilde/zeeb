import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { RenamePreview } from '../../src/renderer/components/RenamePreview';

describe('RenamePreview', () => {
  it('displays formatted filename preview', () => {
    render(
      <RenamePreview originalName="Movie.mkv" previewName="New Movie (2024).mkv" onRename={vi.fn()} onSkip={vi.fn()} />
    );
    expect(screen.getByText('New Movie (2024).mkv')).toBeDefined();
  });

  it('calls onRename when rename button pressed', () => {
    const onRename = vi.fn();
    render(
      <RenamePreview originalName="Movie.mkv" previewName="New.mkv" onRename={onRename} onSkip={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId('rename-button'));
    expect(onRename).toHaveBeenCalled();
  });

  it('calls onSkip when skip button pressed', () => {
    const onSkip = vi.fn();
    render(
      <RenamePreview originalName="Movie.mkv" previewName="New.mkv" onRename={vi.fn()} onSkip={onSkip} />
    );
    fireEvent.click(screen.getByTestId('skip-button'));
    expect(onSkip).toHaveBeenCalled();
  });
});
