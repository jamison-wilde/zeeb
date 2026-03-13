import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PosterGrid } from '../../src/renderer/components/PosterGrid';

describe('PosterGrid', () => {
  const paths = ['/abc.jpg', '/def.jpg', '/ghi.jpg'];

  it('renders nothing when posterPaths is empty', () => {
    const { container } = render(
      <PosterGrid posterPaths={[]} selectedIndex={null} onSelect={vi.fn()} compact={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders thumbnail images with w185 URLs in full mode', () => {
    render(
      <PosterGrid posterPaths={paths} selectedIndex={null} onSelect={vi.fn()} compact={false} />,
    );
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
    expect((images[0] as HTMLImageElement).src).toContain('/t/p/w185/abc.jpg');
  });

  it('renders smaller w92 thumbnails in compact mode', () => {
    render(
      <PosterGrid posterPaths={paths} selectedIndex={null} onSelect={vi.fn()} compact={true} />,
    );
    const images = screen.getAllByRole('img');
    expect((images[0] as HTMLImageElement).src).toContain('/t/p/w92/abc.jpg');
  });

  it('uses lazy loading on thumbnail images', () => {
    render(
      <PosterGrid posterPaths={paths} selectedIndex={null} onSelect={vi.fn()} compact={false} />,
    );
    const images = screen.getAllByRole('img');
    expect(images[0].getAttribute('loading')).toBe('lazy');
  });

  it('highlights selected poster with blue border', () => {
    render(
      <PosterGrid posterPaths={paths} selectedIndex={1} onSelect={vi.fn()} compact={false} />,
    );
    const images = screen.getAllByRole('img');
    expect(images[1].parentElement?.className).toContain('border-blue-500');
  });

  it('calls onSelect when poster clicked', () => {
    const onSelect = vi.fn();
    render(
      <PosterGrid posterPaths={paths} selectedIndex={null} onSelect={onSelect} compact={false} />,
    );
    fireEvent.click(screen.getAllByRole('img')[2]);
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('uses horizontal scroll in compact mode', () => {
    const { container } = render(
      <PosterGrid posterPaths={paths} selectedIndex={0} onSelect={vi.fn()} compact={true} />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('overflow-x-auto');
    expect(wrapper.className).toContain('flex-nowrap');
  });

  it('uses wrapping scrollable grid in full mode', () => {
    const { container } = render(
      <PosterGrid posterPaths={paths} selectedIndex={0} onSelect={vi.fn()} compact={false} />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex-wrap');
    expect(wrapper.className).toContain('overflow-y-auto');
  });

  it('shows hover preview with w780 URL on mouseenter', () => {
    render(
      <PosterGrid posterPaths={paths} selectedIndex={0} onSelect={vi.fn()} compact={false} />,
    );
    const images = screen.getAllByRole('img');
    fireEvent.mouseEnter(images[0].parentElement!);
    const preview = screen.getByTestId('poster-hover-preview');
    expect((preview as HTMLImageElement).src).toContain('/t/p/w780/abc.jpg');
  });

  it('removes hover preview on mouseleave', () => {
    render(
      <PosterGrid posterPaths={paths} selectedIndex={0} onSelect={vi.fn()} compact={false} />,
    );
    const images = screen.getAllByRole('img');
    fireEvent.mouseEnter(images[0].parentElement!);
    expect(screen.getByTestId('poster-hover-preview')).toBeDefined();
    fireEvent.mouseLeave(images[0].parentElement!);
    expect(screen.queryByTestId('poster-hover-preview')).toBeNull();
  });
});
