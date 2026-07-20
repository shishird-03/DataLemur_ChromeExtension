import { ACCEPTED_PATTERNS, REJECTED_PATTERNS } from '../utils/constants';
import { isVisible, text } from '../utils/dom';

/**
 * Shared verdict detection: scans small visible elements for a pass phrase.
 *
 * Only leaf-ish nodes are considered so a banner deep in the tree does not
 * make the whole <body> match, and an explicit rejection phrase anywhere in
 * the same element vetoes the pass.
 */
export function hasAcceptedVerdict(root: ParentNode = document): boolean {
  const candidates = [...root.querySelectorAll('div, span, p, h1, h2, h3, h4, strong, li, td')];

  for (const el of candidates) {
    const content = text(el);
    // Verdict banners are short; long strings are page copy, not a result.
    if (content.length === 0 || content.length > 160) continue;
    if (el.childElementCount > 4) continue;
    if (REJECTED_PATTERNS.some((pattern) => pattern.test(content))) continue;
    if (!ACCEPTED_PATTERNS.some((pattern) => pattern.test(content))) continue;
    if (isVisible(el)) return true;
  }
  return false;
}
