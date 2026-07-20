/**
 * Selector-tolerant DOM helpers.
 *
 * Site markup changes often, so nothing here depends on a single hard-coded
 * class name: every helper takes a list of candidates and falls back to
 * structural or textual heuristics.
 */

/** First element matching any of the candidate selectors, or null. */
export function queryAny<E extends Element = Element>(
  selectors: readonly string[],
  root: ParentNode = document,
): E | null {
  for (const selector of selectors) {
    const el = root.querySelector<E>(selector);
    if (el) return el;
  }
  return null;
}

/** All elements matching any candidate selector, de-duplicated, in DOM order. */
export function queryAllAny<E extends Element = Element>(
  selectors: readonly string[],
  root: ParentNode = document,
): E[] {
  const found = new Set<E>();
  for (const selector of selectors) {
    root.querySelectorAll<E>(selector).forEach((el) => found.add(el));
  }
  return [...found];
}

/** Collapsed, trimmed visible text of an element. */
export function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Trimmed text of the first element matching any candidate selector. */
export function textOfAny(selectors: readonly string[], root: ParentNode = document): string {
  return text(queryAny(selectors, root));
}

/** True when the element is rendered (has layout and is not hidden). */
export function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

/**
 * Smallest visible element whose own text matches `pattern`.
 * "Smallest" avoids matching <body> when a phrase appears deep in the tree.
 */
export function findSmallestMatching(pattern: RegExp, root: ParentNode = document): Element | null {
  const matches = [...root.querySelectorAll('*')].filter((el) => pattern.test(text(el)) && isVisible(el));
  if (matches.length === 0) return null;
  return matches.reduce((best, el) => (text(el).length < text(best).length ? el : best));
}

/** Runs `fn` at most once per animation frame while mutations keep arriving. */
export function observeThrottled(target: Node, fn: () => void): MutationObserver {
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn();
    });
  });
  observer.observe(target, { childList: true, subtree: true, characterData: true });
  return observer;
}

/** Invokes `fn` whenever the SPA changes URL without a full page load. */
export function onUrlChange(fn: (url: string) => void): () => void {
  let last = location.href;
  const check = (): void => {
    if (location.href === last) return;
    last = location.href;
    fn(last);
  };
  const interval = setInterval(check, 500);
  addEventListener('popstate', check);
  return () => {
    clearInterval(interval);
    removeEventListener('popstate', check);
  };
}
