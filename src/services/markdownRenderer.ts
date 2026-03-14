import { marked } from 'marked';
import createDOMPurify from 'dompurify';

/** Renders markdown to sanitized HTML. */
export function renderMarkdown(markdown: string): string {
  if (!markdown) return '';
  const raw = marked.parse(markdown, { async: false }) as string;
  const purify = createDOMPurify(window);
  return purify.sanitize(raw);
}
