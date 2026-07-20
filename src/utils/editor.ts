import { isVisible, queryAllAny, queryAny } from './dom';

/**
 * Reads source text out of whichever web editor a site embeds.
 *
 * Covered: CodeMirror 5 & 6, Monaco, Ace and plain <textarea>. Line-based
 * editors are virtualised, so lines are read in vertical order and joined
 * rather than relying on `textContent` of the container.
 */

const LINE_CONTAINERS = ['.cm-content', '.CodeMirror-code', '.view-lines', '.ace_text-layer'] as const;
const LINE_SELECTORS = ['.cm-line', '.CodeMirror-line', '.view-line', '.ace_line'] as const;
const TEXTAREAS = ['textarea[class*="editor" i]', 'textarea[data-testid*="editor" i]', 'textarea'] as const;

/** Zero-width space: editors emit one to give empty lines a height. */
const ZERO_WIDTH = /\u200B/g;

/** Extracts editor content, or an empty string when no editor is present. */
export function readEditorText(root: ParentNode = document): string {
  return readFromLineEditor(root) || readFromTextarea(root);
}

/** CodeMirror / Monaco / Ace: join per-line nodes ordered by vertical position. */
function readFromLineEditor(root: ParentNode): string {
  const container = queryAny(LINE_CONTAINERS, root);
  if (!container) return '';

  const lines = queryAllAny<HTMLElement>(LINE_SELECTORS, container);
  if (lines.length === 0) return normalise(container.textContent ?? '');

  return normalise(
    lines
      .map((line) => ({ line, top: line.getBoundingClientRect().top }))
      .sort((a, b) => a.top - b.top)
      .map(({ line }) => (line.textContent ?? '').replace(ZERO_WIDTH, ''))
      .join('\n'),
  );
}

/** Last resort: the largest visible textarea that actually has content. */
function readFromTextarea(root: ParentNode): string {
  const candidates = queryAllAny<HTMLTextAreaElement>(TEXTAREAS, root)
    .filter((el) => isVisible(el) && el.value.trim().length > 0)
    .sort((a, b) => b.value.length - a.value.length);
  return candidates.length > 0 ? normalise(candidates[0]!.value) : '';
}

/** Normalises line endings and trailing whitespace; keeps internal blank lines. */
function normalise(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .trim();
}
