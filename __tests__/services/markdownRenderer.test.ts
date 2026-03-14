import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../../src/services/markdownRenderer';

describe('renderMarkdown', () => {
  it('renders heading', () => {
    const html = renderMarkdown('## Hello');
    expect(html).toContain('<h2');
    expect(html).toContain('Hello');
  });

  it('renders bullet list', () => {
    const html = renderMarkdown('- item one\n- item two');
    expect(html).toContain('<li>');
    expect(html).toContain('item one');
  });

  it('renders bold text', () => {
    const html = renderMarkdown('**bold**');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('strips script tags', () => {
    const html = renderMarkdown('<script>alert("xss")</script>');
    expect(html).not.toContain('<script');
  });

  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
