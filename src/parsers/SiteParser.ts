import type { Problem, SiteId } from '../utils/types';

/**
 * Contract every supported site must implement.
 *
 * Adding a site means writing one class and registering it in `parsers/index.ts`
 * — no other module needs to change.
 */
export interface SiteParser {
  readonly id: SiteId;

  /** File extension used for solutions from this site, without the dot. */
  readonly language: string;

  /** True when `url` is a problem page this parser can read. */
  matches(url: string): boolean;

  /** Scrapes the current document. Returns null when the page is not ready. */
  parse(url: string): Problem | null;

  /**
   * True when the visible submission verdict is a pass.
   * Called on every throttled DOM mutation, so it must stay cheap.
   */
  isAccepted(): boolean;
}
